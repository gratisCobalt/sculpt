import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signInWithEmail } = useAuth()
  const [devLoading, setDevLoading] = useState(false)

  const handleDevLogin = async () => {
    setDevLoading(true)
    try {
      await signInWithEmail('test@sculpt-app.de', 'TestUser123!')
    } catch (error) {
      console.error('Dev login error:', error)
    } finally {
      setDevLoading(false)
    }
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

      {/* Dev Login Button */}
      <div className="w-full max-w-xs space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
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
