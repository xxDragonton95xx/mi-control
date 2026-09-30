import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import { supabase } from '../../lib/supabase'
import { inputClass, primaryButton } from '../../lib/ui'
import { minDateFor, todayISO } from '../../lib/format'
import { PRIORITIES, PROJECT_STATUSES, type Goal, type Priority, type Project, type ProjectStatus } from '../../lib/planning'

type Props = {
  project: Project | null
  goals: Pick<Goal, 'id' | 'title'>[]
  defaultGoalId?: string | null
  /** Recibe el id del proyecto creado/guardado, o null si se borró. */
  onDone: (id: string | null) => void
}

export default function ProjectForm({ project, goals, defaultGoalId, onDone }: Props) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [goalId, setGoalId] = useState(project?.goal_id ?? defaultGoalId ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'activo')
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'media')
  const [startDate, setStartDate] = useState(project ? (project.start_date ?? '') : todayISO())
  const [dueDate, setDueDate] = useState(project ? (project.due_date ?? '') : todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minStart = minDateFor(project?.start_date)
  const minDue = startDate && startDate > minDateFor(project?.due_date) ? startDate : minDateFor(project?.due_date)

  function changeStart(value: string) {
    setStartDate(value)
    // Si la fecha límite queda antes del nuevo inicio, la recorremos al inicio.
    if (value && dueDate && dueDate < value) setDueDate(value)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (startDate && startDate < minStart) return setError('La fecha de inicio no puede ser anterior a hoy.')
    if (dueDate && dueDate < minDateFor(project?.due_date)) return setError('La fecha límite no puede ser anterior a hoy.')
    if (startDate && dueDate && dueDate < startDate) return setError('La fecha límite no puede ser antes del inicio.')
    setBusy(true)
    const row = {
      title: title.trim(),
      description: description.trim() || null,
      goal_id: goalId || null,
      status,
      priority,
      start_date: startDate || null,
      due_date: dueDate || null,
    }
    const res = project
      ? await supabase.from('projects').update(row).eq('id', project.id).select('id').single()
      : await supabase.from('projects').insert(row).select('id').single()
    setBusy(false)
    if (res.error) setError(res.error.message)
    else onDone(res.data.id)
  }

  async function handleDelete() {
    if (!project || !confirm(`¿Borrar el proyecto "${project.title}" y todo su plan de acción?`)) return
    setBusy(true)
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Plan de entrenamiento 10K" autoFocus={!project} required maxLength={120} className={inputClass} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Meta</span>
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className={`${inputClass} py-2.5`}>
          <option value="">Sin meta</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Descripción <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={`${inputClass} py-2.5`}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Inicio</span>
          <input type="date" value={startDate} min={minStart} onChange={(e) => changeStart(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fecha límite</span>
          <input type="date" value={dueDate} min={minDue} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
      </div>

      <ErrorBox message={error} />

      <div className="flex gap-3">
        {project && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar proyecto"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!title.trim() || busy} className={primaryButton}>
          {busy ? 'Guardando…' : project ? 'Guardar cambios' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  )
}
