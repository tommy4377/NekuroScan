// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ AUTH-SERVER.JS v4.1 - WITH STANDARDIZED ERROR HANDLING
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
import { errorHandler } from './utils/errorHandler';

dotenv.config();

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
  ? ['https://nekuroscan.onrender.com', 'https://nekuroscan.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  global: { window: 60000, max: 180 }, // 180 req/min = 3 req/sec
  auth: { window: 300000, max: 10 },   // 10 login/5min
  api: { window: 60000, max: 120 },    // 120 API calls/min = 2 req/sec
  strict: { window: 60000, max: 60 }   // 60 req/min
};

// Blacklist IP per abusi gravi
const blacklistIP = (ip, duration = 3600000) => { // Ban per 1 ora default
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
      
      // Ban automatico dopo 5 violazioni (non 3, troppo aggressivo)
      if (abuseCount >= 5) {
        blacklistIP(ip);
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

// Applica rate limiter globale
app.use(advancedRateLimiter('global'));

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

// ========= HEALTH CHECK =========
app.get('/health', async (req, res) => {
  const health = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    service: 'NeKuro Scan Auth Server',
    version: '4.1.0',
    database: 'checking',
    storage: supabase ? 'configured' : 'disabled',
    reconnectAttempts: reconnectAttempts
  };
  
  try {
    if (prisma) {
      await executeWithRetry(async () => {
        await prisma.$queryRaw`SELECT 1`;
      });
      health.database = 'healthy';
      health.status = 'healthy';
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

    await executeWithRetry(async () => {
      await prisma.user_favorites.create({
        data: {
          userId: newUser.id,
          favorites: '[]'
        }
      });
    });

    await executeWithRetry(async () => {
      await prisma.user_library.create({
        data: {
          userId: newUser.id,
          reading: '[]',
          completed: '[]',
          dropped: '[]',
          history: '[]'
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
    
    // BANNER UPLOAD
    if (req.files?.banner && supabase) {
      const bannerFile = req.files.banner[0];
      const bannerFileName = `banners/banner_${userId}_${Date.now()}.webp`;
      
      if (profile?.bannerUrl) {
        await deleteImageFromSupabase(profile.bannerUrl);
      }
      
      const processedBanner = await sharp(bannerFile.buffer)
        .resize(1200, 400, { fit: 'cover' })
        .webp({ quality: 90 })
        .toBuffer();
      
      const bannerUrl = await uploadImageToSupabase(processedBanner, bannerFileName);
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

// SYNC DATA TO SERVER - NO TRANSACTIONS
app.post('/api/user/sync', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const { favorites, reading, completed, dropped, history, readingProgress } = req.body;
    const userId = req.user.id;
    
    // SYNC FAVORITES
    if (favorites !== undefined) {
      await executeWithRetry(async () => {
        const existing = await prisma.user_favorites.findUnique({ where: { userId } });
        
        if (existing) {
          await prisma.user_favorites.update({
            where: { userId },
            data: { 
              favorites: JSON.stringify(favorites),
              updatedAt: new Date()
            }
          });
        } else {
          await prisma.user_favorites.create({
            data: { 
              userId, 
              favorites: JSON.stringify(favorites) 
            }
          });
        }
      });
    }
    
    // SYNC LIBRARY
    await executeWithRetry(async () => {
      const existingLibrary = await prisma.user_library.findUnique({
        where: { userId }
      });
      
      const updateLibraryData = {};
      if (reading !== undefined) updateLibraryData.reading = JSON.stringify(reading);
      if (completed !== undefined) updateLibraryData.completed = JSON.stringify(completed);
      if (dropped !== undefined) updateLibraryData.dropped = JSON.stringify(dropped);
      if (history !== undefined) updateLibraryData.history = JSON.stringify(history);
      updateLibraryData.updatedAt = new Date();
      
      if (existingLibrary) {
        await prisma.user_library.update({
          where: { userId },
          data: updateLibraryData
        });
      } else {
        await prisma.user_library.create({
          data: {
            userId,
            reading: JSON.stringify(reading || []),
            completed: JSON.stringify(completed || []),
            dropped: JSON.stringify(dropped || []),
            history: JSON.stringify(history || [])
          }
        });
      }
    });
    
    // SYNC READING PROGRESS - USA UPSERT
    if (readingProgress && typeof readingProgress === 'object') {
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
    }
    
    res.json({ success: true, message: 'Dati sincronizzati' });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      message: 'Errore sincronizzazione', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET USER DATA
app.get('/api/user/data', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [userFavorites, readingProgress, library, profile] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.user_favorites.findUnique({ where: { userId } }),
        prisma.reading_progress.findMany({ 
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.user_library.findUnique({ where: { userId } }),
        prisma.user_profile.findUnique({ where: { userId } })
      ]);
    });
    
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
    
    res.json({ 
      favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
      readingProgress: progressObj,
      reading: library ? JSON.parse(library.reading || '[]') : [],
      completed: library ? JSON.parse(library.completed || '[]') : [],
      dropped: library ? JSON.parse(library.dropped || '[]') : [],
      history: library ? JSON.parse(library.history || '[]') : [],
      profile: profile || {},
      notificationSettings: notificationSettings || []
    });
    
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
    
    // ✅ Carica library separatamente (può non esistere)
    let reading = [], completed = [], dropped = [];
    try {
      const library = await executeWithRetry(async () => {
        return await prisma.user_library.findUnique({
          where: { userId: user.id }
        });
      });
      
      if (library) {
        reading = JSON.parse(library.reading || '[]').slice(0, 12);
        completed = JSON.parse(library.completed || '[]').slice(0, 12);
        dropped = JSON.parse(library.dropped || '[]').slice(0, 12);
      }
    } catch (e) {
      console.error('Errore caricamento library:', e);
    }
    
    // ✅ Carica favorites separatamente (può non esistere)
    let favorites = [];
    try {
      const favoritesData = await executeWithRetry(async () => {
        return await prisma.user_favorites.findUnique({
          where: { userId: user.id }
        });
      });
      
      if (favoritesData) {
        favorites = JSON.parse(favoritesData.favorites || '[]').slice(0, 12);
      }
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

// EXPORT USER DATA (GDPR COMPLIANCE) - Complete data export in JSON format
app.get('/api/user/export', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all user data
    const [user, profile, favorites, library, readingProgress, follows] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user_profile.findUnique({ where: { userId } }),
        prisma.user_favorites.findUnique({ where: { userId } }),
        prisma.user_library.findUnique({ where: { userId } }),
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
        favorites: favorites ? JSON.parse(favorites.favorites) : [],
        reading: library ? JSON.parse(library.reading || '[]') : [],
        completed: library ? JSON.parse(library.completed || '[]') : [],
        dropped: library ? JSON.parse(library.dropped || '[]') : [],
        history: library ? JSON.parse(library.history || '[]') : [],
        lastSyncAt: library?.updatedAt
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
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     NeKuro Scan Auth Server v4.1      ║
  ╠════════════════════════════════════════╣
  ║ Port: ${PORT.toString().padEnd(33)}║
  ║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)}║
  ║ Database: ${dbConnected ? '✅ Connected'.padEnd(29) : '⏳ Connecting...'.padEnd(29)}║
  ║ Storage: ${supabase ? '✅ Configured'.padEnd(30) : '⚠️  Disabled'.padEnd(30)}║
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
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));