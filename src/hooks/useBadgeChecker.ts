import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface Badge {
  id: number
  code: string
  name_de: string
  description_de: string
  icon_name: string
  points: number
  rarity_code: string
  rarity_name: string
  rarity_color: string
}

export function useBadgeChecker() {
  const { user } = useAuth()
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([])

  const checkForBadges = useCallback(async () => {
    if (!user) return

    try {
      const result = await api.checkForNewBadges()
      if (result.newBadges.length > 0) {
        setPendingBadges(result.newBadges)
      }
    } catch (error) {
      console.error('Failed to check for badges:', error)
    }
  }, [user])

  // Show next badge in queue - derive from pending badges
  const currentBadge = pendingBadges.length > 0 ? pendingBadges[0] : null

  const dismissBadge = useCallback(async () => {
    if (currentBadge) {
      // Mark as notified in backend
      try {
        await api.markBadgeNotified(currentBadge.id)
      } catch (error) {
        console.error('Failed to mark badge as notified:', error)
      }

      // Remove from queue
      setPendingBadges((prev) => prev.slice(1))
    }
  }, [currentBadge])

  return {
    currentBadge,
    checkForBadges,
    dismissBadge,
    hasPendingBadges: pendingBadges.length > 0,
  }
}
