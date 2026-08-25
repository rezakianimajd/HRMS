#!/bin/bash
# =============================================================================
# HRMS Backup Script - Daily automated backup
# Usage: ./backup.sh
# Cron: 0 2 * * * /opt/hrms/backup.sh
#
# Backs up:
#   - PostgreSQL database (hrms_db) as a compressed custom-format dump
#   - /var/hr_data file storage
#   - /var/www/hrms/media uploaded files
#   - /opt/hrms/.env (so secrets can be restored too)
#
# Old backups older than RETENTION_DAYS are removed automatically.
# =============================================================================

set -u  # error on undefined variable (but don't stop on individual command failure)

# Configuration
PROJECT_DIR="/opt/hrms"
BACKUP_DIR="/var/backups/hrms"
DB_NAME="hrms_db"
DB_USER="hrms"
FILE_STORAGE_DIR="/var/hr_data"
MEDIA_DIR="/var/www/hrms/media"
ENV_FILE="$PROJECT_DIR/.env"
RETENTION_DAYS=30  # Keep backups for 30 days

# Set PGPASSWORD from .env if present (so pg_dump doesn't prompt)
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a
fi
export PGPASSWORD="${DB_PASSWORD:-}"

# Timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="hrms_backup_$DATE"
BACKUP_DIR_ABS="$BACKUP_DIR/$BACKUP_NAME"

echo "[$(date)] ========== HRMS Backup Start =========="

# Create backup working directory
mkdir -p "$BACKUP_DIR_ABS"
cd "$BACKUP_DIR" || exit 1

# =============================================================================
# 1. Database Backup (pg_dump)
# =============================================================================

echo "[$(date)] Starting database backup..."
if pg_dump -U "$DB_USER" -h localhost -d "$DB_NAME" -F c \
    -f "$BACKUP_DIR/${BACKUP_NAME}.db.dump" 2>>"$BACKUP_DIR_ABS/backup-errors.log"; then
    echo "[$(date)] Database backup completed: ${BACKUP_NAME}.db.dump"
else
    echo "[$(date)] ERROR: database backup FAILED. See backup-errors.log"
fi

# =============================================================================
# 2. File Storage Backup (/var/hr_data)
# =============================================================================

echo "[$(date)] Starting file storage backup..."
if [ -d "$FILE_STORAGE_DIR" ]; then
    mkdir -p "$BACKUP_DIR_ABS/hr_data"
    rsync -a --delete "$FILE_STORAGE_DIR/" "$BACKUP_DIR_ABS/hr_data/" 2>>"$BACKUP_DIR_ABS/backup-errors.log"
    echo "[$(date)] File storage backup completed."
else
    echo "[$(date)] WARNING: file storage dir not found: $FILE_STORAGE_DIR"
fi

# =============================================================================
# 3. Media Files Backup
# =============================================================================

echo "[$(date)] Starting media files backup..."
if [ -d "$MEDIA_DIR" ]; then
    mkdir -p "$BACKUP_DIR_ABS/media"
    rsync -a --delete "$MEDIA_DIR/" "$BACKUP_DIR_ABS/media/" 2>>"$BACKUP_DIR_ABS/backup-errors.log"
    echo "[$(date)] Media backup completed."
else
    echo "[$(date)] WARNING: media dir not found: $MEDIA_DIR"
fi

# =============================================================================
# 4. Environment File Backup
# =============================================================================

if [ -f "$ENV_FILE" ]; then
    cp -p "$ENV_FILE" "$BACKUP_DIR_ABS/env.backup"
    echo "[$(date)] .env file backed up."
fi

# =============================================================================
# 5. Archive & Compress the whole working directory
# =============================================================================

echo "[$(date)] Compressing backup..."
tar -czf "${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
TAR_STATUS=$?

if [ $TAR_STATUS -eq 0 ]; then
    echo "[$(date)] Compressed archive created: ${BACKUP_NAME}.tar.gz"
    # Only remove working dir if the archive was created successfully
    rm -rf "$BACKUP_DIR_ABS"
else
    echo "[$(date)] ERROR: compression failed. Keeping uncompressed files in $BACKUP_DIR_ABS"
fi

# =============================================================================
# 6. Cleanup Old Backups
# =============================================================================

echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name '*.db.dump' -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name '*.tar.gz' -mtime +$RETENTION_DAYS -delete

# =============================================================================
# 7. Report
# =============================================================================

BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" 2>/dev/null | cut -f1 || true)
echo "[$(date)] Backup complete! File: ${BACKUP_NAME}.tar.gz (Size: ${BACKUP_SIZE:-N/A})"
echo "[$(date)] ========== HRMS Backup End =========="

# =============================================================================
# Optional: Upload to remote storage
# =============================================================================
# Uncomment and configure one of the following:

# rsync to another server:
# rsync -a "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" user@backup-server:/path/to/remote/backups/

# rclone to cloud storage:
# rclone copy "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" gdrive:hrms-backups/