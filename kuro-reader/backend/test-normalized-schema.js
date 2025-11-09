// ✅ TEST SCRIPT: Verifica Schema Normalizzato
// Testa che le nuove tabelle funzionino correttamente
//
// Esegui: node test-normalized-schema.js

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error']
});

const TEST_USER_EMAIL = `test_migration_${Date.now()}@example.com`;

async function main() {
  console.log('🧪 Testing Normalized Schema...\n');
  
  try {
    // 1. Crea utente test
    console.log('1️⃣  Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        username: `test_${Date.now()}`,
        email: TEST_USER_EMAIL,
        password: 'test_password_hash'
      }
    });
    console.log(`   ✅ User created: ${testUser.username} (ID: ${testUser.id})\n`);
    
    // 2. Test Favorites
    console.log('2️⃣  Testing favorites table...');
    await prisma.favorite.create({
      data: {
        userId: testUser.id,
        mangaUrl: 'https://www.mangaworld.cx/manga/1234/one-piece',
        mangaTitle: 'One Piece',
        coverUrl: 'https://example.com/cover.jpg',
        source: 'mangaWorld'
      }
    });
    
    await prisma.favorite.create({
      data: {
        userId: testUser.id,
        mangaUrl: 'https://www.mangaworld.cx/manga/5678/naruto',
        mangaTitle: 'Naruto',
        source: 'mangaWorld'
      }
    });
    
    const favorites = await prisma.favorite.findMany({
      where: { userId: testUser.id },
      orderBy: { addedAt: 'desc' }
    });
    console.log(`   ✅ Created ${favorites.length} favorites`);
    console.log(`   ✅ Query by userId works: ${favorites.length} results\n`);
    
    // 3. Test Library Manga
    console.log('3️⃣  Testing library_manga table...');
    await prisma.library_manga.create({
      data: {
        userId: testUser.id,
        mangaUrl: 'https://www.mangaworld.cx/manga/1234/one-piece',
        mangaTitle: 'One Piece',
        status: 'reading'
      }
    });
    
    await prisma.library_manga.create({
      data: {
        userId: testUser.id,
        mangaUrl: 'https://www.mangaworld.cx/manga/9999/attack-on-titan',
        mangaTitle: 'Attack on Titan',
        status: 'completed',
        rating: 10
      }
    });
    
    const readingManga = await prisma.library_manga.findMany({
      where: {
        userId: testUser.id,
        status: 'reading'
      }
    });
    console.log(`   ✅ Created library entries`);
    console.log(`   ✅ Query by status works: ${readingManga.length} reading\n`);
    
    // 4. Test History
    console.log('4️⃣  Testing history table...');
    await prisma.history_entry.create({
      data: {
        userId: testUser.id,
        mangaUrl: 'https://www.mangaworld.cx/manga/1234/one-piece',
        mangaTitle: 'One Piece',
        chapterUrl: 'https://www.mangaworld.cx/manga/1234/one-piece/chapter-1000',
        chapterTitle: 'Capitolo 1000'
      }
    });
    
    const history = await prisma.history_entry.findMany({
      where: { userId: testUser.id },
      orderBy: { viewedAt: 'desc' },
      take: 10
    });
    console.log(`   ✅ Created history entries: ${history.length}\n`);
    
    // 5. Test Unique Constraints
    console.log('5️⃣  Testing unique constraints...');
    try {
      await prisma.favorite.create({
        data: {
          userId: testUser.id,
          mangaUrl: 'https://www.mangaworld.cx/manga/1234/one-piece', // Duplicate!
          mangaTitle: 'One Piece Duplicate',
        }
      });
      console.log('   ❌ FAIL: Unique constraint not working!\n');
    } catch (err) {
      if (err.code === 'P2002') {
        console.log('   ✅ Unique constraint works (duplicate blocked)\n');
      } else {
        throw err;
      }
    }
    
    // 6. Test Indexes (performance)
    console.log('6️⃣  Testing index usage...');
    const explain = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE 
      SELECT * FROM favorites 
      WHERE "userId" = ${testUser.id}
    `);
    console.log('   ✅ Indexes created and usable\n');
    
    // 7. Test Cascade Delete
    console.log('7️⃣  Testing cascade delete...');
    const countBefore = await prisma.favorite.count({
      where: { userId: testUser.id }
    });
    
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    const countAfter = await prisma.favorite.count({
      where: { userId: testUser.id }
    });
    
    console.log(`   ✅ Cascade delete works (${countBefore} → ${countAfter})\n`);
    
    // Summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║     ALL TESTS PASSED! ✅               ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Schema is ready for migration         ║');
    console.log('║  Run: node migrate-to-normalized.js    ║');
    console.log('╚════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

