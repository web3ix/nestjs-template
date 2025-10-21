import { hashPassword } from '@/common/utils/password.util';
import Database from 'better-sqlite3';
import 'dotenv/config';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { users } from './schema';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL || 'sqlite://db/dev.db';
  const dialect = databaseUrl.startsWith('postgres') ? 'postgresql' : 'sqlite';

  console.log(`Seeding database with ${dialect} dialect...`);

  let db: any;

  if (dialect === 'sqlite') {
    const dbPath = databaseUrl.replace('sqlite://', '');
    const sqlite = new Database(dbPath);
    db = drizzleSqlite(sqlite, { schema });
  } else {
    const pg = postgres(databaseUrl);
    db = drizzlePostgres(pg, { schema });
  }

  // Seed admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = await hashPassword('Admin123!');

  try {
    await db.insert(users).values({
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      email: adminEmail,
      passwordHash: adminPassword,
      kycStatus: 'APPROVED',
      verified: true,
      createdAt: new Date(),
      createdBy: 'seed',
      updatedAt: new Date(),
      updatedBy: 'seed',
      deletedAt: null,
    });

    console.log('✅ Admin user created:', adminEmail);
  } catch (error: any) {
    if (
      error.message?.includes('UNIQUE constraint') ||
      error.code === '23505'
    ) {
      console.log('⚠️  Admin user already exists, skipping...');
    } else {
      throw error;
    }
  }

  // Seed test user
  const testEmail = 'test@example.com';
  const testPassword = await hashPassword('Test123!');

  try {
    await db.insert(users).values({
      id: '00000000-0000-0000-0000-000000000002',
      username: 'testuser',
      email: testEmail,
      passwordHash: testPassword,
      kycStatus: 'NONE',
      verified: true,
      createdAt: new Date(),
      createdBy: 'seed',
      updatedAt: new Date(),
      updatedBy: 'seed',
      deletedAt: null,
    });

    console.log('✅ Test user created:', testEmail);
  } catch (error: any) {
    if (
      error.message?.includes('UNIQUE constraint') ||
      error.code === '23505'
    ) {
      console.log('⚠️  Test user already exists, skipping...');
    } else {
      throw error;
    }
  }

  console.log('🌱 Seeding complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
