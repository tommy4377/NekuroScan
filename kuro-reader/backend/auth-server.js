// backend/auth-server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL 
    } 
  },
  log: ['error', 'warn']
});

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed'));
    }
  }
});

// Initialize database tables if not exist
async function initDatabase() {
  try {
    console.log('Checking database schema...');
    
    // Create tables if they don't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_profile" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL,
        "bio" TEXT,
        "avatarUrl" TEXT,
        "bannerUrl" TEXT,
        "isPublic" BOOLEAN DEFAULT false,
        "displayName" TEXT,
        "socialLinks" JSONB,
        "viewCount" INTEGER DEFAULT 0,
        "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "theme" TEXT DEFAULT 'default',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_follows" (
        "id" SERIAL PRIMARY KEY,
        "followerId" INTEGER NOT NULL,
        "followingId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("followerId", "followingId"),
        FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE CASCADE,
        FOREIGN KEY ("followingId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "manga_notifications" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "mangaUrl" TEXT NOT NULL,
        "mangaTitle" TEXT NOT NULL,
        "enabled" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "mangaUrl"),
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "data" JSONB,
        "read" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initDatabase();

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://kuroreader.onrender.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Middleware per verificare il token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token mancante' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

// =================== AUTH ENDPOINTS ===================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
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
    
    const user = await prisma.user.create({
      data: { 
        username: normalizedUsername, 
        email: normalizedEmail, 
        password: hashedPassword 
      }
    });

    // Create initial profile
    try {
      await prisma.$executeRaw`
        INSERT INTO "user_profile" ("userId", "displayName", "isPublic", "avatarUrl", "bio")
        VALUES (${user.id}, ${username}, false, '', '')
        ON CONFLICT ("userId") DO NOTHING;
      `;
    } catch (e) {
      console.log('Profile creation error:', e.message);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      }, 
      token 
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Errore durante la registrazione'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
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
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    // Get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      console.log('Profile fetch error');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        profile
      }, 
      token 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Errore durante il login' });
  }
});

// Get current user with profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      console.log('Profile fetch error');
    }
    
    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        profile
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore nel recupero utente' });
  }
});

// Update profile with file upload
app.put('/api/user/profile', authenticateToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bio, isPublic, displayName, socialLinks, theme } = req.body;
    const userId = req.user.id;
    
    // Process uploaded images
    let avatarUrl = null;
    let bannerUrl = null;
    
    if (req.files?.avatar) {
      const avatarFile = req.files.avatar[0];
      const avatarFileName = `avatar_${userId}_${Date.now()}.webp`;
      const avatarPath = path.join(uploadsDir, avatarFileName);
      
      // Resize and save avatar
      await sharp(avatarFile.buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(avatarPath);
      
      avatarUrl = `/uploads/${avatarFileName}`;
    }
    
    if (req.files?.banner) {
      const bannerFile = req.files.banner[0];
      const bannerFileName = `banner_${userId}_${Date.now()}.webp`;
      const bannerPath = path.join(uploadsDir, bannerFileName);
      
      // Resize and save banner
      await sharp(bannerFile.buffer)
        .resize(1200, 400, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(bannerPath);
      
      bannerUrl = `/uploads/${bannerFileName}`;
    }
    
    // Check if profile exists
    const existingProfile = await prisma.$queryRaw`
      SELECT * FROM "user_profile" WHERE "userId" = ${userId} LIMIT 1;
    `;
    
    if (existingProfile[0]) {
      // Update existing profile
      const updateQuery = `
        UPDATE "user_profile"
        SET 
          "bio" = $1,
          "isPublic" = $2,
          "displayName" = $3,
          "theme" = $4,
          "socialLinks" = $5::jsonb,
          "updatedAt" = NOW()
          ${avatarUrl ? ', "avatarUrl" = $6' : ''}
          ${bannerUrl ? (avatarUrl ? ', "bannerUrl" = $7' : ', "bannerUrl" = $6') : ''}
        WHERE "userId" = ${userId}
      `;
      
      const params = [
        bio || '',
        isPublic === true || isPublic === 'true',
        displayName || '',
        theme || 'default',
        socialLinks ? JSON.stringify(socialLinks) : '{}'
      ];
      
      if (avatarUrl) params.push(avatarUrl);
      if (bannerUrl) params.push(bannerUrl);
      
      await prisma.$executeRawUnsafe(updateQuery, ...params);
    } else {
      // Create new profile
      await prisma.$executeRaw`
        INSERT INTO "user_profile" 
        ("userId", "bio", "avatarUrl", "bannerUrl", "isPublic", "displayName", "theme", "socialLinks")
        VALUES (
          ${userId},
          ${bio || ''},
          ${avatarUrl || ''},
          ${bannerUrl || ''},
          ${isPublic === true || isPublic === 'true'},
          ${displayName || ''},
          ${theme || 'default'},
          ${socialLinks ? JSON.stringify(socialLinks) : '{}'}::jsonb
        );
      `;
    }
    
    // Get updated profile
    const updatedProfile = await prisma.$queryRaw`
      SELECT * FROM "user_profile" WHERE "userId" = ${userId} LIMIT 1;
    `;
    
    res.json({ success: true, profile: updatedProfile[0] });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Errore aggiornamento profilo' });
  }
});

