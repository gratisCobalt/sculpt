import { Link, useNavigate } from 'react-router-dom'
import {
  Dumbbell,
  Sparkles,
  CalendarRange,
  BarChart3,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    title: 'Geführte Trainings',
    description: 'Trainiere mit KI-gestützten Workouts, die sich laufend an dein Niveau anpassen.',
    icon: Dumbbell,
  },
  {
    title: 'Progress Tracking',
    description: 'Verfolge Gewichte, Wiederholungen und persönliche Rekorde mit smarten Auswertungen.',
    icon: BarChart3,
  },
  {
    title: 'Strukturierter Plan',
    description: 'Baue nachhaltige Routinen mit Tagesübersicht, Erinnerungen und Wochenplanung.',
    icon: CalendarRange,
  },
]

const highlights = [
  {
    title: 'Coach im Taschenformat',
    description: 'Erhalte Tipps zu Technik, Erholung und Ernährung – abgestimmt auf deinen Fortschritt.',
  },
  {
    title: 'Community Challenges',
    description: 'Trete gegen Freunde an, sammle Hantel-Coins und unlocke neue Badges.',
  },
  {
    title: 'Alles in einer App',
    description: 'Von der Planung bis zur Reflexion: Sculpt begleitet deinen kompletten Trainingsalltag.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ background: '#030303' }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
        <div className="absolute -left-40 top-10 h-72 w-72 rounded-full bg-lime-500 blur-[180px]" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-emerald-500 blur-[200px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-lime-400" />
          <span className="text-lg font-semibold tracking-wide text-gray-200">Sculpt</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="rounded-full border border-lime-500/50 px-5 py-2 text-sm font-medium text-lime-300 transition-all duration-200 hover:border-lime-300 hover:bg-lime-500/10"
        >
          Jetzt kostenlos starten
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col gap-10 pt-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-gray-400">
              Dein smarter Trainingspartner
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Mehr Fokus.
              <br className="hidden md:block" />
              Mehr Ergebnisse.
              <br className="hidden md:block" />
              Mit Sculpt trainierst du smarter.
            </h1>
            <p className="text-lg text-gray-400 md:text-xl">
              Sculpt begleitet dich vom ersten Warm-up bis zum letzten Rep. Plane Workouts, tracke Fortschritt und erhalte
              motivierendes Feedback – alles in einer cleanen App.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-full bg-lime-400/90 px-6 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-lime-300"
              >
                Jetzt kostenlos starten
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center rounded-full border border-white/10 px-6 py-3 text-sm text-gray-400">
                100 Hantel-Coins zum Start geschenkt
              </span>
            </div>
          </div>

          {/* Feature preview card */}
          <div className="relative flex-1">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_80px_rgba(163,230,53,0.08)]">
              <div className="rounded-2xl border border-lime-500/20 bg-black/60 p-6">
                <h2 className="text-lg font-semibold text-lime-300">Dein Tag mit Sculpt</h2>
                <ul className="mt-4 space-y-4 text-sm text-gray-300">
                  <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                    <Dumbbell className="mt-1 h-5 w-5 text-lime-400" />
                    <div>
                      <p className="font-semibold text-white">Workout starten</p>
                      <p className="text-gray-400">Geführte Sessions mit Video-Form Cues und Timer.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                    <BarChart3 className="mt-1 h-5 w-5 text-lime-400" />
                    <div>
                      <p className="font-semibold text-white">Fortschritt analysieren</p>
                      <p className="text-gray-400">Sieh sofort deine PRs, Volumen-Trends und Motivation.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                    <CalendarRange className="mt-1 h-5 w-5 text-lime-400" />
                    <div>
                      <p className="font-semibold text-white">Plan für morgen</p>
                      <p className="text-gray-400">Erhalte Empfehlungen, damit du nachhaltig dranbleibst.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full border border-lime-400/40" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-12 right-4 h-28 w-28 rounded-full border border-white/10" aria-hidden="true" />
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition duration-200 hover:border-lime-400/60 hover:bg-white/[0.08]"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-white/[0.04] p-3">
                <feature.icon className="w-6 h-6 text-lime-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </section>

        {/* Highlights Section */}
        <section className="mt-24 rounded-[32px] border border-lime-400/40 bg-lime-400/10 p-10">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.title}>
                <h4 className="text-lg font-semibold text-lime-200">{item.title}</h4>
                <p className="mt-2 text-sm text-lime-100/80">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 py-8 text-center text-sm text-gray-500">
        <nav className="mb-3 flex justify-center gap-6 text-xs uppercase tracking-wide text-gray-500">
          <Link to="/agb" className="transition-colors hover:text-lime-300">AGB</Link>
          <Link to="/impressum" className="transition-colors hover:text-lime-300">Impressum</Link>
          <Link to="/datenschutz" className="transition-colors hover:text-lime-300">Datenschutz</Link>
        </nav>
        &copy; {new Date().getFullYear()} EcomTree GmbH. Bleib stark, bleib fokussiert.
      </footer>
    </div>
  )
}
