import { useCallback, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Pencil, Plus, Wallet } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import ProjectForm from '../../components/planning/ProjectForm'
import ProgressBar from '../../components/planning/ProgressBar'
import TaskForm from '../../components/planning/TaskForm'
import TaskItem from '../../components/planning/TaskItem'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { formatMXN, toISODate } from '../../lib/format'
import { toggleTaskDone } from '../../lib/tasks'
import { PRIORITIES, areaInfo, isDone, progressOf, projectStatusInfo, shortDate, type Goal, type Project, type Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type ProjectData = {
  project: Project | null
  goal: Goal | null
  goals: Pick<Goal, 'id' | 'title'>[]
  tasks: Task[]
  spent: number
}

export default function ProyectoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'project' | 'task' | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newStep, setNewStep] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const close = useCallback(() => setSheet(null), [])

  const { data, setData, error, reload, loading } = useLoad(async (): Promise<ProjectData> => {
    const project = await supabase.from('projects').select('*').eq('id', id!).maybeSingle().then(must<Project | null>)
    if (!project) return { project: null, goal: null, goals: [], tasks: [], spent: 0 }
    const [goal, goals, tasks, expenses] = await Promise.all([
      project.goal_id ? supabase.from('goals').select('*').eq('id', project.goal_id).maybeSingle().then(must<Goal | null>) : Promise.resolve(null),
      supabase.from('goals').select('id, title').eq('status', 'activa').order('title').then(must<Pick<Goal, 'id' | 'title'>[]>),
      supabase.from('tasks').select('*').eq('project_id', project.id).order('sort_order').order('created_at').then(must<Task[]>),
      supabase.from('expenses').select('amount').eq('project_id', project.id).then(must<{ amount: number }[]>),
    ])
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0)
    return { project, goal, goals, tasks, spent }
  }, [id])

  const today = toISODate(new Date())

  if (loading) return <p className="py-8 text-center text-slate-400">Cargando…</p>
  if (error || !data?.project)
    return (
      <div className="space-y-4">
        <Link to="/metas" className="-ml-2 flex items-center gap-1 p-2 text-sm text-slate-500">
          <ChevronLeft size={18} /> Metas
        </Link>
        <ErrorBox message={error ?? 'Este proyecto no existe o fue borrado.'} />
      </div>
    )

  const { project, goal, tasks, spent } = data
  const pending = tasks.filter((t) => !isDone(t))
  const done = tasks.filter(isDone)
  const { done: doneCount, total } = progressOf(tasks)
  const status = projectStatusInfo(project.status)
  const area = goal ? areaInfo(goal.area) : null
  const goalsForForm = goal && !data.goals.some((g) => g.id === goal.id) ? [goal, ...data.goals] : data.goals

  async function handleToggle(task: Task) {
    try {
      const updated = await toggleTaskDone(task)
      setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? updated : t)) })
      setActionError(null)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleAddStep(e: FormEvent) {
    e.preventDefault()
    const title = newStep.trim()
    if (!title) return
    const sort_order = Math.max(0, ...tasks.map((t) => t.sort_order)) + 1
    const { data: row, error } = await supabase.from('tasks').insert({ title, project_id: project.id, sort_order }).select().single()
    if (error) return setActionError(error.message)
    setNewStep('')
    setActionError(null)
    setData((d) => d && { ...d, tasks: [...d.tasks, row as Task] })
  }

  const openTask = (t: Task) => {
    setEditingTask(t)
    setSheet('task')
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <Link
          to={goal ? `/metas/${goal.id}` : '/metas'}
          className="-ml-2 flex min-w-0 items-center gap-1 rounded-lg p-2 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <ChevronLeft size={18} className="shrink-0" /> <span className="truncate">{goal ? goal.title : 'Metas'}</span>
        </Link>
        <button
          onClick={() => setSheet('project')}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <Pencil size={14} /> Editar
        </button>
      </header>

      <section className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className={`rounded-full px-2 py-0.5 ${status.className}`}>{status.label}</span>
          <span className="text-slate-500 dark:text-slate-400">Prioridad {PRIORITIES.find((p) => p.value === project.priority)!.label.toLowerCase()}</span>
        </div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        {project.description && <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">{project.description}</p>}
        {(project.start_date || project.due_date) && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {project.start_date && `Inicio: ${shortDate(project.start_date)}`}
            {project.start_date && project.due_date && ' · '}
            {project.due_date && `Límite: ${shortDate(project.due_date)}`}
          </p>
        )}
        <ProgressBar done={doneCount} total={total} color={area?.color} />
        {spent > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <Wallet size={14} /> Gastado en este proyecto: <strong>{formatMXN(spent)}</strong>
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Plan de acción</h2>
        <div className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
          {pending.map((t, i) => (
            <div key={t.id} className="flex items-start">
              <span className="w-6 shrink-0 pt-3.5 pl-3 text-xs tabular-nums text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <TaskItem task={t} today={today} onToggle={handleToggle} onOpen={openTask} />
              </div>
            </div>
          ))}
          <form onSubmit={handleAddStep} className="flex items-center gap-2 px-4 py-2.5">
            <Plus size={18} className="shrink-0 text-slate-400" />
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder={pending.length ? 'Siguiente paso…' : '¿Cuál es el primer paso?'}
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-slate-400"
            />
            {newStep.trim() && (
              <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-semibold text-white">
                Agregar
              </button>
            )}
          </form>
        </div>
        <p className="mt-2 px-1 text-xs text-slate-400">Toca un paso para ponerle fecha: así aparece en Pendientes el día que toca.</p>
      </section>

      <ErrorBox message={actionError} />

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Pasos completados ({done.length})
          </summary>
          <ul className={`${card} mt-2 divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {done.map((t) => (
              <li key={t.id}>
                <TaskItem task={t} today={today} onToggle={handleToggle} onOpen={openTask} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <Sheet open={sheet === 'project'} onClose={close} title="Editar proyecto">
        <ProjectForm
          project={project}
          goals={goalsForForm}
          onDone={(pid) => {
            if (!pid) return navigate(goal ? `/metas/${goal.id}` : '/metas', { replace: true })
            close()
            reload()
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'task'} onClose={close} title="Editar paso">
        <TaskForm
          task={editingTask}
          projects={[{ id: project.id, title: project.title }]}
          onDone={() => {
            close()
            reload()
          }}
        />
      </Sheet>
    </div>
  )
}
