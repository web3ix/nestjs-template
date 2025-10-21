# Authentication API

Complete API reference for authentication endpoints.

## Register

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**: `201 Created`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors**:
- `400 Bad Request`: Invalid email or password format
- `409 Conflict`: Email already exists

## Login

Authenticate and receive tokens.

**Endpoint**: `POST /auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**: `200 OK`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1640995200000
}
```

**Errors**:
- `400 Bad Request`: Missing or invalid fields
- `401 Unauthorized`: Invalid credentials

## Google OAuth

Authenticate using Google OAuth token.

**Endpoint**: `POST /auth/google`

**Request**:
```json
{
  "token": "google_oauth_token_here"
}
```

**Response**: `200 OK`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1640995200000
}
```

**Errors**:
- `400 Bad Request`: Invalid token
- `401 Unauthorized`: Token validation failed

## Verify Email

Verify user email address.

**Endpoint**: `POST /auth/verify`

**Request**:
```json
{
  "token": "email_verification_token"
}
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Errors**:
- `400 Bad Request`: Invalid or expired token
- `401 Unauthorized`: Token validation failed

## Refresh Token

Get new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1640995200000
}
```

**Errors**:
- `400 Bad Request`: Missing refresh token
- `401 Unauthorized`: Invalid or expired refresh token

## Logout

Invalidate current session.

**Endpoint**: `POST /auth/logout`

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Errors**:
- `401 Unauthorized`: Invalid or missing token

## Token Format

Access tokens include:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "user",
  "sessionId": "session-id",
  "iat": 1640995200,
  "exp": 1641000000
}
```

## Rate Limiting

- **Register**: 5 requests per hour per IP
- **Login**: 10 requests per hour per IP
- **Refresh**: 20 requests per hour per user

## Security Headers

All responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Next Steps

- [Authentication Guide](/guide/authentication)
- [Error Handling](/api/error-handling)
