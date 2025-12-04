#!/bin/bash

# Deploy script for FunnelSaver
# This script rebuilds and restarts services with fresh images

set -e

echo "🔨 Building services..."
docker-compose build backend frontend

echo "🚀 Deploying services..."
docker-compose up -d backend frontend

echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 Recent logs (last 20 lines):"
docker-compose logs --tail=20 backend frontend
