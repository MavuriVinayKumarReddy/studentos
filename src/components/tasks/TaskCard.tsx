import { useNavigate } from 'react-router-dom'
import { Paperclip } from 'lucide-react'
import type { Subject, Task } from '@/types'
import { computePrepProgress } from '@/lib/task-logic'
import {
  formatDueCountdown,
  formatLocalDate,
  isOverdue,
  isDueToday,
} from '@/lib/dates'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppData } from '@/context/AppDataContext'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TaskCardProps {
  task: Task
  subject?: Subject
  onToggle?: (id: string) => void
  className?: string
  compact?: boolean
}

export function TaskCard({
  task,
  subject: subjectProp,
  onToggle,
  className,
  compact,
}: TaskCardProps) {
  const navigate = useNavigate()
  const { getSubject, toggleTaskComplete } = useAppData()
  const subject = subjectProp ?? getSubject(task.subjectId)
  const color = subject?.colorFrom ?? '#4F46E5'
  const bg = subject ? `${subject.colorFrom}18` : '#4F46E518'
  const prep = computePrepProgress(task)
  const completed = task.status === 'Completed'
  const overdue = !completed && isOverdue(task.dueDate, task.dueTime)
  const today = isDueToday(task.dueDate)

  const handleToggle = async () => {
    try {
      if (onToggle) onToggle(task.id)
      else await toggleTaskComplete(task.id)
    } catch {
      toast.error('Could not update task')
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/tasks/${task.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/tasks/${task.id}`)
        }
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-[var(--shadow-card)] transition hover:shadow-md',
        completed && 'opacity-70',
        overdue && 'ring-1 ring-destructive/40',
        className,
      )}
      style={{ background: `linear-gradient(90deg, ${bg}, var(--card) 42%)` }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="flex gap-3 p-4 pl-5">
        <div
          className="pt-0.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={completed}
            onChange={() => void handleToggle()}
            aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {subject && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${subject.colorFrom}, ${subject.colorTo})`,
                }}
              >
                {subject.name}
              </span>
            )}
            {task.tentative && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Tentative
              </span>
            )}
            {overdue && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                Overdue
              </span>
            )}
            {today && !overdue && !completed && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                Today
              </span>
            )}
            {(task.attachments?.length ?? 0) > 0 && (
              <Paperclip className="size-3.5 text-muted-foreground" />
            )}
          </div>
          <h3
            className={cn(
              'font-display text-base font-semibold text-[var(--navy)] dark:text-foreground',
              completed && 'line-through',
            )}
          >
            {task.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatLocalDate(task.dueDate, 'MMMM d')}
            {task.dueTime ? ` · ${task.dueTime}` : ''}
            {' · '}
            <span className={cn(overdue && 'font-medium text-destructive')}>
              {formatDueCountdown(task.dueDate, task.dueTime)}
            </span>
          </p>
          {!compact && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Prep: {prep}% Complete</span>
                <span className="font-medium text-foreground/70">{task.priority}</span>
              </div>
              <Progress
                value={prep}
                className="h-1.5"
                indicatorClassName="!bg-current"
                style={{ color }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
