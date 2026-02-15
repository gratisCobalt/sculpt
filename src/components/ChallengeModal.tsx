import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Users, Swords, Timer, Zap, Dumbbell, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { ChallengeType } from '@/lib/api'

interface ChallengeModalProps {
  buddy: any
  buddies: any[]
  onClose: () => void
  onSuccess: () => void
}

const DURATION_PRESETS = [
  { id: '1h', label: '1 Stunde', xp: 50 },
  { id: '1d', label: '1 Tag', xp: 100 },
  { id: 'week', label: 'Bis Wochenende', xp: 250 },
  { id: 'custom', label: 'Eigener Zeitraum', xp: 150 },
]

const CHALLENGE_TYPE_ICONS: Record<string, any> = {
  total_volume: TrendingUp,
  workout_count: Dumbbell,
  exercise_volume: Target,
}

export default function ChallengeModal({ buddy, buddies, onClose, onSuccess }: ChallengeModalProps) {
  const [step, setStep] = useState<'type' | 'duration' | 'wager' | 'confirm'>('type')
  const [selectedBuddy, setSelectedBuddy] = useState(buddy)
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string>('1d')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [wagerCoins, setWagerCoins] = useState<number>(0)

  // Fetch challenge types
  const { data: challengeTypes = [] } = useQuery({
    queryKey: ['challengeTypes'],
    queryFn: () => api.getChallengeTypes(),
  })

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: () => api.createChallenge({
      opponentId: selectedBuddy.id,
      challengeTypeId: selectedType!.id,
      wagerCoins: wagerCoins > 0 ? wagerCoins : undefined,
      durationPreset: selectedDuration as '1h' | '1d' | 'week' | 'custom',
      endsAt: selectedDuration === 'custom' && customEndDate ? new Date(customEndDate).toISOString() : undefined,
    }),
    onSuccess: () => {
      onSuccess()
    },
  })

  const getSelectedDurationXp = () => {
    return DURATION_PRESETS.find(d => d.id === selectedDuration)?.xp || 100
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-lg font-bold">Challenge starten</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Step 1: Challenge Type */}
          {step === 'type' && (
            <div className="space-y-4">
              {/* Opponent Selection */}
              <div>
                <label className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
                  Gegner
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {buddies.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuddy(b)}
                      className={cn(
                        'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                        selectedBuddy.id === b.id
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden">
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt={b.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{b.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenge Type Selection */}
              <div>
                <label className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
                  Challenge-Typ
                </label>
                <div className="space-y-2">
                  {challengeTypes.map((type) => {
                    const Icon = CHALLENGE_TYPE_ICONS[type.code] || Target
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                          selectedType?.id === type.id
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                            : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          selectedType?.id === type.id
                            ? 'bg-[hsl(var(--primary))] text-gray-900'
                            : 'bg-[hsl(var(--surface-soft))]'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{type.name_de}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {type.description_de}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Duration */}
          {step === 'duration' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
                  Dauer der Challenge
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedDuration(preset.id)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        selectedDuration === preset.id
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4" />
                        <span className="font-medium">{preset.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[hsl(var(--primary))]">
                        <Zap className="w-3 h-3" />
                        +{preset.xp} XP
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date picker */}
              {selectedDuration === 'custom' && (
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
                    Enddatum & Zeit
                  </label>
                  <Input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Wager (optional) */}
          {step === 'wager' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
                  Coins setzen (optional)
                </label>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Der Gewinner erhält alle gesetzten Coins. Bei Unentschieden werden sie zurückgegeben.
                </p>
                <div className="flex gap-2">
                  {[0, 10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setWagerCoins(amount)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-center font-medium transition-all',
                        wagerCoins === amount
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
                      )}
                    >
                      {amount === 0 ? 'Kein Einsatz' : <>{amount} <Dumbbell className="w-4 h-4 inline" /></>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Gegner</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] overflow-hidden">
                        {selectedBuddy.avatar_url ? (
                          <img src={selectedBuddy.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-medium">{selectedBuddy.display_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Typ</span>
                    <span className="font-medium">{selectedType?.name_de}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Dauer</span>
                    <span className="font-medium">
                      {DURATION_PRESETS.find(d => d.id === selectedDuration)?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">XP Belohnung</span>
                    <span className="font-medium text-[hsl(var(--primary))]">
                      +{getSelectedDurationXp()} XP
                    </span>
                  </div>
                  {wagerCoins > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">Einsatz</span>
                      <span className="font-medium flex items-center gap-1">{wagerCoins} <Dumbbell className="w-4 h-4" /></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
          {step !== 'type' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                if (step === 'duration') setStep('type')
                else if (step === 'wager') setStep('duration')
                else if (step === 'confirm') setStep('wager')
              }}
            >
              Zurück
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={
              (step === 'type' && !selectedType) ||
              (step === 'duration' && selectedDuration === 'custom' && !customEndDate) ||
              createChallengeMutation.isPending
            }
            onClick={() => {
              if (step === 'type') setStep('duration')
              else if (step === 'duration') setStep('wager')
              else if (step === 'wager') setStep('confirm')
              else if (step === 'confirm') createChallengeMutation.mutate()
            }}
          >
            {createChallengeMutation.isPending
              ? 'Wird gesendet...'
              : step === 'confirm'
                ? 'Challenge senden'
                : 'Weiter'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
