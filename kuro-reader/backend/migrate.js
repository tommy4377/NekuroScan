import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database migration...');
  
  try {
    // 1. Create user table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ User table created/verified');
    
    // 2. Create user_profile table (IMPORTANTE!)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_profile" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL,
        "bio" TEXT,
        "avatarUrl" TEXT,
        "bannerUrl" TEXT,
        "isPublic" BOOLEAN DEFAULT false,
        "displayName" TEXT,
        "socialLinks" JSONB DEFAULT '{}',
        "viewCount" INTEGER DEFAULT 0,
        "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    console.log('✅ User profile table created/verified');
    
    // 3. Create user_favorites table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_favorites" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL,
        "favorites" TEXT DEFAULT '[]',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    console.log('✅ User favorites table created/verified');
    
    // 4. Create user_library table (IMPORTANTE!)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_library" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER UNIQUE NOT NULL,
        "reading" TEXT DEFAULT '[]',
        "completed" TEXT DEFAULT '[]',
        "history" TEXT DEFAULT '[]',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    console.log('✅ User library table created/verified');
    
    // 5. Create reading_progress table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "reading_progress" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "mangaUrl" VARCHAR(500) NOT NULL,
        "mangaTitle" VARCHAR(500) NOT NULL,
        "chapterIndex" INTEGER NOT NULL DEFAULT 0,
        "pageIndex" INTEGER DEFAULT 0,
        "totalPages" INTEGER DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "mangaUrl"),
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `;
    console.log('✅ Reading progress table created/verified');
    
    // 6. Create user_follows table
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
    console.log('✅ User follows table created/verified');
    
    // 7. Create indexes for better performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_user_username" ON "user"("username");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_reading_progress_user" ON "reading_progress"("userId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_user_follows_follower" ON "user_follows"("followerId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_user_follows_following" ON "user_follows"("followingId");
    `;
    console.log('✅ Indexes created/verified');
    
    // 8. Remove theme column if exists (cleanup)
    try {
      await prisma.$executeRaw`
        ALTER TABLE "user_profile" 
        DROP COLUMN IF EXISTS "theme";
      `;
      console.log('✅ Removed theme column (if existed)');
    } catch (e) {
      // Column might not exist, that's ok
    }
    
    // 9. Add missing columns if they don't exist
    try {
      await prisma.$executeRaw`
        ALTER TABLE "reading_progress"
        ADD COLUMN IF NOT EXISTS "totalPages" INTEGER DEFAULT 0;
      `;
    } catch (e) {
      // Column might already exist
    }
    
    console.log('✅ Migration completed successfully!');
    
    // 10. Verify all tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📊 Database tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();