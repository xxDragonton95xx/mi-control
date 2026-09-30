import { supabase } from './supabase'
import { fromISODate, toISODate } from './format'
import { areaInfo, type LifeArea, type Task } from './planning'

export type Routine = {
  id: string
  title: string
  /** 1 = lunes … 7 = domingo */
  weekdays: number[]
  start_time: string | null
  end_time: string | null
  area: LifeArea | null
  active: boolean
  created_at: string
}

export type RoutineCheck = {
  id: string
  routine_id: string
  check_date: string
  done: boolean
}

export type TimeBlock = {
  id: string
  block_date: string
  start_time: string
  end_time: string
  title: string
  task_id: string | null
  project_id: string | null
  done: boolean
  created_at: string
}

export type AgendaData = {
  routines: Routine[]
  checks: RoutineCheck[]
  blocks: TimeBlock[]
  tasks: Task[]
  projects: { id: string; title: string; status: string }[]
}

export const WEEKDAYS = [
  { n: 1, short: 'L', label: 'Lunes' },
  { n: 2, short: 'M', label: 'Martes' },
  { n: 3, short: 'M', label: 'Miércoles' },
  { n: 4, short: 'J', label: 'Jueves' },
  { n: 5, short: 'V', label: 'Viernes' },
  { n: 6, short: 'S', label: 'Sábado' },
  { n: 7, short: 'D', label: 'Domingo' },
]

/** Día de la semana de una fecha YYYY-MM-DD: 1 = lunes … 7 = domingo. */
export const isoWeekday = (iso: string) => ((fromISODate(iso).getDay() + 6) % 7) + 1

export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export const weekDates = (monday: Date) =>
  Array.from({ length: 7 }, (_, i) => toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)))

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export function timeRange(start: string | null, end: string | null) {
  if (!start) return ''
  return end ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start)
}

export function describeWeekdays(days: number[]) {
  const s = [...days].sort()
  if (s.length === 7) return 'Todos los días'
  if (s.join() === '1,2,3,4,5') return 'Lunes a viernes'
  if (s.join() === '6,7') return 'Fines de semana'
  return s.map((n) => WEEKDAYS[n - 1].label.slice(0, 3)).join(', ')
}

/** Rutinas que aplican en una fecha (activas, de ese día de la semana, y creadas antes de esa fecha). */
export const routinesOn = (date: string, routines: Routine[]) =>
  routines.filter((r) => r.active && r.weekdays.includes(isoWeekday(date)) && date >= toISODate(new Date(r.created_at)))

export type AgendaItem = {
  key: string
  kind: 'routine' | 'block'
  title: string
  start: string | null
  end: string | null
  done: boolean
  color: string
  subtitle: string | null
  routine?: Routine
  block?: TimeBlock
}

export function buildAgenda(date: string, data: AgendaData): AgendaItem[] {
  const projectTitle = new Map(data.projects.map((p) => [p.id, p.title]))
  const routineItems: AgendaItem[] = routinesOn(date, data.routines).map((r) => ({
    key: `r-${r.id}`,
    kind: 'routine',
    title: r.title,
    start: r.start_time,
    end: r.end_time,
    done: data.checks.some((c) => c.routine_id === r.id && c.check_date === date && c.done),
    color: r.area ? areaInfo(r.area).color : '#64748b',
    subtitle: r.area ? `Rutina · ${areaInfo(r.area).label}` : 'Rutina',
    routine: r,
  }))
  const blockItems: AgendaItem[] = data.blocks
    .filter((b) => b.block_date === date)
    .map((b) => ({
      key: `b-${b.id}`,
      kind: 'block',
      title: b.title,
      start: b.start_time,
      end: b.end_time,
      done: b.done,
      color: '#059669',
      subtitle: b.project_id ? (projectTitle.get(b.project_id) ?? null) : null,
      block: b,
    }))
  return [...routineItems, ...blockItems].sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
}

/** Marca o desmarca una rutina en una fecha. Devuelve los checks actualizados. */
export async function toggleRoutineCheck(routine: Routine, date: string, checks: RoutineCheck[]) {
  const existing = checks.find((c) => c.routine_id === routine.id && c.check_date === date)
  if (existing) {
    const { error } = await supabase.from('routine_checks').delete().eq('id', existing.id)
    if (error) throw new Error(error.message)
    return checks.filter((c) => c.id !== existing.id)
  }
  const { data, error } = await supabase.from('routine_checks').insert({ routine_id: routine.id, check_date: date }).select().single()
  if (error) throw new Error(error.message)
  return [...checks, data as RoutineCheck]
}

export async function toggleBlockDone(block: TimeBlock): Promise<TimeBlock> {
  const { error } = await supabase.from('time_blocks').update({ done: !block.done }).eq('id', block.id)
  if (error) throw new Error(error.message)
  return { ...block, done: !block.done }
}
