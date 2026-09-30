import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import { supabase } from '../../lib/supabase'
import { minDateFor, todayISO } from '../../lib/format'
import { hhmm, type TimeBlock } from '../../lib/agenda'
import { inputClass, primaryButton } from '../../lib/ui'

type Props = {
  block: TimeBlock | null
  defaultDate: string
  tasks: { id: string; title: string; project_id: string | null }[]
  projects: { id: string; title: string }[]
  onDone: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')

function defaultTimes(date: string) {
  const now = new Date()
  const hour = date === todayISO() ? Math.min(now.getHours() + 1, 22) : 9
  return { start: `${pad(hour)}:00`, end: `${pad(hour + 1)}:00` }
}

export default function BlockForm({ block, defaultDate, tasks, projects, onDone }: Props) {
  const initialDate = block?.block_date ?? (defaultDate < todayISO() ? todayISO() : defaultDate)
  const times = defaultTimes(initialDate)
  const [title, setTitle] = useState(block?.title ?? '')
  const [date, setDate] = useState(initialDate)
  const [start, setStart] = useState(block ? hhmm(block.start_time) : times.start)
  const [end, setEnd] = useState(block ? hhmm(block.end_time) : times.end)
  const [taskId, setTaskId] = useState(block?.task_id ?? '')
  const [projectId, setProjectId] = useState(block?.project_id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minDate = minDateFor(block?.block_date)

  function pickTask(id: string) {
    setTaskId(id)
    const task = tasks.find((t) => t.id === id)
    if (task) {
      if (!title.trim()) setTitle(task.title)
      if (task.project_id) setProjectId(task.project_id)
    }
  }

  function changeStart(value: string) {
    setStart(value)
    if (value && end && end <= value) {
      const [h, m] = value.split(':').map(Number)
      setEnd(h >= 23 ? '23:59' : `${pad(h + 1)}:${pad(m)}`)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (date < minDate) return setError('La fecha no puede ser anterior a hoy.')
    if (!start || !end) return setError('Pon hora de inicio y de fin.')
    if (end <= start) return setError('La hora de fin debe ser después del inicio.')
    setBusy(true)
    const row = { title: title.trim(), block_date: date, start_time: start, end_time: end, task_id: taskId || null, project_id: projectId || null }
    const { error } = block ? await supabase.from('time_blocks').update(row).eq('id', block.id) : await supabase.from('time_blocks').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!block || !confirm('¿Borrar esta actividad?')) return
    setBusy(true)
    const { error } = await supabase.from('time_blocks').delete().eq('id', block.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Estudiar inglés" autoFocus={!block} required maxLength={120} className={inputClass} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Día</span>
        <input type="date" value={date} min={minDate} required onChange={(e) => setDate(e.target.value)} className={`${inputClass} py-2.5`} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Inicio</span>
          <input type="time" value={start} required onChange={(e) => changeStart(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fin</span>
          <input type="time" value={end} min={start} required onChange={(e) => setEnd(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
      </div>

      {tasks.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Para avanzar en un pendiente <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <select value={taskId} onChange={(e) => pickTask(e.target.value)} className={`${inputClass} py-2.5`}>
            <option value="">Ninguno</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {projects.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Proyecto <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClass} py-2.5`}>
            <option value="">Ninguno</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <ErrorBox message={error} />

      <div className="flex gap-3">
        {block && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar actividad"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!title.trim() || busy} className={primaryButton}>
          {busy ? 'Guardando…' : block ? 'Guardar cambios' : 'Agendar'}
        </button>
      </div>
    </form>
  )
}
