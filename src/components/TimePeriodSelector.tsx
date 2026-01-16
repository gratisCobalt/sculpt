import { cn } from '@/lib/utils'

type TimePeriod = '7d' | '30d' | 'all'

interface TimePeriodSelectorProps {
  value: TimePeriod
  onChange: (value: TimePeriod) => void
}

const options: Array<{ value: TimePeriod; label: string }> = [
  { value: '7d', label: '7T' },
  { value: '30d', label: '30T' },
  { value: 'all', label: 'Alle' },
]

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[hsl(var(--surface-soft))]">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
            value === option.value
              ? 'bg-[hsl(var(--surface-strong))] text-[hsl(var(--foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
