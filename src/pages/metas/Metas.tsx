import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import GoalForm from '../../components/planning/GoalForm'
import ProjectForm from '../../components/planning/ProjectForm'
import ProjectCard from '../../components/planning/ProjectCard'
import ProgressBar from '../../components/planning/ProgressBar'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { areaInfo, isDone, shortDate, type Goal, type Project, type Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type TaskLite = Pick<Task, 'id' | 'project_id' | 'status'>

export default function Metas() {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'goal' | 'project' | null>(null)
  const close = useCallback(() => setSheet(null), [])

  const { data, error, reload, loading } = useLoad(async () => {
    const [goals, projects, tasks] = await Promise.all([
      supabase.from('goals').select('*').order('created_at').then(must<Goal[]>),
      supabase.from('projects').select('*').order('created_at').then(must<Project[]>),
      supabase.from('tasks').select('id, project_id, status').not('project_id', 'is', null).then(must<TaskLite[]>),
    ])
    return { goals, projects, tasks }
  }, [])

  const tasksByProject = useMemo(() => {
    const m = new Map<string, TaskLite[]>()
    for (const t of data?.tasks ?? []) m.set(t.project_id!, [...(m.get(t.project_id!) ?? []), t])
    return m
  }, [data])

  const goalStats = (goalId: string) => {
    const projects = (data?.projects ?? []).filter((p) => p.goal_id === goalId)
    const tasks = projects.flatMap((p) => tasksByProject.get(p.id) ?? [])
    return { projects: projects.length, done: tasks.filter((t) => isDone(t as Task)).length, total: tasks.length }
  }

  const activeGoals = (data?.goals ?? []).filter((g) => g.status === 'activa')
  const otherGoals = (data?.goals ?? []).filter((g) => g.status !== 'activa')
  const looseProjects = (data?.projects ?? []).filter((p) => !p.goal_id)
  const isEmpty = data && data.goals.length === 0 && data.projects.length === 0

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <button
          onClick={() => setSheet('goal')}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-brand-700"
        >
          <Plus size={16} /> Meta
        </button>
      </header>

      <ErrorBox message={error} />

      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : isEmpty ? (
        <div className={`${card} space-y-3 text-sm text-slate-600 dark:text-slate-300`}>
          <p className="font-semibold text-slate-900 dark:text-white">¿Cómo funciona?</p>
          <p>
            <strong>Meta</strong> → lo que quieres lograr (ej: <em>"Mejorar mi salud"</em>).
          </p>
          <p>
            <strong>Proyecto</strong> → un esfuerzo concreto para llegar ahí (ej: <em>"Correr un 10K"</em>).
          </p>
          <p>
            <strong>Plan de acción</strong> → los pasos del proyecto (ej: <em>"Comprar tenis"</em>, <em>"Correr 3 veces por semana"</em>). Aparecen
            también en Pendientes.
          </p>
          <button onClick={() => setSheet('goal')} className="font-semibold text-brand-600 dark:text-brand-500">
            Crea tu primera meta →
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            {activeGoals.length === 0 && <p className="text-sm text-slate-500">No tienes metas activas.</p>}
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} stats={goalStats(g.id)} />
            ))}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Proyectos sin meta</h2>
              <button onClick={() => setSheet('project')} className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500">
                <Plus size={14} /> Proyecto
              </button>
            </div>
            {looseProjects.length === 0 ? (
              <p className="px-1 text-sm text-slate-400">Ninguno. Los proyectos normalmente van dentro de una meta.</p>
            ) : (
              <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
                {looseProjects.map((p) => (
                  <li key={p.id}>
                    <ProjectCard project={p} tasks={tasksByProject.get(p.id) ?? []} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {otherGoals.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span> Metas logradas, pausadas o descartadas ({otherGoals.length})
              </summary>
              <div className="mt-3 space-y-3 opacity-75">
                {otherGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} stats={goalStats(g.id)} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <Sheet open={sheet === 'goal'} onClose={close} title="Nueva meta">
        <GoalForm
          goal={null}
          onDone={() => {
            close()
            reload()
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'project'} onClose={close} title="Nuevo proyecto">
        <ProjectForm project={null} goals={activeGoals} onDone={(id) => id && navigate(`/metas/proyectos/${id}`)} />
      </Sheet>
    </div>
  )
}

function GoalCard({ goal, stats }: { goal: Goal; stats: { projects: number; done: number; total: number } }) {
  const area = areaInfo(goal.area)
  const Icon = area.icon
  return (
    <Link to={`/metas/${goal.id}`} className={`${card} flex items-center gap-3 active:bg-slate-50 dark:active:bg-slate-800/50`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${area.color}22`, color: area.color }}>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate font-semibold">{goal.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {area.label} · {stats.projects} {stats.projects === 1 ? 'proyecto' : 'proyectos'}
          {goal.target_date && ` · para el ${shortDate(goal.target_date)}`}
        </p>
        <ProgressBar done={stats.done} total={stats.total} color={area.color} />
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  )
}
