# نصب و استقرار HRMS روی Ubuntu

راهنمای کامل استقرار سیستم مدیریت منابع انسانی روی سرور Ubuntu (تولید).

---

## فهرست

- [پیش‌نیازها](#پیش‌نیازها)
- [گام ۱: دریافت کد](#گام-۱-دریافت-کد)
- [گام ۲: ویرایش تنظیمات deploy.sh](#گام-۲-ویرایش-تنظیمات-deploysh)
- [گام ۳: اجرای deploy.sh](#گام-۳-اجرای-deploysh)
- [گام ۴: ساخت tenant و کاربر](#گام-۴-ساخت-tenant-و-کاربر)
- [گام ۵: انتقال دیتابیس](#گام-۵-انتقال-دیتابیس)
- [گام ۶: فعال‌سازی SSL](#گام-۶-فعال‌سازی-ssl)
- [تأیید نهایی](#تأیید-نهایی)

---

## پیش‌نیازها

| مورد | توضیح |
|------|-------|
| **سرور Ubuntu 26.04 LTS** | دسترسی root یا کاربر با sudo |
| **دامنه** | یک دامنه که رکورد A آن به IP سرور اشاره کند (برای SSL) |
| **پورت‌های باز** | 22 (SSH)، 80 (HTTP)، 443 (HTTPS) |

> `deploy.sh` تمام نرم‌افزارهای دیگر (Python 3.12، PostgreSQL، Redis، Node.js،
> Nginx، Gunicorn و...) را به‌صورت خودکار نصب می‌کند.

---

## گام ۱: دریافت کد

```bash
sudo mkdir -p /opt/hrms
sudo chown "$USER:" /opt/hrms
git clone https://github.com/rezakianimajd/HRMS.git /opt/hrms
```

بررسی ساختار:

```bash
ls -la /opt/hrms
# باید فایل‌های deploy.sh، backup.sh، hrms_project/ و frontend/ موجود باشند
```

---

## گام ۲: ویرایش تنظیمات deploy.sh

فایل `/opt/hrms/deploy.sh` را ویرایش کنید:

```bash
nano /opt/hrms/deploy.sh
```

متغیرهای مهم:

| متغیر | مثال | توضیح |
|-------|------|-------|
| `DOMAIN` | `hrms.example.com` | دامنه اصلی سایت |
| `SERVER_IP` | `203.0.113.10` | IP عمومی سرور |
| `ADMIN_EMAIL` | `admin@example.com` | ایمیل مدیر (برای Let's Encrypt) |
| `ENABLE_SSL` | `true` یا `false` | فعال‌سازی HTTPS |

> **توجه:** اگر هنوز دامنه قابل‌حل ندارید، `ENABLE_SSL="false"` بگذارید و بعداً
> با حل شدن DNS، آن را `true` کنید و بخش certbot را دوباره اجرا کنید.

---

## گام ۳: اجرای deploy.sh

```bash
cd /opt/hrms
chmod +x deploy.sh
sudo bash deploy.sh
```

اسکریپت به‌طور خودکار:

1. سیستم را به‌روزرسانی و پیش‌نیازها را نصب می‌کند
2. کاربر سیستمی `hrms` و دایرکتوری‌ها را می‌سازد
3. PostgreSQL و Redis را پیکربندی می‌کند
4. محیط مجازی پایتون (3.12) را می‌سازد و وابستگی‌ها را نصب می‌کند
5. فایل `.env` امن می‌سازد (SECRET_KEY و رمز دیتابیس تصادفی)
6. migration و collectstatic را اجرا می‌کند
7. فرانت‌اند React را build می‌کند
8. سرویس‌های gunicorn، celery و nginx را می‌سازد و فعال می‌کند
9. فایروال را پیکربندی و cron پشتیبان را تنظیم می‌کند

> **مدت تقریبی:** ۵ تا ۱۰ دقیقه بسته به سرعت اینترنت.

بررسی وضعیت سرویس‌ها:

```bash
systemctl status gunicorn celery-worker celery-beat nginx postgresql redis-server
```

همه باید `active (running)` باشند.

---

## گام ۴: ساخت tenant و کاربر

```bash
cd /opt/hrms/hrms_project
source /opt/hrms/venv/bin/activate
export DJANGO_SETTINGS_MODULE=hrms_project.settings.production

# ساخت اولین شرکت (tenant)
python manage.py create_tenant \
    --name='نام شرکت' \
    --code='YOURCO' \
    --schema-name='yourco' \
    --domain='hrms.example.com'

# اعمال migration برای schema شرکت جدید
python manage.py migrate_schemas

# ساخت کاربر مدیر
python manage.py createsuperuser
```

> `schema-name` و `company-code` را دقیقاً یادداشت کنید — برای انتقال دیتابیس لازم‌اند.

---

## گام ۵: انتقال دیتابیس

اگر داده‌های توسعه (SQLite) دارید، ابتدا روی سیستم توسعه اکسپورت کنید:

```bash
# روی سیستم توسعه (SQLite)
python manage.py export_tenant_data --output hrms_tenant_data.json
```

سپس روی سرور:

```bash
# انتقال فایل JSON به سرور
scp hrms_tenant_data.json user@SERVER_IP:/tmp/hrms_tenant_data.json

# انتقال فایل‌های media (عکس، فایل مکاتبات و...)
scp -r hrms_project/media/* user@SERVER_IP:/tmp/hrms_media/

# ایمپورت داده‌ها به schema شرکت
cd /opt/hrms/hrms_project
source /opt/hrms/venv/bin/activate
export DJANGO_SETTINGS_MODULE=hrms_project.settings.production

python manage.py import_tenant_data /tmp/hrms_tenant_data.json \
    --schema=yourco --company-code=YOURCO

# کپی فایل‌های media
sudo cp -r /tmp/hrms_media/* /var/www/hrms/media/
sudo chown -R hrms:www-data /var/www/hrms/media/

# راه‌اندازی مجدد
sudo systemctl restart gunicorn celery-worker celery-beat
```

راهنمای کامل در [`DATABASE_MIGRATION.md`](DATABASE_MIGRATION.md).

---

## گام ۶: فعال‌سازی SSL

پس از آن‌که رکورد DNS فعال شد:

```bash
cd /opt/hrms
# ENABLE_SSL را true کنید
nano deploy.sh

# فقط بخش certbot را اجرا کنید:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hrms.example.com --redirect
```

به‌طور خودکار Nginx برای HTTPS پیکربندی می‌شود.

> اگر `SECURE_SSL_REDIRECT=True` در `production.py` است (که هست)، قبل از فعال‌سازی
> SSL، سایت به HTTP پاسخ نمی‌دهد — بنابراین SSL را قبل از استفاده فعال کنید.

---

## تأیید نهایی

```bash
# بررسی health از داخل سرور
curl -I http://localhost:80/          # باید 200 OK
curl -I http://localhost/api/          # باید پاسخ gunicorn باشد

# بررسی لاگ‌ها
journalctl -u gunicorn -f
tail -f /var/log/hrms/error.log

# باز کردن در مرورگر
https://hrms.example.com
```

## پیکربندی Nginx (خلاصه)

`deploy.sh` فایل Nginx را با این ساختار می‌سازد:

- `/static/` → فایل‌های استاتیک جنگو (`/var/www/hrms/static`)
- `/media/` → فایل‌های آپلودشده (`/var/www/hrms/media`)
- `/api/` و `/admin/` → proxied به gunicorn (socket)
- `/` → فایل‌های build شده React

```nginx
location / {
    root /opt/hrms/frontend/build;
    try_files $uri /index.html;
}
```

---

## رفع خطاهای رایج

| خطا | علت | راه‌حل |
|-----|------|--------|
| `CommandError: Company with code ...` | tenant ساخته نشده | `create_tenant` را اجرا کنید |
| `schema "xxx" does not exist` | migration اجرا نشده | `python manage.py migrate_schemas` |
| `psycopg2` install fails | نبود `libpq-dev` | `sudo apt install libpq-dev python3.12-dev` |
| `gunicorn` فعال نمی‌شود | `.env` یا settings اشتباه | `journalctl -u gunicorn -n 50` |
| 502 Bad Gateway | گانیکورن down است | وضعیت socket و `gunicorn` را بررسی کنید |
| استاتیک لود نمی‌شود | collectstatic اجرا نشده | `python manage.py collectstatic --noinput` |