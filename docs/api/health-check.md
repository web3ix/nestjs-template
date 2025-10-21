# Health Check API

Monitor application health and readiness.

## Health Check

Get overall application health status.

**Endpoint**: `GET /health`

**Authentication**: None (public endpoint)

**Response**: `200 OK`
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

## Health Status Values

- **ok**: All systems operational
- **error**: One or more systems down
- **shutting_down**: Application is shutting down

## Component Status

### Database

Checks database connectivity:

```json
{
  "database": {
    "status": "up"
  }
}
```

### Documentation (Development Only)

In development, also checks docs endpoint:

```json
{
  "docs": {
    "status": "up"
  }
}
```

## Error Response

**Response**: `503 Service Unavailable`
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Connection timeout"
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "Connection timeout"
    }
  }
}
```

## Kubernetes Probes

### Liveness Probe

Checks if application is alive:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Readiness Probe

Checks if application is ready to serve traffic:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Monitoring

Use health check endpoint for:
- **Load Balancer**: Health checks
- **Monitoring**: Uptime monitoring
- **Kubernetes**: Liveness and readiness probes
- **CI/CD**: Post-deployment verification

## Implementation

The health check uses `@nestjs/terminus`:

```typescript
@Get()
@HealthCheck()
async check(): Promise<HealthCheckResult> {
  return this.health.check([
    () => this.databaseHealthCheck(),
  ])
}
```

## Custom Health Indicators

Add custom health checks:

```typescript
private async redisHealthCheck(): Promise<HealthIndicatorResult> {
  const isHealthy = await this.redis.ping()
  
  return {
    redis: {
      status: isHealthy ? 'up' : 'down',
    },
  }
}
```

## Next Steps

- [Deployment](/deployment/kubernetes) - Configure health checks
- [Error Handling](/api/error-handling) - Error responses
