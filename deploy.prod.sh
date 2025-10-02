#!/bin/bash

# Network Engineers Toolkit - Production Deployment Script
# This script deploys the application to production environment

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please create .env.prod from .env.prod.example and configure your production settings."
    exit 1
fi

# Load environment variables
echo "📋 Loading production environment variables..."
export $(cat .env.prod | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("DB_USER" "DB_PASSWORD" "DB_NAME" "ENCRYPTION_KEY" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set!"
        exit 1
    fi
done

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    exit 1
fi

# Pull latest changes (if in git repository)
if [ -d .git ]; then
    echo "📥 Pulling latest changes from git..."
    git pull origin main
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs ssl backups

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if database is ready
echo "🔍 Checking database connection..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Database failed to start within expected time!"
    exit 1
fi

# Check if backend is ready
echo "🔍 Checking backend service..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend service is ready!"
        break
    fi
    echo "⏳ Waiting for backend service... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Backend service failed to start within expected time!"
    exit 1
fi

# Setup admin user (only if no admin exists)
echo "👤 Setting up admin user..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run setup:admin

# Display deployment status
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: https://your-domain.com"
echo "   API: https://your-domain.com/api"
echo "   Health Check: https://your-domain.com/health"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Set up SSL certificates using setup_ssl.sh"
echo "   3. Configure monitoring and backups"
echo "   4. Change the admin password after first login"
echo ""
echo "⚠️  Important: Save the admin credentials displayed above securely!"
