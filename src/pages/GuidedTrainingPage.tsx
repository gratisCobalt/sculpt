import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Pause,
  SkipForward,
  Check,
  X,
  Clock,
  MoreVertical,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SkeletonList, Loader } from '@/components/ui/loader'
import { ConfettiCelebration } from '@/components/ConfettiCelebration'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { TrainingPlanDay, TrainingPlanExercise } from '@/types/database'

interface ExerciseWithMachine extends TrainingPlanExercise {
  machine: { id: string; name: string } | null
  exercise_name?: string
}

interface WorkoutLog {
  exerciseId: number
  machineId: string | null
  exerciseName: string
  weight: number
  reps: number
  completed: boolean
}

export default function GuidedTrainingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const dayId = searchParams.get('dayId')

  // State
  const [isTraining, setIsTraining] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentSetNumber, setCurrentSetNumber] = useState(1)

  // Fetch available days if no dayId provided - use API
  const { data: days, isLoading: daysLoading } = useQuery({
    queryKey: ['guidedTrainingDays', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      try {
        const plan = await api.getUserTrainingPlan()
        if (!plan?.days) return []
        return plan.days as TrainingPlanDay[]
      } catch {
        return []
      }
    },
    enabled: !!user?.id && !dayId,
  })

  // Fetch exercises for selected day - use API
  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ['guidedExercises', dayId],
    queryFn: async () => {
      if (!dayId) return []
      try {
        const plan = await api.getUserTrainingPlan()
        const day = plan?.days?.find((d: TrainingPlanDay) => String(d.id) === dayId)
        return (day?.exercises || []) as ExerciseWithMachine[]
      } catch {
        return []
      }
    },
    enabled: !!dayId,
  })

  const currentExercise = exercises?.[currentExerciseIndex]

  // Letzte Workout-Daten für aktuelle Übung holen (für Placeholder)
  const { data: lastWorkoutData } = useQuery({
    queryKey: ['exerciseLastWorkout', currentExercise?.exercise_id],
    queryFn: () => api.getExerciseLastWorkout(currentExercise!.exercise_id!),
    enabled: !!currentExercise?.exercise_id && isTraining,
  })

  // Placeholder-Werte basierend auf aktuellem Satz
  const lastSetData = lastWorkoutData?.sets?.[currentSetNumber]
  const weightPlaceholder = lastSetData ? `${lastSetData.weight}` : '0'
  const repsPlaceholder = lastSetData ? `${lastSetData.reps}` : '0'

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (isTraining && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTraining, isPaused])

  // Save workout mutation - using API
  const saveWorkoutMutation = useMutation({
    mutationFn: async (log: WorkoutLog) => {
      if (!user?.id) return

      // Save via API
      await api.createWorkout({
        sets: [{
          exercise_id: log.exerciseId,
          set_number: currentSetNumber,
          weight_kg: log.weight,
          reps: log.reps,
        }]
      })
    },
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSaveAndNext = useCallback(async () => {
    if (!currentExercise || !weight || !reps) return

    const log: WorkoutLog = {
      exerciseId: currentExercise.id,
      machineId: currentExercise.machine?.id || null,
      exerciseName: currentExercise.machine?.name || currentExercise.exercise_name || 'Übung',
      weight: parseFloat(weight),
      reps: parseInt(reps),
      completed: true,
    }

    // Save to database
    await saveWorkoutMutation.mutateAsync(log)

    // Add to logs
    setWorkoutLogs((prev) => [...prev, log])

    // Nächsten Satz vorbereiten oder zur nächsten Übung
    setCurrentSetNumber((prev) => prev + 1)

    // Move to next exercise or finish
    if (currentExerciseIndex < (exercises?.length || 0) - 1) {
      setCurrentExerciseIndex((prev) => prev + 1)
      setWeight('')
      setReps('')
      setCurrentSetNumber(1) // Reset set counter für neue Übung
    } else {
      // Training complete
      setShowConfetti(true)
      setShowSummary(true)
    }
  }, [currentExercise, weight, reps, exercises, currentExerciseIndex, saveWorkoutMutation])

  const handleSkip = () => {
    if (currentExerciseIndex < (exercises?.length || 0) - 1) {
      setCurrentExerciseIndex((prev) => prev + 1)
      setWeight('')
      setReps('')
      setCurrentSetNumber(1) // Reset set counter
      setReps('')
    } else {
      setShowSummary(true)
    }
  }

  const handleFinish = () => {
    queryClient.invalidateQueries({ queryKey: ['workoutStats'] })
    queryClient.invalidateQueries({ queryKey: ['machinesProgress'] })
    navigate('/dashboard')
  }

  const totalVolume = workoutLogs.reduce((sum, log) => sum + log.weight * log.reps, 0)

  // Day selection view
  if (!dayId && !isTraining) {
    return (
      <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Training starten</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-[hsl(var(--muted-foreground))] mb-6">
          Wähle einen Trainingstag
        </p>

        {daysLoading ? (
          <SkeletonList count={3} />
        ) : days && days.length > 0 ? (
          <div className="space-y-3">
            {days.map((day) => (
              <Card
                key={day.id}
                className="cursor-pointer"
                onClick={() => navigate(`/guided-training?dayId=${day.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Tag {day.day_number}
                      </p>
                      <h3 className="font-semibold text-lg">{day.name}</h3>
                    </div>
                    <Play className="w-6 h-6 text-[hsl(var(--primary))]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                Kein Trainingsplan gefunden
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Summary view
  if (showSummary) {
    return (
      <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
        {showConfetti && <ConfettiCelebration />}

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 gradient-shadow">
            <Check className="w-10 h-10 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Training abgeschlossen!</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Großartige Arbeit!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Übungen</p>
              <p className="text-2xl font-bold">{workoutLogs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Volumen</p>
              <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Dauer</p>
              <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Exercise List */}
        <div className="space-y-2 mb-8">
          {workoutLogs.map((log, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--surface-soft))]"
            >
              <span className="font-medium">{log.exerciseName}</span>
              <span className="text-[hsl(var(--muted-foreground))]">
                {log.weight} kg × {log.reps}
              </span>
            </div>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={handleFinish}>
          Fertig
        </Button>
      </div>
    )
  }

  // Pre-training view
  if (!isTraining && dayId) {
    return (
      <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Training vorbereiten</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {exercisesLoading ? (
          <SkeletonList count={4} />
        ) : exercises && exercises.length > 0 ? (
          <>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              {exercises.length} Übungen in diesem Training
            </p>

            <div className="space-y-2 mb-8">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--surface-soft))]"
                >
                  <span className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium">
                    {exercise.machine?.name || exercise.exercise_name || 'Übung'}
                  </span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setIsTraining(true)}
            >
              <Play className="w-5 h-5 mr-2" />
              Training starten
            </Button>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                Keine Übungen für diesen Tag
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Active training view
  return (
    <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
      {/* Header with Timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--surface-soft))]">
            <Clock className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play className="w-5 h-5" />
            ) : (
              <Pause className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl glass p-2 z-50 animate-scale-in">
              <button
                className="w-full px-4 py-2 text-left rounded-lg hover:bg-[hsl(var(--surface-soft))] transition-colors"
                onClick={() => {
                  setShowMenu(false)
                  navigate('/add-workout')
                }}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Alternative tracken
              </button>
              <button
                className="w-full px-4 py-2 text-left rounded-lg hover:bg-[hsl(var(--surface-soft))] text-[hsl(var(--destructive))] transition-colors"
                onClick={() => {
                  setShowMenu(false)
                  setShowSummary(true)
                }}
              >
                Training beenden
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Übung {currentExerciseIndex + 1} von {exercises?.length || 0}
          </span>
          <span className="text-sm font-medium text-[hsl(var(--primary))]">
            {Math.round(((currentExerciseIndex + 1) / (exercises?.length || 1)) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-[hsl(var(--surface-soft))] rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-500"
            style={{
              width: `${((currentExerciseIndex + 1) / (exercises?.length || 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Current Exercise */}
      {currentExercise ? (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">
              {currentExercise.machine?.name || currentExercise.exercise_name || 'Übung'}
            </h2>
            <p className="text-sm text-[hsl(var(--primary))]">
              Satz {currentSetNumber}
            </p>
            {currentExercise.notes && (
              <p className="text-[hsl(var(--muted-foreground))] mt-1">
                {currentExercise.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Loader />
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
            Gewicht (kg)
          </label>
          <Input
            type="number"
            placeholder={weightPlaceholder}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-2xl font-bold h-16 text-center placeholder:text-blue-400/60"
          />
        </div>
        <div>
          <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
            Wiederholungen
          </label>
          <Input
            type="number"
            placeholder={repsPlaceholder}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="text-2xl font-bold h-16 text-center placeholder:text-blue-400/60"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={handleSkip}
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Überspringen
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={handleSaveAndNext}
          disabled={!weight || !reps || saveWorkoutMutation.isPending}
        >
          {saveWorkoutMutation.isPending ? (
            <Loader size="sm" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Speichern
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
