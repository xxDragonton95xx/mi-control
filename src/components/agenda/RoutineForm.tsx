import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import { supabase } from '../../lib/supabase'
import { WEEKDAYS, hhmm, type Routine } from '../../lib/agenda'
import { AREAS, type LifeArea } from '../../lib/planning'
import { inputClass, primaryButton } from '../../lib/ui'

type Props = {
  routine: Routine | null
  onDone: () => void
}

export default function RoutineForm({ routine, onDone }: Props) {
  const [title, setTitle] = useState(routine?.title ?? '')
  const [days, setDays] = useState<number[]>(routine?.weekdays ?? [1, 2, 3, 4, 5])
  const [start, setStart] = useState(hhmm(routine?.start_time ?? null))
  const [end, setEnd] = useState(hhmm(routine?.end_time ?? null))
  const [area, setArea] = useState<LifeArea | ''>(routine?.area ?? '')
  const [active, setActive] = useState(routine?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleDay = (n: number) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (days.length === 0) return setError('Elige al menos un día.')
    if (end && !start) return setError('Si pones hora de fin, pon también la de inicio.')
    if (start && end && end <= start) return setError('La hora de fin debe ser después del inicio.')
    setBusy(true)
    const row = { title: title.trim(), weekdays: days, start_time: start || null, end_time: end || null, area: area || null, active }
    const { error } = routine ? await supabase.from('routines').update(row).eq('id', routine.id) : await supabase.from('routines').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!routine || !confirm(`¿Borrar la rutina "${routine.title}" y su historial?`)) return
    setBusy(true)
    const { error } = await supabase.from('routines').delete().eq('id', routine.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Gimnasio" autoFocus={!routine} required maxLength={120} className={inputClass} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Se repite los días</legend>
        <div className="flex justify-between gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              type="button"
              key={d.n}
              onClick={() => toggleDay(d.n)}
              aria-label={d.label}
              aria-pressed={days.includes(d.n)}
              className={`h-10 flex-1 rounded-full text-sm font-semibold ${
                days.includes(d.n) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Inicio <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fin</span>
          <input type="time" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Área de vida <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <select value={area} onChange={(e) => setArea(e.target.value as LifeArea | '')} className={`${inputClass} py-2.5`}>
          <option value="">Ninguna</option>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      {routine && (
        <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
          <span className="text-sm font-medium">Rutina activa</span>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        </label>
      )}

      <ErrorBox message={error} />

      <div className="flex gap-3">
        {routine && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar rutina"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!title.trim() || busy} className={primaryButton}>
          {busy ? 'Guardando…' : routine ? 'Guardar cambios' : 'Crear rutina'}
        </button>
      </div>
    </form>
  )
}
