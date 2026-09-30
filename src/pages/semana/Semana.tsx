import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import Sheet from '../../components/Sheet'
import ErrorBox from '../../components/ErrorBox'
import DayAgenda from '../../components/agenda/DayAgenda'
import BlockForm from '../../components/agenda/BlockForm'
import RoutineForm from '../../components/agenda/RoutineForm'
import TaskForm from '../../components/planning/TaskForm'
import { useAgenda } from '../../hooks/useAgenda'
import { must, useLoad } from '../../hooks/useLoad'
import { supabase } from '../../lib/supabase'
import { fromISODate, toISODate } from '../../lib/format'
import { WEEKDAYS, buildAgenda, routinesOn, startOfWeek, weekDates, type Routine, type TimeBlock } from '../../lib/agenda'
import type { Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type SheetState = { kind: 'block'; block: TimeBlock | null } | { kind: 'routine'; routine: Routine } | { kind: 'task'; task: Task } | null

export default function Semana() {
  const today = toISODate(new Date())
  const [selected, setSelected] = useState(today)
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = useCallback(() => setSheet(null), [])

  const days = useMemo(() => weekDates(startOfWeek(fromISODate(selected))), [selected])
  const { data, setData, error, reload, loading } = useAgenda(days[0], days[6])
  const { data: pendingTasks, reload: reloadPending } = useLoad(
    () =>
      supabase
        .from('tasks')
        .select('id, title, project_id')
        .neq('status', 'hecha')
        .order('created_at')
        .then(must<{ id: string; title: string; project_id: string | null }[]>),
    [],
  )

  const shiftWeek = (n: number) => {
    const d = fromISODate(selected)
    d.setDate(d.getDate() + 7 * n)
    setSelected(toISODate(d))
  }

  const weekLabel = `${fromISODate(days[0]).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${fromISODate(days[6]).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })}`

  // Cumplimiento de rutinas en lo que va de la semana (hasta hoy).
  const routineStats = useMemo(() => {
    if (!data) return null
    let expected = 0
    let done = 0
    for (const d of days) {
      if (d > today) break
      for (const r of routinesOn(d, data.routines)) {
        expected++
        if (data.checks.some((c) => c.routine_id === r.id && c.check_date === d && c.done)) done++
      }
    }
    return expected ? { expected, done, pct: Math.round((done / expected) * 100) } : null
  }, [data, days, today])

  const afterSave = () => {
    close()
    reload()
    reloadPending()
  }

  const openProjects = (data?.projects ?? []).filter((p) => p.status !== 'terminado')

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Semana</h1>
        <Link
          to="/semana/rutinas"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <Repeat size={16} /> Rutinas
        </Link>
      </header>

      <div className="flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)} aria-label="Semana anterior" className="rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => setSelected(today)} className="text-center">
          <span className="block font-semibold">{weekLabel}</span>
          {!days.includes(today) && <span className="block text-xs text-brand-600 dark:text-brand-500">Volver a hoy</span>}
        </button>
        <button onClick={() => shiftWeek(1)} aria-label="Semana siguiente" className="rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const count = data ? buildAgenda(d, data).length + data.tasks.filter((t) => t.due_date === d && t.status !== 'hecha').length : 0
          const isSel = d === selected
          const isToday = d === today
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center rounded-xl py-2 ${
                isSel ? 'bg-brand-600 text-white' : isToday ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : ''
              } ${d < today && !isSel ? 'opacity-50' : ''}`}
            >
              <span className="text-[11px] font-medium opacity-80">{WEEKDAYS[i].short}</span>
              <span className="text-lg font-bold tabular-nums">{fromISODate(d).getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(count, 3) }, (_, k) => (
                  <span key={k} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-brand-500'}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {routineStats && (
        <div className={`${card} flex items-center justify-between py-3 text-sm`}>
          <span className="text-slate-600 dark:text-slate-300">Rutinas cumplidas esta semana</span>
          <span className="font-semibold tabular-nums">
            {routineStats.done}/{routineStats.expected} · {routineStats.pct}%
          </span>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-semibold capitalize">
            {selected === today ? 'Hoy' : fromISODate(selected).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {selected >= today && (
            <button onClick={() => setSheet({ kind: 'block', block: null })} className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500">
              <Plus size={16} /> Actividad
            </button>
          )}
        </div>
        <ErrorBox message={error} />
        {loading || !data ? (
          <p className="py-8 text-center text-slate-400">Cargando…</p>
        ) : (
          <DayAgenda
            date={selected}
            today={today}
            data={data}
            setData={setData}
            onOpenBlock={(block) => setSheet({ kind: 'block', block })}
            onOpenRoutine={(routine) => setSheet({ kind: 'routine', routine })}
            onOpenTask={(task) => setSheet({ kind: 'task', task })}
            emptyText={selected < today ? 'No hubo nada agendado este día.' : 'Día libre. Toca "+ Actividad" para agendar algo.'}
          />
        )}
      </section>

      {data?.routines.length === 0 && (
        <Link to="/semana/rutinas" className={`${card} block text-sm text-slate-600 dark:text-slate-300`}>
          <strong className="text-slate-900 dark:text-white">Tip:</strong> crea tus <strong>rutinas</strong> (gym, estudiar, junta semanal…) y aparecerán
          solas cada semana. <span className="font-semibold text-brand-600 dark:text-brand-500">Crear rutina →</span>
        </Link>
      )}

      <Sheet open={sheet?.kind === 'block'} onClose={close} title={sheet?.kind === 'block' && sheet.block ? 'Editar actividad' : 'Nueva actividad'}>
        {sheet?.kind === 'block' && (
          <BlockForm block={sheet.block} defaultDate={selected} tasks={pendingTasks ?? []} projects={openProjects} onDone={afterSave} />
        )}
      </Sheet>
      <Sheet open={sheet?.kind === 'routine'} onClose={close} title="Editar rutina">
        {sheet?.kind === 'routine' && <RoutineForm routine={sheet.routine} onDone={afterSave} />}
      </Sheet>
      <Sheet open={sheet?.kind === 'task'} onClose={close} title="Editar tarea">
        {sheet?.kind === 'task' && <TaskForm task={sheet.task} projects={openProjects} onDone={afterSave} />}
      </Sheet>
    </div>
  )
}
