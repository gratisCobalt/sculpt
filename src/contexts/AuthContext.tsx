import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface User {
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

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = api.getToken()
    if (token) {
      api.getMe()
        .then((userData) => {
          setUser(userData)
        })
        .catch((error) => {
          console.error('Failed to restore session:', error)
          api.logout()
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { user: userData } = await api.login(email, password)
      setUser(userData)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const signOut = async () => {
    api.logout()
    setUser(null)
  }

  const refreshProfile = async () => {
    try {
      const userData = await api.getMe()
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await api.updateUser(data as any)
      setUser(updatedUser)
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
