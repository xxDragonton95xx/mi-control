import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, Plus } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import RoutineForm from '../../components/agenda/RoutineForm'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { describeWeekdays, timeRange, type Routine } from '../../lib/agenda'
import { areaInfo } from '../../lib/planning'
import { card } from '../../lib/ui'

export default function Rutinas() {
  const [editing, setEditing] = useState<Routine | null>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  const { data, error, reload, loading } = useLoad(
    () => supabase.from('routines').select('*').order('start_time', { nullsFirst: true }).order('title').then(must<Routine[]>),
    [],
  )
  const active = (data ?? []).filter((r) => r.active)
  const inactive = (data ?? []).filter((r) => !r.active)

  const openRoutine = (r: Routine | null) => {
    setEditing(r)
    setOpen(true)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Link to="/semana" aria-label="Volver" className="-ml-2 rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold">Rutinas</h1>
      </header>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Actividades que se repiten cada semana. Aparecen solas en tu Semana y en Hoy, y puedes marcar cada día si las cumpliste.
      </p>

      <ErrorBox message={error} />

      {loading ? (
        <p className="py-8 text-center text-slate-400">Cargando…</p>
      ) : (
        <>
          {active.length > 0 && <RoutineList routines={active} onOpen={openRoutine} />}
          {inactive.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Pausadas</h2>
              <div className="opacity-60">
                <RoutineList routines={inactive} onOpen={openRoutine} />
              </div>
            </section>
          )}
        </>
      )}

      <button
        onClick={() => openRoutine(null)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 font-medium text-slate-600 active:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:active:bg-slate-900"
      >
        <Plus size={18} /> Nueva rutina
      </button>

      <Sheet open={open} onClose={close} title={editing ? 'Editar rutina' : 'Nueva rutina'}>
        <RoutineForm
          routine={editing}
          onDone={() => {
            close()
            reload()
          }}
        />
      </Sheet>
    </div>
  )
}

function RoutineList({ routines, onOpen }: { routines: Routine[]; onOpen: (r: Routine) => void }) {
  return (
    <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
      {routines.map((r) => {
        const area = r.area ? areaInfo(r.area) : null
        return (
          <li key={r.id} className="flex items-stretch">
            <span className="w-1 shrink-0 rounded-l-2xl" style={{ backgroundColor: area?.color ?? '#64748b' }} />
            <button onClick={() => onOpen(r)} className="min-w-0 flex-1 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800/50">
              <span className="block font-medium">{r.title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {describeWeekdays(r.weekdays)}
                {r.start_time && ` · ${timeRange(r.start_time, r.end_time)}`}
                {area && ` · ${area.label}`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
