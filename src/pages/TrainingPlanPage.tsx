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
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { ExerciseHistoryModal } from '@/components/ExerciseHistoryModal'
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import sculptIcon from '@/assets/sculpt-icon.png'

interface PlanExerciseInfo {
  id?: number
  name: string
  name_de?: string
  image_url?: string
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

// Sortable exercise card
function SortableExerciseCard({
  exercise,
  editMode,
  editingExercise,
  setEditingExercise,
  startEditing,
  saveEditing,
  updatePending,
  handleDeleteExercise,
  deletePending,
  onSelect,
}: {
  exercise: PlanExercise
  editMode: boolean
  editingExercise: EditingExercise | null
  setEditingExercise: (e: EditingExercise | null) => void
  startEditing: (e: PlanExercise) => void
  saveEditing: () => void
  updatePending: boolean
  handleDeleteExercise: (id: number, name: string) => void
  deletePending: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled: !editMode })

  const dragTransform = CSS.Transform.toString(transform)
  const style = {
    transform: isDragging ? `${dragTransform || ''} scale(1.02)` : dragTransform,
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: (isDragging ? 'relative' : undefined) as React.CSSProperties['position'],
  }

  const isEditing = editingExercise?.id === exercise.id

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(isDragging && 'shadow-xl ring-2 ring-[hsl(var(--primary))] opacity-90')}>
        <CardContent className="p-4">
          {isEditing ? (
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
                <Button variant="ghost" size="sm" onClick={() => setEditingExercise(null)}>
                  <X className="w-4 h-4 mr-1" />
                  Abbrechen
                </Button>
                <Button size="sm" onClick={saveEditing} disabled={updatePending}>
                  <Save className="w-4 h-4 mr-1" />
                  Speichern
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {editMode && (
                <div
                  {...attributes}
                  {...listeners}
                  className="text-[hsl(var(--muted-foreground))] cursor-grab active:cursor-grabbing touch-none"
                >
                  <GripVertical className="w-5 h-5" />
                </div>
              )}
              {/* Exercise thumbnail + info — clickable when not editing */}
              <button
                type="button"
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                onClick={editMode ? undefined : onSelect}
                disabled={editMode}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[hsl(var(--surface-strong))]">
                  {exercise.exercise?.image_url ? (
                    <img
                      src={exercise.exercise.image_url}
                      alt={exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[hsl(var(--muted-foreground))]">
                      {(exercise.exercise?.name_de || exercise.exercise?.name || '?').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] truncate">
                    {exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                      {exercise.sets} Sätze
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {exercise.min_reps}–{exercise.max_reps} Wdh
                    </span>
                  </div>
                </div>
              </button>
              {editMode && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => startEditing(exercise)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-[hsl(var(--destructive))]"
                    onClick={() =>
                      handleDeleteExercise(exercise.id, exercise.exercise?.name_de || exercise.exercise?.name || 'Übung')
                    }
                    disabled={deletePending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function TrainingPlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null)
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  const [editingDayName, setEditingDayName] = useState('')
  const [showAddDay, setShowAddDay] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showPlanSwitcher, setShowPlanSwitcher] = useState(false)
  const [editingPlanName, setEditingPlanName] = useState(false)
  const [planNameInput, setPlanNameInput] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<{
    id: number
    name: string
    imageUrl?: string
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const { data: myPlans } = useQuery({
    queryKey: ['myPlans', user?.id],
    queryFn: () => api.getMyPlans(),
    enabled: !!user?.id,
  })

  const { data: userPlan, isLoading: isLoadingUserPlan } = useQuery({
    queryKey: ['userTrainingPlan', user?.id],
    queryFn: () => api.getUserTrainingPlan(),
    enabled: !!user?.id,
  })

  const { data: planData, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['trainingPlan', userPlan?.training_plan_id],
    queryFn: () => api.getTrainingPlan(userPlan.training_plan_id),
    enabled: !!userPlan?.training_plan_id,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['exerciseSearch', exerciseSearch],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await api.getExercises({ search: exerciseSearch, limit: 20 }) as any
      return Array.isArray(result) ? result : result?.exercises || []
    },
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
    queryClient.invalidateQueries({ queryKey: ['myPlans'] })
  }, [queryClient, planId])

  const switchPlan = useMutation({
    mutationFn: (newPlanId: number) => api.setActivePlan(newPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTrainingPlan'] })
      queryClient.invalidateQueries({ queryKey: ['myPlans'] })
      setShowPlanSwitcher(false)
      setSelectedDayId(null)
    },
    onError: () => setFeedback({ type: 'error', message: 'Plan konnte nicht gewechselt werden' }),
  })

  const renamePlan = useMutation({
    mutationFn: (name: string) => api.renamePlan(planId, name),
    onSuccess: () => {
      invalidateQueries()
      setEditingPlanName(false)
      setFeedback({ type: 'success', message: 'Plan umbenannt' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Plan konnte nicht umbenannt werden' }),
  })

  const deletePlan = useMutation({
    mutationFn: () => api.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTrainingPlan'] })
      queryClient.invalidateQueries({ queryKey: ['myPlans'] })
      setEditMode(false)
      setFeedback({ type: 'success', message: 'Plan gelöscht' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Plan konnte nicht gelöscht werden' }),
  })

  const updateExercise = useMutation({
    mutationFn: (data: { exerciseId: number; sets: number; min_reps: number; max_reps: number }) =>
      api.updatePlanExercise(planId, data.exerciseId, {
        sets: data.sets, min_reps: data.min_reps, max_reps: data.max_reps,
      }),
    onSuccess: () => { invalidateQueries(); setEditingExercise(null) },
    onError: () => setFeedback({ type: 'error', message: 'Änderungen konnten nicht gespeichert werden' }),
  })

  const deleteExercise = useMutation({
    mutationFn: (exerciseId: number) => api.deletePlanExercise(planId, exerciseId),
    onSuccess: () => invalidateQueries(),
    onError: () => setFeedback({ type: 'error', message: 'Übung konnte nicht entfernt werden' }),
  })

  const addExercise = useMutation({
    mutationFn: (data: { exercise_id: number; sets?: number; min_reps?: number; max_reps?: number }) =>
      api.addPlanExercise(planId, effectiveSelectedDayId!, data),
    onSuccess: () => {
      invalidateQueries()
      setShowAddExercise(false)
      setExerciseSearch('')
      setFeedback({ type: 'success', message: 'Übung hinzugefügt' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Übung konnte nicht hinzugefügt werden' }),
  })

  const updateDay = useMutation({
    mutationFn: (data: { dayId: number; name: string }) =>
      api.updatePlanDay(planId, data.dayId, { name: data.name, name_de: data.name }),
    onSuccess: () => {
      invalidateQueries()
      setEditingDayId(null)
      setFeedback({ type: 'success', message: 'Tag umbenannt' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Tag konnte nicht umbenannt werden' }),
  })

  const addDay = useMutation({
    mutationFn: (name: string) => api.addPlanDay(planId, { name, name_de: name }),
    onSuccess: () => {
      invalidateQueries()
      setShowAddDay(false)
      setNewDayName('')
      setFeedback({ type: 'success', message: 'Tag hinzugefügt' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Tag konnte nicht hinzugefügt werden' }),
  })

  const deleteDay = useMutation({
    mutationFn: (dayId: number) => api.deletePlanDay(planId, dayId),
    onSuccess: () => {
      invalidateQueries()
      setSelectedDayId(null)
      setFeedback({ type: 'success', message: 'Tag gelöscht' })
    },
    onError: () => setFeedback({ type: 'error', message: 'Tag konnte nicht gelöscht werden' }),
  })

  const reorderExercises = useMutation({
    mutationFn: (exerciseIds: number[]) =>
      api.reorderPlanExercises(planId, effectiveSelectedDayId!, exerciseIds),
    onMutate: async (newIds) => {
      await queryClient.cancelQueries({ queryKey: ['trainingPlan', planId] })
      const previous = queryClient.getQueryData(['trainingPlan', planId])
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(['trainingPlan', planId], (old: any) => {
          if (!old?.days) return old
          return {
            ...old,
            days: old.days.map((day: PlanDay) => {
              if (day.id !== effectiveSelectedDayId) return day
              const reordered = newIds
                .map((id: number) => day.exercises.find((e: PlanExercise) => e.id === id))
                .filter(Boolean)
              return { ...day, exercises: reordered }
            }),
          }
        })
      } catch {
        // optimistic update failed, mutation will still fire
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['trainingPlan', planId], context.previous)
      }
      setFeedback({ type: 'error', message: 'Reihenfolge konnte nicht gespeichert werden' })
    },
    onSettled: () => invalidateQueries(),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = exercises.findIndex((e) => e.id === active.id)
    const newIndex = exercises.findIndex((e) => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(exercises, oldIndex, newIndex)
    reorderExercises.mutate(newOrder.map((e) => e.id))
  }

  const handleDeleteExercise = (exerciseId: number, name: string) => {
    if (window.confirm(`"${name}" wirklich entfernen?`)) {
      deleteExercise.mutate(exerciseId)
    }
  }

  const startEditing = (exercise: PlanExercise) => {
    setEditingExercise({ id: exercise.id, sets: exercise.sets, min_reps: exercise.min_reps, max_reps: exercise.max_reps })
  }

  const saveEditing = () => {
    if (!editingExercise) return
    const sets = Math.max(1, Math.min(20, editingExercise.sets || 1))
    const minReps = Math.max(1, Math.min(100, editingExercise.min_reps || 1))
    const maxReps = Math.max(minReps, Math.min(100, editingExercise.max_reps || minReps))
    updateExercise.mutate({
      exerciseId: editingExercise.id, sets, min_reps: minReps, max_reps: maxReps,
    })
  }

  if (isLoading) {
    return <div className="min-h-screen pb-24 px-6 pt-6 safe-top"><SkeletonList count={4} /></div>
  }

  if (!plan) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
            <img
              src={sculptIcon}
              alt="Sculpt"
              className="w-12 h-12 object-contain opacity-60"
            />
          </div>
          <h2 className="text-xl font-bold mb-2">Kein Trainingsplan</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Schliesse das Onboarding ab, um einen personalisierten Plan zu erhalten
          </p>
          <Button onClick={() => navigate('/onboarding')}>Onboarding starten</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Trainingsplan</h1>
          <Button
            variant={editMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setEditMode(!editMode); setEditingExercise(null); setShowAddExercise(false); setEditingDayId(null); setShowAddDay(false); setEditingPlanName(false) }}
          >
            <Pencil className="w-4 h-4 mr-1" />
            {editMode ? 'Fertig' : 'Bearbeiten'}
          </Button>
        </div>

        {/* Plan name — editable in edit mode */}
        {editMode && editingPlanName ? (
          <div className="flex items-center gap-2">
            <Input
              value={planNameInput}
              onChange={(e) => setPlanNameInput(e.target.value)}
              className="h-9 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && planNameInput.trim()) renamePlan.mutate(planNameInput.trim())
                if (e.key === 'Escape') setEditingPlanName(false)
              }}
            />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { if (planNameInput.trim()) renamePlan.mutate(planNameInput.trim()) }} disabled={renamePlan.isPending}>
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditingPlanName(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Plan switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPlanSwitcher(!showPlanSwitcher)}
                className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <span>{plan.name_de || plan.name}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', showPlanSwitcher && 'rotate-180')} />
              </button>

              {showPlanSwitcher && myPlans && myPlans.length > 0 && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl p-2 z-50 animate-scale-in" style={{ background: 'rgba(10, 10, 12, 0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  {myPlans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (p.id !== planId) switchPlan.mutate(p.id)
                        else setShowPlanSwitcher(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors text-sm',
                        p.id === planId ? 'bg-white/10' : 'hover:bg-white/5'
                      )}
                    >
                      <div>
                        <p className="font-medium">{p.name_de || p.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {p.total_days} Tage · {p.total_exercises} Übungen
                        </p>
                      </div>
                      {p.is_active === 1 && <Check className="w-4 h-4 text-[hsl(var(--primary))]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit mode: rename + delete plan */}
            {editMode && (
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPlanName(true); setPlanNameInput(plan.name_de || plan.name || '') }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {myPlans && myPlans.length > 1 && (
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--destructive))]"
                    onClick={() => {
                      if (window.confirm(`Plan "${plan.name_de || plan.name}" wirklich löschen?`)) {
                        deletePlan.mutate()
                      }
                    }}
                    disabled={deletePlan.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={cn(
          'mx-6 mb-3 px-4 py-2 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200',
          feedback.type === 'success'
            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
            : 'bg-red-500/15 text-red-600 dark:text-red-400'
        )}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Day Tabs */}
      {days.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {days.map((day) => {
              const isActive = effectiveSelectedDayId === day.id
              const isEditingThis = editingDayId === day.id

              if (editMode && isEditingThis) {
                return (
                  <div key={day.id} className="flex items-center gap-1 glass rounded-xl px-3 py-2 min-w-[140px]">
                    <Input
                      value={editingDayName}
                      onChange={(e) => setEditingDayName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingDayName.trim()) {
                          updateDay.mutate({ dayId: day.id, name: editingDayName.trim() })
                        }
                        if (e.key === 'Escape') setEditingDayId(null)
                      }}
                    />
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      onClick={() => {
                        if (editingDayName.trim()) updateDay.mutate({ dayId: day.id, name: editingDayName.trim() })
                      }}
                      disabled={updateDay.isPending}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingDayId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              }

              return (
                <div key={day.id} className="relative group flex items-center">
                  <button
                    onClick={() => { setSelectedDayId(day.id); setEditingExercise(null); setShowAddExercise(false) }}
                    className={cn(
                      'px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 flex flex-col items-start',
                      isActive ? 'gradient-primary text-gray-900' : 'glass glass-hover'
                    )}
                  >
                    <span className="text-xs opacity-80">Tag {day.day_number}</span>
                    <span className="font-semibold">{day.name}</span>
                  </button>
                  {editMode && isActive && (
                    <div className="flex gap-0.5 ml-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditingDayId(day.id); setEditingDayName(day.name) }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--destructive))]"
                        onClick={() => {
                          if (window.confirm(`Tag "${day.name}" wirklich löschen? Alle Übungen werden entfernt.`)) {
                            deleteDay.mutate(day.id)
                          }
                        }}
                        disabled={deleteDay.isPending || days.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Day button in edit mode */}
            {editMode && (
              showAddDay ? (
                <div className="flex items-center gap-1 glass rounded-xl px-3 py-2 min-w-[140px]">
                  <Input
                    placeholder="Tag Name..."
                    value={newDayName}
                    onChange={(e) => setNewDayName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDayName.trim()) addDay.mutate(newDayName.trim())
                      if (e.key === 'Escape') { setShowAddDay(false); setNewDayName('') }
                    }}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => { if (newDayName.trim()) addDay.mutate(newDayName.trim()) }}
                    disabled={addDay.isPending}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setShowAddDay(false); setNewDayName('') }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddDay(true)}
                  className="px-4 py-3 rounded-xl whitespace-nowrap glass glass-hover flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-semibold text-sm">Tag</span>
                </button>
              )
            )}
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {exercises.map((exercise) => (
                  <SortableExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    editMode={editMode}
                    editingExercise={editingExercise}
                    setEditingExercise={setEditingExercise}
                    startEditing={startEditing}
                    saveEditing={saveEditing}
                    updatePending={updateExercise.isPending}
                    handleDeleteExercise={handleDeleteExercise}
                    deletePending={deleteExercise.isPending}
                    onSelect={() => setSelectedExercise({
                      id: exercise.exercise?.id || exercise.id,
                      name: exercise.exercise?.name_de || exercise.exercise?.name || 'Übung',
                      imageUrl: exercise.exercise?.image_url,
                    })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-[hsl(var(--muted-foreground))]">Keine Übungen für diesen Tag</p>
          </div>
        )}

        {/* Add Exercise (edit mode) */}
        {editMode && (
          <div className="mt-4">
            {!showAddExercise ? (
              <Button variant="outline" className="w-full" onClick={() => setShowAddExercise(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Übung hinzufügen
              </Button>
            ) : (
              <div className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Übung hinzufügen</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowAddExercise(false); setExerciseSearch('') }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <Input placeholder="Übung suchen..." value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} className="pl-9" autoFocus />
                  </div>
                  {exerciseSearch.length >= 2 && (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults && searchResults.length > 0 ? (
                        searchResults.map((ex: { id: number; name: string; name_de?: string }) => (
                          <button
                            key={ex.id}
                            onClick={() => addExercise.mutate({ exercise_id: ex.id, sets: 3, min_reps: 8, max_reps: 12 })}
                            disabled={addExercise.isPending}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                          >
                            {ex.name_de || ex.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-2">Keine Ergebnisse</p>
                      )}
                    </div>
                  )}
                  {exerciseSearch.length < 2 && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-2">Mindestens 2 Zeichen eingeben</p>
                  )}
              </div>
            )}
          </div>
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
          history={[]}
        />
      )}
    </div>
  )
}
