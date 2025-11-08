import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

// Configure axios defaults
axios.defaults.maxRedirects = 10;
axios.defaults.validateStatus = (status) => status < 600;

const app = express();
const PORT = process.env.PORT || 10001;

// Trust proxy per ottenere vero IP client
app.set('trust proxy', true);

app.use(cors({
  origin: [
    'https://nekuroscan.onrender.com',
    'https://nekuroscan.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ]
}));
app.use(express.json({ limit: '1mb' }));

// ========= USER AGENT ROTATION (Anti-Block) =========
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// Delay random per sembrare più umano (anti-bot)
const humanDelay = () => new Promise(resolve => {
  const delay = Math.random() * 300 + 100; // 100-400ms random
  setTimeout(resolve, delay);
});

// ========= ADVANCED RATE LIMITING & DDoS PROTECTION =========
const requestCounts = new Map();
const ipBlacklist = new Map();
const suspiciousActivity = new Map();
const requestTiming = new Map(); // Per rilevare burst rapidi
const ipFirstSeen = new Map(); // Track prima richiesta IP (grace period)

// Rate limiting proxy più conservativo
// - Immagini lazy load: ~20-30 immagini alla volta
// - API proxy: parsing HTML ogni 2-3 sec
// - Bot detection: >5 req/sec simultanee
const RATE_LIMITS = {
  global: { window: 60000, max: 120 }, // 120 req/min = 2 req/sec
  proxy: { window: 60000, max: 60 },   // 60 proxy req/min = 1 req/sec (HTML parsing)
  image: { window: 60000, max: 100 },  // 100 immagini/min (lazy load batch)
  burst: { window: 1000, max: 5 }      // Max 5 req/sec (anti-burst più stretto)
};

// Blacklist IP per abusi
const blacklistIP = (ip, duration = 3600000) => {
  const until = Date.now() + duration;
  ipBlacklist.set(ip, until);
  console.warn(`🚨 PROXY: IP BLACKLISTED ${ip} fino a ${new Date(until).toISOString()}`);
};

const isBlacklisted = (ip) => {
  if (ipBlacklist.has(ip)) {
    const until = ipBlacklist.get(ip);
    if (Date.now() < until) return true;
    ipBlacklist.delete(ip);
  }
  return false;
};

// Rileva burst sospetti (troppe richieste troppo velocemente)
const detectBurst = (ip) => {
  const now = Date.now();
  const key = `burst_${ip}`;
  
  if (!requestTiming.has(key)) {
    requestTiming.set(key, [now]);
    return false;
  }
  
  const timestamps = requestTiming.get(key);
  // Mantieni solo timestamp dell'ultimo secondo
  const recentTimestamps = timestamps.filter(t => now - t < 1000);
  recentTimestamps.push(now);
  requestTiming.set(key, recentTimestamps);
  
  // Se più di 5 richieste in 1 secondo = burst sospetto (ridotto per essere più conservativo)
  return recentTimestamps.length > 5;
};

// Whitelist IP interni (non rate limit)
const INTERNAL_IPS = ['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1'];

// Rate limiter avanzato multi-livello
const advancedRateLimiter = (limitType = 'global') => {
  return (req, res, next) => {
    // Ottieni vero IP client (supporta X-Forwarded-For, X-Real-IP)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.ip || 
               req.connection.remoteAddress;
    const now = Date.now();
    
    // Skip rate limiting per IP interni (health checks, localhost)
    if (INTERNAL_IPS.includes(ip)) {
      return next();
    }
    
    // Check blacklist
    if (isBlacklisted(ip)) {
      return res.status(403).json({ 
        success: false,
        error: 'IP temporaneamente bloccato per attività sospetta' 
      });
    }
    
    // Grace period: primi 10 secondi più permissivi per primo caricamento pagina
    if (!ipFirstSeen.has(ip)) {
      ipFirstSeen.set(ip, now);
    }
    const ipAge = now - ipFirstSeen.get(ip);
    const isNewConnection = ipAge < 10000; // 10 secondi grace period
    
    // Rileva burst attacks (ma solo se molto aggressivi e non in grace period)
    if (!isNewConnection && detectBurst(ip)) {
      const abuseKey = `burst_abuse_${ip}`;
      const abuseCount = (suspiciousActivity.get(abuseKey) || 0) + 1;
      suspiciousActivity.set(abuseKey, abuseCount);
      
      // Ban solo dopo 5 burst ripetuti (non 3) per evitare falsi positivi
      if (abuseCount >= 5) {
        blacklistIP(ip, 1800000); // Ban 30 minuti per burst
        return res.status(429).json({ 
          success: false, 
          error: 'Troppe richieste troppo velocemente' 
        });
      }
    }
    
    const limit = RATE_LIMITS[limitType] || RATE_LIMITS.global;
    const key = `${ip}_${limitType}`;
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + limit.window });
    return next();
  }
  
    const data = requestCounts.get(key);
  
  if (now > data.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + limit.window });
    return next();
  }
  
    if (data.count >= limit.max) {
      const abuseKey = `abuse_${ip}`;
      const abuseCount = (suspiciousActivity.get(abuseKey) || 0) + 1;
      suspiciousActivity.set(abuseKey, abuseCount);
      
      // Ban dopo 3 violazioni ripetute (ridotto da 5)
      if (abuseCount >= 3) {
        blacklistIP(ip);
        suspiciousActivity.delete(abuseKey);
      }
      
      // Log per debugging
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      console.warn(`⚠️ Proxy rate limit: IP ${ip}, type ${limitType}, ${data.count}/${limit.max}, retry in ${retryAfter}s`);
      
      // Standard HTTP headers
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', limit.max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());
      
      return res.status(429).json({ 
        success: false,
        error: 'Limite richieste raggiunto',
        retryAfter
      });
  }
  
  data.count++;
    
    // Aggiungi headers informativi per tutte le richieste
    const remaining = Math.max(0, limit.max - data.count);
    res.setHeader('X-RateLimit-Limit', limit.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());
    
  next();
  };
};

