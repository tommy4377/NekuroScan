import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
const ALLOWED_DOMAINS = [
  'mangaworld.cx',
  'mangaworldadult.net',
  'www.mangaworld.cx',
  'www.mangaworldadult.net'
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
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    if (!isAllowedDomain(url)) {
      return res.status(403).json({ success: false, error: 'Dominio non autorizzato' });
    }
    
    const response = await axios({
      method: method.toUpperCase(),
      url,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers 
      },
      timeout: 20000,
      maxRedirects: 5
    });
    
    res.json({ success: true, data: response.data, headers: response.headers });
  } catch (error) {
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
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    // Valida che sia un'immagine da un dominio autorizzato
    if (!isAllowedDomain(url)) {
      return res.status(403).json({ success: false, error: 'Dominio non autorizzato' });
    }
    
    console.log('🖼️ Proxying image:', url);
    
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.mangaworld.cx/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      timeout: 30000,
      maxRedirects: 5
    });
    
    // Invia l'immagine con gli header appropriati
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache 24 ore
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(response.data);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).json({ success: false, error: 'Errore caricamento immagine' });
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
