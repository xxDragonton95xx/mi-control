import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, LogOut, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Sheet from '../components/Sheet'
import ErrorBox from '../components/ErrorBox'
import BudgetBar from '../components/BudgetBar'
import DayAgenda from '../components/agenda/DayAgenda'
import BlockForm from '../components/agenda/BlockForm'
import RoutineForm from '../components/agenda/RoutineForm'
import TaskItem from '../components/planning/TaskItem'
import TaskForm from '../components/planning/TaskForm'
import ProgressBar from '../components/planning/ProgressBar'
import ExpenseForm from './gastos/ExpenseForm'
import { useAgenda } from '../hooks/useAgenda'
import { useCategories } from '../hooks/useCategories'
import { useGeneralBudget } from '../hooks/useGeneralBudget'
import { must, useLoad } from '../hooks/useLoad'
import { addMonths, formatMXN, startOfMonth, toISODate } from '../lib/format'
import { routinesOn, type Routine, type TimeBlock } from '../lib/agenda'
import { toggleTaskDone } from '../lib/tasks'
import { areaInfo, isDone, sortTasks, type Goal, type Task } from '../lib/planning'
import { card } from '../lib/ui'

type SheetState =
  | { kind: 'block'; block: TimeBlock | null }
  | { kind: 'routine'; routine: Routine }
  | { kind: 'task'; task: Task | null }
  | { kind: 'expense' }
  | null

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos dÃ­as' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Hoy() {
  const today = toISODate(new Date())
  const monthStart = toISODate(startOfMonth(new Date()))
  const nextMonth = toISODate(addMonths(startOfMonth(new Date()), 1))
  const [sheet, setSheet] = useState<SheetState>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const close = useCallback(() => setSheet(null), [])

  const agenda = useAgenda(today, today)
  const { categories } = useCategories()
  const { budget } = useGeneralBudget()

  const overview = useLoad(async () => {
    const [pending, expenses, goals, projects, projectTasks] = await Promise.all([
      supabase.from('tasks').select('*').neq('status', 'hecha').lte('due_date', today).then(must<Task[]>),
      supabase.from('expenses').select('amount, spent_on').gte('spent_on', monthStart).lt('spent_on', nextMonth).then(must<{ amount: number; spent_on: string }[]>),
      supabase.from('goals').select('*').eq('status', 'activa').order('created_at').then(must<Goal[]>),
      supabase.from('projects').select('id, goal_id').then(must<{ id: string; goal_id: string | null }[]>),
      supabase.from('tasks').select('project_id, status').not('project_id', 'is', null).then(must<{ project_id: string; status: string }[]>),
    ])
    return { pending, expenses, goals, projects, projectTasks }
  }, [today, monthStart, nextMonth])

  const o = overview.data
  const a = agenda.data
  const projectTitle = useMemo(() => new Map((a?.projects ?? []).map((p) => [p.id, p.title])), [a])
  const openProjects = (a?.projects ?? []).filter((p) => p.status !== 'terminado')

  const pending = (o?.pending ?? []).slice().sort(sortTasks)
  const monthTotal = (o?.expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const todayTotal = (o?.expenses ?? []).filter((e) => e.spent_on === today).reduce((s, e) => s + Number(e.amount), 0)
  const routinesToday = a ? routinesOn(today, a.routines) : []
  const routinesDone = routinesToday.filter((r) => a?.checks.some((c) => c.routine_id === r.id && c.check_date === today && c.done)).length

  const goalProgress = (goalId: string) => {
    const ids = new Set((o?.projects ?? []).filter((p) => p.goal_id === goalId).map((p) => p.id))
    const tasks = (o?.projectTasks ?? []).filter((t) => ids.has(t.project_id))
    return { done: tasks.filter((t) => t.status === 'hecha').length, total: tasks.length }
  }

  async function togglePending(task: Task) {
    try {
      const updated = await toggleTaskDone(task)
      overview.setData((d) => d && { ...d, pending: d.pending.map((t) => (t.id === updated.id ? updated : t)) })
      setActionError(null)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  const afterSave = () => {
    close()
    agenda.reload()
    overview.reload()
  }

  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const pendingOpen = pending.filter((t) => !isDone(t)).length

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}</h1>
          <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{fecha}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <LogOut size={16} /> Salir
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Pendientes" value={String(pendingOpen)} tone={pending.some((t) => !isDone(t) && t.due_date! < today) ? 'warn' : undefined} />
        <Stat label="Rutinas" value={routinesToday.length ? `${routinesDone}/${routinesToday.length}` : 'â€”'} />
        <Stat label="Gastado hoy" value={formatMXN(todayTotal).replace('.00', '')} />
      </div>

      <ErrorBox message={agenda.error ?? overview.error ?? actionError} />

      <section>
        <SectionHeader title="Agenda de hoy" to="/semana" linkText="Semana">
          <button onClick={() => setSheet({ kind: 'block', block: null })} className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500">
            <Plus size={16} /> Actividad
          </button>
        </SectionHeader>
        {a ? (
          <DayAgenda
            date={today}
            today={today}
            data={a}
            setData={agenda.setData}
            onOpenBlock={(block) => setSheet({ kind: 'block', block })}
            onOpenRoutine={(routine) => setSheet({ kind: 'routine', routine })}
            emptyText="Nada agendado para hoy."
          />
        ) : (
          <p className="py-4 text-center text-slate-400">Cargandoâ€¦</p>
        )}
      </section>

      <section>
        <SectionHeader title="Pendientes para hoy" to="/pendientes" linkText="Todos">
          <button onClick={() => setSheet({ kind: 'task', task: null })} className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500">
            <Plus size={16} /> Tarea
          </button>
        </SectionHeader>
        {!o ? (
          <p className="py-4 text-center text-slate-400">Cargandoâ€¦</p>
        ) : pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Â¡Nada pendiente para hoy! ðŸŽ‰
          </p>
        ) : (
          <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {pending.map((t) => (
              <li key={t.id}>
                <TaskItem
                  task={t}
                  today={today}
                  projectTitle={t.project_id ? projectTitle.get(t.project_id) : null}
                  onToggle={togglePending}
                  onOpen={(task) => setSheet({ kind: 'task', task })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title="Gastos del mes" to="/gastos" linkText="Detalle" />
        <div className={card}>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums">{formatMXN(monthTotal)}</p>
            <button
              onClick={() => setSheet({ kind: 'expense' })}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-brand-700"
            >
              <Plus size={16} /> Gasto
            </button>
          </div>
          {budget ? (
            <BudgetBar spent={monthTotal} budget={budget} />
          ) : (
            <Link to="/gastos" className="mt-1 block text-sm text-brand-600 dark:text-brand-500">
              Define tu presupuesto del mes â†’
            </Link>
          )}
        </div>
      </section>

      {o && o.goals.length > 0 && (
        <section>
          <SectionHeader title="Tus metas" to="/metas" linkText="Ver todas" />
          <ul className={`${card} space-y-4`}>
            {o.goals.slice(0, 4).map((g) => {
              const area = areaInfo(g.area)
              const Icon = area.icon
              const p = goalProgress(g.id)
              return (
                <li key={g.id}>
                  <Link to={`/metas/${g.id}`} className="flex items-center gap-3">
                    <Icon size={20} style={{ color: area.color }} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      <ProgressBar done={p.done} total={p.total} color={area.color} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Sheet open={sheet?.kind === 'block'} onClose={close} title={sheet?.kind === 'block' && sheet.block ? 'Editar actividad' : 'Nueva actividad'}>
        {sheet?.kind === 'block' && <BlockForm block={sheet.block} defaultDate={today} tasks={pending.filter((t) => !isDone(t))} projects={openProjects} onDone={afterSave} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'routine'} onClose={close} title="Editar rutina">
        {sheet?.kind === 'routine' && <RoutineForm routine={sheet.routine} onDone={afterSave} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'task'} onClose={close} title={sheet?.kind === 'task' && sheet.task ? 'Editar tarea' : 'Nueva tarea'}>
        {sheet?.kind === 'task' && <TaskForm task={sheet.task} projects={openProjects} onDone={afterSave} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'expense'} onClose={close} title="Nuevo gasto">
        {sheet?.kind === 'expense' && <ExpenseForm categories={categories} projects={openProjects} expense={null} onDone={afterSave} />}
      </Sheet>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className={`${card} px-2 py-3`}>
      <p className={`text-lg font-bold tabular-nums ${tone === 'warn' ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function SectionHeader({ title, to, linkText, children }: { title: string; to: string; linkText: string; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-1">
      <Link to={to} className="flex items-center gap-0.5 font-semibold">
        {title}
        <ChevronRight size={16} className="text-slate-400" />
        <span className="sr-only">{linkText}</span>
      </Link>
      {children}
    </div>
  )
}
