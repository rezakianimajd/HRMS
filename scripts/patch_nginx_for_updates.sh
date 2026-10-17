#!/bin/bash
# =============================================================================
# Kian ERP — tune the nginx vhost for in-app updates
#
#   1) client_max_body_size >= 512M   (large update packages / chunked uploads)
#   2) index.html is never cached     (a new build is picked up on next reload)
#
# Usage:
#   sudo bash scripts/patch_nginx_for_updates.sh [config] [--dry-run]
#
# The script is idempotent: running it twice changes nothing. A timestamped
# backup is kept and the original is restored if `nginx -t` fails.
# =============================================================================
set -euo pipefail

CONF="/etc/nginx/sites-available/hrms"
DRY_RUN=0

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        *) CONF="$arg" ;;
    esac
done

if [ ! -f "$CONF" ]; then
    echo "[skip] nginx config not found: $CONF"
    exit 0
fi

BACKUP="${CONF}.bak.$(date +%Y%m%d%H%M%S)"
CHANGED=0

WORK="$(mktemp)"
cp "$CONF" "$WORK"

# --- 1) upload size ---------------------------------------------------------
if grep -qE '^[[:space:]]*client_max_body_size' "$WORK"; then
    if grep -qE 'client_max_body_size[[:space:]]+512M;' "$WORK"; then
        echo "[ok] client_max_body_size already 512M"
    else
        sed -i -E 's/client_max_body_size[[:space:]]+[0-9]+[kKmMgG]?;/client_max_body_size 512M;/' "$WORK"
        CHANGED=1
        echo "[..] client_max_body_size -> 512M"
    fi
else
    sed -i -E '0,/^[[:space:]]*server[[:space:]]*\{/s//&\n    client_max_body_size 512M;/' "$WORK"
    CHANGED=1
    echo "[..] client_max_body_size 512M added"
fi

# --- 2) index.html cache ----------------------------------------------------
if grep -q 'Cache-Control "no-store, must-revalidate"' "$WORK"; then
    echo "[ok] index.html cache header already present"
else
    sed -i -E '0,/^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/s//&\n        add_header Cache-Control "no-store, must-revalidate";/' "$WORK"
    CHANGED=1
    echo "[..] no-store cache header added to location /"
fi

if [ "$CHANGED" -eq 0 ]; then
    rm -f "$WORK"
    echo "[done] nothing to change"
    exit 0
fi

if [ "$DRY_RUN" -eq 1 ]; then
    echo "--- diff (dry-run) ---"
    diff -u "$CONF" "$WORK" || true
    rm -f "$WORK"
    exit 0
fi

cp "$CONF" "$BACKUP"
cp "$WORK" "$CONF"
rm -f "$WORK"

if ! nginx -t; then
    echo "[error] nginx -t failed — restoring backup"
    cp "$BACKUP" "$CONF"
    exit 1
fi

systemctl reload nginx
echo "[done] nginx reloaded (backup: $BACKUP)"
