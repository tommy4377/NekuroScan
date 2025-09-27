// backend/auth-server.js
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

// Configurazione Prisma - RIMANE UGUALE
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

// NUOVO: Configurazione Supabase client per storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// RIMUOVI QUESTE RIGHE (non servono più):
// const uploadsDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// Multer configuration - RIMANE UGUALE
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
      cb(new Error('Invalid file type'));
    }
  }
});

// CORS configuration - RIMANE UGUALE
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

// IMPORTANTE: Serve static files per uploads
app.use('/uploads', express.static(uploadsDir));

// Middleware per verificare il token
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
    await prisma.user_profile.create({
      data: {
        userId: user.id,
        displayName: username, // Original case
        bio: '',
        avatarUrl: '',
        bannerUrl: '',
        isPublic: false,
        viewCount: 0,
        badges: []
      }
    });

    // Initialize empty favorites and library
    await prisma.user_favorites.create({
      data: {
        userId: user.id,
        favorites: '[]'
      }
    });

    await prisma.user_library.create({
      data: {
        userId: user.id,
        reading: '[]',
        completed: '[]',
        history: '[]'
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username }, 
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
      },
      include: {
        profile: true,
        favorites: true,
        library: true
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
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Errore durante il login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
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
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore nel recupero utente' });
  }
});

// Update profile - FIXED per immagini persistenti e displayName
app.put('/api/user/profile', authenticateToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bio, isPublic, displayName, socialLinks } = req.body;
    const userId = req.user.id;
    
    // Get existing profile
    let profile = await prisma.user_profile.findUnique({
      where: { userId }
    });

    let updateData = {
      bio: bio || profile?.bio || '',
      isPublic: isPublic === true || isPublic === 'true',
      displayName: displayName || profile?.displayName || req.user.username,
      updatedAt: new Date()
    };

    // Process social links
    if (socialLinks) {
      try {
        updateData.socialLinks = typeof socialLinks === 'string' 
          ? JSON.parse(socialLinks) 
          : socialLinks;
      } catch (e) {
        updateData.socialLinks = {};
      }
    }

    // Process uploaded images con path assoluti
    if (req.files?.avatar) {
      const avatarFile = req.files.avatar[0];
      const avatarFileName = `avatar_${userId}_${Date.now()}.webp`;
      const avatarPath = path.join(uploadsDir, avatarFileName);
      
      // Delete old avatar if exists
      if (profile?.avatarUrl && profile.avatarUrl.includes('/uploads/')) {
        const oldFileName = profile.avatarUrl.split('/uploads/')[1];
        const oldPath = path.join(uploadsDir, oldFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      await sharp(avatarFile.buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(avatarPath);
      
      // Save with full URL in production
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://kuro-auth-backend.onrender.com'
        : `http://localhost:${PORT}`;
      updateData.avatarUrl = `${baseUrl}/uploads/${avatarFileName}`;
    }
    
    if (req.files?.banner) {
      const bannerFile = req.files.banner[0];
      const bannerFileName = `banner_${userId}_${Date.now()}.webp`;
      const bannerPath = path.join(uploadsDir, bannerFileName);
      
      // Delete old banner if exists
      if (profile?.bannerUrl && profile.bannerUrl.includes('/uploads/')) {
        const oldFileName = profile.bannerUrl.split('/uploads/')[1];
        const oldPath = path.join(uploadsDir, oldFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      await sharp(bannerFile.buffer)
        .resize(1200, 400, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(bannerPath);
      
      // Save with full URL in production
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://kuro-auth-backend.onrender.com'
        : `http://localhost:${PORT}`;
      updateData.bannerUrl = `${baseUrl}/uploads/${bannerFileName}`;
    }
    
    if (profile) {
      // Update existing profile
      profile = await prisma.user_profile.update({
        where: { userId },
        data: updateData
      });
    } else {
      // Create new profile
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
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Errore aggiornamento profilo' });
  }
});

// Get public profile - FIXED per username
app.get('/api/profile/:username', async (req, res) => {
  try {
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
    
    // Increment view count
    await prisma.user_profile.update({
      where: { id: user.profile.id },
      data: { viewCount: user.profile.viewCount + 1 }
    });
    
    // Parse library data
    const reading = JSON.parse(user.library?.reading || '[]').slice(0, 12);
    const completed = JSON.parse(user.library?.completed || '[]').slice(0, 12);
    const favorites = JSON.parse(user.favorites?.favorites || '[]').slice(0, 12);
    
    // Get follower count
    const followersCount = await prisma.user_follows.count({
      where: { followingId: user.id }
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
        views: user.profile.viewCount,
        followers: followersCount
      },
      reading,
      completed,
      favorites,
      socialLinks: user.profile.socialLinks || {},
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
    
    // For now just return success
    // In future implement real notification system
    res.json({ success: true, enabled });
    
  } catch (error) {
    console.error('Toggle notification error:', error);
    res.status(500).json({ message: 'Errore gestione notifiche' });
  }
});

// =================== DATA SYNC ENDPOINTS - FIXED ===================

// Save/sync all user data - COMPLETAMENTE RISCRITTO
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
    
    // Update library con tutti i dati
    const existingLibrary = await prisma.user_library.findUnique({
      where: { userId }
    });
    
    const updateLibraryData = {};
    if (reading !== undefined) updateLibraryData.reading = JSON.stringify(reading);
    if (completed !== undefined) updateLibraryData.completed = JSON.stringify(completed);
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
          history: JSON.stringify(history || []),
        }
      });
    }
    
    // Update reading progress
    if (readingProgress && typeof readingProgress === 'object') {
      for (const [mangaUrl, progress] of Object.entries(readingProgress)) {
        if (progress && typeof progress === 'object') {
          await prisma.reading_progress.upsert({
            where: {
              userId_mangaUrl: { userId, mangaUrl }
            },
            update: {
              chapterIndex: progress.chapterIndex || 0,
              pageIndex: progress.page || progress.pageIndex || 0,
              totalPages: progress.totalPages || 0,
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
        }
      }
    }
    
    res.json({ success: true, message: 'Dati sincronizzati' });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Errore sincronizzazione', error: error.message });
  }
});

// Get all user data - FIXED
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
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
    
    // Convert reading progress to object format
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
      history: library ? JSON.parse(library.history || '[]') : [],
      profile: profile || {},
      notificationSettings: [] // Per compatibilità
    });
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore nel recupero dati utente' });
  }
});

