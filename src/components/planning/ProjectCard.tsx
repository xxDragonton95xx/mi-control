import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import ProgressBar from './ProgressBar'
import { progressOf, projectStatusInfo, shortDate, type Project, type Task } from '../../lib/planning'
import { FRESH_TEXT, daysSince, freshness } from '../../lib/radar'

export default function ProjectCard({ project, tasks }: { project: Project; tasks: Pick<Task, 'status'>[] }) {
  const { done, total } = progressOf(tasks as Task[])
  const status = projectStatusInfo(project.status)
  const fresh = project.status === 'activo' ? freshness(daysSince(project.last_activity_at)) : null
  return (
    <Link to={`/metas/proyectos/${project.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/50">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{project.title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
        </div>
        {(project.due_date || fresh || project.with_whom) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {fresh && <span className={`font-medium ${FRESH_TEXT[fresh.tone]}`}>{fresh.text}</span>}
            {fresh && (project.due_date || project.with_whom) && ' · '}
            {project.due_date && `Para el ${shortDate(project.due_date)}`}
            {project.due_date && project.with_whom && ' · '}
            {project.with_whom && `con ${project.with_whom}`}
          </p>
        )}
        <ProgressBar done={done} total={total} />
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  )
}
