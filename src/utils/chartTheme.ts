// Port of Flutter's chart_theme.dart
// Parses hex colors from school_settings, provides fallbacks

export interface ChartTheme {
  primary: string
  secondary: string
  accent: string
  text: string
  grid: string
  tooltipBg: string
  tooltipText: string
  pass: string
  fail: string
}

const parseHex = (hex: string): string => {
  const h = hex.replace('#', '')
  if (h.length === 6) return '#' + h
  return '#1A237E'
}

const parseDynamic = (value: any): string | null => {
  if (!value || typeof value !== 'string' || value.trim() === '') return null
  return parseHex(value)
}

export const chartThemeFromSettings = (settings: Record<string, any> | null): ChartTheme => ({
  primary: parseDynamic(settings?.primary_color) || '#3B82F6',
  secondary: parseDynamic(settings?.secondary_color) || '#6366F1',
  accent: parseDynamic(settings?.accent_color) || '#F59E0B',
  text: parseDynamic(settings?.text_color) || '#6B7280',
  grid: '#E5E7EB',
  tooltipBg: '#FFFFFF',
  tooltipText: '#111827',
  pass: '#2E7D32',
  fail: '#D32F2F',
})

export const fallbackChartTheme: ChartTheme = chartThemeFromSettings(null)

export const termColors = (theme: ChartTheme): string[] => [theme.primary, theme.secondary, theme.accent]
