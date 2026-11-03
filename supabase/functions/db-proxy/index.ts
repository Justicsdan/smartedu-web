import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-auth-token, x-client-info, apikey, content-type',
};

// ─── Types ───

interface JwtPayload {
  sub: string;
  role: string;
  school_id: string;
  class_id?: string;
  iat: number;
  exp: number;
}

interface Filter {
  column: string;
  op: string;
  value: unknown;
}

interface ProxyRequest {
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | 'rpc';
  table?: string;
  rpcName?: string;
  select?: string;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: [number, number];
  single?: boolean | 'maybe';
  data?: unknown;
  rpcParams?: Record<string, unknown>;
  onConflict?: string;
}

// ─── Sensitive columns stripped from ALL responses ───

const ALWAYS_STRIP = ['pin', 'password'];
const ADMIN_ONLY_STRIP = ['admin_password'];

// ─── Tables with school_id column ───

const SCHOOL_SCOPED_TABLES = [
  'live_classes',
  'live_classes',
  'students', 'teachers', 'classes', 'subjects', 'class_subjects',
  'scores', 'assignments', 'attendance', 'student_term_summaries',
  'term_comments', 'student_behavioural_ratings', 'academic_sessions',
  'terms', 'school_settings', 'audit_logs', 'announcements', 'complaints', 'assignment_submissions', 'score_locks', 'fee_types', 'fee_payments', 'fee_assignments', 'cbt_exams', 'cbt_questions', 'ace_pace_scores', 'ace_term_reports', 'fee_assignments',
];

// ─── Tables where student can only see their own rows ───

const STUDENT_OWNED_TABLES = [
  'scores', 'student_term_summaries', 'term_comments',
  'student_behavioural_ratings', 'attendance', 'cbt_attempts', 'ace_pace_scores', 'ace_term_reports', 'fee_assignments',
];

// ─── Whitelist: role → table → allowed actions ───

