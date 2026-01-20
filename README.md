# 💪 Sculpt - Dein persönlicher Fitness Tracker

Sculpt ist eine moderne Fitness-App für das Tracking von Workouts, Trainingsfortschritt und mehr. Entwickelt mit React, TypeScript und Tailwind CSS, gehostet auf Cloudflare Pages mit D1 Datenbank.

## ✨ Features

- 📊 **Dashboard** - Wochenübersicht mit Übungen, Workouts, Kalorien und Volumen
- 🏋️ **Trainingsplan** - KI-generierte, personalisierte Trainingspläne
- 📈 **Fortschritt** - Detaillierte Statistiken und Analysen
- 👥 **Buddy System** - Trainiere mit Freunden und motiviert euch gegenseitig
- 🎁 **Shop & Loot Boxes** - Gamification mit Hantel-Währung
- 🤖 **KI-Coach** - Fitness-Beratung (coming soon)

## 🚀 Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Cloudflare Account (für D1 Datenbank)

### 1. Repository klonen

```bash
git clone https://github.com/gratisCobalt/sculpt-self-hosted.git
cd sculpt-self-hosted
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Cloudflare Login

```bash
wrangler login
```

### 4. Lokale Entwicklung

```bash
# Frontend + API (mit lokaler D1)
npm run dev
```

Die App läuft auf `http://localhost:5173`.

## 📁 Projektstruktur

```
sculpt-native/
├── db/d1/                 # D1 Migrationen & Seed-Daten
│   ├── 001_schema.sql     # Datenbankschema
│   └── seed_mockup_data.sql
├── functions/             # Cloudflare Pages Functions (API)
│   ├── api/               # API-Routes
│   └── lib/               # Shared utilities
├── src/                   # React Frontend
│   ├── components/        # UI-Komponenten
│   ├── contexts/          # React Contexts (Auth, etc.)
│   ├── lib/               # API Client, Utils
│   ├── pages/             # Seiten-Komponenten
│   └── types/             # TypeScript Types
├── wrangler.jsonc         # Cloudflare Konfiguration
└── package.json           # NPM Scripts & Dependencies
```

## 🛠️ NPM Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Startet Vite Dev Server (Frontend) |
| `npm run build` | Baut die App für Produktion |
| `npm run lint` | Führt ESLint aus |
| `npm run test` | Startet Vitest im Watch-Mode |

## 🗄️ D1 Database Commands

```bash
# Migrationen ausführen (lokal)
npx wrangler d1 execute sculpt-db --local --file=db/d1/001_schema.sql

# Migrationen ausführen (remote)
npx wrangler d1 execute sculpt-db --remote --file=db/d1/001_schema.sql

# Datenbank abfragen
npx wrangler d1 execute sculpt-db --remote --command "SELECT COUNT(*) FROM app_user"

# Mock-Daten seeden (Preview-DB)
npx wrangler d1 execute sculpt-dev --remote --file=db/d1/seed_mockup_data.sql
```

## 🔧 Umgebungsvariablen

### `.dev.vars` (Cloudflare Functions Secrets)
```env
JWT_SECRET="your-secret-key"
```

### `.env` (Optional - für Scripts)
```env
EXERCISEDB_API_KEY=your-key  # Für Exercise-Import
GOOGLE_CLIENT_ID=your-id     # Für OAuth
```

## 👤 Test-Account

Für die Entwicklung:

- **Email**: `test@sculpt-app.de`
- **Dev Login**: Klicke auf "Dev Login" auf der Login-Seite

## 🚀 Deployment

Das Projekt wird automatisch bei jedem Push auf `main` via Cloudflare Pages deployt.

```bash
# Manuelles Deployment
npx wrangler pages deploy dist --project-name=sculpt-self-hosted
```

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

---

Made with ❤️ for fitness enthusiasts
