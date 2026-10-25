import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import {
  BookMarked,
  CheckCircle2,
  Flame,
  NotebookPen,
  Search,
  Timer,
  AlertTriangle,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatLocalDate,
  getGreeting,
  isDueToday,
  isOverdue,
  toLocalDateString,
} from '@/lib/dates'
import {
  computeStreak,
  getCompletionPercentage,
  getFocusNowTasks,
  computeWeeklyStats,
} from '@/lib/task-logic'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAppData()
  const { user } = useAuth()
  const {
    loading,
    subjects,
    tasks,
    toggleTaskComplete,
    getSubject,
  } = useAppData()
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState(new Date())

  const name =
    profile?.displayName?.split(' ')[0] ||
    user?.user_metadata?.display_name ||
    'Student'

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'Completed' && isDueToday(t.dueDate)),
    [tasks],
  )
  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== 'Completed' && isOverdue(t.dueDate, t.dueTime),
      ),
    [tasks],
  )
  const upcoming = useMemo(() => {
    const end = toLocalDateString(addDays(new Date(), 7))
    const today = toLocalDateString()
    return tasks
      .filter(
        (t) =>
          t.status !== 'Completed' &&
          t.dueDate >= today &&
          t.dueDate <= end &&
          !isDueToday(t.dueDate),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  }, [tasks])

  const focus = useMemo(() => getFocusNowTasks(tasks, 1)[0], [tasks])
  const completion = getCompletionPercentage(tasks)
  const weekStats = computeWeeklyStats(tasks)
  const streak = computeStreak(
    tasks
      .filter((t) => t.completedAt)
      .map((t) => t.completedAt as string),
  )

  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6),
  })

  const dayKey = toLocalDateString(selectedDay)
  const dayTasks = tasks.filter(
    (t) => t.dueDate === dayKey && t.status !== 'Completed',
  )

  const filteredSubjects = subjects.filter((s) => !s.archived)

  const onToggle = async (id: string) => {
    try {
      await toggleTaskComplete(id)
      toast.success('Task updated')
    } catch {
      toast.error('Could not update task')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <h1 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-foreground sm:text-3xl">
          Hello {name}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatLocalDate(new Date(), 'EEEE, MMMM d')}
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              navigate(`/timeline?q=${encodeURIComponent(query.trim())}`)
            }
          }}
          placeholder="Search tasks, notes, subjects…"
          className="h-12 rounded-2xl border-0 bg-card pl-10 shadow-[var(--shadow-soft)]"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--navy)] dark:text-foreground">
            Subject
          </h2>
          <Link to="/subjects" className="text-sm font-medium text-primary">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {filteredSubjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/timeline?subject=${s.id}`)}
              className="rounded-2xl px-3 py-3.5 text-left text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${s.colorFrom}, ${s.colorTo})`,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill icon={<CheckCircle2 className="size-4" />} label="Completion" value={`${completion}%`} />
        <StatPill icon={<Flame className="size-4" />} label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <StatPill
          icon={<BookMarked className="size-4" />}
          label="This week"
          value={`${weekStats.completedTasks}/${weekStats.totalTasks}`}
        />
      </div>

      {focus && (
        <Card className="overflow-hidden border-primary/20 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Focus Now</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskCard task={focus} subject={getSubject(focus.subjectId)} onToggle={onToggle} />
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">This week</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((day) => {
            const key = toLocalDateString(day)
            const count = tasks.filter((t) => t.dueDate === key).length
            const active = isSameDay(day, selectedDay)
            const isToday = isSameDay(day, new Date())
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'flex min-w-[3.25rem] flex-col items-center rounded-2xl px-2 py-2 text-xs transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-muted-foreground shadow-sm',
                )}
              >
                <span className="font-medium">{format(day, 'EEE')}</span>
                <span
                  className={cn(
                    'mt-1 flex size-8 items-center justify-center rounded-full text-sm font-bold',
                    isToday && !active && 'bg-primary/15 text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {count > 0 && (
                  <span className={cn('mt-1 size-1.5 rounded-full', active ? 'bg-white' : 'bg-primary')} />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-3 space-y-3">
          {dayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks this day.</p>
          ) : (
            dayTasks.map((t) => (
              <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={onToggle} />
            ))
          )}
        </div>
      </section>

      {overdueTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
            <AlertTriangle className="size-5" /> Overdue
          </h2>
          {overdueTasks.slice(0, 4).map((t) => (
            <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={onToggle} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Today</h2>
        {todayTasks.length === 0 ? (
          <EmptyState title="Nothing due today" description="Enjoy the breathing room or plan ahead." />
        ) : (
          todayTasks.map((t) => (
            <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={onToggle} />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Upcoming (7 days)</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming deadlines" description="Add a task to see it here." />
        ) : (
          upcoming.map((t) => (
            <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={onToggle} />
          ))
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickBtn icon={<NotebookPen className="size-4" />} label="Note" to="/notes" />
        <QuickBtn icon={<Timer className="size-4" />} label="Study" to="/study" />
        <QuickBtn icon={<BookMarked className="size-4" />} label="Growth" to="/growth" />
        <QuickBtn icon={<Search className="size-4" />} label="Timeline" to="/timeline" />
      </div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}

function QuickBtn({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode
  label: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="inline-flex h-12 items-center justify-start gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-medium shadow-sm hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  )
}
