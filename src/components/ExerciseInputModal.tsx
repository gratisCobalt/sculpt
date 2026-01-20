import { useState, useEffect, useId } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, MessageSquare, Loader2, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { getCategoryIcon } from '@/components/CategoryIcons'

interface ExerciseInputModalProps {
    isOpen: boolean
    onClose: () => void
    exercise: {
        id: number
        name: string
        name_de?: string | null
        image_url?: string | null
        body_part?: string | null
    }
}

interface WorkoutSet {
    id: string
    weight: string
    reps: string
}

const DEFAULT_SET_COUNT = 3

export function ExerciseInputModal({ isOpen, onClose, exercise }: ExerciseInputModalProps) {
    const queryClient = useQueryClient()
    const baseId = useId()

    const [sets, setSets] = useState<WorkoutSet[]>([])
    const [workoutNote, setWorkoutNote] = useState('')
    const [showNoteInput, setShowNoteInput] = useState(false)

    // DISABLED: Fetch last workout data - commented out for performance
    // const { data: lastWorkout, isLoading: lastWorkoutLoading } = useQuery({
    //   queryKey: ['exerciseLastWorkout', exercise.id],
    //   queryFn: () => api.getExerciseLastWorkout(exercise.id),
    //   enabled: isOpen,
    // })

    // Initialize sets - always default to 3 sets
    useEffect(() => {
        if (!isOpen) return

        // DISABLED: Previous workout-based set count
        // if (lastWorkout?.sets && Object.keys(lastWorkout.sets).length > 0) {
        //   const lastSets = Object.entries(lastWorkout.sets)
        //     .sort(([a], [b]) => parseInt(a) - parseInt(b))
        //     .map((_, index) => ({
        //       id: `${baseId}-${index}`,
        //       weight: '',
        //       reps: '',
        //     }))
        //   setSets(lastSets)
        // } else {
        setSets(
            Array.from({ length: DEFAULT_SET_COUNT }, (_, i) => ({
                id: `${baseId}-${i}`,
                weight: '',
                reps: '',
            }))
        )
        // }
        setWorkoutNote('')
        setShowNoteInput(false)
    }, [isOpen, baseId])

    // Save workout mutation
    const saveWorkoutMutation = useMutation({
        mutationFn: async () => {
            const validSets = sets.filter(s => s.weight || s.reps)
            if (validSets.length === 0) return

            await api.createWorkout({
                sets: validSets.map((set, index) => {
                    return {
                        exercise_id: exercise.id,
                        set_number: index + 1,
                        weight_kg: parseFloat(set.weight) || 0,
                        reps: parseInt(set.reps) || 0,
                    }
                }),
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exerciseProgress'] })
            queryClient.invalidateQueries({ queryKey: ['weeklyStats'] })
            queryClient.invalidateQueries({ queryKey: ['exerciseLastWorkout', exercise.id] })
            onClose()
        },
    })

    const addSet = () => {
        setSets(prev => [
            ...prev,
            { id: `${baseId}-${Date.now()}`, weight: '', reps: '' },
        ])
    }

    const removeSet = (id: string) => {
        if (sets.length <= 1) return
        setSets(prev => prev.filter(s => s.id !== id))
    }

    const updateSet = (id: string, field: keyof WorkoutSet, value: string) => {
        setSets(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)))
    }

    const handleSave = () => {
        saveWorkoutMutation.mutate()
    }

    if (!isOpen) return null

    const exerciseName = exercise.name_de || exercise.name

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 mb-20 sm:mb-4 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden animate-slide-up shadow-2xl flex flex-col max-h-[85vh]">

                {/* Large Header Image */}
                <div className="w-full aspect-square bg-[hsl(var(--surface-strong))] relative shrink-0 flex items-center justify-center">
                    {exercise.image_url ? (
                        <img
                            src={exercise.image_url}
                            alt={exerciseName}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
                        </div>
                    )}
                    {/* Close Button Overlay */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Header (Title & Actions) */}
                <div className="flex items-center gap-4 p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h2 className="font-bold text-xl truncate">{exerciseName}</h2>
                        {exercise.body_part && (() => {
                            const Icon = getCategoryIcon(exercise.body_part)
                            return <Icon className="w-5 h-5 text-[hsl(var(--primary))] flex-shrink-0" />
                        })()}
                    </div>

                    {/* Note Button */}
                    <button
                        onClick={() => setShowNoteInput(!showNoteInput)}
                        className={`p-2 rounded-full transition-colors ${showNoteInput || workoutNote
                            ? 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                            : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-strong))]'
                            }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>
                </div>

                {/* Global Note Input */}
                {showNoteInput && (
                    <div className="px-4 py-3 bg-[hsl(var(--surface-soft))] border-b border-[hsl(var(--border))]">
                        <Input
                            placeholder="Notiz hinzufügen..."
                            value={workoutNote}
                            onChange={(e) => setWorkoutNote(e.target.value)}
                            className="h-10 text-sm bg-[hsl(var(--background))]"
                            autoFocus
                        />
                    </div>
                )}

                {/* Content */}
                <div className="p-4 max-h-[50vh] overflow-y-auto bg-[hsl(var(--background))]">
                    <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3">
                        Sätze
                    </h3>

                    <div className="space-y-2">
                        {sets.map((set, index) => (
                            <div
                                key={set.id}
                                className="flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--surface-soft))]"
                            >
                                {/* Set Number */}
                                <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-[hsl(var(--primary))]">{index + 1}</span>
                                </div>

                                {/* Weight Input with inline unit */}
                                <div className="flex-1 relative">
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={set.weight}
                                        onChange={(e) => updateSet(set.id, 'weight', e.target.value)}
                                        className="h-10 text-center text-sm pr-8 bg-[hsl(var(--background))]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] pointer-events-none">
                                        kg
                                    </span>
                                </div>

                                {/* Reps Input with inline unit */}
                                <div className="flex-1 relative">
                                    <Input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={set.reps}
                                        onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                                        className="h-10 text-center text-sm pr-10 bg-[hsl(var(--background))]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] pointer-events-none">
                                        Reps
                                    </span>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => removeSet(set.id)}
                                    disabled={sets.length <= 1}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* Add Set Button */}
                        <button
                            onClick={addSet}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Satz hinzufügen</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 bg-[hsl(var(--surface-soft))] border-t border-[hsl(var(--border))]">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        Abbrechen
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSave}
                        disabled={saveWorkoutMutation.isPending}
                    >
                        {saveWorkoutMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Speichern'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
