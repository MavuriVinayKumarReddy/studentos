import { describe, expect, it } from 'vitest'
import {
  calculateConsecutiveRequired,
  calculateMaxMissable,
  computeOverallAttendance,
  computeSubjectAttendance,
  projectAttendance,
  getDailyAttendanceRecords,
} from './attendance'
import type { AttendanceRecord, Subject } from '@/types'

describe('calculateConsecutiveRequired', () => {
  it('returns 0 when target is already met', () => {
    // 8 attended out of 10 = 80%, target 75%
    expect(calculateConsecutiveRequired(8, 10, 75)).toEqual({
      needed: 0,
      impossible: false,
    })
    // exactly 75% (3 out of 4)
    expect(calculateConsecutiveRequired(3, 4, 75)).toEqual({
      needed: 0,
      impossible: false,
    })
  })

  it('calculates correct classes needed when below target', () => {
    // 7 attended out of 10 = 70%, target 75%
    // (7 + 2) / (10 + 2) = 9/12 = 75%
    expect(calculateConsecutiveRequired(7, 10, 75)).toEqual({
      needed: 2,
      impossible: false,
    })

    // 0 attended out of 2 = 0%, target 50%
    // (0 + 2) / (2 + 2) = 2/4 = 50%
    expect(calculateConsecutiveRequired(0, 2, 50)).toEqual({
      needed: 2,
      impossible: false,
    })

    // 1 attended out of 4 = 25%, target 75%
    // (1 + x) / (4 + x) >= 0.75 => 1 + x >= 3 + 0.75x => 0.25x >= 2 => x >= 8
    // Check: (1 + 8) / (4 + 8) = 9/12 = 75%
    expect(calculateConsecutiveRequired(1, 4, 75)).toEqual({
      needed: 8,
      impossible: false,
    })
  })

  it('handles edge case: 0 total held', () => {
    expect(calculateConsecutiveRequired(0, 0, 75)).toEqual({
      needed: 0,
      impossible: false,
    })
  })

  it('handles edge case: target is 0%', () => {
    expect(calculateConsecutiveRequired(0, 5, 0)).toEqual({
      needed: 0,
      impossible: false,
    })
  })

  it('handles impossible 100% target when classes are missed', () => {
    // 9 out of 10 attended, target 100%
    expect(calculateConsecutiveRequired(9, 10, 100)).toEqual({
      needed: 0,
      impossible: true,
    })
  })

  it('handles achievable 100% target when 0 classes missed', () => {
    expect(calculateConsecutiveRequired(5, 5, 100)).toEqual({
      needed: 0,
      impossible: false,
    })
  })
})

