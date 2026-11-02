import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../../lib/dbProxy'
import { Calendar } from 'lucide-react'
import { chartThemeFromSettings } from '../../../utils/chartTheme'
import EmptyChartPlaceholder from './EmptyChartPlaceholder'

interface Props {
  schoolId: string
  sessionId: string
  termId: string
  settings: Record<string, any> | null
}

export default function AttendanceTrendChart({ schoolId, sessionId, termId, settings }: Props) {
  const theme = chartThemeFromSettings(settings)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    if (!schoolId || !sessionId || !termId) { setLoading(false); return }
    loadData()
  }, [schoolId, sessionId, termId])

  const loadData = async () => {
    try {
      const { data, error } = await dbProxy
        .from('attendance')
        .select('date, status')
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .get()
      if (error) throw error
      setRecords(data || [])
    } catch (e) {
      console.error('Failed to load attendance:', e)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const spots = useMemo(() => {
    if (records.length === 0) return []
    const dailyPresent: Record<string, number> = {}
    const dailyTotal: Record<string, number> = {}
    for (const r of records) {
      const date = (r.date as string)?.split('T')[0]
      if (!date) continue
      dailyTotal[date] = (dailyTotal[date] || 0) + 1
      if (r.status === 'present' || r.status === 'late') {
        dailyPresent[date] = (dailyPresent[date] || 0) + 1
      }
    }
    const sortedDates = Object.keys(dailyTotal).sort()
    return sortedDates.map((date, i) => {
      const present = dailyPresent[date] || 0
      const total = dailyTotal[date] || 1
      return { x: i, y: (present / total) * 100, date }
    })
  }, [records])

  const buildPath = (data: { x: number; y: number }[]) => {
    if (data.length === 0) return ''
    const maxX = data[data.length - 1].x || 1
    const W = 100, H = 100
    let path = ''
    data.forEach((p, i) => {
      const x = (p.x / maxX) * W
      const y = H - (p.y / 100) * H
      if (i === 0) path += 'M ' + x + ' ' + y
      else {
        const prev = data[i - 1]
        const prevX = (prev.x / maxX) * W
        const prevY = H - (prev.y / 100) * H
        const cx1 = prevX + (x - prevX) / 2
        const cy1 = prevY
        const cx2 = prevX + (x - prevX) / 2
        const cy2 = y
        path += ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + x + ' ' + y
      }
    })
    return path
  }

  const buildAreaPath = (data: { x: number; y: number }[]) => {
    if (data.length === 0) return ''
    const linePath = buildPath(data)
    const maxX = data[data.length - 1].x || 1
    const W = 100
    const lastX = (maxX / maxX) * W
    return linePath + ' L ' + lastX + ' 100 L 0 100 Z'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col" style={{ minHeight: 280 }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={20} className="text-gray-500" />
        <h3 className="text-base font-bold text-gray-900">Attendance Trend</h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1A237E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : spots.length === 0 ? (
        <EmptyChartPlaceholder message="No attendance data available for this term." />
      ) : (
        <div className="flex-1 flex">
          <div className="flex flex-col justify-between text-[10px] py-2 pr-2" style={{ color: theme.text }}>
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className="flex-1 relative" style={{ minHeight: 200 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
              {[0, 25, 50, 75, 100].map((v) => (
                <line key={v} x1="0" y1={100 - v} x2="100" y2={100 - v} stroke={theme.grid} strokeWidth="0.3" />
              ))}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#2E7D32" strokeWidth="0.4" strokeDasharray="2,2" opacity="0.5" />
              <path d={buildAreaPath(spots)} fill={theme.accent} opacity="0.1" />
              <path d={buildPath(spots)} fill="none" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
            </svg>

            <div className="absolute top-[25%] right-2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#2E7D331a', color: '#1B5E20' }}>
              Target: 75%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
