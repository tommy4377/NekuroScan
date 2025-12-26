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

