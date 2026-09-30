export default function ProgressBar({ done, total, color }: { done: number; total: number; color?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color ? '' : 'bg-brand-600'}`} style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {total === 0 ? 'Sin pasos todavía' : `${done} de ${total} · ${pct}%`}
      </p>
    </div>
  )
}
