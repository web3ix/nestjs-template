import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// Session table schema
// Note:
// - Uses TEXT for UUID storage (compatible with both PostgreSQL and SQLite)
// - UUIDs are client-generated (UUIDv7) - application is responsible for generation
export const sessions = pgTable('sessions', {
  // Primary key - client-generated UUIDv7 stored as text
  id: text('id').primaryKey(),

  // Foreign key to users table
  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  // Session hash
  hash: text('hash').notNull(),

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

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
