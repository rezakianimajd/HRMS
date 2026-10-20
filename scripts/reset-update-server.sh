#!/usr/bin/env bash
# Full application-stack reset/update for HRMS.
# IMPORTANT: This script never drops, flushes, or truncates the database.
# It backs up the database and current code, then rebuilds code/build/static
# and runs migrations in place.
set -euo pipefail

APP_DIR="${1:?APP_DIR is required}"
APP_USER="${2:?APP_USER is required}"
STATIC_DIR="${3:?STATIC_DIR is required}"
TMP_DIR="${4:?TMP_DIR is required}"
STAMP="${5:?STAMP is required}"
DO_BACKUP="${6:-1}"

HRMS_DIR="$APP_DIR/hrms_project"
PAYLOAD="$TMP_DIR/payload"
BACKUP_DIR="/var/backups/hrms"
LOG_FILE="/tmp/hrms-reset-update-$STAMP.log"
VENV="$APP_DIR/venv"
SETTINGS="hrms_project.settings.production"
SERVICES_STOPPED=0

restart_services_after_failure() {
  local exit_code=$?
  if [ "$exit_code" -ne 0 ] && [ "$SERVICES_STOPPED" = "1" ]; then
    echo "WARNING: update failed while services were stopped; attempting to restart services..." >&2
    sudo systemctl restart gunicorn 2>/dev/null || true
    sudo systemctl restart celery-worker 2>/dev/null || true
    sudo systemctl restart celery-beat 2>/dev/null || true
    sudo systemctl reload nginx 2>/dev/null || true
  fi
  return "$exit_code"
}
trap restart_services_after_failure EXIT

exec > >(tee -a "$LOG_FILE") 2>&1

echo "============================================================"
echo " HRMS reset/update started: $STAMP"
echo " DB policy: PRESERVE (no drop / flush / truncate)"
echo " App dir: $APP_DIR"
echo "============================================================"

if [ ! -d "$HRMS_DIR" ]; then
  echo "ERROR: application dir not found: $HRMS_DIR" >&2
  exit 1
fi
if [ ! -x "$VENV/bin/python" ]; then
  echo "ERROR: virtualenv python not found: $VENV/bin/python" >&2
  exit 1
fi
if [ ! -d "$PAYLOAD/hrms_project" ]; then
  echo "ERROR: payload is missing hrms_project" >&2
  exit 1
fi

# One interactive sudo prompt; the rest of the script uses the cached credential.
echo "Requesting sudo once (enter the server sudo password if asked)..."
sudo -v
sudo systemctl is-active gunicorn nginx >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 1) Backups (database + current code). Nothing is deleted from the database.
# ---------------------------------------------------------------------------
if [ "$DO_BACKUP" = "1" ]; then
  echo "--- [1/9] Backup database and current code ---"
  sudo mkdir -p "$BACKUP_DIR"
  DB_TMP="/tmp/hrms-db-$STAMP.dump"
  sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && pg_dump -F c -f '$DB_TMP' \"\$DB_NAME\""
  sudo mv "$DB_TMP" "$BACKUP_DIR/pre-reset-$STAMP.dump"
  sudo chmod 600 "$BACKUP_DIR/pre-reset-$STAMP.dump"
  echo "DB backup: $BACKUP_DIR/pre-reset-$STAMP.dump"
  sudo tar --exclude='hrms_project/.env' -czf "$BACKUP_DIR/code-$STAMP.tgz" \
    -C "$APP_DIR" hrms_project scripts frontend/build 2>/dev/null || true
  echo "Code backup: $BACKUP_DIR/code-$STAMP.tgz"
else
  echo "--- [1/9] Backup skipped (-SkipBackup) ---"
fi

# ---------------------------------------------------------------------------
# 2) Stop application workers (nginx stays up).
# ---------------------------------------------------------------------------
echo "--- [2/9] Stop application services ---"
sudo systemctl stop gunicorn 2>/dev/null || true
sudo systemctl stop celery-worker 2>/dev/null || true
sudo systemctl stop celery-beat 2>/dev/null || true
SERVICES_STOPPED=1

# ---------------------------------------------------------------------------
# 3) Replace source code, preserving .env and runtime data.
# ---------------------------------------------------------------------------
echo "--- [3/9] Replace backend source ---"
sudo cp -a "$PAYLOAD/hrms_project/." "$HRMS_DIR/"
if [ -d "$PAYLOAD/scripts" ]; then
  sudo mkdir -p "$APP_DIR/scripts"
  sudo cp -a "$PAYLOAD/scripts/." "$APP_DIR/scripts/"
