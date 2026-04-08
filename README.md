<p align="center">
  <img src="public/icons/icon-32x32.svg" width="80" height="80" alt="Sculpt Logo" />
</p>

<h1 align="center">Sculpt</h1>
<p align="center">Fitness Tracker — Web & iOS</p>

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

---

## Was ist Sculpt?

Eine Fitness-App zum Tracken von Workouts und Trainingsfortschritt. Läuft im Browser und als native iOS-App.

## Features

- **Workout-Tracking** — Übungen loggen, Sätze, Gewicht, Wiederholungen
- **Trainingspläne** — KI-generierte Pläne basierend auf Level und Zielen
- **Geführtes Training** — Timer und Übungsanleitung während des Workouts
- **Dashboard** — Wochenübersicht mit Workouts, Volumen, Kalorien
- **Statistiken** — Verlaufsgraphen und persönliche Rekorde
- **Buddy-System** — Mit Freunden trainieren und chatten
- **Gamification** — Coins sammeln, Loot Boxes, Shop
- **1.300+ Übungen** — Umfangreiche Übungsdatenbank
- **iOS App** — Native App via Capacitor, Push-Benachrichtigungen

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| UI | Radix UI, Recharts, dnd-kit |
| Backend | Cloudflare Workers |
| Datenbank | Cloudflare D1 |
| KI | Ollama |
| iOS | Capacitor 8 |
| Deployment | Cloudflare Pages |

## Getting Started

```bash
git clone https://github.com/gratisCobalt/sculpt.git
cd sculpt
npm install
npm run dev
```

Die App läuft auf `http://localhost:5173`. Das Backend läuft auf Cloudflare — lokal wird nur das Frontend gestartet.

### Test-Account

| Feld | Wert |
|------|------|
| Email | `test@sculpt-app.de` |
| Passwort | `test1234` |

## Scripts

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build
npm run test         # Tests (Watch-Mode)
npm run test:run     # Tests (einmalig)
npm run ios          # Build + iOS Simulator
```

## Deployment

Push auf `main` deployt automatisch via Cloudflare Pages auf [sculpt-app.de](https://sculpt-app.de).

---

<p align="center">
  Made with &hearts; for fitness enthusiasts
</p>
