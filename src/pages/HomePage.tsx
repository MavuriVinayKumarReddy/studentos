import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays } from 'date-fns'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flame,
  NotebookPen,
  Plus,
  Search,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
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
} from '@/lib/task-logic'
import { computeOverallAttendance } from '@/lib/attendance'
import { Priority, TaskStatus, TaskType } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth() as any
  const {
    loading,
    subjects,
    tasks,
    attendance,
    toggleTaskComplete,
    createTask,
    recordAttendance,
    getSubject,
    userId,
    profile: appProfile,
  } = useAppData()

  const [query, setQuery] = useState('')

  // Quick Action Dialog states
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskType, setTaskType] = useState<TaskType>(TaskType.Assignment)
  const [taskSubjectId, setTaskSubjectId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState(toLocalDateString())
  const [taskDueTime, setTaskDueTime] = useState('')
  const [taskPriority, setTaskPriority] = useState<Priority>(Priority.Medium)
  const [savingTask, setSavingTask] = useState(false)
  const [showCompletedToday, setShowCompletedToday] = useState(false)

  // Single Source of Truth Greeting Name
  const rawName =
    appProfile?.displayName?.trim() ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('studentos-display-name')?.trim()
      : null) ||
    user?.user_metadata?.display_name ||
    'Student'

  const firstName = rawName.split(' ')[0] || rawName

  // Calculations
  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  const attendanceSummary = useMemo(
    () => computeOverallAttendance(activeSubjects, attendance),
    [activeSubjects, attendance],
  )

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status !== TaskStatus.Completed),
    [tasks],
  )

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.Completed),
    [tasks],
  )

  const completion = getCompletionPercentage(tasks)

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.status !== TaskStatus.Completed && isDueToday(t.dueDate)),
    [tasks],
  )

  const todayCompletedTasks = useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.Completed && isDueToday(t.dueDate)),
    [tasks],
  )

  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== TaskStatus.Completed && isOverdue(t.dueDate, t.dueTime),
      ),
    [tasks],
  )

  const upcomingDeadlines = useMemo(() => {
    const today = toLocalDateString()
    const next7Days = toLocalDateString(addDays(new Date(), 7))
    return tasks
      .filter(
        (t) =>
          t.status !== TaskStatus.Completed &&
          t.dueDate >= today &&
          t.dueDate <= next7Days &&
          !isDueToday(t.dueDate),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))
      .slice(0, 5)
  }, [tasks])

  // Today's Scheduled Classes from Subject Schedules
  const todayClasses = useMemo(() => {
    const currentDayOfWeek = new Date().getDay() // 0 = Sun, 1 = Mon ...
    const list: { subject: (typeof activeSubjects)[0]; item: any }[] = []
    for (const sub of activeSubjects) {
      if (sub.schedule) {
        for (const item of sub.schedule) {
          if (item.dayOfWeek === currentDayOfWeek) {
            list.push({ subject: sub, item })
          }
        }
      }
    }
    return list.sort((a, b) => (a.item.startTime ?? '').localeCompare(b.item.startTime ?? ''))
  }, [activeSubjects])

  const streak = useMemo(
    () =>
      computeStreak(
        tasks
          .filter((t) => t.completedAt)
          .map((t) => t.completedAt as string),
      ),
    [tasks],
  )

  const handleQuickCreateTask = async (isDeadline = false) => {
    if (!taskTitle.trim()) {
      toast.error('Task title is required')
      return
    }
    setSavingTask(true)
    try {
      await createTask({
        userId,
        title: taskTitle.trim(),
        subjectId: taskSubjectId || null,
        type: isDeadline ? TaskType.Exam : taskType,
        dueDate: taskDueDate,
        dueTime: taskDueTime || undefined,
        priority: taskPriority,
        status: TaskStatus.NotStarted,
        tentative: false,
        tags: isDeadline ? ['deadline'] : [],
        subtasks: [],
      })
      toast.success(isDeadline ? 'Deadline added' : 'Task added')
      setTaskTitle('')
      setTaskModalOpen(false)
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSavingTask(false)
    }
  }

  const handleQuickAttendance = async (subjectId: string, status: 'present' | 'absent') => {
    try {
      await recordAttendance({
        userId,
        subjectId,
        date: toLocalDateString(),
        status,
        sessionNumber: 1,
      })
      toast.success(`Marked ${status} for today`)
    } catch {
      toast.error('Failed to log attendance')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* 1. Header with Personalized Greeting & Today's Date */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {getGreeting()}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--heading,#1E3A5F)] dark:text-foreground sm:text-3xl">
            Hello, {firstName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Calendar className="size-3.5" />
            {formatLocalDate(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setTaskType(TaskType.Assignment)
              setTaskModalOpen(true)
            }}
            className="rounded-xl shadow-xs text-xs font-semibold"
          >
            <Plus className="size-3.5 mr-1" /> Add Task
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTaskType(TaskType.Exam)
              setTaskPriority(Priority.High)
              setTaskModalOpen(true)
            }}
            className="rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-semibold"
          >
            <AlertTriangle className="size-3.5 mr-1" /> Add Deadline
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/notes')}
            className="rounded-xl text-xs font-semibold"
          >
            <NotebookPen className="size-3.5 mr-1" /> Add Note
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/subjects')}
            className="rounded-xl text-xs font-semibold"
          >
            <BookOpen className="size-3.5 mr-1" /> Subjects
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              navigate(`/timeline?q=${encodeURIComponent(query.trim())}`)
            }
          }}
          placeholder="Search tasks, deadlines, notes, subjects…"
          className="h-11 rounded-2xl border border-border/70 bg-card pl-10 shadow-[var(--shadow-soft)] text-sm"
        />
      </div>

      {/* 2. Overall Attendance & Subject Warning Alerts */}
      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--heading,#1E3A5F)] dark:text-foreground">
                Overall Attendance: {attendanceSummary.percentage}%
              </h2>
              <p className="text-xs text-muted-foreground">
                {attendanceSummary.totalAttended} attended of {attendanceSummary.totalHeld} total classes held
              </p>
            </div>
          </div>

          <Link
            to="/subjects"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Manage Subjects & Logs →
          </Link>
        </div>

        <Progress
          value={Math.min(100, attendanceSummary.percentage)}
          className="h-2.5 bg-muted"
          indicatorClassName={cn(
            attendanceSummary.belowTargetSubjects.length > 0
              ? 'bg-rose-500'
              : attendanceSummary.warningSubjects.length > 0
                ? 'bg-amber-500'
                : 'bg-emerald-500',
          )}
        />

        {/* Separate Present / Absent Counts */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block flex items-center justify-center gap-1">
              <CheckCircle2 className="size-3" /> Present (Attended)
            </span>
            <span className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {attendanceSummary.totalAttended}
            </span>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-2">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block flex items-center justify-center gap-1">
              <XCircle className="size-3" /> Absent (Missed)
            </span>
            <span className="font-display font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
              {attendanceSummary.totalMissed}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Total Classes
            </span>
            <span className="font-display font-bold text-lg text-foreground mt-0.5 block">
              {attendanceSummary.totalHeld}
            </span>
          </div>
        </div>

        {/* Subject-wise attendance warnings */}
        {attendanceSummary.belowTargetSubjects.length > 0 ||
        attendanceSummary.warningSubjects.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {attendanceSummary.belowTargetSubjects.map((s) => {
              const sub = activeSubjects.find((x) => x.id === s.subjectId)
              return (
                <div
                  key={s.subjectId}
                  className="flex items-center justify-between rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 border border-rose-500/20"
                >
                  <span className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <strong>{sub?.name || 'Subject'}:</strong> {s.percentage}% is below {s.target}% target
                  </span>
                  <span className="text-[11px] shrink-0 font-semibold">
                    Need {s.consecutiveRequired} consecutive class(es)
                  </span>
                </div>
              )
            })}

            {attendanceSummary.warningSubjects.map((s) => {
              const sub = activeSubjects.find((x) => x.id === s.subjectId)
              return (
                <div
                  key={s.subjectId}
                  className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/20"
                >
                  <span className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <strong>{sub?.name || 'Subject'}:</strong> At target ({s.percentage}%)
                  </span>
                  <span className="text-[11px] shrink-0 font-semibold">
                    Cannot miss next class
                  </span>
                </div>
              )
            })}
          </div>
        ) : attendanceSummary.totalHeld > 0 ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Excellent! All subjects are currently meeting or exceeding attendance targets.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No attendance records logged yet. Use the buttons below or subject page to record class attendance.
          </p>
        )}
      </section>

      {/* 3. Today's Scheduled Classes (if configured in weekly schedule) */}
      {todayClasses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Today's Scheduled Classes ({todayClasses.length})
            </h2>
            <Link to="/subjects" className="text-xs font-medium text-primary hover:underline">
              View Schedule
            </Link>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {todayClasses.map(({ subject, item }) => {
              const todayStr = toLocalDateString()
              const todayRecord = attendance.find(
                (r) => r.subjectId === subject.id && r.date === todayStr,
              )

              return (
                <div
                  key={subject.id + (item.startTime ?? '')}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: subject.colorFrom }}
                      />
                      <h3 className="font-bold text-sm truncate">{subject.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                      {item.startTime ? `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ''}` : 'Today'}
                      {item.room ? ` · ${item.room}` : ''}
                      {subject.instructor ? ` · Prof. ${subject.instructor}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {todayRecord?.status === 'present' ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold border border-emerald-500/30">
                          <CheckCircle2 className="size-3.5 text-emerald-600" /> Present
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-muted-foreground hover:text-rose-600 px-2"
                          onClick={() => handleQuickAttendance(subject.id, 'absent')}
                          title="Switch to Absent"
                        >
                          Switch
                        </Button>
                      </>
                    ) : todayRecord?.status === 'absent' ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-xs font-bold border border-rose-500/30">
                          <XCircle className="size-3.5 text-rose-600" /> Absent
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-muted-foreground hover:text-emerald-600 px-2"
                          onClick={() => handleQuickAttendance(subject.id, 'present')}
                          title="Switch to Present"
                        >
                          Switch
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold"
                          onClick={() => handleQuickAttendance(subject.id, 'present')}
                        >
                          <CheckCircle2 className="size-3 mr-1" /> Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold"
                          onClick={() => handleQuickAttendance(subject.id, 'absent')}
                        >
                          <XCircle className="size-3 mr-1" /> Absent
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Task Overview Stats Pill Bar */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
          <p className="text-[11px] text-muted-foreground font-medium">Pending Tasks</p>
          <p className="font-display text-xl font-bold text-primary mt-0.5">
            {pendingTasks.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
          <p className="text-[11px] text-muted-foreground font-medium">Completed</p>
          <p className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {completedTasks.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
          <p className="text-[11px] text-muted-foreground font-medium">Task Progress</p>
          <p className="font-display text-xl font-bold text-foreground mt-0.5">
            {completion}%
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Flame className="size-3 text-amber-500" /> Study Streak
          </p>
          <p className="font-display text-xl font-bold text-foreground mt-0.5">
            {streak} day{streak === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* 5. Overdue Tasks (Critical Alert) */}
      {overdueTasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-destructive">
              <AlertTriangle className="size-4" /> Overdue Tasks ({overdueTasks.length})
            </h2>
            <Link to="/timeline?status=overdue" className="text-xs font-medium text-destructive hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((t) => (
              <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={toggleTaskComplete} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Tasks Due Today */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[var(--heading,#1E3A5F)] dark:text-foreground">
            Due Today ({todayTasks.length})
          </h2>
          <Link to="/timeline" className="text-xs font-medium text-primary hover:underline">
            Open Timeline
          </Link>
        </div>

        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Nothing due today!</p>
            <p className="mt-1">You are all caught up for today. Plan ahead or take a study break.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={toggleTaskComplete} />
            ))}
          </div>
        )}

        {/* Hidden completed tasks for today */}
        {todayCompletedTasks.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowCompletedToday((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition py-1"
            >
              {showCompletedToday ? (
                <>
                  <EyeOff className="size-3.5" />
                  <span>Hide {todayCompletedTasks.length} completed task(s)</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5 text-primary" />
                  <span>
                    {todayCompletedTasks.length} completed task{todayCompletedTasks.length === 1 ? '' : 's'} hidden ·{' '}
                    <span className="text-primary underline font-bold">Show Completed</span>
                  </span>
                </>
              )}
            </button>

            {showCompletedToday && (
              <div className="space-y-2 mt-2 pt-1 border-t border-border/50">
                {todayCompletedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={toggleTaskComplete} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 7. Upcoming Deadlines (Next 7 Days) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[var(--heading,#1E3A5F)] dark:text-foreground">
            Upcoming Deadlines (Next 7 Days)
          </h2>
          <Link to="/timeline" className="text-xs font-medium text-primary hover:underline">
            All tasks
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
            No upcoming deadlines scheduled in the next 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.map((t) => (
              <TaskCard key={t.id} task={t} subject={getSubject(t.subjectId)} onToggle={toggleTaskComplete} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Add Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {taskType === TaskType.Exam ? 'Add Exam / Deadline' : 'Quick Add Task'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Title *</label>
              <Input
                placeholder="What needs to be done?"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <Select
                  value={taskSubjectId}
                  onChange={(e) => setTaskSubjectId(e.target.value)}
                >
                  <option value="">No subject</option>
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Type</label>
                <Select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                >
                  <option value={TaskType.Assignment}>Assignment</option>
                  <option value={TaskType.Exam}>Exam</option>
                  <option value={TaskType.Quiz}>Quiz</option>
                  <option value={TaskType.Project}>Project</option>
                  <option value={TaskType.Lab}>Lab</option>
                  <option value={TaskType.Reading}>Reading</option>
                  <option value={TaskType.DSAPractice}>DSA Practice</option>
                  <option value={TaskType.Personal}>Personal</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Due Date</label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Due Time (optional)</label>
                <Input
                  type="time"
                  value={taskDueTime}
                  onChange={(e) => setTaskDueTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Priority</label>
              <Select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as Priority)}
              >
                <option value={Priority.Low}>Low</option>
                <option value={Priority.Medium}>Medium</option>
                <option value={Priority.High}>High</option>
                <option value={Priority.Urgent}>Urgent</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleQuickCreateTask(taskType === TaskType.Exam)} disabled={savingTask}>
              {savingTask ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
