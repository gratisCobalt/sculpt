import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'

// Pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DashboardPage from '@/pages/DashboardPage'
import TrainingPlanPage from '@/pages/TrainingPlanPage'
import GuidedTrainingPage from '@/pages/GuidedTrainingPage'
import AddWorkoutPage from '@/pages/AddWorkoutPage'
import ChatPage from '@/pages/ChatPage'
import ProfilePage from '@/pages/ProfilePage'
import BuddyPage from '@/pages/BuddyPage'
import BuddyChatPage from '@/pages/BuddyChatPage'
import ShopPage from '@/pages/ShopPage'
import LootBoxPage from '@/pages/LootBoxPage'

// Components
import { BottomNav } from '@/components/BottomNav'
import { Loader } from '@/components/ui/loader'
import { BadgePopup } from '@/components/BadgePopup'
import { useBadgeChecker } from '@/hooks/useBadgeChecker'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if not completed
  if (user && !user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const { currentBadge, dismissBadge } = useBadgeChecker()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <>
      <BadgePopup badge={currentBadge} onClose={dismissBadge} />
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Onboarding route - always accessible for logged-in users */}
        <Route
          path="/onboarding"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : (
              <OnboardingPage />
            )
          }
        />

        {/* Protected routes with bottom nav */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training-plan"
          element={
            <ProtectedRoute>
              <TrainingPlanPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guided-training"
          element={
            <ProtectedRoute>
              <GuidedTrainingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-workout"
          element={
            <ProtectedRoute>
              <AddWorkoutPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buddies"
          element={
            <ProtectedRoute>
              <BuddyPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buddies/:buddyId/chat"
          element={
            <ProtectedRoute>
              <BuddyChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <ShopPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loot-boxes"
          element={
            <ProtectedRoute>
              <LootBoxPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
              <BottomNav />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
              <BottomNav />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="mobile-container">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
