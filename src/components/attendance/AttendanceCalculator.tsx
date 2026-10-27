import { useState, useMemo } from 'react'
import {
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  computeSubjectAttendance,
  computeOverallAttendance,
  projectAttendance,
} from '@/lib/attendance'
import { cn } from '@/lib/utils'

export function AttendanceCalculator() {
  const { subjects, attendance } = useAppData()
  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('overall')
  const [bunkClasses, setBunkClasses] = useState<number>(1)
  const [attendClasses, setAttendClasses] = useState<number>(3)

  const overall = useMemo(
    () => computeOverallAttendance(activeSubjects, attendance),
    [activeSubjects, attendance],
  )

  const currentStats = useMemo(() => {
    if (selectedSubjectId === 'overall') {
      const target = 75
      const attended = overall.totalAttended
      const totalHeld = overall.totalHeld
      const missed = overall.totalMissed
      const percentage = overall.percentage
      const isTargetMet = totalHeld === 0 ? true : percentage >= target

      // Compute how many can be missed or needed overall
      let maxMissable = 0
      if (totalHeld > 0 && percentage >= target) {
        const raw = (100 * attended) / target - totalHeld
        maxMissable = Math.max(0, Math.floor(raw))
      }

      let consecutiveRequired = 0
      if (totalHeld > 0 && percentage < target) {
        const num = target * totalHeld - 100 * attended
        const den = 100 - target
        consecutiveRequired = Math.max(0, Math.ceil(num / den))
      }

      return {
        name: 'All Subjects (Aggregate)',
        code: 'OVERALL',
        attended,
        missed,
        totalHeld,
        percentage,
        target,
        isTargetMet,
        maxMissable,
        consecutiveRequired,
        isTargetImpossible: target >= 100 && missed > 0,
      }
    }

    const sub = activeSubjects.find((s) => s.id === selectedSubjectId)
    if (!sub) return null
    const stats = computeSubjectAttendance(sub.id, attendance, sub.attendanceTarget ?? 75)
    return {
      name: sub.name,
      code: sub.code || 'SUB',
      attended: stats.attended,
      missed: stats.missed,
      totalHeld: stats.totalHeld,
      percentage: stats.percentage,
      target: stats.target,
      isTargetMet: stats.isTargetMet,
      maxMissable: stats.maxMissable,
      consecutiveRequired: stats.consecutiveRequired,
      isTargetImpossible: stats.isTargetImpossible,
    }
  }, [selectedSubjectId, activeSubjects, attendance, overall])

  // Simulation: Bunk N classes
  const bunkProjection = useMemo(() => {
    if (!currentStats) return null
    return projectAttendance(
      currentStats.attended,
      currentStats.totalHeld,
      0,
      bunkClasses,
      currentStats.target,
    )
  }, [currentStats, bunkClasses])

  // Simulation: Attend N classes
  const attendProjection = useMemo(() => {
    if (!currentStats) return null
    return projectAttendance(
      currentStats.attended,
      currentStats.totalHeld,
      attendClasses,
      0,
      currentStats.target,
    )
  }, [currentStats, attendClasses])

  if (!currentStats) return null

  return (
    <div className="space-y-6">
      {/* Subject Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Calculator className="size-5 text-primary" /> Attendance & Bunk Calculator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test future attendance scenarios: simulate bunking or attending upcoming lectures.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Select Subject:
          </label>
          <Select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="text-xs h-9 rounded-xl font-medium"
          >
            <option value="overall">All Subjects Combined (Overall)</option>
            {activeSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''} — Target: {s.attendanceTarget ?? 75}%
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Current Attendance Status Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Current Status for:</span>
            <h3 className="font-display text-lg font-bold text-foreground">
              {currentStats.name}
            </h3>
          </div>
          <Badge
            variant={currentStats.isTargetMet ? 'success' : 'destructive'}
            className="text-xs font-semibold px-2.5 py-1"
          >
            {currentStats.percentage}% Attendance (Target: {currentStats.target}%)
          </Badge>
        </div>

        {/* Separate Present / Absent / Held Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block flex items-center justify-center gap-1">
              <CheckCircle2 className="size-3.5" /> Present (Attended)
            </span>
            <span className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {currentStats.attended}
            </span>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-2.5">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block flex items-center justify-center gap-1">
              <XCircle className="size-3.5" /> Absent (Missed)
            </span>
            <span className="font-display text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
              {currentStats.missed}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Total Held
            </span>
            <span className="font-display text-xl font-bold text-foreground mt-0.5 block">
              {currentStats.totalHeld}
            </span>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
            <span className="text-[11px] font-semibold text-primary block">Target Goal</span>
            <span className="font-display text-xl font-bold text-primary mt-0.5 block">
              {currentStats.target}%
            </span>
          </div>
        </div>

        {/* Safe / Warning / Required Banner */}
        <div className="rounded-xl p-3 text-xs border border-border/60 bg-muted/30">
          {currentStats.totalHeld === 0 ? (
            <p className="text-muted-foreground">No classes held yet for this subject.</p>
          ) : currentStats.consecutiveRequired > 0 ? (
            <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0" />
              Below target! You must attend the next {currentStats.consecutiveRequired} consecutive class(es) without missing any to reach {currentStats.target}%.
            </p>
          ) : currentStats.isTargetImpossible ? (
            <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0" />
              Target of 100% is no longer reachable because a class was missed.
            </p>
          ) : currentStats.maxMissable > 0 ? (
            <p className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              Safe! You can safely miss (bunk) up to {currentStats.maxMissable} more class(es) and remain at or above {currentStats.target}%.
            </p>
          ) : (
            <p className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0" />
              At boundary! If you miss your very next class, your attendance will drop below {currentStats.target}%.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Simulation Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Simulator 1: What if I miss / bunk classes? */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <XCircle className="size-4 text-rose-600" /> Bunk Simulator (What if I miss classes?)
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              If I miss the next:
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={bunkClasses}
                onChange={(e) => setBunkClasses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 text-center font-bold text-base h-10 rounded-xl bg-card"
              />
              <span className="text-xs font-semibold text-muted-foreground">class(es)</span>
            </div>
          </div>

          {bunkProjection && (
            <div className="rounded-xl border border-rose-500/30 bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Projected Attendance:</span>
                <span
                  className={cn(
                    'font-display font-bold text-base',
                    bunkProjection.isSafe
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {bunkProjection.projectedPercentage}%
                </span>
              </div>
              <Progress
                value={Math.min(100, bunkProjection.projectedPercentage)}
                className="h-2"
                indicatorClassName={bunkProjection.isSafe ? 'bg-emerald-500' : 'bg-rose-500'}
              />
              <p className="text-[11px] text-muted-foreground">
                Classes: {bunkProjection.projectedAttended} attended / {bunkProjection.projectedTotal} held
                (drop of {Math.abs(bunkProjection.difference)}%)
              </p>
              <div className="pt-1 font-semibold">
                {bunkProjection.isSafe ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ✓ Still Safe! You remain above your {currentStats.target}% target.
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    ⚠️ Warning: Attendance drops below {currentStats.target}%!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Simulator 2: What if I attend upcoming classes? */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <TrendingUp className="size-4 text-emerald-600" /> Recovery Simulator (What if I attend classes?)
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              If I attend the next:
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={attendClasses}
                onChange={(e) => setAttendClasses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 text-center font-bold text-base h-10 rounded-xl bg-card"
              />
              <span className="text-xs font-semibold text-muted-foreground">class(es)</span>
            </div>
          </div>

          {attendProjection && (
            <div className="rounded-xl border border-emerald-500/30 bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Projected Attendance:</span>
                <span
                  className={cn(
                    'font-display font-bold text-base',
                    attendProjection.isSafe
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {attendProjection.projectedPercentage}%
                </span>
              </div>
              <Progress
                value={Math.min(100, attendProjection.projectedPercentage)}
                className="h-2"
                indicatorClassName={attendProjection.isSafe ? 'bg-emerald-500' : 'bg-amber-500'}
              />
              <p className="text-[11px] text-muted-foreground">
                Classes: {attendProjection.projectedAttended} attended / {attendProjection.projectedTotal} held
                (gain of +{attendProjection.difference}%)
              </p>
              <div className="pt-1 font-semibold">
                {attendProjection.isSafe ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ✓ Goal Achieved! Your attendance will be at or above {currentStats.target}%.
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    Still below target ({currentStats.target}%). Needs more classes.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
