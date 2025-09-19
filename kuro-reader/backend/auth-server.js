import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';

dotenv.config();

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

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET not set in production!');
  process.exit(1);
}

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

// Multer for file uploads (memory storage for image processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

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

// Helper function to process images
const processImage = async (buffer, options = {}) => {
  const { width = 500, height = 500, quality = 80 } = options;
  
  try {
    const processed = await sharp(buffer)
      .resize(width, height, { 
        fit: 'cover',
        withoutEnlargement: true 
      })
      .jpeg({ quality })
      .toBuffer();
    
    return `data:image/jpeg;base64,${processed.toString('base64')}`;
  } catch (error) {
    console.error('Image processing error:', error);
    return null;
  }
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
      },
      include: {
        profile: true
      }
    });

    // Create default profile
    await prisma.user_profile.create({
      data: {
        userId: user.id,
        displayName: username,
        isPublic: false
      }
    });

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
      { id: user.id, email: user.email }, 
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
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        profile: true,
        _count: {
          select: {
            followers: true,
            follows: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    res.json({ user });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore nel recupero utente' });
  }
});

// =================== PROFILE ENDPOINTS ===================

// Get public profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        profile: true,
        library: true,
        favorites: true,
        _count: {
          select: {
            followers: true,
            follows: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (!user.profile?.isPublic) {
      return res.status(403).json({ message: 'Profilo privato' });
    }
    
    // Increment view count
    await prisma.user_profile.update({
      where: { userId: user.id },
      data: { viewCount: { increment: 1 } }
    });
    
    // Parse library data
    const reading = JSON.parse(user.library?.reading || '[]').slice(0, 12);
    const completed = JSON.parse(user.library?.completed || '[]').slice(0, 12);
    const favorites = JSON.parse(user.favorites?.favorites || '[]').slice(0, 12);
    
    res.json({
      username: user.username,
      displayName: user.profile.displayName || user.username,
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      bannerUrl: user.profile.bannerUrl,
      badges: user.profile.badges || [],
      theme: user.profile.theme || 'default',
      stats: {
        totalRead: reading.length + completed.length,
        favorites: favorites.length,
        completed: completed.length,
        followers: user._count.followers,
        following: user._count.follows,
        views: user.profile.viewCount
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

// Update profile with image upload
app.put('/api/user/profile', authenticateToken, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bio, isPublic, displayName, socialLinks, theme } = req.body;
    
    const updateData = {
      bio,
      isPublic: isPublic === 'true' || isPublic === true,
      displayName,
      theme,
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
    
    // Process avatar if uploaded
    if (req.files?.avatar?.[0]) {
      const avatarData = await processImage(req.files.avatar[0].buffer, {
        width: 400,
        height: 400,
        quality: 85
      });
      if (avatarData) {
        updateData.avatarUrl = avatarData;
      }
    }
    
    // Process banner if uploaded
    if (req.files?.banner?.[0]) {
      const bannerData = await processImage(req.files.banner[0].buffer, {
        width: 1200,
        height: 300,
        quality: 85
      });
      if (bannerData) {
        updateData.bannerUrl = bannerData;
      }
    }
    
    const profile = await prisma.user_profile.upsert({
      where: { userId: req.user.id },
      update: updateData,
      create: {
        userId: req.user.id,
        ...updateData
      }
    });
    
    res.json({ success: true, profile });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Errore aggiornamento profilo' });
  }
});

// Delete account
app.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password richiesta per confermare' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Password non valida' });
    }
    
    // Delete user (cascade will delete all related data)
    await prisma.user.delete({
      where: { id: req.user.id }
    });
    
    res.json({ success: true, message: 'Account eliminato con successo' });
    
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Errore eliminazione account' });
  }
});

// Follow/Unfollow user
app.post('/api/user/follow/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    const targetUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    
    if (!targetUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'Non puoi seguire te stesso' });
    }
    
    // Check if already following
    const existingFollow = await prisma.user_follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: targetUser.id
        }
      }
    });
    
    if (existingFollow) {
      // Unfollow
      await prisma.user_follows.delete({
        where: { id: existingFollow.id }
      });
      res.json({ success: true, following: false });
    } else {
      // Follow
      await prisma.user_follows.create({
        data: {
          followerId: req.user.id,
          followingId: targetUser.id
        }
      });
      res.json({ success: true, following: true });
    }
    
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ message: 'Errore operazione follow' });
  }
});

// Check if following
app.get('/api/user/following/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    const targetUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    
    if (!targetUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    const following = await prisma.user_follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: targetUser.id
        }
      }
    });
    
    res.json({ following: !!following });
    
  } catch (error) {
    console.error('Check following error:', error);
    res.status(500).json({ message: 'Errore controllo follow' });
  }
});

// =================== LIBRARY SYNC ===================

