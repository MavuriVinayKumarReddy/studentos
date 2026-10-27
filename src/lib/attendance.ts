import type { AttendanceRecord, Subject } from '@/types'

export interface SubjectAttendanceStats {
  subjectId: string
  attended: number
  missed: number
  cancelled: number
  totalHeld: number
  percentage: number
  target: number
  isTargetMet: boolean
  consecutiveRequired: number
  isTargetImpossible: boolean
  maxMissable: number
  status: 'safe' | 'warning' | 'below'
}

export interface OverallAttendanceSummary {
  totalAttended: number
  totalHeld: number
  totalMissed: number
  totalCancelled: number
  percentage: number
  belowTargetSubjects: SubjectAttendanceStats[]
  warningSubjects: SubjectAttendanceStats[]
  allSubjectStats: SubjectAttendanceStats[]
}

/**
 * Calculates the smallest non-negative integer x such that
 * (attended + x) / (total + x) >= target / 100.
 */
export function calculateConsecutiveRequired(
  attended: number,
  totalHeld: number,
  targetPercentage: number,
): { needed: number; impossible: boolean } {
  if (targetPercentage <= 0) {
    return { needed: 0, impossible: false }
  }

  if (totalHeld === 0) {
    return { needed: 0, impossible: false }
  }

  const currentRatio = attended / totalHeld
  const targetRatio = targetPercentage / 100

  // Already meeting or exceeding target
  if (currentRatio >= targetRatio - 1e-9) {
    return { needed: 0, impossible: false }
  }

  // If target is 100% and at least 1 class was missed, you can never reach 100%
  const missed = totalHeld - attended
  if (targetPercentage >= 100) {
    if (missed > 0) {
      return { needed: 0, impossible: true }
    }
    return { needed: 0, impossible: false }
  }

  // Formula: (attended + x) / (total + x) >= T
  // attended + x >= T * total + T * x
  // x * (1 - T) >= T * total - attended
  // x >= (T * total - attended) / (1 - T)
  // x >= (target * total - 100 * attended) / (100 - target)
  const numerator = targetPercentage * totalHeld - 100 * attended
  const denominator = 100 - targetPercentage

  let x = Math.ceil((numerator - 1e-9) / denominator)
  if (x < 0) x = 0

  // Fine-tune against floating-point inaccuracies
  while ((attended + x) / (totalHeld + x) < targetRatio - 1e-9) {
    x++
  }

  return { needed: x, impossible: false }
}

/**
 * Calculates the largest non-negative integer x such that
 * attended / (total + x) >= target / 100.
 */
export function calculateMaxMissable(
  attended: number,
  totalHeld: number,
  targetPercentage: number,
): number {
  if (targetPercentage <= 0) {
    return Number.POSITIVE_INFINITY
  }

  if (totalHeld === 0 || attended === 0) {
    return 0
  }

  const currentRatio = attended / totalHeld
  const targetRatio = targetPercentage / 100

  // If already below target, you cannot miss any classes
  if (currentRatio < targetRatio - 1e-9) {
    return 0
  }

  // Formula: attended / (total + x) >= T
  // attended >= T * (total + x)
  // attended / T >= total + x
  // x <= (attended / T) - total
  // x <= (100 * attended / target) - total
  const rawX = (100 * attended) / targetPercentage - totalHeld
  let x = Math.floor(rawX + 1e-9)
  if (x < 0) x = 0

  // Fine-tune against floating-point inaccuracies
  while (x > 0 && attended / (totalHeld + x) < targetRatio - 1e-9) {
    x--
  }

  return x
}

/**
 * Computes detailed attendance stats for a subject given its records and configured target.
 */
