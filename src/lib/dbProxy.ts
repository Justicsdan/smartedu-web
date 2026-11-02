// Secure database proxy client — mirrors supabase-js API
// All requests go through the db-proxy Edge Function which:
// 1. Validates JWT (X-Auth-Token header)
// 2. Checks role-based whitelist
// 3. Auto-injects school_id filter
// 4. Auto-injects student_id filter for student role
// 5. Strips sensitive columns (pin, password, admin_password)

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL
const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY
const PROXY_URL = SUPABASE_URL + '/functions/v1/db-proxy'

interface Filter {
  column: string
  op: string
  value: unknown
}

interface ProxyRequest {
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | 'rpc'
  table?: string
  rpcName?: string
  select?: string
  filters?: Filter[]
  order?: { column: string; ascending?: boolean }
  limit?: number
  range?: [number, number]
  single?: boolean | 'maybe'
  data?: unknown
  rpcParams?: Record<string, unknown>
  onConflict?: string
}

interface ProxyResponse<T = any> {
  data: T | null
  error: { message: string } | null
}

class DbProxyBuilder {
  private table: string
  private selectStr: string = '*'
  private filters: Filter[] = []
  private orderSpec: { column: string; ascending?: boolean } | null = null
  private limitSpec: number | null = null
  private rangeSpec: [number, number] | null = null
  private singleSpec: boolean | 'maybe' | null = null

  constructor(table: string) {
    this.table = table
  }

  // ─── Select ───
  select(columns: string = '*'): this {
    this.selectStr = columns
    return this
  }

  // ─── Filters ───
  eq(column: string, value: unknown): this {
    this.filters.push({ column, op: 'eq', value })
    return this
  }
  neq(column: string, value: unknown): this {
    this.filters.push({ column, op: 'neq', value })
    return this
  }
  gt(column: string, value: unknown): this {
    this.filters.push({ column, op: 'gt', value })
    return this
  }
  gte(column: string, value: unknown): this {
    this.filters.push({ column, op: 'gte', value })
    return this
  }
  lt(column: string, value: unknown): this {
    this.filters.push({ column, op: 'lt', value })
    return this
  }
  lte(column: string, value: unknown): this {
    this.filters.push({ column, op: 'lte', value })
    return this
  }
  in(column: string, values: unknown[]): this {
    this.filters.push({ column, op: 'in', value: values })
    return this
  }
  inFilter(column: string, values: unknown[]): this {
    return this.in(column, values)
  }
  is(column: string, value: unknown): this {
    this.filters.push({ column, op: 'is', value })
    return this
  }
  isNull(column: string): this {
    this.filters.push({ column, op: 'is', value: null })
    return this
  }
  isNotNull(column: string): this {
    this.filters.push({ column, op: 'is_not', value: null })
    return this
  }
  like(column: string, pattern: string): this {
    this.filters.push({ column, op: 'like', value: pattern })
    return this
  }
  ilike(column: string, pattern: string): this {
    this.filters.push({ column, op: 'ilike', value: pattern })
    return this
  }
  not(column: string, op: string, value: unknown): this {
    // Mirror supabase-js .not(column, 'in', values) syntax
    const opMap: Record<string, string> = {
      'in': 'not_in',
      'is': 'is_not',
      'like': 'not_like',
      'ilike': 'not_ilike',
    }
    this.filters.push({ column, op: opMap[op] || op, value })
    return this
  }

  // ─── Modifiers ───
  order(column: string, opts: { ascending?: boolean } = {}): this {
    this.orderSpec = { column, ascending: opts.ascending ?? true }
    return this
  }
  limit(n: number): this {
    this.limitSpec = n
    return this
  }
  range(from: number, to: number): this {
    this.rangeSpec = [from, to]
    return this
  }
  single(): Promise<ProxyResponse> {
    this.singleSpec = true
    return this._execute('select')
  }
  maybeSingle(): Promise<ProxyResponse> {
    this.singleSpec = 'maybe'
    return this._execute('select')
  }

