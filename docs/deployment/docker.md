# Docker Deployment

Deploy the application using Docker and Docker Compose.

## Prerequisites

- Docker (v24.x or higher)
- Docker Compose (v2.x or higher)

## Quick Start

```bash
# Using Docker Compose
docker-compose up -d
```

## Dockerfile

Multi-stage build for optimized images:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Build Image

```bash
# Build image
docker build -t nestjs-app:latest .

# Build with specific tag
docker build -t nestjs-app:1.0.0 .

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t nestjs-app:latest .
```

## Run Container

```bash
# Run with environment variables
docker run -d \
  --name nestjs-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  -e REDIS_URL=redis://redis:6379 \
  nestjs-app:latest

# Run with env file
docker run -d \
  --name nestjs-app \
  -p 3000:3000 \
  --env-file .env.production \
  nestjs-app:latest
```

## Docker Compose

### Development

```yaml
# docker-compose.local.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=sqlite://db/dev.db
      - CACHE_DRIVER=memory
    volumes:
      - ./src:/app/src
      - ./db:/app/db
    command: npm run start:dev
```

### Production

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: nestjs-app:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/app
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Environment Variables

```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=postgres://postgres:password@db:5432/app
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret-here
CACHE_DRIVER=redis
EOF
```

## Database Migrations

Run migrations in container:

```bash
# Using docker exec
docker exec nestjs-app npm run db:migrate

# Using docker-compose
docker-compose exec app npm run db:migrate

# As init container (Kubernetes)
kubectl run db-migrate \
  --image=nestjs-app:latest \
  --restart=Never \
  --command -- npm run db:migrate
```

## Health Checks

Add health check to Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

Or in docker-compose:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
```

## Volume Mounts

### Database

```yaml
volumes:
  - ./db:/app/db  # SQLite database
  - postgres_data:/var/lib/postgresql/data  # PostgreSQL
```

### Logs

```yaml
volumes:
  - ./logs:/app/logs
```

## Multi-Stage Optimization

```dockerfile
# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Docker Best Practices

1. **Use Alpine**: Smaller image size
2. **Multi-stage builds**: Optimize image layers
3. **Non-root user**: Run as non-root for security
4. **Health checks**: Enable container health monitoring
5. **.dockerignore**: Exclude unnecessary files
6. **Cache layers**: Order Dockerfile for better caching

## .dockerignore

```
node_modules
dist
.git
.env
.env.*
*.md
.vscode
.idea
coverage
.DS_Store
npm-debug.log
```

## Logging

View logs:

```bash
# Docker logs
docker logs -f nestjs-app

# Docker Compose logs
docker-compose logs -f app

# Last 100 lines
docker logs --tail 100 nestjs-app
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs nestjs-app

# Interactive shell
docker run -it nestjs-app:latest sh

# Override command
docker run -it nestjs-app:latest sh -c "npm run start:debug"
```

### Database connection issues

```bash
# Check network
docker network ls
docker network inspect bridge

# Test connection
docker exec nestjs-app wget -qO- http://db:5432
```

## Registry

### Push to Docker Hub

```bash
docker tag nestjs-app:latest username/nestjs-app:latest
docker push username/nestjs-app:latest
```

### Push to Private Registry

```bash
docker tag nestjs-app:latest registry.example.com/nestjs-app:latest
docker push registry.example.com/nestjs-app:latest
```

## Next Steps

- [Kubernetes](/deployment/kubernetes) - Deploy to Kubernetes
- [Environment Variables](/deployment/environment-variables) - Configuration reference
