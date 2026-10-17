# 🏢 Kian ERP — سامانهٔ یکپارچه مدیریت کسب و کار کیان

<div align="center">

**Kian ERP — Integrated Business Management System**
**سامانهٔ یکپارچهٔ مدیریت کسب و کار کیان**

`Multi-Tenant` · `Bilingual FA/EN` · `20 Modules` · `End-to-End: HR → Payroll → Accounting`

[فارسی](#-فارسی) · [English](#-english) · [📚 نصب](INSTALLATION.md) · [🗄️ مهاجرت دیتابیس](DATABASE_MIGRATION.md) · [🔄 به‌روزرسانی سرور](SERVER_UPDATE.md) · [🎨 معرفی گرافیکی](docs/intro.html)

</div>

[![Django](https://img.shields.io/badge/Django-5.0-092E20?logo=django&logoColor=white&style=for-the-badge)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.14+-red?logo=django&logoColor=white&style=for-the-badge)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://reactjs.org/)
[![MUI](https://img.shields.io/badge/MUI-5.18-007FFF?logo=mui&logoColor=white&style=for-the-badge)](https://mui.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white&style=for-the-badge)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white&style=for-the-badge)](https://docs.celeryq.dev/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white&style=for-the-badge)](https://jwt.io/)

---

# 🇮🇷 فارسی

## فهرست

| بخش | بخش | بخش |
|---|---|---|
| [معرفی](#معرفی) | [چرا Kian ERP؟](#چرا-kian-erp) | [ماژول‌ها](#ماژولها) |
| [بایگانی فایل](#سامانهٔ-بایگانی-فایل-جدید) | [نصب و راه‌اندازی](#نصب-و-راهاندازی) | [متغیرهای محیطی](#متغیرهای-محیطی-env) |
| [استقرار و به‌روزرسانی](#استقرار-و-بهروزرسانی) | [ساختار پروژه](#ساختار-پروژه) | [امنیت](#چندمستأجری-و-امنیت) |
| [نقش‌ها](#نقشها-و-دسترسیها-rbac) | [API](#رابط-api) | [تست](#تست-و-کیفیت-کد) |
| [عیب‌یابی](#عیبیابی-سریع) | | |

## معرفی

**Kian ERP** سامانهٔ یکپارچهٔ مدیریت کسب و کار کیان است؛ یک پلتفرم چند‌مستأجری (Multi-Tenant) که همهٔ فرایندهای سازمان را در یک پایگاه داده و یک تجربهٔ کاربری واحد به هم متصل می‌کند: از استخدام، حضور و غیاب و حقوق تا قرارداد، پروژه، تأمین کالا، خزانه‌داری، حسابداری و گزارش‌های مالی.

> **از HRMS تا Kian ERP** — این سامانه با تمرکز بر منابع انسانی آغاز شد، اما امروز دامنهٔ آن کامل شده است: **۲۰ ماژول یکپارچه** که چرخهٔ کامل کسب و کار را پوشش می‌دهند، نه فقط پروندهٔ پرسنل. هر شرکت (tenant) schema مستقل PostgreSQL خود را دارد و ماژول‌های فعالش را انتخاب می‌کند.

## چرا Kian ERP؟

| ویژگی | ارزش برای کسب و کار |
|---|---|
| 🔗 **یکپارچگی واقعی** | استخدام → حضور → حقوق → سند حسابداری؛ بدون ورود دوبارهٔ داده و بدون فایل اکسل واسط |
| 🧮 **یک منبع حقیقت** | یک پایگاه داده و یک مدل داده مشترک برای همهٔ ماژول‌ها؛ گزارش‌ها همیشه با هم می‌خوانند |
| 🏘️ **چندشرکتی بومی** | schema مستقل برای هر شرکت؛ مناسب هلدینگ، مجموعهٔ چندشرکتی و شرکت‌های پروژه‌ای |
| 📊 **مالی کامل** | حسابداری دوبل، خزانه‌داری، تنخواه، چک و تضامین، مالیات و صورت‌های مالی |
| 🏗️ **کنترل پروژه** | WBS/CBS/OBS، CPM، EVM، بهای تمام‌شده، تغییرات، ریسک و گواهی پرداخت |
| 📁 **بایگانی ساختارمند** | پوشهٔ اختصاصی هر پرسنل/قرارداد با مرور، دانلود و حذف از پنل تنظیمات |
| 🇮🇷 **فارسی‌محور** | تقویم شمسی، RTL کامل و رابط دوزبانهٔ فارسی/انگلیسی |
| 🧩 **قابل توسعه** | API یکپارچه، موتورهای مستقل و ماژول‌های قابل فعال/غیرفعال‌سازی |

- 🏗️ **معماری:** Django 5 + DRF + PostgreSQL (schema-per-tenant) + Celery/Redis + React 18
- 🗣️ **دوزبانه:** فارسی (پیش‌فرض، RTL) و انگلیسی — کاملاً قابل تعویض از داخل برنامه
- 📅 **تقویم شمسی:** تبدیل دوطرفه در بک‌اند (`django-jalali`) و فرانت‌اند (`Intl` Persian calendar)
- 🗂️ **بایگانی فایل ساختارمند:** پوشهٔ اختصاصی هر پرسنل/قرارداد با مرور، دانلود و حذف از پنل تنظیمات
- 🔐 **دسترسی نقش‌محور:** ۵ نقش پیش‌فرض + مجوزهای قابل بازتعریف در دیتابیس
- 🧾 **ممیزی:** `AuditLog` سراسری + حذف نرم (`SoftDelete`) روی مدل‌های پایه

### 🆕 تازه‌ترین تغییرات

- 🗂️ **سامانهٔ بایگانی فایل ماژول‌محور** با پوشهٔ اختصاصی هر موجودیت
- 📎 اتصال خودکار آپلودها (مدارک پرسنل، اسناد قرارداد، اسناد سازمانی، عکس و امضای پرسنل) به پوشهٔ همان موجودیت
- 🧰 دستور `archive_existing_files` برای انتقال فایل‌های قدیمی — چند‌مستأجری و idempotent
- 🎨 بازطراحی پنل **ذخیره‌سازی و فایل‌ها**: آمار، کپی مسیر، مرورگر فایل با پیش‌نمایش/دانلود/حذف

### امکانات کلیدی

| حوزه | امکانات |
|---|---|
| 👥 منابع انسانی | پروندهٔ ۳۶۰° پرسنل، دپارتمان/محل خدمت/عنوان شغلی، سوابق، جرایم، تغییرات استخدامی، نسخه‌بندی قرارداد، بیمهٔ تکمیلی، درخواست‌های HR |
| 🕒 عملیات | حضور و غیاب، مرخصی، چارت سازمانی، دارایی‌ها و چک‌لیست ورود/خروج، تقویم رویداد |
| 🎯 جذب و ارزیابی | نیاز استخدامی، کاندید، مصاحبه، دوره‌های ارزیابی عملکرد |
| 💰 مالی | فیش حقوقی، مزایا/کسورات، وام، تنخواه، خزان‌داری، چک، سپرده و ضمانت |
| 📊 حسابداری | سال مالی و دوره، سرفصل درختی، سند حسابداری، اسناد خروجی، مغایرت بانکی، گزارش‌های مالی، مالیات، عملیات سالانه |
| 📁 قراردادها | طرف‌های قرارداد، قرارداد و الحاقیه، اسناد، فاکتور، صورت‌وضعیت، تضامین، پرداخت، اختلاف، قالب و گردش تأیید |
| 🏗️ پروژه‌ها | WBS/CBS/OBS، فاز و فعالیت، زمان‌بندی (CPM)، ارزش کسب‌شده (EVM)، بهای تمام‌شده، تغییرات، ریسک، گواهی پرداخت و جریان نقدی |
| 🛒 تأمین کالا | تأمین‌کننده، کالا و واحد، درخواست خرید، سفارش، رسید کالا، فاکتور و پرداخت |
| ✉️ مکاتبات | نامهٔ ورودی/خروجی، ابلاغیه، فرم، سازمان‌های طرف مکاتبه |
| 🔔 اطلاع‌رسانی | مرکز اعلان، قالب‌های پیام‌رسان «بله»، ارسال گروهی و زمان‌بندی‌شده، ایمیل |
| 🧠 بینش | داشبورد مدیریتی، دستیار هوشمند، جستجوی سراسری |
| ⚙️ سیستم | کاربران و نقش‌ها، تنظیمات، پشتیبان‌گیری/بازیابی، ایمپورت داده، بایگانی فایل |

## پشتهٔ فناوری

| لایه | فناوری |
|---|---|
| بک‌اند | Python 3.12+ (سرور فعلی: 3.14) · Django 5.0 · DRF 3.14+ · django-filter |
| چند‌مستأجری | `django-tenants` 3.5 — یک schema مستقل PostgreSQL برای هر شرکت |
| دیتابیس | PostgreSQL 16 (بدون fallback به SQLite — عمدی) |
| صف و زمان‌بندی | Celery 5 · Redis 7 · `django-celery-beat` · `django-celery-results` |
| احراز هویت | JWT (`djangorestframework-simplejwt`) + کنترل دسترسی نقش‌محور |
| فرانت‌اند | React 18 · MUI 5.18 · TanStack Query 5 · axios · react-router 6 · i18next |
| نمودار و خروجی | Recharts · jsPDF + html2canvas · Excel (`openpyxl`) |
| تاریخ | `django-jalali` + `jdatetime` (بک‌اند) · `Intl` Persian calendar (فرانت‌اند) |
| وب‌سرور | Gunicorn + Nginx (proxy برای `/api/`، alias برای `/static/` و `/media/`) |
| تست | Django `TestCase` · Jest + React Testing Library |

---

## ماژول‌ها

۲۰ اپلیکیشن Django و بیش از **۱۵۰ مسیر فرانت‌اند**:

| ماژول | app | امکانات اصلی |
|---|---|---|
| 🧩 هسته | `core` | شرکت/دامنه (tenant)، کاربران، نقش‌ها و مجوزها، `AuditLog`، سوئیچ شرکت/برنامه/زبان |
| 👥 پرسنل | `employees` | پروندهٔ پرسنل، دپارتمان، محل خدمت، عنوان شغلی، سوابق کاری، جریمه، تغییرات استخدامی، نسخه‌های قرارداد، بیمهٔ تکمیلی، درخواست‌های HR، دستیار دانش |
| 📄 مدارک | `documents` | انواع مدرک، مدارک پرسنل (با انقضا و نسخه)، اسناد سازمانی و بایگانی |
| 🕒 حضور | `attendance` | ثبت حضور و غیاب، محاسبهٔ کارکرد |
| 🌴 مرخصی | `leaves` | درخواست و گردش تأیید مرخصی |
| 💵 حقوق | `payroll` | تراکنش‌های حقوقی، فیش حقوقی، مزایا، وام کارکنان |
| 🏛️ چارت | `orgchart` | پست‌های سازمانی و سلسله‌مراتب |
| ✉️ مکاتبات | `correspondences` | نامهٔ ورودی/خروجی، ابلاغیه، فرم، سازمان‌های طرف مکاتبه |
| 🔔 اعلان | `notifications` | مرکز اعلان، قالب‌های «بله»، ارسال گروهی، زمان‌بندی، لاگ ارسال |
| 🔄 چرخهٔ عمر | `lifecycle` | دارایی‌ها، چک‌لیست ورود/خروج، تقویم رویدادها |
| 🎯 جذب | `recruitment` | نیاز استخدامی، کاندید، مصاحبه |
| 📈 ارزیابی | `appraisal` | دورهٔ ارزیابی و رکوردهای عملکرد |
| 📁 قراردادها | `contracts` | طرف قرارداد، قرارداد، سند، فاکتور، صورت‌وضعیت، الحاقیه، تضامین، پرداخت، اختلاف، قالب، پیش‌نویس، گردش تأیید، لاگ تغییرات |
| 🏗️ پروژه‌ها | `projects` | WBS/CBS/OBS، فاز، فعالیت، تقویم کاری، CPM، EVM، بهای تمام‌شده، تغییرات، ریسک، صورت‌جلسه، گواهی پرداخت، جریان نقدی، برآورد قیمت |
| 🧾 تنخواه | `pettycash` | دسته، صندوق، تراکنش، سیاست تأیید، صورت هزینه |
| 📊 حسابداری | `accounting` | شعبه، سال مالی، دوره، سرفصل درختی، ابعاد/مراکز هزینه، سند و خطوط، اسناد خروجی، الگوی ثبت، مغایرت بانکی، گزارش‌ها، مالیات، بستن سال |
| 🏦 خزانه‌داری | `treasury` | پرداخت‌ها، دریافت/انتقال، سپرده و ضمانت، دسته‌چک، چک دریافتی/صادره |
| 🛒 تأمین | `procurement` | دستهٔ تأمین‌کننده، تأمین‌کننده، کالا و واحد، درخواست خرید، سفارش، رسید کالا، فاکتور، پرداخت |
| 🔀 نگاشت داده | `datamapping` | منابع نگاشت و ایمپورت انبوه |
| ⚙️ تنظیمات | `settings_app` | تنظیمات سیستم، پروفایل شرکت، امضاکنندگان، مخاطبین بله، مزایا/کسورات، ارز، **بایگانی فایل** |

---

## سامانهٔ بایگانی فایل (جدید)

به‌جای پراکندگی فایل‌ها در مسیرهای مختلف، همهٔ اسناد در یک ساختار واحد و قابل پیش‌بینی ذخیره می‌شوند.

### ساختار پوشه‌ها

```
{MEDIA_ROOT}/archive/company_{company_id}/{root_folder}/{entity_folder}/{sub_folder}/<uuid>.<ext>
```

```
/var/www/hrms/media/archive/company_1/employees/1001_احمدی/کارت ملی.pdf
/var/www/hrms/media/archive/company_1/contracts/C-2026-001/متن قرارداد.pdf
/var/www/hrms/media/archive/company_1/projects/PRJ-12_ساختمان/مدارک فنی/نقشه.pdf
```

### پروفایل‌های پیش‌فرض

| ماژول | `module_key` | پوشه | الگوی نام موجودیت |
|---|---|---|---|
| پرسنل | `hr.employees` | `employees` | `{code}_{last_name}` |
| قراردادها | `hrms.contracts` | `contracts` | `{number}` |
| پروژه‌ها | `hrms.projects` | `projects` | `{code}_{name}` |
| جذب و استخدام | `hrms.recruitment` | `recruitment` | `{name}` |
| اسناد سازمانی | `hrms.organization_documents` | `organization` | `{category}` |
| حقوق و دستمزد | `hrms.payroll` | `payroll` | `{year}` |
| تنخواه | `hrms.pettycash` | `pettycash` | `{year}_{month}` |
| حسابداری | `hrms.accounting` | `accounting` | `{year}` |

هر پروفایل: زیرپوشه‌های پیش‌فرض، فرمت‌های مجاز، حداکثر حجم، رنگ و ترتیب نمایش دارد و از **تنظیمات → تنظیمات عمومی → ذخیره‌سازی و فایل‌ها** قابل ویرایش است.

### آپلودهای متصل به بایگانی

| فیلد | مقصد |
|---|---|
| `documents.Document.file` | پوشهٔ همان پرسنل |
| `documents.OrganizationDocument.file` | پوشهٔ دستهٔ سند سازمانی |
| `contracts.ContractDocument.file` | پوشهٔ همان قرارداد |
| `employees.Employee.photo` | پوشهٔ همان پرسنل |
| `employees.ContractVersion.signature_image` | پوشهٔ همان پرسنل |

> اگر برای شرکتی پروفایلی فعال نباشد، آپلود با مسیر قدیمی انجام می‌شود و **هرگز شکست نمی‌خورد** (`fallback`).

### رابط API

| متد | مسیر | کار |
|---|---|---|
| `GET` | `/api/storage/overview/` | آمار کل + فهرست پروفایل‌ها |
| `GET` | `/api/storage/media-info/` | مسیر مدیا، فضای دیسک، وضعیت نوشتن |
| `GET/POST` | `/api/storage/profiles/` | فهرست/ایجاد پروفایل ماژول |
| `GET/PATCH/DELETE` | `/api/storage/profiles/{id}/` | جزئیات/ویرایش/حذف (حذف فقط اگر خالی باشد) |
| `POST` | `/api/storage/profiles/{id}/build/` | ساخت ساختار پوشه‌ها روی دیسک |
| `GET/POST` | `/api/storage/profiles/{id}/folders/` | فهرست/ساخت پوشهٔ موجودیت |
| `GET` | `/api/storage/browse/?path=...` | مرور پوشه‌ها و فایل‌ها (حجم، تاریخ، لینک) |
| `DELETE` | `/api/storage/files/?path=...` | حذف یک فایل از بایگانی |
| `DELETE` | `/api/storage/folders/{id}/` | حذف پوشهٔ ثبت‌شده (`?force=1`) |
| `POST` | `/api/storage/ensure/` | سایر ماژول‌ها پوشهٔ موجودیت خود را بسازند |

مرور فایل‌ها فقط داخل `archive/` مجاز است و مسیرها با محافظت از **path traversal** اعتبارسنجی می‌شوند.

### انتقال فایل‌های قدیمی

```bash
cd /opt/hrms/hrms_project

# پیش‌نمایش (هیچ فایلی جابه‌جا نمی‌شود)
sudo -u hrms env DJANGO_SETTINGS_MODULE=hrms_project.settings.production \
  /opt/hrms/venv/bin/python manage.py archive_existing_files

# اجرای واقعی
... manage.py archive_existing_files --apply

# محدود به یک بخش
... manage.py archive_existing_files --module contracts --apply
```

> دستور چند‌مستأجری است: اگر روی schema `public` اجرا شود، خودش روی همهٔ شرکت‌ها می‌چرخد. برای یک شرکت خاص از `tenant_command ... --schema=<name> -- --apply` استفاده کنید.

### پنل مدیریت بایگانی

- کارت‌های آمار: حجم کل، تعداد فایل، تعداد ماژول، فضای آزاد دیسک
- جدول ماژول‌ها با **کپی مسیر سرور** و نوار سهم هر ماژول از حجم
- **مرورگر بایگانی:** breadcrumb، جستجو، ساخت پوشهٔ موجودیت، مشاهدهٔ فایل‌ها با حجم و تاریخ شمسی، پیش‌نمایش، دانلود و حذف

---

## نصب و راه‌اندازی

### پیش‌نیازها

| ابزار | نسخهٔ پیشنهادی |
|---|---|
| Ubuntu Server | 26.04 LTS |
| Python | 3.12+ (روی سرور فعلی 3.14) |
| PostgreSQL | 16 |
| Redis | 7+ |
| Node.js | 20 LTS |
| Nginx + Gunicorn | آخرین نسخه |

> روی ویندوز فقط برای توسعهٔ فرانت‌اند و اجرای اسکریپت استقرار لازم است.

### محیط توسعه

```bash
# ۱) بک‌اند
cd hrms_project
python3 -m venv venv
source venv/bin/activate            # ویندوز: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env          # مقادیر DB و SECRET_KEY را پر کنید
export DJANGO_SETTINGS_MODULE=hrms_project.settings.development

python manage.py migrate            # ساخت جداول
python manage.py setup_dev          # کاربر admin/admin123 + شرکت و دادهٔ نمونه
python manage.py runserver          # http://localhost:8000
```

```bash
# ۲) فرانت‌اند
cd frontend
npm install
npm start                           # http://localhost:3000
```

> **PostgreSQL الزامی است.** پروژه به‌صورت عمدی هیچ fallback به SQLite ندارد.

### چند‌مستأجری واقعی

```bash
python manage.py migrate_schemas --shared          # جداول مشترک (public)
python manage.py create_tenant \
  --name="شرکت نمونه" --code=demo --domain=demo.localhost
python manage.py migrate_schemas                   # مهاجرت همهٔ شرکت‌ها
```

### محیط تولید

```bash
sudo bash deploy.sh        # نصب کامل: PostgreSQL، Redis، Nginx، Gunicorn، build فرانت‌اند
```

جزئیات گام‌به‌گام: [INSTALLATION.md](INSTALLATION.md)

---

## متغیرهای محیطی (`.env`)

| کلید | پیش‌فرض | توضیح |
|---|---|---|
| `SECRET_KEY` | — | **الزامی**. کلید امنیتی Django |
| `ENCRYPTION_KEY` | — | کلید رمزنگاری موتور ذخیره‌سازی فایل |
| `DEBUG` | `False` | در تولید همیشه `False` |
| `ALLOWED_HOSTS` | `localhost` | فهرست دامنه‌ها با کاما |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `hrms_db` / `hrms_user` / — | اتصال PostgreSQL |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | |
| `REDIS_CACHE_URL` | `redis://localhost:6379/1` | کش |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | بروکر Celery |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | نتایج Celery |
| `STATIC_ROOT` | `/var/www/hrms/static/` | مقصد `collectstatic` |
| `MEDIA_ROOT` | `/var/www/hrms/media/` | ریشهٔ فایل‌ها و بایگانی |
| `BASE_FILE_STORAGE_PATH` | `/var/hr_data/` | مسیر قدیمی ذخیره‌سازی فایل |
| `SSL_ENABLED` | `False` | فعال‌سازی HTTPS/HSTS |
| `CORS_ALLOWED_ORIGINS` | — | دامنه‌های مجاز در تولید |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | `smtp.gmail.com` / `587` / `True` | SMTP |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | — | اعتبارنامهٔ ایمیل |
| `DEFAULT_FROM_EMAIL` / `ADMIN_EMAIL` | `noreply@...` | فرستنده و مدیر |
| `FRONTEND_URL` | — | آدرس فرانت‌اند برای لینک‌های ایمیل |

---

## استقرار و به‌روزرسانی

### نصب اولیه (یک‌بار، روی سرور)

```bash
sudo bash deploy.sh
```

نصب پیش‌نیازهای سیستم‌عامل، ساخت کاربر سرویس، دیتابیس، build فرانت‌اند، سرویس‌های `gunicorn/celery/nginx` و cron پشتیبان‌گیری.

### به‌روزرسانی افزایشی (از ویندوز)

```powershell
.\deploy-update.ps1 -Archive -LocalBuild -NoBuild -Migrate
```

| سوئیچ | کار |
|---|---|
| `-Archive` | انتقال همهٔ فایل‌ها با یک آرشیو (کمترین تعداد پرسش رمز sudo) |
| `-LocalBuild` | استفاده از build ساخته‌شده روی ویندوز |
| `-NoBuild` | رد کردن `npm run build` |
| `-Migrate` | اجرای `migrate_schemas` روی همهٔ شرکت‌ها |
| `-MoveFiles` | انتقال فایل‌های موجود به ساختار `archive/` (یک‌بار) |
| `-SkipBackend` / `-SkipFrontend` | انتقال فقط یک بخش |
| `-CheckOnly` | فقط بررسی اتصال و مجوزها، بدون تغییر |
| `-User` / `-Server` / `-AppDir` | مقادیر اتصال (پیش‌فرض: `hradmin@192.168.1.63`، `/opt/hrms`) |

اسکریپت به‌صورت خودکار:
1. فایل‌های جدید مخزن که روی سرور نیستند را به بسته اضافه می‌کند
2. مدل‌ها را با migrationهای سرور همگام بررسی می‌کند (`makemigrations --check`)
3. بسته‌های پایتونی جدید را **آفلاین** از `_transfer/wheels` نصب می‌کند
4. اَسِت‌های build را به `/var/www/hrms/static` کپی و نسخه‌های قدیمی را پاک‌سازی می‌کند
5. سرویس‌ها را ری‌استارت و وضعیت را تأیید می‌کند

### سرور بدون اینترنت

- وابستگی‌های جدید را با `pip download` روی سیستم متصل در `_transfer/wheels` بگذارید؛ اسکریپت با `pip install --no-index` نصب می‌کند.
- فرانت‌اند با `-LocalBuild -NoBuild` منتقل می‌شود (روی سرور `npm install` اجرا نمی‌شود).

### پشتیبان‌گیری

```bash
sudo bash backup.sh        # دیتابیس + پوشهٔ مدیا (cron روزانه در deploy.sh)
```

از داخل برنامه هم: **تنظیمات → پشتیبان‌گیری** (`/api/backup/list|create|restore|wipe/`).

راهنمای عملیات روزمره: [SERVER_UPDATE.md](SERVER_UPDATE.md)

---

## ساختار پروژه

```
kian-erp/
├── deploy.sh                  ← نصب اولیه روی Ubuntu
├── deploy-update.ps1          ← استقرار افزایشی از ویندوز
├── backup.sh                  ← پشتیبان‌گیری دیتابیس + مدیا
├── .env.example               ← نمونهٔ متغیرهای محیطی
├── docs/intro.html            ← معرفی گرافیکی (فونت وزیر · RTL)
├── hrms_project/              ← بک‌اند Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── hrms_project/          ← settings (base/production/development), urls, wsgi, celery
│   ├── core/                  ← هسته: شرکت/دامنه، کاربران، نقش‌ها، AuditLog
│   │   └── engines/           ← authentication, permission, company, file_storage,
│   │                             archive_storage, encryption, import, search, analytics, assistant
│   ├── employees/ …           ← ۲۰ اپ ماژول (پرسنل، قرارداد، پروژه، حسابداری، …)
│   ├── settings_app/          ← تنظیمات سیستم + بایگانی فایل (StorageProfile/ArchiveFolder)
│   ├── templates/ locale/ media/ static/ logs/
│   └── media/archive/         ← بایگانی فایل‌ها (در تولید: /var/www/hrms/media/archive)
└── frontend/                  ← React 18 + MUI 5
    ├── src/core/              ← api, components, config, hooks, utils
    ├── src/pages/             ← صفحه‌ها (۱۵۰+ مسیر)
    └── build/                 ← خروجی بیلد
```

> نام‌های فنی `hrms_project/`، `/opt/hrms`، `hrms_db`، `hrms_user` و سرویس‌های `hrms` تاریخی‌اند و برای سازگاری تغییر نکرده‌اند؛ **نام محصول Kian ERP است**.

### موتورهای هسته

| موتور | کار |
|---|---|
| `authentication_engine` | ورود، انتخاب شرکت، صدور JWT |
| `permission_engine` | مجوزهای نقش‌محور |
| `company_engine` | ساخت/مدیریت tenant و schema |
| `file_storage_engine` | ذخیره‌سازی قدیمی فایل کارکنان |
| `archive_storage_engine` | بایگانی ماژول‌محور (جدید) |
| `encryption_engine` | رمزنگاری داده‌های حساس |
| `import_engine` | ایمپورت انبوه از Excel |
| `search_engine` | جستجوی سراسری |
| `analytics_engine` / `assistant_engine` | داشبورد BI و دستیار هوشمند |

---

## چند‌مستأجری و امنیت

- **جداسازی داده:** هر شرکت یک schema مستقل PostgreSQL دارد (`django-tenants`، `TENANT_MODEL = core.Company`). اپ‌های ماژول در `TENANT_APPS` و مدل‌های مشترک در `SHARED_APPS` تعریف شده‌اند.
- **مسیریابی:** بر اساس دامنه (`Domain`) یا انتخاب شرکت در ورود (`company_id`).
- **احراز هویت:** JWT (SimpleJWT) با access/refresh؛ توکن در هر درخواست بررسی می‌شود.
- **مجوزها:** نقش + کلیدهای مجوز (`RolePermission`) با مقادیر پیش‌فرض در `core/models/user.py`.
- **ممیزی:** `AuditLog` برای ورود و تغییرات؛ مدل‌های پایه از `AuditableModel` با حذف نرم ارث می‌برند.
- **فایل‌ها:** اعتبارسنجی پسوند و حجم، نام‌گذاری امن پوشه‌ها، محافظت از path traversal در همهٔ مسیرهای بایگانی.
- **سخت‌سازی:** `django-ratelimit` روی مسیرهای حساس، CORS محدود، `SSL_ENABLED` برای HSTS/کوکی امن، `DEBUG=False` در تولید.

## نقش‌ها و دسترسی‌ها (RBAC)

| نقش | شرح |
|---|---|
| `super_admin` | مدیر ارشد سیستم — دسترسی کامل، مدیریت شرکت‌ها |
| `hr_manager` | مدیر منابع انسانی — مدیریت کاربران، تنظیمات و پرونده‌ها |
| `hr_specialist` | کارشناس منابع انسانی — عملیات روزمرهٔ پرسنلی |
| `department_head` | مدیر دپارتمان — مشاهدهٔ تیم و تأییدها |
| `employee` | کارمند — مشاهدهٔ اطلاعات و درخواست‌های خود |

کلیدهای مجوز: `can_manage_companies` · `can_manage_users` · `can_manage_roles` · `can_edit_settings` · `can_view_all_employees` · `can_add_employee` · `can_change_employee` · `can_delete_employee` · `can_view_sensitive_data`

> پیش‌فرض‌ها در کد هستند و از **تنظیمات → نقش‌ها** قابل بازتعریف‌اند.

---

## رابط API

- پیشوند همهٔ مسیرها: `/api/`
- احراز هویت: `Authorization: Bearer <access_token>`
- صفحه‌بندی: `page` و `page_size` (پیش‌فرض ۱۰۰)
- فیلتر/جستجو/مرتب‌سازی: `django-filter` + `search` + `ordering`

```bash
# ورود
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123", "company_id": 1}'

# درخواست احراز‌شده
curl http://localhost:8000/api/employees/ \
  -H "Authorization: Bearer <access_token>"
```

| گروه | نمونهٔ مسیر |
|---|---|
| احراز هویت و شرکت | `/api/auth/login/` · `/api/auth/me/` · `/api/companies/switch/` |
| زبان و برنامه | `/api/languages/switch/` · `/api/applications/switch/` |
| پرسنل و عملیات | `/api/employees/` · `/api/departments/` · `/api/attendance/` · `/api/leaves/` |
| مالی | `/api/payroll/` · `/api/accounting/` · `/api/treasury/` · `/api/pettycash/` |
| قرارداد و پروژه | `/api/contracts/` · `/api/projects/` · `/api/procurement/` |
| مدارک و بایگانی | `/api/documents/` · `/api/organization-documents/` · `/api/storage/...` |
| اعلان و مکاتبات | `/api/notifications/` · `/api/bale-contacts/` · `/api/letters/` |
| سیستم | `/api/users/` · `/api/settings/` · `/api/backup/` · `/api/import/` · `/api/search/` |

---

## تست و کیفیت کد

```bash
# بک‌اند
cd hrms_project
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test                       # همهٔ تست‌ها
python manage.py test employees projects    # یک یا چند اپ

# فرانت‌اند
cd ../frontend
npm run build                               # بیلد تولید (هم‌زمان ESLint)
npm test
npm run lint:defs                           # بررسی تعاریف/ایمپورت‌های بلااستفاده
```

---

## عیب‌یابی سریع

| نشانه | علت احتمالی | راه‌حل |
|---|---|---|
| `502 Bad Gateway` | Gunicorn بالا نیامده | `sudo journalctl -u gunicorn -n 80 --no-pager` |
| `relation "..." does not exist` | migration اجرا نشده یا schema اشتباه | `python manage.py migrate_schemas` |
| `No module named 'x'` | فایل/بستهٔ جدید منتقل نشده | `deploy-update.ps1 -Archive` (نصب آفلاین از `_transfer/wheels`) |
| صفحهٔ قدیمی می‌ماند | کش `index.html` | `Ctrl+Shift+R` |
| آپلود در پوشهٔ بایگانی نمی‌رود | پروفایل ماژول فعال نیست | تنظیمات → ذخیره‌سازی و فایل‌ها → بررسی/ساخت ساختار |
| `No space left on device` | انباشت build/static قدیمی | پاک‌سازی `/var/www/hrms/static/js` (اسکریپت خودکار انجام می‌دهد) |
| خطای `sudo` هنگام استقرار | رمز sudo لازم است | همان لحظه رمز کاربر SSH را وارد کنید |

---

## مستندات مرتبط

| فایل | موضوع |
|---|---|
| [INSTALLATION.md](INSTALLATION.md) | نصب کامل روی Ubuntu (تولید) |
| [SERVER_UPDATE.md](SERVER_UPDATE.md) | به‌روزرسانی، عیب‌یابی و rollback سرور |
| [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) | انتقال دیتابیس بین سرورها |
| [docs/intro.html](docs/intro.html) | معرفی گرافیکی (RTL) |

---

## مجوز

حقوق معنوی محفوظ است. استفادهٔ تجاری و بازتوزیع نیاز به مجوز کتبی دارد.

---

# 🇬🇧 English

## Contents

| Section | Section | Section |
|---|---|---|
| [Overview](#overview) | [Why Kian ERP?](#why-kian-erp) | [Modules](#modules) |
| [File Archive](#file-archive-new) | [Installation](#installation) | [Environment](#environment-variables) |
| [Deployment](#deployment--updates) | [Project layout](#project-layout) | [Security](#multi-tenancy--security) |
| [Roles](#roles--permissions-rbac) | [API](#api) | [Testing](#testing--code-quality) |
| [Troubleshooting](#troubleshooting) | | |

## Overview

**Kian ERP** is the integrated business management platform for Kian: a multi-tenant system that connects every organizational process in one database and one user experience — from hiring, attendance and payroll to contracts, projects, procurement, treasury, accounting and financial reporting.

> **From HRMS to Kian ERP** — the platform started as an HR system, but its scope is now complete: **20 integrated modules** covering the full business cycle, not just employee files. Each company (tenant) owns an isolated PostgreSQL schema and chooses which modules to enable.

## Why Kian ERP?

| Capability | Business value |
|---|---|
| 🔗 **True integration** | Hiring → attendance → payroll → journal entry, with no re-entry and no spreadsheet bridges |
| 🧮 **Single source of truth** | One database and one shared data model across modules; reports always reconcile |
| 🏘️ **Native multi-tenancy** | An isolated schema per company — built for holdings and multi-company groups |
| 📊 **Complete finance** | Double-entry accounting, treasury, petty cash, cheques and guarantees, tax, financial statements |
| 🏗️ **Project controls** | WBS/CBS/OBS, CPM, EVM, cost control, change orders, risk, payment certificates |
| 📁 **Structured archive** | A dedicated folder per employee/contract, browsable and downloadable from Settings |
| 🇮🇷 **Persian-first** | Jalali calendar, full RTL and a bilingual FA/EN interface |
| 🧩 **Extensible** | Unified API, independent engines and enable/disable-able modules |

- 🏗️ **Architecture:** Django 5 + DRF + PostgreSQL (schema-per-tenant) + Celery/Redis + React 18
- 🗣️ **Bilingual:** Persian (default, RTL) and English — switchable at runtime
- 📅 **Jalali calendar:** two-way conversion on the backend (`django-jalali`) and frontend (`Intl` Persian calendar)
- 🗂️ **Structured file archive:** a dedicated folder per employee/contract, browsable, downloadable and manageable from Settings
- 🔐 **Role-based access:** 5 built-in roles plus database-driven permission overrides
- 🧾 **Auditability:** global `AuditLog` plus soft delete on base models

### 🆕 What's new

- 🗂️ **Module-based file archive** with a dedicated folder per entity
- 📎 Uploads wired automatically (employee documents, contract documents, organization documents, employee photo and signature) into the entity's own folder
- 🧰 `archive_existing_files` command to migrate legacy files — tenant-aware and idempotent
- 🎨 Redesigned **Storage & Files** panel: statistics, copy-path, and a file browser with preview/download/delete

### Key features

| Area | Capabilities |
|---|---|
| 👥 HR | 360° employee profile, departments/sites/job titles, work history, penalties, employment changes, contract versioning, supplementary insurance, HR requests |
| 🕒 Operations | Attendance, leave requests, org chart, assets & onboarding/offboarding checklists, event calendar |
| 🎯 Hiring & reviews | Job requisitions, candidates, interviews, appraisal cycles |
| 💰 Finance | Payslips, benefits/deductions, employee loans, petty cash, treasury, cheques, deposits & guarantees |
| 📊 Accounting | Fiscal year & periods, hierarchical chart of accounts, journal entries, opening/closing documents, bank reconciliation, financial reports, tax, year-end close |
| 📁 Contracts | Parties, contracts & addendums, documents, invoices, statements, guarantees, payments, disputes, templates, approval workflow |
| 🏗️ Projects | WBS/CBS/OBS, phases & activities, CPM scheduling, earned value (EVM), cost control, change orders, risk register, payment certificates, cash flow |
| 🛒 Procurement | Suppliers, items & units, purchase requests, orders, goods receipts, invoices, payments |
| ✉️ Correspondence | Incoming/outgoing letters, announcements, forms, external organizations |
| 🔔 Notifications | Notification center, Bale messenger templates, bulk & scheduled sending, email |
| 🧠 Insight | Management dashboards, AI-style assistant, global search |
| ⚙️ System | Users & roles, settings, backup/restore, data import, file archive |

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12+ (server: 3.14) · Django 5.0 · DRF 3.14+ · django-filter |
| Multi-tenancy | `django-tenants` 3.5 — one PostgreSQL schema per company |
| Database | PostgreSQL 16 (no SQLite fallback by design) |
| Queue & scheduling | Celery 5 · Redis 7 · `django-celery-beat` · `django-celery-results` |
| Authentication | JWT (`djangorestframework-simplejwt`) + role-based permissions |
| Frontend | React 18 · MUI 5.18 · TanStack Query 5 · axios · react-router 6 · i18next |
| Charts & exports | Recharts · jsPDF + html2canvas · Excel (`openpyxl`) |
| Dates | `django-jalali` + `jdatetime` (backend) · `Intl` Persian calendar (frontend) |
| Web server | Gunicorn + Nginx (`/api/` proxy, `/static/` and `/media/` aliases) |
| Testing | Django `TestCase` · Jest + React Testing Library |

---

## Modules

20 Django apps and **150+ frontend routes**:

| Module | app | Highlights |
|---|---|---|
| 🧩 Core | `core` | Company/domain (tenant), users, roles & permissions, `AuditLog`, company/app/language switching |
| 👥 Employees | `employees` | Employee profile, departments, work sites, job titles, work history, penalties, employment changes, contract versions, supplementary insurance, HR requests |
| 📄 Documents | `documents` | Document types, employee documents (expiry + versioning), organization documents |
| 🕒 Attendance | `attendance` | Check-in/out records and worked-hours calculation |
| 🌴 Leave | `leaves` | Leave requests with approval flow |
| 💵 Payroll | `payroll` | Payroll transactions, payslips, benefits, employee loans |
| 🏛️ Org chart | `orgchart` | Organizational positions and hierarchy |
| ✉️ Correspondence | `correspondences` | Incoming/outgoing letters, announcements, forms, organizations |
| 🔔 Notifications | `notifications` | Notification center, Bale templates, bulk sending, scheduling, delivery logs |
| 🔄 Lifecycle | `lifecycle` | Assets, onboarding/offboarding checklists, event calendar |
| 🎯 Recruitment | `recruitment` | Job requisitions, candidates, interviews |
| 📈 Appraisal | `appraisal` | Appraisal cycles and performance records |
| 📁 Contracts | `contracts` | Parties, contracts, documents, invoices, statements, addendums, guarantees, payments, disputes, templates, drafts, approval workflow, change log |
| 🏗️ Projects | `projects` | WBS/CBS/OBS, phases, activities, work calendars, CPM, EVM, cost control, change orders, risk register, measurement sheets, payment certificates, cash flow, price lists |
| 🧾 Petty cash | `pettycash` | Categories, funds, transactions, approval policies, expense statements |
| 📊 Accounting | `accounting` | Branches, fiscal year & periods, chart of accounts, cost centers, journal entries, opening/closing documents, posting templates, bank reconciliation, reports, tax, year-end close |
| 🏦 Treasury | `treasury` | Payments, receipts/transfers, deposits & guarantees, cheque books, received/issued cheques |
| 🛒 Procurement | `procurement` | Supplier categories & suppliers, items & units, purchase requests, orders, goods receipts, invoices, payments |
| 🔀 Data mapping | `datamapping` | Mapping sources and bulk import |
| ⚙️ Settings | `settings_app` | System settings, company profile, signatories, Bale contacts, additions/deductions, currencies, **file archive** |

---

## File archive (new)

Instead of scattering uploads across ad-hoc paths, every document now lands in a single, predictable structure.

### Folder layout

```
{MEDIA_ROOT}/archive/company_{company_id}/{root_folder}/{entity_folder}/{sub_folder}/<uuid>.<ext>
```

```
/var/www/hrms/media/archive/company_1/employees/1001_Ahmadi/national-id.pdf
/var/www/hrms/media/archive/company_1/contracts/C-2026-001/contract-text.pdf
/var/www/hrms/media/archive/company_1/projects/PRJ-12_Building/technical/plan.pdf
```

### Default profiles

| Module | `module_key` | Folder | Entity pattern |
|---|---|---|---|
| Employees | `hr.employees` | `employees` | `{code}_{last_name}` |
| Contracts | `hrms.contracts` | `contracts` | `{number}` |
| Projects | `hrms.projects` | `projects` | `{code}_{name}` |
| Recruitment | `hrms.recruitment` | `recruitment` | `{name}` |
| Organization documents | `hrms.organization_documents` | `organization` | `{category}` |
| Payroll | `hrms.payroll` | `payroll` | `{year}` |
| Petty cash | `hrms.pettycash` | `pettycash` | `{year}_{month}` |
| Accounting | `hrms.accounting` | `accounting` | `{year}` |

Each profile also defines default sub-folders, allowed extensions, max file size, colour and display order — all editable from **Settings → General → Storage & Files**.

### Uploads wired to the archive

| Field | Destination |
|---|---|
| `documents.Document.file` | The employee's own folder |
| `documents.OrganizationDocument.file` | The category folder |
| `contracts.ContractDocument.file` | The contract's own folder |
| `employees.Employee.photo` | The employee's own folder |
| `employees.ContractVersion.signature_image` | The employee's own folder |

> If no active profile exists for a company, uploads transparently fall back to the legacy paths — they never fail.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/storage/overview/` | Totals plus profile list |
| `GET` | `/api/storage/media-info/` | Media root, disk usage, writability |
| `GET/POST` | `/api/storage/profiles/` | List/create module profiles |
| `GET/PATCH/DELETE` | `/api/storage/profiles/{id}/` | Detail/update/delete (delete only when empty) |
| `POST` | `/api/storage/profiles/{id}/build/` | Create the folder structure on disk |
| `GET/POST` | `/api/storage/profiles/{id}/folders/` | List/create entity folders |
| `GET` | `/api/storage/browse/?path=...` | Browse folders and files (size, date, URL) |
| `DELETE` | `/api/storage/files/?path=...` | Delete a single archived file |
| `DELETE` | `/api/storage/folders/{id}/` | Delete a registered entity folder (`?force=1`) |
| `POST` | `/api/storage/ensure/` | Other modules create their entity folder |

Browsing is restricted to `archive/` and every path is validated against **path traversal**.

### Migrating existing files

```bash
cd /opt/hrms/hrms_project

# Dry run (nothing is moved)
sudo -u hrms env DJANGO_SETTINGS_MODULE=hrms_project.settings.production \
  /opt/hrms/venv/bin/python manage.py archive_existing_files

# Apply
... manage.py archive_existing_files --apply

# Limit to one area
... manage.py archive_existing_files --module contracts --apply
```

> The command is tenant-aware: when executed on the `public` schema it iterates every company schema automatically. Use `tenant_command ... --schema=<name> -- --apply` for a single tenant.

### Archive panel

- Stat cards: total size, file count, module count, free disk space
- Module table with **copy server path** and a per-module size share bar
- **Archive browser:** breadcrumbs, in-folder search, entity-folder creation, file list with size and Jalali date, preview, download and delete

---

## Installation

### Requirements

| Tool | Recommended |
|---|---|
| Ubuntu Server | 26.04 LTS |
| Python | 3.12+ (current server: 3.14) |
| PostgreSQL | 16 |
| Redis | 7+ |
| Node.js | 20 LTS |
| Nginx + Gunicorn | latest |

> Windows is only needed for frontend development and running the deployment script.

### Development

```bash
# 1) Backend
cd hrms_project
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env          # fill in DB credentials and SECRET_KEY
export DJANGO_SETTINGS_MODULE=hrms_project.settings.development

python manage.py migrate            # create tables
python manage.py setup_dev          # admin/admin123 + demo company and sample data
python manage.py runserver          # http://localhost:8000
```

```bash
# 2) Frontend
cd frontend
npm install
npm start                           # http://localhost:3000
```

> **PostgreSQL is mandatory.** There is intentionally no SQLite fallback.

### Real multi-tenancy

```bash
python manage.py migrate_schemas --shared          # shared (public) tables
python manage.py create_tenant \
  --name="Demo Company" --code=demo --domain=demo.localhost
python manage.py migrate_schemas                   # migrate every tenant
```

### Production

```bash
sudo bash deploy.sh        # installs PostgreSQL, Redis, Nginx, Gunicorn and builds the frontend
```

Step-by-step guide: [INSTALLATION.md](INSTALLATION.md)

---

## Environment variables

| Key | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | **Required.** Django secret key |
| `ENCRYPTION_KEY` | — | Encryption key for the file storage engine |
| `DEBUG` | `False` | Always `False` in production |
| `ALLOWED_HOSTS` | `localhost` | Comma-separated hostnames |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `hrms_db` / `hrms_user` / — | PostgreSQL connection |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | |
| `REDIS_CACHE_URL` | `redis://localhost:6379/1` | Cache |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | Celery results |
| `STATIC_ROOT` | `/var/www/hrms/static/` | `collectstatic` target |
| `MEDIA_ROOT` | `/var/www/hrms/media/` | Uploads and archive root |
| `BASE_FILE_STORAGE_PATH` | `/var/hr_data/` | Legacy file storage path |
| `SSL_ENABLED` | `False` | Enables HTTPS/HSTS enforcement |
| `CORS_ALLOWED_ORIGINS` | — | Allowed origins in production |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | `smtp.gmail.com` / `587` / `True` | SMTP |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | — | SMTP credentials |
| `DEFAULT_FROM_EMAIL` / `ADMIN_EMAIL` | `noreply@...` | Sender and admin address |
| `FRONTEND_URL` | — | Public frontend URL for email links |

---

## Deployment & updates

### First-time provisioning (on the server)

```bash
sudo bash deploy.sh
```

Installs dependencies, creates the service user, database, frontend build, `gunicorn/celery/nginx` services and the daily backup cron job.

### Incremental update (from Windows)

```powershell
.\deploy-update.ps1 -Archive -LocalBuild -NoBuild -Migrate
```

| Switch | Purpose |
|---|---|
| `-Archive` | Ship everything in one archive (fewest sudo password prompts) |
| `-LocalBuild` | Use the frontend build produced on Windows |
| `-NoBuild` | Skip `npm run build` |
| `-Migrate` | Run `migrate_schemas` across all companies |
| `-MoveFiles` | Move existing media into the `archive/` structure (one-off) |
| `-SkipBackend` / `-SkipFrontend` | Transfer only one side |
| `-CheckOnly` | Verify connectivity and sudo rights only, change nothing |
| `-User` / `-Server` / `-AppDir` | Connection settings (defaults: `hradmin@192.168.1.63`, `/opt/hrms`) |

The script automatically:
1. Adds repository files that are missing on the server to the transfer set
2. Verifies models match the server's migrations (`makemigrations --check`)
3. Installs new Python packages **fully offline** from `_transfer/wheels`
4. Copies build assets to `/var/www/hrms/static` and prunes outdated bundles
5. Restarts services and prints a final health check

### Offline servers

- Download new wheels on a connected machine into `_transfer/wheels`; the script installs them with `pip install --no-index`.
- Transfer the frontend with `-LocalBuild -NoBuild` (no `npm install` ever runs on the server).

### Backups

```bash
sudo bash backup.sh        # database + media (daily cron is configured by deploy.sh)
```

Also available in-app: **Settings → Backup** (`/api/backup/list|create|restore|wipe/`).

Day-to-day operations guide: [SERVER_UPDATE.md](SERVER_UPDATE.md)

---

## Project layout

```
kian-erp/
├── deploy.sh                  ← first-time provisioning on Ubuntu
├── deploy-update.ps1          ← incremental deployment from Windows
├── backup.sh                  ← database + media backup
├── .env.example               ← environment template
├── docs/intro.html            ← graphical introduction (Vazir font, RTL)
├── hrms_project/              ← Django backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── hrms_project/          ← settings (base/production/development), urls, wsgi, celery
│   ├── core/                  ← company/domain, users, roles, AuditLog
│   │   └── engines/           ← authentication, permission, company, file_storage,
│   │                             archive_storage, encryption, import, search, analytics, assistant
│   ├── employees/ …           ← 20 module apps (HR, contracts, projects, accounting, …)
│   ├── settings_app/          ← system settings + file archive (StorageProfile/ArchiveFolder)
│   ├── templates/ locale/ media/ static/ logs/
│   └── media/archive/         ← archived files (production: /var/www/hrms/media/archive)
└── frontend/                  ← React 18 + MUI 5
    ├── src/core/              ← api, components, config, hooks, utils
    ├── src/pages/             ← screens (150+ routes)
    └── build/                 ← production build output
```

> The technical names `hrms_project/`, `/opt/hrms`, `hrms_db`, `hrms_user` and the `hrms` services are historical and were kept for compatibility; the **product name is Kian ERP**.

### Core engines

| Engine | Responsibility |
|---|---|
| `authentication_engine` | Login, company selection, JWT issuance |
| `permission_engine` | Role-based permission resolution |
| `company_engine` | Tenant and schema creation/management |
| `file_storage_engine` | Legacy employee file storage |
| `archive_storage_engine` | Module-based file archive (new) |
| `encryption_engine` | Sensitive data encryption |
| `import_engine` | Bulk Excel import |
| `search_engine` | Global search |
| `analytics_engine` / `assistant_engine` | BI dashboards and the in-app assistant |

---

## Multi-tenancy & security

- **Data isolation:** each company gets its own PostgreSQL schema (`django-tenants`, `TENANT_MODEL = core.Company`). Module apps live in `TENANT_APPS`; shared models live in `SHARED_APPS`.
- **Routing:** by domain (`Domain`) or by choosing a company at login (`company_id`).
- **Authentication:** JWT (SimpleJWT) with access/refresh tokens validated on every request.
- **Authorization:** role plus granular permission keys (`RolePermission`) with defaults in `core/models/user.py`.
- **Auditing:** `AuditLog` records logins and changes; base models inherit `AuditableModel` with soft delete.
- **Files:** extension and size validation, safe folder names, path-traversal protection on every archive endpoint.
- **Hardening:** `django-ratelimit` on sensitive endpoints, restricted CORS, `SSL_ENABLED` for HSTS/secure cookies, `DEBUG=False` in production.

## Roles & permissions (RBAC)

| Role | Description |
|---|---|
| `super_admin` | System owner — full access, manages companies |
| `hr_manager` | HR manager — users, settings and employee files |
| `hr_specialist` | HR specialist — day-to-day HR operations |
| `department_head` | Department head — team visibility and approvals |
| `employee` | Employee — own data and requests |

Permission keys: `can_manage_companies` · `can_manage_users` · `can_manage_roles` · `can_edit_settings` · `can_view_all_employees` · `can_add_employee` · `can_change_employee` · `can_delete_employee` · `can_view_sensitive_data`

> Defaults live in code and can be overridden from **Settings → Roles**.

---

## API

- Base prefix: `/api/`
- Authentication: `Authorization: Bearer <access_token>`
- Pagination: `page` and `page_size` (default 100)
- Filtering/search/ordering: `django-filter` + `search` + `ordering`

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123", "company_id": 1}'

# Authenticated request
curl http://localhost:8000/api/employees/ \
  -H "Authorization: Bearer <access_token>"
```

| Group | Example endpoints |
|---|---|
| Auth & companies | `/api/auth/login/` · `/api/auth/me/` · `/api/companies/switch/` |
| Language & apps | `/api/languages/switch/` · `/api/applications/switch/` |
| People & operations | `/api/employees/` · `/api/departments/` · `/api/attendance/` · `/api/leaves/` |
| Finance | `/api/payroll/` · `/api/accounting/` · `/api/treasury/` · `/api/pettycash/` |
| Contracts & projects | `/api/contracts/` · `/api/projects/` · `/api/procurement/` |
| Documents & archive | `/api/documents/` · `/api/organization-documents/` · `/api/storage/...` |
| Notifications & mail | `/api/notifications/` · `/api/bale-contacts/` · `/api/letters/` |
| System | `/api/users/` · `/api/settings/` · `/api/backup/` · `/api/import/` · `/api/search/` |

---

## Testing & code quality

```bash
# Backend
cd hrms_project
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test                       # all tests
python manage.py test employees projects    # one or more apps

# Frontend
cd ../frontend
npm run build                               # production build (runs ESLint)
npm test
npm run lint:defs                           # detect unused definitions/imports
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` | Gunicorn is down | `sudo journalctl -u gunicorn -n 80 --no-pager` |
| `relation "..." does not exist` | Migration not applied or wrong schema | `python manage.py migrate_schemas` |
| `No module named 'x'` | File/package not transferred | `deploy-update.ps1 -Archive` (offline install from `_transfer/wheels`) |
| Stale UI | Cached `index.html` | `Ctrl+Shift+R` |
| Uploads not landing in the archive | Module profile inactive | Settings → Storage & Files → build structure |
| `No space left on device` | Accumulated old builds/static | The deploy script prunes `/var/www/hrms/static` automatically |
| `sudo` prompt during deployment | Interactive password required | Enter the SSH user's password when prompted |

---

## Documentation

| File | Topic |
|---|---|
| [INSTALLATION.md](INSTALLATION.md) | Full Ubuntu production setup |
| [SERVER_UPDATE.md](SERVER_UPDATE.md) | Server updates, troubleshooting, rollback |
| [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) | Moving the database between servers |
| [docs/intro.html](docs/intro.html) | Graphical introduction (RTL) |

---

## License

All intellectual property rights reserved. Commercial use and redistribution require written permission.

