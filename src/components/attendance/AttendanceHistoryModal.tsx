import { useMemo, useState } from 'react'
import {
  Trash2,
  Plus,
  AlertTriangle,
  History,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppData } from '@/context/AppDataContext'
import { computeSubjectAttendance } from '@/lib/attendance'
import { toLocalDateString, formatLocalDate } from '@/lib/dates'
import type { AttendanceRecord, AttendanceStatus, Subject } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AttendanceHistoryModalProps {
  subject: Subject | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceHistoryModal({
  subject,
  open,
  onOpenChange,
}: AttendanceHistoryModalProps) {
  const { attendance, recordAttendance, updateAttendance, deleteAttendance, userId } =
    useAppData()

  const [date, setDate] = useState(toLocalDateString())
  const [status, setStatus] = useState<AttendanceStatus>('present')
  const [sessionNumber, setSessionNumber] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'present' | 'absent' | 'cancelled'>('all')

  const subjectRecords = useMemo(() => {
    if (!subject) return []
    return attendance
      .filter((r) => r.subjectId === subject.id)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.sessionNumber ?? 1) - (a.sessionNumber ?? 1))
  }, [attendance, subject])

  const filteredRecords = useMemo(() => {
    if (historyFilter === 'all') return subjectRecords
    return subjectRecords.filter((r) => r.status === historyFilter)
  }, [subjectRecords, historyFilter])

  const stats = useMemo(() => {
    if (!subject) return null
    return computeSubjectAttendance(subject.id, attendance, subject.attendanceTarget ?? 75)
  }, [subject, attendance])

  if (!subject || !stats) return null

  const handleRecord = async () => {
    if (!date) {
      toast.error('Please pick a date')
      return
    }

    const sessNum = parseInt(sessionNumber, 10) || 1
    const existing = subjectRecords.find(
      (r) => r.date === date && (r.sessionNumber ?? 1) === sessNum,
    )

    if (existing) {
      const ok = confirm(
        `A record for ${formatLocalDate(date)} (Session ${sessNum}) already exists as "${existing.status}". Update it to "${status}"?`,
      )
      if (!ok) return
      setSaving(true)
      try {
        await updateAttendance(existing.id, { status, notes: notes.trim() || undefined })
        toast.success('Attendance record updated')
        setNotes('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to update record')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      await recordAttendance({
        userId,
        subjectId: subject.id,
        date,
        status,
        sessionNumber: sessNum,
        notes: notes.trim() || undefined,
      })
      toast.success(`Logged ${status} for ${formatLocalDate(date)}`)
      setNotes('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to record attendance')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rec: AttendanceRecord) => {
    const ok = confirm(
      `Delete attendance record for ${formatLocalDate(rec.date)} (Session ${rec.sessionNumber ?? 1})?`,
    )
    if (!ok) return
    try {
      await deleteAttendance(rec.id)
      toast.success('Record deleted')
    } catch {
      toast.error('Failed to delete record')
    }
  }

  const handleStatusChange = async (rec: AttendanceRecord, newStatus: AttendanceStatus) => {
    try {
      await updateAttendance(rec.id, { status: newStatus })
      toast.success(`Updated to ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div
            className="mb-2 h-1.5 w-16 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${subject.colorFrom}, ${subject.colorTo})`,
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                {subject.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {subject.code || 'Course'} · Target: {stats.target}%
              </p>
            </div>
            <Badge
              variant={
                stats.status === 'safe'
                  ? 'success'
                  : stats.status === 'warning'
                    ? 'warning'
                    : 'destructive'
              }
              className="text-xs font-semibold px-2.5 py-1"
            >
              {stats.percentage}% Attendance
            </Badge>
          </div>
        </DialogHeader>

        {/* Stats summary bar */}
        <div className="space-y-2 rounded-xl bg-muted/40 p-3 sm:p-4 border border-border/50">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Overall: {stats.attended}/{stats.totalHeld} classes attended</span>
            <span>Target: {stats.target}%</span>
          </div>
          <Progress
            value={Math.min(100, stats.percentage)}
            className="h-2.5 bg-muted"
            indicatorClassName={cn(
              stats.status === 'safe' && 'bg-emerald-500',
              stats.status === 'warning' && 'bg-amber-500',
              stats.status === 'below' && 'bg-rose-500',
            )}
          />

          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="rounded-lg bg-card p-2 border border-border/40">
              <span className="block text-muted-foreground">Attended</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {stats.attended}
              </span>
            </div>
            <div className="rounded-lg bg-card p-2 border border-border/40">
              <span className="block text-muted-foreground">Missed</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {stats.missed}
              </span>
            </div>
            <div className="rounded-lg bg-card p-2 border border-border/40">
              <span className="block text-muted-foreground">Cancelled</span>
              <span className="text-sm font-bold text-slate-500">
                {stats.cancelled}
              </span>
            </div>
          </div>

          <div className="pt-1 text-xs">
            {stats.consecutiveRequired > 0 ? (
              <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="size-3.5 shrink-0" />
                Need {stats.consecutiveRequired} consecutive classes to reach {stats.target}%
              </p>
            ) : stats.isTargetImpossible ? (
              <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="size-3.5 shrink-0" />
                Target of 100% is no longer reachable with missed classes.
              </p>
            ) : stats.maxMissable > 0 ? (
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                ✓ Above target: You can miss up to {stats.maxMissable} more class(es) while maintaining {stats.target}%.
              </p>
            ) : stats.totalHeld > 0 ? (
              <p className="text-amber-700 dark:text-amber-300 font-medium">
                ⚠️ Attendance is at target. Missing your next class will drop below {stats.target}%.
              </p>
            ) : (
              <p className="text-muted-foreground">No classes held yet.</p>
            )}
          </div>
        </div>

        {/* Log attendance form */}
        <section className="space-y-3 rounded-xl border border-border p-3 sm:p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Log Class Session
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Session #</label>
              <Select
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
                className="text-xs h-9"
              >
                <option value="1">Session 1</option>
                <option value="2">Session 2</option>
                <option value="3">Session 3</option>
                <option value="4">Session 4</option>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="text-xs h-9 font-medium"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Notes (optional, e.g. Topic, Lab session)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9 flex-1"
            />
            <Button size="sm" onClick={handleRecord} disabled={saving}>
              {saving ? 'Logging…' : 'Log'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            * Cancelled classes do not count towards total classes held.
          </p>
        </section>

        {/* Attendance log / history */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="size-4 text-muted-foreground" /> Attendance Log ({subjectRecords.length})
            </h3>

            {/* Separate Present / Absent Filters */}
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition border',
                  historyFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground',
                )}
              >
                All ({subjectRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('present')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition border',
                  historyFilter === 'present'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-100/50',
                )}
              >
                ✓ Present ({stats.attended})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('absent')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition border',
                  historyFilter === 'absent'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-100/50',
                )}
              >
                ✗ Absent ({stats.missed})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('cancelled')}
                className={cn(
                  'px-2 py-0.5 rounded-lg transition border',
                  historyFilter === 'cancelled'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground',
                )}
              >
                Cancelled ({stats.cancelled})
              </button>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No records found for &quot;{historyFilter}&quot; filter.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {formatLocalDate(r.date)}
                      </span>
                      {(r.sessionNumber ?? 1) > 1 && (
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                          S{r.sessionNumber}
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="truncate text-[11px] text-muted-foreground">{r.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status switcher */}
                    <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(r, 'present')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold transition',
                          r.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(r, 'absent')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold transition',
                          r.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(r, 'cancelled')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold transition',
                          r.status === 'cancelled'
                            ? 'bg-slate-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Cancelled
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r)}
                      aria-label="Delete attendance record"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}
