#!/bin/bash
# =============================================================================
# Kian ERP — install the privileged updater (systemd path + oneshot service)
#
# Usage:  sudo bash scripts/install_updater_units.sh [/opt/hrms]
#
# After this, dropping `<APP_DIR>/updates/queue/request.json` is enough to run
# the updater as root — the web application never needs sudo.
# =============================================================================
set -euo pipefail

APP_DIR="${1:-/opt/hrms}"
APP_USER="${KIAN_APP_USER:-hrms}"
LOG_DIR="/var/log/hrms"

echo "[1/4] creating directories"
mkdir -p "$APP_DIR/updates/queue" "$APP_DIR/updates/staging" \
         "$APP_DIR/updates/archive" "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/updates"
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
touch "$LOG_DIR/updater.log"
chown "$APP_USER:$APP_USER" "$LOG_DIR/updater.log"

echo "[2/4] installing systemd units"
install -m 644 "$APP_DIR/scripts/systemd/hrms-update.service" /etc/systemd/system/hrms-update.service
install -m 644 "$APP_DIR/scripts/systemd/hrms-update.path" /etc/systemd/system/hrms-update.path
install -m 644 "$APP_DIR/scripts/systemd/hrms-update-schedule.service" /etc/systemd/system/hrms-update-schedule.service
install -m 644 "$APP_DIR/scripts/systemd/hrms-update-schedule.timer" /etc/systemd/system/hrms-update-schedule.timer

echo "[3/4] reloading systemd"
systemctl daemon-reload

echo "[4/4] enabling the path watcher and the schedule timer"
systemctl enable --now hrms-update.path
systemctl enable --now hrms-update-schedule.timer
systemctl --no-pager --lines=0 status hrms-update.path || true
systemctl --no-pager --lines=0 status hrms-update-schedule.timer || true

echo "[ok] updater installed — queue: $APP_DIR/updates/queue/request.json"
