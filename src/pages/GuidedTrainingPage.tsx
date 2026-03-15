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
import { SkeletonList, Loader } from '@/components/ui/loader'
import { ConfettiCelebration } from '@/components/ConfettiCelebration'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { TrainingPlanDay, TrainingPlanExercise } from '@/types/database'
import heroBackground from '@/assets/gym-deadlift-background.png'

interface ExerciseWithMachine extends TrainingPlanExercise {
  machine: { id: string; name: string } | null
  exercise_name?: string
  exercise?: { id?: number; name?: string; name_de?: string; image_url?: string; video_url?: string }
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
        const userPlan = await api.getUserTrainingPlan()
        if (!userPlan?.training_plan_id) return []
        const fullPlan = await api.getTrainingPlan(userPlan.training_plan_id)
        return (fullPlan?.days || []) as TrainingPlanDay[]
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
        const userPlan = await api.getUserTrainingPlan()
        if (!userPlan?.training_plan_id) return []
        const fullPlan = await api.getTrainingPlan(userPlan.training_plan_id)
        const day = fullPlan?.days?.find((d: TrainingPlanDay) => String(d.id) === dayId)
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
      exerciseName: currentExercise.exercise?.name_de || currentExercise.exercise?.name || currentExercise.exercise_name || 'Übung',
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

  const exerciseName = (ex: ExerciseWithMachine) =>
    ex.exercise?.name_de || ex.exercise?.name || ex.exercise_name || 'Übung'

  const progressPercent = exercises?.length
    ? Math.round(((currentExerciseIndex + 1) / exercises.length) * 100)
    : 0

  // Performance graph: SVG sparkline for last workout data
  const renderPerformanceGraph = () => {
    const sets = lastWorkoutData?.sets
    if (!sets || Object.keys(sets).length < 2) {
      return (
        <svg viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="training-gradient-empty" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="300" height="120" fill="url(#training-gradient-empty)" />
        </svg>
      )
    }

    const data = Object.values(sets).map((s: { weight: number; reps: number }) => s.weight * s.reps)
    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    const range = maxVal - minVal || 1
    const width = 300
    const height = 120

    const points = data.map((val: number, i: number) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
      const y = height - ((val - minVal) / range) * height
      return { x, y: Math.max(0, Math.min(height, y)) }
    })

