# راهنمای به‌روزرسانی سرور HRMS (۱۳۹۲.۱۶۸.۱۳۴.۱۱۱)

این سند دستورات کامل به‌روزرسانی سرور تولید را به‌صورت «یکجا» جمع کرده است.
سرور برای مدتی به‌روز نشده، پس علاوه بر `git pull`، نصب وابستگی‌های جدید پایتون،
اجرای migration (چندمستاجری) و ری‌بیلد فرانت‌اند نیز لازم است.

---

## ۰) مقادیر پایه (مطابق `deploy.sh`)

| مورد | مقدار |
|------|-------|
| مسیر پروژه | `/opt/hrms` |
| مسیر جنگو | `/opt/hrms/hrms_project` |
| محیط مجازی | `/opt/hrms/venv` |
| کاربر سرویس | `hrms` (گروه `www-data`) |
| ماژول تنظیمات | `hrms_project.settings.production` |
| سرویس‌ها | `gunicorn`، `celery-worker`، `celery-beat`، `nginx` |
| دیتابیس | PostgreSQL – `hrms_db` (کاربر و رمز در `/opt/hrms/.env`) |
| ریموت گیت | `https://github.com/rezakianimajd/HRMS.git` (شاخه `main`) |

> فایل `/opt/hrms/.env` حاوی `SECRET_KEY`, `DB_*`, `ALLOWED_HOSTS`, `SSL_ENABLED`
> است و **نباید** با گیت بازنویسی شود (در `.gitignore` است).

---

## ۱) اسکریپت کامل به‌روزرسانی (کپی و اجرا کن)

```bash
set -e

# ---------- متغیرها ----------
PROJECT_DIR="/opt/hrms"
DJANGO_DIR="/opt/hrms/hrms_project"
VENV_DIR="/opt/hrms/venv"
SETTINGS="hrms_project.settings.production"
DB_NAME="hrms_db"
DB_USER="$(grep -E '^DB_USER=' $PROJECT_DIR/.env | cut -d= -f2- | tr -d '"')"
BACKUP_DIR="/var/backups/hrms"

echo "== [1/10] بررسی فضای دیسک (مشکل قبلی: No space left) =="
df -h / | tail -1

echo "== [2/10] پشتیبان‌گیری از دیتابیس قبل از هر تغییر =="
sudo -u postgres mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump -F c "$DB_NAME" -f "$BACKUP_DIR/preupdate_$STAMP.db.dump"
echo "پشتیبان ساخته شد: $BACKUP_DIR/preupdate_$STAMP.db.dump"

echo "== [3/10] دریافت آخرین کد از گیت‌هاب =="
cd "$PROJECT_DIR"
sudo -u hrms git fetch origin
sudo -u hrms git reset --hard origin/main
sudo -u hrms git log --oneline -1

echo "== [4/10] نصب/به‌روزرسانی وابستگی‌های پایتون (django-jazzmin و ...) =="
sudo -u hrms "$VENV_DIR/bin/pip" install --upgrade pip
sudo -u hrms "$VENV_DIR/bin/pip" install -r "$DJANGO_DIR/requirements.txt"

echo "== [5/10] اجرای migration چندمستاجری (public + همه tenantها) =="
cd "$DJANGO_DIR"
sudo -u hrms env DJANGO_SETTINGS_MODULE="$SETTINGS" "$VENV_DIR/bin/python" manage.py migrate_schemas --noinput

echo "== [6/10] جمع‌آوری فایل‌های استاتیک =="
cd "$DJANGO_DIR"
sudo -u hrms env DJANGO_SETTINGS_MODULE="$SETTINGS" "$VENV_DIR/bin/python" manage.py collectstatic --noinput

echo "== [7/10] ری‌بیلد فرانت‌اند React =="
sudo rm -rf "$PROJECT_DIR/frontend/build"
cd "$PROJECT_DIR/frontend"
sudo -u hrms npm install
sudo -u hrms npm run build

echo "== [8/10] انتشار فایل‌های build (در صورت سرو Nginx از /var/www) =="
# اگر Nginx از /var/www/hrms/html سرو می‌کند؛ در غیر این صورت این مرحله بی‌اثر است.
sudo mkdir -p /var/www/hrms/html
sudo -u hrms cp "$PROJECT_DIR/frontend/build/index.html" /var/www/hrms/html/index.html
sudo rm -rf /var/www/hrms/static/js /var/www/hrms/static/css
sudo -u hrms cp -a "$PROJECT_DIR/frontend/build/static/." /var/www/hrms/static/
sudo chown -R hrms:www-data "$PROJECT_DIR/frontend/build" /var/www/hrms/static /var/www/hrms/html

echo "== [9/10] ری‌استارت سرویس‌ها =="
sudo systemctl daemon-reload
sudo systemctl restart gunicorn celery-worker celery-beat
sudo systemctl reload nginx

echo "== [10/10] وضعیت نهایی =="
sudo systemctl is-active gunicorn celery-worker celery-beat nginx
```

---

## ۲) اگر migration روی schema `demo` خطای `DuplicateTable` داد

(وقتی جدول‌ها قبلاً دستی ساخته شده‌اند) — به‌جای شکست، migration را fake کن:

```bash
cd /opt/hrms/hrms_project
sudo -u hrms env DJANGO_SETTINGS_MODULE=hrms_project.settings.production \
  /opt/hrms/venv/bin/python manage.py tenant_command migrate accounting --fake --schema=demo
```

سپس برای بقیه اپ‌ها در صورت نیاز همین الگو را تکرار کن
(مثلاً `pettycash`, `notifications`, `contracts`, `projects`).

