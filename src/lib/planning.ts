import { BookOpen, Briefcase, HeartPulse, PiggyBank, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { fromISODate, toISODate } from './format'

export type LifeArea = 'salud' | 'finanzas' | 'carrera' | 'aprendizaje' | 'relaciones' | 'personal'
export type GoalStatus = 'activa' | 'lograda' | 'pausada' | 'descartada'
export type ProjectStatus = 'idea' | 'activo' | 'pausado' | 'terminado'
export type TaskStatus = 'pendiente' | 'en_progreso' | 'hecha'
export type Priority = 'alta' | 'media' | 'baja'

export type Goal = {
  id: string
  title: string
  description: string | null
  area: LifeArea
  target_date: string | null
  status: GoalStatus
  created_at: string
}

export type Project = {
  id: string
  goal_id: string | null
  title: string
  description: string | null
  status: ProjectStatus
  priority: Priority
  start_date: string | null
  due_date: string | null
  with_whom: string | null
  last_activity_at: string
  created_at: string
}

export type ProjectLog = {
  id: string
  project_id: string
  note: string
  auto: boolean
  created_at: string
}

export type Task = {
  id: string
  project_id: string | null
  title: string
  notes: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  sort_order: number
  completed_at: string | null
  created_at: string
}

export const AREAS: { value: LifeArea; label: string; color: string; icon: LucideIcon }[] = [
  { value: 'salud', label: 'Salud', color: '#ef4444', icon: HeartPulse },
  { value: 'finanzas', label: 'Finanzas', color: '#22c55e', icon: PiggyBank },
  { value: 'carrera', label: 'Carrera', color: '#3b82f6', icon: Briefcase },
  { value: 'aprendizaje', label: 'Aprendizaje', color: '#f59e0b', icon: BookOpen },
  { value: 'relaciones', label: 'Relaciones', color: '#ec4899', icon: Users },
  { value: 'personal', label: 'Personal', color: '#8b5cf6', icon: Sparkles },
]
export const areaInfo = (a: LifeArea) => AREAS.find((x) => x.value === a) ?? AREAS[5]

export const GOAL_STATUSES: { value: GoalStatus; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'lograda', label: 'Lograda' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'descartada', label: 'Descartada' },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; className: string }[] = [
  { value: 'idea', label: 'Idea', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'activo', label: 'Activo', className: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' },
  { value: 'pausado', label: 'Pausado', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { value: 'terminado', label: 'Terminado', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
]
export const projectStatusInfo = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)!

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]
const PRIORITY_RANK: Record<Priority, number> = { alta: 0, media: 1, baja: 2 }

export const isDone = (t: Task) => t.status === 'hecha'

export function progressOf(tasks: Task[]) {
  const total = tasks.length
  const done = tasks.filter(isDone).length
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}

/** Ordena pendientes: con fecha primero (más próxima arriba), luego por prioridad. */
export function sortTasks(a: Task, b: Task) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.sort_order - b.sort_order
}

/** Domingo de la semana actual (la semana empieza en lunes). */
export function endOfWeek(today: Date) {
  const d = new Date(today)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return toISODate(d)
}

export function addDays(iso: string, n: number) {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Etiqueta corta para una fecha límite: "Vencida", "Hoy", "Mañana", "vie 3 oct". */
export function dueLabel(iso: string, today: string): { text: string; tone: 'overdue' | 'today' | 'normal' } {
  if (iso < today) {
    const d = fromISODate(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    return { text: `Vencida · ${d}`, tone: 'overdue' }
  }
  if (iso === today) return { text: 'Hoy', tone: 'today' }
  if (iso === addDays(today, 1)) return { text: 'Mañana', tone: 'normal' }
  return { text: fromISODate(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }), tone: 'normal' }
}

export const shortDate = (iso: string) => fromISODate(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
