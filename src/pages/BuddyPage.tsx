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
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type TabType = 'buddies' | 'requests' | 'feed'

export default function BuddyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('buddies')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Fetch buddies
  const { data: buddies = [], isLoading: buddiesLoading } = useQuery({
    queryKey: ['buddies'],
    queryFn: () => api.getBuddies(),
    enabled: !!user,
  })

  // Fetch activity feed
  const { data: activityFeed = [], isLoading: feedLoading } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => api.getActivityFeed(),
    enabled: !!user && activeTab === 'feed',
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

  const removeBuddyMutation = useMutation({
    mutationFn: (friendshipId: number) => api.removeBuddy(friendshipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddies'] }),
  })

  const sendReminderMutation = useMutation({
    mutationFn: (friendshipId: number) => api.sendBuddyReminder(friendshipId),
  })

  const sendCongratsMutation = useMutation({
    mutationFn: ({ itemId, emoji }: { itemId: number; emoji: string }) =>
      api.sendCongrats(itemId, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activityFeed'] }),
  })

  // Filter buddies
  const acceptedBuddies = buddies.filter((b) => b.status === 'accepted')
  const pendingRequests = buddies.filter((b) => b.status === 'pending' && b.direction === 'received')
  const sentRequests = buddies.filter((b) => b.status === 'pending' && b.direction === 'sent')

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Buddies</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearching(!isSearching)}
          >
            <UserPlus className="w-5 h-5" />
          </Button>
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
                  searchResults.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.display_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {user.current_streak} Wochen Streak
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendRequestMutation.mutate(user.id)}
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
        <div className="flex gap-2 p-1 rounded-lg bg-[hsl(var(--surface-soft))]">
          {[
            { id: 'buddies' as const, label: 'Buddies', count: acceptedBuddies.length },
            { id: 'requests' as const, label: 'Anfragen', count: pendingRequests.length },
            { id: 'feed' as const, label: 'Feed', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2',
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
                  onChat={() => navigate(`/buddies/${buddy.id}/chat`)}
                  onRemove={() => removeBuddyMutation.mutate(buddy.friendship_id)}
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

        {/* Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
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
              ))
            ) : (
              <EmptyState
                icon={Bell}
                title="Keine Anfragen"
                description="Du hast aktuell keine offenen Freundschaftsanfragen"
              />
            )}
          </div>
        )}

        {/* Activity Feed */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {feedLoading ? (
              <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Lädt...</p>
            ) : activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onCongrats={(emoji) =>
                    sendCongratsMutation.mutate({ itemId: item.id, emoji })
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={Trophy}
                title="Kein Feed"
                description="Sobald deine Buddies Erfolge erzielen, siehst du sie hier"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Sub Components =====

function BuddyCard({
  buddy,
  onChat,
  onRemove,
}: {
  buddy: any
  onChat: () => void
  onRemove: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const lastWorkout = buddy.last_workout_at
    ? new Date(buddy.last_workout_at)
    : null
  const isRecent = lastWorkout && Date.now() - lastWorkout.getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
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
            <div>
              <p className="font-semibold">{buddy.display_name}</p>
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                {buddy.friend_streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-3 h-3" />
                    {buddy.friend_streak}W Streak
                  </span>
                )}
                <span>
                  {lastWorkout
                    ? `Zuletzt: ${formatTimeAgo(lastWorkout)}`
                    : 'Noch kein Training'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onChat}>
              <MessageCircle className="w-4 h-4" />
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 py-1 w-40 rounded-lg bg-[hsl(var(--popover))] border border-[hsl(var(--border))] shadow-lg z-10">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-[hsl(var(--surface-soft))] flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false)
                      onRemove()
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Entfernen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityCard({
  item,
  onCongrats,
}: {
  item: any
  onCongrats: (emoji: string) => void
}) {
  const congrats_emojis = ['🎉', '💪', '🔥', '👏', '⭐']

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.avatar_url ? (
              <img
                src={item.avatar_url}
                alt={item.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{item.display_name}</p>
            <p className="text-sm">{item.title_de}</p>
            {item.description_de && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {item.description_de}
              </p>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
              {formatTimeAgo(new Date(item.created_at))}
            </p>
          </div>
        </div>

        {/* Congrats */}
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-1">
            {congrats_emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onCongrats(emoji)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all',
                  item.has_congrats
                    ? 'bg-[hsl(var(--primary))]/20'
                    : 'hover:bg-[hsl(var(--surface-soft))]'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          {item.congrats_count > 0 && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {item.congrats_count} Gratulationen
            </span>
          )}
        </div>
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
