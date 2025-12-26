# NeKuro Scan

<div align="center">

![NeKuro Scan Logo](nekuroscan/frontend/public/web-app-manifest-512x512.webp)

**Il miglior lettore di manga e light novel online gratuito**

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-00C7B7?style=for-the-badge&logo=vercel)](https://nekuro-scan.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://nekuroscan-1r86.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

[🌐 Live Demo](https://nekuro-scan.vercel.app) • [📖 Documentazione](#documentazione) • [🐛 Issues](https://github.com/tommy4377/NekuroScan/issues)

</div>

---

## 📖 Descrizione

**NeKuro Scan** è una piattaforma web moderna e performante per la lettura di manga e light novel online. Offre un'esperienza utente fluida con funzionalità avanzate come sincronizzazione cloud, lettura offline, personalizzazione avanzata e molto altro.

### ✨ Caratteristiche Principali

- 📚 **Catalogo Vasto**: Accesso a migliaia di manga e light novel
- 🔄 **Sincronizzazione Cloud**: I tuoi progressi sincronizzati su tutti i dispositivi
- 📱 **PWA Ready**: Installabile come app mobile
- 🌙 **Modalità Offline**: Scarica capitoli per la lettura offline
- ⚡ **Performance Ottimizzate**: Caricamento rapido e navigazione fluida
- 🎨 **UI Moderna**: Interfaccia intuitiva e personalizzabile
- 🔒 **Sicurezza**: Autenticazione JWT e protezione dati
- 🚀 **Ottimizzazioni**: Image proxy, caching intelligente, lazy loading

## 🏗️ Architettura

Il progetto è strutturato in due componenti principali:

```
NekuroScan/
├── nekuroscan/
│   ├── frontend/          # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── api/       # API clients
│   │   │   ├── components/# Componenti React
│   │   │   ├── pages/     # Pagine dell'app
│   │   │   └── utils/     # Utilities
│   │   └── vercel.json    # Configurazione Vercel
│   │
│   └── backend/           # Node.js + Express + Prisma
│       ├── auth-server.ts # Server unificato (Auth + Proxy)
│       ├── prisma/        # Schema database
│       └── utils/         # Utilities backend
```

### Stack Tecnologico

**Frontend:**
- ⚛️ React 18 + TypeScript
- 🎨 Chakra UI
- 🚀 Vite
- 📦 Zustand (State Management)
- 🔄 React Router
- 🎯 Service Workers (PWA)

**Backend:**
- 🟢 Node.js + Express
- 🗄️ PostgreSQL (Supabase)
- 🔐 Prisma ORM
- 🔑 JWT Authentication
- 🖼️ Cloudinary (Image Optimization)
- 📦 Redis (Caching)
- 🚀 Sharp (Image Processing)

## 🚀 Quick Start

### Prerequisiti

- Node.js 18+ 
- npm o yarn
- PostgreSQL database (o Supabase)
- (Opzionale) Redis per caching
- (Opzionale) Cloudinary per ottimizzazione immagini

### Installazione

1. **Clona il repository**
   ```bash
   git clone https://github.com/tommy4377/NekuroScan.git
   cd NekuroScan
   ```

2. **Backend Setup**
   ```bash
   cd nekuroscan/backend
   npm install
   
   # Configura le variabili d'ambiente
   cp .env.example .env
   # Modifica .env con le tue credenziali
   
   # Genera Prisma Client
   npx prisma generate
   
   # Esegui migrazioni
   npx prisma migrate dev
   
   # Avvia il server
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd nekuroscan/frontend
   npm install
   
   # Configura le variabili d'ambiente
   cp .env.example .env
   # Modifica .env con l'URL del backend
   
   # Avvia il dev server
   npm run dev
   ```

### Variabili d'Ambiente

**Backend** (`.env`):
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
REDIS_URL=redis://...              # Opzionale
CLOUDINARY_CLOUD_NAME=...         # Opzionale
SUPABASE_URL=https://...          # Opzionale
SUPABASE_SERVICE_ROLE_KEY=...     # Opzionale
PORT=10000
NODE_ENV=production
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:10000
VITE_PROXY_URL=http://localhost:10000
```

## 📚 Documentazione

### API Endpoints

Il backend espone i seguenti endpoint principali:

- `POST /api/auth/login` - Autenticazione utente
- `POST /api/auth/register` - Registrazione nuovo utente
- `GET /api/auth/me` - Informazioni utente corrente
- `POST /api/proxy` - Proxy generico per richieste
- `GET /api/image-proxy` - Proxy per immagini con caching
- `GET /health` - Health check (DB, Redis, Cloudinary)

Vedi [backend/README.md](nekuroscan/backend/README.md) per la documentazione completa.

### Deployment

**Frontend (Vercel):**
- Il frontend è configurato per Vercel con `vercel.json`
- Rewrites automatici per API calls
- SPA routing configurato

**Backend (Render):**
- Server unificato su Render
- Health check endpoint per uptime monitoring
- Auto-scaling configurato

## 🛠️ Sviluppo

### Script Disponibili

**Backend:**
```bash
npm start          # Avvia il server
npm run dev        # Modo sviluppo con hot reload
npm run build      # Build TypeScript
npm run migrate    # Esegui migrazioni database
```

**Frontend:**
```bash
npm run dev        # Dev server
npm run build      # Build produzione
npm run preview    # Preview build
npm run lint       # Linting
```

## 🤝 Contribuire

I contributi sono benvenuti! Per contribuire:

1. Fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi [LICENSE](LICENSE) per i dettagli.

## 🙏 Ringraziamenti

- [MangaWorld](https://www.mangaworld.cx) per il contenuto
- Tutti i contributor e tester

## 📞 Contatti

- 🌐 Website: [nekuro-scan.vercel.app](https://nekuro-scan.vercel.app)
- 🐛 Issues: [GitHub Issues](https://github.com/tommy4377/NekuroScan/issues)

---

<div align="center">

**Fatto con ❤️ per la community manga**

⭐ Se ti piace il progetto, lascia una stella!

</div>

