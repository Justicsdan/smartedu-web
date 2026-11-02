import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../../lib/dbProxy'
import { Gauge } from 'lucide-react'
import { chartThemeFromSettings } from '../../../utils/chartTheme'
import EmptyChartPlaceholder from './EmptyChartPlaceholder'

interface Props {
  schoolId: string
  sessionId: string
  termId: string
  subjects: { id: string; name: string }[]
  settings: Record<string, any> | null
}

export default function AceSubjectChart({ schoolId, sessionId, termId, subjects, settings }: Props) {
  const theme = chartThemeFromSettings(settings)
  const [loading, setLoading] = useState(true)
  const [averages, setAverages] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!schoolId || !sessionId || !termId) { setLoading(false); return }
    loadData()
  }, [schoolId, sessionId, termId])

  const loadData = async () => {
    try {
      const { data, error } = await dbProxy
        .from('ace_pace_scores')
        .select('subject_id, pt_score')
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .get()
      if (error) throw error
      const tempScores: Record<string, number[]> = {}
      for (const row of data || []) {
        const subId = (row as any).subject_id
        const pt = Number((row as any).pt_score)
        if (subId && !isNaN(pt)) {
          if (!tempScores[subId]) tempScores[subId] = []
          tempScores[subId].push(pt)
        }
      }
      const avgs: Record<string, number> = {}
      for (const [id, scores] of Object.entries(tempScores)) {
        if (scores.length > 0) avgs[id] = scores.reduce((a, b) => a + b, 0) / scores.length
      }
      setAverages(avgs)
    } catch (e) {
      console.error('Failed to load ACE scores:', e)
    } finally {
      setLoading(false)
    }
  }

  const subjectNames = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of subjects) m[s.id] = s.name
    return m
  }, [subjects])

  const sortedSubjects = useMemo(() => {
    return Object.keys(averages)
      .sort((a, b) => averages[b] - averages[a])
      .map(id => ({ id, avg: averages[id], name: subjectNames[id] || 'Unknown' }))
  }, [averages, subjectNames])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col" style={{ minHeight: 280 }}>
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={20} className="text-gray-500" />
        <h3 className="text-base font-bold text-gray-900">Subject PT Averages</h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1A237E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedSubjects.length === 0 ? (
        <EmptyChartPlaceholder message="No PACE scores recorded yet for this term." />
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3 pl-[160px] pr-[60px]">
            <span className="text-[11px]" style={{ color: theme.text, opacity: 0.6 }}>0%</span>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#F9731620', color: '#C2410C' }}>
                80% Mastery
              </span>
            </div>
            <span className="text-[11px]" style={{ color: theme.text, opacity: 0.6 }}>100%</span>
          </div>

          <div className="flex flex-col gap-3">
            {sortedSubjects.map((s) => {
              const isMastery = s.avg >= 80
              const pct = Math.min(s.avg / 100, 1)
              return (
                <div key={s.id} className="flex items-center gap-2.5">
                  <div className="w-[160px] text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: theme.text }} title={s.name}>
                    {s.name}
                  </div>
                  <div className="flex-1 relative h-[22px] rounded" style={{ backgroundColor: theme.grid + '4D' }}>
                    <div className="absolute inset-0 flex">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 border-r" style={{ borderColor: i === 4 ? 'transparent' : theme.grid + '80' }} />
                      ))}
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5" style={{ left: '80%', backgroundColor: '#F97316' }} />
                    <div
                      className="absolute top-0 left-0 h-full rounded transition-all"
                      style={{
                        width: (pct * 100) + '%',
                        background: 'linear-gradient(to right, ' + (isMastery ? theme.primary : theme.fail) + ', ' + (isMastery ? theme.primary : theme.fail) + 'B3)',
                        boxShadow: '0 2px 4px ' + (isMastery ? theme.primary : theme.fail) + '33',
                      }}
                    />
                  </div>
                  <div className="w-[50px] text-right text-[12px] font-bold" style={{ color: theme.text }}>
                    {s.avg.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
