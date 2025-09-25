import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const app = express();

// Configurazione Prisma
const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL 
    } 
  },
  log: ['error', 'warn']
});

// Configurazione Web Push
webpush.setVapidDetails(
  'mailto:admin@kuroreader.com',
  process.env.VAPID_PUBLIC_KEY || 'BNOJyTgwrEwK9lJYX2c6lJZW0-4g4Tg8Qd3P5mQ8VsXGHlNxTzYzaFVjKpWsBh7k8K6vw5fXBQcrchdrJtCBwzI',
  process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY'
);

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Inizializzazione database con tutte le tabelle
async function initDatabase() {
  console.log('Checking database tables...');
  
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "avatar" TEXT,
        "bio" TEXT,
        "isPublic" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_favorites" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "favorites" TEXT NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_library" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "reading" TEXT,
        "completed" TEXT,
        "history" TEXT,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "reading_progress" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "mangaUrl" VARCHAR(500) NOT NULL,
        "mangaTitle" VARCHAR(500) NOT NULL,
        "chapterIndex" INTEGER NOT NULL,
        "pageIndex" INTEGER DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "mangaUrl")
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "notification_subscription" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "endpoint" VARCHAR(500) UNIQUE NOT NULL,
        "p256dh" VARCHAR(500) NOT NULL,
        "auth" VARCHAR(500) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "followed_manga" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "mangaUrl" VARCHAR(500) NOT NULL,
        "mangaTitle" VARCHAR(500) NOT NULL,
        "lastChapter" INTEGER DEFAULT 0,
        "source" VARCHAR(50) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "mangaUrl")
      )
    `;
    
    console.log('Database tables ready!');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDatabase();

// CORS
app.use(cors({
  origin: [
    'https://kuroreader.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
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

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        avatar: user.avatar 
      }, 
      token 
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Errore durante la registrazione' });
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
        avatar: user.avatar,
        bio: user.bio,
        isPublic: user.isPublic
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
        avatar: true,
        bio: true,
        isPublic: true,
        createdAt: true
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

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password attuale e nuova richieste' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nuova password deve essere di almeno 6 caratteri' });
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
    
    res.json({ message: 'Password aggiornata con successo' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Errore nel cambio password' });
  }
});

// Update profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, avatar, bio, isPublic } = req.body;
    
    const updateData = {};
    
    if (username) {
      const normalized = username.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: { 
          username: normalized,
          NOT: { id: req.user.id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'Username già in uso' });
      }
      updateData.username = normalized;
    }
    
    if (email) {
      const normalized = email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: { 
          email: normalized,
          NOT: { id: req.user.id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'Email già in uso' });
      }
      updateData.email = normalized;
    }
    
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        isPublic: true
      }
    });
    
    res.json({ user });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Errore aggiornamento profilo' });
  }
});

// Get public profile
app.get('/api/user/public/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        isPublic: true,
        createdAt: true
      }
    });
    
    if (!user || !user.isPublic) {
      return res.status(404).json({ message: 'Profilo non trovato' });
    }
    
    // Get user's public library
    const library = await prisma.user_library.findUnique({
      where: { userId: user.id }
    });
    
    const publicData = {
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      reading: library?.reading ? JSON.parse(library.reading).slice(0, 12) : [],
      completed: library?.completed ? JSON.parse(library.completed).slice(0, 12) : [],
      favorites: []
    };
    
    res.json(publicData);
    
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Errore recupero profilo' });
  }
});

// =================== NOTIFICATION ENDPOINTS ===================

// Subscribe to notifications
app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Subscription data mancanti' });
    }
    
    await prisma.notification_subscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      create: {
        userId: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    });
    
    res.json({ message: 'Iscrizione notifiche completata' });
    
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Errore iscrizione notifiche' });
  }
});

// Follow manga for notifications
app.post('/api/manga/follow', authenticateToken, async (req, res) => {
  try {
    const { mangaUrl, mangaTitle, source, lastChapter } = req.body;
    
    await prisma.followed_manga.upsert({
      where: {
        userId_mangaUrl: {
          userId: req.user.id,
          mangaUrl
        }
      },
      update: {
        lastChapter: lastChapter || 0
      },
      create: {
        userId: req.user.id,
        mangaUrl,
        mangaTitle,
        source,
        lastChapter: lastChapter || 0
      }
    });
    
    res.json({ message: 'Manga seguito con successo' });
    
  } catch (error) {
    console.error('Follow manga error:', error);
    res.status(500).json({ message: 'Errore nel seguire il manga' });
  }
});

// Unfollow manga
app.delete('/api/manga/follow/:mangaUrl', authenticateToken, async (req, res) => {
  try {
    const mangaUrl = decodeURIComponent(req.params.mangaUrl);
    
    await prisma.followed_manga.delete({
      where: {
        userId_mangaUrl: {
          userId: req.user.id,
          mangaUrl
        }
      }
    });
    
    res.json({ message: 'Manga non più seguito' });
    
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ message: 'Errore nel rimuovere il follow' });
  }
});

// Get followed manga
app.get('/api/manga/followed', authenticateToken, async (req, res) => {
  try {
    const followed = await prisma.followed_manga.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ followed });
    
  } catch (error) {
    console.error('Get followed error:', error);
    res.status(500).json({ message: 'Errore recupero manga seguiti' });
  }
});

// Send test notification
app.post('/api/notifications/test', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await prisma.notification_subscription.findMany({
      where: { userId: req.user.id }
    });
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'Nessuna subscription trovata' });
    }
    
    const notification = {
      title: 'KuroReader',
      body: 'Nuovo capitolo disponibile!',
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      vibrate: [200, 100, 200]
    };
    
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(notification)
        );
      } catch (error) {
        console.error('Error sending notification:', error);
        // Remove invalid subscription
        if (error.statusCode === 410) {
          await prisma.notification_subscription.delete({
            where: { id: sub.id }
          });
        }
      }
    }
    
    res.json({ message: 'Notifica di test inviata' });
    
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Errore invio notifica' });
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
    const [userFavorites, readingProgress, library, followed] = await Promise.all([
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
      prisma.followed_manga.findMany({
        where: { userId: req.user.id }
      })
    ]);
    
    res.json({ 
      favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
      readingProgress: readingProgress || [],
      reading: library ? JSON.parse(library.reading || '[]') : [],
      completed: library ? JSON.parse(library.completed || '[]') : [],
      history: library ? JSON.parse(library.history || '[]') : [],
      followed: followed || []
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
    service: 'KuroReader Auth Server'
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

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});