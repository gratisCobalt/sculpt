import { Card, CardContent } from '@/components/ui/card'
import { Trophy, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseHistory {
  weight: number
  reps?: number
  date: string
}

interface MachineProgressCardProps {
  name: string
  exerciseId?: number
  lastWeight: number
  lastReps: number
  history: ExerciseHistory[]
  isPR?: boolean
  imageUrl?: string
  onClick?: () => void
}

export function MachineProgressCard({
  name,
  exerciseId,
  lastWeight,
  lastReps,
  history,
  isPR = false,
  imageUrl,
  onClick,
}: MachineProgressCardProps) {
  // Calculate mini chart data (last 7 entries)
  const chartData = history.slice(0, 7).reverse()
  const maxWeight = Math.max(...chartData.map((d) => d.weight), 1)
  const minWeight = Math.min(...chartData.map((d) => d.weight), 0)
  const range = maxWeight - minWeight || 1

  // Calculate reps data if available
  const hasReps = chartData.some((d) => d.reps !== undefined)
  const maxReps = hasReps ? Math.max(...chartData.map((d) => d.reps || 0), 1) : 0
  const minReps = hasReps ? Math.min(...chartData.filter((d) => d.reps).map((d) => d.reps!), 0) : 0
  const repsRange = maxReps - minReps || 1

  // Generate unique gradient ID for fade effect
  const gradientId = `chartFade-${exerciseId || name.replace(/\s/g, '')}`

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 active:scale-[0.98] hover:bg-[hsl(var(--surface-soft))]',
        isPR && 'ring-1 ring-[hsl(var(--primary))]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Exercise Image */}
          {imageUrl && (
            <div className="w-14 h-14 rounded-lg bg-[hsl(var(--surface-strong))] overflow-hidden flex-shrink-0">
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-semibold truncate">{name}</h3>
                {isPR && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-xs font-medium flex-shrink-0">
                    <Trophy className="w-3 h-3" />
                    PR
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
            </div>

            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              {lastWeight} kg × {lastReps} Wdh.
            </p>

            {/* Dual-Line Progress Chart - No dots, CI colors, fade effect */}
            {chartData.length > 1 && (
              <div className="w-full h-12 relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {/* Gradient definition for fade effect */}
                  <defs>
                    <linearGradient id={`${gradientId}-primary`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id={`${gradientId}-accent`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
                    </linearGradient>
                    <mask id={`${gradientId}-mask`}>
                      <rect x="0" y="0" width="100" height="50" fill="url(#fadeGradient)" />
                    </mask>
                    <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="60%" stopColor="white" stopOpacity="1" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Weight Line (Primary - Green/Yellow) */}
                  <polyline
                    fill="none"
                    stroke={`url(#${gradientId}-primary)`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData
                      .map((point, index) => {
                        const x = (index / (chartData.length - 1)) * 100
                        const y = 45 - ((point.weight - minWeight) / range) * 38
                        return `${x},${y}`
                      })
                      .join(' ')}
                  />

                  {/* Reps Line (Accent - Teal) */}
                  {hasReps && (
                    <polyline
                      fill="none"
                      stroke={`url(#${gradientId}-accent)`}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartData
                        .map((point, index) => {
                          const x = (index / (chartData.length - 1)) * 100
                          const y = 45 - (((point.reps || 0) - minReps) / repsRange) * 38
                          return `${x},${y}`
                        })
                        .join(' ')}
                    />
                  )}
                </svg>

                {/* Bottom fade overlay */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[hsl(var(--card))] to-transparent pointer-events-none" />

                {/* Legend */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[hsl(var(--primary))] rounded" />
                    <span>kg</span>
                  </div>
                  {hasReps && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-[hsl(var(--accent))] rounded" />
                      <span>Wdh</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
