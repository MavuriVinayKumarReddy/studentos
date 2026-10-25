import {
  combineLocalDateTime,
  countStreakDays,
  getWeekDateKeys,
  getWeekStart,
  isDueSoon,
  isOverdue,
  toLocalDateString,
} from '@/lib/dates'
import type {
  Priority,
  Task,
  TaskFilters,
  TaskSortBy,
  TaskStatus,
} from '@/types'
import { Priority as PriorityEnum, TaskStatus as StatusEnum } from '@/types'

const PRIORITY_WEIGHT: Record<Priority, number> = {
  Urgent: 100,
  High: 70,
  Medium: 40,
  Low: 15,
}

const STATUS_PENALTY: Record<TaskStatus, number> = {
  'Not Started': 0,
  'In Progress': -5,
  Completed: -1000,
}

/**
 * Higher score = should appear sooner in Focus Now.
 * Factors: priority, proximity to due, overdue boost, tentative dampening.
 */
export function getTaskUrgencyScore(
  task: Task,
  now: Date = new Date(),
): number {
  if (task.status === StatusEnum.Completed) return -10_000

  let score = PRIORITY_WEIGHT[task.priority] ?? 20
  score += STATUS_PENALTY[task.status] ?? 0

  const due = combineLocalDateTime(task.dueDate, task.dueTime)
  const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (Number.isNaN(hoursUntil)) {
    score += 0
  } else if (hoursUntil < 0) {
    // Overdue: escalate with days late
    const hoursLate = Math.abs(hoursUntil)
    score += 80 + Math.min(120, hoursLate / 2)
  } else if (hoursUntil <= 3) {
    score += 90
  } else if (hoursUntil <= 24) {
    score += 60
  } else if (hoursUntil <= 72) {
    score += 35
  } else if (hoursUntil <= 168) {
    score += 15
  } else {
    score += Math.max(0, 10 - hoursUntil / 168)
  }

  if (task.tentative) score -= 25
  if (task.type === 'Exam') score += 20
  if (task.type === 'Quiz') score += 10
  if (task.estimatedMinutes && task.estimatedMinutes > 120) score += 5

  const incompleteSubtasks = task.subtasks.filter((s) => !s.completed).length
  if (incompleteSubtasks > 0) score += Math.min(15, incompleteSubtasks * 2)

  return Math.round(score * 10) / 10
}

export function getCompletionPercentage(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const done = tasks.filter((t) => t.status === StatusEnum.Completed).length
  return Math.round((done / tasks.length) * 100)
}

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value : [value]
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const statuses = asArray(filters.status)
  const priorities = asArray(filters.priority)
  const types = asArray(filters.type)
  const search = filters.search?.trim().toLowerCase()

  return tasks.filter((task) => {
    if (!filters.includeCompleted && task.status === StatusEnum.Completed) {
      if (!statuses?.includes(StatusEnum.Completed)) return false
    }

    if (statuses && !statuses.includes(task.status)) return false
    if (priorities && !priorities.includes(task.priority)) return false
    if (types && !types.includes(task.type)) return false

    if (filters.subjectId !== undefined) {
      if (task.subjectId !== filters.subjectId) return false
    }

    if (filters.tentative !== undefined && task.tentative !== filters.tentative) {
      return false
    }

    if (filters.overdueOnly && !isOverdue(task.dueDate, task.dueTime)) {
      return false
    }

    if (filters.dueBefore && task.dueDate > filters.dueBefore) return false
    if (filters.dueAfter && task.dueDate < filters.dueAfter) return false

    if (filters.tags && filters.tags.length > 0) {
      const hasAll = filters.tags.every((tag) => task.tags.includes(tag))
      if (!hasAll) return false
    }

    if (search) {
      const haystack = [
        task.title,
        task.description ?? '',
        task.notes ?? '',
        ...task.tags,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }

    return true
  })
}

