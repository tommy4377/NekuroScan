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

// Initialize database tables
async function initDatabase() {
  try {
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
          "userId" INTEGER UNIQUE NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "bio" TEXT,
          "avatarUrl" TEXT,
          "bannerUrl" TEXT,
          "isPublic" BOOLEAN DEFAULT false,
          "displayName" TEXT,
          "socialLinks" JSONB DEFAULT '{}',
          "viewCount" INTEGER DEFAULT 0,
          "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "theme" TEXT DEFAULT 'default',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "user_follows" (
          "id" SERIAL PRIMARY KEY,
          "followerId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "followingId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("followerId", "followingId")
        );
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "idx_follows_follower" ON "user_follows"("followerId");
        CREATE INDEX IF NOT EXISTS "idx_follows_following" ON "user_follows"("followingId");
        CREATE INDEX IF NOT EXISTS "idx_profile_user" ON "user_profile"("userId");
      `;
      
      console.log('Database tables created successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDatabase();

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://kuroreader.onrender.com']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validate image URL
function validateImageUrl(url) {
  if (!url) return false;
  
  // Allow data URLs
  if (url.startsWith('data:image/')) return true;
  
  // Check URL format
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  return urlPattern.test(url);
}

// Auth middleware
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
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono richiesti' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimo 6 caratteri' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email non valida' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();
    
    // Check existing
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

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        username: normalizedUsername, 
        email: normalizedEmail, 
        password: hashedPassword 
      }
    });

    // Create profile
    try {
      await prisma.$executeRaw`
        INSERT INTO "user_profile" ("userId", "displayName", "isPublic")
        VALUES (${user.id}, ${username}, false);
      `;
    } catch (e) {
      console.log('Profile creation deferred');
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
    res.status(500).json({ message: 'Errore registrazione' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Credenziali richieste' });
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
      const profileData = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id};
      `;
      profile = profileData[0] || null;
    } catch (e) {
      console.log('Profile not available');
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
    res.status(500).json({ message: 'Errore login' });
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
    
    let profile = null;
    try {
      const profileData = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id};
      `;
      profile = profileData[0] || null;
    } catch (e) {
      console.log('Profile not available');
    }
    
    res.json({ 
      user: {
        ...user,
        profile
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore recupero utente' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password richieste' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Nuova password minimo 6 caratteri' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Password attuale non corretta' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    
    res.json({ success: true, message: 'Password cambiata' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Errore cambio password' });
  }
});

// =================== PROFILE ENDPOINTS ===================

// Get public profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Profilo non trovato' });
    }
    
    let profile = null;
    try {
      const profileData = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${user.id};
      `;
      profile = profileData[0];
      
      if (profile && profile.isPublic) {
        await prisma.$executeRaw`
          UPDATE "user_profile" 
          SET "viewCount" = COALESCE("viewCount", 0) + 1 
          WHERE "userId" = ${user.id};
        `;
      }
    } catch (e) {
      return res.status(404).json({ message: 'Profilo non disponibile' });
    }
    
    if (!profile || !profile.isPublic) {
      return res.status(403).json({ message: 'Profilo privato', isPrivate: true });
    }
    
    // Get library data
    const [library, favorites] = await Promise.all([
      prisma.user_library.findUnique({ where: { userId: user.id } }),
      prisma.user_favorites.findUnique({ where: { userId: user.id } })
    ]);
    
    const reading = JSON.parse(library?.reading || '[]').slice(0, 12);
    const completed = JSON.parse(library?.completed || '[]').slice(0, 12);
    const favs = JSON.parse(favorites?.favorites || '[]').slice(0, 12);
    
    // Get follower count
    let followerCount = 0;
    let followingCount = 0;
    try {
      const [followers, following] = await Promise.all([
        prisma.$queryRaw`SELECT COUNT(*) as count FROM "user_follows" WHERE "followingId" = ${user.id};`,
        prisma.$queryRaw`SELECT COUNT(*) as count FROM "user_follows" WHERE "followerId" = ${user.id};`
      ]);
      followerCount = parseInt(followers[0]?.count || 0);
      followingCount = parseInt(following[0]?.count || 0);
    } catch (e) {
      console.log('Follow count skipped');
    }
    
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
        followers: followerCount,
        following: followingCount
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
    const { bio, avatarUrl, bannerUrl, isPublic, displayName, socialLinks, theme } = req.body;
    
    // Validate URLs
    if (avatarUrl && !validateImageUrl(avatarUrl)) {
      return res.status(400).json({ message: 'URL avatar non valido' });
    }
    
    if (bannerUrl && !validateImageUrl(bannerUrl)) {
      return res.status(400).json({ message: 'URL banner non valido' });
    }
    
    let profile = null;
    try {
      const existing = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id};
      `;
      
      if (existing[0]) {
        await prisma.$executeRaw`
          UPDATE "user_profile"
          SET 
            "bio" = ${bio || null},
            "avatarUrl" = ${avatarUrl || null},
            "bannerUrl" = ${bannerUrl || null},
            "isPublic" = ${isPublic === true || isPublic === 'true'},
            "displayName" = ${displayName || null},
            "theme" = ${theme || 'default'},
            "socialLinks" = ${socialLinks ? JSON.stringify(socialLinks) : '{}'}::jsonb,
            "updatedAt" = NOW()
          WHERE "userId" = ${req.user.id};
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO "user_profile" 
          ("userId", "bio", "avatarUrl", "bannerUrl", "isPublic", "displayName", "theme", "socialLinks")
          VALUES (
            ${req.user.id},
            ${bio || null},
            ${avatarUrl || null},
            ${bannerUrl || null},
            ${isPublic === true || isPublic === 'true'},
            ${displayName || null},
            ${theme || 'default'},
            ${socialLinks ? JSON.stringify(socialLinks) : '{}'}::jsonb
          );
        `;
      }
      
      const updated = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id};
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
      return res.status(400).json({ message: 'Password richiesta' });
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
    
    await prisma.user.delete({
      where: { id: req.user.id }
    });
    
    res.json({ success: true, message: 'Account eliminato' });
    
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Errore eliminazione account' });
  }
});

// =================== FOLLOW SYSTEM ===================

// Follow/Unfollow
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
    
    try {
      // Check if already following
      const existing = await prisma.$queryRaw`
        SELECT * FROM "user_follows" 
        WHERE "followerId" = ${req.user.id} AND "followingId" = ${targetUser.id};
      `;
      
      if (existing[0]) {
        // Unfollow
        await prisma.$executeRaw`
          DELETE FROM "user_follows" 
          WHERE "followerId" = ${req.user.id} AND "followingId" = ${targetUser.id};
        `;
        res.json({ success: true, following: false });
      } else {
        // Follow
        await prisma.$executeRaw`
          INSERT INTO "user_follows" ("followerId", "followingId")
          VALUES (${req.user.id}, ${targetUser.id});
        `;
        res.json({ success: true, following: true });
      }
    } catch (e) {
      console.error('Follow operation error:', e);
      res.status(500).json({ message: 'Errore operazione follow' });
    }
    
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Errore follow' });
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
    
    const following = await prisma.$queryRaw`
      SELECT * FROM "user_follows" 
      WHERE "followerId" = ${req.user.id} AND "followingId" = ${targetUser.id};
    `;
    
    res.json({ following: !!following[0] });
    
  } catch (error) {
    console.error('Check following error:', error);
    res.status(500).json({ message: 'Errore controllo follow' });
  }
});

// =================== LIBRARY ENDPOINTS ===================

// Save library
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
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Save library error:', error);
    res.status(500).json({ message: 'Errore salvataggio libreria' });
  }
});

// Get library
app.get('/api/user/library', authenticateToken, async (req, res) => {
  try {
    const library = await prisma.user_library.findUnique({
      where: { userId: req.user.id }
    });
    
    res.json({
      reading: JSON.parse(library?.reading || '[]'),
      completed: JSON.parse(library?.completed || '[]'),
      history: JSON.parse(library?.history || '[]')
    });
    
  } catch (error) {
    console.error('Get library error:', error);
    res.status(500).json({ message: 'Errore recupero libreria' });
  }
});

// Save favorites
app.post('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const { favorites } = req.body;
    
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ message: 'Formato non valido' });
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
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Save favorites error:', error);
    res.status(500).json({ message: 'Errore salvataggio preferiti' });
  }
});

// Get favorites
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const data = await prisma.user_favorites.findUnique({ 
      where: { userId: req.user.id } 
    });
    
    res.json({ 
      favorites: JSON.parse(data?.favorites || '[]')
    });
    
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Errore recupero preferiti' });
  }
});

// Get all user data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const [favorites, progress, library] = await Promise.all([
      prisma.user_favorites.findUnique({ where: { userId: req.user.id } }),
      prisma.reading_progress.findMany({ 
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.user_library.findUnique({ where: { userId: req.user.id } })
    ]);
    
    let profile = null;
    try {
      const profileData = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id};
      `;
      profile = profileData[0] || null;
    } catch (e) {
      console.log('Profile not available');
    }
    
    res.json({ 
      favorites: JSON.parse(favorites?.favorites || '[]'),
      readingProgress: progress || [],
      reading: JSON.parse(library?.reading || '[]'),
      completed: JSON.parse(library?.completed || '[]'),
      history: JSON.parse(library?.history || '[]'),
      profile: profile || {}
    });
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore recupero dati' });
  }
});

// Save progress
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
    res.status(500).json({ message: 'Errore salvataggio progresso' });
  }
});

// Get user stats
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const [library, favorites, progress] = await Promise.all([
      prisma.user_library.findUnique({ where: { userId: req.user.id } }),
      prisma.user_favorites.findUnique({ where: { userId: req.user.id } }),
      prisma.reading_progress.count({ where: { userId: req.user.id } })
    ]);
    
    const reading = JSON.parse(library?.reading || '[]');
    const completed = JSON.parse(library?.completed || '[]');
    const favs = JSON.parse(favorites?.favorites || '[]');
    
    let profile = null;
    try {
      const profileData = await prisma.$queryRaw`
        SELECT * FROM "user_profile" WHERE "userId" = ${req.user.id};
      `;
      profile = profileData[0];
    } catch (e) {
      console.log('Profile not available');
    }
    
    res.json({
      totalManga: reading.length + completed.length,
      reading: reading.length,
      completed: completed.length,
      favorites: favs.length,
      chaptersRead: progress * 10,
      readingTime: progress * 150,
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
    version: '2.2.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint non trovato' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Errore server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
