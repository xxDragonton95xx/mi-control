import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import Sheet from '../../components/Sheet'
import { useCategories } from '../../hooks/useCategories'
import { supabase } from '../../lib/supabase'
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryBadge } from '../../lib/categoryIcons'
import { formatMXN, parseAmount } from '../../lib/format'
import { card, inputClass, primaryButton } from '../../lib/ui'
import type { Category } from '../../lib/types'

export default function Categorias() {
  const { categories, loading, error, reload } = useCategories()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  const totalBudget = categories.reduce((s, c) => s + (c.monthly_budget ?? 0), 0)
  const nextOrder = Math.max(0, ...categories.map((c) => c.sort_order)) + 1

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Link to="/gastos" aria-label="Volver" className="-ml-2 rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold">Categorías</h1>
      </header>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Toca una categoría para cambiar su nombre, color o presupuesto mensual.
        {totalBudget > 0 && (
          <>
            {' '}
            Presupuesto total: <strong className="text-slate-700 dark:text-slate-200">{formatMXN(totalBudget)}</strong>
          </>
        )}
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setEditing(c)
                  setOpen(true)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800/50"
              >
                <CategoryBadge icon={c.icon} color={c.color} />
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  {c.monthly_budget ? formatMXN(c.monthly_budget) : 'Sin presupuesto'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 font-medium text-slate-600 active:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:active:bg-slate-900"
      >
        <Plus size={18} /> Nueva categoría
      </button>

      <Sheet open={open} onClose={close} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <CategoryForm
          category={editing}
          nextOrder={nextOrder}
          onDone={() => {
            setOpen(false)
            reload()
          }}
        />
      </Sheet>
    </div>
  )
}

function CategoryForm({ category, nextOrder, onDone }: { category: Category | null; nextOrder: number; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [budget, setBudget] = useState(category?.monthly_budget ? String(category.monthly_budget) : '')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(category?.icon ?? 'shopping-cart')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const budgetValue = budget.trim() === '' ? null : parseAmount(budget)
  const valid = name.trim() !== '' && (budgetValue === null || budgetValue >= 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const row = { name: name.trim(), color, icon, monthly_budget: budgetValue }
    const { error } = category
      ? await supabase.from('categories').update(row).eq('id', category.id)
      : await supabase.from('categories').insert({ ...row, sort_order: nextOrder })
    setBusy(false)
    if (error) setError(error.code === '23505' ? 'Ya tienes una categoría con ese nombre.' : error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!category) return
    if (!confirm(`¿Borrar "${category.name}"? Sus gastos se conservan, pero quedarán "Sin categoría".`)) return
    setBusy(true)
    const { error } = await supabase.from('categories').delete().eq('id', category.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={icon} color={color} size={48} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" maxLength={40} required className={inputClass} />
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Presupuesto mensual <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <div className="relative">
          <span className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400">$</span>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" className={`${inputClass} pl-8`} />
        </div>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${color === c ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ícono</legend>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              type="button"
              key={key}
              onClick={() => setIcon(key)}
              aria-label={key}
              className={`flex aspect-square items-center justify-center rounded-xl border ${
                icon === key ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'border-slate-200 text-slate-500 dark:border-slate-800'
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="flex gap-3">
        {category && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar categoría"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!valid || busy} className={primaryButton}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
