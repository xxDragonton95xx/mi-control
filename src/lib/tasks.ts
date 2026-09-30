import { supabase } from './supabase'
import type { Task } from './planning'

/** Marca una tarea como hecha o pendiente. Devuelve la tarea actualizada o lanza el error. */
export async function toggleTaskDone(task: Task): Promise<Task> {
  const patch: Pick<Task, 'status' | 'completed_at'> =
    task.status === 'hecha' ? { status: 'pendiente', completed_at: null } : { status: 'hecha', completed_at: new Date().toISOString() }
  const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
  if (error) throw new Error(error.message)
  return { ...task, ...patch }
}
