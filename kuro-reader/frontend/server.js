import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache per file statici
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

// Serve i file statici dalla cartella dist
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  maxAge: 0 // Gestito da header sopra
}));

// SPA Fallback: solo per route HTML, non per file statici o API
app.get('*', (req, res) => {
  // Non fare fallback per file con estensione o percorsi speciali
  const fileExtensionPattern = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|json|xml|txt)$/;
  
  if (fileExtensionPattern.test(req.path) || 
      req.path.includes('/robots.txt') || 
      req.path.includes('/sitemap.xml') ||
      req.path.includes('/manifest')) {
    return res.status(404).send('Not Found');
  }
  
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ NeKuro Scan frontend server avviato su porta ${PORT}`);
});

