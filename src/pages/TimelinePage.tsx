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
import {
  CalendarDays,
  LayoutList,
  GanttChart,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { filterTasks, sortTasks } from '@/lib/task-logic'
import {
  formatDueCountdown,
  formatLocalDate,
  relativeDayLabel,
  toLocalDateString,
  isDueToday,
  isOverdue,
} from '@/lib/dates'
import { TASK_TYPES, PRIORITIES } from '@/lib/constants'
import { Priority, TaskStatus, TaskType, type TaskSortBy } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ViewMode = 'timeline' | 'calendar' | 'list'
type FilterTab = 'all' | 'today' | 'upcoming' | 'overdue' | 'deadlines' | 'completed'

export function TimelinePage() {
  const [params] = useSearchParams()
  const { tasks, subjects, loading, toggleTaskComplete, createTask, getSubject, userId } =
    useAppData()

  const [view, setView] = useState<ViewMode>('timeline')
  const [activeTab, setActiveTab] = useState<FilterTab>(
    (params.get('status') as FilterTab) || 'all',
  )
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('')
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate')
  const [showCompleted, setShowCompleted] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toLocalDateString())

  // Quick Add Modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newType, setNewType] = useState<TaskType>(TaskType.Assignment)
  const [newDueDate, setNewDueDate] = useState(toLocalDateString())
  const [newDueTime, setNewDueTime] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>(Priority.Medium)
  const [newNotes, setNewNotes] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  // Apply tab filter on top of base filters
  const tabFilteredTasks = useMemo(() => {
    const today = toLocalDateString()
    const next7Days = toLocalDateString(addDays(new Date(), 7))

    return tasks.filter((t) => {
      // Completed tab always shows completed tasks
      if (activeTab === 'completed') {
        return t.status === TaskStatus.Completed
      }

      // Hide completed tasks unless showCompleted is enabled
      if (!showCompleted && t.status === TaskStatus.Completed) {
        return false
      }

      if (activeTab === 'today') {
        return isDueToday(t.dueDate)
      }
      if (activeTab === 'upcoming') {
        return t.dueDate >= today && t.dueDate <= next7Days
      }
      if (activeTab === 'overdue') {
        return isOverdue(t.dueDate, t.dueTime)
      }
      if (activeTab === 'deadlines') {
        const isDeadlineType =
          t.type === TaskType.Exam ||
          t.type === TaskType.Quiz ||
          t.type === TaskType.Project ||
          t.priority === Priority.High ||
          t.priority === Priority.Urgent
        return isDeadlineType
      }
      return true
    })
  }, [tasks, activeTab, showCompleted])

  const filtered = useMemo(() => {
    const list = filterTasks(tabFilteredTasks, {
      search: search || undefined,
      subjectId: subjectId || undefined,
      type: (type as TaskType) || undefined,
      priority: (priority as Priority) || undefined,
      includeCompleted: true,
    })
    return sortTasks(list, sortBy)
  }, [tabFilteredTasks, search, subjectId, type, priority, sortBy])

  // Count how many completed tasks are currently hidden
  const hiddenCompletedCount = useMemo(() => {
    if (activeTab === 'completed') return 0
    const today = toLocalDateString()
    const next7Days = toLocalDateString(addDays(new Date(), 7))

    const completedInScope = tasks.filter((t) => {
      if (t.status !== TaskStatus.Completed) return false
      if (activeTab === 'today') return isDueToday(t.dueDate)
      if (activeTab === 'upcoming') return t.dueDate >= today && t.dueDate <= next7Days
      if (activeTab === 'overdue') return isOverdue(t.dueDate, t.dueTime)
      if (activeTab === 'deadlines') {
        return (
          t.type === TaskType.Exam ||
          t.type === TaskType.Quiz ||
          t.type === TaskType.Project ||
          t.priority === Priority.High ||
          t.priority === Priority.Urgent
        )
      }
      return true
    })

    return filterTasks(completedInScope, {
      search: search || undefined,
      subjectId: subjectId || undefined,
      type: (type as TaskType) || undefined,
      priority: (priority as Priority) || undefined,
      includeCompleted: true,
    }).length
  }, [tasks, activeTab, search, subjectId, type, priority])

  const totalCompletedCount = useMemo(() => {
    return tasks.filter((t) => t.status === TaskStatus.Completed).length
  }, [tasks])

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
      toast.success('Task status updated')
    } catch {
      toast.error('Could not update task')
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('Title is required')
      return
    }
    setSavingTask(true)
    try {
      await createTask({
        userId,
        title: newTitle.trim(),
        subjectId: newSubjectId || null,
        type: newType,
        dueDate: newDueDate,
        dueTime: newDueTime || undefined,
        priority: newPriority,
        status: TaskStatus.NotStarted,
        tentative: false,
        notes: newNotes.trim() || undefined,
        tags: newType === TaskType.Exam || newType === TaskType.Quiz ? ['deadline'] : [],
        subtasks: [],
      })
      toast.success('Task created')
      setNewTitle('')
      setNewNotes('')
      setAddModalOpen(false)
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSavingTask(false)
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
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-foreground">
            Tasks & Deadlines
          </h1>
          <p className="text-sm text-muted-foreground">
            Track assignments, exams, homework, and deadlines
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Task Button */}
          <Button onClick={() => setAddModalOpen(true)} className="rounded-xl shadow-xs">
            <Plus className="size-4 mr-1" /> Add Task
          </Button>

          {/* View Mode Switcher */}
          <div className="flex rounded-2xl bg-card p-1 shadow-xs border border-border/70">
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
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  view === id
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Filter Tabs & Show Completed Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
              ['all', 'All Tasks'],
              ['today', 'Today'],
              ['upcoming', 'Upcoming (7d)'],
              ['overdue', 'Overdue'],
              ['deadlines', 'Deadlines & Exams'],
              ['completed', 'Completed'],
            ] as const
          ).map(([tabKey, label]) => {
            const active = activeTab === tabKey
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 font-semibold transition border',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        {activeTab !== 'completed' && (
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold transition border text-xs ml-auto',
              showCompleted
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {showCompleted ? (
              <>
                <EyeOff className="size-3.5" />
                <span>Hide Completed</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5 text-primary" />
                <span>
                  Show Completed {hiddenCompletedCount > 0 ? `(${hiddenCompletedCount})` : totalCompletedCount > 0 ? `(${totalCompletedCount})` : ''}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search tasks, notes, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl bg-card text-xs h-9"
        />

        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-xl text-xs h-9"
        >
          <option value="">All subjects</option>
          {activeSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl text-xs h-9"
        >
          <option value="">All types</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-xl text-xs h-9"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as TaskSortBy)}
          className="rounded-xl text-xs h-9"
        >
          <option value="dueDate">Deadline (Earliest first)</option>
          <option value="priority">Priority (Highest first)</option>
          <option value="urgency">Urgency score</option>
          <option value="createdAt">Recently created</option>
          <option value="title">Title (A-Z)</option>
        </Select>
      </div>

      {/* Main Views */}
      {view === 'timeline' && (
        <div className="space-y-6">
          {grouped.length === 0 ? (
            <EmptyState
              title="No matching tasks"
              description="No tasks match your selected tab and filters."
              actionLabel="Add task"
              onAction={() => setAddModalOpen(true)}
            />
          ) : (
            grouped.map(([date, items]) => (
              <section key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="size-2 rounded-full bg-primary" />
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {relativeDayLabel(date)} · {formatLocalDate(date, 'EEEE, MMM d')}
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
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
          <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] border border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalMonth(addDays(startOfMonth(calMonth), -1))}
              >
                Prev
              </Button>
              <h2 className="font-display font-bold text-base">{format(calMonth, 'MMMM yyyy')}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalMonth(addDays(endOfMonth(calMonth), 1))}
              >
                Next
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
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
                      'relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition',
                      !inMonth && 'opacity-30',
                      selected && 'bg-primary text-white shadow-xs',
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

          <h3 className="font-display font-bold text-sm">
            Scheduled for {formatLocalDate(selectedDay, 'EEEE, MMMM d')}
          </h3>
          <div className="space-y-2">
            {filtered.filter((t) => t.dueDate === selectedDay).length === 0 ? (
              <EmptyState title="No tasks or deadlines on this day" />
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
        <div className="overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-card)] border border-border/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase font-semibold text-muted-foreground bg-muted/30">
              <tr>
                <th className="p-3 w-12">Done</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Task / Deadline</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const sub = getSubject(t.subjectId)
                const isDeadline =
                  t.type === TaskType.Exam ||
                  t.type === TaskType.Quiz ||
                  t.type === TaskType.Project
                return (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/30 transition">
                    <td className="p-3">
                      <Checkbox
                        checked={t.status === TaskStatus.Completed}
                        onChange={() => onToggle(t.id)}
                      />
                    </td>
                    <td className="p-3">
                      {sub ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{
                            background: `linear-gradient(135deg, ${sub.colorFrom}, ${sub.colorTo})`,
                          }}
                        >
                          {sub.code || sub.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <a href={`/tasks/${t.id}`} className="font-semibold hover:text-primary">
                        {t.title}
                      </a>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {isDeadline ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Deadline ({t.type})
                          </span>
                        ) : (
                          t.type
                        )}
                        {(t.attachments?.length ?? 0) > 0 && (
                          <span>· {t.attachments!.length} attachment(s)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-medium">{formatLocalDate(t.dueDate, 'MMM d, yyyy')}</div>
                      <div className="text-muted-foreground">
                        {formatDueCountdown(t.dueDate, t.dueTime)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-semibold',
                          t.priority === Priority.Urgent && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                          t.priority === Priority.High && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                          t.priority === Priority.Medium && 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                          t.priority === Priority.Low && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        )}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{t.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-6">
              <EmptyState title="No matching tasks" />
            </div>
          )}
        </div>
      )}

      {/* Hidden / Shown Completed Tasks Banner */}
      {activeTab !== 'completed' && hiddenCompletedCount > 0 && !showCompleted && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{hiddenCompletedCount} completed task{hiddenCompletedCount === 1 ? '' : 's'}</strong> hidden after completion.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-semibold bg-card border-border/80 text-foreground hover:bg-muted"
            onClick={() => setShowCompleted(true)}
          >
            <Eye className="size-3.5 mr-1.5 text-primary" /> Show Hidden Tasks
          </Button>
        </div>
      )}

      {activeTab !== 'completed' && showCompleted && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <Eye className="size-4 text-emerald-600 shrink-0" />
            <span>
              Showing all tasks (including completed tasks).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-semibold bg-card border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-muted"
            onClick={() => setShowCompleted(false)}
          >
            <EyeOff className="size-3.5 mr-1.5" /> Hide Completed Tasks
          </Button>
        </div>
      )}

      {/* Quick Add Task Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Task / Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Title *</label>
              <Input
                placeholder="Task title or exam topic…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <Select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
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
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as TaskType)}
                >
                  <option value={TaskType.Assignment}>Assignment</option>
                  <option value={TaskType.Exam}>Exam (Deadline)</option>
                  <option value={TaskType.Quiz}>Quiz (Deadline)</option>
                  <option value={TaskType.Project}>Project (Deadline)</option>
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
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Due Time (optional)</label>
                <Input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Priority</label>
              <Select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
              >
                <option value={Priority.Low}>Low</option>
                <option value={Priority.Medium}>Medium</option>
                <option value={Priority.High}>High</option>
                <option value={Priority.Urgent}>Urgent</option>
              </Select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Notes / Description (optional)</label>
              <Input
                placeholder="Details, chapters, guidelines…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={savingTask}>
              {savingTask ? 'Saving…' : 'Save Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
