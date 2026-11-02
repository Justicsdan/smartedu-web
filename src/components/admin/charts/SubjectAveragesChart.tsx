import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { chartThemeFromSettings } from '../../../utils/chartTheme'
import EmptyChartPlaceholder from './EmptyChartPlaceholder'

interface ScoreRow {
  total: number | null
  subject: { name: string } | null
}

interface Props {
  scores: ScoreRow[]
  settings: Record<string, any> | null
  isAce: boolean
}

export default function SubjectAveragesChart({ scores, settings, isAce }: Props) {
  const theme = chartThemeFromSettings(settings)
  const passMark = Number(settings?.pass_mark) || 40

  const entries = useMemo(() => {
    if (isAce || !scores || scores.length === 0) return []
    const subjectScores: Record<string, number[]> = {}
    for (const s of scores) {
      const name = s.subject?.name?.trim()
      if (!name) continue
      const total = Number(s.total) || 0
      if (total <= 0) continue
      if (!subjectScores[name]) subjectScores[name] = []
      subjectScores[name].push(total)
    }
    const list = Object.entries(subjectScores).map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }))
    list.sort((a, b) => b.avg - a.avg)
    return list.slice(0, 15)
  }, [scores, isAce])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col" style={{ minHeight: 280 }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={20} className="text-gray-500" />
        <h3 className="text-base font-bold text-gray-900">Subject Performance</h3>
      </div>

      {isAce ? (
        <EmptyChartPlaceholder message="No data available" />
      ) : entries.length === 0 ? (
        <EmptyChartPlaceholder message="No score data available" />
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col gap-1.5">
            {entries.map((e, i) => {
              const pct = Math.min(e.avg / 100, 1)
              const pass = e.avg >= passMark
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-[110px] truncate text-[11px]" style={{ color: theme.text }} title={e.name}>
                    {e.name}
                  </div>
                  <div className="flex-1 relative h-[22px] bg-gray-100 rounded">
                    <div
                      className="absolute top-0 left-0 h-[22px] rounded transition-all"
                      style={{ width: (pct * 100) + '%', backgroundColor: pass ? theme.pass : theme.fail }}
                    />
                  </div>
                  <div className="w-[48px] text-right text-[11px] font-semibold" style={{ color: theme.text }}>
                    {e.avg.toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="w-[110px]"></div>
            <div className="flex-1 relative h-8">
              {[0, 20, 40, 60, 80, 100].map((v) => (
                <div key={v} className="absolute top-0" style={{ left: v + '%' }}>
                  <div className="w-0.5 h-1.5 mx-auto" style={{ backgroundColor: theme.text, opacity: 0.3 }} />
                  <div className="text-[10px] text-center w-6 -ml-3" style={{ color: theme.text }}>{v}</div>
                </div>
              ))}
              {passMark > 0 && passMark <= 100 && (
                <div className="absolute top-0" style={{ left: passMark + '%' }}>
                  <div className="w-[2.5px] h-1.5 mx-auto" style={{ backgroundColor: theme.fail }} />
                  <div className="text-[9px] font-bold px-1 py-0.5 rounded mt-0.5 -ml-4 w-8 text-center"
                    style={{ backgroundColor: theme.fail + '1a', color: theme.fail }}>
                    Pass
                  </div>
                </div>
              )}
            </div>
            <div className="w-[48px]"></div>
          </div>
        </div>
      )}
    </div>
  )
}