    let strokePath = `M${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const midX = (curr.x + next.x) / 2
      strokePath += ` C${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`
    }

    const fillPath = `${strokePath} L${width},${height} L0,${height} Z`

    return (
      <svg viewBox="0 0 300 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="training-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="training-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <path d={strokePath} fill="none" stroke="url(#training-stroke-gradient)" strokeWidth="2.5" />
        <path d={fillPath} fill="url(#training-gradient)" />
      </svg>
    )
  }

  // Day selection view
  if (!dayId && !isTraining) {
    return (
      <div className="guided-training-stage" style={{ '--guided-training-image': `url(${heroBackground})` } as React.CSSProperties}>
        <div className="guided-training-layer px-6 pt-6 pb-24">
          <div className="mx-auto w-full max-w-md">
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
                  <button
                    key={day.id}
                    className="w-full glass glass-hover rounded-2xl p-4 text-left transition-all duration-200"
                    onClick={() => navigate(`/guided-training?dayId=${day.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Tag {day.day_number}
                        </p>
                        <h3 className="font-semibold text-lg">{day.name}</h3>
                      </div>
                      <Play className="w-6 h-6 text-[hsl(var(--primary))]" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-[hsl(var(--muted-foreground))]">
                  Kein Trainingsplan gefunden
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Summary view
  if (showSummary) {
    return (
      <div className="guided-training-stage" style={{ '--guided-training-image': `url(${heroBackground})` } as React.CSSProperties}>
        <div className="guided-training-layer px-6 pt-6 pb-24">
          <div className="mx-auto w-full max-w-md">
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
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Übungen</p>
                <p className="text-2xl font-bold">{workoutLogs.length}</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Volumen</p>
                <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">kg</p>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Dauer</p>
                <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-2 mb-8">
              {workoutLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl glass"
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
        </div>
      </div>
    )
  }

  // Pre-training view
  if (!isTraining && dayId) {
    return (
      <div className="guided-training-stage" style={{ '--guided-training-image': `url(${heroBackground})` } as React.CSSProperties}>
        <div className="guided-training-layer px-6 pt-6 pb-24">
          <div className="mx-auto w-full max-w-md">
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
                      className="flex items-center gap-3 p-3 rounded-xl glass"
                    >
                      <span className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">
                        {exerciseName(exercise)}
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
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-[hsl(var(--muted-foreground))]">
                  Keine Übungen für diesen Tag
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Active training view — immersive full-screen design
  const backgroundStyle = {
    '--guided-training-image': `url(${heroBackground})`,
  } as React.CSSProperties

  return (
    <section className="guided-training-stage" style={backgroundStyle}>
      <div className="guided-training-layer px-4 pb-28 pt-8 sm:px-6 sm:pb-32">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
          {/* Hero Bar */}
          <header className="space-y-4">
            <div className="training-hero-bar">
              <div className="training-time-pill">
                <Clock className="h-4 w-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <div className="training-hero-title">
                <p>{currentExercise ? exerciseName(currentExercise) : '...'}</p>
                <span>Satz {currentSetNumber}</span>
              </div>
              <div className="relative">
                <button
                  className="training-menu-button"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Optionen"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl glass p-2 z-50 animate-scale-in">
                    <button
                      className="training-menu-item w-full text-left rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => {
                        setShowMenu(false)
                        setIsPaused(!isPaused)
                      }}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? 'Fortsetzen' : 'Pausieren'}
                    </button>
                    <button
                      className="training-menu-item w-full text-left rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => {
                        setShowMenu(false)
                        navigate('/add-workout')
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Alternative tracken
                    </button>
                    <button
                      className="training-menu-item w-full text-left rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => {
                        setShowMenu(false)
                        handleSkip()
                      }}
                    >
                      <SkipForward className="h-4 w-4" />
                      Überspringen
                    </button>
                    <button
                      className="training-menu-item w-full text-left rounded-lg hover:bg-white/5 transition-colors text-[hsl(var(--destructive))]"
                      onClick={() => {
                        setShowMenu(false)
                        setShowSummary(true)
                      }}
                    >
                      <X className="h-4 w-4" />
                      Training beenden
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="training-progress-meta">
                <span>Fortschritt</span>
                <span>
                  {currentExerciseIndex + 1}/{exercises?.length || 0} Übungen
                </span>
              </div>
              <div className="training-progress-track">
                <div
                  className="training-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </header>

          {/* "Letztes Mal" indicator */}
          {lastSetData && (
            <p className="text-sm text-center">
              Letztes Mal:{' '}
              <span className="font-semibold text-[hsl(var(--primary))]">
                {lastSetData.weight}kg × {lastSetData.reps} Wdh
              </span>
            </p>
          )}

          {/* Main content area */}
          <main className="flex flex-1 flex-col gap-6">
            {/* Performance Graph */}
            <div className="mt-auto flex flex-col gap-4">
              <div className="training-graph-visual" aria-hidden="true">
                {renderPerformanceGraph()}
              </div>

              {/* Floating Input Panel */}
              <div className="training-floating-panel space-y-5">
                <div className="training-input-grid">
                  <div>
                    <label className="training-field-label">Gewicht (kg)</label>
                    <div className="training-field mt-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder={weightPlaceholder}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="training-field-label">Wiederholungen</label>
                    <div className="training-field mt-2">
                      <input
                        type="number"
                        min="1"
                        placeholder={repsPlaceholder}
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSaveAndNext}
                  disabled={!weight || !reps || saveWorkoutMutation.isPending}
                >
                  {saveWorkoutMutation.isPending ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Speichern & Weiter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}
