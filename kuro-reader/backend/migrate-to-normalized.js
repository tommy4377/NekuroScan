// ✅ MIGRATION SCRIPT: JSON -> Normalized Tables
// Migra i dati da user_favorites e user_library (JSON) alle nuove tabelle normalizzate
// 
// Esegui: node migrate-to-normalized.js
//
// IMPORTANTE: Questo script è IDEMPOTENT (può essere eseguito più volte in sicurezza)

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn']
});

// ========= HELPER FUNCTIONS =========

function parseSafeJSON(str, fallback = []) {
  try {
    return JSON.parse(str || '[]');
  } catch (err) {
    console.warn('⚠️  Failed to parse JSON:', err.message);
    return fallback;
  }
}

function extractMangaInfo(manga) {
  // Supporta sia oggetti che stringhe (URL)
  if (typeof manga === 'string') {
    return {
      url: manga,
      title: manga.split('/').pop() || 'Unknown',
      cover: null,
      source: null
    };
  }
  
  return {
    url: manga.url || manga.mangaUrl || '',
    title: manga.title || manga.mangaTitle || 'Unknown',
    cover: manga.cover || manga.coverUrl || null,
    source: manga.source || null
  };
}

// ========= MIGRATION FUNCTIONS =========

async function migrateFavorites(user) {
  try {
    const oldFavorites = await prisma.user_favorites.findUnique({
      where: { userId: user.id }
    });
    
    if (!oldFavorites || !oldFavorites.favorites) {
      console.log(`  ℹ️  No favorites found for user ${user.username}`);
      return 0;
    }
    
    const favoritesArray = parseSafeJSON(oldFavorites.favorites, []);
    
    if (favoritesArray.length === 0) {
      console.log(`  ℹ️  Empty favorites for user ${user.username}`);
      return 0;
    }
    
    let migrated = 0;
    
    for (const manga of favoritesArray) {
      const info = extractMangaInfo(manga);
      
      if (!info.url) {
        console.warn(`  ⚠️  Skipping favorite with no URL for user ${user.username}`);
        continue;
      }
      
      try {
        await prisma.favorite.upsert({
          where: {
            userId_mangaUrl: {
              userId: user.id,
              mangaUrl: info.url
            }
          },
          create: {
            userId: user.id,
            mangaUrl: info.url,
            mangaTitle: info.title,
            coverUrl: info.cover,
            source: info.source
          },
          update: {
            mangaTitle: info.title,
            coverUrl: info.cover,
            source: info.source
          }
        });
        migrated++;
      } catch (err) {
        console.error(`  ❌ Error migrating favorite for user ${user.username}:`, err.message);
      }
    }
    
    console.log(`  ✅ Migrated ${migrated} favorites for user ${user.username}`);
    return migrated;
    
  } catch (error) {
    console.error(`❌ Error in migrateFavorites for user ${user.username}:`, error);
    return 0;
  }
}

async function migrateLibrary(user) {
  try {
    const oldLibrary = await prisma.user_library.findUnique({
      where: { userId: user.id }
    });
    
    if (!oldLibrary) {
      console.log(`  ℹ️  No library found for user ${user.username}`);
      return 0;
    }
    
    let migrated = 0;
    
    // Migrate READING
    const reading = parseSafeJSON(oldLibrary.reading, []);
    for (const manga of reading) {
      const info = extractMangaInfo(manga);
      if (info.url) {
        try {
          await prisma.library_manga.upsert({
            where: {
              userId_mangaUrl: {
                userId: user.id,
                mangaUrl: info.url
              }
            },
            create: {
              userId: user.id,
              mangaUrl: info.url,
              mangaTitle: info.title,
              coverUrl: info.cover,
              source: info.source,
              status: 'reading'
            },
            update: {
              status: 'reading',
              mangaTitle: info.title,
              coverUrl: info.cover
            }
          });
          migrated++;
        } catch (err) {
          console.error(`  ❌ Error migrating reading entry:`, err.message);
        }
      }
    }
    
    // Migrate COMPLETED
    const completed = parseSafeJSON(oldLibrary.completed, []);
    for (const manga of completed) {
      const info = extractMangaInfo(manga);
      if (info.url) {
        try {
          await prisma.library_manga.upsert({
            where: {
              userId_mangaUrl: {
                userId: user.id,
                mangaUrl: info.url
              }
            },
            create: {
              userId: user.id,
              mangaUrl: info.url,
              mangaTitle: info.title,
              coverUrl: info.cover,
              source: info.source,
              status: 'completed'
            },
            update: {
              status: 'completed',
              mangaTitle: info.title,
              coverUrl: info.cover
            }
          });
          migrated++;
        } catch (err) {
          console.error(`  ❌ Error migrating completed entry:`, err.message);
        }
      }
    }
    
    // Migrate DROPPED
    const dropped = parseSafeJSON(oldLibrary.dropped, []);
    for (const manga of dropped) {
      const info = extractMangaInfo(manga);
      if (info.url) {
        try {
          await prisma.library_manga.upsert({
            where: {
              userId_mangaUrl: {
                userId: user.id,
                mangaUrl: info.url
              }
            },
            create: {
              userId: user.id,
              mangaUrl: info.url,
              mangaTitle: info.title,
              coverUrl: info.cover,
              source: info.source,
              status: 'dropped'
            },
            update: {
              status: 'dropped',
              mangaTitle: info.title,
              coverUrl: info.cover
            }
          });
          migrated++;
        } catch (err) {
          console.error(`  ❌ Error migrating dropped entry:`, err.message);
        }
      }
    }
    
    console.log(`  ✅ Migrated ${migrated} library entries for user ${user.username}`);
    return migrated;
    
  } catch (error) {
    console.error(`❌ Error in migrateLibrary for user ${user.username}:`, error);
    return 0;
  }
}

