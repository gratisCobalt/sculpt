const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

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
    const data = await this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async register(email: string, password: string, displayName: string) {
    const data = await this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
    this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request<any>('/api/auth/me')
  }

  logout() {
    this.setToken(null)
  }

  // =====================================================
  // USER
  // =====================================================

  async updateUser(data: {
    display_name?: string
    gender_id?: number
    body_weight_kg?: number
    training_frequency_per_week?: number
    fitness_goal?: string
    experience_level?: string
    onboarding_completed?: boolean
  }) {
    return this.request<any>('/api/users/me', {
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
    return this.request<any[]>(`/api/dashboard/exercise-progress?${params}`)
  }

  // =====================================================
  // EXERCISES
  // =====================================================

  async getExercises(options: { search?: string; bodyPart?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (options.search) params.append('search', options.search)
    if (options.bodyPart) params.append('bodyPart', options.bodyPart)
    if (options.limit) params.append('limit', options.limit.toString())
    return this.request<any[]>(`/api/exercises?${params}`)
  }

  async getExercise(id: number) {
    return this.request<any>(`/api/exercises/${id}`)
  }

  // =====================================================
  // TRAINING PLANS
  // =====================================================

  async getTrainingPlans() {
    return this.request<any[]>('/api/training-plans')
  }

  async getTrainingPlan(id: number) {
    return this.request<any>(`/api/training-plans/${id}`)
  }

  async getUserTrainingPlan() {
    return this.request<any>('/api/users/me/training-plan')
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
    return this.request<any>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWorkouts(limit: number = 20) {
    return this.request<any[]>(`/api/workouts?limit=${limit}`)
  }

  // =====================================================
  // WORKOUT SETS (Edit/Delete)
  // =====================================================

  async updateWorkoutSet(setId: number, data: { weight_kg?: number; reps?: number }) {
    return this.request<any>(`/api/workout-sets/${setId}`, {
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
    return this.request<any[]>('/api/badges')
  }

  async getUserBadges() {
    return this.request<any[]>('/api/users/me/badges')
  }

  async checkForNewBadges() {
    return this.request<{ newBadges: any[] }>('/api/users/me/badges/check')
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
    return this.request<any[]>('/api/body-parts')
  }

  async getGenders() {
    return this.request<any[]>('/api/genders')
  }

  // =====================================================
  // BUDDIES
  // =====================================================

  async searchUsers(query: string) {
    return this.request<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`)
  }

  async getBuddies() {
    return this.request<any[]>('/api/buddies')
  }

  async sendFriendRequest(userId: string) {
    return this.request<any>('/api/buddies/request', {
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
    return this.request<any[]>(`/api/notifications?unreadOnly=${unreadOnly}&limit=${limit}`)
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
    return this.request<any[]>(`/api/activity-feed?limit=${limit}`)
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
    return this.request<any>('/api/encryption/keys')
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
    return this.request<any>(`/api/buddies/${friendshipId}/keys`)
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
    return this.request<any>(`/api/buddies/${friendshipId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  async getMessages(friendshipId: number, limit = 50, before?: string) {
    let url = `/api/buddies/${friendshipId}/messages?limit=${limit}`
    if (before) url += `&before=${encodeURIComponent(before)}`
    return this.request<any[]>(url)
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
    return this.request<any[]>('/api/shop/items')
  }

  async getInventory() {
    return this.request<any[]>('/api/shop/inventory')
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
    return this.request<any[]>('/api/loot-boxes')
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
