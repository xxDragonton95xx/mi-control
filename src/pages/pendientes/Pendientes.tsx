import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import TaskItem from '../../components/planning/TaskItem'
import TaskForm from '../../components/planning/TaskForm'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/format'
import { toggleTaskDone } from '../../lib/tasks'
import { addDays, endOfWeek, isDone, sortTasks, type Project, type Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type View = 'hoy' | 'semana' | 'todas' | 'hechas'
type When = 'hoy' | 'manana' | 'sin'

const VIEWS: { value: View; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'todas', label: 'Todas' },
  { value: 'hechas', label: 'Hechas' },
]

export default function Pendientes() {
  const [view, setView] = useState<View>('hoy')
  const [quick, setQuick] = useState('')
  const [when, setWhen] = useState<When>('hoy')
  const [editing, setEditing] = useState<Task | null>(null)
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, setData, error, reload, loading } = useLoad(async () => {
    const [tasks, projects] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at').then(must<Task[]>),
      supabase.from('projects').select('id, title, status').order('title').then(must<Pick<Project, 'id' | 'title' | 'status'>[]>),
    ])
    return { tasks, projects }
  }, [])

  const today = toISODate(new Date())
  const tomorrow = addDays(today, 1)
  const weekEnd = endOfWeek(new Date())

  const projectTitle = useMemo(() => new Map((data?.projects ?? []).map((p) => [p.id, p.title])), [data])
  const openProjects = (data?.projects ?? []).filter((p) => p.status !== 'terminado' || p.id === editing?.project_id)

  const sections = useMemo(() => {
    const tasks = data?.tasks ?? []
    if (view === 'hechas') {
      const done = tasks
        .filter(isDone)
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
        .slice(0, 50)
      return [{ title: 'Completadas recientemente', tasks: done }]
    }
    const pending = tasks.filter((t) => !isDone(t)).sort(sortTasks)
    const pick = (fn: (d: string | null) => boolean) => pending.filter((t) => fn(t.due_date))
    const all = [
      { key: 'vencidas', title: 'Vencidas', tasks: pick((d) => !!d && d < today) },
      { key: 'hoy', title: 'Hoy', tasks: pick((d) => d === today) },
      { key: 'manana', title: 'Mañana', tasks: pick((d) => d === tomorrow) },
      { key: 'semana', title: 'Resto de la semana', tasks: pick((d) => !!d && d > tomorrow && d <= weekEnd) },
      { key: 'despues', title: 'Más adelante', tasks: pick((d) => !!d && d > tomorrow && d > weekEnd) },
      { key: 'sin', title: 'Sin fecha', tasks: pick((d) => !d) },
    ]
    const keys: Record<Exclude<View, 'hechas'>, string[]> = {
      hoy: ['vencidas', 'hoy'],
      semana: ['vencidas', 'hoy', 'manana', 'semana'],
      todas: all.map((s) => s.key),
    }
    return all.filter((s) => keys[view].includes(s.key) && s.tasks.length > 0)
  }, [data, view, today, tomorrow, weekEnd])

  const counts = useMemo(() => {
    const pending = (data?.tasks ?? []).filter((t) => !isDone(t))
    return {
      hoy: pending.filter((t) => t.due_date && t.due_date <= today).length,
      semana: pending.filter((t) => t.due_date && t.due_date <= (tomorrow > weekEnd ? tomorrow : weekEnd)).length,
      todas: pending.length,
    } as Partial<Record<View, number>>
  }, [data, today, tomorrow, weekEnd])

  async function handleToggle(task: Task) {
    try {
      const updated = await toggleTaskDone(task)
      setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? updated : t)) })
      setActionError(null)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    const due_date = when === 'hoy' ? today : when === 'manana' ? tomorrow : null
    const { data: row, error } = await supabase.from('tasks').insert({ title, due_date }).select().single()
    if (error) return setActionError(error.message)
    setQuick('')
    setActionError(null)
    setData((d) => d && { ...d, tasks: [...d.tasks, row as Task] })
  }

  const close = useCallback(() => setOpen(false), [])
  const openTask = (t: Task | null) => {
    setEditing(t)
    setOpen(true)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pendientes</h1>
        <button
          onClick={() => openTask(null)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 active:bg-slate-200 dark:text-brand-500 dark:active:bg-slate-800"
        >
          <Plus size={16} /> Detallado
        </button>
      </header>

      <form onSubmit={handleQuickAdd} className={`${card} space-y-3`}>
        <div className="flex gap-2">
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Agregar pendiente…"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-slate-400"
          />
          <button type="submit" disabled={!quick.trim()} aria-label="Agregar" className="rounded-lg bg-brand-600 p-2 text-white disabled:opacity-40">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex gap-2 text-xs font-medium">
          {(
            [
              ['hoy', 'Hoy'],
              ['manana', 'Mañana'],
              ['sin', 'Sin fecha'],
            ] as const
          ).map(([v, label]) => (
            <button
              type="button"
              key={v}
              onClick={() => setWhen(v)}
              className={`rounded-full px-3 py-1 ${
                when === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              view === v.value
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
            }`}
          >
            {v.label}
            {counts[v.value] ? <span className="ml-1.5 opacity-60">{counts[v.value]}</span> : null}
          </button>
        ))}
      </div>

      <ErrorBox message={error ?? actionError} />

      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : sections.length === 0 || sections.every((s) => s.tasks.length === 0) ? (
        <p className="py-10 text-center text-slate-500 dark:text-slate-400">
          {view === 'hechas' ? 'Aún no completas ninguna tarea.' : view === 'hoy' ? '¡Nada pendiente para hoy! 🎉' : 'No hay pendientes aquí.'}
        </p>
      ) : (
        sections.map((s) => (
          <section key={s.title}>
            <h2
              className={`mb-2 px-1 text-sm font-semibold ${s.title === 'Vencidas' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {s.title} <span className="font-normal text-slate-400">{s.tasks.length}</span>
            </h2>
            <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
              {s.tasks.map((t) => (
                <li key={t.id}>
                  <TaskItem task={t} today={today} projectTitle={t.project_id ? projectTitle.get(t.project_id) : null} onToggle={handleToggle} onOpen={openTask} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Sheet open={open} onClose={close} title={editing ? 'Editar tarea' : 'Nueva tarea'}>
        <TaskForm
          task={editing}
          projects={openProjects}
          onDone={() => {
            setOpen(false)
            reload()
          }}
        />
      </Sheet>
    </div>
  )
}
