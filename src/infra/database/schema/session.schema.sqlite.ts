import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './user.schema.sqlite';

// Session table schema for SQLite
// Note:
// - Uses TEXT for UUID storage
// - UUIDs are client-generated (UUIDv7) - application is responsible for generation
// - Timestamps stored as INTEGER (Unix timestamp)
export const sessions = sqliteTable('sessions', {
  // Primary key - client-generated UUIDv7 stored as text
  id: text('id').primaryKey(),

  // Foreign key to users table
  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  // Session hash
  hash: text('hash').notNull(),

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

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
