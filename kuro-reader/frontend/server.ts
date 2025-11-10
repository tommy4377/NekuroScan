// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('ERROR: dist/ directory not found. Run "npm run build" first.');
}

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

// ✅ CSP Violation Report Endpoint (solo development per debugging)
if (process.env.NODE_ENV === 'development') {
  app.post('/csp-violation-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    if (req.body) {
      console.warn('🚨 CSP VIOLATION:', JSON.stringify(req.body, null, 2));
    }
    res.status(204).end();
  });
}

// ✅ SECURITY: Enhanced headers with strict CSP (NO unsafe-inline for scripts, NO unsafe-eval)
app.use((req, res, next) => {
  // HSTS - Force HTTPS (valido 1 anno)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // ✅ COOP - Cross-Origin-Opener-Policy (isolamento finestra)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // ✅ COEP - Cross-Origin-Embedder-Policy (isolamento risorse)
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');  // unsafe-none per immagini cross-origin
  
  // ✅ CORP - Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // ✅ Content Security Policy - PRODUCTION SECURE
  // Vite + React in produzione NON richiedono unsafe-eval
  // Script-src: NO unsafe-inline, NO unsafe-eval ✅
  // Style-src: unsafe-inline solo per Chakra UI (può essere rimosso con hash se necessario)
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const csp = [
    "default-src 'self'",
    
    // ✅ SCRIPTS: Sicuri con unsafe-hashes per event handlers React
    "script-src 'self' 'unsafe-hashes'",
    
    // ⚠️ STYLES: unsafe-inline necessario per Chakra UI emotion cache
    // Alternative: calcolare hash SHA-256 di ogni stile inline o usare nonce
    // Per rimuovere unsafe-inline: implementare CSP nonce in index.html
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    
    // Font da self + Google Fonts + data URIs
    "font-src 'self' https://fonts.gstatic.com data:",
    
    // Immagini: self + data URIs + blob + tutti i domini (per manga proxy)
    "img-src 'self' data: blob: https: http:",
    
    // API Connections: backend auth + proxy + CDN manga
    "connect-src 'self' https://kuro-auth-backend.onrender.com https://kuro-proxy-server.onrender.com https://cdn.mangaworld.cx https: http:",
    
    // Media: self + blob + data
    "media-src 'self' blob: data:",
    
    // Web Workers e Service Workers (PWA)
    "worker-src 'self' blob:",
    
    // ✅ Blocca contenuti pericolosi
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    
    // ✅ Upgrade automatico HTTP -> HTTPS
    "upgrade-insecure-requests"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // ✅ CSP Report-Only per monitoraggio (opzionale in development)
  if (isDevelopment) {
    // In dev, monitora violazioni senza bloccare
    const reportOnlyCsp = csp.replace(/;$/, '') + "; report-uri /csp-violation-report";
    res.setHeader('Content-Security-Policy-Report-Only', reportOnlyCsp);
  }
  
  // Security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // X-Robots-Tag - Permetti indicizzazione completa
  res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  
  // Cache per file statici
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

// Serve i file statici dalla cartella dist
if (existsSync(distPath)) {
  app.use(express.static(distPath, {
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
    
    const indexPath = path.join(distPath, 'index.html');
    if (existsSync(indexPath)) {
      // Imposta Content-Type con charset UTF-8 per HTML (Best Practice)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(indexPath);
    } else {
      res.status(500).send('Error: index.html not found in dist/');
    }
  });
} else {
  // ❌ Fallback se dist non esiste - mostra errore chiaro
  app.get('*', (req, res) => {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Build Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #1a202c; 
            color: #e2e8f0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            background: #2d3748; 
            padding: 40px; 
            border-radius: 12px;
            text-align: center;
          }
          h1 { color: #f56565; margin-bottom: 20px; }
          code { 
            background: #1a202c; 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 14px;
          }
          .info { 
            text-align: left; 
            background: #1a202c; 
            padding: 20px; 
            border-radius: 8px; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Build Error</h1>
          <p>The <code>dist/</code> directory was not found.</p>
          <div class="info">
            <p><strong>On Render, make sure:</strong></p>
            <ul>
              <li><code>Build Command</code>: npm install && npm run build</li>
              <li><code>Start Command</code>: npm start</li>
              <li>Check the build logs for errors</li>
            </ul>
            <p style="margin-top: 15px;"><strong>If imagemin fails, add this environment variable:</strong></p>
            <code>SKIP_IMAGE_OPTIMIZATION=true</code>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
            Current directory: ${__dirname}
          </p>
        </div>
      </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`✅ NeKuro Scan frontend server avviato su porta ${PORT}`);
});

