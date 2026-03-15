import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Users,
  Calendar,
  Target,
  Award,
  Scale,
  Crosshair,
  ChevronRight,
  ChevronLeft,
  Check,
  Cake,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { ConfettiCelebration } from '@/components/ConfettiCelebration'
import { api } from '@/lib/api'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const genderOptions = [
  { value: 1, label: 'Männlich', icon: '♂️' },
  { value: 2, label: 'Weiblich', icon: '♀️' },
  { value: 3, label: 'Divers', icon: '⚧️' },
]

const frequencyOptions = ['1', '2', '3', '4', '5', '6', '7+']

const goalOptions = [
  { value: 'muscle_gain', label: 'Muskelaufbau', icon: '💪' },
  { value: 'weight_loss', label: 'Abnehmen', icon: '🔥' },
  { value: 'strength', label: 'Kraft steigern', icon: '⚡' },
  { value: 'endurance', label: 'Ausdauer', icon: '🏃' },
  { value: 'health', label: 'Gesundheit', icon: '❤️' },
]

const experienceOptions = [
  { value: 'beginner', label: 'Anfänger', description: 'Weniger als 6 Monate' },
  { value: 'intermediate', label: 'Gelegentlich', description: '6 Monate - 2 Jahre' },
  { value: 'advanced', label: 'Erfahren', description: 'Mehr als 2 Jahre' },
]

