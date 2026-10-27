import { describe, expect, it } from 'vitest'

describe('Display Name handling', () => {
  it('correctly trims whitespace and handles empty strings with default fallback', () => {
    const cleanName = (input: string | undefined | null) => (input?.trim() || 'Student')

    expect(cleanName('   ')).toBe('Student')
    expect(cleanName('')).toBe('Student')
    expect(cleanName(null)).toBe('Student')
    expect(cleanName(undefined)).toBe('Student')
    expect(cleanName('  Alex Student  ')).toBe('Alex Student')
    expect(cleanName('Jane')).toBe('Jane')
  })

  it('extracts first name correctly for personalized greetings', () => {
    const getFirstName = (fullName: string) => fullName.split(' ')[0] || fullName

    expect(getFirstName('Alex Student')).toBe('Alex')
    expect(getFirstName('Priya')).toBe('Priya')
    expect(getFirstName('John Doe Smith')).toBe('John')
  })
})
