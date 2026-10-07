# Anime Tracker – Startup & Deployment Guide

Diese Anleitung beschreibt Schritt für Schritt:
1. **Lokales Testen auf macOS** (sowohl mit leichtgewichtiger SQLite als auch mit PostgreSQL)
2. **Produktions-Deployment auf Proxmox VE** (in einem Docker LXC-Container für den 24/7-Zugriff im Heimnetzwerk)

---

## 1. Lokales Testen auf macOS

### Voraussetzungen
* **Node.js 20+** (`node -v`)
* **Python 3.9+** (`python3 -v`)
* Git

---

### Schritt 1: Konfiguration & Secrets anlegen
Kopiere im Root-Verzeichnis des Projekts die Vorlage:
```bash
cp .env.example .env
```

Öffne die `.env` und entscheide dich für eine Datenbank:

* **Option A: Sofort-Test mit SQLite (Kein Docker auf dem Mac erforderlich – Empfohlen):**
  Ändere in der `.env` die Zeile `DATABASE_URL`:
  ```env
  DATABASE_URL=sqlite+aiosqlite:///./anime.db
  ```
* **Option B: Mit PostgreSQL (erfordert Docker Desktop / Orbstack auf dem Mac):**
  Lasse die `DATABASE_URL` auf dem Standardwert (`postgresql+asyncpg://...`) und starte Postgres:
  ```bash
  npm run db:up
  ```

*Trage in beiden Fällen deinen `OPENROUTER_API_KEY` ein, falls du die KI-Funktionen testen möchtest.*

---

### Schritt 2: Python-Umgebung & Datenbank initialisieren

```bash
# In das API-Verzeichnis wechseln
cd apps/api

# Virtuelle Umgebung erstellen und aktivieren
python3 -m venv .venv
source .venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Datenbanktabellen über Alembic Migrations anlegen
alembic upgrade head

# Zurück ins Root-Verzeichnis
cd ../..
```

---

### Schritt 3: Services starten

Öffne zwei separate Terminal-Tabs:

**Terminal 1 (FastAPI Backend):**
```bash
npm run dev:api
```
*(Die API läuft auf `http://localhost:8000`. Healthcheck: `http://localhost:8000/health`)*

**Terminal 2 (Next.js Frontend):**
```bash
npm run dev
```
*(Die Web-App läuft auf `http://localhost:3000`)*

---

### Schritt 4: Testen im Browser (`http://localhost:3000`)

1. **Konto anlegen**:
   * Rechts unter *Dein Konto* Benutzername & Passwort eingeben $\rightarrow$ *Konto erstellen*.
2. **AniList-Katalog & Suche**:
   * Gib einen Titel in die Suchleiste ein (z. B. *Frieren* oder *One Piece*).
   * Klicke auf *Zur Liste hinzufügen* (Button zeigt Lade-Feedback).
3. **Anime Ask (KI-Assistent)**:
   * **Empfehlungen**: z. B. *„Ich suche spannende Mystery-Anime mit Fantasy-Setting.“*
   * **Bewerten**: z. B. *„Bewerte Death Note für mich.“*
   * Die Antwort enthält Score und detaillierte Begründungen.
4. **Watchlist verwalten**:
   * Scrolle nach unten zu *Meine Liste*, filtere nach Status oder markiere Anime als abgeschlossen.

---

## 2. Deployment auf Proxmox VE (Docker LXC)

Ziel ist es, den gesamten Anime-Tracker-Stack (PostgreSQL, FastAPI und Next.js) isoliert in einem unprivilegierten Debian 12 LXC-Container mit Docker laufen zu lassen.

