import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://kurouser:yaqStGpnFlsx8p1ygvUWpsL0E3g0eXiZ@dpg-d34ufnp5pdvs73b9u0qg-a/kurodb' } }
});
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: [
    'https://kuro-reader.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = '2ddbc9ab6834649be0d77707901ebd1e';

// Middleware per verificare il token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existingUser) return res.status(400).json({ message: 'Utente già esistente' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenziali non valide' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Credenziali non valide' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Save user favorites
app.post('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const { favorites } = req.body;
    await prisma.userFavorites.upsert({
      where: { userId: req.user.id },
      update: { favorites: JSON.stringify(favorites) },
      create: { userId: req.user.id, favorites: JSON.stringify(favorites) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Save favorites error:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// Get user data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const userData = await prisma.userFavorites.findUnique({ where: { userId: req.user.id } });
    res.json({ favorites: userData ? JSON.parse(userData.favorites) : [] });
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
