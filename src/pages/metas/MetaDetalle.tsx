import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import GoalForm from '../../components/planning/GoalForm'
import ProjectForm from '../../components/planning/ProjectForm'
import ProjectCard from '../../components/planning/ProjectCard'
import ProgressBar from '../../components/planning/ProgressBar'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { GOAL_STATUSES, areaInfo, isDone, shortDate, type Goal, type Project, type Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type TaskLite = Pick<Task, 'id' | 'project_id' | 'status'>

export default function MetaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'goal' | 'project' | null>(null)
  const close = useCallback(() => setSheet(null), [])

  const { data, error, reload, loading } = useLoad(async () => {
    const [goal, goals, projects] = await Promise.all([
      supabase.from('goals').select('*').eq('id', id!).maybeSingle().then(must<Goal | null>),
      supabase.from('goals').select('id, title').eq('status', 'activa').order('title').then(must<Pick<Goal, 'id' | 'title'>[]>),
      supabase.from('projects').select('*').eq('goal_id', id!).order('created_at').then(must<Project[]>),
    ])
    const tasks = projects.length
      ? await supabase
          .from('tasks')
          .select('id, project_id, status')
          .in(
            'project_id',
            projects.map((p) => p.id),
          )
          .then(must<TaskLite[]>)
      : []
    return { goal, goals, projects, tasks }
  }, [id])

  const tasksByProject = useMemo(() => {
    const m = new Map<string, TaskLite[]>()
    for (const t of data?.tasks ?? []) m.set(t.project_id!, [...(m.get(t.project_id!) ?? []), t])
    return m
  }, [data])

  if (loading) return <p className="py-8 text-center text-slate-400">Cargando…</p>
  if (error || !data?.goal)
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBox message={error ?? 'Esta meta no existe o fue borrada.'} />
      </div>
    )

  const { goal, projects, tasks } = data
  const area = areaInfo(goal.area)
  const Icon = area.icon
  const done = tasks.filter((t) => isDone(t as Task)).length
  const status = GOAL_STATUSES.find((s) => s.value === goal.status)!.label

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <BackLink />
        <button
          onClick={() => setSheet('goal')}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <Pencil size={14} /> Editar
        </button>
      </header>

      <section className={`${card} space-y-3`}>
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: area.color }}>
          <Icon size={18} /> {area.label}
          <span className="text-slate-400">· {status}</span>
        </div>
        <h1 className="text-2xl font-bold">{goal.title}</h1>
        {goal.description && <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">{goal.description}</p>}
        {goal.target_date && <p className="text-sm text-slate-500 dark:text-slate-400">Fecha meta: {shortDate(goal.target_date)}</p>}
        <ProgressBar done={done} total={tasks.length} color={area.color} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Proyectos</h2>
          <button onClick={() => setSheet('project')} className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500">
            <Plus size={14} /> Proyecto
          </button>
        </div>
        {projects.length === 0 ? (
          <button
            onClick={() => setSheet('project')}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
          >
            ¿Qué proyecto te acerca a esta meta? <span className="font-semibold text-brand-600 dark:text-brand-500">Créalo aquí</span>
          </button>
        ) : (
          <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} tasks={tasksByProject.get(p.id) ?? []} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={sheet === 'goal'} onClose={close} title="Editar meta">
        <GoalForm
          goal={goal}
          onDone={(deleted) => {
            if (deleted) return navigate('/metas', { replace: true })
            close()
            reload()
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'project'} onClose={close} title="Nuevo proyecto">
        <ProjectForm
          project={null}
          goals={data.goals.some((g) => g.id === goal.id) ? data.goals : [goal, ...data.goals]}
          defaultGoalId={goal.id} onDone={(pid) => pid && navigate(`/metas/proyectos/${pid}`)} />
      </Sheet>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/metas" className="-ml-2 flex items-center gap-1 rounded-lg p-2 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800">
      <ChevronLeft size={18} /> Metas
    </Link>
  )
}
