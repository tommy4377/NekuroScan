// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ NeKuroScan Unified Server v5.0 - Backend + Proxy
console.log('🚀 [STARTUP] Loading imports...');

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { errorHandler } from './utils/errorHandler';
import redisImageCache, { isReaderImage, getImageType } from './utils/redisImageCache';
import { getCloudinaryUrl, CloudinaryPresets } from './utils/cloudinaryHelper';
import { httpsAgent, httpAgent, fetchWithRetry, getPoolStats } from './utils/httpPool';

console.log('✅ [STARTUP] All imports loaded');

dotenv.config();

console.log('🔧 [STARTUP] Environment loaded, PORT:', process.env.PORT || 10000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy per ottenere vero IP client dietro Render
app.set('trust proxy', true);

// ========= CONFIG VALIDATION =========
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// ========= PRISMA SETUP FOR SUPABASE =========
let prisma = null;
let dbConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  let finalUrl = databaseUrl;
  
  if (databaseUrl.includes(':6543') || databaseUrl.includes('pooler.supabase.com')) {
    const baseUrl = databaseUrl.split('?')[0];
    finalUrl = `${baseUrl}?pgbouncer=true&connection_limit=1`;
  }

  console.log(`🔌 Connecting to database via: ${finalUrl.includes('pooler') ? 'Pooler (6543)' : 'Direct (5432)'}`);

  return new PrismaClient({
    datasources: {
      db: {
        url: finalUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
  });
}

async function connectDatabase() {
  try {
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
    
    prisma = createPrismaClient();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );
    
    const connectPromise = prisma.$queryRaw`SELECT 1`;
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    dbConnected = true;
    reconnectAttempts = 0;
    console.log('✅ Database connected successfully');
    return true;
    
  } catch (error) {
    dbConnected = false;
    reconnectAttempts++;
    
    console.error(`❌ Database connection failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(reconnectAttempts * 2000, 10000);
      console.log(`🔄 Retrying in ${delay/1000}s...`);
      
      setTimeout(() => {
        connectDatabase();
      }, delay);
    }
    
    return false;
  }
}

connectDatabase();

// Health check per mantenere la connessione attiva
setInterval(async () => {
  if (dbConnected && prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('Health check failed, reconnecting...');
      dbConnected = false;
      connectDatabase();
    }
  }
}, 30000);

// Wrapper per query con retry automatico
async function executeWithRetry(operation, maxRetries = 2) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (
        error.code === '26000' ||
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        error.code === '42P05' ||
        error.message?.includes('prepared statement') ||
        error.message?.includes('connection')
      ) {
        console.log(`🔄 Database error detected (attempt ${i + 1}/${maxRetries}), reconnecting...`);
        
        dbConnected = false;
        await connectDatabase();
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// ========= SUPABASE SETUP =========
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  console.log('✅ Supabase storage configured');
} else {
  console.log('⚠️  Supabase storage not configured - uploads disabled');
}

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

// ========= MULTER SETUP =========
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ========= CORS SETUP =========
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://nekuro-scan.vercel.app',  // Frontend Vercel
      'https://nekuroscan.com',
      // Vercel domains - supporta anche domini vercel.app generici
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
    ]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // In production, verifica origin; in dev, accetta tutto
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    // Verifica se origin è nella whitelist o se è un dominio Vercel
    const isAllowed = corsOrigins.some(allowed => origin.includes(allowed.replace(/https?:\/\//, ''))) ||
                     origin.includes('.vercel.app');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log per debugging ma accetta comunque (puoi stringere in futuro)
      console.warn(`⚠️ CORS: Origin not in whitelist: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========= PROXY SETUP =========
// Configure axios defaults
axios.defaults.maxRedirects = 10;
axios.defaults.validateStatus = (status) => status < 600;

// ========= USER AGENT ROTATION (Anti-Block) =========
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ========= DOMAIN WHITELIST =========
const ALLOWED_DOMAINS = [
  'mangaworld.cx',
  'mangaworldadult.net',
  'www.mangaworld.cx',
  'www.mangaworldadult.net',
  'cdn.mangaworld.cx',
  'mangaworld.bz',
  'www.mangaworld.bz',
  'mangaworld.mx',
  'www.mangaworld.mx'
];

function isAllowedDomain(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Extract base domain (remove www. prefix for matching)
    const baseDomain = hostname.replace(/^www\./, '');
    
    // Check if hostname matches any allowed domain (more permissive)
    const isAllowed = ALLOWED_DOMAINS.some(domain => {
      const domainLower = domain.toLowerCase();
      const domainBase = domainLower.replace(/^www\./, '');
      
      // Match exact
      if (hostname === domainLower) {
        return true;
      }
      // Match subdomain (e.g., cdn.mangaworld.cx matches mangaworld.cx)
      if (hostname.endsWith('.' + domainBase)) {
        return true;
      }
      // Match base domain (e.g., mangaworld.cx matches www.mangaworld.cx)
      if (baseDomain === domainBase) {
        return true;
      }
      return false;
    });
    
    if (!isAllowed) {
      console.warn(`⚠️ Domain check failed: ${hostname} not in whitelist`);
      console.warn(`   Base domain: ${baseDomain}`);
      console.warn(`   Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`);
    }
    
    return isAllowed;
  } catch (error) {
    console.error(`❌ Error parsing URL: ${url}`, error);
    return false;
  }
}

// ========= PROXY RATE LIMITING =========
const PROXY_RATE_LIMITS = {
  proxy: { window: 60000, max: 300 },  // 300 proxy req/min = 5 req/sec
  image: { window: 60000, max: 600 },  // 600 immagini/min = 10 req/sec
};

const proxyRateLimiter = (limitType = 'proxy') => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.ip || 
               req.connection.remoteAddress;
    const now = Date.now();
    
    if (INTERNAL_IPS.includes(ip)) {
      return next();
    }
    
    // ⚠️ Rimosso controllo blacklist dal proxy - troppo aggressivo per uso normale
    // Il proxy rate limiting restituisce solo 429, non banna
    
    const limit = PROXY_RATE_LIMITS[limitType] || PROXY_RATE_LIMITS.proxy;
    const key = `proxy_${ip}_${limitType}`;
    
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
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      console.warn(`⚠️ Proxy rate limit: IP ${ip}, type ${limitType}, ${data.count}/${limit.max} - retry in ${retryAfter}s`);
      
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({ 
        success: false,
        error: 'Limite richieste raggiunto. Riprova tra poco.',
        retryAfter
      });
    }
    
    data.count++;
    next();
  };
};