const WHITELIST: Record<string, Record<string, string[]>> = {
  super_admin: {
    schools: ['select', 'insert', 'update', 'delete'],
    super_admins: ['select', 'insert', 'update'],
    students: ['select', 'insert', 'update', 'delete'],
    teachers: ['select', 'insert', 'update', 'delete'],
    classes: ['select', 'insert', 'update', 'delete'],
    subjects: ['select', 'insert', 'update', 'delete'],
    class_subjects: ['select', 'insert', 'update', 'delete'],
    scores: ['select', 'insert', 'update', 'delete'],
    assignments: ['select', 'insert', 'update', 'delete'],
    attendance: ['select', 'insert', 'update', 'delete'],
    student_term_summaries: ['select', 'insert', 'update', 'delete'],
    term_comments: ['select', 'insert', 'update'],
    student_behavioural_ratings: ['select', 'insert', 'update'],
    academic_sessions: ['select', 'insert', 'update', 'delete'],
    terms: ['select', 'insert', 'update', 'delete'],
    school_settings: ['select', 'insert', 'update'],
    audit_logs: ['select', 'insert'],
    fee_types: ['select', 'insert', 'update', 'delete'],
    fee_payments: ['select', 'insert', 'update'],
    fee_assignments: ['select', 'insert', 'update', 'delete'],
    ace_pace_scores: ['select', 'insert', 'update', 'delete'],
    ace_term_reports: ['select', 'insert', 'update', 'delete'],
    announcements: ['select', 'insert', 'update', 'delete'],
    assignment_submissions: ['select', 'insert', 'update', 'delete'],
  },
  school_admin: {
      live_classes: ['select','insert','update','delete'],
    schools: ['select', 'update'],
    students: ['select', 'insert', 'update'],
    teachers: ['select', 'insert', 'update'],
    classes: ['select', 'insert', 'update'],
    subjects: ['select', 'insert', 'update'],
    class_subjects: ['select', 'insert', 'update', 'delete'],
    scores: ['select', 'insert', 'update', 'delete'],
    assignments: ['select', 'insert', 'update', 'delete'],
    attendance: ['select', 'insert', 'update'],
    student_term_summaries: ['select', 'insert', 'update', 'delete'],
    term_comments: ['select', 'insert', 'update'],
    student_behavioural_ratings: ['select', 'insert', 'update'],
    academic_sessions: ['select', 'insert', 'update'],
    terms: ['select', 'insert', 'update', 'delete'],
    school_settings: ['select', 'insert', 'update'],
    audit_logs: ['select', 'insert'],
    fee_types: ['select', 'insert', 'update', 'delete'],
    fee_payments: ['select', 'insert', 'update'],
    fee_assignments: ['select', 'insert', 'update', 'delete'],
    announcements: ['select', 'insert', 'update', 'delete'],
    complaints: ['select', 'insert', 'update'],
    score_locks: ['select', 'insert', 'update'],
    cbt_exams: ['select', 'insert', 'update', 'delete'],
    ace_pace_scores: ['select', 'insert', 'update', 'delete'],
    ace_term_reports: ['select', 'insert', 'update', 'delete'],
    cbt_questions: ['select', 'insert', 'update', 'delete'],
    cbt_attempts: ['select', 'insert', 'update', 'delete'],
  },
  teacher: {
      live_classes: ['select','insert','update','delete'],
      live_classes: ['select','insert','update','delete'],
    students: ['select'],
    classes: ['select'],
    subjects: ['select'],
    class_subjects: ['select'],
    schools: ['select', 'update'],
    scores: ['select', 'insert', 'update'],
    assignments: ['select', 'insert', 'update', 'delete'],
    attendance: ['select', 'insert', 'update'],
    student_term_summaries: ['select', 'insert', 'update', 'delete'],
    term_comments: ['select', 'insert', 'update'],
    student_behavioural_ratings: ['select', 'insert'],
    academic_sessions: ['select'],
    terms: ['select'],
    school_settings: ['select'],
    cbt_exams: ['select', 'insert', 'update', 'delete'],
    cbt_questions: ['select', 'insert', 'update', 'delete'],
    cbt_attempts: ['select', 'insert', 'delete'],
    score_locks: ['select'],
    fee_payments: ['select'],
    fee_assignments: ['select'],
    fee_types: ['select'],
    complaints: ['select', 'insert'],
    assignment_submissions: ['select', 'insert'],
    ace_pace_scores: ['select', 'insert', 'update'],
    ace_term_reports: ['select', 'insert', 'update'],
  },
  student: {
      live_classes: ['select'],
    classes: ['select'],
    subjects: ['select'],
    class_subjects: ['select'],
    schools: ['select', 'update'],
    students: ['select'],
    teachers: ['select'],
    scores: ['select'],
    assignments: ['select'],
    attendance: ['select'],
    student_term_summaries: ['select', 'insert', 'update', 'delete'],
    term_comments: ['select', 'insert', 'update'],
    student_behavioural_ratings: ['select', 'insert'],
    academic_sessions: ['select'],
    terms: ['select'],
    school_settings: ['select'],
    cbt_exams: ['select', 'insert', 'update', 'delete'],
    cbt_questions: ['select', 'insert', 'update', 'delete'],
    cbt_attempts: ['select', 'insert', 'delete'],
    score_locks: ['select'],
    fee_payments: ['select'],
    fee_assignments: ['select'],
    fee_types: ['select'],
    complaints: ['select', 'insert'],
    assignment_submissions: ['select', 'insert'],
    ace_pace_scores: ['select'],
    ace_term_reports: ['select'],
    announcements: ['select'],
  },
};

// ─── RPC whitelist ───

const RPC_WHITELIST: Record<string, string[]> = {
  school_admin: ['compute_term_summaries'],
  super_admin: ['compute_term_summaries'],
  teacher: [],
  student: ['get_cbt_questions', 'score_cbt_attempt'],
};

// ─── JWT helpers ───

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    const signingInput = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBuf = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, sigBuf, encoder.encode(signingInput),
    );
    if (!valid) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Strip sensitive columns from response ───

function stripSensitive(data: unknown, role?: string): unknown {
  if (Array.isArray(data)) return data.map(item => stripSensitive(item, role));
  if (data && typeof data === 'object') {
    const obj = { ...(data as Record<string, unknown>) };
    for (const col of ALWAYS_STRIP) delete obj[col];
    if (role !== 'super_admin') {
      for (const col of ADMIN_ONLY_STRIP) delete obj[col];
    }
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === 'object') {
        obj[key] = stripSensitive(obj[key], role);
      }
    }
    return obj;
  }
  return data;
}


// ─── Build auto-filters based on role ───

function getAutoFilters(payload: JwtPayload, table: string): Filter[] {
  const filters: Filter[] = [];
  const { role, school_id, sub } = payload;
  if (role === 'super_admin') return filters;
  if (school_id) {
    if (table === 'schools') {
      filters.push({ column: 'id', op: 'eq', value: school_id });
    } else if (SCHOOL_SCOPED_TABLES.includes(table)) {
      filters.push({ column: 'school_id', op: 'eq', value: school_id });
    }
  }
  if (role === 'student') {
    if (table === 'students') {
      // Students can only read their own row (id matches JWT sub)
      filters.push({ column: 'id', op: 'eq', value: sub });
    } else if (STUDENT_OWNED_TABLES.includes(table)) {
      filters.push({ column: 'student_id', op: 'eq', value: sub });
    }
  }
  return filters;
}