// Get public profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0];
    } catch (e) {
      console.log('Profile not found');
    }
    
    if (!profile || !profile.isPublic) {
      return res.status(403).json({ message: 'Profilo privato' });
    }
    
    // Increment view count
    await prisma.$executeRaw`
      UPDATE "user_profile" 
      SET "viewCount" = "viewCount" + 1 
      WHERE "userId" = ${user.id};
    `;
    
    // Get library data
    const library = await prisma.user_library.findUnique({
      where: { userId: user.id }
    });
    
    const favorites = await prisma.user_favorites.findUnique({
      where: { userId: user.id }
    });
    
    // Get follower count
    const followers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "user_follows" WHERE "followingId" = ${user.id};
    `;
    
    const reading = JSON.parse(library?.reading || '[]').slice(0, 12);
    const completed = JSON.parse(library?.completed || '[]').slice(0, 12);
    const favs = JSON.parse(favorites?.favorites || '[]').slice(0, 12);
    
    res.json({
      username: user.username,
      displayName: profile.displayName || user.username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      badges: profile.badges || [],
      theme: profile.theme || 'default',
      stats: {
        totalRead: reading.length + completed.length,
        favorites: favs.length,
        completed: completed.length,
        views: profile.viewCount || 0,
        followers: parseInt(followers[0]?.count || 0)
      },
      reading,
      completed,
      favorites: favs,
      socialLinks: profile.socialLinks || {},
      joinedAt: user.createdAt
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Errore recupero profilo' });
  }
});

// =================== NOTIFICATION ENDPOINTS ===================

// Toggle manga notifications
app.post('/api/notifications/manga', authenticateToken, async (req, res) => {
  try {
    const { mangaUrl, mangaTitle, enabled } = req.body;
    const userId = req.user.id;
    
    if (enabled) {
      await prisma.$executeRaw`
        INSERT INTO "manga_notifications" ("userId", "mangaUrl", "mangaTitle", "enabled")
        VALUES (${userId}, ${mangaUrl}, ${mangaTitle}, true)
        ON CONFLICT ("userId", "mangaUrl") 
        DO UPDATE SET "enabled" = true;
      `;
    } else {
      await prisma.$executeRaw`
        DELETE FROM "manga_notifications" 
        WHERE "userId" = ${userId} AND "mangaUrl" = ${mangaUrl};
      `;
    }
    
    res.json({ success: true, enabled });
    
  } catch (error) {
    console.error('Toggle notification error:', error);
    res.status(500).json({ message: 'Errore gestione notifiche' });
  }
});

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.$queryRaw`
      SELECT * FROM "notifications" 
      WHERE "userId" = ${req.user.id}
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `;
    
    res.json(notifications);
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Errore recupero notifiche' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await prisma.$executeRaw`
      UPDATE "notifications" 
      SET "read" = true 
      WHERE "id" = ${parseInt(req.params.id)} AND "userId" = ${req.user.id};
    `;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Errore aggiornamento notifica' });
  }
});

// =================== DATA SYNC ENDPOINTS ===================

// Save/sync all user data
app.post('/api/user/sync', authenticateToken, async (req, res) => {
  try {
    const { favorites, reading, completed, history, readingProgress } = req.body;
    const userId = req.user.id;
    
    // Update favorites
    if (favorites !== undefined) {
      await prisma.user_favorites.upsert({
        where: { userId },
        update: { 
          favorites: JSON.stringify(favorites),
          updatedAt: new Date()
        },
        create: { 
          userId, 
          favorites: JSON.stringify(favorites) 
        }
      });
    }
    
    // Update library
    if (reading !== undefined || completed !== undefined || history !== undefined) {
      await prisma.user_library.upsert({
        where: { userId },
        update: {
          reading: reading !== undefined ? JSON.stringify(reading) : undefined,
          completed: completed !== undefined ? JSON.stringify(completed) : undefined,
          history: history !== undefined ? JSON.stringify(history) : undefined,
          updatedAt: new Date()
        },
        create: {
          userId,
          reading: JSON.stringify(reading || []),
          completed: JSON.stringify(completed || []),
          history: JSON.stringify(history || [])
        }
      });
    }
    
    // Update reading progress
    if (readingProgress) {
      for (const [mangaUrl, progress] of Object.entries(readingProgress)) {
        await prisma.reading_progress.upsert({
          where: {
            userId_mangaUrl: { userId, mangaUrl }
          },
          update: {
            chapterIndex: progress.chapterIndex || 0,
            pageIndex: progress.page || progress.pageIndex || 0,
            updatedAt: new Date()
          },
          create: {
            userId,
            mangaUrl,
            mangaTitle: progress.mangaTitle || '',
            chapterIndex: progress.chapterIndex || 0,
            pageIndex: progress.page || progress.pageIndex || 0
          }
        });
      }
    }
    
    res.json({ success: true, message: 'Dati sincronizzati' });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Errore sincronizzazione' });
  }
});

// Get all user data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const [userFavorites, readingProgress, library] = await Promise.all([
      prisma.user_favorites.findUnique({ 
        where: { userId: req.user.id } 
      }),
      prisma.reading_progress.findMany({ 
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.user_library.findUnique({
        where: { userId: req.user.id }
      })
    ]);
    
    // Get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      console.log('Profile fetch error');
    }
    
    // Get notification settings
    const notifications = await prisma.$queryRaw`
      SELECT * FROM "manga_notifications" 
      WHERE "userId" = ${req.user.id} AND "enabled" = true;
    `;
    
    res.json({ 
      favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
      readingProgress: readingProgress || [],
      reading: library ? JSON.parse(library.reading || '[]') : [],
      completed: library ? JSON.parse(library.completed || '[]') : [],
      history: library ? JSON.parse(library.history || '[]') : [],
      profile: profile || {},
      notificationSettings: notifications || []
    });
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore nel recupero dati utente' });
  }
});

// Other existing endpoints remain the same...

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'KuroReader Auth Server',
    version: '2.1.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Starting graceful shutdown...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);