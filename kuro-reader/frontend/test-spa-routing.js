#!/usr/bin/env node
/**
 * Test script per verificare il routing SPA
 * Simula un server statico con le regole di redirect
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Percorso alla cartella dist (dopo il build)
const distPath = path.join(__dirname, 'dist');

// Verifica se la cartella dist esiste
if (!fs.existsSync(distPath)) {
  console.error('❌ Cartella dist non trovata. Esegui prima: npm run build');
  process.exit(1);
}

// Verifica se il file _redirects è stato copiato
const redirectsPath = path.join(distPath, '_redirects');
if (fs.existsSync(redirectsPath)) {
  console.log('✅ File _redirects trovato in dist/');
  console.log('   Contenuto:', fs.readFileSync(redirectsPath, 'utf-8').trim());
} else {
  console.warn('⚠️  File _redirects NON trovato in dist/');
}

// Middleware: Log di tutte le richieste
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Serve i file statici
app.use(express.static(distPath));

// SPA Fallback: tutte le route non trovate → index.html
app.get('*', (req, res) => {
  console.log(`🔄 Fallback SPA → index.html per: ${req.path}`);
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n🚀 Server di test avviato!');
  console.log(`\n📍 Testa questi URL nel browser:\n`);
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   http://localhost:${PORT}/home`);
  console.log(`   http://localhost:${PORT}/popular`);
  console.log(`   http://localhost:${PORT}/trending`);
  console.log(`   http://localhost:${PORT}/categories`);
  console.log(`\n   Tutti dovrebbero caricare l'app React! ✨\n`);
  console.log(`   Premi Ctrl+C per fermare il server\n`);
});

