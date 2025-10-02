#!/bin/bash

# Database Backup Script for Network Engineers Toolkit
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/home/ubuntu/ne-toolkit/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="ne-toolkit-db-1"

# Load environment variables
if [ -f .env.prod ]; then
    export $(cat .env.prod | grep -v '^#' | xargs)
else
    echo "❌ Error: .env.prod file not found!"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."
echo "   Database: $DB_NAME"
echo "   Backup file: nettools_backup_$DATE.sql"

# Create database backup
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/nettools_backup_$DATE.sql"

# Compress the backup
gzip "$BACKUP_DIR/nettools_backup_$DATE.sql"

# Keep only last 7 days of backups
echo "🧹 Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "nettools_backup_*.sql.gz" -mtime +7 -delete

# Display backup information
BACKUP_SIZE=$(du -h "$BACKUP_DIR/nettools_backup_$DATE.sql.gz" | cut -f1)
echo ""
echo "✅ Database backup completed successfully!"
echo "   File: $BACKUP_DIR/nettools_backup_$DATE.sql.gz"
echo "   Size: $BACKUP_SIZE"
echo ""

# List recent backups
echo "📋 Recent backups:"
ls -lh "$BACKUP_DIR"/nettools_backup_*.sql.gz | tail -5