// Helper per placeholder SVG
function sendPlaceholder(res, statusCode = 500) {
  const messages = {
    403: 'Accesso negato',
    404: 'Immagine non trovata',
    500: 'Errore caricamento'
  };
  
  const message = messages[statusCode] || 'Errore';
  
  const placeholder = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
      <rect width="200" height="280" fill="#2D3748"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#A0AEC0" font-family="sans-serif" font-size="14">
        ${message}
      </text>
    </svg>`,
    'utf-8'
  );
  
  res.set('Content-Type', 'image/svg+xml').send(placeholder);
}

// ========= DATABASE CHECK MIDDLEWARE =========
const requireDatabase = async (req, res, next) => {
  if (!dbConnected || !prisma) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      await connectDatabase();
    }
    
    if (!dbConnected) {
      return res.status(503).json({ 
        message: 'Database temporaneamente non disponibile',
        retryAfter: 5 
      });
    }
  }
  next();
};

// ========= ADVANCED RATE LIMITING & DDoS PROTECTION =========
const requestCounts = new Map();
const ipBlacklist = new Map(); // IP temporaneamente bannati
const suspiciousActivity = new Map(); // Monitora attività sospette
const ipFirstSeen = new Map(); // Track prima richiesta IP (grace period)

// Rate limiting più permissivo - solo anti-bot aggressivi
const RATE_LIMITS = {
  global: { window: 60000, max: 600 }, // 600 req/min = 10 req/sec (aumentato per uso normale)
  auth: { window: 300000, max: 20 },   // 20 login/5min (aumentato)
  api: { window: 60000, max: 300 },    // 300 API calls/min = 5 req/sec (aumentato)
  strict: { window: 60000, max: 120 }   // 120 req/min (aumentato)
};

// Blacklist IP per abusi gravi
const blacklistIP = (ip, duration = 300000) => { // Ban per 5 minuti default (ridotto da 1 ora)
  const until = Date.now() + duration;
  ipBlacklist.set(ip, until);
  console.warn(`🚨 IP BLACKLISTED: ${ip} fino a ${new Date(until).toISOString()}`);
};

// Controlla se IP è bannato
const isBlacklisted = (ip) => {
  if (ipBlacklist.has(ip)) {
    const until = ipBlacklist.get(ip);
    if (Date.now() < until) {
      return true;
    }
    ipBlacklist.delete(ip);
  }
  return false;
};

// Whitelist IP interni (non rate limit)
const INTERNAL_IPS = ['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1'];

// Rate limiter avanzato con livelli dinamici
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
        message: 'IP temporaneamente bloccato per troppe richieste' 
      });
    }
    
    // Grace period: primi 10 secondi più permissivi
    if (!ipFirstSeen.has(ip)) {
      ipFirstSeen.set(ip, now);
    }
    
    const limit = RATE_LIMITS[limitType] || RATE_LIMITS.global;
    const key = `${ip}_${limitType}`;
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + limit.window });
      return next();
    }
    
    const data = requestCounts.get(key);
    
    // Reset se finestra scaduta
    if (now > data.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + limit.window });
      return next();
    }
    
    // Limite raggiunto
    if (data.count >= limit.max) {
      // Monitora abusi ripetuti
      const abuseKey = `abuse_${ip}`;
      const abuseCount = (suspiciousActivity.get(abuseKey) || 0) + 1;
      suspiciousActivity.set(abuseKey, abuseCount);
      
      // Ban automatico dopo 20 violazioni (molto più permissivo - solo veri abusi)
      if (abuseCount >= 20) {
        blacklistIP(ip, 600000); // Ban per 10 minuti invece di 1 ora
        suspiciousActivity.delete(abuseKey);
      }
      
      // Log per debugging
      const retryAfter = Math.ceil((data.resetTime - now) / 1000);
      console.warn(`⚠️ Backend rate limit: IP ${ip}, type ${limitType}, ${data.count}/${limit.max}, retry in ${retryAfter}s`);
      
      // Standard HTTP headers
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', limit.max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());
      
      return res.status(429).json({ 
        message: 'Troppe richieste, riprova tra poco',
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

// Cleanup periodico (ogni 5 minuti)
setInterval(() => {
  const now = Date.now();
  
  // Pulisci rate limits scaduti
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
  
  // Pulisci blacklist scadute
  for (const [ip, until] of ipBlacklist.entries()) {
    if (now > until) {
      ipBlacklist.delete(ip);
      console.log(`✅ IP UNBANNED: ${ip}`);
    }
  }
  
  // Reset contatori abusi dopo 10 minuti
  suspiciousActivity.clear();
  
  // Pulisci ipFirstSeen vecchi
  for (const [ip, firstSeen] of ipFirstSeen.entries()) {
    if (now - firstSeen > 3600000) {
      ipFirstSeen.delete(ip);
    }
  }
}, 300000);

// ⚠️ RATE LIMITER GLOBALE DISABILITATO - Troppo aggressivo per uso normale
// Applica rate limiting solo su endpoint specifici (auth, etc.)
// app.use(advancedRateLimiter('global'));

// ========= INPUT SANITIZATION =========
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().slice(0, 255);
}

function sanitizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
}

// ========= PASSWORD VALIDATION (SECURITY ENHANCED) =========
/**
 * Valida password con requisiti di sicurezza robusti
 * @param {string} password - Password da validare
 * @returns {Object} - { valid: boolean, error: string }
 */
function validatePassword(password) {
  // Controllo tipo e presenza
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password richiesta' };
  }
  
  // Lunghezza minima: 10 caratteri (OWASP raccomanda 10+)
  if (password.length < 10) {
    return { 
      valid: false, 
      error: 'La password deve contenere almeno 10 caratteri' 
    };
  }
  
  // Lunghezza massima: 128 caratteri (previene DoS con bcrypt)
  if (password.length > 128) {
    return { 
      valid: false, 
      error: 'La password non può superare 128 caratteri' 
    };
  }
  
  // Requisito: almeno una lettera maiuscola
  if (!/[A-Z]/.test(password)) {
    return { 
      valid: false, 
      error: 'La password deve contenere almeno una lettera maiuscola' 
    };
  }
  
  // Requisito: almeno una lettera minuscola
  if (!/[a-z]/.test(password)) {
    return { 
      valid: false, 
      error: 'La password deve contenere almeno una lettera minuscola' 
    };
  }
  
  // Requisito: almeno un numero
  if (!/[0-9]/.test(password)) {
    return { 
      valid: false, 
      error: 'La password deve contenere almeno un numero' 
    };
  }
  
  // Requisito: almeno un carattere speciale
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { 
      valid: false, 
      error: 'La password deve contenere almeno un carattere speciale (!@#$%^&*...)' 
    };
  }
  
  // Controllo password comuni (top 100 più usate)
  const commonPasswords = [
    'password123', 'password123!', 'qwerty123', 'qwerty123!', 
    'admin123!', 'welcome123', 'welcome123!', 'password1!',
    '123456789!', '12345678!', 'password!', 'qwertyuiop',
    '1234567890', 'abc123456!', 'password1234', 'admin12345'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { 
      valid: false, 
      error: 'Password troppo comune, scegline una più sicura' 
    };
  }
  
  // Password valida
  return { valid: true, error: null };
}

// ========= AUTH MIDDLEWARE =========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token mancante' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = decoded;
    next();
  });
};

// ========= SUPABASE STORAGE FUNCTIONS =========
async function uploadImageToSupabase(buffer, fileName, bucket = 'profile-images') {
  if (!supabase) {
    console.warn('Supabase not configured, skipping upload');
    return null;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload to Supabase failed:', error);
    return null;
  }
}

async function deleteImageFromSupabase(url, bucket = 'profile-images') {
  if (!supabase || !url || !url.includes('supabase')) return;
  
  try {
    const urlParts = url.split('/');
    const fileName = urlParts.slice(-2).join('/');
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
    }
  } catch (error) {
    console.error('Delete from Supabase failed:', error);
  }
}

// ========= PROXY ROUTES =========

// Proxy per evitare CORS
app.post('/api/proxy', proxyRateLimiter('proxy'), async (req, res) => {
  try {
    const { url, method = 'GET', headers = {} } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'URL deve iniziare con http:// o https://' });
    }
    
    // Log URL per debug
    console.log(`📡 Proxy request: ${url.substring(0, 100)}...`);
    
    if (!isAllowedDomain(url)) {
      const hostname = new URL(url).hostname;
      console.error(`❌ Dominio non autorizzato bloccato: ${url}`);
      console.error(`   Hostname: ${hostname}`);
      console.error(`   Domini consentiti: ${ALLOWED_DOMAINS.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Dominio non autorizzato',
        hostname,
        allowedDomains: ALLOWED_DOMAINS
      });
    }
    
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const sanitizedMethod = method.toUpperCase();
    if (!allowedMethods.includes(sanitizedMethod)) {
      return res.status(400).json({ success: false, error: 'Metodo HTTP non valido' });
    }
    
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
    
    Object.keys(safeHeaders).forEach(key => {
      if (safeHeaders[key] === undefined) delete safeHeaders[key];
    });
    
    const response = await axios({
      method: sanitizedMethod,
      url,
      headers: safeHeaders,
      timeout: 30000,
      maxRedirects: 10,
      maxContentLength: 50 * 1024 * 1024,
      validateStatus: (status) => status < 600,
      decompress: true,
      httpsAgent,
      withCredentials: false
    });
    
    if (response.status === 403) {
      console.error(`❌ SITO SORGENTE BLOCCA IL PROXY (403): ${url}`);
      return res.status(502).json({ 
        success: false, 
        error: 'Il sito sorgente sta bloccando il proxy. Questo è temporaneo, riprova tra 1-2 minuti.',
        sourceBlocked: true
      });
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
    
    if (error.code === 'CERT_HAS_EXPIRED' || 
        error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      console.error(`🔒 SSL/TLS Certificate Error for ${req.body.url}:`, error.code);
      return res.status(502).json({ 
        success: false, 
        error: 'Certificato SSL/TLS non valido. Il sito target potrebbe avere problemi di sicurezza.',
        sslError: true
      });
    }
    
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
    
    if (html.length > 5000000) {
      return res.status(400).json({ success: false, error: 'HTML troppo grande' });
    }
    
    const $ = cheerio.load(html);
    const results = [];
    $(selector).each((i, elem) => {
      if (i < 1000) results.push($(elem).html());
    });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Image proxy con Cloudinary + Caching
app.get('/api/image-proxy', proxyRateLimiter('image'), async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL non valido' });
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'URL deve iniziare con http:// o https://' });
    }
    
    if (!isAllowedDomain(url)) {
      console.warn(`⚠️ Dominio immagine non autorizzato bloccato: ${url}`);
      return res.status(403).json({ success: false, error: 'Dominio non autorizzato' });
    }
    
    const imageType = getImageType(url, req.path);
    const isReader = imageType === 'reader';
    
    // Reader images → Sempre originali (NO ottimizzazione)
    if (isReader) {
      redisImageCache.incrementReaderBypass();
      console.log(`📖 Reader image (bypass optimization): ${url.substring(0, 80)}...`);
      
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': getRandomUserAgent(),
          'Accept': 'image/*,*/*;q=0.8',
          'Referer': url.includes('mangaworld') ? 'https://www.mangaworld.cx/' : '',
        },
        timeout: 60000,
        maxRedirects: 10,
        maxContentLength: 10 * 1024 * 1024,
        validateStatus: (status) => status < 600,
        httpsAgent,
        httpAgent
      });
      
      if (response.status >= 400) {
        return sendPlaceholder(res, response.status);
      }
      
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Image-Type': 'reader-original',
        'X-Optimization': 'bypassed'
      });
      return res.send(response.data);
    }
    
    // Non-reader images → Check cache
    const cached = await redisImageCache.get(url);
    if (cached) {
      console.log(`✅ Cache HIT: ${imageType} (${cached.format}, saved ${(cached.saved / 1024).toFixed(0)}KB)`);
      return res.redirect(302, cached.url);
    }
    
    // Cache MISS → Usa Cloudinary se abilitato
    const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;
    
    if (useCloudinary) {
      console.log(`🔄 Optimizing ${imageType}: ${url.substring(0, 80)}...`);
      
      let optimizedUrl;
      switch (imageType) {
        case 'cover':
          optimizedUrl = CloudinaryPresets.mangaCover(url);
          break;
        case 'avatar':
          optimizedUrl = CloudinaryPresets.avatar(url);
          break;
        case 'banner':
          optimizedUrl = CloudinaryPresets.banner(url);
          break;
        case 'logo':
          optimizedUrl = CloudinaryPresets.logo(url);
          break;
        default:
          optimizedUrl = getCloudinaryUrl(url, {
            width: 1200,
            crop: 'limit',
            quality: 'auto',
            format: 'auto'
          });
      }
      
      const estimatedOriginalSize = 500 * 1024;
      const estimatedOptimizedSize = 150 * 1024;
      
      await redisImageCache.set(url, optimizedUrl, {
        format: 'avif/webp',
        originalSize: estimatedOriginalSize,
        optimizedSize: estimatedOptimizedSize,
        imageType
      });
      
      return res.redirect(302, optimizedUrl);
    }
    
    // Cloudinary disabilitato → Serve originale
    console.log(`🖼️ Proxying (no optimization): ${url.substring(0, 80)}...`);
    
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      headers: { 
        'User-Agent': getRandomUserAgent(),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': url.includes('mangaworld') ? 'https://www.mangaworld.cx/' : '',
      },
      timeout: 60000,
      maxRedirects: 10,
      maxContentLength: 10 * 1024 * 1024,
      validateStatus: (status) => status < 600,
      httpsAgent,
      httpAgent
    });
    
    if (response.status >= 400) {
      return sendPlaceholder(res, response.status);
    }
    
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=2592000, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'X-Optimization': 'disabled'
    });
    res.send(response.data);
    
  } catch (error) {
    console.error('❌ Image proxy error:', error.message);
    
    if (error.code?.startsWith('CERT_') || error.code?.startsWith('UNABLE_')) {
      console.error(`🔒 SSL/TLS Error: ${error.code}`);
    }
    
    return sendPlaceholder(res, 500);
  }
});

