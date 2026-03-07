import { useState, useEffect, useCallback } from 'react'
import { Dumbbell, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle Google credential response
  const handleGoogleCallback = useCallback(async (credential: string) => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle(credential)
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
          text: mode === 'register' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          width: 280,
        })
      }
    }
  }, [googleReady, renderButton, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Bitte fülle alle Pflichtfelder aus.')
      return
    }

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Passwort muss mindestens 8 Zeichen lang sein.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwörter stimmen nicht überein.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password, displayName)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      console.error(`${mode} error:`, err)
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail('test@sculpt-app.de', 'TestUser123!')
    } catch (err) {
      console.error('Dev login error:', err)
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleClick = () => {
    googlePrompt()
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 safe-top safe-bottom">
      {/* Glow Effect Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[hsl(85,78%,64%)] opacity-10 blur-[100px] rounded-full" />
      </div>

      {/* Logo */}
      <div className="mb-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center gradient-shadow">
          <Dumbbell className="w-10 h-10 text-gray-900" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-black tracking-tight mb-1 animate-fade-in">
        <span className="gradient-primary-text">SCULPT</span>
      </h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-6 animate-fade-in">
        {mode === 'login' ? 'Willkommen zurück' : 'Erstelle deinen Account'}
      </p>

      {/* Mode Toggle */}
      <div className="w-full max-w-xs mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="glass rounded-2xl p-1 flex">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'login'
              ? 'gradient-primary text-gray-900 gradient-shadow'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
          >
            Anmelden
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'register'
              ? 'gradient-primary text-gray-900 gradient-shadow'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
          >
            Registrieren
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Display Name (Register only) */}
        {mode === 'register' && (
          <div className="relative animate-fade-in">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              id="display-name"
              type="text"
              placeholder="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl glass text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
            />
          </div>
        )}

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full h-12 pl-11 pr-4 rounded-xl glass text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={mode === 'register' ? 'Passwort (min. 8 Zeichen)' : 'Passwort'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            className="w-full h-12 pl-11 pr-11 rounded-xl glass text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm Password (Register only) */}
        {mode === 'register' && (
          <div className="relative animate-fade-in">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full h-12 pl-11 pr-4 rounded-xl glass text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
            />
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          <Dumbbell className="w-5 h-5" />
          {loading
            ? (mode === 'register' ? 'Wird erstellt...' : 'Anmelden...')
            : (mode === 'register' ? 'Account erstellen' : 'Anmelden')
          }
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-[hsl(var(--border))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">oder</span>
          <div className="flex-1 h-px bg-[hsl(var(--border))]" />
        </div>

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
              type="button"
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

        {/* Mode Switch Text */}
        <p className="text-xs text-center text-[hsl(var(--muted-foreground))] pt-2">
          {mode === 'login' ? (
            <>
              Noch kein Account?{' '}
              <button type="button" onClick={switchMode} className="text-[hsl(var(--primary))] font-semibold hover:underline">
                Registrieren
              </button>
            </>
          ) : (
            <>
              Bereits registriert?{' '}
              <button type="button" onClick={switchMode} className="text-[hsl(var(--primary))] font-semibold hover:underline">
                Anmelden
              </button>
            </>
          )}
        </p>

        {/* Dev Login (only in development) */}
        {IS_DEV && (
          <>
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">dev</span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>
            <Button
              type="button"
              variant="glass"
              size="lg"
              className="w-full"
              onClick={handleDevLogin}
              disabled={loading}
            >
              <Dumbbell className="w-5 h-5" />
              Dev Login (Test User)
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
