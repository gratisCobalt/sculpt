const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// =====================================================
// API Response Types
// =====================================================

export interface ApiUser {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  gender_id: number | null
  gender_code?: string
  gender_name?: string
  body_weight_kg: number | null
  onboarding_completed: boolean
  training_frequency_per_week: number | null
  fitness_goal: string | null
  experience_level: string | null
  current_streak: number
  longest_streak: number
  total_points: number
  hantel_coins: number
  created_at: string
  updated_at: string
  last_workout_at: string | null
}

export interface ExerciseProgress {
  exercise: {
    id: number
    name: string
    primary_category: string
    image_url?: string
  }
  history: Array<{
    date: string
    weight: number
    reps: number
    volume?: number
  }>
  allSets?: Array<{
    id: number
    date: string
    weight: number
    reps: number
    setNumber: number
    isWarmup: boolean
    isPR: boolean
  }>
  latestWeight: number
  latestReps: number
  maxWeight?: number
  isPR?: boolean
}

export interface Exercise {
  id: number
  name: string
  name_de?: string
  description?: string
  body_part_id: number
  body_part_name?: string
  equipment?: string
  instructions?: string
  image_url?: string
}

export interface TrainingPlan {
  id: number
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface Workout {
  id: number
  user_id: string
  training_plan_day_id?: number
  started_at: string
  completed_at?: string
  total_volume_kg: number
  exercises_count: number
}

export interface WorkoutSet {
  id: number
  workout_id: number
  exercise_id: number
  set_number: number
  weight_kg: number
  reps: number
  is_warmup: boolean
  rpe?: number
}

export interface Badge {
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

export interface UserBadge extends Badge {
  badge_id: number
  earned_at: string
  notified: boolean
}

export interface BodyPart {
  id: number
  name: string
  name_de?: string
  icon?: string
}

export interface Gender {
  id: number
  name: string
  name_de?: string
}

export interface Buddy {
  id: string
  friendship_id: number
  display_name: string
  avatar_url?: string
  friend_streak: number
  last_workout_at: string | null
  status: string
  direction: string
}

export interface UserSearchResult {
  id: string
  display_name: string
  avatar_url?: string
  current_streak?: number
}

export interface Notification {
  id: number
  type: string
  title: string
  body?: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface ActivityFeedItem {
  id: number
  user_id: string
  display_name: string
  avatar_url?: string
  activity_type: string
  title_de: string
  description_de?: string
  created_at: string
  has_congrats: boolean
  congrats_count: number
}

export interface EncryptionKeys {
  identityPublicKey: string
  signedPrekeyPublic: string
  signedPrekeySignature: string
}

export interface BuddyKeys {
  identityPublicKey: string
  signedPrekeyPublic: string
  ephemeralPublicKey?: string
}

export interface ChatMessage {
  id: number
  friendship_id: number
  sender_id: string
  encrypted_content: string
  ephemeral_public_key: string
  mac: string
  nonce: string
  created_at: string
}

export interface ShopItem {
  id: number
  code: string
  name_de: string
  description_de: string
  price_coins: number
  category_code: string
  rarity_code?: string
  icon_name: string
  max_stack?: number
}

export interface InventoryItem {
  code: string
  quantity: number
  item_id: number
  name_de: string
}

export interface LootBox {
  id: number
  user_id: string
  rarity_id: number
  rarity_code: string
  clicks_remaining: number
  is_opened: boolean
  created_at: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('sculpt_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('sculpt_token', token)
    } else {
      localStorage.removeItem('sculpt_token')
    }
  }

  getToken() {
    return this.token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return res.json()
  }

  // =====================================================
  // AUTH
  // =====================================================

