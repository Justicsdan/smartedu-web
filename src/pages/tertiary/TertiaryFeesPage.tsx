import { CreditCard } from 'lucide-react'

export default function TertiaryFeesPage() {
  return (
    <div className="px-4 sm:px-6 py-10 max-w-3xl mx-auto text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <CreditCard size={26} className="text-white" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Fees</h1>
      <p className="mt-2 text-sm text-slate-500">This page is coming soon.</p>
    </div>
  )
}
