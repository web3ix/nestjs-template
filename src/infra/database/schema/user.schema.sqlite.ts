import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// User table schema for SQLite
// Note:
// - Uses TEXT for UUID storage
// - UUIDs are client-generated (UUIDv7) - application is responsible for generation
// - kycStatus uses TEXT instead of ENUM
// - Timestamps stored as INTEGER (Unix timestamp)
export const users = sqliteTable('users', {
  // Primary key - client-generated UUIDv7 stored as text
  id: text('id').primaryKey(),

  // User credentials
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),

  // KYC status - stored as text, validated by application
  kycStatus: text('kyc_status').notNull().default('NONE'),

  // Verification flag
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),

  // Audit fields - stored as Unix timestamps (milliseconds)
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: text('created_by').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedBy: text('updated_by').notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
