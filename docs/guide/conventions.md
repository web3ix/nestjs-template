# Coding Conventions

Follow these conventions to maintain consistency across the codebase.

## TypeScript

### Strict Mode

Always use TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Type Annotations

Explicitly type function parameters and return types:

```typescript
// ✅ Good
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ❌ Bad
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

### Interfaces vs Types

- Use `interface` for object shapes
- Use `type` for unions, intersections, and primitives

```typescript
// ✅ Interface for objects
interface User {
  id: string
  email: string
}

// ✅ Type for unions
type Status = 'pending' | 'active' | 'inactive'
```

## Naming Conventions

### Files

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Modules**: `*.module.ts`
- **Entities**: `*.entity.ts`
- **DTOs**: `*.dto.ts`
- **Repositories**: `*.repository.ts`
- **Tests**: `*.spec.ts`

### Classes

Use PascalCase:

```typescript
class UserService {}
class OrderController {}
```

### Variables and Functions

Use camelCase:

```typescript
const userId = '123'
function calculateTotal() {}
```

### Constants

Use UPPER_SNAKE_CASE:

```typescript
const MAX_RETRY_ATTEMPTS = 3
const DEFAULT_PAGE_SIZE = 20
```

### Interfaces

No `I` prefix:

```typescript
// ✅ Good
interface UserRepository {}

// ❌ Bad
interface IUserRepository {}
```

## Code Organization

### Import Order

1. Framework imports
2. Third-party libraries
3. Application imports (absolute paths)
4. Relative imports

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Repository } from 'typeorm'

import { User } from '@/domains/user/domain/entities/user.entity'
import { CacheService } from '@/infra/cache/cache.service'

import { UserDto } from './dto/user.dto'
```

### Function Length

Keep functions small and focused:

```typescript
// ✅ Good - Single responsibility
async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password)
  return this.userRepository.create({ email, passwordHash })
}

// ❌ Bad - Too many responsibilities
async function createUserAndSendEmail(email: string, password: string) {
  const passwordHash = await hashPassword(password)
  const user = await this.userRepository.create({ email, passwordHash })
  await this.sendWelcomeEmail(user.email)
  await this.logUserCreation(user.id)
  await this.notifyAdmins(user)
  return user
}
```

## Dependency Injection

### Constructor Injection

Always use constructor-based DI:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}
}
```

### Provider Declaration

Use abstract classes for interfaces:

```typescript
// Repository interface
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>
}

// Module provider
{
  provide: UserRepository,
  useClass: DrizzleUserRepository,
}
```

## Error Handling

### Custom Exceptions

Create domain-specific exceptions:

```typescript
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`)
  }
}
```

### Try-Catch

Use try-catch for expected errors:

```typescript
async function findUser(id: string): Promise<User> {
  try {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }
    return user
  } catch (error) {
    this.logger.error(`Error finding user: ${error.message}`)
    throw error
  }
}
```

## DTOs and Validation

### Class Validator

Use decorators for validation:

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string
}
```

### Response DTOs

Transform responses with DTOs:

```typescript
export class UserResponseDto {
  @Expose()
  id: string

  @Expose()
  email: string

  // Password excluded by not exposing
}
```

## Testing

### Test Structure

Follow AAA pattern (Arrange, Act, Assert):

```typescript
it('should create a user', async () => {
  // Arrange
  const email = 'user@example.com'
  const password = 'password123'

  // Act
  const user = await service.createUser(email, password)

  // Assert
  expect(user.email).toBe(email)
  expect(user.id).toBeDefined()
})
```

### Test Naming

Use descriptive names:

```typescript
// ✅ Good
it('should throw error when email is invalid')
it('should return null when user not found')

// ❌ Bad
it('test1')
it('works')
```

### Mock Dependencies

Mock external dependencies:

```typescript
const mockRepository = {
  findById: jest.fn(),
  create: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})
```

## Comments

### When to Comment

Comment "why", not "what":

```typescript
// ✅ Good - Explains why
// Use exponential backoff to prevent overwhelming the API
await retry(fetchData, { attempts: 3, backoff: 'exponential' })

// ❌ Bad - States the obvious
// Call fetchData with retry
await retry(fetchData, { attempts: 3 })
```

### JSDoc

Use JSDoc for public APIs:

```typescript
/**
 * Creates a new user with the given credentials
 * @param email - User's email address
 * @param password - Plain text password (will be hashed)
 * @returns The created user entity
 * @throws {ValidationException} If email or password is invalid
 */
async createUser(email: string, password: string): Promise<User> {
  // Implementation
}
```

## Git Commits

### Conventional Commits

Follow conventional commit format:

```bash
feat: add user registration endpoint
fix: resolve database connection timeout
refactor: extract email validation logic
docs: update installation guide
test: add tests for user service
```

### Commit Message

- Use imperative mood ("add" not "added")
- Keep first line under 72 characters
- Add body if needed

```
feat: add user authentication

- Implement JWT token generation
- Add refresh token mechanism
- Update security documentation
```

## Code Style

### Line Length

Keep lines under 100 characters when possible.

### Indentation

Use 2 spaces (configured in `.editorconfig`).

### Quotes

Use single quotes:

```typescript
const message = 'Hello World'
```

### Trailing Commas

Always use trailing commas:

```typescript
const obj = {
  name: 'John',
  age: 30,
}
```

### Semicolons

No semicolons (configured in ESLint).

## Best Practices

1. **Single Responsibility**: Each class should have one reason to change
2. **DRY**: Don't Repeat Yourself
3. **KISS**: Keep It Simple, Stupid
4. **YAGNI**: You Aren't Gonna Need It
5. **Composition over Inheritance**: Favor composition

## Tools

### ESLint

Automatically fix issues:

```bash
pnpm lint
```

### Prettier

Format code:

```bash
pnpm format
```

### TypeScript Compiler

Check types:

```bash
pnpm typecheck
```

## Next Steps

- [Project Structure](/guide/project-structure)
- [Domain-Driven Design](/guide/domain-driven-design)
- [Testing](/guide/testing)
