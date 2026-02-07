import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isFalse = false
    const isTrue = true
    expect(cn('foo', isFalse && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', isTrue && 'bar', 'baz')).toBe('foo bar baz')
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
