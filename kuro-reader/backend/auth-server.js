// ✅ AUTH-SERVER.JS v3.6 - FIX PREPARED STATEMENTS E RECONNECTION
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========= CONFIG VALIDATION =========
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('⚠️  Running in LIMITED MODE - Only basic features available');
}

// ========= PRISMA SETUP WITH CONNECTION POOLING =========
let prisma = null;
let dbConnected = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ✅ FIX: Configurazione Prisma ottimizzata per evitare prepared statements issues
async function createPrismaClient() {
  try {
    // Chiudi istanza precedente se esiste
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
    
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'minimal',
      // ✅ FIX: Disabilita prepared statements per evitare errori
      datasources: {
        db: {
          url: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=1'
        }
      }
    });
    
    // ✅ FIX: Usa queryRaw per evitare prepared statements
    await prisma.$queryRawUnsafe('SELECT 1');
    
    dbConnected = true;
    reconnectAttempts = 0;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    dbConnected = false;
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// ✅ FIX: Reconnection logic migliorata
async function reconnectDatabase() {
  if (reconnectTimer) return;
  
  reconnectAttempts++;
  
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Max reconnection attempts reached. Please check database.');
    return;
  }
  
  const delay = Math.min(reconnectAttempts * 2000, 30000); // Max 30s
  console.log(`🔄 Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await connectDatabase();
  }, delay);
}

async function connectDatabase() {
  const success = await createPrismaClient();
  if (!success) {
    await reconnectDatabase();
  }
}

// Initial connection
connectDatabase();

// ✅ FIX: Middleware per gestire errori di connessione
const handlePrismaError = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    // Se è un errore di prepared statement o connessione, riconnetti
    if (error.code === '26000' || // prepared statement does not exist
        error.code === 'P1001' || // Can't reach database
        error.code === 'P1002' || // Database timeout
        error.message?.includes('prepared statement')) {
      
      console.error('🔄 Database error detected, reconnecting...', error.code);
      dbConnected = false;
      await reconnectDatabase();
      
      return res.status(503).json({ 
        message: 'Database temporaneamente non disponibile, riprova',
        retryAfter: 5 
      });
    }
    
    // Altri errori
    console.error('Request error:', error);
    res.status(500).json({ 
      message: 'Errore del server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========= SUPABASE SETUP (OPTIONAL) =========
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
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

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
  ? ['https://kuroreader.onrender.com', 'https://nekuroscan.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========= DATABASE CHECK MIDDLEWARE =========
const requireDatabase = (req, res, next) => {
  if (!dbConnected || !prisma) {
    return res.status(503).json({ 
      message: 'Database temporaneamente non disponibile',
      retryAfter: 5 
    });
  }
  next();
};

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
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'NeKuro Scan Auth Server',
    version: '3.6.0',
    database: dbConnected ? 'connected' : 'disconnected',
    storage: supabase ? 'configured' : 'disabled'
  };
  
  if (dbConnected) {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      health.database = 'healthy';
    } catch (error) {
      health.database = 'unhealthy';
      health.status = 'degraded';
      dbConnected = false;
      reconnectDatabase();
    }
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// ========= AUTH ROUTES WITH ERROR HANDLING =========

// REGISTER
app.post('/api/auth/register', requireDatabase, handlePrismaError(async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tutti i campi sono richiesti' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: 'La password deve essere di almeno 6 caratteri' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email non valida' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();
  
  const existingUser = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: normalizedEmail }, 
        { username: normalizedUsername }
      ] 
    }
  });
  
  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      return res.status(400).json({ message: 'Email già registrata' });
    }
    return res.status(400).json({ message: 'Username già in uso' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  // ✅ FIX: Use sequential operations instead of transaction
  const newUser = await prisma.user.create({
    data: { 
      username: normalizedUsername, 
      email: normalizedEmail, 
      password: hashedPassword 
    }
  });

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

  await prisma.user_favorites.create({
    data: {
      userId: newUser.id,
      favorites: '[]'
    }
  });

  await prisma.user_library.create({
    data: {
      userId: newUser.id,
      reading: '[]',
      completed: '[]',
      dropped: '[]',
      history: '[]'
    }
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
}));

// LOGIN
app.post('/api/auth/login', requireDatabase, handlePrismaError(async (req, res) => {
  const { emailOrUsername, password } = req.body;
  
  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: 'Email/Username e password richiesti' });
  }
  
  const normalized = emailOrUsername.toLowerCase().trim();
  
  const user = await prisma.user.findFirst({
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
}));

// GET CURRENT USER
app.get('/api/auth/me', authenticateToken, requireDatabase, handlePrismaError(async (req, res) => {
  const user = await prisma.user.findUnique({ 
    where: { id: req.user.id },
    include: {
      profile: true
    }
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
}));

// UPDATE PROFILE
app.put('/api/user/profile', authenticateToken, requireDatabase, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), handlePrismaError(async (req, res) => {
  const { bio, isPublic, displayName, socialLinks } = req.body;
  const userId = req.user.id;
  
  let profile = await prisma.user_profile.findUnique({
    where: { userId }
  });

  let updateData = {
    bio: bio || profile?.bio || '',
    isPublic: isPublic === true || isPublic === 'true',
    displayName: displayName || profile?.displayName || req.user.username,
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
    profile = await prisma.user_profile.update({
      where: { userId },
      data: updateData
    });
  } else {
    profile = await prisma.user_profile.create({
      data: {
        userId,
        ...updateData,
        viewCount: 0,
        badges: []
      }
    });
  }
  
  res.json({ success: true, profile });
}));

// SYNC DATA TO SERVER
app.post('/api/user/sync', authenticateToken, requireDatabase, handlePrismaError(async (req, res) => {
  const { favorites, reading, completed, dropped, history, readingProgress } = req.body;
  const userId = req.user.id;
  
  // ✅ FIX: Use sequential operations instead of transaction
  
  // SYNC FAVORITES
  if (favorites !== undefined) {
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
  }
  
  // SYNC LIBRARY
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
        history: JSON.stringify(history || []),
      }
    });
  }
  
  // SYNC READING PROGRESS
  if (readingProgress && typeof readingProgress === 'object') {
    for (const [mangaUrl, progress] of Object.entries(readingProgress)) {
      if (progress && typeof progress === 'object') {
        const existing = await prisma.reading_progress.findUnique({
          where: {
            userId_mangaUrl: { userId, mangaUrl }
          }
        });
        
        if (existing) {
          await prisma.reading_progress.update({
            where: {
              userId_mangaUrl: { userId, mangaUrl }
            },
            data: {
              chapterIndex: progress.chapterIndex || 0,
              pageIndex: progress.page || progress.pageIndex || 0,
              totalPages: progress.totalPages || 0,
              updatedAt: new Date()
            }
          });
        } else {
          await prisma.reading_progress.create({
            data: {
              userId,
              mangaUrl,
              mangaTitle: progress.mangaTitle || progress.title || '',
              chapterIndex: progress.chapterIndex || 0,
              pageIndex: progress.page || progress.pageIndex || 0,
              totalPages: progress.totalPages || 0
            }
          });
        }
      }
    }
  }
  
  res.json({ success: true, message: 'Dati sincronizzati' });
}));

// GET USER DATA
app.get('/api/user/data', authenticateToken, requireDatabase, handlePrismaError(async (req, res) => {
  const userId = req.user.id;
  
  const [userFavorites, readingProgress, library, profile] = await Promise.all([
    prisma.user_favorites.findUnique({ where: { userId } }),
    prisma.reading_progress.findMany({ 
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.user_library.findUnique({ where: { userId } }),
    prisma.user_profile.findUnique({ where: { userId } })
  ]);
  
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
  
  res.json({ 
    favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
    readingProgress: progressObj,
    reading: library ? JSON.parse(library.reading || '[]') : [],
    completed: library ? JSON.parse(library.completed || '[]') : [],
    dropped: library ? JSON.parse(library.dropped || '[]') : [],
    history: library ? JSON.parse(library.history || '[]') : [],
    profile: profile || {},
    notificationSettings: []
  });
}));

// GET PUBLIC PROFILE
app.get('/api/profile/:username', handlePrismaError(async (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ message: 'Servizio temporaneamente non disponibile' });
  }
  
  const { username } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      profile: true,
      library: true,
      favorites: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ message: 'Utente non trovato' });
  }
  
  if (!user.profile || !user.profile.isPublic) {
    return res.status(403).json({ message: 'Profilo privato' });
  }
  
  await prisma.user_profile.update({
    where: { id: user.profile.id },
    data: { viewCount: user.profile.viewCount + 1 }
  });
  
  const reading = JSON.parse(user.library?.reading || '[]').slice(0, 12);
  const completed = JSON.parse(user.library?.completed || '[]').slice(0, 12);
  const dropped = JSON.parse(user.library?.dropped || '[]').slice(0, 12);
  const favorites = JSON.parse(user.favorites?.favorites || '[]').slice(0, 12);
  
  const followersCount = await prisma.user_follows.count({
    where: { followingId: user.id }
  });
  
  const followingCount = await prisma.user_follows.count({
    where: { followerId: user.id }
  });
  
  res.json({
    username: user.username,
    displayName: user.profile.displayName || user.username,
    bio: user.profile.bio,
    avatarUrl: user.profile.avatarUrl,
    bannerUrl: user.profile.bannerUrl,
    badges: user.profile.badges || [],
    stats: {
      totalRead: reading.length + completed.length,
      favorites: favorites.length,
      completed: completed.length,
      dropped: dropped.length,
      views: user.profile.viewCount,
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
}));

// ========= ERROR HANDLER =========
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Errore interno del server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========= START SERVER =========
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     NeKuro Scan Auth Server v3.6      ║
  ╠════════════════════════════════════════╣
  ║ Port: ${PORT.toString().padEnd(33)}║
  ║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)}║
  ║ Database: ${dbConnected ? '✅ Connected'.padEnd(29) : '❌ Disconnected'.padEnd(29)}║
  ║ Storage: ${supabase ? '✅ Configured'.padEnd(30) : '⚠️  Disabled'.padEnd(30)}║
  ╚════════════════════════════════════════╝
  `);
  
  if (!dbConnected) {
    console.log('⚠️  Server running in DEGRADED mode - Database offline');
    console.log('🔄 Attempting to reconnect...');
  }
});

// ========= GRACEFUL SHUTDOWN =========
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 ${signal} received, starting graceful shutdown...`);
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));