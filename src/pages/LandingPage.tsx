import { useNavigate } from 'react-router-dom'
import { Dumbbell, Target, Brain, ListChecks, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: ListChecks,
    title: 'Geführte Trainings',
    description: 'Strukturierte Workouts mit Timer und Fortschrittstracking',
  },
  {
    icon: Target,
    title: 'Progress Tracking',
    description: 'Verfolge deine Gewichte, Wiederholungen und Personal Records',
  },
  {
    icon: Brain,
    title: 'KI-Coaching',
    description: 'Dein persönlicher Fitness-Assistent beantwortet alle Fragen',
  },
  {
    icon: Dumbbell,
    title: 'Strukturierter Plan',
    description: 'Personalisierte Trainingspläne basierend auf deinen Zielen',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 safe-top safe-bottom">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center mb-8">
        {/* Glow Effect Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[hsl(85,78%,64%)] opacity-10 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[hsl(156,66%,55%)] opacity-10 blur-[80px] rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center gradient-shadow animate-pulse-glow">
            <Dumbbell className="w-10 h-10 text-gray-900" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-black tracking-tight mb-3">
          <span className="gradient-primary-text">SCULPT</span>
        </h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] mb-8">
          Dein digitaler Gym-Buddy
        </p>

        {/* Feature Cards */}
        <div className="w-full space-y-3 mb-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass glass-hover rounded-2xl p-4 flex items-start gap-4 text-left animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-strong))] flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate('/login')}
        >
          Jetzt starten
          <ChevronRight className="w-5 h-5" />
        </Button>
        <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
          Kostenlos • Keine Kreditkarte erforderlich
        </p>
      </div>
    </div>
  )
}
