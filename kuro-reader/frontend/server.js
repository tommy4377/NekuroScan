import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy per ottenere vero IP client dietro Render/Cloudflare
app.set('trust proxy', true);

// ========= COMPRESSION (Gzip/Brotli) =========
// Riduce dimensioni payload fino a 70-80%
app.use(compression({
  level: 6, // Bilanciamento velocità/compressione
  threshold: 1024, // Comprimi solo file > 1KB
  filter: (req, res) => {
    // Non comprimere immagini (già compressed)
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ========= SMART RATE LIMITING (Frontend) =========
// Permissivo - solo anti-bot aggressivi
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 300; // 300 req/min = 5 req/sec
const INTERNAL_IPS = ['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1'];

// Assets statici esclusi dal rate limiting
const isStaticAsset = (path) => {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|json|xml|txt)$/.test(path);
};

const rateLimiter = (req, res, next) => {
  // Skip assets statici (già cached)
  if (isStaticAsset(req.path)) {
    return next();
  }
  
  // Ottieni vero IP client (supporta X-Forwarded-For, X-Real-IP)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || 
             req.ip || 
             req.connection.remoteAddress;
  const now = Date.now();
  
  // Skip rate limiting per IP interni
  if (INTERNAL_IPS.includes(ip)) {
    return next();
  }
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const data = requestCounts.get(ip);
  
  if (now > data.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (data.count >= MAX_REQUESTS) {
    // Log per debugging
    const retryAfter = Math.ceil((data.resetTime - now) / 1000);
    console.warn(`⚠️ Frontend rate limit: IP ${ip}, ${data.count}/${MAX_REQUESTS}, retry in ${retryAfter}s`);
    
    // Standard HTTP Retry-After header
    res.setHeader('Retry-After', retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());
    
    return res.status(429).send('Troppe richieste, riprova tra poco');
  }
  
  data.count++;
  
  // Aggiungi headers informativi per tutte le richieste
  const remaining = Math.max(0, MAX_REQUESTS - data.count);
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());
  
  next();
};

// Cleanup ogni 5 minuti
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) requestCounts.delete(ip);
  }
}, 300000);

app.use(rateLimiter);

// Security and performance headers (NO Content-Type qui, gestito da express.static + fallback)
app.use((req, res, next) => {
  // HSTS - Force HTTPS (valido 1 anno)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy - Permissivo per compatibilità Vite/React
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://kuro-auth-backend.onrender.com https://kuro-proxy-server.onrender.com https://cdn.mangaworld.cx https: http: ws: wss:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  // Solo in production, CSP più restrittivo causa problemi - usa report-only
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy-Report-Only', csp);
  } else {
    res.setHeader('Content-Security-Policy', csp);
  }
  
  // Security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // X-Robots-Tag - Whitelist tutti i crawler tranne Google-Extended (AI training)
  res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1, noai, noimageai');
  
  // Cache per file statici
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

// Serve i file statici dalla cartella dist
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  maxAge: 0 // Gestito da header sopra
}));

// SPA Fallback: solo per route HTML, non per file statici o API
app.get('*', (req, res) => {
  // Non fare fallback per file con estensione o percorsi speciali
  const fileExtensionPattern = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|json|xml|txt)$/;
  
  if (fileExtensionPattern.test(req.path) || 
      req.path.includes('/robots.txt') || 
      req.path.includes('/sitemap.xml') ||
      req.path.includes('/manifest')) {
    return res.status(404).send('Not Found');
  }
  
  // Imposta Content-Type con charset UTF-8 per HTML (Best Practice)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ NeKuro Scan frontend server avviato su porta ${PORT}`);
});

