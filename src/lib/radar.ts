import { addDays } from './planning'
import type { Priority, Project, Task } from './planning'

/** Máximo de proyectos activos a la vez: más que esto y nada se termina. */
export const WIP_LIMIT = 5
/** Días sin movimiento a partir de los cuales un proyecto activo se considera estancado. */
export const STALE_DAYS = 10

export type Freshness = 'ok' | 'warn' | 'bad'

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000))

export function freshness(days: number): { tone: Freshness; text: string } {
  if (days <= 3) return { tone: 'ok', text: days === 0 ? 'Movido hoy' : days === 1 ? 'Ayer' : `Hace ${days} días` }
  if (days <= STALE_DAYS) return { tone: 'warn', text: `Hace ${days} días` }
  return { tone: 'bad', text: `${days} días parado` }
}

export const FRESH_TEXT: Record<Freshness, string> = {
  ok: 'text-brand-700 dark:text-brand-500',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
}
export const FRESH_BG: Record<Freshness, string> = {
  ok: 'bg-brand-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
}

type StepLike = Pick<Task, 'status' | 'sort_order' | 'created_at' | 'title'>

/** El primer paso pendiente del plan de acción, en el mismo orden que la pantalla del proyecto. */
export function nextStep<T extends StepLike>(tasks: T[]): T | null {
  const pending = tasks.filter((t) => t.status !== 'hecha')
  pending.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  return pending[0] ?? null
}

const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 3, media: 2, baja: 1 }

/** Fecha límite vencida o dentro de los próximos 7 días. */
export const dueSoon = (p: Pick<Project, 'due_date'>, today: string) => !!p.due_date && p.due_date <= addDays(today, 7)

/** Qué tan urgente es mover un proyecto: prioridad, días quieto y fecha límite cercana. */
export const focusScore = (p: Project, today: string) =>
  PRIORITY_WEIGHT[p.priority] * 2 + Math.min(daysSince(p.last_activity_at), 14) / 3 + (dueSoon(p, today) ? 4 : 0)
