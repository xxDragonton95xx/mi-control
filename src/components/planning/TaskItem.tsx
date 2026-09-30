import { Check, Flag, FolderKanban } from 'lucide-react'
import { dueLabel, isDone, type Task } from '../../lib/planning'

type Props = {
  task: Task
  today: string
  projectTitle?: string | null
  onToggle: (t: Task) => void
  onOpen: (t: Task) => void
}

export default function TaskItem({ task, today, projectTitle, onToggle, onOpen }: Props) {
  const done = isDone(task)
  const due = task.due_date && !done ? dueLabel(task.due_date, today) : null

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecha'}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? 'border-brand-600 bg-brand-600 text-white' : task.priority === 'alta' ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {done && <Check size={14} strokeWidth={3} />}
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <span className={`block ${done ? 'text-slate-400 line-through' : ''}`}>{task.title}</span>
        {(due || projectTitle || task.priority === 'alta') && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            {due && (
              <span
                className={
                  due.tone === 'overdue'
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : due.tone === 'today'
                      ? 'font-medium text-brand-600 dark:text-brand-500'
                      : 'text-slate-500 dark:text-slate-400'
                }
              >
                {due.text}
              </span>
            )}
            {projectTitle && (
              <span className="flex min-w-0 items-center gap-1 text-slate-500 dark:text-slate-400">
                <FolderKanban size={12} className="shrink-0" />
                <span className="truncate">{projectTitle}</span>
              </span>
            )}
            {task.priority === 'alta' && !done && (
              <span className="flex items-center gap-1 text-red-500">
                <Flag size={12} /> Alta
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  )
}