const focusAreas = [
  { value: 'chest', label: 'Brust' },
  { value: 'back', label: 'Rücken' },
  { value: 'upper_arms', label: 'Arme' },
  { value: 'shoulders', label: 'Schultern' },
  { value: 'upper_legs', label: 'Beine' },
  { value: 'waist', label: 'Bauch' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, updateProfile, refreshProfile } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // AI Plan generation state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<number | null>(null)
  const [birthdate, setBirthdate] = useState('')
  const [frequency, setFrequency] = useState('')
  const [goal, setGoal] = useState('')
  const [experience, setExperience] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([])

  const computedAge = useMemo(() => {
    if (!birthdate) return 0
    const now = new Date()
    return Math.floor((now.getTime() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }, [birthdate])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return displayName.trim().length >= 2
      case 2:
        return gender !== null
      case 3:
        return birthdate !== '' && new Date(birthdate) < new Date()
      case 4:
        return frequency !== ''
      case 5:
        return goal !== ''
      case 6:
        return experience !== ''
      case 7:
        return bodyWeight !== '' && parseFloat(bodyWeight) > 0
      case 8:
        return selectedFocusAreas.length > 0
      default:
        return false
    }
  }, [step, displayName, gender, birthdate, frequency, goal, experience, bodyWeight, selectedFocusAreas])

  const handleNext = () => {
    if (step < 8) {
      setStep((prev) => (prev + 1) as Step)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step)
    }
  }

  const handleComplete = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      // Update user profile first
      await updateProfile({
        display_name: displayName,
        gender_id: gender,
        birthdate: birthdate || null,
        training_frequency_per_week: parseInt(frequency.replace('+', '')) || 3,
        fitness_goal: goal,
        experience_level: experience,
        body_weight_kg: parseFloat(bodyWeight),
        onboarding_completed: true,
      } as Record<string, unknown>)

      // Start AI plan generation
      setIsLoading(false)
      setIsGeneratingPlan(true)
      setGenerationProgress(0)
      setGenerationError(null)

      // Fake progress animation: 0-80% fast (2s), 80-95% slower
      let progress = 0
      progressIntervalRef.current = setInterval(() => {
        if (progress < 80) {
          progress += 4 // 0-80 in ~2s
        } else if (progress < 95) {
          progress += 0.5 // 80-95 in ~3s
        }
        setGenerationProgress(Math.min(progress, 95))
      }, 100)

      // Set 20s timeout
      timeoutRef.current = setTimeout(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        setGenerationError('Trainingsplan konnte nicht erstellt werden. Bitte versuche es später erneut oder kontaktiere den Support unter info@sculpt-app.de')
        setIsGeneratingPlan(false)
      }, 20000)

      // Call API to generate training plan
      await api.generateTrainingPlan({
        fitness_goal: goal,
        experience_level: experience,
        training_frequency: parseInt(frequency.replace('+', '')) || 3,
        focus_areas: selectedFocusAreas,
        body_weight_kg: parseFloat(bodyWeight) || undefined,
      })

      // Clear timeout and interval
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

      // Complete progress to 100%
      setGenerationProgress(100)

      // Show confetti after brief delay
      setTimeout(() => {
        setShowConfetti(true)

        // Refresh profile and navigate after animation
        refreshProfile().then(() => {
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        })
      }, 500)
    } catch (error) {
      console.error('Error completing onboarding:', error)

      // Clear timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

      // If we were generating plan, show error
      if (isGeneratingPlan) {
        setGenerationError('Trainingsplan konnte nicht erstellt werden. Bitte versuche es später erneut oder kontaktiere den Support unter info@sculpt-app.de')
        setIsGeneratingPlan(false)
      } else {
        setIsLoading(false)
      }
    }
  }

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const stepIcons = [User, Users, Cake, Calendar, Target, Award, Scale, Crosshair]
  const StepIcon = stepIcons[step - 1]

  // AI Plan Generation Loading Screen
  if (isGeneratingPlan || generationError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 safe-top safe-bottom">
        {showConfetti && <ConfettiCelebration />}

        {generationError ? (
          // Error State
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-[hsl(var(--destructive))]" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Fehler</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">
              {generationError}
            </p>
            <Button
              size="lg"
              onClick={() => {
                setGenerationError(null)
                navigate('/dashboard')
              }}
            >
              Zum Dashboard
            </Button>
          </div>
        ) : (
          // Loading State with Fake Progress
          <div className="text-center w-full max-w-md">
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-8 gradient-shadow">
              <Loader2 className="w-12 h-12 text-gray-900 animate-spin" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Dein Trainingsplan wird erstellt</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">
              Unsere KI erstellt einen personalisierten Plan basierend auf deinen Angaben...
            </p>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-[hsl(var(--surface-soft))] rounded-full overflow-hidden mb-4">
              <div
                className="h-full gradient-primary transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {generationProgress < 30 && 'Analysiere deine Ziele...'}
              {generationProgress >= 30 && generationProgress < 60 && 'Wähle passende Übungen aus...'}
              {generationProgress >= 60 && generationProgress < 90 && 'Optimiere deinen Plan...'}
              {generationProgress >= 90 && 'Fast fertig...'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 safe-top safe-bottom" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
      {showConfetti && <ConfettiCelebration />}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Schritt {step} von 8
          </span>
          <span className="text-sm font-medium text-[hsl(var(--primary))]">
            {Math.round((step / 8) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-[hsl(var(--surface-soft))] rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-soft))] flex items-center justify-center animate-scale-in">
            <StepIcon className="w-8 h-8 text-[hsl(var(--primary))]" />
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Wie sollen wir dich nennen?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Dieser Name wird in der App angezeigt
            </p>
            <Input
              type="text"
              placeholder="Dein Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-center text-lg h-14"
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Gender */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Dein Geschlecht
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Für personalisierte Trainingsempfehlungen
            </p>
            <div className="space-y-3">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGender(option.value)}
                  className={cn(
                    'w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-200',
                    gender === option.value ? 'glass-active' : 'glass glass-hover'
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  {gender === option.value && (
                    <Check className="w-5 h-5 text-[hsl(var(--primary))] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Birthdate */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Wann wurdest du geboren?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Für altersgerechte Empfehlungen
            </p>
            <Input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="text-center text-lg h-14"
              max={new Date().toISOString().split('T')[0]}
            />
            {birthdate && (
              <p className="text-center mt-4 text-[hsl(var(--muted-foreground))]">
                {computedAge} Jahre alt
              </p>
            )}
          </div>
        )}

        {/* Step 4: Training Frequency */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Wie oft trainierst du?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Tage pro Woche
            </p>
            <div className="grid grid-cols-4 gap-3">
              {frequencyOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setFrequency(option)}
                  className={cn(
                    'h-14 rounded-xl font-semibold transition-all duration-200',
                    frequency === option
                      ? 'gradient-primary text-gray-900 gradient-shadow'
                      : 'glass glass-hover'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Fitness Goal */}
        {step === 5 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Was ist dein Ziel?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Wähle dein primäres Fitnessziel
            </p>
            <div className="space-y-3">
              {goalOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGoal(option.value)}
                  className={cn(
                    'w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-200',
                    goal === option.value ? 'glass-active' : 'glass glass-hover'
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  {goal === option.value && (
                    <Check className="w-5 h-5 text-[hsl(var(--primary))] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Experience */}
        {step === 6 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Deine Erfahrung?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Wie lange trainierst du schon?
            </p>
            <div className="space-y-3">
              {experienceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExperience(option.value)}
                  className={cn(
                    'w-full p-4 rounded-xl text-left transition-all duration-200',
                    experience === option.value ? 'glass-active' : 'glass glass-hover'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {option.description}
                      </p>
                    </div>
                    {experience === option.value && (
                      <Check className="w-5 h-5 text-[hsl(var(--primary))]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Body Weight */}
        {step === 7 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Dein Körpergewicht?
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Für bessere Trainingsempfehlungen
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="75"
                value={bodyWeight}
                onChange={(e) => setBodyWeight(e.target.value)}
                className="text-center text-3xl h-20 pr-16"
                autoFocus
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-lg">
                kg
              </span>
            </div>
          </div>
        )}

        {/* Step 8: Focus Areas */}
        {step === 8 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-2">
              Fokus-Bereiche
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center mb-8">
              Welche Muskelgruppen möchtest du besonders trainieren?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {focusAreas.map((area) => (
                <button
                  key={area.value}
                  onClick={() => toggleFocusArea(area.value)}
                  className={cn(
                    'p-4 rounded-xl font-semibold transition-all duration-200',
                    selectedFocusAreas.includes(area.value)
                      ? 'gradient-primary text-gray-900 gradient-shadow'
                      : 'glass glass-hover'
                  )}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <Button variant="secondary" size="lg" onClick={handleBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          onClick={handleNext}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            'Wird gespeichert...'
          ) : step === 8 ? (
            'Los geht\'s!'
          ) : (
            <>
              Weiter
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