// ─── Apply filters to Supabase query builder ───

function applyFilters(query: any, filters: Filter[]): any {
  for (const f of filters) {
    switch (f.op) {
      case 'eq': query = query.eq(f.column, f.value); break;
      case 'neq': query = query.neq(f.column, f.value); break;
      case 'gt': query = query.gt(f.column, f.value); break;
      case 'gte': query = query.gte(f.column, f.value); break;
      case 'lt': query = query.lt(f.column, f.value); break;
      case 'lte': query = query.lte(f.column, f.value); break;
      case 'in': query = query.in(f.column, f.value as unknown[]); break;
      case 'not_in': query = query.not(f.column, 'in', f.value as unknown[]); break;
      case 'is': query = query.is(f.column, f.value); break;
      case 'is_not': query = query.not(f.column, 'is', f.value); break;
      case 'like': query = query.like(f.column, f.value as string); break;
      case 'ilike': query = query.ilike(f.column, f.value as string); break;
      case 'not_like': query = query.not(f.column, 'like', f.value as string); break;
      case 'not_ilike': query = query.not(f.column, 'ilike', f.value as string); break;
      case 'not': query = query.not(f.column, f.value as string, f.value); break;
      default: throw new Error(`Unknown filter operator: ${f.op}`);
    }
  }
  return query;
}

// ─── Execute query and handle single/maybe ───

async function executeQuery(query: any, single?: boolean | 'maybe', role?: string): Promise<{ data: unknown }> {
  if (single === true) {
    const { data, error } = await query.single();
    if (error) throw error;
    return { data: stripSensitive(data, role) };
  }
  if (single === 'maybe') {
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return { data: stripSensitive(data, role) };
  }
  const { data, error } = await query;
  if (error) throw error;
  return { data: stripSensitive(data, role) };
}

// ─── Main handler ───

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Extract and verify JWT
  const authHeader = req.headers.get('x-auth-token') ?? '';
  const token = authHeader;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body: ProxyRequest = await req.json();
    const { action, table, rpcName, select, single } = body;
    const role = payload.role;

    // ─── RPC ───
    if (action === 'rpc') {
      const allowed = RPC_WHITELIST[role] ?? [];
      if (!rpcName || !allowed.includes(rpcName)) {
        return new Response(JSON.stringify({ error: 'RPC not allowed for this role' }), {
          status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await db.rpc(rpcName!, body.rpcParams ?? {});
      if (error) throw error;
      return new Response(JSON.stringify({ data: stripSensitive(data, role) }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── Table CRUD ───
    if (!table) {
      return new Response(JSON.stringify({ error: 'Table is required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Check whitelist
    const roleTables = WHITELIST[role];
    if (!roleTables) {
      return new Response(JSON.stringify({ error: `Unknown role: ${role}` }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const allowedActions = roleTables[table];
    if (!allowedActions || !allowedActions.includes(action)) {
      return new Response(JSON.stringify({ error: `${action} on ${table} not allowed for ${role}` }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Build auto-filters (only for select/update/delete — not insert/upsert)
    const autoFilters = (action === 'select' || action === 'update' || action === 'delete')
      ? getAutoFilters(payload, table)
      : [];
    const allFilters = [...(body.filters ?? []), ...autoFilters];

    let query: any = db.from(table);

    switch (action) {
      case 'select': {
        query = query.select(select ?? '*');
        query = applyFilters(query, allFilters);
        if (body.order) query = query.order(body.order.column, { ascending: body.order.ascending ?? true });
        if (body.limit != null) query = query.limit(body.limit);
        if (body.range) query = query.range(body.range[0], body.range[1]);
        const result = await executeQuery(query, single, role);
        return new Response(JSON.stringify(result), {
          status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      case 'insert': {
        query = query.insert(body.data);
        if (select) query = query.select(select);
        const result = await executeQuery(query, single, role);
        return new Response(JSON.stringify(result), {
          status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        query = query.update(body.data);
        query = applyFilters(query, allFilters);
        if (select) query = query.select(select);
        const result = await executeQuery(query, single, role);
        return new Response(JSON.stringify(result), {
          status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert': {
        query = query.upsert(body.data, { onConflict: body.onConflict });
        if (select) query = query.select(select);
        const result = await executeQuery(query, single, role);
        return new Response(JSON.stringify(result), {
          status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        query = query.delete();
        query = applyFilters(query, allFilters);
        if (select) query = query.select(select);
        const result = await executeQuery(query, single, role);
        return new Response(JSON.stringify(result), {
          status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: any) {
    console.error('db-proxy error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