  async login(email: string, password: string) {
    const data = await this.request<{ user: ApiUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async register(email: string, password: string, displayName: string) {
    const data = await this.request<{ user: ApiUser; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
    this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request<ApiUser>('/api/auth/me')
  }

  logout() {
    this.setToken(null)
  }

  // =====================================================
  // USER
  // =====================================================

  async updateUser(data: {
    display_name?: string | null
    gender_id?: number | null
    body_weight_kg?: number | null
    training_frequency_per_week?: number | null
    fitness_goal?: string | null
    experience_level?: string | null
    onboarding_completed?: boolean
    birthdate?: string | null
  }) {
    return this.request<ApiUser>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async setFocusAreas(bodyPartIds: number[]) {
    return this.request<{ success: boolean }>('/api/users/me/focus-areas', {
      method: 'POST',
      body: JSON.stringify({ body_part_ids: bodyPartIds }),
    })
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  async getDashboardStats(period: number = 7) {
    return this.request<{
      totalWorkouts: number
      totalVolume: number
      caloriesBurned: number
      currentStreak: number
      workoutsThisWeek: number
      targetWorkoutsPerWeek: number
      previousPeriodWorkouts: number
      previousPeriodVolume: number
    }>(`/api/dashboard/stats?period=${period}`)
  }

  async getExerciseProgress(period: number = 7, bodyPart?: string) {
    const params = new URLSearchParams({ period: period.toString() })
    if (bodyPart) params.append('bodyPart', bodyPart)
    return this.request<ExerciseProgress[]>(`/api/dashboard/exercise-progress?${params}`)
  }

  // =====================================================
  // EXERCISES
  // =====================================================

  async getExercises(options: { search?: string; bodyPart?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (options.search) params.append('search', options.search)
    if (options.bodyPart) params.append('bodyPart', options.bodyPart)
    if (options.limit) params.append('limit', options.limit.toString())
    return this.request<Exercise[]>(`/api/exercises?${params}`)
  }

  async getExercise(id: number) {
    return this.request<Exercise>(`/api/exercises/${id}`)
  }

  // =====================================================
  // TRAINING PLANS
  // =====================================================

  async getTrainingPlans() {
    return this.request<TrainingPlan[]>('/api/training-plans')
  }

  async getTrainingPlan(id: number) {
    return this.request<TrainingPlan>(`/api/training-plans/${id}`)
  }

  async getUserTrainingPlan() {
    return this.request<TrainingPlan>('/api/users/me/training-plan')
  }

  async generateTrainingPlan(data: {
    fitness_goal: string
    experience_level: string
    training_frequency: number
    focus_areas: string[]
    body_weight_kg?: number
  }) {
    return this.request<{
      success: boolean
      plan_id: number
      plan_name: string
      days_count: number
    }>('/api/training-plans/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // =====================================================
  // WORKOUTS
  // =====================================================

  async createWorkout(data: {
    training_plan_day_id?: number
    sets: {
      exercise_id: number
      set_number: number
      weight_kg: number
      reps: number
      is_warmup?: boolean
      rpe?: number
    }[]
  }) {
    return this.request<Workout>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWorkouts(limit: number = 20) {
    return this.request<Workout[]>(`/api/workouts?limit=${limit}`)
  }

  // =====================================================
  // WORKOUT SETS (Edit/Delete)
  // =====================================================

  async updateWorkoutSet(setId: number, data: { weight_kg?: number; reps?: number }) {
    return this.request<WorkoutSet>(`/api/workout-sets/${setId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteWorkoutSet(setId: number) {
    return this.request<{ success: boolean }>(`/api/workout-sets/${setId}`, {
      method: 'DELETE',
    })
  }

  // =====================================================
  // BADGES
  // =====================================================

  async getAllBadges() {
    return this.request<Badge[]>('/api/badges')
  }

  async getUserBadges() {
    return this.request<UserBadge[]>('/api/users/me/badges')
  }

  async checkForNewBadges() {
    return this.request<{ newBadges: Badge[] }>('/api/users/me/badges/check')
  }

  async markBadgeNotified(badgeId: number) {
    return this.request<{ success: boolean }>(`/api/users/me/badges/${badgeId}/notify`, {
      method: 'POST',
    })
  }

  // =====================================================
  // LOOKUPS
  // =====================================================

  async getBodyParts() {
    return this.request<BodyPart[]>('/api/body-parts')
  }

  async getGenders() {
    return this.request<Gender[]>('/api/genders')
  }

  // =====================================================
  // BUDDIES
  // =====================================================

  async searchUsers(query: string) {
    return this.request<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(query)}`)
  }

  async getBuddies() {
    return this.request<Buddy[]>('/api/buddies')
  }

  async sendFriendRequest(userId: string) {
    return this.request<{ success: boolean; friendship_id: number }>('/api/buddies/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  }

  async respondToFriendRequest(friendshipId: number, action: 'accept' | 'reject') {
    return this.request<{ success: boolean; status: string }>(`/api/buddies/${friendshipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    })
  }

  async removeBuddy(friendshipId: number) {
    return this.request<{ success: boolean }>(`/api/buddies/${friendshipId}`, {
      method: 'DELETE',
    })
  }

  async sendBuddyReminder(friendshipId: number) {
    return this.request<{ success: boolean }>(`/api/buddies/${friendshipId}/remind`, {
      method: 'POST',
    })
  }

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  async getNotifications(unreadOnly = false, limit = 50) {
    return this.request<Notification[]>(`/api/notifications?unreadOnly=${unreadOnly}&limit=${limit}`)
  }

  async markNotificationsRead(notificationIds: number[] | 'all') {
    return this.request<{ success: boolean }>('/api/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ notificationIds }),
    })
  }

  // =====================================================
  // ACTIVITY FEED
  // =====================================================

  async getActivityFeed(limit = 30) {
    return this.request<ActivityFeedItem[]>(`/api/activity-feed?limit=${limit}`)
  }

  async sendCongrats(itemId: number, emoji = '🎉') {
    return this.request<{ success: boolean }>(`/api/activity-feed/${itemId}/congrats`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    })
  }

  // =====================================================
  // CHAT (E2E Encrypted)
  // =====================================================

  async getEncryptionKeys() {
    return this.request<EncryptionKeys>('/api/encryption/keys')
  }

  async uploadEncryptionKeys(keys: {
    identityPublicKey: string
    signedPrekeyPublic: string
    signedPrekeySignature: string
    prekeys: Array<{ id: number; publicKey: string }>
  }) {
    return this.request<{ success: boolean }>('/api/encryption/keys', {
      method: 'POST',
      body: JSON.stringify(keys),
    })
  }

  async getBuddyKeys(friendshipId: number) {
    return this.request<BuddyKeys>(`/api/buddies/${friendshipId}/keys`)
  }

  async sendMessage(friendshipId: number, message: {
    encryptedContent: string
    ephemeralPublicKey: string
    mac: string
    nonce: string
    messageType?: string
    referenceType?: string
    referenceId?: number
  }) {
    return this.request<ChatMessage>(`/api/buddies/${friendshipId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  async getMessages(friendshipId: number, limit = 50, before?: string) {
    let url = `/api/buddies/${friendshipId}/messages?limit=${limit}`
    if (before) url += `&before=${encodeURIComponent(before)}`
    return this.request<ChatMessage[]>(url)
  }

  // =====================================================
  // PUSH NOTIFICATIONS
  // =====================================================

  async registerPushToken(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return this.request<{ success: boolean }>('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ 
        token: subscription.endpoint,
        platform: 'web',
        subscription 
      }),
    })
  }

  async unregisterPushToken(endpoint: string) {
    return this.request<{ success: boolean }>('/api/push-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token: endpoint }),
    })
  }

  // =====================================================
  // SHOP & LOOT BOX
  // =====================================================

  async getShopItems() {
    return this.request<ShopItem[]>('/api/shop/items')
  }

  async getInventory() {
    return this.request<InventoryItem[]>('/api/shop/inventory')
  }

  async purchaseItem(itemId: number, quantity = 1) {
    return this.request<{ success: boolean; new_balance: number }>('/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, quantity }),
    })
  }

  async activateStreakSaver() {
    return this.request<{ success: boolean; expires_at: string }>('/api/shop/activate-streak-saver', {
      method: 'POST',
    })
  }

  async getLootBoxes() {
    return this.request<LootBox[]>('/api/loot-boxes')
  }

  async clickLootBox(boxId: number) {
    return this.request<{
      success: boolean
      new_rarity_id: number
      new_rarity_code: string
      clicks_left: number
      upgraded: boolean
      coins_won: number | null
    }>(`/api/loot-boxes/${boxId}/click`, {
      method: 'POST',
    })
  }

  // =====================================================
  // WEEKLY STATS
  // =====================================================

  async getWeeklyStats() {
    return this.request<{
      exercises_completed: number
      total_volume_kg: number
      workouts_count: number
      calories_burned: number
      streak: number
    }>('/api/stats/weekly')
  }
}

export const api = new ApiClient()
