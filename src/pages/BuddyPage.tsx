import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Flame,
  Check,
  X,
  Clock,
  Trophy,
  Bell,
  Swords,
  Timer,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { LeaderboardUser, Challenge } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import ChallengeModal from '@/components/ChallengeModal'

type TabType = 'buddies' | 'rang' | 'challenges'

// Fitness goal emoji mapping
const GOAL_EMOJIS: Record<string, string> = {
  muscle_gain: '💪',
  fat_loss: '🔥',
  strength: '⚡',
  endurance: '🏃',
  general: '❤️',
}

// League icon mapping
const LEAGUE_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  champion: '👑',
}

export default function BuddyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('buddies')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [selectedBuddyForChallenge, setSelectedBuddyForChallenge] = useState<any>(null)
  const [showRequestsSheet, setShowRequestsSheet] = useState(false)

  // Fetch buddies
  const { data: buddies = [], isLoading: buddiesLoading } = useQuery({
    queryKey: ['buddies'],
    queryFn: () => api.getBuddies(),
    enabled: !!user,
  })

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.getWeeklyLeaderboard(),
    enabled: !!user && activeTab === 'rang',
  })

  // Fetch user level info
  const { data: levelInfo } = useQuery({
    queryKey: ['userLevel'],
    queryFn: () => api.getUserLevel(),
    enabled: !!user,
  })

  // Fetch active challenges
  const { data: activeChallenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ['activeChallenges'],
    queryFn: () => api.getActiveChallenges(),
    enabled: !!user && activeTab === 'challenges',
  })

  // Search users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: () => api.searchUsers(searchQuery),
    enabled: searchQuery.length >= 2 && isSearching,
  })

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => api.sendFriendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      setSearchQuery('')
      setIsSearching(false)
    },
  })

  const respondRequestMutation = useMutation({
    mutationFn: ({ friendshipId, action }: { friendshipId: number; action: 'accept' | 'reject' }) =>
      api.respondToFriendRequest(friendshipId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddies'] }),
  })

  const acceptChallengeMutation = useMutation({
    mutationFn: (challengeId: number) => api.acceptChallenge(challengeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeChallenges'] }),
  })

  const declineChallengeMutation = useMutation({
    mutationFn: (challengeId: number) => api.declineChallenge(challengeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeChallenges'] }),
  })

  // Filter buddies
  const acceptedBuddies = buddies.filter((b) => b.status === 'accepted')
  const pendingRequests = buddies.filter((b) => b.status === 'pending' && b.direction === 'received')
  const sentRequests = buddies.filter((b) => b.status === 'pending' && b.direction === 'sent')

  // Split challenges
  const pendingChallenges = activeChallenges.filter(c => c.status === 'pending' && c.opponent_id === user?.id)
  const runningChallenges = activeChallenges.filter(c => c.status === 'active')
  const sentChallenges = activeChallenges.filter(c => c.status === 'pending' && c.challenger_id === user?.id)

  const handleStartChallenge = (buddy: any) => {
    setSelectedBuddyForChallenge(buddy)
    setShowChallengeModal(true)
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Buddies</h1>
          <div className="flex items-center gap-2">
            {levelInfo && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[hsl(var(--surface-soft))]">
                <span className="text-sm">{LEAGUE_ICONS[levelInfo.league_code] || '🏆'}</span>
                <span className="text-xs font-medium">Lv.{levelInfo.current_level}</span>
              </div>
            )}
            {/* Anfragen Button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowRequestsSheet(true)}
            >
              <Bell className="w-5 h-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-[10px] text-gray-900 font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </Button>
            {/* Buddy hinzufügen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearching(!isSearching)}
            >
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        {isSearching && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Buddy suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="mt-2 space-y-2">
                {searchLoading ? (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                    Suche...
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((searchUser) => (
                    <Card key={searchUser.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center">
                            {searchUser.avatar_url ? (
                              <img
                                src={searchUser.avatar_url}
                                alt={searchUser.display_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{searchUser.display_name}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {searchUser.current_streak} Wochen Streak
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendRequestMutation.mutate(searchUser.id)}
                          disabled={sendRequestMutation.isPending}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Hinzufügen
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                    Keine Nutzer gefunden
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[hsl(var(--surface-soft))]">
          {[
            { id: 'buddies' as const, label: 'Buddies', count: acceptedBuddies.length },
            { id: 'rang' as const, label: 'Rang 🏆' },
            { id: 'challenges' as const, label: 'Challenges ⚔️', count: pendingChallenges.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-2 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1',
                activeTab === tab.id
                  ? 'bg-[hsl(var(--surface-strong))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[hsl(var(--primary))] text-[10px] text-gray-900 font-semibold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {/* Buddies List */}
        {activeTab === 'buddies' && (
          <div className="space-y-3">
            {buddiesLoading ? (
              <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
            ) : acceptedBuddies.length > 0 ? (
              acceptedBuddies.map((buddy) => (
                <BuddyCard
                  key={buddy.friendship_id}
                  buddy={buddy}
                  onChat={() => navigate(`/buddies/${buddy.id}/chat`, {
                    state: {
                      buddyName: buddy.display_name,
                      avatarUrl: buddy.avatar_url,
                      friendshipId: buddy.friendship_id
                    }
                  })}
                />
              ))
            ) : (
              <EmptyState
                icon={Users}
                title="Noch keine Buddies"
                description="Füge Freunde hinzu und motiviert euch gegenseitig!"
                action={
                  <Button onClick={() => setIsSearching(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Buddy finden
                  </Button>
                }
              />
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3">
                  Gesendete Anfragen
                </h3>
                {sentRequests.map((request) => (
                  <Card key={request.friendship_id} className="mb-2">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <div>
                          <p className="font-medium">{request.display_name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Ausstehend</p>
                        </div>
                      </div>
                      <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === 'rang' && (
          <div className="space-y-4">
            {/* League Info Card */}
            {leaderboardData?.league && (
              <Card className="overflow-hidden">
                <div
                  className="p-4"
                  style={{
                    background: `linear-gradient(135deg, ${leaderboardData.league.color_hex}20, transparent)`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{LEAGUE_ICONS[leaderboardData.league.code]}</span>
                      <div>
                        <p className="font-bold text-lg">{leaderboardData.league.name_de}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Platz {leaderboardData.currentUserRank} von {leaderboardData.totalParticipants}
                        </p>
                      </div>
                    </div>
                    {leaderboardData.level && (
                      <div className="text-right">
                        <p className="text-sm font-medium">Level {leaderboardData.level.level}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {leaderboardData.level.name_de}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* XP Progress */}
                  {leaderboardData.nextLevel && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>XP Fortschritt</span>
                        <span>{leaderboardData.nextLevel.xp_required - (leaderboardData.level?.xp_required || 0)} XP bis Level {leaderboardData.level.level + 1}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[hsl(var(--surface-soft))] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
                          style={{ width: `${Math.min(100, ((leaderboardData.level?.xp_required || 0) / leaderboardData.nextLevel.xp_required) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Leaderboard List */}
            {leaderboardLoading ? (
              <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
            ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboardData.leaderboard.slice(0, 50).map((entry) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    isCurrentUser={entry.id === user?.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Trophy}
                title="Keine Rangliste"
                description="Trainiere diese Woche, um auf der Rangliste zu erscheinen!"
              />
            )}
          </div>
        )}

        {/* Challenges */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {/* Pending Challenges Received */}
            {pendingChallenges.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                  Eingehende Challenges
                </h3>
                {pendingChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    currentUserId={user?.id}
                    onAccept={() => acceptChallengeMutation.mutate(challenge.id)}
                    onDecline={() => declineChallengeMutation.mutate(challenge.id)}
                    isPending
                  />
                ))}
              </div>
            )}

            {/* Active Challenges */}
            {runningChallenges.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                  Laufende Challenges
                </h3>
                {runningChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}

            {/* Sent Challenges */}
            {sentChallenges.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                  Gesendete Challenges
                </h3>
                {sentChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    currentUserId={user?.id}
                    isSent
                  />
                ))}
              </div>
            )}

            {challengesLoading ? (
              <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
            ) : activeChallenges.length === 0 && (
              <EmptyState
                icon={Swords}
                title="Keine Challenges"
                description="Fordere einen Buddy zu einer Challenge heraus!"
                action={
                  acceptedBuddies.length > 0 ? (
                    <Button onClick={() => handleStartChallenge(acceptedBuddies[0])}>
                      <Swords className="w-4 h-4 mr-2" />
                      Challenge starten
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && selectedBuddyForChallenge && (
        <ChallengeModal
          buddy={selectedBuddyForChallenge}
          buddies={acceptedBuddies}
          onClose={() => {
            setShowChallengeModal(false)
            setSelectedBuddyForChallenge(null)
          }}
          onSuccess={() => {
            setShowChallengeModal(false)
            setSelectedBuddyForChallenge(null)
            queryClient.invalidateQueries({ queryKey: ['activeChallenges'] })
            setActiveTab('challenges')
          }}
        />
      )}

      {/* Requests Sheet */}
      {showRequestsSheet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRequestsSheet(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-lg bg-[hsl(var(--card))] rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h2 className="text-lg font-bold">Anfragen</h2>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--primary))] text-xs text-gray-900 font-bold">
                    {pendingRequests.length}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRequestsSheet(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(70vh-80px)]">
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.friendship_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center">
                            <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                          </div>
                          <div>
                            <p className="font-semibold">{request.display_name}</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                              möchte dein Buddy sein
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() =>
                              respondRequestMutation.mutate({
                                friendshipId: request.friendship_id,
                                action: 'accept',
                              })
                            }
                            disabled={respondRequestMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Akzeptieren
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              respondRequestMutation.mutate({
                                friendshipId: request.friendship_id,
                                action: 'reject',
                              })
                            }
                            disabled={respondRequestMutation.isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-soft))] flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <h3 className="font-semibold mb-1">Keine Anfragen</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Du hast aktuell keine offenen Freundschaftsanfragen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Sub Components =====

function BuddyCard({
  buddy,
  onChat,
}: {
  buddy: any
  onChat: () => void
}) {
  const lastWorkout = buddy.last_workout_at
    ? new Date(buddy.last_workout_at)
    : null
  const isRecent = lastWorkout && Date.now() - lastWorkout.getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Card className="cursor-pointer hover:bg-[hsl(var(--surface-soft))] transition-colors" onClick={onChat}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden">
              {buddy.avatar_url ? (
                <img
                  src={buddy.avatar_url}
                  alt={buddy.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              )}
            </div>
            {isRecent && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[hsl(var(--card))]" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold">{buddy.display_name}</p>
              {buddy.fitness_goal && (
                <span className="text-sm">{GOAL_EMOJIS[buddy.fitness_goal] || '❤️'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              {buddy.friend_streak > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <Flame className="w-3 h-3" />
                  {buddy.friend_streak}W
                </span>
              )}
              <span>
                {lastWorkout
                  ? `${formatTimeAgo(lastWorkout)}`
                  : 'Noch kein Training'}
              </span>
            </div>
          </div>
          <MessageCircle className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
      </CardContent>
    </Card>
  )
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardUser; isCurrentUser: boolean }) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <Card className={cn(isCurrentUser && 'ring-2 ring-[hsl(var(--primary))]')}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-8 text-center font-bold text-sm">
          {getRankIcon(entry.rank)}
        </div>
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden flex-shrink-0">
          {entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt={entry.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn('font-medium truncate', isCurrentUser && 'text-[hsl(var(--primary))]')}>
              {entry.display_name}
            </p>
            {entry.fitness_goal && (
              <span className="text-sm flex-shrink-0">{GOAL_EMOJIS[entry.fitness_goal] || '❤️'}</span>
            )}
            {entry.is_buddy && !isCurrentUser && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Buddy</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span>Lv.{entry.current_level}</span>
            {entry.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-orange-500">
                <Flame className="w-3 h-3" />
                {entry.current_streak}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">{((entry as any).weekly_volume ?? entry.weekly_volume_kg ?? 0).toLocaleString()} kg</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {((entry as any).weekly_workouts ?? entry.weekly_workout_count ?? 0)} Training{(((entry as any).weekly_workouts ?? entry.weekly_workout_count ?? 0)) !== 1 ? 's' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ChallengeCard({
  challenge,
  currentUserId,
  onAccept,
  onDecline,
  isPending,
  isSent,
}: {
  challenge: Challenge
  currentUserId?: string
  onAccept?: () => void
  onDecline?: () => void
  isPending?: boolean
  isSent?: boolean
}) {
  const isChallenger = challenge.challenger_id === currentUserId
  const opponent = isChallenger
    ? { name: challenge.opponent_name, avatar: challenge.opponent_avatar, goal: challenge.opponent_goal }
    : { name: challenge.challenger_name, avatar: challenge.challenger_avatar, goal: challenge.challenger_goal }

  const myProgress = isChallenger ? challenge.challenger_progress : challenge.opponent_progress
  const theirProgress = isChallenger ? challenge.opponent_progress : challenge.challenger_progress

  const endsAt = new Date(challenge.ends_at)
  const timeLeft = endsAt.getTime() - Date.now()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  const daysLeft = Math.floor(hoursLeft / 24)

  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden">
              {opponent.avatar ? (
                <img src={opponent.avatar} alt={opponent.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold">{opponent.name}</p>
                {opponent.goal && <span>{GOAL_EMOJIS[opponent.goal] || '❤️'}</span>}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {challenge.challenge_type_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
              <Timer className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h` : `${hoursLeft}h`}
            </div>
            {challenge.xp_reward > 0 && (
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--primary))]">
                <Zap className="w-3 h-3" />
                +{challenge.xp_reward} XP
              </div>
            )}
          </div>
        </div>

        {/* Progress (only for active) */}
        {challenge.status === 'active' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Du: {myProgress}</span>
              <span>{opponent.name}: {theirProgress}</span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--surface-soft))] overflow-hidden flex">
              <div
                className="h-full bg-[hsl(var(--primary))]"
                style={{ width: `${Math.min(100, (myProgress / (myProgress + theirProgress || 1)) * 100)}%` }}
              />
              <div
                className="h-full bg-red-500"
                style={{ width: `${Math.min(100, (theirProgress / (myProgress + theirProgress || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions for pending */}
        {isPending && onAccept && onDecline && (
          <div className="flex gap-2 mt-3">
            <Button className="flex-1" onClick={onAccept}>
              <Check className="w-4 h-4 mr-1" />
              Annehmen
            </Button>
            <Button variant="secondary" onClick={onDecline}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Sent indicator */}
        {isSent && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock className="w-3 h-3" />
            Warte auf Antwort...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-soft))] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{description}</p>
      {action}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Gerade eben'
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std.`
  if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)} Tagen`

  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
