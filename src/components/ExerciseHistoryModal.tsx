import { useState } from 'react'
import { X, Trash2, Edit3, Save, Calendar, Weight, Repeat, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface ExerciseSet {
  id: number
  date: string
  weight: number
  reps: number
  setNumber: number
  isWarmup: boolean
  isPR: boolean
}

interface ExerciseHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseId: number
  exerciseName: string
  imageUrl?: string
  history: ExerciseSet[]
}

export function ExerciseHistoryModal({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  imageUrl,
  history,
}: ExerciseHistoryModalProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [showAllHistory, setShowAllHistory] = useState(false)

  // Group history by date
  const groupedHistory = history.reduce((acc, set) => {
    const date = new Date(set.date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(set)
    return acc
  }, {} as Record<string, ExerciseSet[]>)

  // Nur letztes Training anzeigen wenn nicht "mehr anzeigen" aktiv
  const historyEntries = Object.entries(groupedHistory)
  const visibleHistory = showAllHistory ? historyEntries : historyEntries.slice(0, 1)

  const deleteSetMutation = useMutation({
    mutationFn: (setId: number) => api.deleteWorkoutSet(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseProgress'] })
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', exerciseId] })
    },
  })

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, weight, reps }: { setId: number; weight: number; reps: number }) =>
      api.updateWorkoutSet(setId, { weight_kg: weight, reps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseProgress'] })
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', exerciseId] })
      setEditingId(null)
    },
  })

  const handleEdit = (set: ExerciseSet) => {
    setEditingId(set.id)
    setEditWeight(set.weight.toString())
    setEditReps(set.reps.toString())
  }

  const handleSave = (setId: number) => {
    const weight = parseFloat(editWeight)
    const reps = parseInt(editReps)
    if (!isNaN(weight) && !isNaN(reps)) {
      updateSetMutation.mutate({ setId, weight, reps })
    }
  }

  const handleDelete = (setId: number) => {
    if (confirm('Diesen Satz wirklich löschen?')) {
      deleteSetMutation.mutate(setId)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[428px] max-h-[85vh] bg-[hsl(var(--background))] rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {imageUrl && (
                <div className="w-12 h-12 rounded-lg bg-[hsl(var(--surface-strong))] overflow-hidden">
                  <img src={imageUrl} alt={exerciseName} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">{exerciseName}</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {history.length} Sätze insgesamt
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 pb-8 max-h-[calc(85vh-80px)]">
          {Object.entries(groupedHistory).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[hsl(var(--muted-foreground))]">
                Noch keine Einträge für diese Übung
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleHistory.map(([date, sets]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                      {date}
                    </span>
                  </div>

                  {/* Sets for this date */}
                  <div className="space-y-2">
                    {sets.map((set) => (
                      <Card key={set.id} className={cn(set.isPR && 'ring-1 ring-[hsl(var(--primary))]')}>
                        <CardContent className="p-3">
                          {editingId === set.id ? (
                            /* Edit Mode */
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Weight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                  <Input
                                    type="number"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    className="w-20 h-8"
                                  />
                                  <span className="text-sm text-[hsl(var(--muted-foreground))]">kg</span>
                                </div>
                                <span className="text-[hsl(var(--muted-foreground))]">×</span>
                                <div className="flex items-center gap-1">
                                  <Repeat className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                  <Input
                                    type="number"
                                    value={editReps}
                                    onChange={(e) => setEditReps(e.target.value)}
                                    className="w-16 h-8"
                                  />
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSave(set.id)}
                                disabled={updateSetMutation.isPending}
                              >
                                <Save className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            /* View Mode */
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-[hsl(var(--muted-foreground))] w-16">
                                  {set.isWarmup ? 'Warmup' : `Satz ${set.setNumber}`}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{set.weight} kg</span>
                                  <span className="text-[hsl(var(--muted-foreground))]">×</span>
                                  <span className="font-semibold">{set.reps}</span>
                                  {set.isPR && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">
                                      PR
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(set)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-500 hover:text-red-400"
                                  onClick={() => handleDelete(set.id)}
                                  disabled={deleteSetMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* "Mehr anzeigen" Button wenn mehr als 1 Training vorhanden */}
              {historyEntries.length > 1 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      {historyEntries.length - 1} weitere Trainings anzeigen
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
