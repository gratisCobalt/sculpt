import { describe, it, expect } from 'vitest'
import { cn, getFirstName, getFirstNameAvatarUrl } from './utils'

describe('cn utility function', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const falseCondition = false as boolean
    const trueCondition = true as boolean
    expect(cn('foo', falseCondition && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', trueCondition && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should handle object syntax', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
  })
})

describe('privacy-safe display names', () => {
  it('returns only the first name and removes attached emoji', () => {
    expect(getFirstName('  Anna Beispiel  ')).toBe('Anna')
    expect(getFirstName('Anna💪 Beispiel')).toBe('Anna')
    expect(getFirstName('Anna🇩🇪 Beispiel')).toBe('Anna')
    expect(getFirstName('Anna1️⃣ Beispiel')).toBe('Anna')
  })

  it('uses a safe fallback for empty names', () => {
    expect(getFirstName('   ')).toBe('Buddy')
  })

  it('limits generated avatar initials to the first name', () => {
    const avatarUrl = getFirstNameAvatarUrl(
      'https://ui-avatars.com/api/?name=Anna+Beispiel&background=111827',
      'Anna Beispiel'
    )

    expect(avatarUrl).toContain('name=Anna')
    expect(avatarUrl).not.toContain('Beispiel')
  })

  it('does not change uploaded avatar URLs', () => {
    expect(getFirstNameAvatarUrl('https://cdn.example.com/avatars/123.png', 'Anna Beispiel'))
      .toBe('https://cdn.example.com/avatars/123.png')
  })
})
