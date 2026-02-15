import { useState, useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, Dumbbell, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ExerciseInputModal } from '@/components/ExerciseInputModal'
import { getCategoryIcon } from '@/components/CategoryIcons'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

const ITEMS_PER_PAGE = 20

const categories = [
  { id: 'all', name: 'Alle' },
  { id: 'chest', name: 'Brust' },
  { id: 'back', name: 'Rücken' },
  { id: 'upper_arms', name: 'Arme' },
  { id: 'shoulders', name: 'Schultern' },
  { id: 'upper_legs', name: 'Beine' },
  { id: 'waist', name: 'Bauch' },
]



// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

interface Exercise {
  id: number
  external_id: string
  name: string
  name_de: string | null
  image_url: string | null
  video_url: string | null
  body_part: string | null
  body_part_name: string | null
}

export default function AddWorkoutPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Infinite Query for exercises
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['exercises', debouncedSearch, selectedCategory],
    queryFn: async ({ pageParam = 1 }) => {
      return api.getExercisesPaginated({
        search: debouncedSearch || undefined,
        bodyPart: selectedCategory !== 'all' ? selectedCategory : undefined,
        page: pageParam,
        limit: ITEMS_PER_PAGE,
      })
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    initialPageParam: 1,
  })

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  // Flatten all pages into single array
  const exercises = data?.pages.flatMap((page) => page.exercises) ?? []
  const totalCount = data?.pages[0]?.pagination.total ?? 0

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
  }




  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-1">Workout hinzufügen</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Wähle eine Übung aus
        </p>
      </div>

      {/* Search Input */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <Input
            type="text"
            placeholder="Suche nach Übungen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-6 mb-6">
        <div
          className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 active:scale-95',
                selectedCategory === cat.id
                  ? 'gradient-primary text-gray-900 shadow-lg'
                  : 'bg-[hsl(var(--surface-soft))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-strong))] active:bg-[hsl(var(--surface-strong))]'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <div className="px-6 mb-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {totalCount} {totalCount === 1 ? 'Übung' : 'Übungen'} gefunden
          </p>
        </div>
      )}

      {/* Exercise Grid */}
      <div className="px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[hsl(var(--primary))] animate-spin mb-3" />
            <p className="text-[hsl(var(--muted-foreground))]">Lade Übungen...</p>
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-400">Fehler beim Laden der Übungen</p>
            </CardContent>
          </Card>
        ) : exercises.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Dumbbell className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))]">
                Keine Übungen gefunden
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {exercises.map((ex) => {


                return (
                  <Card
                    key={ex.id}
                    className="cursor-pointer overflow-hidden p-0 hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => handleExerciseClick(ex as Exercise)}
                  >
                    <CardContent className="p-0">
                      {/* Exercise Image with Badge Overlay */}
                      <div className="aspect-[4/3] bg-[hsl(var(--surface-strong))] relative overflow-hidden">
                        {ex.image_url ? (
                          <img
                            src={ex.image_url}
                            alt={ex.name_de || ex.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                          </div>
                        )}


                      </div>

                      {/* Exercise Info */}
                      <div className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-medium text-sm line-clamp-2 leading-tight flex-1">
                            {ex.name_de || ex.name}
                          </h3>
                          {(() => {
                            const CategoryIcon = getCategoryIcon(ex.body_part)
                            return <CategoryIcon className="w-5 h-5 text-[hsl(var(--primary))] flex-shrink-0" />
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Exercise Input Modal */}
      {selectedExercise && (
        <ExerciseInputModal
          isOpen={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
          exercise={{
            id: selectedExercise.id,
            name: selectedExercise.name,
            name_de: selectedExercise.name_de,
            image_url: selectedExercise.image_url,
            body_part: selectedExercise.body_part,
          }}
        />
      )}
    </div>
  )
}
