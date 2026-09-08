<div align="center">

# 🏢 HRMS 2026 — سامانهٔ جامع مدیریت منابع انسانی

**Human Resource Management System · Multi-Tenant · Multi-Language · Enterprise Ready**

[![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white&style=for-the-badge)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.15-red?logo=django&logoColor=white&style=for-the-badge)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://reactjs.org/)
[![Material UI](https://img.shields.io/badge/MUI-6-007FFF?logo=mui&logoColor=white&style=for-the-badge)](https://mui.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white&style=for-the-badge)](https://redis.io/)

[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white&style=for-the-badge)](https://docs.celeryq.dev/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white&style=for-the-badge)](https://jwt.io/)
[![Nginx](https://img.shields.io/badge/Nginx-+1.24-009639?logo=nginx&logoColor=white&style=for-the-badge)](https://nginx.org/)
[![Gunicorn](https://img.shields.io/badge/Gunicorn-21+-499848?logo=gunicorn&logoColor=white&style=for-the-badge)](https://gunicorn.org/)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-26.04-E95420?logo=ubuntu&logoColor=white&style=for-the-badge)](https://ubuntu.com/)
[![License](https://img.shields.io/badge/License-Proprietary-Gray?style=for-the-badge)](#-نحوه-استفاده)

**💬 حمل‌ونقل اعلان با پیام‌رسان ایرانی «بله» · تقویم شمسی · رابط راست‌به‌چپ · طراحی Glassmorphism ۲۰۲۶**

</div>

---

## ✨ چرا HRMS 2026؟

| 💡 ویژگی | 📌 چرا مهم است |
|---|---|
| 🏘️ **چندشرکتی واقعی** | هر شرکت یک `schema` مستقل در PostgreSQL — ایزولاسیون کامل داده |
| 🛡️ **RBAC حرفه‌ای** | ۵ نقش از پیش‌سازمان‌یافته + امکان سفارشی‌سازی دسترسی‌ها |
| 🗓️ **تاریخ و تقویم شمسی** | تاریخ‌ها بومی، ارقام فارسی، تقویم هیبریدی |
| 🔔 **اعلان + پیام‌رسان بله** | مرکز اعلان داخلی + ارسال ایمیل و بله به مدیران/پرسنل |
| 🧠 **پیشرفته‌ترین ماژول‌ها** | کارکرد، فیش، مکاتبات، قرارداد هوشمند، چرخهٔ عمر کارمند |
| 📊 **داشبورد BI مدیریتی** | نمودارهای تعاملی بدون وابستگی خارجی |
| 🔍 **جستجوی سراسری** | یک باکس برای Pرسنل/مدرک/نامه/درخواست |
| ⚡ **درون‌ریزی اکسل ۲۰۲۶** | ۱۲+ نوع ورود داده با استپر و Drag&Drop |

---

## 🧩 نقشهٔ محصول — ماژول‌های فعال

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          HRMS 2026  —  Work-Spaces                      │
├───────────┬──────────────────────────────────────────────────────────────┤
│ 🏠 خانه   │ داشبورد هوشمند (KPI · هشدارها · نمودارها · بدون اسکرول)     │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 👥 پرسنل  │ پرونده · افزودن · جستجو · دفترچه · قرارداد (نسخه/امضا)      │
│           │ پرونده ۳۶۰°: تایم‌لاین + نمای کلی (اموال/وام/جرائم/بیمه)     │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 🔄 عملیات │ چارت · آنبوردینگ/آفبوردینگ · اموال · تقویم سازمانی           │
│           │ حضور/غیاب · مرخصی · درخواست اداری · درون‌ریزی اکسل           │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 💰 مالی   │ فیش حقوق · مزایا و کارانه · کسورات · گزارش مالی · وام        │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 🏖️ رفاهی  │ بیمه تکمیلی · وام و تسهیلات                                  │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 📁 ارتباط │ مکاتبات (وارده/صادره/ابلاغ) · بایگانی اسناد · اطلاع‌رسانی بله │
├───────────┼──────────────────────────────────────────────────────────────┤
│ 📈 بینش   │ داشبورد مدیریتی · امتیازدهی و ارزیابی · دستیار هوشمند        │
├───────────┼──────────────────────────────────────────────────────────────┤
│ ⚙️ سیستم  │ تعاریف اولیه · کاربران و نقش‌ها · لاگ · تنظیمات · پشتیبان‌گیری│
└───────────┴──────────────────────────────────────────────────────────────┘
```

### 🗂️ پروندهٔ پرسنلی ۳۶۰° — یک مرجع واحد

| تب | محتوا |
|---|---|
| 🧭 **نمای کلی** | قراردادها، اموال، وام، چک‌لیست ورود/خروج، جرائم، بیمه تکمیلی |
| ⏳ **تایم‌لاین** | استخدام ← تغییرات ← مرخصی ← مدارک ← مکاتبات |
| 👤 **فردی** | اطلاعات شناسنامه‌ای، تحصیلات، تماس، بانکی، بیمه |
| 💼 **شغلی** | دپارتمان، سمت، قرارداد، وضعیت، ساعات کاری |
| 💵 **دریافتی‌ها** | فیش حقوقی + مزایا (سال/ماه) |
| 📝 **کارکرد** | روزهای کار/مرخصی/غیبت + اضافه‌کاری |
| 🔄 **تغییرات** | سوابق شغلی + نسخه‌های قرارداد |
| 📎 **مدارک** | آپلود/پیش‌نمایش/انقضا + آرشیو سازمانی |

---

## 🚀 راه‌اندازی سریع (محیط توسعه)

```bash
# ۱) بک‌اند
cd hrms_project
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_dev          # کاربر و دادهٔ نمونه
python manage.py runserver          # http://localhost:8000

# ۲) فرانت‌اند (ترمینال دوم)
cd ../frontend
npm install
npm run start                       # http://localhost:3000
```

```
ورود توسعه:  admin / admin123
```

> ⚠️ حالت توسعه روی SQLite فاقد چندشرکتی واقعی است؛ برای تست دقیق از PostgreSQL استفاده کنید.

---

## 🧱 معماری

### 🏗️ Multi-Tenant — هر شرکت یک Schema

<div align="center">

```
        درخواست ←───→ TenantMiddleware
                              │
                 (دامنه/schema شرکت را یافت)
                              ▼
        ┌─────────────── PostgreSQL ───────────────┐
        │  public (companies, domains, users)      │
        │  schema: demo.company1*                  │
        │  schema: hr_company2                     │
        └──────────────────────────────────────────┘
                              │
                        Employees / Payroll / Documents / ...
```

</div>

- **Tenant model:** `core.Company`
- **Domain model:** `core.Domain`
- **DB Router:** `django_tenants.routers.TenantSyncRouter`

### 🔐 نقش‌ها و دسترسی (RBAC)

| نقش | دسترسی‌های کلیدی |
|---|---|
| 🟣 `super_admin` | کامل — مدیریت شرکت/کاربر/تنظیمات/حذف |
| 🔵 `hr_manager` | مدیریت پرسنل، تأیید مرخصی، تنظیمات، آرشیو |
| 🟢 `hr_specialist` | ثبت/ویرایش پرسنل و مدارک، درون‌ریزی |
| 🟡 `department_head` | تأییدها و مشاهدهٔ محدود به تیم خود |
| ⚪ `employee` | حداقلی — فقط داده‌های مرتبط با خود |

---

## ✍️ قرارداد هوشمند (Contract Center)

- 📄 قالب استاندارد ۱۴ مادهای — با **فونت Vazirmatn** و لوگوی شرکت
- 🖨️ خروجی آمادهٔ چاپ/PDF (مواد **بولد**، فونت ۱۰pt، لوگو وسط‌چین)
- 🖊️ **امضای دیجیتال + آپلود تصویر امضا/مهر**
- 🔁 نسخه‌بندی سالانه + **مقایسهٔ نسخه‌ها**
- 💰 فیلدهای مزایای کامل (حق جذب، مسکن، بن، …)

---

## 🔔 اطلاع‌رسانی و ادغام پیام‌رسان «بله»

| قابلیت | توضیح |
|---|---|
| 📣 ارسال به همهٔ گیرندگان | پرسنل دارای chat_id + مخاطبین دسته‌بندیشده + chat_id دلخواه |
| 🗂️ دپارتمان/برچسب/سگمنت‌ها | حمایت از دسته‌بندی هوشمند (دپارتمان، جنسیت، تأهل، قرارداد، شیفت) |
| 🎨 قالب‌های ذخیره‌شده | تولد، مزایا، فیش، اعیاد، اطلاعیه — با دکمهٔ «ارسال سریع» |
| 🕐 زمان‌بندی | اجرای یک‌باره/روزانه/هفتگی + اجرای فوری (رون‌نو) |
| 📆 تولد خودکار | ارسال پیام در روز تولد پرسنل (شمسی) |
| 📜 تاریخچهٔ ارسال | موفق/ناموفق + دکمهٔ ارسال مجدد خطاها |
| 🧩 متغیر پویا | `{name}`، `{department}`، `{job_title}` و… در متن پیام |
| 📑 ورود اکسل مخاطبین | همگروه با تعداد زیادی مخاطب در چند ثانیه |

> اعلان‌ها (انقضای مدرک/قرارداد، پایان مانده مرخصی، درخواست) با **ایمیل** و **بله** به مدیران ارسال می‌شوند.

---

## 📊 داشبورد مدیریتی (BI)

- ۸ کارت KPI زنده + دونات جنسیت + توزیع دپارتمان + هشدارها/فعالیت
- نمودار MultiLine روند هزینه‌ی ۱۲ ماه (خالص/مزایا/کسورات/بیمه)
- تحلیل دپارتمان‌ها، توزیع سن/تحصیلات/شهر، ماندهٔ مرخصی، اموال/وام، نرخ غیبت

| API | توضیح |
|---|---|
| `GET /api/management/kpis/` | KPI کلی |
| `GET /api/management/department-analytics/` | دپارتمان |
| `GET /api/management/payroll-cost-trend/` | هزینه‌ی حقوق |
| `GET /api/management/leave-utilization/` | مرخصی |
| `GET /api/management/absenteeism-summary/` | حضور و غیبت |

---

## ⌨️ API Highlights

### Auth
| Method | Endpoint |
|---|---|
| `POST` | `/api/auth/login/` |
| `POST` | `/api/auth/refresh/` |
| `GET` | `/api/auth/me/` |

### Employees & Org
| Method | Endpoint |
|---|---|
| `GET/POST` | `/api/employees/` |
| `GET/PUT/PATCH/DELETE` | `/api/employees/{id}/` |
| `GET` | `/api/employees/{id}/timeline/` |
| `GET` | `/api/employees/{id}/summary/` |
| `GET/POST` | `/api/org-chart/positions/` |

### Financial
| Method | Endpoint |
|---|---|
| `GET/POST` | `/api/salaries/` |
| `GET/POST` | `/api/benefits/` |
| `GET/POST` | `/api/transactions/` |

### Correspondences / Documents / Attendance / Leaves
| Method | Endpoint |
|---|---|
| `GET/POST` | `/api/incoming-letters/` |
| `GET/POST` | `/api/outgoing-letters/` |
| `GET/POST` | `/api/announcements/` |
| `GET/POST` | `/api/documents/` |
| `GET` | `/api/calendar/feed/` |

### Notifications + Bale
| Endpoint | توضیح |
|---|---|
| `GET` `/api/notifications/` | اعلان‌های کاربر |
| `POST` `/api/notifications/sync/` | همگام‌سازی اعلان‌ها |
| `POST` `/api/notifications/bale-bulk-send/` | ارسال گروهی بله |
| `GET` `/api/notifications/bale-segments/` | گروه‌های هوشمند |
| `POST` `/api/notifications/bale-contacts-import/` | ورود مخاطبین |
| `GET/POST` `/api/bale-templates/` | قالب‌ها |
| `GET/POST` `/api/bale-schedules/` | زمان‌بندی |
| `GET` `/api/bale-send-logs/` | تاریخچه |

### Management Analytics + Employee Summary
| Endpoint | توضیح |
|---|---|
| `GET` `/api/management/kpis/` | داشبورد مدیریتی |
| `GET` `/api/management/department-analytics/` | دپارتمان‌ها |
| `GET` `/api/management/payroll-cost-trend/` | هزینه‌ها |
| `GET` `/api/employees/{id}/summary/` | نمای کلی پرسنل |

---

## 🛠️ متغیرهای محیطی (نمونه)

| متغیر | توضیح |
|---|---|
| `SECRET_KEY` | کلید امن (الزامی در production) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` |
| `ALLOWED_HOSTS` | دامنه‌های مجاز |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` |
| `REDIS_CACHE_URL` | `redis://localhost:6379/1` |
| `EMAIL_HOST`/`EMAIL_PORT` | SMTP |

---

## 🔒 امنیت

- `DEBUG=False` در تولید
- کوکی امن + HTTPS + هدرهای امنیتی
- محدودسازی CORS
- `django-ratelimit` برای جلوگیری از حملات
- رمزنگاری فایل‌های پرسنلی
- چندلایه دسترسی RBAC

---

## 📋 مجوز

حقوق معنوی محفوظ است. استفادهٔ تجاری نیاز به مجوز دارد.

---

<sub>💜 با همراهی منابع فارسی و استانداردهای ۲۰۲۶، ساخته‌شده برای تیم‌های منابع انسانی ایرانی.</sub>