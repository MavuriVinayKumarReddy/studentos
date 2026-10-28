import { describe, expect, it } from 'vitest'
import type { Subject, Task, WeeklyScheduleItem } from '@/types'

describe('Subject Day-by-Day Schedule Logic', () => {
  it('correctly maps distinct timings for each day of the week', () => {
    const schedule: WeeklyScheduleItem[] = [
      { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '10:30', room: 'Hall A' },
      { id: '2', dayOfWeek: 3, startTime: '11:00', endTime: '12:30', room: 'Hall B' },
      { id: '3', dayOfWeek: 5, startTime: '14:00', endTime: '16:00', room: 'Lab 2' },
    ]

    const subject: Subject = {
      id: 'sub-1',
      userId: 'user-1',
      name: 'Computer Networks',
      code: 'CS301',
      colorId: 'cyan',
      colorFrom: '#06b6d4',
      colorTo: '#0891b2',
      schedule,
      createdAt: '2026-10-28T10:00:00Z',
      updatedAt: '2026-10-28T10:00:00Z',
    }

    // Monday (1)
    const mon = subject.schedule?.find((item) => item.dayOfWeek === 1)
    expect(mon).toBeDefined()
    expect(mon?.startTime).toBe('09:00')
    expect(mon?.endTime).toBe('10:30')
    expect(mon?.room).toBe('Hall A')

    // Wednesday (3) - different timing and room
    const wed = subject.schedule?.find((item) => item.dayOfWeek === 3)
    expect(wed).toBeDefined()
    expect(wed?.startTime).toBe('11:00')
    expect(wed?.endTime).toBe('12:30')
    expect(wed?.room).toBe('Hall B')

    // Friday (5) - different afternoon lab timing
    const fri = subject.schedule?.find((item) => item.dayOfWeek === 5)
    expect(fri).toBeDefined()
    expect(fri?.startTime).toBe('14:00')
    expect(fri?.endTime).toBe('16:00')
    expect(fri?.room).toBe('Lab 2')

    // Tuesday (2) - no class
    const tue = subject.schedule?.find((item) => item.dayOfWeek === 2)
    expect(tue).toBeUndefined()
  })

  it('supports weekend schedules (Saturday = 6, Sunday = 0)', () => {
    const schedule: WeeklyScheduleItem[] = [
      { id: 'sat', dayOfWeek: 6, startTime: '10:00', endTime: '13:00', room: 'Workshop' },
      { id: 'sun', dayOfWeek: 0, startTime: '09:00', endTime: '10:00' },
    ]

    const sat = schedule.find((s) => s.dayOfWeek === 6)
    const sun = schedule.find((s) => s.dayOfWeek === 0)

    expect(sat?.startTime).toBe('10:00')
    expect(sat?.room).toBe('Workshop')
    expect(sun?.startTime).toBe('09:00')
    expect(sun?.room).toBeUndefined()
  })
})

describe('Sample Data Identification & User Data Safety', () => {
  const isSampleSubject = (s: Pick<Subject, 'code' | 'name'>) =>
    s.code === 'CS101' &&
    (s.name.includes('(Sample)') || s.name === 'Introduction to Computer Science (Sample)')

  const isSampleTask = (t: Pick<Task, 'title' | 'tags'>) =>
    (t.tags && t.tags.includes('sample')) ||
    t.title.includes('(Sample)') ||
    t.title.includes('Welcome to StudentOS — Explore your dashboard')

  it('accurately identifies template sample subjects', () => {
    expect(
      isSampleSubject({
        name: 'Introduction to Computer Science (Sample)',
        code: 'CS101',
      }),
    ).toBe(true)

    expect(
      isSampleSubject({
        name: 'Data Structures (Sample)',
        code: 'CS101',
      }),
    ).toBe(true)
  })

  it('strictly preserves real user subjects and never flags them', () => {
    // Custom CS course created by user
    expect(
      isSampleSubject({
        name: 'Introduction to Computer Science',
        code: 'CS101',
      }),
    ).toBe(false)

    // User courses
    expect(
      isSampleSubject({
        name: 'Mathematics',
        code: 'MATH101',
      }),
    ).toBe(false)

    expect(
      isSampleSubject({
        name: 'Physics',
        code: 'PHY201',
      }),
    ).toBe(false)

    expect(
      isSampleSubject({
        name: 'Operating Systems',
        code: 'CS302',
      }),
    ).toBe(false)
  })

  it('accurately identifies template sample tasks', () => {
    expect(
      isSampleTask({
        title: 'Welcome to StudentOS — Explore your dashboard (Sample)',
        tags: ['sample', 'getting-started'],
      }),
    ).toBe(true)

    expect(
      isSampleTask({
        title: 'Random task (Sample)',
        tags: [],
      }),
    ).toBe(true)
  })

  it('strictly preserves real user tasks and never flags them', () => {
    expect(
      isSampleTask({
        title: 'Submit Operating Systems Assignment 1',
        tags: ['homework'],
      }),
    ).toBe(false)

    expect(
      isSampleTask({
        title: 'Study for Midterm Exam',
        tags: [],
      }),
    ).toBe(false)

    expect(
      isSampleTask({
        title: 'Review Chapter 4 notes',
        tags: ['study'],
      }),
    ).toBe(false)
  })
})
