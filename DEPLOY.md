# FunnelSaver Deployment Guide

## Quick Deploy

After making changes and pushing to git, run:

```bash
./deploy.sh
```

This will:
1. Build new Docker images for backend and frontend
2. Deploy updated containers
3. Show container status and recent logs

## Manual Deployment

If you prefer to deploy manually:

```bash
# Build images
docker-compose build backend frontend

# Deploy (this will automatically use new images)
docker-compose up -d backend frontend

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend frontend
```

## Important Notes

### ⚠️ Always use `docker-compose up -d` instead of `restart`

- ❌ `docker-compose restart` - reuses old images
- ✅ `docker-compose up -d` - uses fresh images

### Browser Cache

After deploying frontend changes, users need to hard refresh:
- Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Firefox: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
- Safari: `Cmd + Option + R` (Mac)

### Verify Deployment

Check that containers are using the latest images:

```bash
# Check image creation time
docker images funnelsaver-frontend --format "{{.ID}} {{.CreatedAt}}"
docker images funnelsaver-backend --format "{{.ID}} {{.CreatedAt}}"

# Check container image
docker ps --filter name=frontend --format "{{.ID}} {{.Image}}"
docker ps --filter name=backend --format "{{.ID}} {{.Image}}"
```

The image IDs should match!

## Troubleshooting

### Frontend not updating

If frontend changes don't appear:

```bash
# Force recreate frontend
docker-compose up -d --force-recreate frontend

# Clear browser cache
# Then hard refresh (Ctrl+Shift+R)
```

### Backend not updating

```bash
# Force recreate backend and celery
docker-compose up -d --force-recreate backend celery_worker
```

### View real-time logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

## Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend

# View service status
docker-compose ps

# Execute command in container
docker-compose exec backend python recover_projects.py
docker-compose exec backend bash
```

## Database Management

```bash
# Access SQLite database
docker-compose exec backend sqlite3 database/funnelsaver.db

# Backup database
docker-compose exec backend sqlite3 database/funnelsaver.db ".backup database/backup.db"

# Run recovery script
docker-compose exec backend python recover_projects.py
```

## Cleanup

```bash
# Remove stopped containers
docker-compose down

# Remove images
docker rmi funnelsaver-frontend funnelsaver-backend

# Remove volumes (⚠️ deletes data!)
docker-compose down -v

# Full cleanup
docker system prune -a
```
