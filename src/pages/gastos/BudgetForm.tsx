import { useState, type FormEvent } from 'react'
import { useGeneralBudget } from '../../hooks/useGeneralBudget'
import { formatMXN, parseAmount } from '../../lib/format'
import { inputClass, primaryButton } from '../../lib/ui'

type Props = {
  /** Suma de los presupuestos por categoría, para avisar si superan el general. */
  categoryBudgetsTotal: number
  onDone: () => void
}

export default function BudgetForm({ categoryBudgetsTotal, onDone }: Props) {
  const { budget, save } = useGeneralBudget()
  const [value, setValue] = useState(budget ? String(budget) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = parseAmount(value)
  const valid = parsed > 0

  async function submit(next: number | null) {
    setBusy(true)
    const err = await save(next)
    setBusy(false)
    if (err) setError(err)
    else onDone()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (valid) submit(Math.round(parsed * 100) / 100)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cuánto quieres gastar como máximo cada mes. Aplica a todos los meses y lo puedes cambiar cuando quieras.
      </p>
      <div className="relative">
        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-xl text-slate-400">$</span>
        <input
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          className={`${inputClass} pl-9 text-xl font-semibold`}
        />
      </div>

      {valid && categoryBudgetsTotal > parsed && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Tus presupuestos por categoría suman {formatMXN(categoryBudgetsTotal)}, más que este presupuesto general.
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <button type="submit" disabled={!valid || busy} className={primaryButton}>
        {busy ? 'Guardando…' : 'Guardar presupuesto'}
      </button>
      {budget && (
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(null)}
          className="w-full py-2 text-sm font-medium text-red-600 dark:text-red-400"
        >
          Quitar presupuesto general
        </button>
      )}
    </form>
  )
}
