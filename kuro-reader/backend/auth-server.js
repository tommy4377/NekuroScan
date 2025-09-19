import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

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

// Initialize database tables if not exist
async function initDatabase() {
  try {
    // Check if user_profile table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profile'
      );
    `;
    
    if (!tableExists[0]?.exists) {
      console.log('Creating user_profile table...');
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
        CREATE INDEX IF NOT EXISTS "idx_follows_follower" ON "user_follows"("followerId");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "idx_follows_following" ON "user_follows"("followingId");
      `;
      
      console.log('Database tables created successfully');
    }
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

    // Try to create profile, but don't fail if table doesn't exist
    try {
      await prisma.$executeRaw`
        INSERT INTO "user_profile" ("userId", "displayName", "isPublic")
        VALUES (${user.id}, ${username}, false)
        ON CONFLICT DO NOTHING;
      `;
    } catch (e) {
      console.log('Profile creation skipped:', e.message);
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

// Login - FIXED
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Email/Username e password richiesti' });
    }
    
    const normalized = emailOrUsername.toLowerCase().trim();
    
    // Simple query without profile
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

    // Try to get profile separately
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      // Profile table doesn't exist yet
      console.log('Profile fetch skipped');
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

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Try to get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      console.log('Profile fetch skipped');
    }
    
    res.json({ 
      user: {
        ...user,
        profile
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore nel recupero utente' });
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
    
    // Try to get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id} LIMIT 1;
      `;
      profile = profileResult[0];
    } catch (e) {
      console.log('Profile table not available');
    }
    
    if (!profile || !profile.isPublic) {
      return res.status(403).json({ message: 'Profilo privato' });
    }
    
    // Get library data
    const library = await prisma.user_library.findUnique({
      where: { userId: user.id }
    });
    
    const favorites = await prisma.user_favorites.findUnique({
      where: { userId: user.id }
    });
    
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
        views: profile.viewCount || 0
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

// Update profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { bio, avatarUrl, isPublic, displayName, socialLinks, theme } = req.body;
    
    // Check if profile exists
    let profile = null;
    try {
      const existing = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id} LIMIT 1;
      `;
      
      if (existing[0]) {
        // Update existing
        await prisma.$executeRaw`
          UPDATE "user_profile"
          SET 
            "bio" = ${bio || null},
            "avatarUrl" = ${avatarUrl || null},
            "isPublic" = ${isPublic === true || isPublic === 'true'},
            "displayName" = ${displayName || null},
            "theme" = ${theme || 'default'},
            "socialLinks" = ${socialLinks ? JSON.stringify(socialLinks) : '{}'}::jsonb,
            "updatedAt" = NOW()
          WHERE "userId" = ${req.user.id};
        `;
      } else {
        // Create new
        await prisma.$executeRaw`
          INSERT INTO "user_profile" 
          ("userId", "bio", "avatarUrl", "isPublic", "displayName", "theme", "socialLinks")
          VALUES (
            ${req.user.id},
            ${bio || null},
            ${avatarUrl || null},
            ${isPublic === true || isPublic === 'true'},
            ${displayName || null},
            ${theme || 'default'},
            ${socialLinks ? JSON.stringify(socialLinks) : '{}'}::jsonb
          );
        `;
      }
      
      const updated = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id} LIMIT 1;
      `;
      profile = updated[0];
      
    } catch (e) {
      console.error('Profile update error:', e);
      return res.status(500).json({ message: 'Errore aggiornamento profilo' });
    }
    
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

// =================== LIBRARY SYNC (existing endpoints) ===================

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
    
    // Try to get profile
    let profile = null;
    try {
      const profileResult = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id} LIMIT 1;
      `;
      profile = profileResult[0] || null;
    } catch (e) {
      console.log('Profile fetch skipped');
    }
    
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
    const { mangaUrl, mangaTitle, chapterIndex, pageIndex = 0 } = req.body;
    
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
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        mangaUrl,
        mangaTitle: mangaTitle || 'Unknown',
        chapterIndex,
        pageIndex
      }
    });
    
    res.json({ success: true, progress });
    
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: 'Errore nel salvataggio progresso' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'KuroReader Auth Server',
    version: '2.0.1'
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