export function computeSubjectAttendance(
  subjectId: string,
  records: AttendanceRecord[],
  configuredTarget = 75,
): SubjectAttendanceStats {
  const target = Math.min(100, Math.max(0, configuredTarget))
  const subjectRecords = records.filter((r) => r.subjectId === subjectId)

  let attended = 0
  let missed = 0
  let cancelled = 0

  for (const r of subjectRecords) {
    if (r.status === 'present') attended++
    else if (r.status === 'absent') missed++
    else if (r.status === 'cancelled') cancelled++
  }

  const totalHeld = attended + missed
  const percentage = totalHeld > 0 ? Math.round((attended / totalHeld) * 1000) / 10 : 0
  const isTargetMet = totalHeld === 0 ? true : percentage >= target - 1e-9

  const { needed: consecutiveRequired, impossible: isTargetImpossible } =
    calculateConsecutiveRequired(attended, totalHeld, target)

  const maxMissable = calculateMaxMissable(attended, totalHeld, target)

  let status: 'safe' | 'warning' | 'below' = 'safe'
  if (totalHeld > 0) {
    if (percentage < target - 1e-9) {
      status = 'below'
    } else if (maxMissable === 0) {
      // Met, but missing the next class drops below target
      status = 'warning'
    }
  }

  return {
    subjectId,
    attended,
    missed,
    cancelled,
    totalHeld,
    percentage,
    target,
    isTargetMet,
    consecutiveRequired,
    isTargetImpossible,
    maxMissable,
    status,
  }
}

/**
 * Computes overall attendance stats aggregated across all subjects.
 * Never averages percentages directly; always sums classes held and attended.
 */
export function computeOverallAttendance(
  subjects: Subject[],
  records: AttendanceRecord[],
): OverallAttendanceSummary {
  const activeSubjects = subjects.filter((s) => !s.archived)
  const allSubjectStats: SubjectAttendanceStats[] = activeSubjects.map((sub) =>
    computeSubjectAttendance(sub.id, records, sub.attendanceTarget ?? 75),
  )

  let totalAttended = 0
  let totalMissed = 0
  let totalCancelled = 0

  for (const stat of allSubjectStats) {
    totalAttended += stat.attended
    totalMissed += stat.missed
    totalCancelled += stat.cancelled
  }

  const totalHeld = totalAttended + totalMissed
  const percentage = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 1000) / 10 : 0

  const belowTargetSubjects = allSubjectStats.filter(
    (s) => s.totalHeld > 0 && s.status === 'below',
  )
  const warningSubjects = allSubjectStats.filter(
    (s) => s.totalHeld > 0 && s.status === 'warning',
  )

  return {
    totalAttended,
    totalHeld,
    totalMissed,
    totalCancelled,
    percentage,
    belowTargetSubjects,
    warningSubjects,
    allSubjectStats,
  }
}

/**
 * Projects attendance percentage and target status if a student attends `futurePresent`
 * and misses `futureAbsent` upcoming classes.
 */
export function projectAttendance(
  currentAttended: number,
  currentTotalHeld: number,
  futurePresent: number,
  futureAbsent: number,
  targetPercentage = 75,
): {
  projectedAttended: number
  projectedTotal: number
  projectedPercentage: number
  isSafe: boolean
  difference: number
} {
  const pPresent = Math.max(0, Math.floor(futurePresent))
  const pAbsent = Math.max(0, Math.floor(futureAbsent))

  const projectedAttended = currentAttended + pPresent
  const projectedTotal = currentTotalHeld + pPresent + pAbsent

  const projectedPercentage =
    projectedTotal > 0
      ? Math.round((projectedAttended / projectedTotal) * 1000) / 10
      : 0

  const currentPercentage =
    currentTotalHeld > 0
      ? Math.round((currentAttended / currentTotalHeld) * 1000) / 10
      : 0

  return {
    projectedAttended,
    projectedTotal,
    projectedPercentage,
    isSafe: projectedPercentage >= targetPercentage - 1e-9,
    difference: Math.round((projectedPercentage - currentPercentage) * 10) / 10,
  }
}

/**
 * Filters and aggregates attendance records for a specific date.
 */
export function getDailyAttendanceRecords(
  date: string,
  records: AttendanceRecord[],
): {
  records: AttendanceRecord[]
  presentCount: number
  absentCount: number
  cancelledCount: number
  totalHeld: number
} {
  const daily = records.filter((r) => r.date === date)
  let presentCount = 0
  let absentCount = 0
  let cancelledCount = 0

  for (const r of daily) {
    if (r.status === 'present') presentCount++
    else if (r.status === 'absent') absentCount++
    else if (r.status === 'cancelled') cancelledCount++
  }

  return {
    records: daily,
    presentCount,
    absentCount,
    cancelledCount,
    totalHeld: presentCount + absentCount,
  }
}