```
Heimnetzwerk (PC / Smartphone / Tablet)
               │
               ▼
┌── Proxmox VE ────────────────────────────────────────────────────────┐
│  ┌── LXC Container (Debian 12 + Docker) ── IP: 192.168.1.150 ──────┐ │
│  │                                                                 │ │
│  │   ├── Container: db   (PostgreSQL 16)                           │ │
│  │   ├── Container: api  (FastAPI Backend, Port 8000)              │ │
│  │   └── Container: web  (Next.js Web-App, Port 3000)              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Schritt 1: Docker LXC-Container auf Proxmox erstellen

* **Variante A: Schnelle 1-Klick-Installation via Proxmox Helper Scripts (Empfohlen):**
  1. Öffne die Proxmox Web-Oberfläche $\rightarrow$ Wähle deinen Node $\rightarrow$ **Shell**.
  2. Führe das bewährte Community-Script aus:
     ```bash
     bash -c "$(wget -qLO - https://github.com/community-scripts/proxmox-apps/raw/main/ct/docker.sh)"
     ```
  3. Folge dem Assistenten (Advanced Settings auswählen, um eine **statische IP** z. B. `192.168.1.150/24` und dein Gateway/Router `192.168.1.1` einzustellen).

* **Variante B: Manueller LXC:**
  * Debian 12 Template wählen.
  * Unter *Options*: **Nesting: 1** und **keyctl: 1** aktivieren (wichtig für Docker im unprivileged LXC).
  * Im LXC anmelden und Docker installieren:
    ```bash
    apt-get update && apt-get install -y curl git
    curl -fsSL https://get.docker.com | sh
    ```

---

### Schritt 2: Projekt im LXC klonen

Verbinde dich per SSH oder über die Proxmox-Konsole mit deinem Docker-LXC:

```bash
# Projekt von GitHub klonen
git clone https://github.com/mijust/anitrack.git
cd anitrack
```
*(Oder per SSH-Key: `git clone git@github.com:mijust/anitrack.git`)*

---

### Schritt 3: Produktions-Konfiguration anpassen

Erstelle die `.env`-Datei aus der Vorlage:
```bash
cp .env.example .env
nano .env
```

Passe die folgenden Werte an deine Umgebung an:

```env
# 1. DATENBANK (wird intern im Docker-Netzwerk verbunden)
POSTGRES_USER=anime
POSTGRES_PASSWORD=WaehleEinSicheresPasswortHier
POSTGRES_DB=anime

# 2. BACKEND API
ENVIRONMENT=production

# Mindestens 32 Zeichen lang! (z. B. erzeugen via: openssl rand -hex 32)
SESSION_SECRET=hier-deinen-langen-zufaelligen-hex-string-eintragen

# Trage hier die IP-Adresse deines Proxmox LXC-Containers ein:
FRONTEND_URL=http://192.168.1.150:3000

# OpenRouter Key für die KI
OPENROUTER_API_KEY=sk-or-v1-dein-echter-key

# 3. FRONTEND (Next.js)
# Ebenfalls die LAN-IP deines Proxmox LXC-Containers:
NEXT_PUBLIC_API_URL=http://192.168.1.150:8000
```
*(Speichern in `nano`: `Strg + O`, `Enter`, `Strg + X`)*

---

### Schritt 4: Stack bauen und starten

Starte alle 3 Container mit einem einzigen Befehl:

```bash
docker compose up -d --build
```

**Was passiert automatisch im Hintergrund?**
1. Der PostgreSQL-Container startet und wird initialisiert.
2. Der Backend-Container wartet, bis Postgres gesund ist (`healthy`), führt automatisch alle Alembic-Migrationen aus und startet den API-Dienst.
3. Der Next.js-Container baut das minimale Standalone-Image und startet auf Port 3000.

---

### Schritt 5: Status prüfen & Zugriff im Heimnetzwerk

1. **Status prüfen:**
   ```bash
   docker compose ps
   ```
   Alle drei Dienste (`db`, `api`, `web`) sollten den Status `running` (bzw. `healthy`) haben.

2. **Logs bei Bedarf ansehen:**
   ```bash
   docker compose logs -f
   ```

3. **Zugriff im Heimnetzwerk:**
   Öffne auf einem beliebigen Gerät im Heimnetzwerk (PC, Laptop, Smartphone):
   ```
   http://<DEINE-PROXMOX-LXC-IP>:3000
   ```
   *(Beispiel: `http://192.168.1.150:3000`)*

---

### Schritt 6: Zukünftige Updates einspielen

Wenn du Änderungen im Repository machst und auf GitHub pushst, aktualisierst du den Proxmox-Container mit:

```bash
cd /pfad/zu/anitrack
git pull
docker compose up -d --build
```
Docker baut automatisch nur die veränderten Schichten neu und startet die betroffenen Container ohne Datenverlust neu (die PostgreSQL-Daten liegen sicher im Volume `postgres_data`).
