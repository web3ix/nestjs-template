# Authentication

The application uses JWT-based authentication with refresh tokens.

## Overview

- **Access Tokens**: Short-lived JWTs for API authentication
- **Refresh Tokens**: Long-lived tokens to obtain new access tokens
- **Session Management**: Redis-backed session storage
- **OAuth**: Google OAuth integration

## Authentication Flow

```
1. User submits credentials
2. Server validates credentials
3. Server creates session and generates tokens
4. Client stores tokens
5. Client includes access token in requests
6. Server validates token on each request
7. Client refreshes token when expired
```

## Registration

### Endpoint

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Response

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Email Verification

After registration, an email is sent with a verification link:

```
https://yourapp.com/auth/verify?token=eyJhbGciOiJIUzI1...
```

## Login

### Endpoint

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Response

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1640995200000
}
```

## Token Usage

Include the access token in the Authorization header:

```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Refresh Token

When the access token expires, use the refresh token to obtain a new one:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Google OAuth

### Endpoint

```http
POST /auth/google
Content-Type: application/json

{
  "token": "google_oauth_token_here"
}
```

### Response

Same as regular login response with tokens.

## Logout

```http
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This invalidates the session and blacklists the token.

## Protected Routes

Use the `@Public()` decorator to make routes public:

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' }
}
```

All other routes require authentication by default.

## Role-Based Access Control

Use the `@Roles()` decorator:

```typescript
@Roles(Role.ADMIN)
@Get('admin')
adminOnly() {
  return { message: 'Admin access granted' }
}
```

## Current User

Get the authenticated user in controllers:

```typescript
@Get('me')
getProfile(@CurrentUser() user: JwtPayloadType) {
  return { id: user.id, email: user.email }
}
```

## Configuration

Configure JWT in `.env`:

```env
# Access Token
JWT_SECRET=your-secret-key
JWT_EXPIRES=15m

# Refresh Token
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES=7d

# Email Verification
JWT_CONFIRM_EMAIL_SECRET=your-confirm-secret
JWT_CONFIRM_EMAIL_EXPIRES=1d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Strong Secrets**: Use long, random secrets
3. **Short Expiry**: Keep access token expiry short (15 minutes)
4. **Rotate Secrets**: Periodically rotate JWT secrets
5. **Store Securely**: Never store tokens in localStorage (use httpOnly cookies)

## Session Management

Sessions are stored in Redis with the following structure:

```
session:{sessionId} = {
  userId: string
  email: string
  roles: string[]
  createdAt: number
}
```

Sessions expire based on the refresh token expiry.

## Testing Authentication

```typescript
describe('AuthController', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123',
      })
      .expect(200)

    expect(response.body.accessToken).toBeDefined()
    expect(response.body.refreshToken).toBeDefined()
  })
})
```

## Next Steps

- [Configuration](/guide/configuration) - Configure authentication
- [API Documentation](/api/authentication) - Detailed API reference
