import { useState, useEffect } from 'react'
import { X, Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

interface BadgePopupProps {
  badge: Badge | null
  onClose: () => void
}

interface ConfettiItem {
  left: number
  delay: number
  duration: number
  color: string
}

const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6']

// Pre-generate confetti data at module level (pure, happens once)
const confettiData: ConfettiItem[] = Array.from({ length: 50 }, (_, i) => ({
  // Use deterministic values based on index instead of Math.random()
  left: ((i * 37) % 100),
  delay: ((i * 13) % 200) / 100,
  duration: 2 + ((i * 17) % 200) / 100,
  color: confettiColors[i % 5],
}))

const rarityGradients: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 via-orange-500 to-red-500',
}

const rarityGlows: Record<string, string> = {
  common: 'shadow-slate-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-amber-500/50',
}

export function BadgePopup({ badge, onClose }: BadgePopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (badge) {
      // Use startTransition to avoid cascading render warnings
      const timer = setTimeout(() => {
        setIsVisible(true)
        setShowConfetti(true)
      }, 0)

      // Hide confetti after animation
      const confettiTimer = setTimeout(() => setShowConfetti(false), 3000)

      return () => {
        clearTimeout(timer)
        clearTimeout(confettiTimer)
      }
    } else {
      queueMicrotask(() => setIsVisible(false))
    }
  }, [badge])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for exit animation
  }

  if (!badge) return null

  const gradientClass = rarityGradients[badge.rarity_code] || rarityGradients.common
  const glowClass = rarityGlows[badge.rarity_code] || rarityGlows.common

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confettiData.map((confetti, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${confetti.left}%`,
                animationDelay: `${confetti.delay}s`,
                animationDuration: `${confetti.duration}s`,
              }}
            >
              <Sparkles
                className="w-4 h-4"
                style={{
                  color: confetti.color,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Badge Card */}
      <div
        className={cn(
          'relative w-full max-w-sm transition-all duration-500 transform',
          isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        )}
      >
        <div className={cn(
          'glass rounded-3xl p-8 text-center shadow-2xl',
          glowClass
        )}>
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge Unlocked Title */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold text-[hsl(var(--primary))] uppercase tracking-wide">
              Badge freigeschaltet!
            </span>
          </div>

          {/* Badge Icon */}
          <div
            className={cn(
              'w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6',
              'bg-gradient-to-br shadow-lg animate-badge-glow',
              gradientClass,
              glowClass
            )}
          >
            <span className="text-6xl">{getBadgeEmoji(badge.icon_name)}</span>
          </div>

          {/* Badge Name */}
          <h2 className="text-2xl font-bold mb-2">{badge.name_de}</h2>

          {/* Badge Description */}
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {badge.description_de}
          </p>

          {/* Rarity Tag */}
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6',
              'bg-gradient-to-r',
              gradientClass
            )}
            style={{ color: badge.rarity_code === 'legendary' ? '#1a1a1a' : 'white' }}
          >
            <span>{badge.rarity_name}</span>
          </div>

          {/* Points Earned */}
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-[hsl(var(--primary))]">
            <span>+{badge.points}</span>
            <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]">Punkte</span>
          </div>

          {/* Continue Button */}
          <Button size="lg" className="w-full mt-6" onClick={handleClose}>
            Weiter trainieren
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes badge-glow {
          0%, 100% {
            box-shadow: 0 0 20px currentColor;
          }
          50% {
            box-shadow: 0 0 40px currentColor;
          }
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
        
        .animate-badge-glow {
          animation: badge-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function getBadgeEmoji(iconName: string): string {
  const emojiMap: Record<string, string> = {
    'fire': '🔥',
    'trophy': '🏆',
    'medal': '🥇',
    'star': '⭐',
    'rocket': '🚀',
    'zap': '⚡',
    'crown': '👑',
    'gem': '💎',
    'shield': '🛡️',
    'sword': '⚔️',
    'target': '🎯',
    'chart': '📈',
    'dumbbell': '🏋️',
    'muscle': '💪',
    'heart': '❤️',
    'cake': '🎂',
    'calendar': '📅',
    'clock': '⏰',
  }

  return emojiMap[iconName] || '🏅'
}
