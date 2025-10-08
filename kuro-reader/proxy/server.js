import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 10001;

app.use(cors({
  origin: [
    'https://nekuro-scan.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ]
}));
app.use(express.json({ limit: '1mb' }));

// ========= RATE LIMITING =========
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 200;

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
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
    return res.status(429).json({ success: false, error: 'Troppe richieste' });
  }
  
  data.count++;
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) requestCounts.delete(ip);
  }
}, 300000);

app.use(rateLimiter);

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

// Proxy per evitare CORS
app.post('/api/proxy', async (req, res) => {
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
