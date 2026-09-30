import { useState, type Dispatch, type SetStateAction } from 'react'
import { Check, Repeat } from 'lucide-react'
import ErrorBox from '../ErrorBox'
import TaskItem from '../planning/TaskItem'
import { buildAgenda, timeRange, toggleBlockDone, toggleRoutineCheck, type AgendaData, type AgendaItem, type Routine, type TimeBlock } from '../../lib/agenda'
import { toggleTaskDone } from '../../lib/tasks'
import { sortTasks, type Task } from '../../lib/planning'
import { card } from '../../lib/ui'

type Props = {
  date: string
  today: string
  data: AgendaData
  setData: Dispatch<SetStateAction<AgendaData | null>>
  onOpenBlock: (b: TimeBlock) => void
  onOpenRoutine: (r: Routine) => void
  /** Mostrar también las tareas con fecha límite ese día. */
  onOpenTask?: (t: Task) => void
  emptyText?: string
}

export default function DayAgenda({ date, today, data, setData, onOpenBlock, onOpenRoutine, onOpenTask, emptyText }: Props) {
  const [error, setError] = useState<string | null>(null)
  const items = buildAgenda(date, data)
  const tasks = onOpenTask ? data.tasks.filter((t) => t.due_date === date).sort(sortTasks) : []
  const projectTitle = new Map(data.projects.map((p) => [p.id, p.title]))
  const isFuture = date > today

  async function toggle(item: AgendaItem) {
    try {
      if (item.routine) {
        const checks = await toggleRoutineCheck(item.routine, date, data.checks)
        setData((d) => d && { ...d, checks })
      } else if (item.block) {
        const updated = await toggleBlockDone(item.block)
        setData((d) => d && { ...d, blocks: d.blocks.map((b) => (b.id === updated.id ? updated : b)) })
      }
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function toggleTask(task: Task) {
    try {
      const updated = await toggleTaskDone(task)
      setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === updated.id ? updated : t)) })
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (items.length === 0 && tasks.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyText ?? 'Nada agendado este día.'}</p>
  }

  return (
    <div className="space-y-3">
      <ErrorBox message={error} />
      {items.length > 0 && (
        <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
          {items.map((item) => (
            <li key={item.key} className="flex items-stretch">
              <span className="w-1 shrink-0 rounded-l-2xl" style={{ backgroundColor: item.color }} />
              <div className="flex flex-1 items-start gap-3 px-3 py-3">
                <button
                  onClick={() => toggle(item)}
                  disabled={isFuture && item.kind === 'routine'}
                  aria-label={item.done ? 'Marcar como no hecho' : 'Marcar como hecho'}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-30 ${
                    item.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {item.done && <Check size={14} strokeWidth={3} />}
                </button>
                <button
                  onClick={() => (item.routine ? onOpenRoutine(item.routine) : item.block && onOpenBlock(item.block))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className={`block ${item.done ? 'text-slate-400 line-through' : 'font-medium'}`}>{item.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.kind === 'routine' && <Repeat size={11} />}
                    {item.start ? timeRange(item.start, item.end) : 'Sin hora'}
                    {item.subtitle && <span className="truncate">· {item.subtitle}</span>}
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && onOpenTask && (
        <div>
          <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">Pendientes que vencen este día</p>
          <ul className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
            {tasks.map((t) => (
              <li key={t.id}>
                <TaskItem task={t} today={today} projectTitle={t.project_id ? projectTitle.get(t.project_id) : null} onToggle={toggleTask} onOpen={onOpenTask} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
