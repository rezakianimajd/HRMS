# 🏢 HRMS 2026 — سامانهٔ جامع مدیریت منابع انسانی

<div align="center">

**Human Resource Management System · Multi-Tenant · Multi-Language · Enterprise Ready**

| [🎨 معرفی گرافیکی (فونت وزیر · RTL)](docs/intro.html) | [📚 مستند راه‌اندازی](INSTALLATION.md) | [🗄️ مهاجرت دیتابیس](DATABASE_MIGRATION.md) |
|---|---|---|

</div>

[![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white&style=for-the-badge)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red?logo=django&logoColor=white&style=for-the-badge)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://reactjs.org/)
[![MUI](https://img.shields.io/badge/MUI-6-007FFF?logo=mui&logoColor=white&style=for-the-badge)](https://mui.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white&style=for-the-badge)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5-37814A?logo=celery&logoColor=white&style=for-the-badge)](https://docs.celeryq.dev/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white&style=for-the-badge)](https://jwt.io/)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-26.04-E95420?logo=ubuntu&logoColor=white&style=for-the-badge)](https://ubuntu.com/)

> 💬 اطلاع‌رسانی با پیام‌رسان «بله» و ایمیل · 📅 تقویم شمسی · رابط عالی راست‌به‌چپ

---

## ⚡ پیش‌نیازها

| ابزار | نسخه |
|---|---|
| Ubuntu Server | 26.04 LTS |
| Python | 3.12 |
| PostgreSQL | 16 |
| Redis | 7+ |
| Node.js | 20 LTS |

> نصب خودکار توسط `deploy.sh` انجام می‌شود.

---

## 🚀 راه‌اندازی (محیط توسعه)

```bash
# ۱) بک‌اند
cd hrms_project
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_dev
python manage.py runserver

# ۲) فرانت‌اند
cd ../frontend
npm install
npm start
```

> توسعه با **admin / admin123** (SQLite). برای چندشرکتی واقعی از PostgreSQL استفاده کنید.

---

## 🧩 ماژول‌ها

| بخش | امکانات |
|---|---|
| 🏠 خانه | داشبورد KPI + نمودار + هشدار |
| 👥 پرسنل | پرونده‌های پرسنلی + نمای کلی ۳۶۰° |
| 📄 قرارداد | نسخه‌بندی، ۱۴ مادهٔ استاندارد، PDF، امضای دیجیتال |
| ⏰ عملیات | حضور، مرخصی، درخواست، چارت، اموال، تقویم |
| 💰 مالی | فیش، مزایا، کسورات، وام |
| 🔔 اطلاع‌رسانی | مرکز اعلان + قالب‌ها + ارسال گروهی بله + زمان‌بندی |
| 📈 بینش | داشبورد مدیریتی (BI)، امتیازدهی، دستیار |
| ⚙️ سیستم | کاربران، نقش‌ها، تنظیمات، پشتیبان‌گیری |

---

## 🔐 نقش‌ها (RBAC)

| نقش | شرح |
|---|---|
| `super_admin` | مدیر ارشد — کامل |
| `hr_manager` | مدیر منابع انسانی |
| `hr_specialist` | کارشناس منابع انسانی |
| `department_head` | مدیر دپارتمان |
| `employee` | کارمند |

---

## 🗂️ ساختار

```
HRMS/
├── deploy.sh
├── docs/intro.html        ← معرفی گرافیکی (فونت وزیر · RTL)
├── hrms_project/          ← بک‌اند Django
│   ├── core/              ← هسته (شناسنامه شرکت، کاربران)
│   ├── employees/         ← پرسنل، قرارداد، گزارش
│   ├── payroll/           ← حقوق و مزایا
│   └── ...
└── frontend/              ← React + MUI
```

---

## 📜 مجوز

حقوق معنوی محفوظ است. استفادهٔ تجاری نیاز به مجوز دارد.