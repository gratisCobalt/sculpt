import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button.className).toContain('destructive')
    
    rerender(<Button variant="outline">Outline</Button>)
    const outlineButton = screen.getByRole('button', { name: /outline/i })
    expect(outlineButton).toHaveClass('border')
  })

  it('applies size classes correctly', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button', { name: /large/i })
    // Large size uses h-14 in this implementation
    expect(button).toHaveClass('h-14')
  })

  it('passes through additional props', () => {
    render(<Button disabled data-testid="test-button">Disabled</Button>)
    const button = screen.getByTestId('test-button')
    expect(button).toBeDisabled()
  })
})
