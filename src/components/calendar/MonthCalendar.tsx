import { useMemo } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toLocalDateString } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Subject, Task } from '@/types'

interface MonthCalendarProps {
  month: Date
  onMonthChange: (next: Date) => void
  selectedDate: string
  onSelectDate: (dateKey: string) => void
  tasks: Task[]
  getSubject: (id: string | null | undefined) => Subject | undefined
  weekStartsOn?: 0 | 1
  className?: string
}

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  tasks,
  getSubject,
  weekStartsOn = 1,
  className,
}: MonthCalendarProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn })
    return eachDayOfInterval({ start, end })
  }, [month, weekStartsOn])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (task.status === 'Completed') continue
      const list = map.get(task.dueDate) ?? []
      list.push(task)
      map.set(task.dueDate, list)
    }
    return map
  }, [tasks])

  const weekLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), 'EEEEE'),
    )
  }, [weekStartsOn])

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-4 shadow-soft',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-[var(--heading,#1E3A5F)] dark:text-foreground">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => onMonthChange(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date()
              onMonthChange(today)
              onSelectDate(toLocalDateString(today))
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {weekLabels.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = toLocalDateString(day)
          const dayTasks = tasksByDay.get(key) ?? []
          const selected = key === selectedDate
          const inMonth = isSameMonth(day, month)
          const colors = dayTasks
            .slice(0, 3)
            .map((t) => getSubject(t.subjectId)?.colorFrom ?? '#4F46E5')

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                'flex min-h-[3.25rem] flex-col items-center rounded-xl px-1 py-1.5 text-sm transition',
                !inMonth && 'opacity-35',
                selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted',
                isToday(day) && !selected && 'ring-1 ring-primary/40',
              )}
            >
              <span
                className={cn(
                  'font-semibold',
                  isToday(day) && !selected && 'text-primary',
                )}
              >
                {format(day, 'd')}
              </span>
              {colors.length > 0 ? (
                <span className="mt-1 flex gap-0.5">
                  {colors.map((c, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        selected && 'ring-1 ring-white/70',
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tasksByDay.get(selectedDate)?.length ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {(tasksByDay.get(selectedDate) ?? []).length} open task
          {(tasksByDay.get(selectedDate) ?? []).length === 1 ? '' : 's'} on{' '}
          {format(
            days.find((d) => isSameDay(d, new Date(selectedDate + 'T12:00:00'))) ??
              new Date(selectedDate + 'T12:00:00'),
            'MMM d',
          )}
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No open tasks on this day
        </p>
      )}
    </div>
  )
}
