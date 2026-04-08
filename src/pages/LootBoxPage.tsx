import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Coins, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { haptics } from '@/lib/haptics'

const rarityConfig: Record<string, { name: string; color: string; bgColor: string; borderColor: string; glow: string }> = {
  common: {
    name: 'Gewöhnlich',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/50',
    glow: '',
  },
  rare: {
    name: 'Selten',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
  },
  epic: {
    name: 'Episch',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    glow: 'shadow-[0_0_40px_rgba(139,92,246,0.4)]',
  },
  legendary: {
    name: 'Legendär',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    glow: 'shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-pulse',
  },
}

interface LootBox {
  id: number
  rarity_code: string
  clicks_remaining: number
  is_opened: boolean
  coins_awarded?: number
}

interface LootBoxModalProps {
  box: LootBox
  onClose: () => void
  onUpdate: () => void
}

function LootBoxModal({ box, onClose, onUpdate }: LootBoxModalProps) {
  const { refreshProfile } = useAuth()
  const [currentBox, setCurrentBox] = useState(box)
  const [isAnimating, setIsAnimating] = useState(false)
  const [justUpgraded, setJustUpgraded] = useState(false)
  const [showCoins, setShowCoins] = useState(false)

  const clickMutation = useMutation({
    mutationFn: () => api.clickLootBox(currentBox.id),
    onSuccess: (data) => {
      setIsAnimating(true)
      setJustUpgraded(data.upgraded ?? false)
      if (data.upgraded) haptics.heavy()
      if (data.coins_awarded) haptics.success()

      // Map rarity_id to rarity_code
      const rarityCodeMap: Record<number, string> = {
        1: 'common',
        2: 'rare',
        3: 'epic',
        4: 'legendary',
      }

      setTimeout(() => {
        setCurrentBox({
          ...currentBox,
          rarity_code: rarityCodeMap[data.rarity_id] || 'common',
          clicks_remaining: data.clicks_remaining ?? 0,
          is_opened: data.opened,
          coins_awarded: data.coins_awarded ?? undefined,
        })
        setIsAnimating(false)

        if (data.coins_awarded) {
          setShowCoins(true)
          refreshProfile()
          onUpdate()
        }
      }, 500)
    },
  })

  const rarity = rarityConfig[currentBox.rarity_code] || rarityConfig.common

  const handleClick = () => {
    if (currentBox.clicks_remaining > 0 && !clickMutation.isPending && !isAnimating) {
      haptics.medium()
      clickMutation.mutate()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Loot Box Card */}
        <Card
          className={cn(
            'border-2 transition-all duration-500 overflow-hidden',
            rarity.borderColor,
            rarity.glow,
            isAnimating && 'scale-110',
            justUpgraded && !isAnimating && 'animate-bounce'
          )}
        >
          <CardContent className="p-6">
            {!showCoins ? (
              <>
                {/* Box Display */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-32 h-32 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500',
                      rarity.bgColor,
                      isAnimating && 'scale-125 rotate-12'
                    )}
                  >
                    <Gift
                      className={cn(
                        'w-16 h-16 transition-all duration-500',
                        rarity.color,
                        isAnimating && 'animate-spin'
                      )}
                    />
                  </div>

                  <h2 className={cn('text-xl font-bold mb-1', rarity.color)}>
                    {rarity.name}e Loot Box
                  </h2>

                  <p className="text-[hsl(var(--muted-foreground))] text-center mb-4">
                    {currentBox.clicks_remaining > 0
                      ? 'Tippe um die Seltenheit zu erhöhen!'
                      : 'Die Box öffnet sich...'}
                  </p>

                  {/* Clicks Remaining */}
                  <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-4 h-4 rounded-full transition-all',
                          i <= currentBox.clicks_remaining
                            ? rarity.bgColor + ' ' + rarity.borderColor + ' border-2'
                            : 'bg-white/10'
                        )}
                      />
                    ))}
                  </div>

                  {/* Click Button */}
                  {currentBox.clicks_remaining > 0 && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleClick}
                      disabled={clickMutation.isPending || isAnimating}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      {currentBox.clicks_remaining === 3
                        ? 'Erste Chance!'
                        : currentBox.clicks_remaining === 2
                          ? 'Zweite Chance!'
                          : 'Letzte Chance!'}
                    </Button>
                  )}

                  {/* Upgrade Feedback */}
                  {justUpgraded && !isAnimating && (
                    <p className="text-green-400 font-bold mt-4 animate-pulse">
                      ✨ UPGRADE! ✨
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Coins Revealed */
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-6">
                  <div className={cn(
                    'w-24 h-24 rounded-full flex items-center justify-center',
                    'bg-amber-500/30 animate-pulse'
                  )}>
                    <Coins className="w-12 h-12 text-amber-400" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-bounce" />
                  <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-amber-400 animate-bounce delay-150" />
                </div>

                <h2 className="text-2xl font-bold text-amber-400 mb-2">
                  +{currentBox.coins_awarded} Coins!
                </h2>

                <p className={cn('text-sm mb-6', rarity.color)}>
                  Aus deiner {rarity.name}en Box
                </p>

                <Button onClick={onClose} className="w-full">
                  Super!
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LootBoxPage() {
  const queryClient = useQueryClient()
  const [selectedBox, setSelectedBox] = useState<LootBox | null>(null)

  const { data: lootBoxes = [], isLoading } = useQuery({
    queryKey: ['lootBoxes'],
    queryFn: () => api.getLootBoxes(),
  })

  const unopenedBoxes = lootBoxes.filter((box: LootBox) => !box.is_opened)

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['lootBoxes'] })
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Loot Boxes</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {unopenedBoxes.length} ungeöffnet
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="px-6 mb-6">
        <Card className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">So funktioniert's</h3>
            <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1">
              <li>• Du bekommst eine Box nach jedem abgeschlossenen Training</li>
              <li>• Tippe 3x um die Seltenheit zu erhöhen</li>
              <li>• Je seltener, desto mehr Hantel Coins!</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Boxes Grid */}
      <div className="px-6">
        {isLoading ? (
          <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
        ) : unopenedBoxes.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))] opacity-50" />
            <h3 className="font-semibold mb-2">Keine Loot Boxes</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Schließe ein Training ab, um eine zu verdienen!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {unopenedBoxes.map((box: LootBox) => {
              const rarity = rarityConfig[box.rarity_code] || rarityConfig.common
              return (
                <Card
                  key={box.id}
                  className={cn(
                    'border-2 cursor-pointer transition-all hover:scale-105',
                    rarity.borderColor,
                    rarity.glow
                  )}
                  onClick={() => setSelectedBox(box)}
                >
                  <CardContent className="p-4 flex flex-col items-center">
                    <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center mb-2', rarity.bgColor)}>
                      <Gift className={cn('w-8 h-8', rarity.color)} />
                    </div>
                    <span className={cn('text-sm font-medium', rarity.color)}>
                      {rarity.name}
                    </span>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            i <= box.clicks_remaining ? rarity.bgColor : 'bg-white/10'
                          )}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedBox && (
        <LootBoxModal
          box={selectedBox}
          onClose={() => setSelectedBox(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
