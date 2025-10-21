import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import {
  BetterSQLite3Database,
  drizzle as drizzleSqlite,
} from 'drizzle-orm/better-sqlite3';
import {
  drizzle as drizzlePostgres,
  PostgresJsDatabase,
} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

type PGliteDriver = {
  dialect: 'sqlite';
  db: BetterSQLite3Database<any>;
  client: Database.Database;
};

type PostgresDriver = {
  dialect: 'postgresql';
  db: PostgresJsDatabase<any>;
  client: postgres.Sql;
};

type Driver = PGliteDriver | PostgresDriver;

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private driver!: Driver;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('drizzle.url');
    const dialect =
      this.configService.get<'sqlite' | 'postgresql'>('drizzle.dialect') ||
      'postgresql';

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    if (dialect === 'sqlite') {
      const dbPath = databaseUrl.replace('sqlite://', '');
      this.logger.log(`Initializing Drizzle with SQLite: ${dbPath}`);

      // Dynamically import SQLite schema
      const sqliteSchema = await import('./schema/index.sqlite');

      const client = new Database(dbPath);
      const db = drizzleSqlite(client, { schema: sqliteSchema });

      this.driver = { dialect: 'sqlite', db, client };

      this.logger.log('✅ Database connected (SQLite)');
    } else {
      this.logger.log('Initializing Drizzle with PostgreSQL');

      // Dynamically import PostgreSQL schema
      const pgSchema = await import('./schema');

      const client = postgres(databaseUrl, { max: 10 });
      const db = drizzlePostgres(client, { schema: pgSchema });

      this.driver = { dialect: 'postgresql', db, client };

      this.logger.log('✅ Database connected (PostgreSQL)');
    }
  }

  async onModuleDestroy() {
    if (this.driver.dialect === 'postgresql') {
      await this.driver.client.end();
    } else {
      this.driver.client.close();
    }
    this.logger.log('Database connection closed');
  }

  getDb() {
    if (!this.driver) {
      throw new Error('Database not initialized');
    }
    return this.driver.db as any;
  }

  getDialect(): 'sqlite' | 'postgresql' {
    return this.driver.dialect;
  }
}
