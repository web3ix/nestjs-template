# Error Handling

How the API handles and reports errors.

## Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    }
  ]
}
```

## HTTP Status Codes

### 2xx Success

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully

### 4xx Client Errors

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource conflict (e.g., email already exists)
- `422 Unprocessable Entity`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded

### 5xx Server Errors

- `500 Internal Server Error`: Unexpected server error
- `503 Service Unavailable`: Service temporarily unavailable

## Validation Errors

**Status**: `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email address",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## Authentication Errors

### Missing Token

**Status**: `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Invalid Token

**Status**: `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### Insufficient Permissions

**Status**: `403 Forbidden`

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

## Business Logic Errors

### Resource Not Found

**Status**: `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "User with ID 123 not found",
  "error": "Not Found"
}
```

### Conflict

**Status**: `409 Conflict`

```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict",
  "code": "E001"
}
```

## Rate Limiting

**Status**: `429 Too Many Requests`

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

**Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
```

## Server Errors

**Status**: `500 Internal Server Error`

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**Note**: Detailed error information is logged server-side but not exposed to clients in production.

## Error Codes

Custom error codes for business logic errors:

| Code | Description |
|------|-------------|
| E001 | Email already exists |
| E002 | Invalid verification token |
| E003 | Session expired |
| E004 | Insufficient funds |
| E005 | Invalid order status |

## Handling Errors

### Client-Side

```typescript
try {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('API Error:', error)
    
    if (error.statusCode === 401) {
      // Redirect to login
    } else if (error.statusCode === 400) {
      // Show validation errors
    }
  }

  return await response.json()
} catch (error) {
  console.error('Network error:', error)
}
```

### Server-Side

Custom exceptions:

```typescript
export class ValidationException extends BadRequestException {
  constructor(errorCode: string) {
    super({
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      code: errorCode,
    })
  }
}

throw new ValidationException('E001')
```

## Global Exception Filter

All exceptions are caught and formatted by the global exception filter:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse()
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error'

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...message,
    })
  }
}
```

## Best Practices

1. **Use appropriate status codes**: Match HTTP semantics
2. **Provide clear messages**: Help clients understand errors
3. **Don't leak sensitive data**: Hide internal details in production
4. **Log errors**: Log all errors server-side
5. **Use error codes**: For programmatic error handling
6. **Be consistent**: Use same error format everywhere

## Debugging

### Development Mode

In development, errors include stack traces:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Error",
  "stack": "Error: Something went wrong\n    at ..."
}
```

### Production Mode

Stack traces are hidden in production.

## Next Steps

- [Authentication API](/api/authentication)
- [Health Check API](/api/health-check)
