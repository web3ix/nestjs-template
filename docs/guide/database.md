# Database

The application uses Drizzle ORM with support for PostgreSQL and SQLite.

## Configuration

Configure the database via environment variable:

```env
# SQLite (Development)
DATABASE_URL=sqlite://db/dev.db

# PostgreSQL (Production)
DATABASE_URL=postgres://user:password@localhost:5432/dbname
```

The ORM automatically detects the database type from the URL scheme.

## Drizzle ORM

Drizzle is a TypeScript ORM that provides:
- Type-safe queries
- SQL-like syntax
- Automatic type inference
- Migration management
- Database introspection

## Schema Definition

Schemas are defined in `src/infra/database/schema/`:

```typescript
// src/infra/database/schema/user.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

## Migrations

### Generate Migrations

After changing schemas, generate migrations:

```bash
pnpm db:generate
```

This creates a migration file in `src/infra/database/migrations/`.

### Apply Migrations

Run migrations against your database:

```bash
pnpm db:migrate
```

### Push Schema (Development Only)

For rapid prototyping, push schema directly without migrations:

```bash
pnpm db:push
```

⚠️ **Warning**: This can cause data loss. Use migrations in production.

## Repository Pattern

The application uses the Repository pattern to abstract database operations.

### Define Repository Interface

```typescript
// src/domains/user/domain/repositories/user.repository.ts
export abstract class UserRepository {
  abstract findById(id: Uuid): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract create(data: CreateUserData): Promise<User>
  abstract update(id: Uuid, data: UpdateUserData): Promise<User>
  abstract delete(id: Uuid): Promise<void>
}
```

### Implement Repository

```typescript
// src/domains/user/infrastructure/persistence/repositories/user.repository.ts
import { Injectable } from '@nestjs/common'
import { DrizzleService } from '@/infra/database/drizzle.service'
import { eq } from 'drizzle-orm'
import { users } from '@/infra/database/schema'

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: Uuid): Promise<User | null> {
    const db = this.drizzle.getDb()
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return row ? this.toDomain(row) : null
  }

  async create(data: CreateUserData): Promise<User> {
    const db = this.drizzle.getDb()
    const [row] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
      })
      .returning()

    return this.toDomain(row)
  }

  private toDomain(row: any): User {
    // Map database row to domain entity
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      isVerified: row.isVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }
}
```

## Common Queries

### Select

```typescript
// Select all
const allUsers = await db.select().from(users)

// Select with where
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isVerified, true))

// Select specific columns
const userEmails = await db
  .select({ email: users.email })
  .from(users)
```

### Insert

```typescript
// Insert one
const [user] = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    passwordHash: 'hashed_password',
  })
  .returning()

// Insert multiple
await db.insert(users).values([
  { email: 'user1@example.com', passwordHash: 'hash1' },
  { email: 'user2@example.com', passwordHash: 'hash2' },
])
```

### Update

```typescript
// Update with where
await db
  .update(users)
  .set({ isVerified: true })
  .where(eq(users.id, userId))

// Update with returning
const [updated] = await db
  .update(users)
  .set({ email: 'newemail@example.com' })
  .where(eq(users.id, userId))
  .returning()
```

### Delete

```typescript
// Delete with where
await db.delete(users).where(eq(users.id, userId))

// Delete all (be careful!)
await db.delete(users)
```

### Joins

```typescript
// Inner join
const result = await db
  .select()
  .from(users)
  .innerJoin(sessions, eq(users.id, sessions.userId))

// Left join
const result = await db
  .select()
  .from(users)
  .leftJoin(sessions, eq(users.id, sessions.userId))
```

### Transactions

```typescript
await this.drizzle.getDb().transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email, passwordHash })
    .returning()

  await tx
    .insert(sessions)
    .values({ userId: user.id, token })

  return user
})
```

## Drizzle Studio

Launch the visual database explorer:

```bash
pnpm db:studio
```

Access at `https://local.drizzle.studio` to:
- Browse tables
- Edit data
- Run queries
- View relationships

## Seeding

Populate the database with test data:

```typescript
// src/infra/database/seed.ts
import { db } from './drizzle.service'
import { users } from './schema'

async function seed() {
  await db.insert(users).values([
    {
      email: 'admin@example.com',
      passwordHash: await hashPassword('admin123'),
      isVerified: true,
    },
    {
      email: 'user@example.com',
      passwordHash: await hashPassword('user123'),
      isVerified: true,
    },
  ])
}

seed().then(() => {
  console.log('Seeding complete')
  process.exit(0)
})
```

Run the seed:

```bash
pnpm db:seed
```

## Best Practices

1. **Use repositories**: Don't query database directly from services
2. **Type safety**: Leverage TypeScript types from schema
3. **Transactions**: Use transactions for related operations
4. **Migrations**: Always use migrations in production
5. **Indexes**: Add indexes for frequently queried columns
6. **Connection pooling**: Configured automatically
7. **Error handling**: Handle database errors gracefully

## SQLite vs PostgreSQL

### SQLite (Development)

**Pros:**
- No server setup required
- Single file database
- Fast for local development
- Zero configuration

**Cons:**
- Limited concurrent writes
- No network access
- Some feature limitations

### PostgreSQL (Production)

**Pros:**
- Full ACID compliance
- Advanced features (JSON, full-text search)
- Concurrent connections
- Scalability

**Cons:**
- Requires server setup
- More complex configuration

## Database Dialects

The application automatically switches between SQLite and PostgreSQL based on the DATABASE_URL:

```typescript
// Automatic detection
const dialect = this.drizzle.getDialect() // 'sqlite' or 'postgresql'

if (dialect === 'postgresql') {
  await db.execute('SELECT 1')
} else {
  await db.all('SELECT 1')
}
```

## Troubleshooting

### Connection Errors

```bash
# Check database URL
echo $DATABASE_URL

# Test PostgreSQL connection
psql $DATABASE_URL

# Check SQLite file permissions
ls -la db/dev.db
```

### Migration Issues

```bash
# Reset migrations (development only)
rm -rf src/infra/database/migrations/*
pnpm db:generate
pnpm db:migrate
```

### Performance Issues

- Add indexes to frequently queried columns
- Use `EXPLAIN ANALYZE` to check query plans
- Monitor slow queries
- Use connection pooling

## Next Steps

- [Caching](/guide/caching) - Cache layer
- [Authentication](/guide/authentication) - User authentication
- [Project Structure](/guide/project-structure) - Repository pattern
