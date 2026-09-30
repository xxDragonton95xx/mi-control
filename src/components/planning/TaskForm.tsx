import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import { supabase } from '../../lib/supabase'
import { inputClass, primaryButton } from '../../lib/ui'
import { PRIORITIES, type Priority, type Project, type Task } from '../../lib/planning'

type Props = {
  task: Task | null
  projects: Pick<Project, 'id' | 'title'>[]
  /** Valores iniciales para una tarea nueva (p. ej. el proyecto actual). */
  defaults?: Partial<Pick<Task, 'project_id' | 'due_date'>>
  onDone: () => void
}

export default function TaskForm({ task, projects, defaults, onDone }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaults?.due_date ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'media')
  const [projectId, setProjectId] = useState(task?.project_id ?? defaults?.project_id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    const row = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate || null,
      priority,
      project_id: projectId || null,
    }
    const { error } = task ? await supabase.from('tasks').update(row).eq('id', task.id) : await supabase.from('tasks').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!task || !confirm('¿Borrar esta tarea?')) return
    setBusy(true)
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus={!task} required maxLength={200} className={inputClass} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fecha límite</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Prioridad</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`${inputClass} py-2.5`}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Proyecto</span>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClass} py-2.5`}>
          <option value="">Ninguno (pendiente suelto)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Notas <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </label>

      <ErrorBox message={error} />

      <div className="flex gap-3">
        {task && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar tarea"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!title.trim() || busy} className={primaryButton}>
          {busy ? 'Guardando…' : task ? 'Guardar cambios' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
