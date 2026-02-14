import { useState, useEffect, useCallback } from 'react'
import { Dumbbell } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [devLoading, setDevLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle Google credential response
  const handleGoogleCallback = useCallback(async (credential: string) => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle(credential)
      // Navigation is handled by App.tsx based on user state
    } catch (err) {
      console.error('Google sign-in error:', err)
      setError(err instanceof Error ? err.message : 'Google-Anmeldung fehlgeschlagen')
    } finally {
      setGoogleLoading(false)
    }
  }, [signInWithGoogle])

  // Use reusable Google Auth hook
  const { isReady: googleReady, prompt: googlePrompt, renderButton } = useGoogleAuth({
    onCredential: handleGoogleCallback,
    onError: (msg) => console.error('Google Auth Error:', msg)
  })

  // Render Google button when ready
  useEffect(() => {
    if (googleReady) {
      const buttonContainer = document.getElementById('google-signin-button')
      if (buttonContainer) {
        renderButton(buttonContainer, {
          theme: 'filled_black',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'pill',
          width: 280,
        })
      }
    }
  }, [googleReady, renderButton])

  const handleDevLogin = async () => {
    setDevLoading(true)
    setError(null)
    try {
      await signInWithEmail('test@sculpt-app.de', 'TestUser123!')
    } catch (err) {
      console.error('Dev login error:', err)
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setDevLoading(false)
    }
  }

  const handleGoogleClick = () => {
    googlePrompt()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 safe-top safe-bottom">
      {/* Glow Effect Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[hsl(85,78%,64%)] opacity-10 blur-[100px] rounded-full" />
      </div>

      {/* Logo */}
      <div className="mb-8 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center gradient-shadow">
          <Dumbbell className="w-12 h-12 text-gray-900" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-black tracking-tight mb-2 animate-fade-in">
        <span className="gradient-primary-text">SCULPT</span>
      </h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-12 animate-fade-in">
        Willkommen zurück
      </p>

      {/* Login Buttons */}
      <div className="w-full max-w-xs space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="flex flex-col items-center gap-3">
          {/* Native Google Button (rendered by GSI) */}
          <div
            id="google-signin-button"
            className={googleLoading ? 'opacity-50 pointer-events-none' : ''}
          />

          {/* Fallback button if GSI doesn't render */}
          {!googleReady && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleClick}
              disabled={googleLoading}
            >
              <FcGoogle className="w-5 h-5 mr-2" />
              {googleLoading ? 'Anmelden...' : 'Mit Google fortfahren'}
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-[hsl(var(--border))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">oder</span>
          <div className="flex-1 h-px bg-[hsl(var(--border))]" />
        </div>

        {/* Dev Login Button */}
        <Button
          variant="glass"
          size="lg"
          className="w-full"
          onClick={handleDevLogin}
          disabled={devLoading}
        >
          <Dumbbell className="w-5 h-5 mr-2" />
          {devLoading ? 'Anmelden...' : 'Dev Login (Test User)'}
        </Button>

        <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
          Cloudflare D1 Entwicklungsumgebung
        </p>
      </div>
    </div>
  )
}