// Save library data
app.post('/api/user/library', authenticateToken, async (req, res) => {
  try {
    const { reading, completed, history } = req.body;
    
    await prisma.user_library.upsert({
      where: { userId: req.user.id },
      update: {
        reading: JSON.stringify(reading || []),
        completed: JSON.stringify(completed || []),
        history: JSON.stringify(history || []),
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        reading: JSON.stringify(reading || []),
        completed: JSON.stringify(completed || []),
        history: JSON.stringify(history || [])
      }
    });
    
    res.json({ success: true, message: 'Libreria salvata' });
    
  } catch (error) {
    console.error('Save library error:', error);
    res.status(500).json({ message: 'Errore nel salvataggio libreria' });
  }
});

// Get library data
app.get('/api/user/library', authenticateToken, async (req, res) => {
  try {
    const library = await prisma.user_library.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!library) {
      return res.json({
        reading: [],
        completed: [],
        history: []
      });
    }
    
    res.json({
      reading: JSON.parse(library.reading || '[]'),
      completed: JSON.parse(library.completed || '[]'),
      history: JSON.parse(library.history || '[]')
    });
    
  } catch (error) {
    console.error('Get library error:', error);
    res.status(500).json({ message: 'Errore nel recupero libreria' });
  }
});

// Save/Update user favorites
app.post('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const { favorites } = req.body;
    
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ message: 'Favorites deve essere un array' });
    }
    
    await prisma.user_favorites.upsert({
      where: { userId: req.user.id },
      update: { 
        favorites: JSON.stringify(favorites),
        updatedAt: new Date()
      },
      create: { 
        userId: req.user.id, 
        favorites: JSON.stringify(favorites) 
      }
    });
    
    res.json({ success: true, message: 'Preferiti salvati' });
    
  } catch (error) {
    console.error('Save favorites error:', error);
    res.status(500).json({ message: 'Errore nel salvataggio preferiti' });
  }
});

// Get user favorites
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const userData = await prisma.user_favorites.findUnique({ 
      where: { userId: req.user.id } 
    });
    
    res.json({ 
      favorites: userData ? JSON.parse(userData.favorites) : [] 
    });
    
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Errore nel recupero preferiti' });
  }
});

// Get all user data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const [userFavorites, readingProgress, library, profile] = await Promise.all([
      prisma.user_favorites.findUnique({ 
        where: { userId: req.user.id } 
      }),
      prisma.reading_progress.findMany({ 
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.user_library.findUnique({
        where: { userId: req.user.id }
      }),
      prisma.user_profile.findUnique({
        where: { userId: req.user.id }
      })
    ]);
    
    res.json({ 
      favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
      readingProgress: readingProgress || [],
      reading: library ? JSON.parse(library.reading || '[]') : [],
      completed: library ? JSON.parse(library.completed || '[]') : [],
      history: library ? JSON.parse(library.history || '[]') : [],
      profile: profile || {}
    });
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore nel recupero dati utente' });
  }
});

// Save reading progress
app.post('/api/user/progress', authenticateToken, async (req, res) => {
  try {
    const { mangaUrl, mangaTitle, chapterIndex, pageIndex = 0, totalPages = 0 } = req.body;
    
    if (!mangaUrl || chapterIndex === undefined) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }
    
    const progress = await prisma.reading_progress.upsert({
      where: {
        userId_mangaUrl: {
          userId: req.user.id,
          mangaUrl
        }
      },
      update: {
        chapterIndex,
        pageIndex,
        totalPages,
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        mangaUrl,
        mangaTitle: mangaTitle || 'Unknown',
        chapterIndex,
        pageIndex,
        totalPages
      }
    });
    
    res.json({ success: true, progress });
    
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: 'Errore nel salvataggio progresso' });
  }
});

// Get user stats
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const [library, favorites, progress, profile] = await Promise.all([
      prisma.user_library.findUnique({
        where: { userId: req.user.id }
      }),
      prisma.user_favorites.findUnique({
        where: { userId: req.user.id }
      }),
      prisma.reading_progress.count({
        where: { userId: req.user.id }
      }),
      prisma.user_profile.findUnique({
        where: { userId: req.user.id }
      })
    ]);
    
    const reading = JSON.parse(library?.reading || '[]');
    const completed = JSON.parse(library?.completed || '[]');
    const favs = JSON.parse(favorites?.favorites || '[]');
    
    // Calculate reading time (mock)
    const totalChaptersRead = progress * 10; // estimate
    const avgReadingTime = 15; // minutes per chapter
    const totalReadingTime = totalChaptersRead * avgReadingTime;
    
    res.json({
      totalManga: reading.length + completed.length,
      reading: reading.length,
      completed: completed.length,
      favorites: favs.length,
      chaptersRead: totalChaptersRead,
      readingTime: totalReadingTime,
      profileViews: profile?.viewCount || 0,
      badges: profile?.badges || [],
      joinDate: req.user.createdAt
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Errore recupero statistiche' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'KuroReader Auth Server',
    version: '2.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint non trovato' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Errore interno del server' });
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
