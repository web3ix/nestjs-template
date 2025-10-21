# Kubernetes Deployment

Deploy the application to Kubernetes using the provided manifests.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- Docker registry access
- PostgreSQL database
- Redis instance

## Kubernetes Manifests

The `k8s/` directory contains all necessary Kubernetes resources:

```
k8s/
├── deployment.yaml      # Application deployment
├── service.yaml         # Service definition
├── configmap.yaml       # Configuration
├── secret.yaml          # Secrets (template)
└── ingress.yaml         # Ingress rules
```

## Quick Deployment

1. **Create namespace**:

```bash
kubectl create namespace nestjs-app
```

2. **Create secrets**:

```bash
kubectl create secret generic app-secrets \
  --from-literal=database-url='postgres://user:pass@host:5432/db' \
  --from-literal=jwt-secret='your-secret' \
  --from-literal=redis-url='redis://redis:6379' \
  -n nestjs-app
```

3. **Apply manifests**:

```bash
kubectl apply -f k8s/ -n nestjs-app
```

4. **Verify deployment**:

```bash
kubectl get pods -n nestjs-app
kubectl logs -f deployment/nestjs-app -n nestjs-app
```

## Configuration

### Deployment

The deployment manages application pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-app
  template:
    spec:
      containers:
      - name: nestjs-app
        image: your-registry/nestjs-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service

Expose the application:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nestjs-app
spec:
  type: ClusterIP
  selector:
    app: nestjs-app
  ports:
  - port: 80
    targetPort: 3000
```

### Ingress

Configure external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nestjs-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nestjs-app
            port:
              number: 80
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: nestjs-app-tls
```

## Environment Variables

Set via ConfigMap or Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: "production"
  HTTP_PLATFORM: "fastify"
  CACHE_DRIVER: "redis"
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  database-url: "postgres://user:pass@postgres:5432/db"
  jwt-secret: "your-jwt-secret"
  redis-url: "redis://redis:6379"
```

## Horizontal Pod Autoscaling

Scale based on CPU/memory:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nestjs-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nestjs-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Health Checks

The application exposes `/health` endpoint:

- **Liveness Probe**: Checks if application is running
- **Readiness Probe**: Checks if application is ready to serve traffic

```typescript
// Health check includes:
// - Database connection
// - Redis connection (if configured)
// - Application status
```

## Monitoring

### Prometheus Metrics

Add annotations for Prometheus scraping:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

### Logging

Logs are output to stdout in JSON format for easy collection:

```bash
# View logs
kubectl logs -f deployment/nestjs-app -n nestjs-app

# Follow logs from all pods
kubectl logs -f -l app=nestjs-app -n nestjs-app
```

## Database Migrations

Run migrations as an init container or job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: your-registry/nestjs-app:latest
        command: ["pnpm", "db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
      restartPolicy: OnFailure
```

## Rolling Updates

Update the application with zero downtime:

```bash
# Update image
kubectl set image deployment/nestjs-app \
  nestjs-app=your-registry/nestjs-app:v2 \
  -n nestjs-app

# Check rollout status
kubectl rollout status deployment/nestjs-app -n nestjs-app

# Rollback if needed
kubectl rollout undo deployment/nestjs-app -n nestjs-app
```

## Resource Management

Set appropriate resource requests and limits:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Secrets Management

Consider using external secret managers:

- **Sealed Secrets**: Encrypt secrets in Git
- **External Secrets Operator**: Sync from AWS/Azure/GCP
- **HashiCorp Vault**: Dynamic secrets

## Troubleshooting

### Pod not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n nestjs-app

# Check logs
kubectl logs <pod-name> -n nestjs-app

# Check events
kubectl get events -n nestjs-app --sort-by='.lastTimestamp'
```

### Connection issues

```bash
# Test database connection
kubectl run -it --rm debug --image=postgres:14 \
  --restart=Never -n nestjs-app -- \
  psql $DATABASE_URL

# Test Redis connection
kubectl run -it --rm debug --image=redis:7 \
  --restart=Never -n nestjs-app -- \
  redis-cli -u $REDIS_URL ping
```

### Performance issues

```bash
# Check resource usage
kubectl top pods -n nestjs-app

# Check node resources
kubectl top nodes
```

## Best Practices

1. **Use namespaces** for environment separation
2. **Set resource limits** to prevent resource exhaustion
3. **Configure health checks** for proper load balancing
4. **Use secrets** for sensitive data
5. **Enable autoscaling** for variable loads
6. **Monitor logs and metrics** continuously
7. **Test rollback procedures** regularly

## Next Steps

- [Docker](/deployment/docker) - Container setup
- [Environment Variables](/deployment/environment-variables) - Configuration reference