// Image optimization metrics
app.get('/api/image-metrics', async (req, res) => {
  const stats = await redisImageCache.getStats();
  const poolStats = getPoolStats();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    service: 'Image Optimization System',
    cloudinary: {
      enabled: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not-configured'
    },
    redis: stats.redis,
    cache: stats.cache,
    optimization: stats.optimization,
    connectionPool: poolStats
  });
});

// ========= HEALTH CHECK =========
app.get('/health', async (req, res) => {
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    service: 'NeKuroScan Unified Server',
    version: '5.0.0',
    database: 'checking',
    storage: supabase ? 'configured' : 'disabled',
    redis: 'checking',
    cloudinary: 'checking',
    reconnectAttempts: reconnectAttempts
  };
  
  // Check database
  try {
    if (prisma) {
      await executeWithRetry(async () => {
        await prisma.$queryRaw`SELECT 1`;
      });
      health.database = 'healthy';
      dbConnected = true;
    } else {
      throw new Error('Prisma not initialized');
    }
  } catch (error) {
    health.database = 'unhealthy';
    health.status = 'degraded';
    health.error = error.message;
    dbConnected = false;
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectDatabase();
    }
  }
  
  // Check Redis
  try {
    const redisStats = await redisImageCache.getStats();
    health.redis = redisStats.redis.connected ? 'healthy' : 'fallback';
  } catch (error) {
    health.redis = 'unhealthy';
  }
  
  // Check Cloudinary
  health.cloudinary = process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'disabled';
  
  // Determine overall status
  if (health.database === 'healthy') {
    health.status = 'healthy';
  } else {
    health.status = 'degraded';
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// ========= AUTH ROUTES =========

// REGISTER
app.post('/api/auth/register', advancedRateLimiter('auth'), requireDatabase, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono richiesti' });
    }
    
    // ✅ VALIDAZIONE PASSWORD ROBUSTA
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.error });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = sanitizeEmail(email);
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email non valida' });
    }
    
    const normalizedUsername = sanitizeUsername(username);
    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: 'Username deve essere almeno 3 caratteri (lettere, numeri, _ o -)' });
    }
    
    const existingUser = await executeWithRetry(async () => {
      return await prisma.user.findFirst({
        where: { 
          OR: [
            { email: normalizedEmail }, 
            { username: normalizedUsername }
          ] 
        }
      });
    });
    
    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email già registrata' });
      }
      return res.status(400).json({ message: 'Username già in uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await executeWithRetry(async () => {
      return await prisma.user.create({
        data: { 
          username: normalizedUsername, 
          email: normalizedEmail, 
          password: hashedPassword 
        }
      });
    });

    // ✅ Crea solo user_profile - Le altre tabelle (favorite, library_manga, history) 
    // vengono create on-demand quando l'utente aggiunge dati
    await executeWithRetry(async () => {
      await prisma.user_profile.create({
        data: {
          userId: newUser.id,
          displayName: username,
          bio: '',
          avatarUrl: '',
          bannerUrl: '',
          isPublic: false,
          viewCount: 0,
          badges: []
        }
      });
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({ 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email 
      }, 
      token 
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Errore durante la registrazione',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// LOGIN
app.post('/api/auth/login', advancedRateLimiter('auth'), requireDatabase, async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Email/Username e password richiesti' });
    }
    
    // ✅ Controllo lunghezza massima per prevenire DoS
    if (password.length > 128) {
      return res.status(400).json({ message: 'Password non valida' });
    }
    
    const normalized = sanitizeString(emailOrUsername, 255).toLowerCase();
    
    const user = await executeWithRetry(async () => {
      return await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalized },
            { username: normalized }
          ]
        },
        include: {
          profile: true
        }
      });
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        profile: user.profile
      }, 
      token 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Errore durante il login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET CURRENT USER
