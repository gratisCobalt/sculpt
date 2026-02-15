import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Flame,
  Play,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Gift,
  Dumbbell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SkeletonList } from '@/components/ui/loader'
import { MachineProgressCard } from '@/components/MachineProgressCard'
import { ExerciseHistoryModal } from '@/components/ExerciseHistoryModal'
import { WorkoutAnalysisChart } from '@/components/WorkoutAnalysisChart'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

const categories = [
  { id: 'all', name: 'Alle' },
  { id: 'chest', name: 'Brust' },
  { id: 'back', name: 'Rücken' },
  { id: 'upper_arms', name: 'Arme' },
  { id: 'shoulders', name: 'Schultern' },
  { id: 'legs,upper_legs,lower_legs,quads,hamstrings,calves,glutes', name: 'Beine' },
  { id: 'waist', name: 'Bauch' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedExercise, setSelectedExercise] = useState<{
    id: number
    name: string
    imageUrl?: string
  } | null>(null)

  // Fetch weekly stats for header
  const { data: weeklyStats, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weeklyStats'],
    queryFn: () => api.getWeeklyStats(),
    enabled: !!user,
  })

  // Fetch unopened loot boxes count
  const { data: lootBoxes } = useQuery({
    queryKey: ['lootBoxes'],
    queryFn: () => api.getLootBoxes(),
    enabled: !!user,
  })

  const unopenedBoxes = lootBoxes?.filter((b: any) => !b.is_opened)?.length || 0

  // Fetch exercise progress for cards (last 30 days with category filter)
  const { data: exerciseProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['exerciseProgress', selectedCategory],
    queryFn: () => api.getExerciseProgress(30, selectedCategory !== 'all' ? selectedCategory : undefined),
    enabled: !!user,
  })

  // Fetch ALL exercise progress for radar chart (all time, all categories)
  const { data: allExerciseProgress } = useQuery({
    queryKey: ['exerciseProgressAll'],
    queryFn: () => api.getExerciseProgress(365), // All time
    enabled: !!user,
  })

  const isLoading = weeklyLoading || progressLoading

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-soft))] flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Streak</p>
              <p className="font-bold">{user?.current_streak || 0} Wochen</p>
            </div>
          </div>

          {/* Currency & Shop */}
          <div className="flex items-center gap-2">
            {/* Loot Boxes */}
            {unopenedBoxes > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/loot-boxes')}
              >
                <Gift className="w-5 h-5 text-purple-400" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">
                  {unopenedBoxes}
                </span>
              </Button>
            )}

            {/* Hanteln */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 cursor-pointer"
              onClick={() => navigate('/shop')}
            >
              <span className="text-amber-400">🏋️</span>
              <span className="font-semibold text-amber-400">{user?.hantel_coins || 0}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => navigate('/shop')}>
              <ShoppingBag className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Welcome */}
        <h1 className="text-2xl font-bold mb-1">
          Hallo, {user?.display_name || 'Athlet'} 👋
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Bereit für dein Training?
        </p>
      </div>

      {/* Quick Action - Start Training */}
      <div className="px-6 mb-6">
        <Button
          size="lg"
          className="w-full h-16 text-lg animate-pulse-glow"
          onClick={() => navigate('/guided-training')}
        >
          <Play className="w-6 h-6 mr-2" />
          Training starten
        </Button>
      </div>

      {/* Stats - 4 Tiles */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Deine Woche</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Exercises This Week */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/15 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Übungen</p>
                  <p className="text-2xl font-bold leading-tight">{weeklyStats?.exercises_completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workouts x/y */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Workouts</p>
                  <p className="text-2xl font-bold leading-tight">{weeklyStats?.workouts_count || 0}/{user?.training_frequency_per_week || 3}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calories */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Kalorien</p>
                  <p className="text-2xl font-bold leading-tight">~{weeklyStats?.calories_burned || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Volume This Week */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/15 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-[hsl(var(--accent))]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Volumen</p>
                  <p className="text-2xl font-bold leading-tight">
                    {weeklyStats?.total_volume_kg ? `${(weeklyStats.total_volume_kg / 1000).toFixed(1)}t` : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workout Analysis Radar Chart - uses ALL time data */}
      {allExerciseProgress && allExerciseProgress.length > 0 && (
        <div className="px-6 mb-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Training Analyse</h3>
              <WorkoutAnalysisChart exerciseProgress={allExerciseProgress} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Filter - Horizontally Scrollable */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 active:scale-95',
                selectedCategory === cat.id
                  ? 'gradient-primary text-gray-900 shadow-lg'
                  : 'bg-[hsl(var(--surface-soft))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-strong))] active:bg-[hsl(var(--surface-strong))]'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold mb-4">Deine Übungen</h2>

        {isLoading ? (
          <SkeletonList count={3} />
        ) : exerciseProgress && exerciseProgress.length > 0 ? (
          <div className="space-y-3">
            {exerciseProgress.map((item) => (
              <MachineProgressCard
                key={item.exercise.id}
                exerciseId={item.exercise.id}
                name={item.exercise.name}
                lastWeight={item.latestWeight}
                lastReps={item.latestReps}
                history={item.history}
                isPR={item.isPR}
                imageUrl={item.exercise.image_url}
                onClick={() => setSelectedExercise({
                  id: item.exercise.id,
                  name: item.exercise.name,
                  imageUrl: item.exercise.image_url,
                })}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Dumbbell className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))]">
                Noch keine Workouts aufgezeichnet
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate('/add-workout')}
              >
                Erstes Workout hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exercise History Modal */}
      {selectedExercise && (
        <ExerciseHistoryModal
          isOpen={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
          exerciseId={selectedExercise.id}
          exerciseName={selectedExercise.name}
          imageUrl={selectedExercise.imageUrl}
          history={
            exerciseProgress?.find((e) => e.exercise.id === selectedExercise.id)?.allSets || []
          }
        />
      )}
    </div>
  )
}
