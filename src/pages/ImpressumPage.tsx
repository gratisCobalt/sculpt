import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ImpressumPage() {
  return (
    <div className="relative min-h-screen" style={{ background: '#030303' }}>
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -right-16 top-24 h-72 w-72 rounded-full bg-emerald-500/40 blur-[180px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-10">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Rechtliches</p>
          <h1 className="mt-2 text-3xl font-semibold">Impressum</h1>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-lime-300 hover:text-lime-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20">
        <article className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="text-lg font-semibold text-white">Impressum</h2>
            <p className="mt-3">
              EcomTree GmbH
              <br />
              Mergenthalerallee 73-75
              <br />
              65760 Eschborn
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Kontakt</h2>
            <p className="mt-3">
              Telefon: +49 6196 9994 197
              <br />
              E-Mail: info@ecomtree.de
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Registereintrag</h2>
            <p className="mt-3">
              Registergericht: Amtsgericht Frankfurt am Main
              <br />
              Registernummer: HRB 138944
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Umsatzsteuer-ID</h2>
            <p className="mt-3">Umsatzsteuer-Identifikationsnummer (VAT): DE370569838</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Vertreten durch</h2>
            <p className="mt-3">Sebastian Hein, Dominik Hein</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">EU-Streitschlichtung</h2>
            <p className="mt-3">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noreferrer"
                className="text-lime-300 underline underline-offset-4 hover:text-lime-200"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Unsere E-Mail-Adresse findest du oben im Impressum.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p className="mt-3">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Quelle</h2>
            <p className="mt-3">
              <a
                href="https://www.e-recht24.de/impressum-generator.html"
                target="_blank"
                rel="noreferrer"
                className="text-lime-300 underline underline-offset-4 hover:text-lime-200"
              >
                https://www.e-recht24.de/impressum-generator.html
              </a>
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
