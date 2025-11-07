# ✅ Checklist Funzionalità NeKuro Scan

## 🎯 Test da Eseguire

### 1. Modalità Offline
- [ ] Vai in DevTools → Network → **Offline**
- [ ] La Home mostra "📡 Modalità Offline" con pulsante "Riprova connessione"
- [ ] Click su "Vai ai download" funziona
- [ ] Torna **Online** → notifica "🌐 Sei online!" appare
- [ ] Contenuti si ricaricano automaticamente

### 2. Download e Lettura Offline
- [ ] Vai su un manga
- [ ] Click sull'icona **📥 Download**
- [ ] Modal si apre con range selettore (da-a capitolo)
- [ ] Scarica capitoli (es: 1-3)
- [ ] Vai su **/downloads**
- [ ] Vedi manga raggruppato con:
  - Cover (blob cachata)
  - Titolo
  - Badge: "3 capitoli, X pagine"
  - Bottoni: **Cap. 1**, **Cap. 2**, **Cap. 3**
- [ ] Vai **offline**
- [ ] Click su "Cap. 1"
- [ ] Reader si apre e carica le pagine offline
- [ ] Badge "📥 Offline" appare nel reader
- [ ] Navigazione tra pagine funziona

### 3. Pagina Trending
- [ ] Vai su **/trending**
- [ ] Mostra solo "Capitoli in Tendenza" (no tab)
- [ ] Badge 🔥 sui primi 3
- [ ] Pulsante "Carica altri" funziona

### 4. Pagina Popular
- [ ] Vai su **/popular**
- [ ] Titolo: "Trending" (non "Popolari")
- [ ] NO tab "Più letti" / "Migliori"
- [ ] Solo trending con paginazione

### 5. Pagina Latest
- [ ] Vai su **/latest**
- [ ] NO duplicati di manga
- [ ] Deduplica funziona correttamente

### 6. Home - Top Series
- [ ] Tab "Top Series"
- [ ] NO card "Esplora tutte le categorie"
- [ ] Solo: Top Manga, Manhwa, Manhua, Oneshot

### 7. Performance
- [ ] Transizioni smooth su hover card
- [ ] Scroll fluido
- [ ] Logo caricato immediatamente
- [ ] No lag su cambio pagina

### 8. Cache e Service Worker
- [ ] Console log: `✅ Service Worker registrato`
- [ ] Console log: `[SW] ✅ Cached: web-app-manifest-192x192.png`
- [ ] Console log: `[Cache] ✅ Pre-cached: /web-app-manifest-192x192.png`
- [ ] Logo sempre visibile anche offline

## 🐛 Bug Risolti

✅ Offline mode permanente → Ora con doppio check e evento listener
✅ Reader offline non funzionante → Blob URLs ora funzionano
✅ Duplicati in Latest → Deduplica migliorata
✅ Tab duplicate in Trending → Rimosse
✅ Trending non in Popular → Ora è l'unico contenuto
✅ Card "Esplora categorie" → Rimossa
✅ Download non raggruppati → Accordion per manga
✅ Numero capitolo non mostrato → Regex migliorata
✅ Cover non in cache → Salvate come blob
✅ Logo non cachato → Pre-cache forzato
✅ Sito lento → React.memo + GPU acceleration

## 📊 Console Logs Attesi

### Al caricamento:
```
✅ Service Worker registrato: ServiceWorkerRegistration {...}
[SW] Installing service worker...
[SW] ✅ Cached: /web-app-manifest-192x192.png
[SW] ✅ All essential resources cached
[Cache] ✅ Pre-cached: /web-app-manifest-192x192.png
```

### Durante download:
```
✅ Cover manga salvata offline
📥 Download in corso: Scaricando 3 capitoli...
📥 Progresso: 1/3
✅ Download completato: Scaricati 3/3
```

### Durante lettura offline:
```
✅ Capitolo trovato offline!
✅ Recuperati 15/15 blob per capitolo offline
✅ Capitolo offline caricato: 15 pagine con blob URLs
📥 Modalità Offline - Caricato: 15 pagine
```

### Quando vai offline:
```
📡 Connessione persa
🔴 Browser offline
```

### Quando torni online:
```
🌐 Connessione ripristinata
✅ Proxy raggiungibile
```

## 🎨 UI Improvements

- Transizioni: `cubic-bezier(0.4, 0, 0.2, 1)`
- GPU acceleration: `willChange: transform`
- Smooth scroll: `scroll-behavior: smooth`
- Hover effects: `translateY(-8px) scale(1.02)`
- Fade in immagini: `opacity 0.3s`

## 🚀 Deploy

Build command Render: `cd kuro-reader/frontend && npm install && npm run build`

Funziona con:
- Node.js >=18
- patch-package installato globalmente nel preinstall
- Service Worker custom (non generato da Vite)

