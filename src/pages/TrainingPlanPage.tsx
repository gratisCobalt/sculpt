import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { useState, useMemo, useCallback } from 'react'

interface PlanExerciseInfo {
  id?: number
  name: string
  name_de?: string
}

interface PlanExercise {
  id: number
  exercise?: PlanExerciseInfo
  sets: number
  min_reps: number
  max_reps: number
}

interface PlanDay {
  id: number
  day_number: number
  name: string
  exercises: PlanExercise[]
}

interface EditingExercise {
  id: number
  sets: number
  min_reps: number
  max_reps: number
}

export default function TrainingPlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')

  // First get user's active plan assignment
  const { data: userPlan, isLoading: isLoadingUserPlan } = useQuery({
    queryKey: ['userTrainingPlan', user?.id],
    queryFn: () => api.getUserTrainingPlan(),
    enabled: !!user?.id,
  })

  // Then fetch the full plan with all days and exercises
  const { data: planData, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['trainingPlan', userPlan?.training_plan_id],
    queryFn: () => api.getTrainingPlan(userPlan.training_plan_id),
    enabled: !!userPlan?.training_plan_id,
  })

  // Search exercises for add modal
  const { data: searchResults } = useQuery({
    queryKey: ['exerciseSearch', exerciseSearch],
    queryFn: () => api.getExercises({ search: exerciseSearch, limit: 20 }),
    enabled: showAddExercise && exerciseSearch.length >= 2,
  })

  const isLoading = isLoadingUserPlan || isLoadingPlan
  const plan = planData ? { ...planData, current_day: userPlan?.current_day } : null
  const days: PlanDay[] = useMemo(() => plan?.days || [], [plan?.days])
  const effectiveSelectedDayId = selectedDayId ?? (days.length > 0 ? days[0].id : null)
  const selectedDay = days.find((d) => d.id === effectiveSelectedDayId)
  const exercises = selectedDay?.exercises || []
  const planId = userPlan?.training_plan_id

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trainingPlan', planId] })
    queryClient.invalidateQueries({ queryKey: ['userTrainingPlan'] })
  }, [queryClient, planId])

  // Mutations
  const updateExercise = useMutation({
    mutationFn: (data: { exerciseId: number; sets: number; min_reps: number; max_reps: number }) =>
      api.updatePlanExercise(planId, data.exerciseId, {
        sets: data.sets,
        min_reps: data.min_reps,
        max_reps: data.max_reps,
      }),
    onSuccess: () => {
      invalidateQueries()
      setEditingExercise(null)
    },
  })

  const deleteExercise = useMutation({
    mutationFn: (exerciseId: number) => api.deletePlanExercise(planId, exerciseId),
    onSuccess: () => invalidateQueries(),
  })

  const addExercise = useMutation({
    mutationFn: (data: { exercise_id: number; sets?: number; min_reps?: number; max_reps?: number }) =>
      api.addPlanExercise(planId, effectiveSelectedDayId!, data),
    onSuccess: () => {
      invalidateQueries()
      setShowAddExercise(false)
      setExerciseSearch('')
    },
  })

  const reorderExercises = useMutation({
    mutationFn: (exerciseIds: number[]) =>
      api.reorderPlanExercises(planId, effectiveSelectedDayId!, exerciseIds),
    onSuccess: () => invalidateQueries(),
  })

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newExercises = [...exercises]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newExercises.length) return
    ;[newExercises[index], newExercises[swapIndex]] = [newExercises[swapIndex], newExercises[index]]
    reorderExercises.mutate(newExercises.map((e) => e.id))
  }

  const handleDeleteExercise = (exerciseId: number, name: string) => {
    if (window.confirm(`"${name}" wirklich entfernen?`)) {
      deleteExercise.mutate(exerciseId)
    }
  }

  const startEditing = (exercise: PlanExercise) => {
    setEditingExercise({
      id: exercise.id,
      sets: exercise.sets,
      min_reps: exercise.min_reps,
      max_reps: exercise.max_reps,
    })
  }

  const saveEditing = () => {
    if (!editingExercise) return
    updateExercise.mutate({
      exerciseId: editingExercise.id,
      sets: editingExercise.sets,
      min_reps: editingExercise.min_reps,
      max_reps: editingExercise.max_reps,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top">
        <SkeletonList count={4} />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Kein Trainingsplan</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Schliesse das Onboarding ab, um einen personalisierten Plan zu erhalten
          </p>
          <Button onClick={() => navigate('/onboarding')}>
            Onboarding starten
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Trainingsplan</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {plan.name}
          </p>
        </div>
        <Button
          variant={editMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setEditMode(!editMode)
            setEditingExercise(null)
            setShowAddExercise(false)
          }}
        >
          <Pencil className="w-4 h-4 mr-1" />
          {editMode ? 'Fertig' : 'Bearbeiten'}
        </Button>
      </div>

      {/* Day Tabs */}
      {days.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => {
                  setSelectedDayId(day.id)
                  setEditingExercise(null)
                  setShowAddExercise(false)
                }}
                className={cn(
                  'px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 flex flex-col items-start',
                  effectiveSelectedDayId === day.id
                    ? 'gradient-primary text-gray-900'
                    : 'glass glass-hover'
                )}
              >
                <span className="text-xs opacity-80">Tag {day.day_number}</span>
                <span className="font-semibold">{day.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Training Button */}
      {!editMode && (
        <div className="px-6 mb-6">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(`/guided-training?dayId=${effectiveSelectedDayId}`)}
            disabled={!effectiveSelectedDayId || exercises.length === 0}
          >
            <Play className="w-5 h-5 mr-2" />
            Training starten
          </Button>
        </div>
      )}

      {/* Exercises */}
      <div className="px-6">
        <h2 className="text-lg font-semibold mb-4">Übungen</h2>

        {exercises.length > 0 ? (
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <Card key={exercise.id}>
                <CardContent className="p-4">
                  {editingExercise?.id === exercise.id ? (
                    /* Inline Edit Mode */
                    <div>
                      <h3 className="font-semibold mb-3">
                        {exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'}
                      </h3>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Sätze</label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={editingExercise.sets}
                            onChange={(e) =>
                              setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) || 1 })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Min Wdh.</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={editingExercise.min_reps}
                            onChange={(e) =>
                              setEditingExercise({ ...editingExercise, min_reps: parseInt(e.target.value) || 1 })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Max Wdh.</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={editingExercise.max_reps}
                            onChange={(e) =>
                              setEditingExercise({ ...editingExercise, max_reps: parseInt(e.target.value) || 1 })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExercise(null)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEditing}
                          disabled={updateExercise.isPending}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Speichern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display */
                    <div className="flex items-center gap-3">
                      {editMode ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveExercise(index, 'up')}
                            disabled={index === 0}
                            className="text-[hsl(var(--muted-foreground))] disabled:opacity-30 hover:text-[hsl(var(--foreground))] transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveExercise(index, 'down')}
                            disabled={index === exercises.length - 1}
                            className="text-[hsl(var(--muted-foreground))] disabled:opacity-30 hover:text-[hsl(var(--foreground))] transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[hsl(var(--muted-foreground))]">
                          <GripVertical className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold">
                            {exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 ml-8 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          <span>{exercise.sets} Sätze</span>
                          <span>•</span>
                          <span>{exercise.min_reps}-{exercise.max_reps} Wdh.</span>
                        </div>
                      </div>
                      {editMode && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => startEditing(exercise)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-[hsl(var(--destructive))]"
                            onClick={() =>
                              handleDeleteExercise(
                                exercise.id,
                                exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'
                              )
                            }
                            disabled={deleteExercise.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                Keine Übungen für diesen Tag
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add Exercise Button (edit mode) */}
        {editMode && (
          <div className="mt-4">
            {!showAddExercise ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddExercise(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Übung hinzufügen
              </Button>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Übung hinzufügen</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setShowAddExercise(false)
                        setExerciseSearch('')
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      placeholder="Übung suchen..."
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  {exerciseSearch.length >= 2 && (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults && searchResults.length > 0 ? (
                        searchResults.map((ex: { id: number; name: string; name_de?: string }) => (
                          <button
                            key={ex.id}
                            onClick={() =>
                              addExercise.mutate({
                                exercise_id: ex.id,
                                sets: 3,
                                min_reps: 8,
                                max_reps: 12,
                              })
                            }
                            disabled={addExercise.isPending}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[hsl(var(--surface-soft))] transition-colors text-sm"
                          >
                            {ex.name_de || ex.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-2">
                          Keine Ergebnisse
                        </p>
                      )}
                    </div>
                  )}
                  {exerciseSearch.length < 2 && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-2">
                      Mindestens 2 Zeichen eingeben
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
