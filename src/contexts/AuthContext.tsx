import { createContext, useEffect, useState, type ReactNode } from 'react'
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
  // Google OAuth fields
  google_id?: string | null
  auth_provider?: 'email' | 'google' | 'both' | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<{ isNewUser: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  linkGoogleAccount: (idToken: string) => Promise<void>
  unlinkGoogleAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }
export type { AuthContextType }

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
      queueMicrotask(() => setLoading(false))
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

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const { user: userData } = await api.register(email, password, displayName)
      setUser(userData)
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  const signInWithGoogle = async (idToken: string) => {
    try {
      const { user: userData, isNewUser } = await api.googleAuth(idToken)
      setUser(userData)
      return { isNewUser }
    } catch (error) {
      console.error('Google login error:', error)
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
      const updatedUser = await api.updateUser(data as Record<string, unknown>)
      setUser(updatedUser)
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }

  const linkGoogleAccount = async (idToken: string) => {
    try {
      const { user: updatedUser } = await api.linkGoogleAccount(idToken)
      setUser(updatedUser)
    } catch (error) {
      console.error('Failed to link Google account:', error)
      throw error
    }
  }

  const unlinkGoogleAccount = async () => {
    try {
      const { user: updatedUser } = await api.unlinkGoogleAccount()
      setUser(updatedUser)
    } catch (error) {
      console.error('Failed to unlink Google account:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateProfile,
        linkGoogleAccount,
        unlinkGoogleAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
