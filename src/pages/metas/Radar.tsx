import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ChevronLeft, ChevronRight, Lightbulb, PartyPopper, Target } from 'lucide-react'
import ErrorBox from '../../components/ErrorBox'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/format'
import { shortDate, type Project, type ProjectLog, type Task } from '../../lib/planning'
import { FRESH_BG, FRESH_TEXT, STALE_DAYS, WIP_LIMIT, daysSince, dueSoon, focusScore, freshness, nextStep } from '../../lib/radar'
import { card } from '../../lib/ui'

type StepLite = Pick<Task, 'id' | 'project_id' | 'title' | 'status' | 'sort_order' | 'created_at' | 'completed_at'>

export default function Radar() {
  const [actionError, setActionError] = useState<string | null>(null)
  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 86_400_000).toISOString(), [])

  const { data, error, reload, loading } = useLoad(async () => {
    const [projects, steps, logs] = await Promise.all([
      supabase.from('projects').select('*').order('created_at').then(must<Project[]>),
      supabase
        .from('tasks')
        .select('id, project_id, title, status, sort_order, created_at, completed_at')
        .not('project_id', 'is', null)
        .then(must<StepLite[]>),
      supabase.from('project_logs').select('*').gte('created_at', weekAgo).order('created_at', { ascending: false }).then(must<ProjectLog[]>),
    ])
    return { projects, steps, logs }
  }, [weekAgo])

  const today = toISODate(new Date())

  const view = useMemo(() => {
    if (!data) return null
    const stepsBy = new Map<string, StepLite[]>()
    for (const s of data.steps) stepsBy.set(s.project_id!, [...(stepsBy.get(s.project_id!) ?? []), s])
    const title = new Map(data.projects.map((p) => [p.id, p.title]))
    const active = data.projects.filter((p) => p.status === 'activo')
    const stale = active.filter((p) => daysSince(p.last_activity_at) > STALE_DAYS)
    const noNext = active.filter((p) => !nextStep(stepsBy.get(p.id) ?? []))
    const due = active.filter((p) => dueSoon(p, today))
    const pendingSteps = active.reduce((n, p) => n + (stepsBy.get(p.id) ?? []).filter((s) => s.status !== 'hecha').length, 0)
    const month = today.slice(0, 7)
    const finishedThisMonth = data.projects.filter((p) => p.status === 'terminado' && toISODate(new Date(p.last_activity_at)).slice(0, 7) === month)
    const focus = [...active].sort((a, b) => focusScore(b, today) - focusScore(a, today)).slice(0, 3)
    const moving = data.projects
      .filter((p) => p.status === 'activo' || p.status === 'pausado')
      .map((p) => ({ p, days: daysSince(p.last_activity_at) }))
      .sort((a, b) => b.days - a.days)
    const ideas = data.projects.filter((p) => p.status === 'idea')
    const stepsDone = data.steps.filter((s) => s.completed_at && s.completed_at >= weekAgo).length
    const notes = data.logs.filter((l) => !l.auto).length
    return { stepsBy, title, active, stale, noNext, due, pendingSteps, finishedThisMonth, focus, moving, ideas, stepsDone, notes }
  }, [data, today, weekAgo])

  async function activate(p: Project) {
    if (view && view.active.length >= WIP_LIMIT) {
      return setActionError(`Ya tienes ${WIP_LIMIT} proyectos activos. Pausa o termina uno antes de activar otra idea.`)
    }
    const { error } = await supabase.from('projects').update({ status: 'activo' }).eq('id', p.id)
    if (error) return setActionError(error.message)
    setActionError(null)
    reload()
  }

  if (loading) return <p className="py-8 text-center text-slate-400">Cargando…</p>
  if (error || !data || !view)
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBox message={error ?? 'No se pudo cargar el radar.'} />
      </div>
    )

  const over = view.active.length > WIP_LIMIT
  const maxDays = Math.max(14, ...view.moving.map((m) => m.days))
  const recent = data.logs.slice(0, 6)

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <BackLink />
        <h1 className="text-2xl font-bold">Radar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pocos activos, un siguiente paso claro, y terminar antes de empezar otro.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Activos (límite ${WIP_LIMIT})`} value={`${view.active.length}/${WIP_LIMIT}`} tone={over ? 'bad' : undefined}>
          <div className="mt-1.5 flex gap-0.5">
            {Array.from({ length: Math.max(WIP_LIMIT, view.active.length) }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < view.active.length ? (over ? 'bg-red-500' : 'bg-brand-600') : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
        </Stat>
        <Stat label={`Estancados +${STALE_DAYS} días`} value={view.stale.length} tone={view.stale.length ? 'bad' : 'ok'} />
        <Stat label="Pasos pendientes" value={view.pendingSteps} />
        <Stat label="Terminados este mes" value={view.finishedThisMonth.length} tone="ok" />
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-semibold">
          <PartyPopper size={18} className="text-brand-600" /> Tus últimos 7 días
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {view.stepsDone || view.notes ? (
            <>
              Completaste <strong>{view.stepsDone}</strong> {view.stepsDone === 1 ? 'paso' : 'pasos'} y anotaste <strong>{view.notes}</strong>{' '}
              {view.notes === 1 ? 'avance' : 'avances'}.
            </>
          ) : (
            'Semana tranquila. Mover una cosa pequeña hoy ya cuenta.'
          )}
        </p>
        {recent.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {recent.map((l) => (
              <li key={l.id} className="flex gap-2">
                <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
                  {new Date(l.created_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{view.title.get(l.project_id)}</span>: {l.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(view.stale.length > 0 || view.due.length > 0 || view.noNext.length > 0 || over) && (
        <section className={`${card} space-y-2`}>
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} className="text-amber-500" /> Ojo con
          </h2>
          <ul className="space-y-1.5 text-sm">
            {over && <li>Tienes {view.active.length} proyectos activos: pausa alguno para poder terminar los demás.</li>}
            {view.due.map((p) => (
              <Alert key={`d${p.id}`} p={p} text={p.due_date! < today ? `venció el ${shortDate(p.due_date!)}` : `vence el ${shortDate(p.due_date!)}`} />
            ))}
            {view.stale.map((p) => (
              <Alert key={`s${p.id}`} p={p} text={`${daysSince(p.last_activity_at)} días sin moverse`} />
            ))}
            {view.noNext.map((p) => (
              <Alert key={`n${p.id}`} p={p} text="no tiene siguiente paso" />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Target size={16} /> Foco sugerido
        </h2>
        {view.focus.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">Cuando tengas proyectos activos, aquí verás los 3 que más conviene mover.</p>
        ) : (
          <ol className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {view.focus.map((p, i) => {
              const step = nextStep(view.stepsBy.get(p.id) ?? [])
              return (
                <li key={p.id}>
                  <Link to={`/metas/proyectos/${p.id}`} className="flex items-start gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/50">
                    <span className="pt-0.5 text-sm font-semibold tabular-nums text-brand-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className={`text-sm ${step ? 'text-slate-500 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {step ? `Siguiente: ${step.title}` : 'Sin siguiente paso: agrega uno'}
                      </p>
                    </div>
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Días sin moverse</h2>
        {view.moving.length === 0 ? (
          <p className="text-sm text-slate-400">Sin proyectos activos o pausados.</p>
        ) : (
          <div className="space-y-2.5">
            {view.moving.map(({ p, days }) => {
              const f = freshness(days)
              return (
                <Link key={p.id} to={`/metas/proyectos/${p.id}`} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm">
                  <span className={`truncate ${p.status === 'pausado' ? 'text-slate-400' : ''}`}>{p.title}</span>
                  <span className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className={`absolute inset-y-0 left-0 rounded-full ${FRESH_BG[f.tone]}`} style={{ width: `${Math.max(3, (days / maxDays) * 100)}%` }} />
                    <span className="absolute -inset-y-1 border-l-2 border-dashed border-slate-400" style={{ left: `${(STALE_DAYS / maxDays) * 100}%` }} />
                  </span>
                  <span className={`text-right text-xs tabular-nums ${FRESH_TEXT[f.tone]}`}>{days} d</span>
                </Link>
              )
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">La línea punteada marca {STALE_DAYS} días. Pausados en gris.</p>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Lightbulb size={16} /> Ideas en espera ({view.ideas.length})
        </h2>
        {view.ideas.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">Crea un proyecto con estado "Idea" para guardarlo aquí sin comprometerte.</p>
        ) : (
          <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {view.ideas.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link to={`/metas/proyectos/${p.id}`} className="min-w-0 flex-1 truncate">
                  {p.title}
                </Link>
                <button onClick={() => activate(p)} className="shrink-0 rounded-lg bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
                  Activar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ErrorBox message={actionError} />
    </div>
  )
}

function Stat({ label, value, tone, children }: { label: string; value: number | string; tone?: 'ok' | 'bad'; children?: ReactNode }) {
  const color = tone === 'bad' ? 'text-red-600 dark:text-red-400' : tone === 'ok' ? 'text-brand-700 dark:text-brand-500' : ''
  return (
    <div className={`${card} p-3`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {children}
    </div>
  )
}

function Alert({ p, text }: { p: Project; text: string }) {
  return (
    <li>
      <Link to={`/metas/proyectos/${p.id}`} className="underline-offset-2 active:underline">
        <span className="font-medium">{p.title}</span> <span className="text-slate-500 dark:text-slate-400">{text}</span>
      </Link>
    </li>
  )
}

function BackLink() {
  return (
    <Link to="/metas" className="-ml-2 inline-flex items-center gap-1 rounded-lg p-2 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800">
      <ChevronLeft size={18} /> Metas
    </Link>
  )
}
