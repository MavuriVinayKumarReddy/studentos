import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { CalendarDays, LayoutList, GanttChart } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { filterTasks, sortTasks } from '@/lib/task-logic'
import {
  formatDueCountdown,
  formatLocalDate,
  relativeDayLabel,
  toLocalDateString,
} from '@/lib/dates'
import { TASK_TYPES, PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import type { Priority, TaskSortBy, TaskStatus, TaskType } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ViewMode = 'timeline' | 'calendar' | 'list'

export function TimelinePage() {
  const [params] = useSearchParams()
  const { tasks, subjects, loading, toggleTaskComplete, getSubject } = useAppData()
  const [view, setView] = useState<ViewMode>('timeline')
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate')
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toLocalDateString())

  const filtered = useMemo(() => {
    const list = filterTasks(tasks, {
      search: search || undefined,
      subjectId: subjectId || undefined,
      type: (type as TaskType) || undefined,
      priority: (priority as Priority) || undefined,
      status: (status as TaskStatus) || undefined,
      includeCompleted,
    })
    return sortTasks(list, sortBy)
  }, [tasks, search, subjectId, type, priority, status, includeCompleted, sortBy])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const key = t.dueDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const onToggle = async (id: string) => {
    try {
      await toggleTaskComplete(id)
    } catch {
      toast.error('Could not update task')
    }
  }

  const monthStart = startOfMonth(calMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-foreground">
            Lesson Schedule
          </h1>
          <p className="text-sm text-muted-foreground">Deadlines, calendar, and list views</p>
        </div>
        <div className="flex rounded-2xl bg-card p-1 shadow-sm">
          {(
            [
              ['timeline', GanttChart, 'Timeline'],
              ['calendar', CalendarDays, 'Calendar'],
              ['list', LayoutList, 'List'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium',
                view === id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl bg-card"
        />
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-xl">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl">
          <option value="">All types</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl">
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as TaskSortBy)}
          className="rounded-xl"
        >
          <option value="dueDate">Nearest deadline</option>
          <option value="priority">Priority</option>
          <option value="urgency">Urgency</option>
          <option value="createdAt">Recently created</option>
          <option value="title">Title</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={includeCompleted}
          onChange={(e) => setIncludeCompleted(e.target.checked)}
        />
        Show completed
      </label>

      {view === 'timeline' && (
        <div className="space-y-6">
          {grouped.length === 0 ? (
            <EmptyState title="No matching tasks" description="Try clearing filters or add a new deadline." />
          ) : (
            grouped.map(([date, items]) => (
              <section key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="size-2 rounded-full bg-primary" />
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {relativeDayLabel(date)} · {formatLocalDate(date, 'MMM d')}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="relative ml-1 space-y-3 border-l-2 border-primary/20 pl-4">
                  {items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      subject={getSubject(t.subjectId)}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {view === 'calendar' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm hover:bg-muted"
                onClick={() => setCalMonth(addDays(startOfMonth(calMonth), -1))}
              >
                Prev
              </button>
              <h2 className="font-display font-semibold">{format(calMonth, 'MMMM yyyy')}</h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm hover:bg-muted"
                onClick={() => setCalMonth(addDays(endOfMonth(calMonth), 1))}
              >
                Next
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day) => {
                const key = toLocalDateString(day)
                const count = filtered.filter((t) => t.dueDate === key).length
                const selected = key === selectedDay
                const inMonth = isSameMonth(day, calMonth)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm',
                      !inMonth && 'opacity-40',
                      selected && 'bg-primary text-white',
                      !selected && 'hover:bg-muted',
                    )}
                  >
                    {format(day, 'd')}
                    {count > 0 && (
                      <span
                        className={cn(
                          'absolute bottom-1 size-1.5 rounded-full',
                          selected ? 'bg-white' : 'bg-primary',
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <h3 className="font-display font-semibold">
            Upcoming · {formatLocalDate(selectedDay, 'MMMM d')}
          </h3>
          <div className="space-y-3">
            {filtered.filter((t) => t.dueDate === selectedDay).length === 0 ? (
              <EmptyState title="No deadlines this day" />
            ) : (
              filtered
                .filter((t) => t.dueDate === selectedDay)
                .map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    subject={getSubject(t.subjectId)}
                    onToggle={onToggle}
                  />
                ))
            )}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Done</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Task</th>
                <th className="p-3">Due</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Files</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const sub = getSubject(t.subjectId)
                return (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="p-3">
                      <Checkbox
                        checked={t.status === 'Completed'}
                        onChange={() => onToggle(t.id)}
                      />
                    </td>
                    <td className="p-3">
                      {sub ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{
                            background: `linear-gradient(135deg, ${sub.colorFrom}, ${sub.colorTo})`,
                          }}
                        >
                          {sub.code || sub.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <a href={`/tasks/${t.id}`} className="font-medium hover:text-primary">
                        {t.title}
                      </a>
                      <div className="text-xs text-muted-foreground">{t.type}</div>
                    </td>
                    <td className="p-3">
                      <div>{formatLocalDate(t.dueDate, 'MMM d')}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDueCountdown(t.dueDate, t.dueTime)}
                      </div>
                    </td>
                    <td className="p-3">{t.priority}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.attachments?.length ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-6">
              <EmptyState title="No tasks" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
