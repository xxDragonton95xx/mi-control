import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { parseAmount, toISODate } from '../../lib/format'
import { CategoryBadge } from '../../lib/categoryIcons'
import { inputClass, primaryButton } from '../../lib/ui'
import { PAYMENT_METHODS, type Category, type Expense, type PaymentMethod } from '../../lib/types'

type Props = {
  categories: Category[]
  projects: { id: string; title: string }[]
  expense: Expense | null
  onDone: () => void
}

export default function ExpenseForm({ categories, projects, expense, onDone }: Props) {
  const [projectId, setProjectId] = useState(expense?.project_id ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(expense?.category_id ?? null)
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? toISODate(new Date()))
  const [description, setDescription] = useState(expense?.description ?? '')
  const [method, setMethod] = useState<PaymentMethod>(expense?.payment_method ?? 'debito')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = parseAmount(amount)
  const valid = value > 0 && categoryId !== null && spentOn !== ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const row = {
      amount: Math.round(value * 100) / 100,
      category_id: categoryId,
      spent_on: spentOn,
      description: description.trim() || null,
      payment_method: method,
      project_id: projectId || null,
    }
    const { error } = expense
      ? await supabase.from('expenses').update(row).eq('id', expense.id)
      : await supabase.from('expenses').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!expense || !confirm('¿Borrar este gasto?')) return
    setBusy(true)
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="sr-only">Monto</span>
        <div className="flex items-baseline justify-center gap-1 border-b-2 border-slate-200 pb-2 focus-within:border-brand-600 dark:border-slate-700">
          <span className="text-3xl font-semibold text-slate-400">$</span>
          <input
            inputMode="decimal"
            autoFocus={!expense}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full max-w-[12rem] bg-transparent text-center text-4xl font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
          <span className="text-sm font-medium text-slate-400">MXN</span>
        </div>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categoría</legend>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => {
            const selected = c.id === categoryId
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition ${
                  selected
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-700/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <CategoryBadge icon={c.icon} color={c.color} size={32} />
                <span className="w-full truncate text-center">{c.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fecha</span>
          <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Pago</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${inputClass} py-2.5`}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Descripción <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: súper de la semana"
          maxLength={120}
          className={inputClass}
        />
      </label>

      {projects.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Proyecto <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClass} py-2.5`}>
            <option value="">Ninguno</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="flex gap-3">
        {expense && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar gasto"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!valid || busy} className={primaryButton}>
          {busy ? 'Guardando…' : expense ? 'Guardar cambios' : 'Agregar gasto'}
        </button>
      </div>
    </form>
  )
}
