import {
  addDays,
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isValid,
  isYesterday,
  parse,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns'

import { DUE_SOON_DAYS } from '@/lib/constants'

/** Combine a local YYYY-MM-DD date with optional HH:mm into a Date. */
export function combineLocalDateTime(
  dueDate: string,
  dueTime?: string,
): Date {
  if (dueTime) {
    const parsed = parse(`${dueDate} ${dueTime}`, 'yyyy-MM-dd HH:mm', new Date())
    if (isValid(parsed)) return parsed
  }
  // End of local day when no time specified
  const day = parse(dueDate, 'yyyy-MM-dd', new Date())
  if (!isValid(day)) return new Date(NaN)
  day.setHours(23, 59, 59, 999)
  return day
}

export function startOfLocalDay(date: Date = new Date()): Date {
  return startOfDay(date)
}

export function formatLocalDate(
  date: Date | string,
  pattern = 'MMM d, yyyy',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, pattern)
}

export function formatLocalTime(
  date: Date | string,
  pattern = 'h:mm a',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, pattern)
}

export function formatLocalDateTime(
  date: Date | string,
  pattern = 'MMM d, yyyy · h:mm a',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, pattern)
}

export function toLocalDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function toLocalTimeString(date: Date = new Date()): string {
  return format(date, 'HH:mm')
}

/**
 * Human countdown relative to now.
 * Examples: "Due in 2 days", "Due tomorrow", "Due in 3 hours", "Overdue by 1 day"
 */
export function formatDueCountdown(
  dueDate: string,
  dueTime?: string,
  now: Date = new Date(),
): string {
  const due = combineLocalDateTime(dueDate, dueTime)
  if (!isValid(due)) return 'No due date'

  const ms = due.getTime() - now.getTime()

  if (ms < 0) {
    const absMinutes = differenceInMinutes(now, due)
    if (absMinutes < 60) {
      const m = Math.max(1, absMinutes)
      return `Overdue by ${m} minute${m === 1 ? '' : 's'}`
    }
    const absHours = differenceInHours(now, due)
    if (absHours < 24) {
      return `Overdue by ${absHours} hour${absHours === 1 ? '' : 's'}`
    }
    const absDays = differenceInCalendarDays(now, due)
    if (absDays === 1) return 'Overdue by 1 day'
    return `Overdue by ${absDays} days`
  }

  const minutes = differenceInMinutes(due, now)
  if (minutes < 60) {
    const m = Math.max(1, minutes)
    return `Due in ${m} minute${m === 1 ? '' : 's'}`
  }

  const hours = differenceInHours(due, now)
  if (hours < 24 && isToday(due)) {
    return `Due in ${hours} hour${hours === 1 ? '' : 's'}`
  }

  if (isTomorrow(due) || differenceInCalendarDays(due, now) === 1) {
    return 'Due tomorrow'
  }

  const days = differenceInCalendarDays(due, now)
  if (days <= 0 && hours < 48) {
    return `Due in ${Math.max(1, hours)} hour${hours === 1 ? '' : 's'}`
  }

  return `Due in ${days} days`
}

export function isOverdue(
  dueDate: string,
  dueTime?: string,
  now: Date = new Date(),
): boolean {
  const due = combineLocalDateTime(dueDate, dueTime)
  if (!isValid(due)) return false
  return due.getTime() < now.getTime()
}

export function isDueToday(dueDate: string, now: Date = new Date()): boolean {
  const day = parse(dueDate, 'yyyy-MM-dd', new Date())
  if (!isValid(day)) return false
  return isSameDay(day, now)
}

export function isDueSoon(
  dueDate: string,
  dueTime?: string,
  withinDays = DUE_SOON_DAYS,
  now: Date = new Date(),
): boolean {
  const due = combineLocalDateTime(dueDate, dueTime)
  if (!isValid(due)) return false
  if (due.getTime() < now.getTime()) return false
  const days = differenceInCalendarDays(due, now)
  return days <= withinDays
}

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function getWeekStart(
  date: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): Date {
  return startOfWeek(date, { weekStartsOn })
}

export function getWeekEnd(
  date: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): Date {
  return endOfWeek(date, { weekStartsOn })
}

export function getWeekDateKeys(
  date: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): string[] {
  const start = getWeekStart(date, weekStartsOn)
  return Array.from({ length: 7 }, (_, i) => toLocalDateString(addDays(start, i)))
}

/** Consecutive completed calendar days ending today or yesterday. */
export function countStreakDays(
  completedDateKeys: string[],
  today: Date = new Date(),
): number {
  const set = new Set(completedDateKeys)
  let cursor = startOfLocalDay(today)
  // Allow streak to continue if last activity was yesterday
  if (!set.has(toLocalDateString(cursor))) {
    cursor = subDays(cursor, 1)
    if (!set.has(toLocalDateString(cursor))) return 0
  }

  let streak = 0
  while (set.has(toLocalDateString(cursor))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }
  return streak
}

export function isSameLocalDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === 'string' ? parseISO(a) : a
  const db = typeof b === 'string' ? parseISO(b) : b
  if (!isValid(da) || !isValid(db)) return false
  return isSameDay(da, db)
}

export function relativeDayLabel(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'
  return formatLocalDate(d, 'EEE, MMM d')
}