app.get('/api/auth/me', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const user = await executeWithRetry(async () => {
      return await prisma.user.findUnique({ 
        where: { id: req.user.id },
        include: {
          profile: true
        }
      });
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        profile: user.profile
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      message: 'Errore nel recupero utente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// UPDATE PROFILE
app.put('/api/user/profile', authenticateToken, requireDatabase, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bio, isPublic, displayName, socialLinks } = req.body;
    const userId = req.user.id;
    
    let profile = await executeWithRetry(async () => {
      return await prisma.user_profile.findUnique({
        where: { userId }
      });
    });

    let updateData = {
      bio: sanitizeString(bio || profile?.bio || '', 5000),
      isPublic: isPublic === true || isPublic === 'true',
      displayName: sanitizeString(displayName || profile?.displayName || req.user.username, 100),
      updatedAt: new Date()
    };

    if (socialLinks) {
      try {
        updateData.socialLinks = typeof socialLinks === 'string' 
          ? JSON.parse(socialLinks) 
          : socialLinks;
      } catch (e) {
        updateData.socialLinks = {};
      }
    }

    // AVATAR UPLOAD
    if (req.files?.avatar && supabase) {
      const avatarFile = req.files.avatar[0];
      const avatarFileName = `avatars/avatar_${userId}_${Date.now()}.webp`;
      
      if (profile?.avatarUrl) {
        await deleteImageFromSupabase(profile.avatarUrl);
      }
      
      const processedAvatar = await sharp(avatarFile.buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 90 })
        .toBuffer();
      
      const avatarUrl = await uploadImageToSupabase(processedAvatar, avatarFileName);
      if (avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }
    }
    
    // BANNER UPLOAD (NO sharp - evitare OOM su Render)
    if (req.files?.banner && supabase) {
      const bannerFile = req.files.banner[0];
      const bannerFileName = `banners/banner_${userId}_${Date.now()}.${bannerFile.mimetype.split('/')[1] || 'jpg'}`;
      
      if (profile?.bannerUrl) {
        await deleteImageFromSupabase(profile.bannerUrl);
      }
      
      // Upload diretto senza sharp per evitare crash di memoria su Render
      const bannerUrl = await uploadImageToSupabase(bannerFile.buffer, bannerFileName);
      if (bannerUrl) {
        updateData.bannerUrl = bannerUrl;
      }
    }
    
    if (profile) {
      profile = await executeWithRetry(async () => {
        return await prisma.user_profile.update({
          where: { userId },
          data: updateData
        });
      });
    } else {
      profile = await executeWithRetry(async () => {
        return await prisma.user_profile.create({
          data: {
            userId,
            ...updateData,
            viewCount: 0,
            badges: []
          }
        });
      });
    }
    
    res.json({ success: true, profile });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Errore aggiornamento profilo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ SYNC DATA TO SERVER - NORMALIZED TABLES
app.post('/api/user/sync', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const { favorites, reading, completed, dropped, history, readingProgress } = req.body;
    const userId = req.user.id;
    
    console.log(`📤 [Backend] Sync request from user ${userId}:`, {
      favorites: favorites?.length || 0,
      reading: reading?.length || 0,
      completed: completed?.length || 0,
      dropped: dropped?.length || 0,
      history: history?.length || 0,
      progressKeys: readingProgress ? Object.keys(readingProgress).length : 0
    });
    
    // ========== SYNC FAVORITES (tabella normalizzata) ==========
    if (favorites !== undefined && Array.isArray(favorites)) {
      console.log(`💖 [Backend] Syncing ${favorites.length} favorites for user ${userId}`);
      
      // Delete all existing favorites and recreate (simpler than diff)
      await executeWithRetry(async () => {
        await prisma.favorite.deleteMany({ where: { userId } });
      });
      
      // Insert new favorites
      if (favorites.length > 0) {
        await executeWithRetry(async () => {
          await prisma.favorite.createMany({
            data: favorites.map(fav => ({
              userId,
              mangaUrl: fav.url,
              mangaTitle: fav.title || '',
              coverUrl: fav.cover || fav.coverUrl || null,
              source: fav.source || null
            })),
            skipDuplicates: true
          });
        });
      }
      
      console.log(`✅ [Backend] Favorites saved for user ${userId}`);
    }
    
    // ========== SYNC LIBRARY (reading, completed, dropped) ==========
    const libraryStatuses = [];
    if (reading !== undefined && Array.isArray(reading)) {
      reading.forEach(m => libraryStatuses.push({ ...m, status: 'reading' }));
    }
    if (completed !== undefined && Array.isArray(completed)) {
      completed.forEach(m => libraryStatuses.push({ ...m, status: 'completed' }));
    }
    if (dropped !== undefined && Array.isArray(dropped)) {
      dropped.forEach(m => libraryStatuses.push({ ...m, status: 'dropped' }));
    }
    
    if (libraryStatuses.length > 0) {
      console.log(`📚 [Backend] Syncing ${libraryStatuses.length} library items for user ${userId}`);
      
      // Delete all existing library items and recreate
      await executeWithRetry(async () => {
        await prisma.library_manga.deleteMany({ where: { userId } });
      });
      
      // Insert new library items
      await executeWithRetry(async () => {
        await prisma.library_manga.createMany({
          data: libraryStatuses.map(item => ({
            userId,
            mangaUrl: item.url,
            mangaTitle: item.title || '',
            coverUrl: item.cover || item.coverUrl || null,
            source: item.source || null,
            status: item.status
          })),
          skipDuplicates: true
        });
      });
      
      console.log(`✅ [Backend] Library saved for user ${userId}`);
    }
    
    // ========== SYNC HISTORY ==========
    if (history !== undefined && Array.isArray(history)) {
      console.log(`📜 [Backend] Syncing ${history.length} history entries for user ${userId}`);
      
      // Keep only last 100 history entries (performance)
      const recentHistory = history.slice(0, 100);
      
      // Delete old history and recreate
      await executeWithRetry(async () => {
        await prisma.history_entry.deleteMany({ where: { userId } });
      });
      
      if (recentHistory.length > 0) {
        await executeWithRetry(async () => {
          await prisma.history_entry.createMany({
            data: recentHistory.map(h => ({
              userId,
              mangaUrl: h.url,
              mangaTitle: h.title || '',
              chapterUrl: h.chapterUrl || null,
              chapterTitle: h.chapterTitle || null,
              viewedAt: h.lastVisited ? new Date(h.lastVisited) : new Date()
            }))
          });
        });
      }
      
      console.log(`✅ [Backend] History saved for user ${userId}`);
    }
    
    // ========== SYNC READING PROGRESS (già normalizzata) ==========
    if (readingProgress && typeof readingProgress === 'object') {
      const progressKeys = Object.keys(readingProgress);
      console.log(`📖 [Backend] Syncing ${progressKeys.length} reading progress entries`);
      
      for (const [mangaUrl, progress] of Object.entries(readingProgress)) {
        if (progress && typeof progress === 'object') {
          await executeWithRetry(async () => {
            await prisma.reading_progress.upsert({
              where: {
                userId_mangaUrl: { userId, mangaUrl }
              },
              update: {
                chapterIndex: progress.chapterIndex || 0,
                pageIndex: progress.page || progress.pageIndex || 0,
                totalPages: progress.totalPages || 0,
                mangaTitle: progress.mangaTitle || progress.title || '',
                updatedAt: new Date()
              },
              create: {
                userId,
                mangaUrl,
                mangaTitle: progress.mangaTitle || progress.title || '',
                chapterIndex: progress.chapterIndex || 0,
                pageIndex: progress.page || progress.pageIndex || 0,
                totalPages: progress.totalPages || 0
              }
            });
          });
        }
      }
      
      console.log(`✅ [Backend] Reading progress saved`);
    }
    
    console.log(`✅ [Backend] Sync completed for user ${userId}`);
    res.json({ success: true, message: 'Dati sincronizzati' });
    
  } catch (error) {
    console.error('❌ [Backend] Sync error:', error);
    res.status(500).json({ 
      message: 'Errore sincronizzazione', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET USER DATA - NORMALIZED TABLES
app.get('/api/user/data', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📥 [Backend] Fetching data for user ${userId}...`);
    
    // Fetch from normalized tables
    const [favoritesRows, readingProgress, libraryRows, historyRows, profile] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.favorite.findMany({ 
          where: { userId },
          orderBy: { addedAt: 'desc' }
        }),
        prisma.reading_progress.findMany({ 
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.library_manga.findMany({ 
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.history_entry.findMany({ 
          where: { userId },
          orderBy: { viewedAt: 'desc' },
          take: 100 // Limit to 100 most recent
        }),
        prisma.user_profile.findUnique({ where: { userId } })
      ]);
    });
    
    // Convert favorites to frontend format
    const favorites = favoritesRows.map(f => ({
      url: f.mangaUrl,
      title: f.mangaTitle,
      cover: f.coverUrl,
      coverUrl: f.coverUrl,
      source: f.source,
      type: 'manga',
      addedAt: f.addedAt
    }));
    
    // Convert library to frontend format (split by status)
    const reading = libraryRows
      .filter(l => l.status === 'reading')
      .map(l => ({
        url: l.mangaUrl,
        title: l.mangaTitle,
        cover: l.coverUrl,
        coverUrl: l.coverUrl,
        source: l.source,
        type: 'manga',
        addedAt: l.addedAt,
        lastRead: l.updatedAt
      }));
      
    const completed = libraryRows
      .filter(l => l.status === 'completed')
      .map(l => ({
        url: l.mangaUrl,
        title: l.mangaTitle,
        cover: l.coverUrl,
        coverUrl: l.coverUrl,
        source: l.source,
        type: 'manga',
        addedAt: l.addedAt,
        completedAt: l.updatedAt
      }));
      
    const dropped = libraryRows
      .filter(l => l.status === 'dropped')
      .map(l => ({
        url: l.mangaUrl,
        title: l.mangaTitle,
        cover: l.coverUrl,
        coverUrl: l.coverUrl,
        source: l.source,
        type: 'manga',
        addedAt: l.addedAt,
        droppedAt: l.updatedAt
      }));
    
    // Convert history to frontend format
    const history = historyRows.map(h => ({
      url: h.mangaUrl,
      title: h.mangaTitle,
      chapterUrl: h.chapterUrl,
      chapterTitle: h.chapterTitle,
      lastVisited: h.viewedAt,
      type: 'manga'
    }));
    
    // Convert readingProgress to frontend format (object)
    const progressObj = {};
    readingProgress.forEach(p => {
      progressObj[p.mangaUrl] = {
        chapterIndex: p.chapterIndex,
        pageIndex: p.pageIndex,
        page: p.pageIndex,
        totalPages: p.totalPages,
        mangaTitle: p.mangaTitle,
        timestamp: p.updatedAt
      };
    });
    
    // Get notification settings
    let notificationSettings = [];
    try {
      notificationSettings = await prisma.$queryRaw`
        SELECT "mangaUrl", "mangaTitle", "enabled"
        FROM "manga_notifications" 
        WHERE "userId" = ${userId} AND "enabled" = true
      `;
    } catch (e) {
      // Table might not exist yet
    }
    
    const responseData = { 
      favorites,
      readingProgress: progressObj,
      reading,
      completed,
      dropped,
      history,
      profile: profile || {},
      notificationSettings: notificationSettings || []
    };
    
    console.log(`✅ [Backend] Returning data for user ${userId}:`, {
      favorites: favorites.length,
      reading: reading.length,
      completed: completed.length,
      dropped: dropped.length,
      history: history.length,
      progressKeys: Object.keys(progressObj).length,
      profile: profile ? '✅' : '❌'
    });
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ 
      message: 'Errore nel recupero dati utente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET PUBLIC PROFILE
app.get('/api/profile/:username', async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ message: 'Servizio temporaneamente non disponibile' });
  }
  
  try {
    const { username } = req.params;
    
    const user = await executeWithRetry(async () => {
      return await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        include: {
          profile: true
        }
      });
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (!user.profile || !user.profile.isPublic) {
      return res.status(403).json({ message: 'Profilo privato' });
    }
    
    // ✅ Incrementa view count
    try {
      await executeWithRetry(async () => {
        await prisma.user_profile.update({
          where: { id: user.profile.id },
          data: { viewCount: (user.profile.viewCount || 0) + 1 }
        });
      });
    } catch (e) {
      console.error('Errore incremento viewCount:', e);
    }
    
    // ✅ Carica library dalle nuove tabelle normalizzate
    let reading = [], completed = [], dropped = [];
    try {
      const libraryRows = await executeWithRetry(async () => {
        return await prisma.library_manga.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          take: 12
        });
      });
      
      reading = libraryRows
        .filter(l => l.status === 'reading')
        .map(l => ({
          url: l.mangaUrl,
          title: l.mangaTitle,
          cover: l.coverUrl,
          coverUrl: l.coverUrl,
          source: l.source,
          type: 'manga'
        }));
        
      completed = libraryRows
        .filter(l => l.status === 'completed')
        .map(l => ({
          url: l.mangaUrl,
          title: l.mangaTitle,
          cover: l.coverUrl,
          coverUrl: l.coverUrl,
          source: l.source,
          type: 'manga'
        }));
        
      dropped = libraryRows
        .filter(l => l.status === 'dropped')
        .map(l => ({
          url: l.mangaUrl,
          title: l.mangaTitle,
          cover: l.coverUrl,
          coverUrl: l.coverUrl,
          source: l.source,
          type: 'manga'
        }));
    } catch (e) {
      console.error('Errore caricamento library:', e);
    }
    
    // ✅ Carica favorites dalle nuove tabelle normalizzate
    let favorites = [];
    try {
      const favoritesRows = await executeWithRetry(async () => {
        return await prisma.favorite.findMany({
          where: { userId: user.id },
          orderBy: { addedAt: 'desc' },
          take: 12
        });
      });
      
      favorites = favoritesRows.map(f => ({
        url: f.mangaUrl,
        title: f.mangaTitle,
        cover: f.coverUrl,
        coverUrl: f.coverUrl,
        source: f.source,
        type: 'manga'
      }));
    } catch (e) {
      console.error('Errore caricamento favorites:', e);
    }
    
    // ✅ Carica followers/following count
    let followersCount = 0, followingCount = 0;
    try {
      [followersCount, followingCount] = await executeWithRetry(async () => {
        return await Promise.all([
          prisma.user_follows.count({ where: { followingId: user.id } }),
          prisma.user_follows.count({ where: { followerId: user.id } })
        ]);
      });
    } catch (e) {
      console.error('Errore caricamento followers/following:', e);
    }
    
    res.json({
      username: user.username,
      displayName: user.profile.displayName || user.username,
      bio: user.profile.bio || '',
      avatarUrl: user.profile.avatarUrl || '',
      bannerUrl: user.profile.bannerUrl || '',
      badges: user.profile.badges || [],
      stats: {
        totalRead: reading.length + completed.length,
        favorites: favorites.length,
        completed: completed.length,
        dropped: dropped.length,
        views: user.profile.viewCount || 0,
        followers: followersCount,
        following: followingCount
      },
      reading,
      completed,
      dropped,
      favorites,
      socialLinks: user.profile.socialLinks || {},
      joinedAt: user.createdAt
    });
    
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      message: 'Errore recupero profilo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ EXPORT USER DATA (GDPR COMPLIANCE) - NORMALIZED TABLES
app.get('/api/user/export', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all user data from normalized tables
    const [user, profile, favoritesRows, libraryRows, historyRows, readingProgress, follows] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user_profile.findUnique({ where: { userId } }),
        prisma.favorite.findMany({ 
          where: { userId },
          orderBy: { addedAt: 'desc' }
        }),
        prisma.library_manga.findMany({ 
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.history_entry.findMany({ 
          where: { userId },
          orderBy: { viewedAt: 'desc' }
        }),
        prisma.reading_progress.findMany({ 
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.user_follows.findMany({ 
          where: { 
            OR: [
              { followerId: userId },
              { followingId: userId }
            ]
          },
          include: {
            follower: { select: { username: true, email: true } },
            following: { select: { username: true, email: true } }
          }
        })
      ]);
    });
    
    // Get notification settings
    let notificationSettings = [];
    try {
      notificationSettings = await prisma.$queryRaw`
        SELECT "mangaUrl", "mangaTitle", "enabled", "createdAt"
        FROM "manga_notifications" 
        WHERE "userId" = ${userId}
      `;
    } catch (err) {
      console.log('No notification settings found');
    }
    
    // Convert normalized data to export format
    const favorites = favoritesRows.map(f => ({
      url: f.mangaUrl,
      title: f.mangaTitle,
      coverUrl: f.coverUrl,
      source: f.source,
      addedAt: f.addedAt
    }));
    
    const reading = libraryRows.filter(l => l.status === 'reading').map(l => ({
      url: l.mangaUrl,
      title: l.mangaTitle,
      coverUrl: l.coverUrl,
      source: l.source,
      status: l.status,
      rating: l.rating,
      notes: l.notes,
      addedAt: l.addedAt,
      updatedAt: l.updatedAt
    }));
    
    const completed = libraryRows.filter(l => l.status === 'completed').map(l => ({
      url: l.mangaUrl,
      title: l.mangaTitle,
      coverUrl: l.coverUrl,
      source: l.source,
      status: l.status,
      rating: l.rating,
      notes: l.notes,
      addedAt: l.addedAt,
      updatedAt: l.updatedAt
    }));
    
    const dropped = libraryRows.filter(l => l.status === 'dropped').map(l => ({
      url: l.mangaUrl,
      title: l.mangaTitle,
      coverUrl: l.coverUrl,
      source: l.source,
      status: l.status,
      rating: l.rating,
      notes: l.notes,
      addedAt: l.addedAt,
      updatedAt: l.updatedAt
    }));
    
    const history = historyRows.map(h => ({
      url: h.mangaUrl,
      title: h.mangaTitle,
      chapterUrl: h.chapterUrl,
      chapterTitle: h.chapterTitle,
      viewedAt: h.viewedAt
    }));
    
    // Format complete export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'GDPR Data Export',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      profile: profile ? {
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        isPublic: profile.isPublic,
        socialLinks: profile.socialLinks,
        viewCount: profile.viewCount,
        badges: profile.badges,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      } : null,
      library: {
        favorites,
        reading,
        completed,
        dropped,
        history,
        totalItems: favorites.length + reading.length + completed.length + dropped.length
      },
      readingProgress: readingProgress.map(p => ({
        mangaUrl: p.mangaUrl,
        mangaTitle: p.mangaTitle,
        chapterIndex: p.chapterIndex,
        pageIndex: p.pageIndex,
        totalPages: p.totalPages,
        lastReadAt: p.updatedAt
      })),
      social: {
        following: follows
          .filter(f => f.followerId === userId)
          .map(f => ({
            username: f.following.username,
            followedAt: f.createdAt
          })),
        followers: follows
          .filter(f => f.followingId === userId)
          .map(f => ({
            username: f.follower.username,
            followedAt: f.createdAt
          }))
      },
      notifications: notificationSettings.map(n => ({
        mangaUrl: n.mangaUrl,
        mangaTitle: n.mangaTitle,
        enabled: n.enabled,
        subscribedAt: n.createdAt
      })),
      metadata: {
        totalMangaRead: (library ? JSON.parse(library.reading || '[]').length : 0) + (library ? JSON.parse(library.completed || '[]').length : 0),
        totalFavorites: favorites ? JSON.parse(favorites.favorites).length : 0,
        totalFollowers: follows.filter(f => f.followingId === userId).length,
        totalFollowing: follows.filter(f => f.followerId === userId).length,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="nekuroscan-data-export-${user.username}-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(exportData);
    
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ 
      message: 'Errore esportazione dati',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// FOLLOW/UNFOLLOW USER
app.post('/api/user/follow/:username', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const { username } = req.params;
    const followerId = req.user.id;
    
    const userToFollow = await executeWithRetry(async () => {
      return await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
    });
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (userToFollow.id === followerId) {
      return res.status(400).json({ message: 'Non puoi seguire te stesso' });
    }
    
    const existingFollow = await executeWithRetry(async () => {
      return await prisma.user_follows.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId: userToFollow.id
          }
        }
      });
    });
    
    if (existingFollow) {
      // Unfollow
      await executeWithRetry(async () => {
        await prisma.user_follows.delete({
          where: { id: existingFollow.id }
        });
      });
      
      res.json({ success: true, following: false });
    } else {
      // Follow
      await executeWithRetry(async () => {
        await prisma.user_follows.create({
          data: {
            followerId,
            followingId: userToFollow.id
          }
        });
      });
      
      res.json({ success: true, following: true });
    }
    
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ 
      message: 'Errore operazione follow',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET FOLLOWERS
app.get('/api/user/:username/followers', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await executeWithRetry(async () => {
      return await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    const followers = await executeWithRetry(async () => {
      return await prisma.user_follows.findMany({
        where: { followingId: user.id },
        include: {
          follower: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });
    
    const followersList = followers.map(f => ({
      id: f.follower.id,
      username: f.follower.username,
      displayName: f.follower.profile?.displayName || f.follower.username,
      avatarUrl: f.follower.profile?.avatarUrl || '',
      bio: f.follower.profile?.bio || '',
      followedAt: f.createdAt
    }));
    
    res.json({ followers: followersList });
    
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ 
      message: 'Errore recupero followers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET FOLLOWING
app.get('/api/user/:username/following', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await executeWithRetry(async () => {
      return await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    const following = await executeWithRetry(async () => {
      return await prisma.user_follows.findMany({
        where: { followerId: user.id },
        include: {
          following: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });
    
    const followingList = following.map(f => ({
      id: f.following.id,
      username: f.following.username,
      displayName: f.following.profile?.displayName || f.following.username,
      avatarUrl: f.following.profile?.avatarUrl || '',
      bio: f.following.profile?.bio || '',
      followedAt: f.createdAt
    }));
    
    res.json({ following: followingList });
    
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ 
      message: 'Errore recupero following',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// SEARCH PUBLIC USERS
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    
    const searchTerm = sanitizeString(q, 100);
    if (!searchTerm) {
      return res.json({ users: [] });
    }
    
    // Search only in public profiles
    const users = await executeWithRetry(async () => {
      return await prisma.user.findMany({
        where: {
          profile: {
            isPublic: true
          },
          OR: [
            {
              username: {
                contains: searchTerm.toLowerCase(),
                mode: 'insensitive'
              }
            },
            {
              profile: {
                displayName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          ]
        },
        include: {
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              bio: true,
              badges: true,
              viewCount: true
            }
          }
        },
        take: 20,
        orderBy: [
          { profile: { viewCount: 'desc' } },
          { username: 'asc' }
        ]
      });
    });
    
    const userList = users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.profile?.displayName || u.username,
      avatarUrl: u.profile?.avatarUrl || '',
      bio: u.profile?.bio || '',
      badges: u.profile?.badges || [],
      viewCount: u.profile?.viewCount || 0
    }));
    
    res.json({ users: userList });
    
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      message: 'Errore ricerca utenti',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========= NOTIFICATIONS ROUTES =========

// CREATE NOTIFICATION TABLE (if doesn't exist)
async function ensureNotificationTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "manga_notifications" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "mangaUrl" VARCHAR(500) NOT NULL,
        "mangaTitle" VARCHAR(500) NOT NULL,
        "enabled" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "mangaUrl"),
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_manga_notifications_user" ON "manga_notifications"("userId");`;
  } catch (e) {
    // Table might already exist
  }
}

ensureNotificationTable();

// TOGGLE MANGA NOTIFICATIONS
app.post('/api/notifications/manga', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const { mangaUrl, mangaTitle, enabled } = req.body;
    const userId = req.user.id;
    
    if (!mangaUrl || !mangaTitle) {
      return res.status(400).json({ message: 'mangaUrl e mangaTitle richiesti' });
    }
    
    const sanitizedUrl = sanitizeString(mangaUrl, 500);
    const sanitizedTitle = sanitizeString(mangaTitle, 500);
    
    if (!sanitizedUrl || !sanitizedTitle) {
      return res.status(400).json({ message: 'Dati non validi' });
    }
    
    await executeWithRetry(async () => {
      const existing = await prisma.$queryRaw`
        SELECT * FROM "manga_notifications" 
        WHERE "userId" = ${userId} AND "mangaUrl" = ${sanitizedUrl}
      `;
      
      if (existing && existing.length > 0) {
        if (enabled) {
          await prisma.$executeRaw`
            UPDATE "manga_notifications" 
            SET "enabled" = true, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "userId" = ${userId} AND "mangaUrl" = ${sanitizedUrl}
          `;
        } else {
          await prisma.$executeRaw`
            DELETE FROM "manga_notifications"
            WHERE "userId" = ${userId} AND "mangaUrl" = ${sanitizedUrl}
          `;
        }
      } else if (enabled) {
        await prisma.$executeRaw`
          INSERT INTO "manga_notifications" ("userId", "mangaUrl", "mangaTitle", "enabled")
          VALUES (${userId}, ${sanitizedUrl}, ${sanitizedTitle}, true)
        `;
      }
    });
    
    res.json({ success: true, enabled });
    
  } catch (error) {
    console.error('Toggle notifications error:', error);
    res.status(500).json({ 
      message: 'Errore gestione notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET USER NOTIFICATION SETTINGS
app.get('/api/notifications/settings', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await executeWithRetry(async () => {
      return await prisma.$queryRaw`
        SELECT "mangaUrl", "mangaTitle", "enabled"
        FROM "manga_notifications" 
        WHERE "userId" = ${userId} AND "enabled" = true
      `;
    });
    
    res.json({ notificationSettings: notifications || [] });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Errore recupero notifiche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========= ERROR HANDLER =========
// ✅ Usa error handler centralizzato e standardizzato
app.use(errorHandler);

// ========= START SERVER =========
// ✅ FIX: Bind su 0.0.0.0 per permettere connessioni esterne (Render health checks)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   NeKuroScan Unified Server v5.0      ║
  ╠════════════════════════════════════════╣
  ║ Port: ${PORT.toString().padEnd(33)}║
  ║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)}║
  ║ Database: ${dbConnected ? '✅ Connected'.padEnd(29) : '⏳ Connecting...'.padEnd(29)}║
  ║ Storage: ${supabase ? '✅ Configured'.padEnd(30) : '⚠️  Disabled'.padEnd(30)}║
  ║ Redis: ${process.env.REDIS_URL ? '✅ Configured'.padEnd(30) : '⚠️  Fallback'.padEnd(30)}║
  ║ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured'.padEnd(26) : '⚠️  Disabled'.padEnd(26)}║
  ╚════════════════════════════════════════╝
  `);
  
  if (!dbConnected) {
    console.log('⏳ Waiting for database connection...');
    console.log('💡 Make sure you are using Supabase Connection Pooler (port 6543)');
  }
});

// ========= GRACEFUL SHUTDOWN =========
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 ${signal} received, starting graceful shutdown...`);
  
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
  
  await redisImageCache.disconnect();
  console.log('✅ Redis disconnected');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));