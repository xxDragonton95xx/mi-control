import { must, useLoad } from './useLoad'
import { supabase } from '../lib/supabase'
import type { AgendaData, Routine, RoutineCheck, TimeBlock } from '../lib/agenda'
import type { Task } from '../lib/planning'

/** Rutinas, bloques y tareas con fecha entre `from` y `to` (inclusive). */
export function useAgenda(from: string, to: string) {
  return useLoad(async (): Promise<AgendaData> => {
    const [routines, checks, blocks, tasks, projects] = await Promise.all([
      supabase.from('routines').select('*').order('start_time', { nullsFirst: true }).then(must<Routine[]>),
      supabase.from('routine_checks').select('*').gte('check_date', from).lte('check_date', to).then(must<RoutineCheck[]>),
      supabase.from('time_blocks').select('*').gte('block_date', from).lte('block_date', to).order('start_time').then(must<TimeBlock[]>),
      supabase.from('tasks').select('*').gte('due_date', from).lte('due_date', to).then(must<Task[]>),
      supabase.from('projects').select('id, title, status').order('title').then(must<AgendaData['projects']>),
    ])
    return { routines, checks, blocks, tasks, projects }
  }, [from, to])
}
