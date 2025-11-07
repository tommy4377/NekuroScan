import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 10001;

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

const RATE_LIMITS = {
  global: { window: 60000, max: 200 },  // 200 req/min globale
  proxy: { window: 60000, max: 120 },   // 120 proxy req/min
  image: { window: 60000, max: 150 },   // 150 immagini/min
  burst: { window: 1000, max: 10 }      // Max 10 req/sec (anti-burst)
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
  
  // Se più di 10 richieste in 1 secondo = burst sospetto
  return recentTimestamps.length > 10;
};

// Rate limiter avanzato multi-livello
const advancedRateLimiter = (limitType = 'global') => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Check blacklist
    if (isBlacklisted(ip)) {
      return res.status(403).json({ 
        success: false,
        error: 'IP temporaneamente bloccato per attività sospetta' 
      });
    }
    
    // Rileva burst attacks
    if (detectBurst(ip)) {
      const abuseKey = `burst_abuse_${ip}`;
      const abuseCount = (suspiciousActivity.get(abuseKey) || 0) + 1;
      suspiciousActivity.set(abuseKey, abuseCount);
      
      if (abuseCount >= 3) {
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
      
      // Ban dopo 5 violazioni ripetute
      if (abuseCount >= 5) {
        blacklistIP(ip);
        suspiciousActivity.delete(abuseKey);
      }
      
      return res.status(429).json({ 
        success: false,
        error: 'Limite richieste raggiunto',
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }
    
    data.count++;
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
  ║ Rate Limit: ${MAX_REQUESTS} req/min${' '.repeat(20)}║
  ╚════════════════════════════════════════╝
  `);
});
