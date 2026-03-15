import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  RefreshCw,
  MessageSquare,
  LogOut,
  Trash2,
  ChevronRight,
  Info,
  Trophy,
  Award,
  Bell,
  BellOff,
  Loader2,
  Link2,
  Unlink,
} from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'

const BUILD_NUMBER = '1.0.0'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const rarityColors: Record<string, string> = {
  common: 'bg-slate-500/20 border-slate-500/30',
  rare: 'bg-blue-500/20 border-blue-500/30',
  epic: 'bg-purple-500/20 border-purple-500/30',
  legendary: 'bg-amber-500/20 border-amber-500/30 animate-pulse',
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

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut, linkGoogleAccount, unlinkGoogleAccount } = useAuth()
  const [googleLinking, setGoogleLinking] = useState(false)
  const [googleUnlinking, setGoogleUnlinking] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications()

  // Handle Google credential for linking
  const handleGoogleLinkCallback = useCallback(async (credential: string) => {
    setGoogleLinking(true)
    setGoogleError(null)
    try {
      await linkGoogleAccount(credential)
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Verknüpfung fehlgeschlagen')
    } finally {
      setGoogleLinking(false)
    }
  }, [linkGoogleAccount])

  // Use reusable Google Auth hook
  const { prompt: googlePrompt } = useGoogleAuth({
    onCredential: handleGoogleLinkCallback,
    onError: (msg) => setGoogleError(msg)
  })

  const handleLinkGoogle = () => {
    googlePrompt()
  }

  const handleUnlinkGoogle = async () => {
    setGoogleUnlinking(true)
    setGoogleError(null)
    try {
      await unlinkGoogleAccount()
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen')
    } finally {
      setGoogleUnlinking(false)
    }
  }

  // Fetch user badges
  const { data: userBadges } = useQuery({
    queryKey: ['userBadges'],
    queryFn: () => api.getUserBadges(),
    enabled: !!user,
  })

  // Fetch all badges for progress display
  const { data: allBadges } = useQuery({
    queryKey: ['allBadges'],
    queryFn: () => api.getAllBadges(),
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await api.deleteAccount()
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Delete account error:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const menuItems = [
    {
      icon: RefreshCw,
      label: 'Onboarding neu starten',
      description: 'Ziele und Präferenzen aktualisieren',
      onClick: () => navigate('/onboarding'),
    },
    {
      icon: MessageSquare,
      label: 'Feedback geben',
      description: 'Hilf uns, Sculpt zu verbessern',
      onClick: () => {
        window.open('mailto:feedback@sculpt-app.de?subject=Sculpt%20Feedback', '_blank')
      },
    },
  ]

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush()
    } else {
      await subscribePush()
    }
  }

  const earnedBadgeIds = new Set(userBadges?.map((b) => b.badge_id) || [])
  const totalPoints = user?.total_points || 0
  const badgeProgress = allBadges
    ? `${userBadges?.length || 0}/${allBadges.length}`
    : '0/18'

  return (
    <div className="min-h-screen px-6 pt-6 pb-24 safe-top">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[hsl(var(--surface-soft))] flex items-center justify-center mb-4 overflow-hidden">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
          )}
        </div>
        <h1 className="text-2xl font-bold mb-1">
          {user?.display_name || 'Athlet'}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Streak</p>
            <p className="text-2xl font-bold text-[hsl(var(--primary))]">
              {user?.current_streak || 0}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Wochen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Punkte</p>
            <p className="text-2xl font-bold text-[hsl(var(--accent))]">
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Badges</p>
            <p className="text-2xl font-bold">
              {badgeProgress}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">erreicht</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Linking Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-[hsl(var(--primary))]" />
          Verknüpfte Konten
        </h2>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm">
                  <FcGoogle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Google</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {user?.google_id ? 'Verknüpft' : 'Nicht verknüpft'}
                  </p>
                </div>
              </div>

              {user?.google_id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={handleUnlinkGoogle}
                  disabled={googleUnlinking}
                >
                  {googleUnlinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                GOOGLE_CLIENT_ID ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkGoogle}
                    disabled={googleLinking}
                  >
                    {googleLinking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verknüpfen'
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-yellow-500">Nicht konfiguriert</span>
                )
              )}
            </div>

            {googleError && (
              <p className="text-xs text-red-500 mt-2">{googleError}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[hsl(var(--primary))]" />
            Deine Badges
          </h2>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {badgeProgress}
          </span>
        </div>

        {/* Earned Badges */}
        {userBadges && userBadges.length > 0 ? (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {userBadges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2',
                  rarityColors[badge.rarity_code] || rarityColors.common
                )}
                title={badge.name_de}
              >
                <span className="text-3xl mb-1">{getBadgeEmoji(badge.icon_name)}</span>
                <span className="text-[10px] text-center leading-tight truncate w-full">
                  {badge.name_de}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Card className="mb-4">
            <CardContent className="p-6 text-center">
              <Award className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))]">
                Noch keine Badges verdient
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Trainiere weiter, um Badges freizuschalten!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Locked Badges Preview */}
        {allBadges && (
          <div className="mt-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              Nächste Badges zum Freischalten:
            </p>
            <div className="grid grid-cols-4 gap-3">
              {allBadges
                .filter((b) => !earnedBadgeIds.has(b.id))
                .slice(0, 4)
                .map((badge) => (
                  <div
                    key={badge.id}
                    className="aspect-square rounded-xl border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center p-2 opacity-50"
                    title={badge.name_de}
                  >
                    <span className="text-3xl mb-1 grayscale">
                      {getBadgeEmoji(badge.icon_name)}
                    </span>
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      ???
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="space-y-3 mb-8">
        {menuItems.map((item) => (
          <Card
            key={item.label}
            className="cursor-pointer"
            onClick={item.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-strong))] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.label}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Push Notifications Toggle */}
        {pushSupported && (
          <Card className="cursor-pointer" onClick={handlePushToggle}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  pushSubscribed ? "bg-green-500/20" : "bg-[hsl(var(--surface-strong))]"
                )}>
                  {pushLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : pushSubscribed ? (
                    <Bell className="w-5 h-5 text-green-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Push-Benachrichtigungen</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {pushSubscribed ? 'Aktiviert' : 'Deaktiviert'}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  pushSubscribed ? "bg-green-500" : "bg-[hsl(var(--surface-strong))]"
                )}>
                  <div className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                    pushSubscribed ? "translate-x-6" : "translate-x-1"
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sign Out */}
      <Button
        variant="destructive"
        className="w-full mb-4"
        onClick={handleSignOut}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Abmelden
      </Button>

      {/* Delete Account */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-center text-xs text-[hsl(var(--muted-foreground))] underline mb-8"
        >
          Account und alle Daten löschen
        </button>
      ) : (
        <div className="glass rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-red-400 mb-2">Account wirklich löschen?</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
            Alle deine Daten werden unwiderruflich gelöscht: Workouts, Trainingspläne, Chat-Verlauf, Buddys, Badges und Coins.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Endgültig löschen
            </Button>
          </div>
        </div>
      )}

      {/* Build Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        <Info className="w-3 h-3" />
        <span>Sculpt v{BUILD_NUMBER}</span>
      </div>
    </div>
  )
}
