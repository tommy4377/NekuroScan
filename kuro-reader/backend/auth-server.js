import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const app = express();

// Configurazione Prisma con nuovo database URL
const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL || 'postgresql://kurouser:e3daz1Qhk2CQFAHYvTtnZIFLqtHk9OCg@dpg-d35kiindiees738csc8g-a.frankfurt-postgres.render.com:5432/kurodb_h4bn' 
    } 
  },
  log: ['error', 'warn']
});

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || '2ddbc9ab6834649be0d77707901ebd1e';

// CORS configuration
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: 'Errore interno del server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
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

// =================== AUTH ENDPOINTS ===================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validazione input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono richiesti' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'La password deve essere di almeno 6 caratteri' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email non valida' });
    }
    
    // Normalizza email e username
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();
    
    // Controlla se l'utente esiste già
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crea nuovo utente
    const user = await prisma.user.create({
      data: { 
        username: normalizedUsername, 
        email: normalizedEmail, 
        password: hashedPassword 
      }
    });

    // Genera token
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
    
    // Gestione errori Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Utente già esistente' });
    }
    
    res.status(500).json({ 
      message: 'Errore durante la registrazione',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password richiesti' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Trova utente
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    // Verifica password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    // Genera token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
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
    
    res.json({ user });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore nel recupero utente' });
  }
});

// =================== USER DATA ENDPOINTS ===================

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
    const [userFavorites, readingProgress] = await Promise.all([
      prisma.user_favorites.findUnique({ 
        where: { userId: req.user.id } 
      }),
      prisma.reading_progress.findMany({ 
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' }
      })
    ]);
    
    res.json({ 
      favorites: userFavorites ? JSON.parse(userFavorites.favorites) : [],
      readingProgress: readingProgress || []
    });
    
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore nel recupero dati utente' });
  }
});

// =================== READING PROGRESS ENDPOINTS ===================

// Save/Update reading progress
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

// Get reading progress for a specific manga
app.get('/api/user/progress/:mangaUrl', authenticateToken, async (req, res) => {
  try {
    const mangaUrl = decodeURIComponent(req.params.mangaUrl);
    
    const progress = await prisma.reading_progress.findUnique({
      where: {
        userId_mangaUrl: {
          userId: req.user.id,
          mangaUrl
        }
      }
    });
    
    res.json({ progress });
    
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Errore nel recupero progresso' });
  }
});

// Get all reading progress
app.get('/api/user/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await prisma.reading_progress.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ progress });
    
  } catch (error) {
    console.error('Get all progress error:', error);
    res.status(500).json({ message: 'Errore nel recupero progressi' });
  }
});

// Delete reading progress
app.delete('/api/user/progress/:mangaUrl', authenticateToken, async (req, res) => {
  try {
    const mangaUrl = decodeURIComponent(req.params.mangaUrl);
    
    await prisma.reading_progress.delete({
      where: {
        userId_mangaUrl: {
          userId: req.user.id,
          mangaUrl
        }
      }
    });
    
    res.json({ success: true, message: 'Progresso eliminato' });
    
  } catch (error) {
    console.error('Delete progress error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Progresso non trovato' });
    }
    
    res.status(500).json({ message: 'Errore nell\'eliminazione progresso' });
  }
});

// =================== USER MANAGEMENT ===================

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username) {
      const normalizedUsername = username.toLowerCase().trim();
      
      // Check if username is already taken
      const existing = await prisma.user.findUnique({
        where: { username: normalizedUsername }
      });
      
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ message: 'Username già in uso' });
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { username: normalizedUsername },
        select: {
          id: true,
          username: true,
          email: true
        }
      });
      
      res.json({ user: updatedUser });
    } else {
      res.status(400).json({ message: 'Nessun dato da aggiornare' });
    }
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento profilo' });
  }
});

// Change password
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password vecchia e nuova richieste' });
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
    
    res.json({ success: true, message: 'Password cambiata con successo' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Errore nel cambio password' });
  }
});

// Delete account
app.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password richiesta per eliminare l\'account' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Password non corretta' });
    }
    
    // Delete all user data
    await prisma.$transaction([
      prisma.reading_progress.deleteMany({ where: { userId: req.user.id } }),
      prisma.user_favorites.deleteMany({ where: { userId: req.user.id } }),
      prisma.user.delete({ where: { id: req.user.id } })
    ]);
    
    res.json({ success: true, message: 'Account eliminato con successo' });
    
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione account' });
  }
});

// =================== HEALTH CHECK ===================

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

// =================== ERROR HANDLING ===================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint non trovato' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
