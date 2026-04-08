<p align="center">
  <img src="public/icons/icon-32x32.svg" width="80" height="80" alt="Sculpt Logo" />
</p>

<h1 align="center">Sculpt</h1>
<p align="center"><strong>Dein intelligenter Fitness-Begleiter.</strong></p>

<p align="center">
  <a href="https://sculpt-app.de">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fsculpt-app.de&label=sculpt-app.de&style=flat-square" alt="Website" />
  </a>
  <a href="https://github.com/gratisCobalt/sculpt/releases/latest">
    <img src="https://img.shields.io/github/v/release/gratisCobalt/sculpt?style=flat-square&color=34d399" alt="Release" />
  </a>
  <a href="https://github.com/gratisCobalt/sculpt/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/gratisCobalt/sculpt?style=flat-square" alt="License" />
  </a>
  <img src="https://img.shields.io/github/languages/top/gratisCobalt/sculpt?style=flat-square&color=3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/github/last-commit/gratisCobalt/sculpt?style=flat-square" alt="Last Commit" />
</p>

<p align="center">
  <a href="https://sculpt-app.de">Live App</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a>
</p>

---

## Was ist Sculpt?

Sculpt macht Fitness-Tracking so einfach wie es sein sollte. Kein Schnickschnack, keine Abo-Fallen — einfach Workouts tracken, Fortschritt sehen und besser werden.

Ob Anfänger oder erfahrener Athlet: Sculpt passt sich an dich an, generiert personalisierte Trainingspläne mit KI und motiviert dich mit cleverer Gamification.

## Features

**Intelligentes Training**
- KI-generierte Trainingspläne, personalisiert auf dein Level und deine Ziele
- Geführtes Training mit Timer und Übungsanleitung
- 1.300+ Übungen aus einer umfangreichen Datenbank

**Fortschritt, der motiviert**
- Dashboard mit Wochenübersicht: Workouts, Volumen, Kalorien
- Detaillierte Statistiken und Verlaufsgraphen
- Persönliche Rekorde und Meilensteine

**Zusammen stärker**
- Buddy-System: Trainiere mit Freunden
- Chat und gegenseitige Motivation
- Gemeinsame Challenges

**Gamification**
- Hantel-Coins als In-App-Währung
- Loot Boxes mit Belohnungen
- Shop mit Extras zum Freischalten

**Native iOS App**
- Installierbar als PWA oder native iOS-App
- Push-Benachrichtigungen
- Haptic Feedback und native Gesten

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| UI | Radix UI, Recharts, dnd-kit |
| Backend | Cloudflare Workers (Edge) |
| Datenbank | Cloudflare D1 (SQLite at Edge) |
| KI | Ollama (Self-hosted LLM) |
| iOS | Capacitor 8 |
| Analytics | PostHog |
| Deployment | Cloudflare Pages (auto-deploy on push) |

## Getting Started

### Voraussetzungen

- [Node.js](https://nodejs.org/) v18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)

### Installation

```bash
git clone https://github.com/gratisCobalt/sculpt.git
cd sculpt
npm install
npm run dev
```

Die App läuft auf `http://localhost:5173`.

### Test-Account

| Feld | Wert |
|------|------|
| Email | `test@sculpt-app.de` |
| Passwort | `test1234` |

> Das Backend läuft auf Cloudflare — lokal wird nur das Frontend gestartet.

## Scripts

```bash
npm run dev          # Entwicklungsserver starten
npm run build        # Produktions-Build
npm run test         # Tests (Watch-Mode)
npm run test:run     # Tests (einmalig)
npm run ios          # Build + iOS Simulator öffnen
```

## Deployment

Jeder Push auf `main` deployt automatisch via Cloudflare Pages auf [sculpt-app.de](https://sculpt-app.de).

---

<p align="center">
  Made with &hearts; for fitness enthusiasts
</p>
