import { BarChart3 } from 'lucide-react'

export default function EmptyChartPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <BarChart3 size={40} className="text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}