// Get user stats
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [library, favorites, profile, readingProgress] = await Promise.all([
      prisma.user_library.findUnique({ where: { userId } }),
      prisma.user_favorites.findUnique({ where: { userId } }),
      prisma.user_profile.findUnique({ where: { userId } }),
      prisma.reading_progress.count({ where: { userId } })
    ]);
    
    const reading = JSON.parse(library?.reading || '[]');
    const completed = JSON.parse(library?.completed || '[]');
    const favs = JSON.parse(favorites?.favorites || '[]');
    
    const followersCount = await prisma.user_follows.count({
      where: { followingId: userId }
    });
    
    const followingCount = await prisma.user_follows.count({
      where: { followerId: userId }
    });
    
    res.json({
      totalManga: reading.length + completed.length,
      reading: reading.length,
      completed: completed.length,
      favorites: favs.length,
      chaptersRead: readingProgress * 5, // Estimate
      readingTime: readingProgress * 15, // Estimate minutes
      profileViews: profile?.viewCount || 0,
      followers: followersCount,
      following: followingCount,
      badges: profile?.badges || []
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Errore recupero statistiche' });
  }
});

// Altri endpoints esistenti...

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'KuroReader Auth Server',
    version: '2.3.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Starting graceful shutdown...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);

process.on('SIGINT', gracefulShutdown);
