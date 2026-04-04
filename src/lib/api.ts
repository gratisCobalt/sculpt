// API Base URL - empty string for relative paths (works with Pages Functions)
// Set VITE_API_BASE_URL for local dev with separate backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async register(email: string, password: string, displayName: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
    this.setToken(data.token)
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMe(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>('/api/auth/me')
  }

  logout() {
    this.setToken(null)
  }

  // =====================================================
  // GOOGLE AUTH
  // =====================================================

  async googleAuth(idToken: string) {
    const data = await this.request<{ 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: any
      token: string
      isNewUser: boolean
      linked?: boolean
    }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    this.setToken(data.token)
    return data
  }

  async linkGoogleAccount(idToken: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<{ success: boolean; user: any }>('/api/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
  }

  async unlinkGoogleAccount() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<{ success: boolean; user: any }>('/api/auth/google/unlink', {
      method: 'POST',
    })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAccount() {
    return this.request<{ success: boolean }>('/api/users/me', {
      method: 'DELETE',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>(`/api/exercises?${params}`)
  }

  async getExercisesPaginated(options: { 
    search?: string
    bodyPart?: string
    page?: number
    limit?: number 
  } = {}) {
    const params = new URLSearchParams()
    if (options.search) params.append('search', options.search)
    if (options.bodyPart && options.bodyPart !== 'all') params.append('bodyPart', options.bodyPart)
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    return this.request<{
      exercises: Array<{
        id: number
        external_id: string
        name: string
        name_de: string | null
        image_url: string | null
        video_url: string | null
        body_part: string | null
        body_part_name: string | null
      }>
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/api/exercises?${params}`)
  }

  async getExercise(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>(`/api/exercises/${id}`)
  }

  async getExerciseLastWorkout(exerciseId: number) {
    return this.request<{
      lastWorkoutDate: string | null
      sets: Record<number, { weight: number; reps: number; isWarmup: boolean }>
    }>(`/api/exercises/${exerciseId}/last-workout`)
  }

  // =====================================================
  // TRAINING PLANS
  // =====================================================

  async getTrainingPlans() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/training-plans')
  }

  async getMyPlans() {
    return this.request<Array<{
      id: number
      name: string
      name_de?: string
      days_per_week: number
      total_days: number
      total_exercises: number
      is_active: number
      created_at: string
    }>>('/api/training-plans/mine')
  }

  async getTrainingPlan(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>(`/api/training-plans/${id}`)
  }

  async deletePlan(planId: number) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}`, {
      method: 'DELETE',
    })
  }

  async renamePlan(planId: number, name: string) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, name_de: name }),
    })
  }

  async setActivePlan(planId: number) {
    return this.request<{ success: boolean }>('/api/users/me/training-plan', {
      method: 'POST',
      body: JSON.stringify({ training_plan_id: planId }),
    })
  }

  async getUserTrainingPlan() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>('/api/users/me/training-plan')
  }

  async updatePlanExercise(planId: number, exerciseId: number, data: { sets?: number; min_reps?: number; max_reps?: number; rest_seconds?: number }) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}/exercises/${exerciseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deletePlanExercise(planId: number, exerciseId: number) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}/exercises/${exerciseId}`, {
      method: 'DELETE',
    })
  }

  async addPlanExercise(planId: number, dayId: number, data: { exercise_id: number; sets?: number; min_reps?: number; max_reps?: number }) {
    return this.request<{ success: boolean; id: number }>(`/api/training-plans/${planId}/days/${dayId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async reorderPlanExercises(planId: number, dayId: number, exerciseIds: number[]) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}/days/${dayId}/exercises/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ exercise_ids: exerciseIds }),
    })
  }

  async updatePlanDay(planId: number, dayId: number, data: { name: string; name_de?: string }) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}/days/${dayId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async addPlanDay(planId: number, data: { name: string; name_de?: string }) {
    return this.request<{ success: boolean; id: number; day_number: number }>(`/api/training-plans/${planId}/days`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePlanDay(planId: number, dayId: number) {
    return this.request<{ success: boolean }>(`/api/training-plans/${planId}/days/${dayId}`, {
      method: 'DELETE',
    })
  }

  async generateTrainingPlan(data: {
    fitness_goal: string
    experience_level: string
    training_frequency: number
    focus_areas: string[]
    body_weight_kg?: number
  }) {
    return this.request<{
      status: string
    }>('/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPlanStatus() {
    return this.request<{
      status: 'pending' | 'ready' | 'failed' | 'idle'
    }>('/api/ai/plan-status')
  }

  // =====================================================
  // WORKOUTS
  // =====================================================

  async createWorkout(data: {
    training_plan_day_id?: number
    performed_at?: string
    sets: {
      exercise_id: number
      set_number: number
      weight_kg: number
      reps: number
      is_warmup?: boolean
      rpe?: number
    }[]
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWorkouts(limit: number = 20) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>(`/api/workouts?limit=${limit}`)
  }

  // =====================================================
  // WORKOUT SETS (Edit/Delete)
  // =====================================================

  async updateWorkoutSet(setId: number, data: { weight_kg?: number; reps?: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // FEEDBACK
  // =====================================================

  async submitFeedback(data: { message: string; imageUrls?: string[]; category?: string }) {
    return this.request<{ success: boolean }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // =====================================================
  // BADGES
  // =====================================================

  async getAllBadges() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/badges')
  }

  async getUserBadges() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/users/me/badges')
  }

  async checkForNewBadges() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/body-parts')
  }

  async getGenders() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/genders')
  }

  // =====================================================
  // BUDDIES
  // =====================================================

  async searchUsers(query: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>(`/api/users/search?q=${encodeURIComponent(query)}`)
  }

  async getBuddies() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/buddies')
  }

  async sendFriendRequest(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>('/api/buddies/request', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>(`/api/notifications?unread=${unreadOnly}&limit=${limit}`)
  }

  async markNotificationsRead(notificationIds: number[] | 'all') {
    return this.request<{ success: boolean }>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds === 'all' ? undefined : notificationIds }),
    })
  }

  // =====================================================
  // ACTIVITY FEED
  // =====================================================

  async getActivityFeed(limit = 30) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>(`/api/buddies/${friendshipId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  async getMessages(friendshipId: number, limit = 50, before?: string) {
    let url = `/api/buddies/${friendshipId}/messages?limit=${limit}`
    if (before) url += `&before=${encodeURIComponent(before)}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>(url)
  }

  // =====================================================
  // AI COACH
  // =====================================================

  async chatStream(params: {
    conversationId?: string
    messages: { role: string; content: string }[]
    systemPrompt?: string
    temperature?: number
  }): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Chat request failed')
    }

    return res
  }

  async getConversations() {
    return this.request<{
      id: string
      title: string
      created_at: string
      updated_at: string
    }[]>('/api/ai/conversations')
  }

  async getConversation(id: string) {
    return this.request<{
      id: string
      title: string
      created_at: string
      updated_at: string
      messages: {
        id: string
        role: 'user' | 'assistant'
        content: string
        created_at: string
      }[]
    }>(`/api/ai/conversations/${id}`)
  }

  async deleteConversation(id: string) {
    return this.request<{ success: boolean }>(`/api/ai/conversations/${id}`, {
      method: 'DELETE',
    })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/shop')
  }

  async getInventory() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/inventory')
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/lootboxes')
  }

  async clickLootBox(boxId: number) {
    return this.request<{
      opened: boolean
      clicks_remaining?: number
      rarity_id: number
      upgraded?: boolean
      coins_awarded?: number
    }>(`/api/lootboxes/${boxId}/click`, {
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

  // =====================================================
  // LEADERBOARD & RANKINGS
  // =====================================================

  async getWeeklyLeaderboard() {
    return this.request<{
      leaderboard: LeaderboardUser[]
      currentUserRank: number
      league: LeagueTier
      level: UserLevel
      nextLevel: UserLevel | null
      totalParticipants: number
    }>('/api/leaderboard/weekly')
  }

  async getLeagues() {
    return this.request<(LeagueTier & { user_count: number; fake_user_count: number })[]>('/api/leagues')
  }

  async getLevels() {
    return this.request<UserLevel[]>('/api/levels')
  }

  async getFitnessGoals() {
    return this.request<FitnessGoal[]>('/api/fitness-goals')
  }

  async getUserLevel() {
    return this.request<{
      xp_total: number
      current_level: number
      league_id: number
      league_points: number
      level_name: string
      level_icon: string
      level_color: string
      current_level_xp: number
      next_level_xp: number | null
      league_code: string
      league_name: string
      league_icon: string
      league_color: string
      progress_percent: number
      xp_to_next: number
    }>('/api/user/level')
  }

  // =====================================================
  // CHALLENGES
  // =====================================================

  async getChallengeTypes() {
    return this.request<ChallengeType[]>('/api/challenges/types')
  }

  async getActiveChallenges() {
    return this.request<Challenge[]>('/api/challenges')
  }

  async getChallengeHistory(limit = 20) {
    return this.request<Challenge[]>(`/api/challenges/history?limit=${limit}`)
  }

  async createChallenge(data: {
    opponentId: string
    challengeTypeId: number
    exerciseId?: number
    targetValue?: number
    wagerCoins?: number
    endsAt?: string
    durationPreset?: '1h' | '1d' | 'week' | 'custom'
  }) {
    return this.request<Challenge>('/api/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async acceptChallenge(challengeId: number) {
    return this.request<Challenge>(`/api/challenges/${challengeId}/accept`, {
      method: 'PATCH',
    })
  }

  async declineChallenge(challengeId: number) {
    return this.request<Challenge>(`/api/challenges/${challengeId}/decline`, {
      method: 'PATCH',
    })
  }

  async cancelChallenge(challengeId: number) {
    return this.request<Challenge>(`/api/challenges/${challengeId}/cancel`, {
      method: 'PATCH',
    })
  }
}

// Types for leaderboard and challenges
export interface LeaderboardUser {
  id: string
  display_name: string
  avatar_url: string | null
  fitness_goal: string | null
  current_streak: number
  xp_total: number
  current_level: number
  league_id: number
  weekly_volume_kg: number
  weekly_workout_count: number
  is_fake: boolean
  is_buddy: boolean
  rank: number
}

export interface LeagueTier {
  id: number
  code: string
  name_de: string
  name_en: string
  tier_order: number
  icon_name: string
  color_hex: string
  min_points: number
  promotion_percent: number
  demotion_percent: number
}

export interface UserLevel {
  level: number
  name_de: string
  name_en: string
  xp_required: number
  icon_name: string
  color_hex: string
}

export interface FitnessGoal {
  id: number
  code: string
  name_de: string
  name_en: string
  emoji: string
}

export interface ChallengeType {
  id: number
  code: string
  name_de: string
  name_en: string
  description_de: string
  icon_name: string
  metric: string
}

export interface Challenge {
  id: number
  friendship_id: number
  challenge_type_id: number
  exercise_id: number | null
  challenger_id: string
  opponent_id: string
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'declined'
  target_value: number | null
  challenger_progress: number
  opponent_progress: number
  wager_coins: number
  xp_reward: number
  winner_id: string | null
  starts_at: string | null
  ends_at: string
  accepted_at: string | null
  created_at: string
  challenge_type_code: string
  challenge_type_name: string
  challenge_type_icon: string
  metric: string
  challenger_name: string
  challenger_avatar: string | null
  challenger_goal: string | null
  opponent_name: string
  opponent_avatar: string | null
  opponent_goal: string | null
  exercise_name: string | null
}

export const api = new ApiClient()
