import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function Loader({ className, size = 'default' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    default: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={cn(
        'rounded-full border-[hsl(var(--primary))] border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse">
      <div className="h-4 bg-[hsl(var(--surface-strong))] rounded w-3/4 mb-3" />
      <div className="h-3 bg-[hsl(var(--surface-strong))] rounded w-1/2 mb-2" />
      <div className="h-10 bg-[hsl(var(--surface-strong))] rounded w-full mt-4" />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
