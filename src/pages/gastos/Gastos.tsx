import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Pencil, Plus, Settings2 } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ExpenseForm from './ExpenseForm'
import BudgetForm from './BudgetForm'
import { useCategories } from '../../hooks/useCategories'
import { useExpenses } from '../../hooks/useExpenses'
import { useGeneralBudget } from '../../hooks/useGeneralBudget'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { CategoryBadge } from '../../lib/categoryIcons'
import { addMonths, dayLabel, formatMXN, monthLabel, startOfMonth, toISODate } from '../../lib/format'
import { card } from '../../lib/ui'
import { paymentLabel, type Category, type Expense } from '../../lib/types'

const UNCATEGORIZED: Category = { id: '', name: 'Sin categoría', color: '#94a3b8', icon: null, monthly_budget: null, sort_order: 999 }

export default function Gastos() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [view, setView] = useState<'lista' | 'categorias'>('lista')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const { categories } = useCategories()
  const { expenses, loading, error, reload } = useExpenses(month)
  const { budget: generalBudget } = useGeneralBudget()
  const { data: projects } = useLoad(
    () =>
      supabase
        .from('projects')
        .select('id, title, status')
        .order('title')
        .then(must<{ id: string; title: string; status: string }[]>),
    [],
  )

  const today = toISODate(new Date())
  const isCurrentMonth = toISODate(month) === toISODate(startOfMonth(new Date()))

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const catOf = (e: Expense) => (e.category_id && categoryById.get(e.category_id)) || UNCATEGORIZED

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const categoryBudgetsTotal = categories.reduce((s, c) => s + (c.monthly_budget ?? 0), 0)

  const byDay = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const e of expenses) groups.set(e.spent_on, [...(groups.get(e.spent_on) ?? []), e])
    return [...groups.entries()]
  }, [expenses])

  const byCategory = useMemo(() => {
    const sums = new Map<string, number>()
    for (const e of expenses) sums.set(e.category_id ?? '', (sums.get(e.category_id ?? '') ?? 0) + e.amount)
    const rows = categories.map((c) => ({ cat: c, spent: sums.get(c.id) ?? 0 }))
    if (sums.has('')) rows.push({ cat: UNCATEGORIZED, spent: sums.get('')! })
    return rows.filter((r) => r.spent > 0 || r.cat.monthly_budget).sort((a, b) => b.spent - a.spent)
  }, [expenses, categories])

  const openNew = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (e: Expense) => {
    setEditing(e)
    setSheetOpen(true)
  }
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const closeBudget = useCallback(() => setBudgetOpen(false), [])
  const onSaved = () => {
    setSheetOpen(false)
    reload()
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <Link
          to="/gastos/categorias"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <Settings2 size={16} /> Categorías
        </Link>
      </header>

      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior" className="rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronLeft size={20} />
        </button>
        <p className="font-semibold capitalize">{monthLabel(month)}</p>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={isCurrentMonth}
          aria-label="Mes siguiente"
          className="rounded-full p-2 active:bg-slate-200 disabled:opacity-30 dark:active:bg-slate-800"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <section className={card}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total del mes</p>
            <p className="text-3xl font-bold tabular-nums">{formatMXN(total)}</p>
          </div>
          {generalBudget && (
            <button
              onClick={() => setBudgetOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
            >
              <Pencil size={14} /> Presupuesto
            </button>
          )}
        </div>
        {generalBudget ? (
          <BudgetBar spent={total} budget={generalBudget} />
        ) : (
          <button onClick={() => setBudgetOpen(true)} className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-500">
            + Definir presupuesto del mes
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 text-sm font-medium dark:bg-slate-800">
        {(['lista', 'categorias'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg py-1.5 ${view === v ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {v === 'lista' ? 'Movimientos' : 'Por categoría'}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : expenses.length === 0 && view === 'lista' ? (
        <div className="py-10 text-center text-slate-500 dark:text-slate-400">
          <p>No hay gastos este mes.</p>
          <button onClick={openNew} className="mt-2 font-medium text-brand-600 dark:text-brand-500">
            Registra el primero
          </button>
        </div>
      ) : view === 'lista' ? (
        <div className="space-y-5">
          {byDay.map(([day, items]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between px-1 text-sm">
                <h2 className="font-semibold capitalize text-slate-600 dark:text-slate-300">{dayLabel(day, today)}</h2>
                <span className="tabular-nums text-slate-400">{formatMXN(items.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
                {items.map((e) => {
                  const c = catOf(e)
                  return (
                    <li key={e.id}>
                      <button onClick={() => openEdit(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800/50">
                        <CategoryBadge icon={c.icon} color={c.color} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{e.description || c.name}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {e.description ? `${c.name} · ` : ''}
                            {paymentLabel(e.payment_method)}
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatMXN(e.amount)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className={`${card} space-y-4`}>
          {byCategory.length === 0 && <li className="py-4 text-center text-slate-500">Sin datos este mes.</li>}
          {byCategory.map(({ cat, spent }) => (
            <li key={cat.id || 'none'} className="flex items-center gap-3">
              <CategoryBadge icon={cat.icon} color={cat.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{cat.name}</span>
                  <span className="font-semibold tabular-nums">{formatMXN(spent)}</span>
                </div>
                {cat.monthly_budget ? (
                  <BudgetBar spent={spent} budget={cat.monthly_budget} color={cat.color} compact />
                ) : (
                  <p className="text-xs text-slate-400">{total > 0 ? `${Math.round((spent / total) * 100)}% del total` : ''}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={openNew}
        aria-label="Agregar gasto"
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg active:bg-brand-700 sm:right-[calc(50%-20rem)]"
      >
        <Plus size={28} />
      </button>

      <Sheet open={sheetOpen} onClose={closeSheet} title={editing ? 'Editar gasto' : 'Nuevo gasto'}>
        <ExpenseForm
          categories={categories}
          projects={(projects ?? []).filter((p) => p.status !== 'terminado' || p.id === editing?.project_id)}
          expense={editing}
          onDone={onSaved}
        />
      </Sheet>

      <Sheet open={budgetOpen} onClose={closeBudget} title="Presupuesto del mes">
        <BudgetForm categoryBudgetsTotal={categoryBudgetsTotal} onDone={closeBudget} />
      </Sheet>
    </div>
  )
}

function BudgetBar({ spent, budget, color, compact }: { spent: number; budget: number; color?: string; compact?: boolean }) {
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
