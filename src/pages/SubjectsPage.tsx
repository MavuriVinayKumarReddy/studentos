import { useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Calendar,
  BookOpen,
  Calculator,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SUBJECT_COLORS } from '@/lib/constants'
import { computeOverallAttendance, computeSubjectAttendance } from '@/lib/attendance'
import { AttendanceHistoryModal } from '@/components/attendance/AttendanceHistoryModal'
import { DayByDayAttendance } from '@/components/attendance/DayByDayAttendance'
import { AttendanceCalculator } from '@/components/attendance/AttendanceCalculator'
import { toLocalDateString } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Subject, WeeklyScheduleItem } from '@/types'

const DAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
]

export function SubjectsPage() {
  const {
    subjects,
    tasks,
    attendance,
    userId,
    createSubject,
    updateSubject,
    deleteSubject,
    recordAttendance,
  } = useAppData()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [colorId, setColorId] = useState(SUBJECT_COLORS[0]!.id)
  const [semester, setSemester] = useState('')
  const [instructor, setInstructor] = useState('')
  const [attendanceTarget, setAttendanceTarget] = useState('75')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // Attendance history modal state
  const [historySubject, setHistorySubject] = useState<Subject | null>(null)
  const [pageTab, setPageTab] = useState<'dayByDay' | 'subjects' | 'calculator'>('dayByDay')

  const active = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  const overall = useMemo(
    () => computeOverallAttendance(active, attendance),
    [active, attendance],
  )

  const openCreate = () => {
    setEditing(null)
    setName('')
    setCode('')
    setColorId(SUBJECT_COLORS[0]!.id)
    setSemester('')
    setInstructor('')
    setAttendanceTarget('75')
    setSelectedDays([])
    setStartTime('10:00')
    setEndTime('11:30')
    setOpen(true)
  }

  const openEdit = (s: Subject) => {
    setEditing(s)
    setName(s.name)
    setCode(s.code ?? '')
    setColorId(s.colorId)
    setSemester(s.semester ?? '')
    setInstructor(s.instructor ?? '')
    setAttendanceTarget(String(s.attendanceTarget ?? 75))
    const days = (s.schedule ?? []).map((item) => item.dayOfWeek)
    setSelectedDays(days)
    setStartTime(s.schedule?.[0]?.startTime ?? '10:00')
    setEndTime(s.schedule?.[0]?.endTime ?? '11:30')
    setOpen(true)
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error('Subject name is required')
      return
    }

    const targetVal = Math.min(100, Math.max(0, parseInt(attendanceTarget, 10) || 75))
    const color = SUBJECT_COLORS.find((c) => c.id === colorId) ?? SUBJECT_COLORS[0]!

    const schedule: WeeklyScheduleItem[] = selectedDays.map((d) => ({
      id: crypto.randomUUID(),
      dayOfWeek: d,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    }))

    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      colorId: color.id,
      colorFrom: color.from,
      colorTo: color.to,
      semester: semester || undefined,
      instructor: instructor || undefined,
      attendanceTarget: targetVal,
      schedule: schedule.length > 0 ? schedule : undefined,
    }

    if (editing) {
      await updateSubject(editing.id, payload)
      toast.success('Subject updated')
    } else {
      await createSubject({ userId, ...payload })
      toast.success('Subject created')
    }
    setOpen(false)
  }

  const onDelete = async (s: Subject) => {
    const taskCount = tasks.filter((t) => t.subjectId === s.id).length
    const attCount = attendance.filter((a) => a.subjectId === s.id).length
    const ok = confirm(
      `Delete subject "${s.name}"?\n\n` +
        `This will permanently delete this subject and its ${attCount} attendance record(s).\n\n` +
        `Tasks (${taskCount}) will be preserved with unassigned subject link.\n\n` +
        `Are you sure you want to proceed?`,
    )
    if (!ok) return
    await deleteSubject(s.id)
    toast.success('Subject and its attendance records deleted')
  }

  const handleQuickAttendance = async (
    subjectId: string,
    status: 'present' | 'absent',
  ) => {
    const today = toLocalDateString()
    try {
      await recordAttendance({
        userId,
        subjectId,
        date: today,
        status,
        sessionNumber: 1,
      })
      toast.success(`Marked ${status} for today`)
    } catch {
      toast.error('Failed to log attendance')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Subjects & Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Day-by-day logging, subject overviews, and attendance calculator
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl shadow-xs">
          <Plus className="size-4 mr-1" /> Add subject
        </Button>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-card p-1 shadow-xs border border-border/70 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setPageTab('dayByDay')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-4 py-2 transition',
            pageTab === 'dayByDay'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Calendar className="size-4" /> Day-by-Day Tracker
        </button>
        <button
          type="button"
          onClick={() => setPageTab('subjects')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-4 py-2 transition',
            pageTab === 'subjects'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <BookOpen className="size-4" /> All Subjects & Stats ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setPageTab('calculator')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-4 py-2 transition',
            pageTab === 'calculator'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Calculator className="size-4" /> Bunk & Recovery Calculator
        </button>
      </div>

      {/* 1. Day-by-Day Attendance Tab */}
      {pageTab === 'dayByDay' && <DayByDayAttendance />}

      {/* 2. Bunk & Recovery Calculator Tab */}
      {pageTab === 'calculator' && <AttendanceCalculator />}

      {/* 3. Subjects & Stats Tab */}
      {pageTab === 'subjects' && (
        <div className="space-y-5">
          {/* Aggregate Attendance Summary Card */}
          {active.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall Attendance Summary
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-display text-[var(--heading,#1E3A5F)] dark:text-foreground">
                      {overall.percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({overall.totalAttended} attended of {overall.totalHeld} total held)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {overall.belowTargetSubjects.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overall.belowTargetSubjects.length} subject(s) below target
                    </Badge>
                  )}
                  {overall.warningSubjects.length > 0 && (
                    <Badge variant="warning" className="text-xs">
                      {overall.warningSubjects.length} subject(s) at risk
                    </Badge>
                  )}
                  {overall.belowTargetSubjects.length === 0 &&
                    overall.warningSubjects.length === 0 &&
                    overall.totalHeld > 0 && (
                      <Badge variant="success" className="text-xs">
                        All subjects on target
                      </Badge>
                    )}
                </div>
              </div>

              <Progress
                value={Math.min(100, overall.percentage)}
                className="h-2.5"
                indicatorClassName={cn(
                  overall.belowTargetSubjects.length > 0
                    ? 'bg-rose-500'
                    : overall.warningSubjects.length > 0
                      ? 'bg-amber-500'
                      : 'bg-emerald-500',
                )}
              />

              {/* Separate Present / Absent / Cancelled Overall Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/50 text-center">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block flex items-center justify-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Present (Attended)
                  </span>
                  <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {overall.totalAttended}
                  </span>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-2">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block flex items-center justify-center gap-1">
                    <XCircle className="size-3.5" /> Absent (Missed)
                  </span>
                  <span className="font-display text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                    {overall.totalMissed}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Total Held
                  </span>
                  <span className="font-display text-lg font-bold text-foreground mt-0.5 block">
                    {overall.totalHeld}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Cancelled
                  </span>
                  <span className="font-display text-lg font-bold text-muted-foreground mt-0.5 block">
                    {overall.totalCancelled}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subject Cards Grid */}
          {active.length === 0 ? (
            <EmptyState
              title="No subjects yet"
              description="Add your first college course to start tracking attendance and schedules."
              actionLabel="Add subject"
              onAction={openCreate}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {active.map((s) => {
                const stats = computeSubjectAttendance(
                  s.id,
                  attendance,
                  s.attendanceTarget ?? 75,
                )

                return (
                  <article
                    key={s.id}
                    className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] flex flex-col justify-between"
                  >
                    {/* Subject color bar */}
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{
                        background: `linear-gradient(90deg, ${s.colorFrom}, ${s.colorTo})`,
                      }}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display text-lg font-bold truncate">
                              {s.name}
                            </h2>
                            {s.code && (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                {s.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.instructor ? `Prof. ${s.instructor}` : ''}
                            {s.semester ? ` · ${s.semester}` : ''}
                          </p>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => openEdit(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDelete(s)}
                            aria-label="Delete subject"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Attendance Stats Section */}
                      <div className="mt-4 rounded-xl bg-muted/30 p-3 border border-border/40 space-y-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground">
                            Attendance: {stats.percentage}%
                          </span>
                          <Badge
                            variant={
                              stats.status === 'safe'
                                ? 'success'
                                : stats.status === 'warning'
                                  ? 'warning'
                                  : 'destructive'
                            }
                            className="text-[10px] font-semibold uppercase px-2 py-0.5"
                          >
                            {stats.status === 'safe'
                              ? 'Safe'
                              : stats.status === 'warning'
                                ? 'Warning'
                                : 'Below Target'}
                          </Badge>
                        </div>

                        <Progress
                          value={Math.min(100, stats.percentage)}
                          className="h-2 bg-muted"
                          indicatorClassName={cn(
                            stats.status === 'safe' && 'bg-emerald-500',
                            stats.status === 'warning' && 'bg-amber-500',
                            stats.status === 'below' && 'bg-rose-500',
                          )}
                        />

                        {/* Separate Present & Absent Stats Boxes */}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/20 p-1.5">
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block flex items-center justify-center gap-1">
                              <CheckCircle2 className="size-3" /> Present
                            </span>
                            <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                              {stats.attended}
                            </span>
                          </div>

                          <div className="rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-500/20 p-1.5">
                            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 block flex items-center justify-center gap-1">
                              <XCircle className="size-3" /> Absent
                            </span>
                            <span className="font-display font-bold text-rose-600 dark:text-rose-400 text-sm mt-0.5 block">
                              {stats.missed}
                            </span>
                          </div>

                          <div className="rounded-lg bg-card border border-border/50 p-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground block">
                              Target
                            </span>
                            <span className="font-display font-bold text-foreground text-sm mt-0.5 block">
                              {stats.target}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 text-[11px]">
                          {stats.consecutiveRequired > 0 ? (
                            <p className="text-rose-600 dark:text-rose-400 font-medium">
                              ⚠️ Attend next {stats.consecutiveRequired} class(es) to reach {stats.target}%
                            </p>
                          ) : stats.isTargetImpossible ? (
                            <p className="text-rose-600 dark:text-rose-400 font-medium">
                              Target of 100% cannot be reached due to missed classes.
                            </p>
                          ) : stats.maxMissable > 0 ? (
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                              ✓ Can miss up to {stats.maxMissable} class(es) safely
                            </p>
                          ) : stats.totalHeld > 0 ? (
                            <p className="text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ At target: Missing next class drops below {stats.target}%
                            </p>
                          ) : (
                            <p className="text-muted-foreground">No classes recorded yet</p>
                          )}
                        </div>
                      </div>

                      {/* Schedule badges */}
                      {s.schedule && s.schedule.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          {s.schedule.map((item) => (
                            <span
                              key={item.id}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              {DAYS.find((d) => d.day === item.dayOfWeek)?.label ?? 'Day'}{' '}
                              {item.startTime ? `@ ${item.startTime}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card footer actions */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
                          onClick={() => handleQuickAttendance(s.id, 'present')}
                        >
                          <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> + Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                          onClick={() => handleQuickAttendance(s.id, 'absent')}
                        >
                          <XCircle className="size-3.5 mr-1 text-rose-600" /> + Absent
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-primary font-medium hover:bg-primary/10"
                        onClick={() => setHistorySubject(s)}
                      >
                        <History className="size-3.5 mr-1" /> History & Logs
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Subject Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Edit Subject' : 'New Subject'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Subject Name *</label>
              <Input
                placeholder="e.g. Data Structures & Algorithms"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Subject Code</label>
                <Input
                  placeholder="e.g. CS201"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">
                  Attendance Target (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Default 75"
                  value={attendanceTarget}
                  onChange={(e) => setAttendanceTarget(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Theme Color</label>
              <Select value={colorId} onChange={(e) => setColorId(e.target.value)}>
                {SUBJECT_COLORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Semester / Term</label>
                <Input
                  placeholder="e.g. Fall 2026"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Instructor</label>
                <Input
                  placeholder="e.g. Dr. Turing"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                />
              </div>
            </div>

            {/* Weekly Schedule Settings */}
            <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
              <label className="text-xs font-semibold block">Weekly Schedule (optional)</label>
              <p className="text-[11px] text-muted-foreground">
                Select class days to surface today's scheduled classes on your Dashboard.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DAYS.map(({ day, label }) => {
                  const active = selectedDays.includes(day)
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'h-8 w-11 rounded-lg text-xs font-semibold transition',
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-card border border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {selectedDays.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Start Time</label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">End Time</label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance History Modal */}
      <AttendanceHistoryModal
        subject={historySubject}
        open={Boolean(historySubject)}
        onOpenChange={(open) => !open && setHistorySubject(null)}
      />
    </div>
  )
}