  // ─── Action setters (return this for chaining, execute on await/get/single) ───
  private _action: string | null = null
  private _data: unknown = null
  private _onConflict: string | null = null

  // ─── Terminal: SELECT (executes immediately for backward compat) ───
  get(): Promise<ProxyResponse> {
    return this._execute('select')
  }

  // ─── INSERT (returns this for chaining, executes on await) ───
  insert(data: unknown): this {
    this._action = 'insert'
    this._data = data
    return this
  }

  // ─── UPDATE (returns this for chaining, executes on await) ───
  update(data: unknown): this {
    this._action = 'update'
    this._data = data
    return this
  }

  // ─── UPSERT (returns this for chaining, executes on await) ───
  upsert(data: unknown, opts: { onConflict?: string } = {}): this {
    this._action = 'upsert'
    this._data = data
    this._onConflict = opts.onConflict || null
    return this
  }

  // ─── DELETE (returns this for chaining, executes on await) ───
  delete(): this {
    this._action = 'delete'
    return this
  }

  // ─── Make builder thenable (awaitable) — executes stored action or select ───
  then(onFulfilled?: (value: ProxyResponse) => any, onRejected?: (reason: any) => any): Promise<any> {
    const action = this._action || 'select'
    const extra: Record<string, unknown> = {}
    if (this._data !== null) extra.data = this._data
    if (this._onConflict) extra.onConflict = this._onConflict
    return this._execute(action, extra).then(onFulfilled, onRejected)
  }

  // ─── Execute ───
  private async _execute(action: string, extra: Record<string, unknown> = {}): Promise<ProxyResponse> {
    const token = localStorage.getItem('smartedu_token')
    if (!token) {
      return { data: null, error: { message: 'Not authenticated' } }
    }

    const body: ProxyRequest = {
      action: action as ProxyRequest['action'],
      table: this.table,
      select: this.selectStr,
      filters: this.filters,
      order: this.orderSpec || undefined,
      limit: this.limitSpec ?? undefined,
      range: this.rangeSpec || undefined,
      single: this.singleSpec || undefined,
      ...extra,
    }

    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
          'x-auth-token': token,
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        console.error('dbProxy error:', action, this.table, json.error || `HTTP ${res.status}`)
        return { data: null, error: { message: json.error || `HTTP ${res.status}` } }
      }

            return { data: json.data, error: null }
    } catch (e: any) {
      return { data: null, error: { message: e.message || 'Network error' } }
    }
  }
}

class DbProxyClient {
  from(table: string): DbProxyBuilder {
    return new DbProxyBuilder(table)
  }

  async rpc(name: string, params: Record<string, unknown> = {}): Promise<ProxyResponse> {
    const token = localStorage.getItem('smartedu_token')
    if (!token) {
      return { data: null, error: { message: 'Not authenticated' } }
    }

    const body: ProxyRequest = {
      action: 'rpc',
      rpcName: name,
      rpcParams: params,
    }

    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
          'x-auth-token': token,
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        console.error('dbProxy rpc error:', name, json.error || `HTTP ${res.status}`)
        return { data: null, error: { message: json.error || `HTTP ${res.status}` } }
      }

      return { data: json.data, error: null }
    } catch (e: any) {
      return { data: null, error: { message: e.message || 'Network error' } }
    }
  }

  // ─── Login: calls the auth Edge Function to mint a JWT ───
  // Edge Function expects: { role, username, password }
  // Returns: { token, user }
  async login(role: string, username: string, password: string): Promise<{ token: string; user: any } | { error: string }> {
    try {
      const res = await fetch(SUPABASE_URL + '/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({ role, username, password }),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error || `HTTP ${res.status}` }
      return { token: json.token, user: json.user }
    } catch (e: any) {
      return { error: e.message || 'Network error' }
    }
  }
}

export const dbProxy = new DbProxyClient()
export default dbProxy
