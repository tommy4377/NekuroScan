import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function repairUserData() {
  console.log('🔧 Starting data repair...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\nChecking user: ${user.username}`);
      
      // 1. Ensure profile exists
      let profile = await prisma.user_profile.findUnique({
        where: { userId: user.id }
      });
      
      if (!profile) {
        console.log(`  Creating missing profile...`);
        profile = await prisma.user_profile.create({
          data: {
            userId: user.id,
            displayName: user.username,
            bio: '',
            avatarUrl: '',
            bannerUrl: '',
            isPublic: false,
            socialLinks: {},
            viewCount: 0,
            badges: []
          }
        });
        console.log(`  ✅ Profile created`);
      } else {
        // Ensure displayName is set
        if (!profile.displayName) {
          await prisma.user_profile.update({
            where: { userId: user.id },
            data: { displayName: user.username }
          });
          console.log(`  ✅ DisplayName fixed`);
        }
      }
      
      // 2. Ensure favorites exists
      const favorites = await prisma.user_favorites.findUnique({
        where: { userId: user.id }
      });
      
      if (!favorites) {
        console.log(`  Creating missing favorites...`);
        await prisma.user_favorites.create({
          data: {
            userId: user.id,
            favorites: '[]'
          }
        });
        console.log(`  ✅ Favorites created`);
      }
      
      // 3. Ensure library exists
      const library = await prisma.user_library.findUnique({
        where: { userId: user.id }
      });
      
      if (!library) {
        console.log(`  Creating missing library...`);
        await prisma.user_library.create({
          data: {
            userId: user.id,
            reading: '[]',
            completed: '[]',
            history: '[]'
          }
        });
        console.log(`  ✅ Library created`);
      }
    }
    
    console.log('\n✅ Data repair completed!');
    
  } catch (error) {
    console.error('❌ Repair failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairUserData();