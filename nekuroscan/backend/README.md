# NeKuro Scan Backend v5.0

Unified Backend + Proxy Server per NeKuroScan.

## 🚀 Setup

### Variabili d'Ambiente Richieste

```env
# Obbligatorie
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# Opzionali (ma raccomandate)
REDIS_URL=redis://...                    # Cache immagini (fallback in-memory se non configurato)
CLOUDINARY_CLOUD_NAME=your-cloud-name    # Ottimizzazione immagini
SUPABASE_URL=https://...                 # Storage avatar/banner
SUPABASE_SERVICE_ROLE_KEY=...            # Storage avatar/banner

# Opzionali per CORS
FRONTEND_URL=https://your-frontend.vercel.app
VERCEL_URL=your-project.vercel.app
```

### Installazione

```bash
npm install
npm run build  # Genera Prisma Client
npm start
```

## 📋 Features

- ✅ Autenticazione JWT
- ✅ Proxy immagini con caching Redis/In-Memory
- ✅ Ottimizzazione immagini via Cloudinary
- ✅ Storage avatar/banner via Supabase
- ✅ Database normalizzato (favorite, library_manga, history_entry)
- ✅ Health check endpoint `/health`
- ✅ Rate limiting avanzato
- ✅ Connection pooling HTTP/HTTPS

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Utente corrente

### User Data
- `GET /api/user/data` - Dati utente (favorites, library, history, progress)
- `POST /api/user/sync` - Sincronizza dati utente
- `PUT /api/user/profile` - Aggiorna profilo (avatar/banner)

### Proxy
- `POST /api/proxy` - Proxy generico per richieste
- `GET /api/image-proxy` - Proxy immagini con ottimizzazione
- `POST /api/parse` - Parsing HTML

### Health
- `GET /health` - Health check (Database, Redis, Cloudinary)

## 🎯 Ottimizzazioni

- **Sharp**: Usato SOLO per avatar (resize leggero). Banner senza sharp per evitare OOM su Render.
- **Redis**: Fallback automatico su Map in-memory se non configurato.
- **Cloudinary**: Ottimizzazione immagini per covers, logo, etc. Reader images bypass (originali).
- **Connection Pooling**: HTTP/HTTPS agents con keep-alive per performance.

## 🔴 Configurazione Redis

### Cos'è Redis?

Redis è un database in-memory (chiave-valore) ultra-veloce usato per:
- **Caching**: Memorizza le URL delle immagini ottimizzate da Cloudinary
- **Performance**: Evita di ri-ottimizzare le stesse immagini più volte
- **Persistenza**: La cache sopravvive ai riavvii del server
- **Scalabilità**: Condivisibile tra più istanze del backend

### Perché usarlo?

**Senza Redis** (fallback in-memory):
- ✅ Funziona comunque
- ❌ Cache si svuota ad ogni riavvio
- ❌ Non condivisibile tra istanze multiple
- ❌ Limitato alla RAM del processo Node.js

**Con Redis**:
- ✅ Cache persistente tra riavvii
- ✅ Condivisibile tra più istanze
- ✅ Più efficiente e veloce
- ✅ Migliori performance in produzione

### Come Configurare Redis

#### Opzione 1: Redis su Render (Consigliato - Gratuito)

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Clicca su **"New +"** → **"Redis"**
3. Configura:
   - **Name**: `nekuroscan-redis` (o qualsiasi nome)
   - **Plan**: **Free** (25MB, sufficiente per iniziare)
   - **Region**: Stessa regione del tuo backend
4. Clicca **"Create Redis"**
5. Una volta creato, copia l'**Internal Redis URL** (formato: `redis://...`)
6. Nel tuo servizio backend su Render:
   - Vai su **Environment** tab
   - Aggiungi variabile: `REDIS_URL` = `redis://...` (l'URL copiato)
7. Riavvia il servizio

**Nota**: Su Render, usa l'**Internal Redis URL** (non quello pubblico) se backend e Redis sono nella stessa regione.

#### Opzione 2: Upstash Redis (Gratuito - Consigliato per Vercel)

1. Vai su [Upstash](https://upstash.com)
2. Crea account gratuito
3. Clicca **"Create Database"**
4. Scegli **Redis**
5. Configura:
   - **Name**: `nekuroscan-cache`
   - **Type**: **Regional** (più veloce) o **Global** (più costoso)
   - **Region**: Scegli la regione più vicina
6. Clicca **"Create"**
7. Copia l'**UPSTASH_REDIS_REST_URL** o **UPSTASH_REDIS_REST_PORT**
8. Per Render, usa il formato: `redis://default:PASSWORD@HOST:PORT`
   - Dove `PASSWORD` è il token REST
   - `HOST` e `PORT` sono nell'URL REST

#### Opzione 3: Redis Cloud (Gratuito fino a 30MB)

1. Vai su [Redis Cloud](https://redis.com/try-free/)
2. Crea account gratuito
3. Crea un nuovo database
4. Copia la connection string
5. Aggiungi `REDIS_URL` nel tuo backend

#### Opzione 4: Redis Locale (Solo per sviluppo)

```bash
# macOS
brew install redis
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

Poi nel tuo `.env`:
```env
REDIS_URL=redis://localhost:6379
```

### Verifica Configurazione

Dopo aver configurato Redis, verifica che funzioni:

1. **Controlla i log all'avvio**:
   ```
   ✅ Redis connected
   ✅ Redis Image Cache initialized
   ```

2. **Controlla lo stato**:
   - Vai su `/health` endpoint
   - Dovresti vedere: `"redis": { "connected": true }`

3. **Controlla il banner di avvio**:
   ```
   ║ Redis: ✅ Configured                    ║
   ```

### Formato REDIS_URL

Il formato standard è:
```
redis://[password@]host[:port][/database]
```

Esempi:
- `redis://localhost:6379` (locale, senza password)
- `redis://:mypassword@redis.example.com:6379` (con password)
- `redis://default:abc123@redis-12345.upstash.io:6379` (Upstash)
- `redis://internal-redis-12345:6379` (Render internal)

### Troubleshooting

**Problema**: "Redis: ⚠️ Fallback"
- **Soluzione**: Verifica che `REDIS_URL` sia configurato correttamente nelle variabili d'ambiente

**Problema**: "Redis Error: Connection refused"
- **Soluzione**: Verifica che Redis sia avviato e l'URL sia corretto

**Problema**: "Redis: max reconnect attempts"
- **Soluzione**: Verifica firewall/network, Redis potrebbe non essere raggiungibile

**Nota**: Il sistema funziona anche senza Redis usando un fallback in-memory. Redis è opzionale ma raccomandato per produzione.

## 📊 Database

Usa tabelle normalizzate:
- `favorite` - Favoriti utente
- `library_manga` - Library (reading/completed/dropped)
- `history_entry` - Cronologia lettura
- `reading_progress` - Progresso lettura

## 🔒 Sicurezza

- Rate limiting per IP
- CORS configurato per frontend
- JWT authentication
- Input sanitization
- SQL injection protection (Prisma)

