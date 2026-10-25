import { describe, expect, it } from 'vitest'
import {
  getCompletionPercentage,
  getTaskUrgencyScore,
  sortTasks,
  filterTasks,
  computePrepProgress,
} from './task-logic'
import type { Task } from '@/types'
import { Priority, TaskStatus, TaskType } from '@/types'
import { format, addDays, subDays } from 'date-fns'

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    userId: 'demo',
    createdAt: now,
    updatedAt: now,
    title: 'Test task',
    subjectId: 'sub-1',
    type: TaskType.Assignment,
    description: '',
    dueDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    priority: Priority.Medium,
    status: TaskStatus.NotStarted,
    tentative: false,
    tags: [],
    subtasks: [],
    notes: '',
    ...overrides,
  }
}

describe('getTaskUrgencyScore', () => {
  it('ranks urgent overdue higher than low future', () => {
    const overdue = makeTask({
      priority: Priority.Urgent,
      dueDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    })
    const later = makeTask({
      priority: Priority.Low,
      dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    })
    expect(getTaskUrgencyScore(overdue)).toBeGreaterThan(getTaskUrgencyScore(later))
  })

  it('gives completed tasks a very low score', () => {
    const done = makeTask({ status: TaskStatus.Completed })
    expect(getTaskUrgencyScore(done)).toBeLessThan(-100)
  })
})

describe('getCompletionPercentage', () => {
  it('returns 0 for empty', () => {
    expect(getCompletionPercentage([])).toBe(0)
  })

  it('computes percentage', () => {
    const tasks = [
      makeTask({ status: TaskStatus.Completed }),
      makeTask({ status: TaskStatus.NotStarted }),
      makeTask({ status: TaskStatus.Completed }),
      makeTask({ status: TaskStatus.InProgress }),
    ]
    expect(getCompletionPercentage(tasks)).toBe(50)
  })
})

describe('filterTasks and sortTasks', () => {
  it('filters by status', () => {
    const tasks = [
      makeTask({ status: TaskStatus.Completed }),
      makeTask({ status: TaskStatus.NotStarted }),
    ]
    const filtered = filterTasks(tasks, { status: [TaskStatus.Completed] })
    expect(filtered).toHaveLength(1)
  })

  it('sorts by priority', () => {
    const tasks = [
      makeTask({ priority: Priority.Low, title: 'low' }),
      makeTask({ priority: Priority.Urgent, title: 'urgent' }),
    ]
    const sorted = sortTasks(tasks, 'priority')
    expect(sorted[0].priority).toBe(Priority.Urgent)
  })
})

describe('computePrepProgress', () => {
  it('uses subtask completion when present', () => {
    const task = makeTask({
      subtasks: [
        { id: '1', title: 'a', completed: true },
        { id: '2', title: 'b', completed: false },
        { id: '3', title: 'c', completed: false },
        { id: '4', title: 'd', completed: true },
      ],
    })
    expect(computePrepProgress(task)).toBe(50)
  })

  it('returns 100 when completed', () => {
    expect(computePrepProgress(makeTask({ status: TaskStatus.Completed }))).toBe(100)
  })
})
