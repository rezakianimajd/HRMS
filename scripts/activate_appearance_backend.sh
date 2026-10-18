#!/usr/bin/env bash
# فعال‌سازی بک‌اند تنظیمات ظاهر (پالت ماژول‌ها + فونت‌ها) روی سرور HRMS.
# این اسکریپت باید با sudo اجرا شود:
#   sudo bash activate_appearance_backend.sh /tmp/hrms-appearance/settings_app /opt/hrms/hrms_project/settings_app hrms
set -euo pipefail

SRC="${1:-/tmp/hrms-appearance/settings_app}"
DEST="${2:-/opt/hrms/hrms_project/settings_app}"
APP_USER="${3:-hrms}"

if [ "$(id -u)" -ne 0 ]; then
    echo "این اسکریپت باید با sudo اجرا شود." >&2
    exit 1
fi

for rel in views.py urls.py engines/settings_engine.py; do
    src="$SRC/$rel"
    dst="$DEST/$rel"
    if [ ! -f "$src" ]; then
        echo "فایل مبدأ پیدا نشد: $src" >&2
        exit 2
    fi
    install -m 0644 "$src" "$dst"
    chown "$APP_USER:$APP_USER" "$dst"
    echo "copied: $dst"
done

systemctl restart gunicorn
systemctl is-active --quiet gunicorn
echo "OK: appearance backend activated"
