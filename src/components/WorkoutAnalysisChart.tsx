import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'

interface WorkoutAnalysisChartProps {
  exerciseProgress: Array<{
    exercise: {
      id: number
      name: string
      primary_category: string
    }
    history: Array<{ weight: number; reps: number }>
    latestWeight: number
    latestReps: number
  }>
}

// Map categories to German display names
const categoryLabels: Record<string, string> = {
  chest: 'Brust',
  back: 'Rücken',
  upper_arms: 'Arme',
  shoulders: 'Schultern',
  upper_legs: 'Beine',
  waist: 'Core',
  lower_legs: 'Waden',
  forearms: 'Unterarme',
  cardio: 'Cardio',
}

// Category full potential scores (normalized to 100 for visualization)
const MAX_SCORE = 100

export function WorkoutAnalysisChart({ exerciseProgress }: WorkoutAnalysisChartProps) {
  const chartData = useMemo(() => {
    // Group exercises by category and calculate scores
    const categoryScores: Record<string, { exercises: number; volume: number; sets: number }> = {}

    exerciseProgress.forEach((item) => {
      const category = item.exercise.primary_category
      if (!categoryScores[category]) {
        categoryScores[category] = { exercises: 0, volume: 0, sets: 0 }
      }
      
      categoryScores[category].exercises += 1
      categoryScores[category].sets += item.history.length
      
      // Calculate total volume for this exercise
      const totalVolume = item.history.reduce((sum, set) => sum + (set.weight * set.reps), 0)
      categoryScores[category].volume += totalVolume
    })

    // Calculate max values for normalization
    const maxExercises = Math.max(...Object.values(categoryScores).map(s => s.exercises), 1)
    const maxVolume = Math.max(...Object.values(categoryScores).map(s => s.volume), 1)
    const maxSets = Math.max(...Object.values(categoryScores).map(s => s.sets), 1)

    // Build radar data - include main categories even if empty
    const mainCategories = ['chest', 'back', 'shoulders', 'upper_arms', 'upper_legs', 'waist']
    
    return mainCategories.map((category) => {
      const data = categoryScores[category] || { exercises: 0, volume: 0, sets: 0 }
      
      // Normalize each metric to 0-100 scale
      const exerciseScore = (data.exercises / maxExercises) * MAX_SCORE
      const volumeScore = (data.volume / maxVolume) * MAX_SCORE
      const setsScore = (data.sets / maxSets) * MAX_SCORE
      
      // Combined score (weighted average)
      const combinedScore = Math.round(
        (exerciseScore * 0.3) + (volumeScore * 0.4) + (setsScore * 0.3)
      )

      return {
        category: categoryLabels[category] || category,
        score: Math.max(combinedScore, 5), // Min 5 for visibility
        fullMark: MAX_SCORE,
      }
    })
  }, [exerciseProgress])

  if (!exerciseProgress || exerciseProgress.length === 0) {
    return (
      <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
        Keine Daten für die Analyse verfügbar
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.5}
          />
          <PolarAngleAxis
            dataKey="category"
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 11,
              fontWeight: 500,
            }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, MAX_SCORE]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Training"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
