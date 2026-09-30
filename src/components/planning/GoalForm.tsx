import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import { supabase } from '../../lib/supabase'
import { inputClass, primaryButton } from '../../lib/ui'
import { AREAS, GOAL_STATUSES, type Goal, type GoalStatus, type LifeArea } from '../../lib/planning'

type Props = {
  goal: Goal | null
  onDone: (deleted?: boolean) => void
}

export default function GoalForm({ goal, onDone }: Props) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [area, setArea] = useState<LifeArea>(goal?.area ?? 'personal')
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '')
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'activa')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    const row = { title: title.trim(), description: description.trim() || null, area, target_date: targetDate || null, status }
    const { error } = goal ? await supabase.from('goals').update(row).eq('id', goal.id) : await supabase.from('goals').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  async function handleDelete() {
    if (!goal || !confirm(`¿Borrar la meta "${goal.title}"? Sus proyectos se conservan, pero quedarán sin meta.`)) return
    setBusy(true)
    const { error } = await supabase.from('goals').delete().eq('id', goal.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Correr un medio maratón" autoFocus={!goal} required maxLength={120} className={inputClass} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Área de vida</legend>
        <div className="grid grid-cols-3 gap-2">
          {AREAS.map(({ value, label, color, icon: Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() => setArea(value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                area === value ? 'border-brand-600 bg-brand-50 dark:bg-brand-700/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon size={20} style={{ color }} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          ¿Por qué es importante? <span className="font-normal text-slate-400">(opcional)</span>
        </span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Fecha meta</span>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`${inputClass} py-2.5`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)} className={`${inputClass} py-2.5`}>
            {GOAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBox message={error} />

      <div className="flex gap-3">
        {goal && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Borrar meta"
            className="rounded-xl border border-red-200 px-4 text-red-600 active:bg-red-50 dark:border-red-900 dark:active:bg-red-950"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button type="submit" disabled={!title.trim() || busy} className={primaryButton}>
          {busy ? 'Guardando…' : goal ? 'Guardar cambios' : 'Crear meta'}
        </button>
      </div>
    </form>
  )
}
