import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  X,
  Edit3,
  Save,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { TrainingPlan, TrainingPlanDay, TrainingPlanExercise } from '@/types/database'

interface TrainingPlanExerciseWithMachine extends TrainingPlanExercise {
  machine: { id: string; name: string } | null
  exercise_name?: string
  exercise?: { id: number; name: string; name_de: string | null }
}

// Modal for adding/editing exercises
interface ExerciseModalProps {
  isOpen: boolean
  onClose: () => void
  dayId: number
  exercise?: TrainingPlanExerciseWithMachine | null
  onSuccess: () => void
}

function ExerciseModal({ isOpen, onClose, dayId, exercise, onSuccess }: ExerciseModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<{ id: number; name: string } | null>(
    exercise?.exercise ? { id: exercise.exercise.id, name: exercise.exercise.name_de || exercise.exercise.name } : null
  )
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3')
  const [minReps, setMinReps] = useState(exercise?.min_reps?.toString() || '8')
  const [maxReps, setMaxReps] = useState(exercise?.max_reps?.toString() || '12')
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds?.toString() || '90')
  const [notes, setNotes] = useState(exercise?.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  // Search exercises
  const { data: searchResults = [] } = useQuery({
    queryKey: ['exerciseSearch', searchQuery],
    queryFn: () => api.getExercises({ search: searchQuery, limit: 20 }),
    enabled: searchQuery.length >= 2 && !selectedExercise,
  })

  const handleSave = async () => {
    if (!selectedExercise || !supabase) return

    setIsSaving(true)
    try {
      if (exercise) {
        // Update existing
        await supabase
          .from('training_plan_exercise')
          .update({
            exercise_id: selectedExercise.id,
            sets: parseInt(sets),
            min_reps: parseInt(minReps),
            max_reps: parseInt(maxReps),
            rest_seconds: parseInt(restSeconds),
            notes: notes || null,
          })
          .eq('id', exercise.id)
      } else {
        // Get next order index
        const { data: existingExercises } = await supabase
          .from('training_plan_exercise')
          .select('order_index')
          .eq('training_plan_day_id', dayId)
          .order('order_index', { ascending: false })
          .limit(1)

        const nextOrder = (existingExercises?.[0]?.order_index || 0) + 1

        // Insert new
        await supabase.from('training_plan_exercise').insert({
          training_plan_day_id: dayId,
          exercise_id: selectedExercise.id,
          order_index: nextOrder,
          sets: parseInt(sets),
          min_reps: parseInt(minReps),
          max_reps: parseInt(maxReps),
          rest_seconds: parseInt(restSeconds),
          notes: notes || null,
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving exercise:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold">
            {exercise ? 'Übung bearbeiten' : 'Übung hinzufügen'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[hsl(var(--surface-soft))]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Exercise Selection */}
          {!selectedExercise ? (
            <div className="mb-4">
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Übung suchen</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Übung suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border))]">
                  {searchResults.map((ex: any) => (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise({ id: ex.id, name: ex.name_de || ex.name })}
                      className="w-full p-3 text-left hover:bg-[hsl(var(--surface-soft))] transition-colors border-b border-[hsl(var(--border))] last:border-b-0"
                    >
                      <span className="font-medium">{ex.name_de || ex.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-xl bg-[hsl(var(--surface-soft))] flex items-center justify-between">
              <span className="font-medium">{selectedExercise.name}</span>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-sm text-[hsl(var(--primary))]"
              >
                Ändern
              </button>
            </div>
          )}

          {/* Sets & Reps */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Sätze</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Pause (Sek.)</label>
              <Input
                type="number"
                min="30"
                max="300"
                step="15"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Min. Wdh.</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={minReps}
                onChange={(e) => setMinReps(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Max. Wdh.</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={maxReps}
                onChange={(e) => setMaxReps(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Notizen (optional)</label>
            <Input
              placeholder="z.B. langsame Ausführung"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--border))]">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={!selectedExercise || isSaving}
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Modal for adding a new day
interface AddDayModalProps {
  isOpen: boolean
  onClose: () => void
  planId: number
  existingDaysCount: number
  onSuccess: () => void
}

function AddDayModal({ isOpen, onClose, planId, existingDaysCount, onSuccess }: AddDayModalProps) {
  const [dayName, setDayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!dayName.trim() || !supabase) return

    setIsSaving(true)
    try {
      await supabase.from('training_plan_day').insert({
        training_plan_id: planId,
        day_number: existingDaysCount + 1,
        name: dayName.trim(),
        name_de: dayName.trim(),
      })

      onSuccess()
      onClose()
      setDayName('')
    } catch (error) {
      console.error('Error adding day:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold">Tag hinzufügen</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[hsl(var(--surface-soft))]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">Name des Tages</label>
          <Input
            placeholder="z.B. Push, Pull, Legs..."
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-[hsl(var(--border))]">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={!dayName.trim() || isSaving}
          >
            <Plus className="w-5 h-5 mr-2" />
            {isSaving ? 'Speichern...' : 'Tag hinzufügen'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TrainingPlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)
  
  // Modal states
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<TrainingPlanExerciseWithMachine | null>(null)
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false)

  // Fetch training plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['trainingPlans', user?.id],
    queryFn: async () => {
      if (!user?.id || !supabase) return []

      const { data, error } = await supabase
        .from('training_plan_relation')
        .select('*')
        .eq('created_by_id', user.id)
        .eq('is_active', true)
        .order('created_date', { ascending: false })

      if (error) throw error
      return data as TrainingPlan[]
    },
    enabled: !!user?.id,
  })

  // Set initial selected plan
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id)
    }
  }, [plans, selectedPlanId])

  // Fetch days for selected plan
  const { data: days, isLoading: daysLoading } = useQuery({
    queryKey: ['trainingPlanDays', selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId || !supabase) return []

      const { data, error } = await supabase
        .from('training_plan_day')
        .select('*')
        .eq('training_plan_id', selectedPlanId)
        .eq('is_active', true)
        .order('day_number', { ascending: true })

      if (error) throw error
      return data as TrainingPlanDay[]
    },
    enabled: !!selectedPlanId,
  })

  // Set initial selected day
  useEffect(() => {
    if (days && days.length > 0 && !selectedDayId) {
      setSelectedDayId(days[0].id)
    }
  }, [days, selectedDayId])

  // Fetch exercises for selected day
  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ['trainingPlanExercises', selectedDayId],
    queryFn: async () => {
      if (!selectedDayId || !supabase) return []

      const { data, error } = await supabase
        .from('training_plan_exercise')
        .select(`
          *,
          machine:machine_id (
            id,
            name
          )
        `)
        .eq('training_plan_day_id', selectedDayId)
        .order('sequence', { ascending: true })

      if (error) throw error
      return data as TrainingPlanExerciseWithMachine[]
    },
    enabled: !!selectedDayId,
  })

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: number) => {
      if (!supabase) throw new Error('Supabase not initialized')
      const { error } = await supabase
        .from('training_plan_exercise')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPlanExercises', selectedDayId] })
    },
  })

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId)
  const isLoading = plansLoading || daysLoading || exercisesLoading

  if (plansLoading) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top">
        <SkeletonList count={4} />
      </div>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Kein Trainingsplan</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Schließe das Onboarding ab, um einen personalisierten Plan zu erhalten
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
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-2">Trainingsplan</h1>

        {/* Plan Selector */}
        {plans.length > 1 && (
          <div className="relative mb-4">
            <select
              value={selectedPlanId || ''}
              onChange={(e) => setSelectedPlanId(Number(e.target.value))}
              className="w-full h-12 px-4 pr-10 rounded-xl bg-[hsl(var(--surface-soft))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] appearance-none cursor-pointer"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))] pointer-events-none" />
          </div>
        )}

        {selectedPlan?.description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {selectedPlan.description}
          </p>
        )}
      </div>

      {/* Day Tabs */}
      {days && days.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  'px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 flex flex-col items-start',
                  selectedDayId === day.id
                    ? 'gradient-primary text-gray-900'
                    : 'glass glass-hover'
                )}
              >
                <span className="text-xs opacity-80">Tag {day.day_number}</span>
                <span className="font-semibold">{day.name}</span>
              </button>
            ))}
            {/* Add Day Button */}
            <button
              onClick={() => setIsAddDayModalOpen(true)}
              className="px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 flex items-center justify-center glass glass-hover min-w-[60px]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Start Training Button */}
      <div className="px-6 mb-6">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(`/guided-training?dayId=${selectedDayId}`)}
          disabled={!selectedDayId || !exercises?.length}
        >
          <Play className="w-5 h-5 mr-2" />
          Training starten
        </Button>
      </div>

      {/* Exercises */}
      <div className="px-6">
        <h2 className="text-lg font-semibold mb-4">Übungen</h2>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : exercises && exercises.length > 0 ? (
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <Card key={exercise.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-[hsl(var(--muted-foreground))]">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <button
                      className="flex-1 text-left"
                      onClick={() => {
                        setEditingExercise(exercise)
                        setIsExerciseModalOpen(true)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <h3 className="font-semibold">
                          {exercise.machine?.name || exercise.exercise_name || 'Übung'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 ml-8 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        <span>{exercise.sets} Sätze</span>
                        <span>•</span>
                        <span>{exercise.min_reps}-{exercise.max_reps} Wdh.</span>
                        <span>•</span>
                        <span>{exercise.rest_seconds}s Pause</span>
                      </div>
                      {exercise.notes && (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 ml-8 italic">
                          {exercise.notes}
                        </p>
                      )}
                    </button>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingExercise(exercise)
                          setIsExerciseModalOpen(true)
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[hsl(var(--destructive))]"
                        onClick={() => deleteExerciseMutation.mutate(exercise.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
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

        {/* Add Exercise Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            setEditingExercise(null)
            setIsExerciseModalOpen(true)
          }}
          disabled={!selectedDayId}
        >
          <Plus className="w-5 h-5 mr-2" />
          Übung hinzufügen
        </Button>
      </div>

      {/* Modals */}
      <ExerciseModal
        isOpen={isExerciseModalOpen}
        onClose={() => {
          setIsExerciseModalOpen(false)
          setEditingExercise(null)
        }}
        dayId={selectedDayId || 0}
        exercise={editingExercise}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trainingPlanExercises', selectedDayId] })
        }}
      />

      <AddDayModal
        isOpen={isAddDayModalOpen}
        onClose={() => setIsAddDayModalOpen(false)}
        planId={selectedPlanId || 0}
        existingDaysCount={days?.length || 0}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trainingPlanDays', selectedPlanId] })
        }}
      />
    </div>
  )
}
