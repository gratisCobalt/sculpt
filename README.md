# 💪 Sculpt - Dein persönlicher Fitness Tracker

Sculpt ist eine moderne Fitness-App für das Tracking von Workouts, Trainingsfortschritt und mehr. Entwickelt mit React, TypeScript und Tailwind CSS.

## ✨ Features

- 📊 **Dashboard** - Wochenübersicht mit Übungen, Workouts, Kalorien und Volumen
- 🏋️ **Trainingsplan** - KI-generierte, personalisierte Trainingspläne
- 📈 **Fortschritt** - Detaillierte Statistiken und Analysen
- 👥 **Buddy System** - Trainiere mit Freunden und motiviert euch gegenseitig
- 🎁 **Shop & Loot Boxes** - Gamification mit Hantel-Währung
- 🤖 **KI-Coach** - Fitness-Beratung powered by Google Gemini

## 🚀 Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) (v22+)
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

### 1. Repository klonen

```bash
git clone https://github.com/gratisCobalt/sculpt-self-hosted.git
cd sculpt-self-hosted
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Datenbank starten (Docker)

```bash
# PostgreSQL & pgAdmin starten
docker-compose up -d

# Status prüfen
docker ps
```

Die Datenbank wird automatisch mit dem Schema initialisiert (aus `db/init/`).

**Zugangsdaten:**
- **PostgreSQL**: `localhost:5432`
  - User: `sculpt`
  - Password: `sculpt_dev_2026`
  - Database: `sculpt`
- **pgAdmin**: `localhost:5050`
  - Email: `admin@sculpt.dev`
  - Password: `admin`

### 4. Umgebungsvariablen einrichten

Erstelle eine `.env` Datei im Root-Verzeichnis (falls nicht vorhanden):

```env
COMING SOON...
```

### 5. Server starten

```bash
# Terminal 1: Backend-Server (Express API)
npm run server
```

Der Server läuft auf `http://localhost:3000`.

### 6. Frontend starten

```bash
# Terminal 2: Vite Dev Server
npm run dev
```

Die App läuft auf `http://localhost:5173`.

## 📁 Projektstruktur

```
sculpt-native/
├── db/                    # Datenbank-Migrations & Seed-Daten
│   └── init/              # Docker-Init-Scripts
├── server/                # Express Backend
│   ├── index.ts           # API-Routes
│   └── utils/             # Utilities (TOON Parser, etc.)
├── src/                   # React Frontend
│   ├── components/        # UI-Komponenten
│   ├── contexts/          # React Contexts (Auth, etc.)
│   ├── lib/               # API Client, Utils
│   ├── pages/             # Seiten-Komponenten
│   └── types/             # TypeScript Types
├── docker-compose.yml     # Docker-Konfiguration
└── package.json           # NPM Scripts & Dependencies
```

## 🛠️ NPM Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Startet Vite Dev Server |
| `npm run server` | Startet Express Backend |
| `npm run build` | Baut die App für Produktion |
| `npm run lint` | Führt ESLint aus |
| `npm run test` | Startet Vitest im Watch-Mode |
| `npm run test:run` | Führt Tests einmalig aus |

## 🐳 Docker Commands

```bash
# Container starten
docker-compose up -d

# Container stoppen
docker-compose down

# Logs ansehen
docker-compose logs -f postgres

# Datenbank zurücksetzen (⚠️ löscht alle Daten!)
docker-compose down -v
docker-compose up -d
```

## 👤 Test-Account

Für die Entwicklung kannst du folgenden Account nutzen:

- **Email**: `test@sculpt-app.de`
- **Password**: `TestUser123!`

## 🔧 Troubleshooting

### Port bereits belegt

```bash
# Prüfen welcher Prozess den Port nutzt
lsof -i :3000
lsof -i :5432

# Prozess beenden
kill -9 <PID>
```

### Datenbank-Verbindung fehlgeschlagen

```bash
# Container-Status prüfen
docker ps -a

# Container-Logs ansehen
docker logs sculpt-db

# Container neu starten
docker-compose restart postgres
```

### Node Modules Probleme

```bash
# Cache löschen und neu installieren
rm -rf node_modules package-lock.json
npm install
```

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

---

Made with ❤️ for fitness enthusiasts
