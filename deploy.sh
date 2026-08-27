#!/bin/bash
# =============================================================================
# HRMS Deployment Script for Ubuntu 26.04 LTS
# Run as: sudo bash deploy.sh
#
# IMPORTANT: run this ONCE. It performs a full provisioning:
#   - system deps (PostgreSQL, Redis, Nginx, Node.js, Python 3)
#   - application user, directories, virtualenv
#   - database, migrations, static files
#   - frontend build
#   - gunicorn / celery systemd services + nginx vhost
#   - firewall + daily backup cron
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[HRMS DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# =============================================================================
# Configuration - CHANGE THESE VALUES
# =============================================================================

PROJECT_DIR="/opt/hrms"
DJANGO_DIR="$PROJECT_DIR/hrms_project"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="/var/log/hrms"
STATIC_DIR="/var/www/hrms/static"
MEDIA_DIR="/var/www/hrms/media"
FILE_STORAGE_DIR="/var/hr_data"
USER="hrms"
GROUP="www-data"
DOMAIN="192.168.134.111"           # <-- CHANGE to your real domain (IP if no DNS)
SERVER_IP="192.168.134.111"        # <-- CHANGE to your server IP
ADMIN_EMAIL="admin@hrms.company.com"  # <-- CHANGE for Let's Encrypt / Django ADMINS
ENABLE_SSL="false"                 # set to "true" AFTER you have a real DNS domain

# =============================================================================
# 1. System Updates & Dependencies
# =============================================================================

log "Updating system packages..."
apt update && apt upgrade -y

log "Installing system dependencies..."
apt install -y python3 python3-venv python3-dev \
    postgresql postgresql-contrib redis-server nginx \
    build-essential libpq-dev libssl-dev libffi-dev \
    curl git htop ufw rsync ca-certificates

log "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# =============================================================================
# 2. Create System User
# =============================================================================

log "Creating system user '$USER'..."
if ! id "$USER" &>/dev/null; then
    useradd -m -s /bin/bash "$USER"
fi
usermod -aG "$GROUP" "$USER"

# =============================================================================
# 3. Directory Structure
# =============================================================================

log "Creating directory structure..."
mkdir -p "$PROJECT_DIR"
mkdir -p "$DJANGO_DIR/static"
mkdir -p "$LOG_DIR"
mkdir -p "$STATIC_DIR"
mkdir -p "$MEDIA_DIR"
mkdir -p "$FILE_STORAGE_DIR"
mkdir -p "/var/backups/hrms"
mkdir -p /run/gunicorn

chown -R "$USER:$GROUP" "$PROJECT_DIR"
chown -R "$USER:$GROUP" "$LOG_DIR"
chown -R "$USER:$GROUP" "$STATIC_DIR"
chown -R "$USER:$GROUP" "$MEDIA_DIR"
chown -R "$USER:$GROUP" "$FILE_STORAGE_DIR"
chown -R "$USER:$GROUP" "/var/backups/hrms"
chown -R "$USER:$GROUP" /run/gunicorn

# =============================================================================
# 4. PostgreSQL Setup
# =============================================================================

log "Configuring PostgreSQL..."

# Generate a strong random password if DB_PASSWORD not already set in env
DB_PASSWORD="${DB_PASSWORD:-$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')}"

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$USER'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER $USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "ALTER USER $USER CREATEDB;"
    log "PostgreSQL user created."
else
    warn "PostgreSQL user '$USER' already exists. Reusing (set DB_PASSWORD in .env manually)."
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='hrms_db'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE DATABASE hrms_db OWNER $USER;"
    log "PostgreSQL database 'hrms_db' created."
else
    warn "Database 'hrms_db' already exists, skipping."
fi

# Always ensure the app user owns the database and can create tables in public,
# even when the database already existed before this script ran.
sudo -u postgres psql -c "ALTER DATABASE hrms_db OWNER TO $USER;" || warn "Could not change db owner (may already be correct)"
sudo -u postgres psql -d hrms_db -c "GRANT ALL ON SCHEMA public TO $USER;" || warn "Could not grant schema public"

# =============================================================================
# 5. Redis Setup (keep listening on localhost only)
# =============================================================================

log "Configuring Redis..."
# Make sure protected-mode is on and bind is localhost only.
grep -q '^protected-mode yes' /etc/redis/redis.conf || echo 'protected-mode yes' >> /etc/redis/redis.conf
grep -q '^bind 127.0.0.1' /etc/redis/redis.conf || echo 'bind 127.0.0.1' >> /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

# =============================================================================
# 6. Python Virtual Environment (Python 3)
# =============================================================================

log "Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

log "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r "$DJANGO_DIR/requirements.txt"

# =============================================================================
# 7. Environment File
# =============================================================================

if [ ! -f "$DJANGO_DIR/.env" ]; then
    log "Creating .env file..."
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    cat > "$DJANGO_DIR/.env" << EOF
SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
DB_NAME=hrms_db
DB_USER=$USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DEBUG=False
ALLOWED_HOSTS=$SERVER_IP,$DOMAIN,localhost
CORS_ALLOWED_ORIGINS=https://$DOMAIN
BASE_FILE_STORAGE_PATH=$FILE_STORAGE_DIR
STATIC_ROOT=$STATIC_DIR
MEDIA_ROOT=$MEDIA_DIR
REDIS_CACHE_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/2
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
    chown "$USER:$GROUP" "$DJANGO_DIR/.env"
    chmod 600 "$DJANGO_DIR/.env"
    log ".env file created at $DJANGO_DIR/.env"
else
    warn ".env file already exists, skipping."
fi

# =============================================================================
# 8. Django Setup (migrations + static)
# =============================================================================

log "Running Django migrations..."
cd "$DJANGO_DIR"
export DJANGO_SETTINGS_MODULE=hrms_project.settings.production

# Generate missing migrations first (e.g. core app model changes).
python manage.py makemigrations core || warn "makemigrations core skipped"

# No tenants exist yet on a fresh deploy, so first migrate only the
# public (shared) schema, then migrate every tenant schema.
python manage.py migrate_schemas --shared

# After a tenant is created via create_tenant, this migrates all tenants:
python manage.py migrate_schemas || warn "No tenants yet; run 'migrate_schemas' after create_tenant."

log "Collecting static files..."
python manage.py collectstatic --noinput

# =============================================================================
# 9. Frontend Build (React)
# =============================================================================

log "Building React frontend..."
cd "$PROJECT_DIR/frontend"
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund
REACT_APP_API_URL=/api npm run build

# =============================================================================
# 10. Gunicorn Configuration
# =============================================================================

log "Creating Gunicorn systemd service..."
cat > /etc/systemd/system/gunicorn.service << EOF
[Unit]
Description=HRMS Gunicorn daemon
After=network.target postgresql.service redis-server.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$DJANGO_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$DJANGO_DIR/.env
ExecStart=$VENV_DIR/bin/gunicorn \\
    --workers 4 \\
    --bind unix:/run/gunicorn/hrms.sock \\
    --timeout 120 \\
    --access-logfile $LOG_DIR/gunicorn-access.log \\
    --error-logfile $LOG_DIR/gunicorn-error.log \\
    --capture-output \\
    --log-level info \\
    hrms_project.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
ExecStop=/bin/kill -s TERM \$MAINPID
PrivateTmp=true
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# =============================================================================
# 11. Celery Services
# =============================================================================

log "Creating Celery Worker service..."
cat > /etc/systemd/system/celery-worker.service << EOF
[Unit]
Description=HRMS Celery Worker
After=network.target redis-server.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$DJANGO_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$DJANGO_DIR/.env
ExecStart=$VENV_DIR/bin/celery -A hrms_project worker \\
    --loglevel=info \\
    --concurrency=4 \\
    --logfile=$LOG_DIR/celery-worker.log
ExecStop=/bin/kill -s TERM \$MAINPID
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

log "Creating Celery Beat service..."
cat > /etc/systemd/system/celery-beat.service << EOF
[Unit]
Description=HRMS Celery Beat Scheduler
After=network.target redis-server.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$DJANGO_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$DJANGO_DIR/.env
ExecStart=$VENV_DIR/bin/celery -A hrms_project beat \\
    --loglevel=info \\
    --scheduler django_celery_beat.schedulers:DatabaseScheduler \\
    --logfile=$LOG_DIR/celery-beat.log
ExecStop=/bin/kill -s TERM \$MAINPID
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# =============================================================================
# 12. Nginx Configuration
# =============================================================================

log "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/hrms << EOF
upstream hrms_app {
    server unix:/run/gunicorn/hrms.sock fail_timeout=0;
}

server {
    listen 80;
    server_name $SERVER_IP $DOMAIN;
    client_max_body_size 50M;

    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;

    # Static files (Django collectstatic)
    location /static/ {
        alias $STATIC_DIR/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias $MEDIA_DIR/;
        expires 7d;
    }

    # Backend API + Admin
    location /api/ {
        proxy_pass http://hrms_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
    }

    location /admin/ {
        proxy_pass http://hrms_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # React app (pre-built static files)
    location / {
        root $PROJECT_DIR/frontend/build;
        index index.html;
        try_files \$uri /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# =============================================================================
# 13. HTTPS (Let's Encrypt) - only when explicitly enabled
# =============================================================================

if [ "$ENABLE_SSL" = "true" ]; then
    log "Enabling HTTPS with Let's Encrypt..."
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect || \
        warn "Certbot failed. Make sure DNS for '$DOMAIN' points to this server, then rerun."
else
    warn "SSL not enabled. Set ENABLE_SSL=true and a real DOMAIN before exposing the server."
fi

# =============================================================================
# 14. Firewall Setup
# =============================================================================

log "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# =============================================================================
# 15. Start Services
# =============================================================================

log "Enabling and starting services..."
systemctl daemon-reload
systemctl enable gunicorn celery-worker celery-beat postgresql redis-server nginx
systemctl restart gunicorn celery-worker celery-beat

# =============================================================================
# 16. Backup Cron Job
# =============================================================================

log "Setting up backup cron job..."
cat > /etc/cron.d/hrms-backup << EOF
# Daily backup at 2:00 AM
0 2 * * * $USER $PROJECT_DIR/backup.sh >> $LOG_DIR/backup.log 2>&1
EOF
chmod 0644 /etc/cron.d/hrms-backup

# =============================================================================
# Complete
# =============================================================================

log "=================================================="
log "  HRMS Deployment Complete!"
log "=================================================="
log "  Next steps:"
log "  1. Verify .env:  nano $DJANGO_DIR/.env"
log "  2. Create a tenant:"
log "     cd $DJANGO_DIR && source $VENV_DIR/bin/activate"
log "     python manage.py create_tenant --name='Your Company' --code='YOURCO' --domain='$DOMAIN'"
log "     python manage.py migrate_schemas"
log "  3. Create superuser: python manage.py createsuperuser"
log "  4. Import SQLite data (if any):"
log "     python manage.py import_tenant_data /path/to/hrms_tenant_data.json --schema=yourco --company-code=YOURCO"
log "  5. Access the app: http://$SERVER_IP"
log "  6. Enable HTTPS: edit ENABLE_SSL=true in this file and rerun (certbot step)"
log "  7. Check logs: journalctl -u gunicorn -f"
log "=================================================="