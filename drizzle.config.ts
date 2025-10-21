import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env file explicitly
dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/dev';

// Detect dialect from URL
const isSqlite = databaseUrl.startsWith('sqlite://');
const dialect = isSqlite ? 'sqlite' : 'postgresql';

console.log(`[Drizzle Kit] Database URL: ${databaseUrl}`);
console.log(`[Drizzle Kit] Using ${dialect} dialect`);

export default defineConfig({
  schema: isSqlite
    ? './src/infra/database/schema/*.schema.sqlite.ts'
    : './src/infra/database/schema/*.schema.ts',
  out: './src/infra/database/migrations',
  dialect,
  dbCredentials: isSqlite
    ? {
        url: databaseUrl.replace('sqlite://', ''),
      }
    : {
        url: databaseUrl,
      },
  verbose: true,
  strict: true,
});