fi
if [ -f "$PAYLOAD/VERSION" ]; then
  sudo cp -a "$PAYLOAD/VERSION" "$APP_DIR/VERSION"
fi
sudo chown -R "$APP_USER:$APP_USER" "$HRMS_DIR" "$APP_DIR/scripts"
sudo find "$HRMS_DIR" -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
sudo find "$HRMS_DIR" -type f -name '*.pyc' -delete 2>/dev/null || true

# ---------------------------------------------------------------------------
# 4) Validate migration files and apply them (in-place, no DB reset).
# ---------------------------------------------------------------------------
echo "--- [4/9] Check model/migration sync ---"
sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py makemigrations --check --dry-run"
echo "--- [5/9] Apply migrations (database preserved) ---"
sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py migrate_schemas --noinput"

# ---------------------------------------------------------------------------
# 5) Verify the new catalog record and migration markers.
# ---------------------------------------------------------------------------
echo "--- [6/9] Verify document-management catalog record ---"
APP_EXISTS=$(sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py shell -c \"from core.models import Application; print(Application.objects.filter(slug='documents').exists())\"" | tail -n 1 | tr -d '[:space:]')
echo "documents application exists: $APP_EXISTS"
if [ "$APP_EXISTS" != "True" ]; then
  echo "ERROR: core.0016 did not create the documents Application record." >&2
  exit 1
fi

if ! sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py showmigrations core" | grep -q '\[X\] 0016_'; then
  echo "ERROR: core migration 0016 is not applied." >&2
  exit 1
fi
echo "core.0016 applied: yes"

if ! sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py showmigrations documents" | grep -q '\[X\] 0011_'; then
  echo "ERROR: documents migration 0011 is not applied." >&2
  exit 1
fi
echo "documents.0011 applied: yes"

# ---------------------------------------------------------------------------
# 6) Rebuild static files and frontend build.
# ---------------------------------------------------------------------------
echo "--- [7/9] Collect static and replace frontend build ---"
sudo -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE='$SETTINGS' '$VENV/bin/python' manage.py collectstatic --noinput"

FRONTEND_DIR="$APP_DIR/frontend"
FRONTEND_BUILD="$TMP_DIR/frontend/build"
if [ ! -d "$FRONTEND_BUILD" ]; then
  echo "ERROR: frontend build is missing from payload." >&2
  exit 1
fi
sudo rm -rf "$FRONTEND_DIR/build.old"
if [ -d "$FRONTEND_DIR/build" ]; then
  sudo mv "$FRONTEND_DIR/build" "$FRONTEND_DIR/build.old"
fi
sudo mv "$FRONTEND_BUILD" "$FRONTEND_DIR/build"
sudo chown -R "$APP_USER:$APP_USER" "$FRONTEND_DIR/build"

sudo mkdir -p "$STATIC_DIR"
sudo rm -rf "$STATIC_DIR/js" "$STATIC_DIR/css"
sudo cp -a "$FRONTEND_DIR/build/static/." "$STATIC_DIR/"
# Keep deploy user (hradmin) able to publish future builds while nginx
# (www-data/other) can still read static assets.
STATIC_GROUP="${SUDO_USER:-hradmin}"
if ! getent group "$STATIC_GROUP" >/dev/null 2>&1; then
  STATIC_GROUP="$APP_USER"
fi
sudo chown -R "$APP_USER:$STATIC_GROUP" "$STATIC_DIR"
sudo chmod -R u=rwX,g=rwX,o=rX "$STATIC_DIR"

# ---------------------------------------------------------------------------
# 7) Restart and verify services.
# ---------------------------------------------------------------------------
echo "--- [8/9] Restart services ---"
sudo systemctl daemon-reload || true
sudo systemctl restart gunicorn
sudo systemctl restart celery-worker 2>/dev/null || true
sudo systemctl restart celery-beat 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx
SERVICES_STOPPED=0
sleep 2

echo "--- [9/9] Final verification ---"
systemctl is-active gunicorn celery-worker celery-beat nginx 2>/dev/null || true
curl -fsS http://127.0.0.1/ -o /dev/null
BUNDLE=$(grep -o 'main\.[a-z0-9]*\.js' "$FRONTEND_DIR/build/index.html" | head -1 || true)
echo "LIVE_BUNDLE=$BUNDLE"
sudo mkdir -p /var/log/hrms
sudo cp "$LOG_FILE" "/var/log/hrms/reset-update-$STAMP.log"
sudo chmod 644 "/var/log/hrms/reset-update-$STAMP.log"
echo "SERVER_LOG=/var/log/hrms/reset-update-$STAMP.log"
echo "RESET_UPDATE_OK"