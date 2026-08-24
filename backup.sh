#!/bin/bash
# =============================================================================
# HRMS Backup Script - Daily automated backup
# Usage: ./backup.sh
# Cron: 0 2 * * * /opt/hrms/backup.sh
# =============================================================================

set -e

# Configuration
PROJECT_DIR="/opt/hrms"
BACKUP_DIR="/var/backups/hrms"
DB_NAME="hrms_db"
DB_USER="hrms_user"
FILE_STORAGE_DIR="/var/hr_data"
RETENTION_DAYS=30  # Keep backups for 30 days

# Timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hrms_backup_$DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =============================================================================
# 1. Database Backup (pg_dump)
# =============================================================================

echo "[$(date)] Starting database backup..."
pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE.db.dump" 2>&1
echo "[$(date)] Database backup completed: $BACKUP_FILE.db.dump"

# =============================================================================
# 2. File Storage Backup (rsync)
# =============================================================================

echo "[$(date)] Starting file storage backup..."
if [ -d "$FILE_STORAGE_DIR" ]; then
    rsync -av --delete "$FILE_STORAGE_DIR/" "$BACKUP_FILE/hr_data/" 2>&1
    echo "[$(date)] File storage backup completed: $BACKUP_FILE/hr_data/"
else
    echo "[$(date)] WARNING: File storage directory not found at $FILE_STORAGE_DIR"
fi

# =============================================================================
# 3. Media Files Backup
# =============================================================================

MEDIA_DIR="/var/www/hrms/media"
if [ -d "$MEDIA_DIR" ]; then
    echo "[$(date)] Starting media files backup..."
    rsync -av --delete "$MEDIA_DIR/" "$BACKUP_FILE/media/" 2>&1
    echo "[$(date)] Media backup completed: $BACKUP_FILE/media/"
fi

# =============================================================================
# 4. Archive & Compress
# =============================================================================

echo "[$(date)] Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "hrms_backup_$DATE" 2>/dev/null || true
rm -rf "$BACKUP_FILE" 2>/dev/null || true  # Remove uncompressed directory

# =============================================================================
# 5. Cleanup Old Backups
# =============================================================================

echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.db.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# =============================================================================
# 6. Report
# =============================================================================

BACKUP_SIZE=$(du -sh "$BACKUP_FILE.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")
echo "[$(date)] Backup complete! File: $BACKUP_FILE.tar.gz (Size: $BACKUP_SIZE)"
echo "=================================================="

# Optional: Upload to remote storage (uncomment and configure)
# rsync -av "$BACKUP_FILE.tar.gz" user@backup-server:/path/to/remote/backups/
# Or using rclone for cloud storage:
# rclone copy "$BACKUP_FILE.tar.gz" gdrive:hrms-backups/