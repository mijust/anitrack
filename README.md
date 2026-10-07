## Anime Tracker

Monorepo für die Anime-Tracker-WebApp. Die aktuelle Umsetzung ist für den lokalen Single-User-Betrieb optimiert (kein Login / Account erforderlich) und bietet AniList-Suche, saisonale Übersichten, Anime Ask (KI), personalisierte Recommendations und eine persistente Watchlist mit PostgreSQL oder SQLite.

> 📖 **Schritt-für-Schritt Startup & Proxmox-Deployment Guide**: Siehe [startup.md](startup.md).


### Voraussetzungen

- Node.js 20 oder neuer
- Python 3.9 oder neuer
- Docker Desktop für PostgreSQL (optional bei SQLite)

### Web-App starten

```bash
npm install
npm run dev
```

Die Web-App läuft unter http://localhost:3000

### Konfiguration (Zentrale Secrets im Root)

Alle Zugangsdaten, API-Keys und Umgebungsvariablen werden zentral in einer einzigen `.env`-Datei im Repository-Root gepflegt:

```bash
cp .env.example .env
```

Sowohl Docker Compose, das FastAPI-Backend (`apps/api`) als auch das Next.js Frontend (`apps/web`) laden ihre Einstellungen automatisch aus dieser Datei.

#### Übersicht aller Keys & Secrets

| Variable | Erforderlich? | Woher bekommen? / Zweck | Standardwert (Entwicklung) |
| :--- | :---: | :--- | :--- |
| **`OPENROUTER_API_KEY`** | **Für KI** | Erstelle einen kostenlosen API-Key auf [openrouter.ai/keys](https://openrouter.ai/keys). Wird für den KI-Assistenten *Anime Ask* benötigt. | *(leer / optional)* |
| **`OPENROUTER_MODEL`** | Optional | Sprachmodell(e) auf OpenRouter. Kommagetrennte Liste für automatische Fallbacks bei Provider-Ausfällen oder Rate-Limits. | `google/gemma-4-31b-it:free,nvidia/nemotron-3.5-lightning:free,liquid/lfm-2.5-2.6b:free` |
| **`POSTGRES_USER`** | **Ja (bei Docker)** | Benutzername für die lokale PostgreSQL-Datenbank (Docker). | `anime` |
| **`POSTGRES_PASSWORD`** | **Ja (bei Docker)** | Passwort für den PostgreSQL-Benutzer (Docker & Backend). | `securepassword` |
| **`POSTGRES_DB`** | **Ja (bei Docker)** | Name der Datenbank. | `anime` |
| **`POSTGRES_PORT`** | Optional | Port für den PostgreSQL-Container. | `5432` |
| **`DATABASE_URL`** | **Ja** | Async-Connection-String für SQLAlchemy & Alembic Migrations. | `postgresql+asyncpg://anime:securepassword@localhost:5432/anime` |
| **`FRONTEND_URL`** | **Ja** | URL des Next.js Frontends (für CORS). | `http://localhost:3000` |
| **`NEXT_PUBLIC_API_URL`** | **Ja** | Öffentliche URL des FastAPI-Backends für Browser-Requests. | `http://localhost:8000` |
| **`ANILIST_API_URL`** | Nein | Öffentliche AniList GraphQL API (**Kein API-Key erforderlich!**). | `https://graphql.anilist.co` |

> [!NOTE]
> **Brauche ich einen AniList API-Key?**
> Nein. Die Katalogsuche, saisonale Listen und Empfehlungen laufen über die öffentliche AniList GraphQL API, die keinen API-Schlüssel voraussetzt.
>
> **Brauche ich zwingend einen OpenRouter API-Key?**
> Nur wenn du das KI-Feature *Anime Ask* (individuelle Bewertung und Empfehlungen durch ein LLM) nutzen möchtest. Der Rest der App (Suche, Watchlist, Saisonübersicht) funktioniert auch ohne `OPENROUTER_API_KEY`.

### PostgreSQL starten

```bash
docker compose up -d db
# oder: npm run db:up
```

Die lokale Datenbank liest ihre Konfiguration direkt aus der Root-`.env`.

### API starten

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
# oder aus dem Root: npm run dev:api
```

Die Health-Endpunkte sind `/health` und `/health/db`.

Für saisonale Daten wird `GET /api/catalog/seasonal` verwendet. Anime Ask läuft über `POST /api/anime-ask` und benötigt einen gesetzten `OPENROUTER_API_KEY`. Recommendations kommen über `GET /api/recommendations`; sie schließen bereits gelistete Anime aus und werden 24 Stunden pro API-Prozess gecacht.

Backend-Tests laufen aus dem Repository-Root mit:

```bash
npm run test:api
# bzw.: PYTHONPATH=apps/api apps/api/.venv/bin/pytest -q apps/api/tests
```

### Struktur

- `apps/web`: Next.js App Router, TypeScript und Tailwind CSS 4
- `apps/api`: FastAPI, Async-SQLAlchemy und externe API-Clients
- `docker-compose.yml`: lokale PostgreSQL-Instanz

Für produktive Mehrprozess-Deployments sollte der In-Memory-Cache später durch Redis oder einen Datenbank-Cache ersetzt werden.
