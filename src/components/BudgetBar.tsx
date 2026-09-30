import { formatMXN } from '../lib/format'

export default function BudgetBar({ spent, budget, color, compact }: { spent: number; budget: number; color?: string; compact?: boolean }) {
  const pct = Math.min(100, (spent / budget) * 100)
  const over = spent > budget
  const left = budget - spent
  return (
    <div className={compact ? 'mt-1' : 'mt-3'}>
      <div className={`${compact ? 'h-1.5' : 'h-2.5'} overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800`}>
        <div
          className={`h-full rounded-full ${over ? 'bg-red-500' : color ? '' : 'bg-brand-600'}`}
          style={{ width: `${pct}%`, ...(color && !over ? { backgroundColor: color } : {}) }}
        />
      </div>
      <p className={`mt-1 text-xs ${over ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {over ? `Te pasaste por ${formatMXN(-left)}` : `Quedan ${formatMXN(left)}`} de {formatMXN(budget)}
      </p>
    </div>
  )
}