export function sortTasks(
  tasks: Task[],
  sortBy: TaskSortBy = 'urgency',
  now: Date = new Date(),
): Task[] {
  const copy = [...tasks]

  const priorityRank: Record<Priority, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  }

  const statusRank: Record<TaskStatus, number> = {
    'In Progress': 0,
    'Not Started': 1,
    Completed: 2,
  }

  copy.sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return (
          priorityRank[a.priority] - priorityRank[b.priority] ||
          a.dueDate.localeCompare(b.dueDate)
        )
      case 'dueDate': {
        const da = combineLocalDateTime(a.dueDate, a.dueTime).getTime()
        const db = combineLocalDateTime(b.dueDate, b.dueTime).getTime()
        return da - db
      }
      case 'title':
        return a.title.localeCompare(b.title)
      case 'createdAt':
        return b.createdAt.localeCompare(a.createdAt)
      case 'status':
        return statusRank[a.status] - statusRank[b.status]
      case 'urgency':
      default:
        return getTaskUrgencyScore(b, now) - getTaskUrgencyScore(a, now)
    }
  })

  return copy
}

/** Compute consecutive-day study/completion streak from ISO date keys. */
export function computeStreak(
  completedDates: string[],
  today: Date = new Date(),
): number {
  const keys = completedDates.map((d) =>
    d.length > 10 ? toLocalDateString(new Date(d)) : d,
  )
  return countStreakDays(keys, today)
}

export interface WeeklyStats {
  weekStart: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  overdueCount: number
  dueSoonCount: number
  byPriority: Record<Priority, number>
  byStatus: Record<TaskStatus, number>
  estimatedMinutesRemaining: number
  activeDays: number
}

export function computeWeeklyStats(
  tasks: Task[],
  now: Date = new Date(),
  weekStartsOn: 0 | 1 = 1,
): WeeklyStats {
  const weekKeys = new Set(getWeekDateKeys(now, weekStartsOn))
  const weekStart = toLocalDateString(getWeekStart(now, weekStartsOn))

  const weekTasks = tasks.filter((t) => weekKeys.has(t.dueDate))

  const byPriority: Record<Priority, number> = {
    Low: 0,
    Medium: 0,
    High: 0,
    Urgent: 0,
  }
  const byStatus: Record<TaskStatus, number> = {
    'Not Started': 0,
    'In Progress': 0,
    Completed: 0,
  }

  let completedTasks = 0
  let overdueCount = 0
  let dueSoonCount = 0
  let estimatedMinutesRemaining = 0
  const activeDaySet = new Set<string>()

  for (const task of weekTasks) {
    byPriority[task.priority] += 1
    byStatus[task.status] += 1

    if (task.status === StatusEnum.Completed) {
      completedTasks += 1
      if (task.completedAt) {
        activeDaySet.add(toLocalDateString(new Date(task.completedAt)))
      }
    } else {
      if (isOverdue(task.dueDate, task.dueTime, now)) overdueCount += 1
      else if (isDueSoon(task.dueDate, task.dueTime, 3, now)) dueSoonCount += 1
      estimatedMinutesRemaining += task.estimatedMinutes ?? 0
    }
  }

  const totalTasks = weekTasks.length
  return {
    weekStart,
    totalTasks,
    completedTasks,
    completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    overdueCount,
    dueSoonCount,
    byPriority,
    byStatus,
    estimatedMinutesRemaining,
    activeDays: activeDaySet.size,
  }
}

export function getFocusNowTasks(
  tasks: Task[],
  limit = 5,
  now: Date = new Date(),
): Task[] {
  const open = tasks.filter((t) => t.status !== StatusEnum.Completed)
  return sortTasks(open, 'urgency', now).slice(0, limit)
}

export function isHighPriority(priority: Priority): boolean {
  return priority === PriorityEnum.High || priority === PriorityEnum.Urgent
}

/** Prep progress 0–100 from subtasks, or status fallback. */
export function computePrepProgress(task: Task): number {
  if (task.status === StatusEnum.Completed) return 100
  if (task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.completed).length
    return Math.round((done / task.subtasks.length) * 100)
  }
  if (task.status === StatusEnum.InProgress) return 40
  return 0
}
