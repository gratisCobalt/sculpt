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
  Trash2,
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
  const [setInputs, setSetInputs] = useState<{ weight: string; reps: string }[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

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
  const plannedSets = currentExercise?.sets || 3

  // Letzte Workout-Daten für aktuelle Übung holen (für Placeholder)
  const { data: lastWorkoutData } = useQuery({
    queryKey: ['exerciseLastWorkout', currentExercise?.exercise_id],
    queryFn: () => api.getExerciseLastWorkout(currentExercise!.exercise_id!),
    enabled: !!currentExercise?.exercise_id && isTraining,
  })

  // Initialize set inputs when exercise changes
  useEffect(() => {
    if (!currentExercise) return
    const count = currentExercise.sets || 3
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetInputs(Array.from({ length: count }, () => ({ weight: '', reps: '' })))
  }, [currentExercise?.id, currentExercise?.sets]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateSetInput = (index: number, field: 'weight' | 'reps', value: string) => {
    setSetInputs(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addSetInput = () => {
    setSetInputs(prev => [...prev, { weight: '', reps: '' }])
  }

  const removeSetInput = (index: number) => {
    if (setInputs.length <= 1) return
    setSetInputs(prev => prev.filter((_, i) => i !== index))
  }

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

  // Save workout mutation - saves all sets at once
  const saveWorkoutMutation = useMutation({
    mutationFn: async (logs: WorkoutLog[]) => {
      if (!user?.id || logs.length === 0) return

      await api.createWorkout({
        sets: logs.map((log, i) => ({
          exercise_id: log.exerciseId,
          set_number: i + 1,
          weight_kg: log.weight,
          reps: log.reps,
        }))
      })
    },
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSaveAndNext = useCallback(async () => {
    if (!currentExercise) return

    // Collect non-empty sets
    const validSets = setInputs.filter(s => s.weight || s.reps)
    if (validSets.length === 0) return

    const name = currentExercise.exercise?.name_de || currentExercise.exercise?.name || currentExercise.exercise_name || 'Übung'
    const logs: WorkoutLog[] = validSets.map(s => ({
      exerciseId: currentExercise.id,
      machineId: currentExercise.machine?.id || null,
      exerciseName: name,
      weight: parseFloat(s.weight) || 0,
      reps: parseInt(s.reps) || 0,
      completed: true,
    }))

    // Save all sets to database
    await saveWorkoutMutation.mutateAsync(logs)

    // Add to logs
    setWorkoutLogs(prev => [...prev, ...logs])

    if (currentExerciseIndex < (exercises?.length || 0) - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(prev => prev + 1)
    } else {
      // Last exercise → training complete
      setShowConfetti(true)
      setShowSummary(true)
    }
  }, [currentExercise, setInputs, exercises, currentExerciseIndex, saveWorkoutMutation])

  const handleSkip = () => {
    if (currentExerciseIndex < (exercises?.length || 0) - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
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
    ? Math.round((currentExerciseIndex / exercises.length) * 100)
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
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Sätze</p>
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

                <div className="space-y-3 mb-8">
                  {exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="relative rounded-2xl glass glass-hover overflow-hidden group"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="flex items-center gap-4 p-3 pr-4">
                        {/* Exercise image or fallback */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[hsl(var(--surface-strong))]">
                          {exercise.exercise?.image_url ? (
                            <img
                              src={exercise.exercise.image_url}
                              alt={exerciseName(exercise)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[hsl(var(--muted-foreground))]">
                              {index + 1}
                            </div>
                          )}
                          {/* Index badge overlay */}
                          <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-br-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white/80">
                            {index + 1}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[15px] truncate leading-tight">
                            {exerciseName(exercise)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                              {exercise.sets || 3} Sätze
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {exercise.min_reps}–{exercise.max_reps} Wdh
                            </span>
                          </div>
                        </div>

                        {/* Rest time indicator */}
                        {exercise.rest_seconds > 0 && (
                          <span className="text-[11px] text-[hsl(var(--muted-foreground))] tabular-nums">
                            {exercise.rest_seconds}s
                          </span>
                        )}
                      </div>
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
            <div className="relative">
              <div className="training-hero-bar">
                <div className="training-time-pill">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
                <div className="training-hero-title">
                  <p>{currentExercise ? exerciseName(currentExercise) : '...'}</p>
                  <span>{plannedSets} Sätze</span>
                </div>
                <button
                  className="training-menu-button"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Optionen"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl p-2 z-50 animate-scale-in" style={{ background: 'rgba(10, 10, 12, 0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
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

            {/* Progress Bar */}
            <div>
              <div className="training-progress-meta">
                <span>Fortschritt</span>
                <span>
                  Übung {currentExerciseIndex + 1} / {exercises?.length || 0}
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

          {/* Main content area */}
          <main className="flex flex-1 flex-col gap-6">
            {/* Performance Graph */}
            <div className="mt-auto flex flex-col gap-4">
              <div className="training-graph-visual" aria-hidden="true">
                {renderPerformanceGraph()}
              </div>

              {/* Floating Input Panel — all sets */}
              <div className="training-floating-panel space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="training-field-label">Sätze</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">kg × Wdh</span>
                </div>

                {/* Set rows */}
                <div className="space-y-2">
                  {setInputs.map((setInput, index) => {
                    const lastSet = lastWorkoutData?.sets?.[index + 1]
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-7 h-8 flex items-center justify-center rounded-md bg-white/5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                          {index + 1}
                        </span>
                        <div className="training-field flex-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder={lastSet ? `${lastSet.weight}` : '0'}
                            value={setInput.weight}
                            onChange={(e) => updateSetInput(index, 'weight', e.target.value)}
                            autoFocus={index === 0}
                          />
                        </div>
                        <span className="text-[hsl(var(--muted-foreground))] text-sm">×</span>
                        <div className="training-field flex-1">
                          <input
                            type="number"
                            min="1"
                            placeholder={lastSet ? `${lastSet.reps}` : '0'}
                            value={setInput.reps}
                            onChange={(e) => updateSetInput(index, 'reps', e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => removeSetInput(index)}
                          disabled={setInputs.length <= 1}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add set button */}
                  <button
                    onClick={addSetInput}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/15 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors text-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Satz hinzufügen
                  </button>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSaveAndNext}
                  disabled={!setInputs.some(s => s.weight || s.reps) || saveWorkoutMutation.isPending}
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