// Cleanup ogni 5 minuti
setInterval(() => {
  const now = Date.now();
  
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) requestCounts.delete(key);
  }
  
  for (const [ip, until] of ipBlacklist.entries()) {
    if (now > until) {
      ipBlacklist.delete(ip);
      console.log(`✅ PROXY: IP UNBANNED ${ip}`);
    }
  }
  
  requestTiming.clear();
  suspiciousActivity.clear();
  
  // Pulisci ipFirstSeen per IP non visti da più di 1 ora
  for (const [ip, firstSeen] of ipFirstSeen.entries()) {
    if (now - firstSeen > 3600000) {
      ipFirstSeen.delete(ip);
    }
  }
}, 300000);

app.use(advancedRateLimiter('global'));

// ========= DOMAIN WHITELIST =========
// Whitelist domini autorizzati (anti-scraping di altri siti)
const ALLOWED_DOMAINS = [
  'mangaworld.cx',
  'mangaworldadult.net',
  'www.mangaworld.cx',
  'www.mangaworldadult.net',
  'cdn.mangaworld.cx',
  'mangaworld.bz',
  'www.mangaworld.bz'
];

function isAllowedDomain(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

// Proxy per evitare CORS (con rate limiting specifico)
app.post('/api/proxy', advancedRateLimiter('proxy'), async (req, res) => {
  try {
    const { url, method = 'GET', headers = {} } = req.body;
    
    // Validazione URL completa
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'URL deve iniziare con http:// o https://' });
    }
    
    if (!isAllowedDomain(url)) {
      console.warn(`⚠️ Dominio non autorizzato bloccato: ${url}`);
      return res.status(403).json({ success: false, error: 'Dominio non autorizzato' });
    }
    
    // Sanitize method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const sanitizedMethod = method.toUpperCase();
    if (!allowedMethods.includes(sanitizedMethod)) {
      return res.status(400).json({ success: false, error: 'Metodo HTTP non valido' });
    }
    
    // Headers più "umani" per evitare blocco anti-bot (con rotation)
    const safeHeaders = {
      'User-Agent': headers['User-Agent'] || getRandomUserAgent(),
      'Accept': headers['Accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': headers['Accept-Language'] || 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Referer': headers['Referer'],
      'Cache-Control': 'max-age=0'
    };
    
    // Rimuovi headers undefined
    Object.keys(safeHeaders).forEach(key => {
      if (safeHeaders[key] === undefined) delete safeHeaders[key];
    });
    
    // Delay casuale per sembrare umano
    await humanDelay();
    
    const response = await axios({
      method: sanitizedMethod,
      url,
      headers: safeHeaders,
      timeout: 30000, // Aumentato a 30s
      maxRedirects: 10, // Aumentato per seguire redirect
      maxContentLength: 50 * 1024 * 1024,
      validateStatus: (status) => status < 600,
      decompress: true,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true // Riusa connessioni
      }),
      withCredentials: false // No cookies cross-origin
    });
    
    // Gestisci errori HTTP dal sito target
    if (response.status === 403) {
      console.error(`❌ Sito target blocca richiesta (403): ${url}`);
      
      // Retry con User-Agent diverso dopo delay
      console.log('🔄 Retry con User-Agent diverso...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      
      const retryResponse = await axios({
        method: sanitizedMethod,
        url,
        headers: {
          ...safeHeaders,
          'User-Agent': getRandomUserAgent() // Nuovo UA
        },
        timeout: 30000,
        maxRedirects: 10,
        maxContentLength: 50 * 1024 * 1024,
        validateStatus: (status) => status < 600,
        decompress: true,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true
        })
      });
      
      // Se ancora 403, arrenditi
      if (retryResponse.status === 403) {
        return res.status(502).json({ 
          success: false, 
          error: 'Il sito target ha bloccato la richiesta. Riprova più tardi.',
          sourceBlocked: true
        });
      }
      
      // Altrimenti usa la retry response
      return res.json({ success: true, data: retryResponse.data, headers: retryResponse.headers });
    }
    
    if (response.status >= 400) {
      console.error(`⚠️ HTTP ${response.status} da ${url}`);
      return res.status(502).json({ 
        success: false, 
        error: `Il sito target ha risposto con errore ${response.status}`
      });
    }
    
    res.json({ success: true, data: response.data, headers: response.headers });
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    
    // Distingui tra errori di rete e errori HTTP
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        success: false, 
        error: 'Impossibile raggiungere il sito target. Server temporaneamente non disponibile.' 
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse HTML
app.post('/api/parse', async (req, res) => {
  try {
    const { html, selector } = req.body;
    
    if (!html || !selector) {
      return res.status(400).json({ success: false, error: 'HTML e selector richiesti' });
    }
    
    if (typeof html !== 'string' || typeof selector !== 'string') {
      return res.status(400).json({ success: false, error: 'Dati non validi' });
    }
    
    if (html.length > 5000000) { // Max 5MB
      return res.status(400).json({ success: false, error: 'HTML troppo grande' });
    }
    
    const $ = cheerio.load(html);
    const results = [];
    $(selector).each((i, elem) => {
      if (i < 1000) results.push($(elem).html()); // Limita risultati
    });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy per immagini (gestione CORS con rate limiting specifico)
app.get('/api/image-proxy', advancedRateLimiter('image'), async (req, res) => {
  try {
    const { url } = req.query;
    
    // Validazione URL completa
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'URL deve iniziare con http:// o https://' });
    }
    
    // Valida che sia un'immagine da un dominio autorizzato
    if (!isAllowedDomain(url)) {
      console.warn(`⚠️ Dominio immagine non autorizzato bloccato: ${url}`);
      return res.status(403).json({ success: false, error: 'Dominio non autorizzato' });
    }
    
    console.log('🖼️ Proxying image:', url);
    
    // Delay casuale per sembrare umano (solo per prime 5 immagini per non rallentare troppo)
    const shouldDelay = Math.random() < 0.3; // 30% chance
    if (shouldDelay) await humanDelay();
    
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      headers: { 
        'User-Agent': getRandomUserAgent(),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': url.includes('mangaworld') ? 'https://www.mangaworld.cx/' : '',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      timeout: 30000,
      maxRedirects: 10,
      maxContentLength: 10 * 1024 * 1024,
      validateStatus: (status) => status < 600,
      decompress: true,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      })
    });
    
    // Gestisci errori HTTP per immagini
    if (response.status === 403 || response.status === 404) {
      console.error(`❌ Immagine non disponibile (${response.status}): ${url}`);
      // Ritorna placeholder SVG invece di errore
      const placeholder = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
          <rect width="200" height="280" fill="#2D3748"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#A0AEC0" font-family="sans-serif" font-size="14">
            Immagine non disponibile
          </text>
        </svg>`,
        'utf-8'
      );
      return res.set('Content-Type', 'image/svg+xml').send(placeholder);
    }
    
    if (response.status >= 400) {
      console.error(`⚠️ HTTP ${response.status} per immagine: ${url}`);
      const placeholder = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
          <rect width="200" height="280" fill="#2D3748"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#A0AEC0" font-family="sans-serif" font-size="12">
            Errore ${response.status}
          </text>
        </svg>`,
        'utf-8'
      );
      return res.set('Content-Type', 'image/svg+xml').send(placeholder);
    }
    
    // Invia l'immagine con gli header appropriati
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(response.data);
    
  } catch (error) {
    console.error('❌ Image proxy error:', error.message);
    // Ritorna placeholder anche per errori di rete
    const placeholder = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
        <rect width="200" height="280" fill="#2D3748"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#A0AEC0" font-family="sans-serif" font-size="14">
          Errore caricamento
        </text>
      </svg>`,
      'utf-8'
    );
    res.set('Content-Type', 'image/svg+xml').send(placeholder);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'NeKuro Scan Proxy Server',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Errore interno del server' });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║    NeKuro Scan Proxy Server v2.0      ║
  ╠════════════════════════════════════════╣
  ║ Port: ${PORT.toString().padEnd(33)}║
  ║ Environment: ${(process.env.NODE_ENV || 'production').padEnd(26)}║
  ║ Rate Limit: Global ${RATE_LIMITS.global.max}/min${' '.repeat(16)}║
  ║ Proxy: ${RATE_LIMITS.proxy.max}/min | Images: ${RATE_LIMITS.image.max}/min${' '.repeat(5)}║
  ╚════════════════════════════════════════╝
  `);
});
