import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Shield, Zap, Gift, Sparkles, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

const categoryIcons: Record<string, typeof ShoppingBag> = {
  consumable: Gift,
  cosmetic: Sparkles,
  boost: Zap,
}

const rarityColors: Record<string, string> = {
  common: 'border-slate-500/30 bg-slate-500/10',
  rare: 'border-blue-500/30 bg-blue-500/10',
  epic: 'border-purple-500/30 bg-purple-500/10',
  legendary: 'border-amber-500/30 bg-amber-500/10 animate-pulse',
}

const rarityTextColors: Record<string, string> = {
  common: 'text-slate-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
}

const itemIcons: Record<string, typeof Shield> = {
  shield: Shield,
  zap: Zap,
  gift: Gift,
  frame: Award,
  award: Award,
}

export default function ShopPage() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  const { data: shopItems = [], isLoading } = useQuery({
    queryKey: ['shopItems'],
    queryFn: () => api.getShopItems(),
  })

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.getInventory(),
  })

  const purchaseMutation = useMutation({
    mutationFn: (itemId: number) => api.purchaseItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      refreshProfile()
    },
  })

  const activateSaverMutation = useMutation({
    mutationFn: () => api.activateStreakSaver(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['activeStreakSaver'] })
    },
  })

  const getInventoryCount = (itemCode: string) => {
    const item = inventory.find((i: any) => i.code === itemCode)
    return item?.quantity || 0
  }

  const groupedItems = shopItems.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category_code || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const categoryNames: Record<string, string> = {
    consumable: 'Verbrauchsgüter',
    cosmetic: 'Kosmetik',
    boost: 'Boosts',
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Shop</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
            <span className="text-amber-400">🏋️</span>
            <span className="font-bold text-amber-400">{user?.hantel_coins || 0}</span>
          </div>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Tausche deine Hanteln gegen Boosts und Items
        </p>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => {
            const CategoryIcon = categoryIcons[category] || ShoppingBag
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <h2 className="font-semibold">{categoryNames[category] || category}</h2>
                </div>
                <div className="space-y-3">
                  {items.map((item: any) => {
                    const ItemIcon = itemIcons[item.icon_name] || Gift
                    const owned = getInventoryCount(item.code)
                    const canAfford = (user?.hantel_coins || 0) >= item.price_coins
                    const isMaxed = item.max_stack && owned >= item.max_stack

                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'border-2 transition-all',
                          item.rarity_code ? rarityColors[item.rarity_code] : 'border-[hsl(var(--border))]'
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                'w-12 h-12 rounded-xl flex items-center justify-center',
                                item.rarity_code
                                  ? `bg-${item.rarity_code === 'legendary' ? 'amber' : item.rarity_code === 'epic' ? 'purple' : item.rarity_code === 'rare' ? 'blue' : 'slate'}-500/20`
                                  : 'bg-[hsl(var(--surface-strong))]'
                              )}
                            >
                              <ItemIcon
                                className={cn(
                                  'w-6 h-6',
                                  item.rarity_code ? rarityTextColors[item.rarity_code] : 'text-[hsl(var(--muted-foreground))]'
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold">{item.name_de}</h3>
                              {item.rarity_code && (
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded-full inline-block mt-1',
                                    rarityColors[item.rarity_code],
                                    rarityTextColors[item.rarity_code]
                                  )}
                                >
                                  {item.rarity_code === 'common' ? 'Gewöhnlich' :
                                    item.rarity_code === 'rare' ? 'Selten' :
                                      item.rarity_code === 'epic' ? 'Episch' : 'Legendär'}
                                </span>
                              )}
                              <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mt-1">
                                {item.description_de}
                              </p>
                              {owned > 0 && (
                                <p className="text-xs text-[hsl(var(--primary))] mt-1">
                                  Im Besitz: {owned}{item.max_stack ? `/${item.max_stack}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-amber-400">🏋️</span>
                                <span className="font-bold text-amber-400">{item.price_coins}</span>
                              </div>
                              <Button
                                size="sm"
                                disabled={!canAfford || isMaxed || purchaseMutation.isPending}
                                onClick={() => purchaseMutation.mutate(item.id)}
                                className={cn(
                                  isMaxed && 'opacity-50'
                                )}
                              >
                                {isMaxed ? 'Max' : purchaseMutation.isPending ? '...' : 'Kaufen'}
                              </Button>
                            </div>
                          </div>

                          {/* Activate Streak Saver Button */}
                          {item.code === 'streak_saver' && owned > 0 && (
                            <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={() => activateSaverMutation.mutate()}
                                disabled={activateSaverMutation.isPending}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Streak Saver aktivieren (7 Tage Schutz)
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