describe('calculateMaxMissable', () => {
  it('returns 0 when already below target', () => {
    // 7 out of 10 = 70%, target 75%
    expect(calculateMaxMissable(7, 10, 75)).toBe(0)
  })

  it('calculates largest integer x such that attended / (total + x) >= target', () => {
    // 8 out of 10 = 80%, target 75%
    // 8 / (10 + 0) = 80% >= 75%
    // 8 / (10 + 1) = 72.7% < 75%
    // So can miss 0 additional classes
    expect(calculateMaxMissable(8, 10, 75)).toBe(0)

    // 9 out of 10 = 90%, target 75%
    // 9 / (10 + 1) = 9/11 = 81.8% >= 75%
    // 9 / (10 + 2) = 9/12 = 75% >= 75%
    // 9 / (10 + 3) = 9/13 = 69.2% < 75%
    // So can miss 2 classes
    expect(calculateMaxMissable(9, 10, 75)).toBe(2)

    // 10 out of 10 = 100%, target 75%
    // 10 / (10 + 3) = 10/13 = 76.9% >= 75%
    // 10 / (10 + 4) = 10/14 = 71.4% < 75%
    // So can miss 3 classes
    expect(calculateMaxMissable(10, 10, 75)).toBe(3)
  })

  it('handles 0 total held or 0 attended', () => {
    expect(calculateMaxMissable(0, 0, 75)).toBe(0)
    expect(calculateMaxMissable(0, 5, 75)).toBe(0)
  })

  it('handles 0% target', () => {
    expect(calculateMaxMissable(5, 10, 0)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('computeSubjectAttendance', () => {
  it('does not count cancelled classes toward total classes held', () => {
    const records: AttendanceRecord[] = [
      {
        id: '1',
        userId: 'u1',
        subjectId: 'sub1',
        date: '2026-10-01',
        status: 'present',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        userId: 'u1',
        subjectId: 'sub1',
        date: '2026-10-02',
        status: 'absent',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        userId: 'u1',
        subjectId: 'sub1',
        date: '2026-10-03',
        status: 'cancelled',
        createdAt: '',
        updatedAt: '',
      },
    ]

    const stats = computeSubjectAttendance('sub1', records, 75)
    expect(stats.attended).toBe(1)
    expect(stats.missed).toBe(1)
    expect(stats.cancelled).toBe(1)
    expect(stats.totalHeld).toBe(2) // 1 present + 1 absent; cancelled excluded
    expect(stats.percentage).toBe(50)
    expect(stats.status).toBe('below')
  })
})

describe('computeOverallAttendance', () => {
  it('aggregates total attended and total held without misleading percentage averaging', () => {
    // Subject A: 10 held, 10 attended (100%)
    // Subject B: 90 held, 45 attended (50%)
    // Misleading average of percentages: (100 + 50) / 2 = 75%
    // Correct aggregate: (10 + 45) / (10 + 90) = 55 / 100 = 55%
    const subA: Subject = {
      id: 'subA',
      userId: 'u1',
      name: 'Sub A',
      colorId: 'c1',
      colorFrom: '#000',
      colorTo: '#111',
      attendanceTarget: 75,
      createdAt: '',
      updatedAt: '',
    }
    const subB: Subject = {
      id: 'subB',
      userId: 'u1',
      name: 'Sub B',
      colorId: 'c2',
      colorFrom: '#000',
      colorTo: '#111',
      attendanceTarget: 75,
      createdAt: '',
      updatedAt: '',
    }

    const records: AttendanceRecord[] = []
    // 10 presents for subA
    for (let i = 0; i < 10; i++) {
      records.push({
        id: `a-${i}`,
        userId: 'u1',
        subjectId: 'subA',
        date: '2026-10-01',
        status: 'present',
        createdAt: '',
        updatedAt: '',
      })
    }
    // 45 presents, 45 absents for subB
    for (let i = 0; i < 45; i++) {
      records.push({
        id: `b-p-${i}`,
        userId: 'u1',
        subjectId: 'subB',
        date: '2026-10-01',
        status: 'present',
        createdAt: '',
        updatedAt: '',
      })
      records.push({
        id: `b-a-${i}`,
        userId: 'u1',
        subjectId: 'subB',
        date: '2026-10-01',
        status: 'absent',
        createdAt: '',
        updatedAt: '',
      })
    }

    const summary = computeOverallAttendance([subA, subB], records)
    expect(summary.totalAttended).toBe(55)
    expect(summary.totalHeld).toBe(100)
    expect(summary.percentage).toBe(55) // NOT 75%!
  })

  describe('projectAttendance (What-If calculator)', () => {
    it('accurately projects attendance when bunking/missing classes', () => {
      // currently 8 attended out of 10 (80%). If miss 2 more classes:
      // projected: 8 attended / 12 held = 66.7%, target 75% -> not safe
      const res = projectAttendance(8, 10, 0, 2, 75)
      expect(res.projectedAttended).toBe(8)
      expect(res.projectedTotal).toBe(12)
      expect(res.projectedPercentage).toBe(66.7)
      expect(res.isSafe).toBe(false)
      expect(res.difference).toBe(-13.3)
    })

    it('accurately projects attendance when attending upcoming classes', () => {
      // currently 7 attended out of 10 (70%). If attend 2 more classes:
      // projected: 9 attended / 12 held = 75.0% -> safe!
      const res = projectAttendance(7, 10, 2, 0, 75)
      expect(res.projectedAttended).toBe(9)
      expect(res.projectedTotal).toBe(12)
      expect(res.projectedPercentage).toBe(75)
      expect(res.isSafe).toBe(true)
      expect(res.difference).toBe(5)
    })
  })

  describe('getDailyAttendanceRecords', () => {
    it('aggregates present and absent counts for a specific date', () => {
      const records: AttendanceRecord[] = [
        { id: '1', userId: 'u1', subjectId: 's1', date: '2026-10-27', status: 'present', createdAt: '', updatedAt: '' },
        { id: '2', userId: 'u1', subjectId: 's2', date: '2026-10-27', status: 'absent', createdAt: '', updatedAt: '' },
        { id: '3', userId: 'u1', subjectId: 's3', date: '2026-10-27', status: 'cancelled', createdAt: '', updatedAt: '' },
        { id: '4', userId: 'u1', subjectId: 's1', date: '2026-10-28', status: 'present', createdAt: '', updatedAt: '' },
      ]

      const daily = getDailyAttendanceRecords('2026-10-27', records)
      expect(daily.presentCount).toBe(1)
      expect(daily.absentCount).toBe(1)
      expect(daily.cancelledCount).toBe(1)
      expect(daily.totalHeld).toBe(2)
      expect(daily.records.length).toBe(3)
    })
  })
})
