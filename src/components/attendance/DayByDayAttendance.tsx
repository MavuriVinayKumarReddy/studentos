import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useAppData } from '@/context/AppDataContext'
import {
  toLocalDateString,
  formatLocalDate,
  parseLocalDate,
} from '@/lib/dates'
import { addDays, format } from 'date-fns'
import type { AttendanceRecord, AttendanceStatus, Subject } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function DayByDayAttendance() {
  const { subjects, attendance, userId, recordAttendance, updateAttendance, deleteAttendance } =
    useAppData()

  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString())
  const [extraSubjectId, setExtraSubjectId] = useState<string>('')
  const [extraSessionNum, setExtraSessionNum] = useState<string>('1')

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  // Parse day of week for selected date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDayOfWeek = useMemo(() => {
    try {
      const d = parseLocalDate(selectedDate)
      return d.getDay()
    } catch {
      return new Date().getDay()
    }
  }, [selectedDate])

  // Scheduled classes for this weekday
  const scheduledForDay = useMemo(() => {
    const list: { subject: Subject; startTime?: string; endTime?: string }[] = []
    for (const sub of activeSubjects) {
      if (sub.schedule) {
        for (const item of sub.schedule) {
          if (item.dayOfWeek === currentDayOfWeek) {
            list.push({
              subject: sub,
              startTime: item.startTime,
              endTime: item.endTime,
            })
          }
        }
      }
    }
    return list.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  }, [activeSubjects, currentDayOfWeek])

  // All attendance records for the selected date
  const dayRecords = useMemo(() => {
    return attendance.filter((r) => r.date === selectedDate)
  }, [attendance, selectedDate])

  // Separate Present, Absent, Cancelled counts for selected date
  const dayStats = useMemo(() => {
    let present = 0
    let absent = 0
    let cancelled = 0
    for (const r of dayRecords) {
      if (r.status === 'present') present++
      else if (r.status === 'absent') absent++
      else if (r.status === 'cancelled') cancelled++
    }
    const held = present + absent
    const pct = held > 0 ? Math.round((present / held) * 1000) / 10 : 0
    return { present, absent, cancelled, held, pct }
  }, [dayRecords])

  // 7-day strip around selected date
  const weekStrip = useMemo(() => {
    try {
      const base = parseLocalDate(selectedDate)
      const days = []
      for (let i = -3; i <= 3; i++) {
        const d = addDays(base, i)
        const dateStr = toLocalDateString(d)
        const recs = attendance.filter((r) => r.date === dateStr)
        const pres = recs.filter((r) => r.status === 'present').length
        const abs = recs.filter((r) => r.status === 'absent').length
        days.push({
          date: d,
          dateStr,
          dayName: format(d, 'EEE'),
          dayNum: format(d, 'd'),
          hasPresent: pres > 0,
          hasAbsent: abs > 0,
          presCount: pres,
          absCount: abs,
        })
      }
      return days
    } catch {
      return []
    }
  }, [selectedDate, attendance])

  // Navigation handlers
  const handlePrevDay = () => {
    const d = parseLocalDate(selectedDate)
    setSelectedDate(toLocalDateString(addDays(d, -1)))
  }

  const handleNextDay = () => {
    const d = parseLocalDate(selectedDate)
    setSelectedDate(toLocalDateString(addDays(d, 1)))
  }

  const handleJumpToToday = () => {
    setSelectedDate(toLocalDateString())
  }

  const handleJumpToYesterday = () => {
    setSelectedDate(toLocalDateString(addDays(new Date(), -1)))
  }

  // Record or toggle attendance for a subject on this date
  const handleToggleStatus = async (
    subjectId: string,
    targetStatus: AttendanceStatus,
    sessionNum = 1,
  ) => {
    const existing = dayRecords.find(
      (r) => r.subjectId === subjectId && (r.sessionNumber ?? 1) === sessionNum,
    )

    if (existing) {
      if (existing.status === targetStatus) {
        // Tapping the same active status removes the record (unmarks)
        try {
          await deleteAttendance(existing.id)
          toast.success('Attendance record cleared')
        } catch {
          toast.error('Failed to clear record')
        }
      } else {
        // Switch status (e.g. from Absent to Present)
        try {
          await updateAttendance(existing.id, { status: targetStatus })
          toast.success(`Updated to ${targetStatus}`)
        } catch {
          toast.error('Failed to update status')
        }
      }
    } else {
      // Create new record for this date
      try {
        await recordAttendance({
          userId,
          subjectId,
          date: selectedDate,
          status: targetStatus,
          sessionNumber: sessionNum,
        })
        toast.success(`Marked as ${targetStatus}`)
      } catch {
        toast.error('Failed to record attendance')
      }
    }
  }

  // Mark all scheduled subjects today as Present
  const handleMarkAllPresent = async () => {
    if (scheduledForDay.length === 0) return
    let markedCount = 0
    for (const item of scheduledForDay) {
      const existing = dayRecords.find((r) => r.subjectId === item.subject.id)
      if (!existing) {
        await recordAttendance({
          userId,
          subjectId: item.subject.id,
          date: selectedDate,
          status: 'present',
          sessionNumber: 1,
        })
        markedCount++
      } else if (existing.status !== 'present') {
        await updateAttendance(existing.id, { status: 'present' })
        markedCount++
      }
    }
    toast.success(`Marked ${markedCount} subject(s) as Present for ${formatLocalDate(selectedDate)}`)
  }

  // Add extra subject class on this date
  const handleAddExtraClass = async (status: AttendanceStatus) => {
    if (!extraSubjectId) {
      toast.error('Please pick a subject first')
      return
    }
    const sess = parseInt(extraSessionNum, 10) || 1
    await handleToggleStatus(extraSubjectId, status, sess)
    setExtraSubjectId('')
  }

  // Combine scheduled subjects with any additional subjects marked on this day
  const displayedSubjects = useMemo(() => {
    const list: {
      subject: Subject
      startTime?: string
      endTime?: string
      record?: AttendanceRecord
      isScheduled: boolean
    }[] = []

    // 1. Add all scheduled subjects
    for (const item of scheduledForDay) {
      const rec = dayRecords.find((r) => r.subjectId === item.subject.id)
      list.push({
        subject: item.subject,
        startTime: item.startTime,
        endTime: item.endTime,
        record: rec,
        isScheduled: true,
      })
    }

    // 2. Add any records for unscheduled subjects on this day
    for (const rec of dayRecords) {
      if (!list.some((item) => item.subject.id === rec.subjectId)) {
        const sub = activeSubjects.find((s) => s.id === rec.subjectId)
        if (sub) {
          list.push({
            subject: sub,
            record: rec,
            isScheduled: false,
          })
        }
      }
    }

    return list
  }, [scheduledForDay, dayRecords, activeSubjects])

  return (
    <div className="space-y-6">
      {/* Date Navigation & Calendar Strip */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* Date Selector Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-xl"
              onClick={handlePrevDay}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent font-display font-bold text-base sm:text-lg text-foreground focus:outline-hidden cursor-pointer"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-xl"
              onClick={handleNextDay}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <Button
              variant={selectedDate === toLocalDateString() ? 'default' : 'outline'}
              size="sm"
              className="h-8 rounded-xl text-xs font-semibold"
              onClick={handleJumpToToday}
            >
              Today
            </Button>
            <Button
              variant={
                selectedDate === toLocalDateString(addDays(new Date(), -1)) ? 'default' : 'outline'
              }
              size="sm"
              className="h-8 rounded-xl text-xs font-semibold"
              onClick={handleJumpToYesterday}
            >
              Yesterday
            </Button>
            {scheduledForDay.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={handleMarkAllPresent}
              >
                <CheckCheck className="size-3.5 mr-1" /> Mark All Present
              </Button>
            )}
          </div>
        </div>

        {/* 7-Day Mini Calendar Strip */}
        <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-border/50 text-center">
          {weekStrip.map((item) => {
            const isSelected = item.dateStr === selectedDate
            const isToday = item.dateStr === toLocalDateString()

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDate(item.dateStr)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl py-2 px-1 text-xs font-semibold transition',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-foreground',
                  isToday && !isSelected && 'ring-1 ring-primary/40',
                )}
              >
                <span className={cn('text-[10px] uppercase', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {item.dayName}
                </span>
                <span className="font-display font-bold text-sm mt-0.5">{item.dayNum}</span>

                {/* Status indicator dots */}
                <div className="mt-1 flex items-center justify-center gap-0.5 h-1.5">
                  {item.hasPresent && (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isSelected ? 'bg-white' : 'bg-emerald-500',
                      )}
                    />
                  )}
                  {item.hasAbsent && (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isSelected ? 'bg-rose-200' : 'bg-rose-500',
                      )}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Prominent Separate Present vs Absent Summary for this day */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Present Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 text-emerald-600" /> Present (Attended)
          </div>
          <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {dayStats.present}
          </p>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
            classes attended
          </span>
        </div>

        {/* Absent Card */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/60 dark:bg-rose-950/20 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
            <XCircle className="size-4 text-rose-600" /> Absent (Missed)
          </div>
          <p className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {dayStats.absent}
          </p>
          <span className="text-[11px] text-rose-700/80 dark:text-rose-400/80">classes missed</span>
        </div>

        {/* Cancelled Card */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 text-center">
          <span className="text-xs font-bold text-muted-foreground block">Cancelled</span>
          <p className="font-display text-2xl font-bold text-muted-foreground mt-1">
            {dayStats.cancelled}
          </p>
          <span className="text-[11px] text-muted-foreground">excluded from total</span>
        </div>

        {/* Day's Percentage */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-center">
          <span className="text-xs font-bold text-primary block">Day&apos;s Attendance</span>
          <p className="font-display text-2xl font-bold text-primary mt-1">
            {dayStats.held > 0 ? `${dayStats.pct}%` : '—'}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {dayStats.held} class(es) held
          </span>
        </div>
      </div>

      {/* Daily Class Sessions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Classes for {formatLocalDate(selectedDate, 'EEEE, MMM d')}
          </h3>
          <span className="text-xs text-muted-foreground">
            {displayedSubjects.length} subject(s) listed
          </span>
        </div>

        {displayedSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2 bg-card">
            <AlertCircle className="size-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No classes scheduled for this day</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No weekly class schedules are configured for this weekday. You can log an extra class below or configure subject schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedSubjects.map(({ subject, startTime, endTime, record, isScheduled }) => {
              const isPresent = record?.status === 'present'
              const isAbsent = record?.status === 'absent'
              const isCancelled = record?.status === 'cancelled'

              return (
                <div
                  key={subject.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  {/* Subject info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subject.colorFrom }}
                      />
                      <h4 className="font-display font-bold text-base truncate">{subject.name}</h4>
                      {subject.code && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {subject.code}
                        </span>
                      )}
                      {!isScheduled && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Extra / Unscheduled
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 ml-4.5">
                      {startTime ? (
                        <span>
                          {startTime} {endTime ? `- ${endTime}` : ''}
                        </span>
                      ) : (
                        <span>No fixed timing</span>
                      )}
                      {subject.instructor && <span>· Prof. {subject.instructor}</span>}
                      {record?.notes && <span className="italic">· &quot;{record.notes}&quot;</span>}
                    </div>
                  </div>

                  {/* Separate Present / Absent / Cancelled Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* PRESENT BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(subject.id, 'present')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs',
                        isPresent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40'
                          : 'border border-emerald-500/40 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40',
                      )}
                    >
                      <CheckCircle2 className="size-4" />
                      <span>{isPresent ? 'PRESENT ✓' : 'Mark Present'}</span>
                    </button>

                    {/* ABSENT BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(subject.id, 'absent')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs',
                        isAbsent
                          ? 'bg-rose-600 text-white ring-2 ring-rose-500/40'
                          : 'border border-rose-500/40 text-rose-600 bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/40',
                      )}
                    >
                      <XCircle className="size-4" />
                      <span>{isAbsent ? 'ABSENT ✗' : 'Mark Absent'}</span>
                    </button>

                    {/* CANCELLED BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(subject.id, 'cancelled')}
                      className={cn(
                        'rounded-xl px-2.5 py-2 text-xs font-semibold transition',
                        isCancelled
                          ? 'bg-slate-700 text-white'
                          : 'border border-border/70 text-muted-foreground hover:bg-muted',
                      )}
                      title="Mark as Cancelled by professor"
                    >
                      {isCancelled ? 'Cancelled' : 'Cancel'}
                    </button>

                    {/* CLEAR BUTTON IF MARKED */}
                    {record && (
                      <button
                        type="button"
                        onClick={() => deleteAttendance(record.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition"
                        title="Clear attendance record"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Extra Class for Any Subject */}
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 space-y-2.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Plus className="size-3.5 text-primary" /> Log Extra / Unscheduled Class on this Date:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={extraSubjectId}
              onChange={(e) => setExtraSubjectId(e.target.value)}
              className="text-xs h-9 rounded-xl max-w-xs flex-1 bg-card"
            >
              <option value="">Select a subject…</option>
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </Select>

            <Select
              value={extraSessionNum}
              onChange={(e) => setExtraSessionNum(e.target.value)}
              className="text-xs h-9 rounded-xl w-28 bg-card"
            >
              <option value="1">Session 1</option>
              <option value="2">Session 2</option>
              <option value="3">Session 3</option>
            </Select>

            <Button
              size="sm"
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => handleAddExtraClass('present')}
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Mark Present
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold"
              onClick={() => handleAddExtraClass('absent')}
            >
              <XCircle className="size-3.5 mr-1" /> Mark Absent
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
