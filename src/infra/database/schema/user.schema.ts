import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// User table schema
// Note:
// - Uses TEXT for UUID storage (compatible with both PostgreSQL and SQLite)
// - UUIDs are client-generated (UUIDv7) - application is responsible for generation
// - kycStatus uses VARCHAR/TEXT instead of ENUM for easier migrations
// - Validation is enforced at application level via TypeScript enums
export const users = pgTable('users', {
  // Primary key - client-generated UUIDv7 stored as text
  id: text('id').primaryKey(),

  // User credentials
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),

  // KYC status - stored as text, validated by application
  kycStatus: text('kyc_status').notNull().default('NONE'),

  // Verification flag
  verified: boolean('verified').notNull().default(false),

  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text('updated_by').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
