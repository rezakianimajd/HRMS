#!/bin/bash
# =============================================================================
# HRMS Deployment Script for Ubuntu 22.04 LTS
# Run as: sudo bash deploy.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[HRMS DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# =============================================================================
# Configuration - Modify these variables
# =============================================================================

PROJECT_DIR="/opt/hrms"
PROJECT_NAME="hrms_project"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="/var/log/hrms"
STATIC_DIR="/var/www/hrms/static"
MEDIA_DIR="/var/www/hrms/media"
FILE_STORAGE_DIR="/var/hr_data"
USER="hrms"
GROUP="www-data"
DOMAIN="hrms.company.com"  # Change to your domain
SERVER_IP="192.168.1.100"  # Change to your server IP

# =============================================================================
# 1. System Updates & Dependencies
# =============================================================================

log "Updating system packages..."
apt update && apt upgrade -y

log "Installing system dependencies..."
apt install -y python3-pip python3-venv python3-dev \
    postgresql postgresql-contrib redis-server nginx supervisor \
    build-essential libpq-dev libssl-dev libffi-dev \
    curl git htop ufw

# =============================================================================
# 2. Create System User
# =============================================================================

log "Creating system user '$USER'..."
if ! id "$USER" &>/dev/null; then
    useradd -m -s /bin/bash "$USER"
    usermod -aG "$GROUP" "$USER"
fi

# =============================================================================
# 3. Directory Structure
# =============================================================================

log "Creating directory structure..."
mkdir -p "$PROJECT_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$STATIC_DIR"
mkdir -p "$MEDIA_DIR"
mkdir -p "$FILE_STORAGE_DIR"
mkdir -p "/var/backups/hrms"

chown -R "$USER:$GROUP" "$PROJECT_DIR"
chown -R "$USER:$GROUP" "$LOG_DIR"
chown -R "$USER:$GROUP" "$STATIC_DIR"
chown -R "$USER:$GROUP" "$MEDIA_DIR"
chown -R "$USER:$GROUP" "$FILE_STORAGE_DIR"
chown -R "$USER:$GROUP" "/var/backups/hrms"

# =============================================================================
# 4. PostgreSQL Setup
# =============================================================================

log "Configuring PostgreSQL..."
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='hrms_user'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER hrms_user WITH PASSWORD 'ChangeMe123!';"
    sudo -u postgres psql -c "ALTER USER hrms_user CREATEDB;"
    sudo -u postgres psql -c "CREATE DATABASE hrms_db OWNER hrms_user;"
    log "PostgreSQL database and user created."
else
    warn "PostgreSQL user already exists, skipping."
fi

# =============================================================================
# 5. Redis Setup
# =============================================================================

log "Configuring Redis..."
sed -i 's/^bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
sed -i 's/^protected-mode yes/protected-mode yes/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server

# =============================================================================
# 6. Python Virtual Environment
# =============================================================================

log "Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

log "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r "$PROJECT_DIR/requirements.txt"
pip install gunicorn

# =============================================================================
# 7. Environment File
# =============================================================================

if [ ! -f "$PROJECT_DIR/.env" ]; then
    log "Creating .env file..."
    cat > "$PROJECT_DIR/.env" << EOF
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
DB_NAME=hrms_db
DB_USER=hrms_user
DB_PASSWORD=ChangeMe123!
DB_HOST=localhost
DB_PORT=5432
DEBUG=False
ALLOWED_HOSTS=$SERVER_IP,$DOMAIN,localhost
CORS_ALLOWED_ORIGINS=http://$SERVER_IP:3000,https://$DOMAIN
BASE_FILE_STORAGE_PATH=$FILE_STORAGE_DIR
STATIC_ROOT=$STATIC_DIR
MEDIA_ROOT=$MEDIA_DIR
REDIS_CACHE_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/2
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@$DOMAIN
ADMIN_EMAIL=admin@$DOMAIN
EOF
    chmod 600 "$PROJECT_DIR/.env"
    log ".env file created at $PROJECT_DIR/.env"
else
    warn ".env file already exists, skipping."
fi

# =============================================================================
# 8. Django Setup
# =============================================================================

log "Running Django migrations..."
cd "$PROJECT_DIR"
python manage.py migrate_schemas --shared
python manage.py migrate_schemas

log "Collecting static files..."
python manage.py collectstatic --noinput

# =============================================================================
# 9. Create Superuser (manual step - uncomment if needed)
# =============================================================================

# log "Creating superuser..."
# echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@$DOMAIN', 'Admin123!')" | python manage.py shell

# =============================================================================
# 10. Gunicorn Configuration
# =============================================================================

log "Creating Gunicorn configuration..."
cat > /etc/systemd/system/gunicorn.service << EOF
[Unit]
Description=HRMS Gunicorn daemon
After=network.target postgresql.service redis-server.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$PROJECT_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$PROJECT_DIR/.env
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

mkdir -p /run/gunicorn
chown "$USER:$GROUP" /run/gunicorn

# =============================================================================
# 11. Celery Service
# =============================================================================

log "Creating Celery Worker service..."
cat > /etc/systemd/system/celery-worker.service << EOF
[Unit]
Description=HRMS Celery Worker
After=network.target redis-server.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$PROJECT_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$PROJECT_DIR/.env
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
WorkingDirectory=$PROJECT_DIR
Environment="DJANGO_SETTINGS_MODULE=hrms_project.settings.production"
EnvironmentFile=$PROJECT_DIR/.env
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

    # Logs
    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;

    # Static files
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

    # Frontend (React) - if served from same server
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120;
    }

    # Backend API
    location /api/ {
        proxy_pass http://hrms_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://hrms_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# =============================================================================
# 13. Firewall Setup
# =============================================================================

log "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# =============================================================================
# 14. Start Services
# =============================================================================

log "Enabling and starting services..."
systemctl daemon-reload
systemctl enable gunicorn celery-worker celery-beat postgresql redis-server nginx
systemctl restart gunicorn celery-worker celery-beat

# =============================================================================
# 15. Backup Cron Job
# =============================================================================

log "Setting up backup cron job..."
cat > /etc/cron.d/hrms-backup << EOF
# Daily backup at 2:00 AM
0 2 * * * $USER $PROJECT_DIR/backup.sh >> $LOG_DIR/backup.log 2>&1
EOF

chmod +x /etc/cron.d/hrms-backup

# =============================================================================
# Complete
# =============================================================================

log "=================================================="
log "  HRMS Deployment Complete!"
log "=================================================="
log "  Next steps:"
log "  1. Edit $PROJECT_DIR/.env with production values"
log "  2. Create superuser: cd $PROJECT_DIR && source venv/bin/activate && python manage.py createsuperuser"
log "  3. Create first tenant: python manage.py create_tenant --name='Company' --code='COMP' --domain='$DOMAIN'"
log "  4. Access the app: http://$SERVER_IP"
log "  5. Check logs: journalctl -u gunicorn -f"
log "=================================================="