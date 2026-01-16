import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { SkeletonList } from '@/components/ui/loader'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface Exercise {
  id: number
  name: string
  description?: string
  image_url?: string
  primary_category?: string
}

export default function AddWorkoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [notes, setNotes] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [currentSetNumber, setCurrentSetNumber] = useState(1)

  // Fetch exercises from API
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', searchQuery],
    queryFn: () => api.getExercises({ search: searchQuery, limit: 20 }),
  })

  // Letzte Workout-Daten für gewählte Übung holen (für Placeholder)
  const { data: lastWorkoutData } = useQuery({
    queryKey: ['exerciseLastWorkout', selectedExercise?.id],
    queryFn: () => api.getExerciseLastWorkout(selectedExercise!.id),
    enabled: !!selectedExercise?.id,
  })

  // Placeholder-Werte basierend auf aktuellem Satz
  const lastSetData = lastWorkoutData?.sets?.[currentSetNumber]
  const weightPlaceholder = lastSetData ? `${lastSetData.weight}` : '0'
  const repsPlaceholder = lastSetData ? `${lastSetData.reps}` : '0'

  // Select exercise handler
  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setSearchQuery('')
    setCurrentSetNumber(1)
  }

  // Save workout - for now just show success
  const saveWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExercise?.id || !user?.id) throw new Error('Missing data')
      // TODO: Implement actual save via API
      return Promise.resolve()
    },
    onSuccess: () => {
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['workoutStats'] })
      queryClient.invalidateQueries({ queryKey: ['exerciseProgress'] })

      setTimeout(() => {
        setShowSuccess(false)
        setSelectedExercise(null)
        setWeight('')
        setReps('')
        setNotes('')
      }, 1500)
    },
  })

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 safe-top safe-bottom">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 gradient-shadow">
            <Check className="w-10 h-10 text-gray-900" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Gespeichert!</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            Workout wurde aufgezeichnet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workout hinzufügen</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Exercise Selection */}
      {!selectedExercise ? (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <Input
              type="text"
              placeholder="Übung suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>

          {/* Exercise List */}
          {isLoading ? (
            <SkeletonList count={5} />
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise: Exercise) => (
                <Card
                  key={exercise.id}
                  className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
                  onClick={() => handleSelectExercise(exercise)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    {exercise.image_url && (
                      <img
                        src={exercise.image_url}
                        alt={exercise.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{exercise.name}</h3>
                      {exercise.primary_category && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {exercise.primary_category}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* No results */}
              {exercises.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-[hsl(var(--muted-foreground))]">
                      {searchQuery ? 'Keine Übung gefunden' : 'Suche nach einer Übung...'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        /* Workout Form */
        <>
          {/* Selected Exercise */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedExercise.image_url && (
                    <img
                      src={selectedExercise.image_url}
                      alt={selectedExercise.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{selectedExercise.name}</h3>
                    {selectedExercise.primary_category && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {selectedExercise.primary_category}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedExercise(null)}
                >
                  Ändern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
                Gewicht (kg) - Satz {currentSetNumber}
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

            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
                Notizen (optional)
              </label>
              <Input
                type="text"
                placeholder="z.B. langsame Ausführung..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={() => saveWorkoutMutation.mutate()}
            disabled={!weight || !reps || saveWorkoutMutation.isPending}
          >
            {saveWorkoutMutation.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </>
      )}
    </div>
  )
}
