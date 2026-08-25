# HRMS — سیستم جامع مدیریت منابع انسانی

سیستم مدیریت منابع انسانی (Human Resource Management System) با معماری **چندشرکتی (Multi-Tenant)** و **چندزبانه (i18n)**.

- **بک‌اند**: Django 5 + Django REST Framework
- **فرانت‌اند**: React 18 + Material UI (MUI) + i18next
- **احراز هویت**: JWT (`djangorestframework-simplejwt`) با refresh token چرخشی
- **دیتابیس تولید**: PostgreSQL 16 + `django-tenants` (هر شرکت یک schema جداگانه)
- **وظایف پس‌زمینه**: Celery + Redis + Celery Beat
- **زبان‌ها**: فارسی (`fa`) و انگلیسی (`en`) — چیدمان RTL/LTR خودکار

---

## فهرست

- [ماژول‌های فعال](#ماژول‌های-فعال)
- [معماری چندشرکتی](#معماری-چندشرکتی)
- [پیش‌نیازهای سرور](#پیش‌نیازهای-سرور)
- [استقرار در محیط تولید](#استقرار-در-محیط-تولید-ubuntu)
- [راه‌اندازی در محیط توسعه](#راه‌اندازی-در-محیط-توسعه)
- [انتقال دیتابیس از SQLite به PostgreSQL](#انتقال-دیتابیس-از-sqlite-به-postgresql)
- [متغیرهای محیطی](#متغیرهای-محیطی)
- [مدیریت سرویس‌ها](#مدیریت-سرویس‌ها)
- [پشتیبان‌گیری](#پشتیبان‌گیری)
- [API Endpoints](#api-endpoints)
- [ساختار پروژه](#ساختار-پروژه)
- [عیب‌یابی](#عیب‌یابی)

---

## ماژول‌های فعال

| ماژول | مسیر | توضیح |
|-------|------|-------|
| **داشبورد** | `/dashboard` | آمار + نمودارها + هشدارها (تک‌صفحه) |
| **پرسنل** | `/employees` | لیست + افزودن/ویرایش (چند مرحله‌ای) + پرونده پرسنلی |
| **ورود اطلاعات** | `/data-entry` | مرخصی، غیبت، حقوق، مزایا، کسورات |
| **دفترچه تلفن** | `/phonebook` | کارت‌های تماس + خروجی اکسل |
| **جستجو** | `/search` | جستجوی پیشرفته + فیلتر |
| **چارت سازمانی** | `/org-chart` | درخت سلسله‌مراتبی + ویرایش + نفرات مستقر |
| **گزارشات** | `/reports` | ۱۵+ نمودار + تولدها + خلاصه مکاتبات |
| **تعاریف اولیه** | `/definitions` | مشخصات شرکت + دپارتمان‌ها + لیست‌های پایه |
| **مکاتبات** | `/correspondences` | نامه وارده/صادره + ابلاغ‌ها + فرم‌ها |
| **تنظیمات** | `/settings` | کاربران، نقش‌ها، درون‌ریزی اکسل |

### زیرماژول‌های «ورود اطلاعات»

| نوع | زیرتب‌ها | فیلدهای کلیدی |
|-----|---------|--------------|
| **حقوق** | ثبت فیش جدید / درون‌ریزی گروهی / لیست | ۳۳ فیلد (حقوق پایه، اضافه‌کاری، شب‌کاری، بیمه، کسورات و...) |
| **مزایا** | ثبت مزایا / درون‌ریزی گروهی / لیست | ۱۵ نوع مزایای رفاهی + مبلغ ناخالص/مالیات/پرداختی |
| **مرخصی** | — | ۷ زیرنوع + تعداد روز + بازه |
| **غیبت** | — | ۳ زیرنوع + تعداد روز + جریمه |
| **کسورات** | — | ۶ زیرنوع + مبلغ + دوره |

---

## معماری چندشرکتی

سیستم از `django-tenants` استفاده می‌کند:

- **مدل tenant**: `core.Company`
- **مدل دامنه**: `core.Domain`
- **schema جداگانه**: هر شرکت در دیتابیس PostgreSQL یک `schema` مستقل دارد
- **توسعه محلی (SQLite)**: برای تست بدون PostgreSQL، حالت غیرفعالِ tenant با
  `CustomTenantMiddleware` استفاده می‌شود (رجوع به `settings/development.py`)

```
 درخواست ورودی
      │
      ▼
 TenantMiddleware ── تعیین شرکت بر اساس دامنه
      │
      ▼
 schema اختصاصی شرکت (PostgreSQL search_path)
      │
      ▼
 Employees / Payroll / OrgChart / ...
```

نقش‌ها و دسترسی‌ها (RBAC):

| نقش | توضیح |
|-----|-------|
| `super_admin` | مدیر ارشد سیستم — دسترسی کامل |
| `hr_manager` | مدیر منابع انسانی — مدیریت پرسنل و تنظیمات |
| `hr_specialist` | کارشناس منابع انسانی — ثبت و ویرایش محدود |
| `department_head` | مدیر دپارتمان — مشاهده و تأیید محدود |
| `employee` | کارمند — دسترسی حداقلی |

---

## پیش‌نیازهای سرور

| نرم‌افزار | نسخه پیشنهادی | توضیح |
|-----------|---------------|-------|
| **Ubuntu Server** | 26.04 LTS | سیستم‌عامل هدف |
| **Python** | 3.12 | توسط `deploy.sh` نصب می‌شود |
| **PostgreSQL** | 16 | دیتابیس چندشرکتی |
| **Redis** | 7+ | broker و cache |
| **Node.js** | 20 LTS | build فرانت‌اند |
| **Nginx** | 1.24+ | وب‌سرور و reverse proxy |
| **Gunicorn** | 21+ | WSGI سرور جنگو |

> تمام پیش‌نیازها به‌صورت خودکار توسط `deploy.sh` نصب می‌شوند.

---

## استقرار در محیط تولید (Ubuntu)

راهنمای کامل گام‌به‌گام در فایل [`INSTALLATION.md`](INSTALLATION.md) آمده است.
خلاصهٔ مراحل:

```bash
# ۱) دریافت کد از گیت
sudo mkdir -p /opt/hrms
sudo chown $USER: /opt/hrms
git clone https://github.com/rezakianimajd/HRMS.git /opt/hrms

# ۲) ویرایش متغیرهای deploy.sh (دامنه، IP، ایمیل)
#    DOMAIN، SERVER_IP، ADMIN_EMAIL و ENABLE_SSL

# ۳) اجرای اسکریپت استقرار
cd /opt/hrms
sudo bash deploy.sh

# ۴) ساخت tenant (شرکت)
cd /opt/hrms/hrms_project
source /opt/hrms/venv/bin/activate
export DJANGO_SETTINGS_MODULE=hrms_project.settings.production
python manage.py create_tenant \
    --name='نام شرکت' --code='YOURCO' --domain='your-domain.com'

# ۵) ساخت کاربر مدیر
python manage.py createsuperuser
```

پس از اجرا:

| سرویس | توضیح |
|-------|-------|
| `gunicorn` | اپلیکیشن جنگو روی socket |
| `celery-worker` | پردازش وظایف پس‌زمینه |
| `celery-beat` | زمان‌بندی وظایف دوره‌ای (با `django_celery_beat`) |
| `nginx` | سرو استاتیک + reverse proxy |
| `postgresql` | دیتابیس |
| `redis-server` | broker و cache |
| `cron` | پشتیبان‌گیری روزانه |

---

## راه‌اندازی در محیط توسعه

برای توسعه روی لینوکس/مک با SQLite (بدون نیاز به PostgreSQL و Redis):

```bash
cd hrms_project
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

# ساخت و اعمال migration برای SQLite
python manage.py migrate

# ساخت کاربر و داده نمونه
python manage.py setup_dev

# اجرای بک‌اند
python manage.py runserver
```

در ترمینال دوم، فرانت‌اند:

```bash
cd frontend
npm install
npm start
```

ورود توسعه‌ای: `http://localhost:3000` با `admin` / `admin123`

> ⚠️ حالت توسعه **فاقد** قابلیت چندشرکتی واقعی است (SQLite از schema پشتیبانی
> نمی‌کند). برای تست دقیق multi-tenancy باید از PostgreSQL استفاده کنید.

---

## انتقال دیتابیس از SQLite به PostgreSQL

برای انتقال داده‌های ثبت‌شده در حالت توسعه، از دو دستور مدیریتی استفاده می‌شود:

```bash
# روی سیستم توسعه (SQLite)
python manage.py export_tenant_data --output hrms_tenant_data.json

# روی سرور (PostgreSQL + پس از create_tenant و migrate_schemas)
python manage.py import_tenant_data hrms_tenant_data.json \
    --schema=yourco --company-code=YOURCO
```

مستندات کامل در [`DATABASE_MIGRATION.md`](DATABASE_MIGRATION.md).

---

## متغیرهای محیطی

مقادیر از فایل `.env` (در کنار `manage.py`) خوانده می‌شوند. نمونه‌ی امن در
`.env.example` موجود است:

| متغیر | توضیح | پیش‌فرض |
|-------|-------|---------|
| `SECRET_KEY` | کلید محرمانه جنگو | — (الزامی در تولید) |
| `DB_NAME` | نام دیتابیس | `hrms_db` |
| `DB_USER` | کاربر PostgreSQL | `hrms` |
| `DB_PASSWORD` | رمز دیتابیس | — (الزامی) |
| `DB_HOST` / `DB_PORT` | آدرس و پورت دیتابیس | `localhost` / `5432` |
| `DEBUG` | حالت اشکال‌زدایی | `False` |
| `ALLOWED_HOSTS` | دامنه‌های مجاز (با کاما) | — |
| `CORS_ALLOWED_ORIGINS` | آدرس‌های مجاز فرانت‌اند | — |
| `CELERY_BROKER_URL` | آدرس Redis برای Celery | `redis://localhost:6379/0` |
| `REDIS_CACHE_URL` | آدرس کش | `redis://localhost:6379/1` |
| `STATIC_ROOT` / `MEDIA_ROOT` | مسیر فایل‌های استاتیک/رسانه | `/var/www/hrms/...` |
| `BASE_FILE_STORAGE_PATH` | مسیر ذخیره فایل‌های پرسنلی | `/var/hr_data/` |
| `EMAIL_HOST` / `EMAIL_PORT` | سرور SMTP | — |

> کلید امن با `python -c "import secrets; print(secrets.token_urlsafe(50))"` تولید کنید.

---

## مدیریت سرویس‌ها

```bash
# وضعیت همه سرویس‌ها
systemctl status gunicorn celery-worker celery-beat nginx postgresql redis-server

# راه‌اندازی مجدد
sudo systemctl restart gunicorn celery-worker celery-beat

# مشاهده لاگ‌ها
journalctl -u gunicorn -f
tail -f /var/log/hrms/error.log
```

---

## پشتیبان‌گیری

اسکریپت `backup.sh` هر شب ساعت ۲ (از طریق cron) اجرا می‌شود و شامل موارد زیر است:

- دامپ فشردهٔ PostgreSQL (فرمت custom)
- فایل‌های پرسنلی (`/var/hr_data`)
- فایل‌های آپلودشده (`/var/www/hrms/media`)
- فایل `.env`

```bash
# اجرای دستی
sudo -u hrms /opt/hrms/backup.sh

# بازیابی
sudo -u postgres pg_restore -U hrms -d hrms_db --clean --if-exists \
    /var/backups/hrms/hrms_backup_XXXX.db.dump
```

پشتیبان‌ها به‌مدت ۳۰ روز نگهداری می‌شوند (`RETENTION_DAYS` در `backup.sh`).

---

## API Endpoints

### احراز هویت

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `POST` | `/api/auth/login/` | ورود — دریافت JWT |
| `POST` | `/api/auth/refresh/` | تازه‌سازی access token |
| `POST` | `/api/auth/logout/` | خروج |
| `GET` | `/api/auth/me/` | پروفایل کاربر جاری |

### پرسنل

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `GET/POST` | `/api/employees/` | لیست / ایجاد پرسنل |
| `GET/PUT/DELETE` | `/api/employees/{id}/` | مشاهده / ویرایش / حذف |
| `GET` | `/api/departments/` | دپارتمان‌ها |
| `GET` | `/api/job-titles/` | عناوین شغلی |
| `GET` | `/api/work-locations/` | محل‌های استقرار |
| `GET` | `/api/insurance-lists/` | لیست بیمه |

### حقوق و مزایا

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `GET/POST` | `/api/salaries/` | فیش حقوقی |
| `GET` | `/api/salaries/by_employee/` | فیش‌های یک پرسنل |
| `GET/POST` | `/api/benefits/` | مزایا |
| `GET` | `/api/benefits/by_employee/` | مزایای یک پرسنل |
| `GET/POST` | `/api/transactions/` | تراکنش (مرخصی/غیبت/...) |

### چارت سازمانی

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `GET` | `/api/org-chart/positions/tree/` | درخت سازمانی |
| `GET/POST` | `/api/org-chart/positions/` | لیست / ایجاد جایگاه |
| `POST` | `/api/org-chart/positions/{id}/set_occupants/` | تخصیص نفرات |

### مکاتبات

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `GET/POST` | `/api/incoming-letters/` | نامه‌های وارده |
| `GET/POST` | `/api/outgoing-letters/` | نامه‌های صادره |
| `GET/POST` | `/api/announcements/` | ابلاغ‌ها |
| `GET/POST` | `/api/forms/` | فرم‌ها |

### گزارشات

| Endpoint | توضیح |
|----------|-------|
| `/api/reports/employees-by-department/` | پرسنل به تفکیک دپارتمان |
| `/api/reports/employees-by-gender/` | ترکیب جنسیتی |
| `/api/reports/upcoming-birthdays/` | تولدهای ۷ روز آینده |
| `/api/reports/correspondences-summary/` | خلاصه مکاتبات |
| `/api/reports/salary-benefits-summary/` | خلاصه حقوق و مزایا |

### درون‌ریزی اکسل

| Method | Endpoint |
|--------|----------|
| `GET` | `/api/import/types/` |
| `GET` | `/api/import/template/{type}/` |
| `POST` | `/api/import/upload/` |

---

## ساختار پروژه

```
HRMS/
├── deploy.sh                 # استقرار کامل سرور Ubuntu
├── backup.sh                 # پشتیبان‌گیری روزانه
├── INSTALLATION.md           # راهنمای نصب و دیپلوی
├── DATABASE_MIGRATION.md     # راهنمای انتقال دیتابیس
├── .env.example              # نمونه متغیرهای محیطی
├── hrms_project/             # بک‌اند Django
│   ├── core/                 # هسته (شرکت، کاربران، موتورها، لاگ‌ها)
│   ├── employees/            # پرسنل + گزارشات
│   ├── payroll/              # حقوق و مزایا
│   ├── orgchart/             # چارت سازمانی
│   ├── correspondences/      # مکاتبات
│   ├── settings_app/         # تنظیمات + کاربران + درون‌ریزی اکسل
│   ├── documents/            # مدارک پرسنل
│   ├── leaves/               # مرخصی
│   ├── attendance/           # حضور و غیاب
│   ├── locale/               # ترجمه‌ها
│   └── hrms_project/         # پیکربندی پروژه (settings/urls/wsgi/...)
└── frontend/                 # فرانت‌اند React
    └── src/
        ├── core/             # api، hooks، context، کامپوننت‌های مشترک
        ├── modules/          # ماژول‌ها
        ├── pages/            # صفحات
        ├── locales/          # ترجمه‌ها
        └── AppRoutes.jsx
```

---

## چندزبانه (i18n)

- **زبان‌ها**: فارسی (`fa`) و انگلیسی (`en`)
- **تشخیص خودکار**: هدر مرورگر ← session ← پیش‌فرض
- **RTL/LTR**: `document.dir` به‌صورت خودکار تنظیم می‌شود
- فایل‌های ترجمه: `frontend/src/locales/{fa,en}/translation.json`

---

## امنیت

- `DEBUG=False` در محیط تولید
- کوکی‌های امن و HTTPS (هدر HSTS، XSS، X-Frame-Options)
- محدودسازی CORS به دامنه‌های مجاز
- محدودسازی نرخ درخواست (`django-ratelimit`)
- رمزنگاری فایل‌های پرسنلی با `ENCRYPTION_KEY`
- تفکیک دسترسی بر اساس نقش (RBAC)

---

## عیب‌یابی

| مشکل | راه‌حل |
|-------|--------|
| `no such table: payroll_salaryrecord` | `python manage.py migrate` |
| `CommandError: Company with code ...` | ابتدا `create_tenant` را اجرا کنید |
| `schema "xxx" does not exist` | `python manage.py migrate_schemas` |
| `charmap codec can't encode` (ویندوز) | `export_tenant_data` را با خروجی UTF-8 اجرا کنید |
| خطای `psycopg2` | نصب `python3.12-dev libpq-dev` سپس نصب مجدد requirements |
| استاتیک ۴۰۴ | `python manage.py collectstatic --noinput` |
| CORS | تنظیم `CORS_ALLOWED_ORIGINS` در `.env` |

---

## مستندات مرتبط

- [`INSTALLATION.md`](INSTALLATION.md) — نصب و استقرار کامل
- [`DATABASE_MIGRATION.md`](DATABASE_MIGRATION.md) — انتقال دیتابیس

---

## مجوز

حقوق معنوی محفوظ است. برای استفاده تجاری با تیم توسعه تماس بگیرید.