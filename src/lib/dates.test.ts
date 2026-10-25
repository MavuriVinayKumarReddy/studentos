import { describe, expect, it } from 'vitest'
import {
  combineLocalDateTime,
  formatDueCountdown,
  getGreeting,
  isDueSoon,
  isDueToday,
  isOverdue,
  toLocalDateString,
} from './dates'
import { format, addDays, subDays, addHours } from 'date-fns'

describe('combineLocalDateTime', () => {
  it('uses end of day when no time given', () => {
    const d = combineLocalDateTime('2026-03-14')
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
  })

  it('parses explicit time', () => {
    const d = combineLocalDateTime('2026-03-14', '09:30')
    expect(d.getHours()).toBe(9)
    expect(d.getMinutes()).toBe(30)
  })
})

describe('formatDueCountdown', () => {
  it('describes tomorrow', () => {
    const tomorrow = toLocalDateString(addDays(new Date(), 1))
    const text = formatDueCountdown(tomorrow)
    expect(text.toLowerCase()).toMatch(/tomorrow|1 day/)
  })

  it('describes overdue', () => {
    const past = toLocalDateString(subDays(new Date(), 2))
    const text = formatDueCountdown(past)
    expect(text.toLowerCase()).toContain('overdue')
  })

  it('describes hours when due soon with time', () => {
    const soon = addHours(new Date(), 3)
    const date = format(soon, 'yyyy-MM-dd')
    const time = format(soon, 'HH:mm')
    const text = formatDueCountdown(date, time)
    expect(text.toLowerCase()).toMatch(/hour|due/)
  })
})

describe('status helpers', () => {
  it('detects today', () => {
    expect(isDueToday(toLocalDateString(new Date()))).toBe(true)
  })

  it('detects overdue incomplete', () => {
    const past = toLocalDateString(subDays(new Date(), 1))
    expect(isOverdue(past)).toBe(true)
  })

  it('detects due soon', () => {
    const soon = toLocalDateString(addDays(new Date(), 2))
    expect(isDueSoon(soon)).toBe(true)
  })
})

describe('getGreeting', () => {
  it('returns a greeting string', () => {
    const g = getGreeting()
    expect(g).toMatch(/Good (morning|afternoon|evening|night)/i)
  })
})
