// =====================================================
// SCULPT FITNESS APP - DATABASE TYPES (5NF)
// =====================================================

// =====================================================
// LOOKUP TYPES
// =====================================================

export interface Gender {
  id: number
  code: 'male' | 'female' | 'diverse'
  name_de: string
  name_en: string
}

export interface BadgeRarity {
  id: number
  code: 'common' | 'rare' | 'epic' | 'legendary'
  name_de: string
  name_en: string
  color_hex: string
  points_multiplier: number
}

export interface ExerciseType {
  id: number
  code: string
  name_de: string
  name_en: string
}

export interface BodyPart {
  id: number
  code: string
  name_de: string
  name_en: string
  icon_name: string | null
}

export interface Equipment {
  id: number
  code: string
  name_de: string
  name_en: string
  image_url: string | null
}

export interface Muscle {
  id: number
  code: string
  name_de: string
  name_en: string
  body_part_id: number | null
}

export interface ExerciseAttributeType {
  id: number
  code: 'strength' | 'endurance' | 'technique' | 'flexibility' | 'intensity'
  name_de: string
  name_en: string
  description_de: string | null
  description_en: string | null
  min_value: number
  max_value: number
}

// =====================================================
// CORE TYPES
// =====================================================

export interface AppUser {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  gender_id: number | null
  body_weight_kg: number | null
  
  // Onboarding
  onboarding_completed: boolean
  training_frequency_per_week: number | null
  fitness_goal: string | null
  experience_level: string | null
  
  // Stats
  current_streak: number
  longest_streak: number
  total_points: number
  hantel_currency: number
  
  // Timestamps
  created_at: string
  updated_at: string
  last_workout_at: string | null
}

export interface UserFocusArea {
  id: number
  user_id: string
  body_part_id: number
  priority: number
  created_at: string
}

export interface Exercise {
  id: number
  external_id: string
  name: string
  name_de: string | null
  overview: string | null
  overview_de: string | null
  video_url: string | null
  image_url: string | null
  exercise_type_id: number | null
  met_value: number
  api_last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseImage {
  id: number
  exercise_id: number
  resolution: string
  url: string
}

export interface ExerciseInstruction {
  id: number
  exercise_id: number
  step_number: number
  instruction_text: string
  instruction_text_de: string | null
}

export interface ExerciseTip {
  id: number
  exercise_id: number
  tip_number: number
  tip_text: string
  tip_text_de: string | null
}

export interface ExerciseVariation {
  id: number
  exercise_id: number
  variation_number: number
  name: string
  description: string | null
  description_de: string | null
}

export interface ExerciseKeyword {
  id: number
  exercise_id: number
  keyword: string
}

export interface ExerciseBodyPart {
  id: number
  exercise_id: number
  body_part_id: number
}

export interface ExerciseEquipment {
  id: number
  exercise_id: number
  equipment_id: number
}

export interface ExerciseTargetMuscle {
  id: number
  exercise_id: number
  muscle_id: number
}

export interface ExerciseSecondaryMuscle {
  id: number
  exercise_id: number
  muscle_id: number
}

export interface ExerciseRelated {
  id: number
  exercise_id: number
  related_exercise_id: number
}

export interface ExerciseAttributeValue {
  id: number
  exercise_id: number
  attribute_type_id: number
  value: number
}

// =====================================================
// TRAINING PLAN TYPES
// =====================================================

export interface TrainingPlan {
  id: number
  name: string
  name_de: string | null
  description: string | null
  description_de: string | null
  created_by_id: string | null
  is_system_plan: boolean
  days_per_week: number
  created_at: string
  updated_at: string
}

export interface TrainingPlanDay {
  id: number
  training_plan_id: number
  day_number: number
  name: string
  name_de: string | null
  focus_description: string | null
}

export interface TrainingPlanExercise {
  id: number
  training_plan_day_id: number
  exercise_id: number
  order_index: number
  sets: number
  min_reps: number
  max_reps: number
  rest_seconds: number
  notes: string | null
}

export interface UserTrainingPlan {
  id: number
  user_id: string
  training_plan_id: number
  current_day: number
  started_at: string
  is_active: boolean
}

// =====================================================
// WORKOUT TRACKING TYPES
// =====================================================

export interface WorkoutSession {
  id: number
  user_id: string
  training_plan_day_id: number | null
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  total_volume_kg: number
  calories_burned: number
  notes: string | null
}

export interface WorkoutSet {
  id: number
  workout_session_id: number
  exercise_id: number
  set_number: number
  weight_kg: number
  reps: number
  is_warmup: boolean
  is_pr: boolean
  rpe: number | null
  notes: string | null
  created_at: string
}

export interface PersonalRecord {
  id: number
  user_id: string
  exercise_id: number
  record_type: 'weight' | 'reps' | 'volume'
  value: number
  achieved_at: string
  workout_set_id: number | null
}

// =====================================================
// BADGE TYPES
// =====================================================

export interface Badge {
  id: number
  code: string
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  icon_name: string
  rarity_id: number
  points: number
  category: 'workout_count' | 'streak' | 'weight' | 'volume' | 'category_master'
  threshold_value: number | null
  threshold_body_part_id: number | null
  created_at: string
}

export interface UserBadge {
  id: number
  user_id: string
  badge_id: number
  earned_at: string
  notified: boolean
}

// =====================================================
// JOINED/VIEW TYPES (for queries)
// =====================================================

export interface ExerciseWithDetails extends Exercise {
  exercise_type?: ExerciseType | null
  body_parts?: BodyPart[]
  equipments?: Equipment[]
  target_muscles?: Muscle[]
  secondary_muscles?: Muscle[]
  instructions?: ExerciseInstruction[]
  tips?: ExerciseTip[]
  variations?: ExerciseVariation[]
  attributes?: { type: ExerciseAttributeType; value: number }[]
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: (WorkoutSet & { exercise: Exercise })[]
}

export interface UserWithProfile extends AppUser {
  gender?: Gender | null
  focus_areas?: (UserFocusArea & { body_part: BodyPart })[]
  badges?: (UserBadge & { badge: Badge & { rarity: BadgeRarity } })[]
  active_plan?: UserTrainingPlan & { training_plan: TrainingPlan }
}

export interface BadgeWithRarity extends Badge {
  rarity: BadgeRarity
}

export interface UserBadgeWithDetails extends UserBadge {
  badge: BadgeWithRarity
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface DashboardStats {
  totalWorkouts: number
  totalVolume: number
  currentStreak: number
  caloriesBurned: number
  workoutsThisWeek: number
  targetWorkoutsPerWeek: number
  previousPeriodWorkouts: number
  previousPeriodVolume: number
}

export interface ExerciseProgress {
  exercise: Exercise
  history: {
    date: string
    weight: number
    reps: number
    volume: number
  }[]
  latestWeight: number
  latestReps: number
  maxWeight: number
  isPR: boolean
}

export interface RadarChartData {
  labels: string[]
  values: number[]
}

// =====================================================
// BACKWARD COMPATIBILITY ALIASES
// =====================================================

// Alias for legacy code using User type
export type User = AppUser

// Legacy Machine type (maps to Exercise in new schema)
export interface Machine {
  id: string
  name: string
  default_category_id: string | null
  image_url?: string | null
}

// Legacy TrainingPlanExercise with machine
export interface ExerciseWithMachine extends TrainingPlanExercise {
  machine: { id: string; name: string } | null
  exercise_name?: string
}