async function migrateHistory(user) {
  try {
    const oldLibrary = await prisma.user_library.findUnique({
      where: { userId: user.id }
    });
    
    if (!oldLibrary || !oldLibrary.history) {
      console.log(`  ℹ️  No history found for user ${user.username}`);
      return 0;
    }
    
    const historyArray = parseSafeJSON(oldLibrary.history, []);
    
    if (historyArray.length === 0) {
      return 0;
    }
    
    let migrated = 0;
    
    // Limita cronologia agli ultimi 1000 elementi per performance
    const recentHistory = historyArray.slice(-1000);
    
    for (const entry of recentHistory) {
      const info = extractMangaInfo(entry);
      
      if (!info.url) continue;
      
      try {
        await prisma.history_entry.create({
          data: {
            userId: user.id,
            mangaUrl: info.url,
            mangaTitle: info.title,
            chapterUrl: entry.chapterUrl || null,
            chapterTitle: entry.chapterTitle || null,
            viewedAt: entry.viewedAt ? new Date(entry.viewedAt) : new Date()
          }
        });
        migrated++;
      } catch (err) {
        // Ignora duplicati (se già migrato)
        if (!err.message.includes('Unique constraint')) {
          console.error(`  ❌ Error migrating history entry:`, err.message);
        }
      }
    }
    
    console.log(`  ✅ Migrated ${migrated} history entries for user ${user.username}`);
    return migrated;
    
  } catch (error) {
    console.error(`❌ Error in migrateHistory for user ${user.username}:`, error);
    return 0;
  }
}

// ========= MAIN MIGRATION =========

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     MIGRATION: JSON → Normalized Tables                   ║
║     Database Normalization for Better Performance          ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  try {
    // Test connessione database
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');
    
    // Verifica che le nuove tabelle esistano
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM favorites`;
      await prisma.$queryRaw`SELECT COUNT(*) FROM library_manga`;
      await prisma.$queryRaw`SELECT COUNT(*) FROM history`;
      console.log('✅ New tables exist\n');
    } catch (err) {
      console.error('❌ New tables not found! Run migration first:');
      console.error('   npx prisma db push\n');
      process.exit(1);
    }
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true
      }
    });
    
    if (users.length === 0) {
      console.log('ℹ️  No users found in database');
      return;
    }
    
    console.log(`📊 Found ${users.length} users to migrate\n`);
    
    let totalFavorites = 0;
    let totalLibrary = 0;
    let totalHistory = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.username} (ID: ${user.id})`);
      
      const f = await migrateFavorites(user);
      const l = await migrateLibrary(user);
      const h = await migrateHistory(user);
      
      totalFavorites += f;
      totalLibrary += l;
      totalHistory += h;
    }
    
    console.log(`
    
╔════════════════════════════════════════════════════════════╗
║                  MIGRATION COMPLETED! ✅                   ║
╠════════════════════════════════════════════════════════════╣
║  Total Favorites Migrated:  ${String(totalFavorites).padStart(4)}                        ║
║  Total Library Entries:     ${String(totalLibrary).padStart(4)}                        ║
║  Total History Entries:     ${String(totalHistory).padStart(4)}                        ║
╚════════════════════════════════════════════════════════════╝

⚠️  NEXT STEPS:
1. Test the application with new normalized tables
2. Verify all data is correctly migrated
3. Update backend code to use new tables
4. After verification, drop old tables:
   - DROP TABLE user_favorites;
   - DROP TABLE user_library;
    `);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