---

## ۳) بررسی و رفع خطاهای رایج

```bash
# لاگ گانیکورن (۹۹٪ خطاها اینجاست)
sudo journalctl -u gunicorn -n 80 --no-pager

# تست سلامت از داخل سرور
curl -I http://localhost/
curl -I http://localhost/api/

# اگر 502 Bad Gateway: گانیکورن بالا نیامده
sudo systemctl status gunicorn --no-pager
sudo tail -n 50 /var/log/hrms/error.log
```

| علامت | علت | راه‌حل |
|-------|-----|--------|
| `No space left on device` | انباشت static قدیمی | اجرای بلوک پاک‌سازی پوشه `js`/`css` و `frontend/build` |
| `ModuleNotFoundError: jazzmin` | وابستگی جدید نصب نشده | `pip install -r requirements.txt` |
| `schema "xxx" does not exist` | migration اجرا نشده | `migrate_schemas --noinput` |
| 502 Bad Gateway | گانیکورن down | `journalctl -u gunicorn -n 80` |
| صفحه قدیمی می‌ماند | `index.html` کش شده | `Ctrl+Shift+R` یا پاک‌سازی `js`/`css` |

---

## بایگانی فایل‌ها (ساختار archive/)

آپلود مدارک پرسنل، اسناد قرارداد و اسناد سازمانی مستقیماً در ساختار بایگانی
ذخیره می‌شود:

```
/var/www/hrms/media/archive/company_<id>/<root_folder>/<entity_folder>/<uuid>.<ext>
```

مثال: `archive/company_1/employees/1001_احمدی/…pdf`

- الگوی نام پوشه از «تنظیمات → تنظیمات عمومی → ذخیره‌سازی و فایل‌ها» خوانده می‌شود
  (`StorageProfile.entity_folder_pattern`).
- عکس پرسنل و تصویر امضای نسخهٔ قرارداد هم در پوشهٔ همان پرسنل ذخیره می‌شوند.
- از همان پنل با دکمهٔ «مرور و دانلود فایل‌ها» می‌توان پوشه‌ها را باز کرد،
  فایل را پیش‌نمایش/دانلود یا حذف کرد و مسیر کامل را کپی کرد
  (`GET /api/storage/browse/` و `DELETE /api/storage/files/`).
- اگر برای شرکتی پروفایلی تعریف نشده باشد، آپلود با مسیر قدیمی
  (`company_x/employee_y/documents/`) انجام می‌شود تا سرویس قطع نشود.

**انتقال فایل‌های قدیمی** (یک‌بار، پس از `-Migrate`):
```bash
# پیش‌نمایش (هیچ فایلی جابه‌جا نمی‌شود)
cd /opt/hrms/hrms_project
sudo -u hrms bash -lc 'set -a && . ./.env && set +a && \
  DJANGO_SETTINGS_MODULE=hrms_project.settings.production \
  /opt/hrms/venv/bin/python manage.py archive_existing_files'

# اجرای واقعی
... manage.py archive_existing_files --apply
```

> **چند‌مستأجری (django-tenants):** جدول‌های ماژول‌ها (پرسنل، مدارک، قراردادها و …)
> فقط در schema هر شرکت وجود دارند. دستور بالا اگر روی schema `public` اجرا شود،
> خودش روی همهٔ شرکت‌ها (`standard`, `kpsmi`, …) می‌چرخد و برای هر schema جداگانه
> پردازش می‌کند. اجرای دستی در یک شرکت هم با
> `manage.py tenant_command archive_existing_files --schema=kpsmi -- --apply` ممکن است.

یا از ویندوز: `.\deploy-update.ps1 -Archive -LocalBuild -NoBuild -Migrate -MoveFiles`


---

## ۴) بررسی پیکربندی Nginx (مهم برای مرحله ۸)

برای اطلاع از اینکه Nginx از کجا سرو می‌کند:

```bash
sudo grep -nE 'root|location / |location /api|location /static' /etc/nginx/sites-available/hrms
```

- اگر `root /opt/hrms/frontend/build;` بود → مرحلهٔ ۸ لازم نیست.
- اگر `root /var/www/hrms/html;` بود → مرحلهٔ ۸ الزامی است.

---

## ۵) بازگردانی در صورت بروز مشکل

```bash
# بازگردانی کد
cd /opt/hrms && sudo -u hrms git reflog && sudo -u hrms git reset --hard <COMMIT>

# بازگردانی دیتابیس از پشتیبان مرحله ۲
sudo systemctl stop gunicorn
sudo -u postgres dropdb hrms_db
sudo -u postgres createdb hrms_db -O "$DB_USER"
sudo -u postgres pg_restore -d hrms_db /var/backups/hrms/preupdate_<STAMP>.db.dump
sudo systemctl start gunicorn
```

---

## ۶) چک‌لیست نهایی

- [ ] پشتیبان دیتابیس گرفته شد (مرحله ۲)
- [ ] `git pull` موفق بود و commit درست را نشان می‌دهد (مرحله ۳)
- [ ] `pip install -r requirements.txt` بدون خطا (مرحله ۴)
- [ ] `migrate_schemas` بدون خطا (یا با fake) (مرحله ۵)
- [ ] `collectstatic` انجام شد (مرحله ۶)
- [ ] `npm run build` موفق (مرحله ۷)
- [ ] سرویس‌ها `active` هستند (مرحله ۹ و ۱۰)
- [ ] سایت در مرورگر با `Ctrl+Shift+R` بالا می‌آید
