# HRMS — سیستم جامع مدیریت منابع انسانی

سیستم مدیریت منابع انسانی (Human Resource Management System) با معماری **چندشرکتی (Multi-Tenant)** و **چندزبانه (i18n)**.

- **بک‌اند**: Django 5 + Django REST Framework
- **فرانت‌اند**: React 18 + Material UI (MUI) + i18next
- **احراز هویت**: JWT (`djangorestframework-simplejwt`)
- **زبان‌ها**: فارسی (fa) و انگلیسی (en) — رابط کاربری RTL در فارسی

---

## 📦 ماژول‌های فعال

| ماژول | مسیر | توضیح |
|-------|------|-------|
| **داشبورد** | `/dashboard` | آمار + نمودار + هشدارها (تک‌صفحه) |
| **پرسنل** | `/employees` | لیست + افزودن/ویرایش (۴ مرحله‌ای) + پرونده پرسنلی |
| **ورود اطلاعات** | `/data-entry` | مرخصی، غیبت، حقوق، مزایا، کسورات |
| **دفترچه تلفن** | `/phonebook` | کارت‌های تماس + خروجی اکسل |
| **جستجو** | `/search` | جستجوی پیشرفته + فیلتر |
| **چارت سازمانی** | `/org-chart` | درخت سلسله‌مراتبی + ویرایش + نفرات مستقر |
| **گزارشات** | `/reports` | ۱۵+ نمودار + تولدها + خلاصه مکاتبات |
| **تعاریف اولیه** | `/definitions` | مشخصات شرکت + دپارتمان‌ها + لیست‌های پایه |
| **مکاتبات** | `/correspondences` | نامه وارده/صادره + ابلاغ‌ها + فرم‌ها |
| **تنظیمات** | `/settings` | کاربران، نقش‌ها، درون‌ریزی اکسل |

### 🧩 زیرماژول‌های «ورود اطلاعات»

| نوع | زیرتب‌ها | فیلدهای کلیدی |
|-----|---------|--------------|
| **حقوق** | ثبت فیش جدید / درون‌ریزی گروهی / لیست | ۳۳ فیلد (حقوق پایه، اضافه‌کاری، شب‌کاری، بیمه، کسورات و ...) |
| **مزایا** | ثبت مزایا / درون‌ریزی گروهی / لیست | ۱۵ نوع مزایای رفاهی + مبلغ ناخالص/مالیات/پرداختی |
| **مرخصی** | — | ۷ زیرنوع + تعداد روز + بازه |
| **غیبت** | — | ۳ زیرنوع + تعداد روز + جریمه |
| **کسورات** | — | ۶ زیرنوع + مبلغ + دوره |

---

## 🚀 شروع سریع (ویندوز / SQLite)

> راهنمای کامل در فایل `QUICK_START.md` موجود است.

### پیش‌نیازها

- **Python** 3.10+
- **Node.js** 18+

### ۱. بک‌اند

```bash
cd hrms_project
python -m venv venv
venv\Scripts\activate          # ویندوز
# source venv/bin/activate     # لینوکس/مک

pip install -r requirements.txt

# ساخت دیتابیس (SQLite - حالت توسعه)
python manage.py makemigrations core employees documents leaves attendance payroll orgchart settings_app correspondences
python manage.py migrate

# ساخت superuser + داده‌های نمونه (شرکت، دپارتمان‌ها، چارت سازمانی)
python manage.py setup_dev

python manage.py runserver
```

### ۲. فرانت‌اند (CMD، نه PowerShell)

```bash
cd frontend
npm install
npm start
```

### ۳. ورود

| آیتم | مقدار |
|------|-------|
| آدرس | http://localhost:3000 |
| کاربر | `admin` |
| رمز | `admin123` |

---

## 🗄️ معماری بک‌اند

### اپلیکیشن‌ها

| اپ | مسئولیت |
|----|---------|
| `core` | مدل Company/Domain (چندشرکتی)، موتورها، AuditLog، UserProfile |
| `employees` | پرسنل، دپارتمان، عنوان شغلی، محل، بیمه + گزارشات |
| `documents` | مدارک پرسنل + انواع مدارک |
| `payroll` | فیش حقوقی (SalaryRecord)، مزایا (BenefitRecord)، تراکنش‌ها |
| `orgchart` | پوزیشن‌های سازمانی + نفرات مستقر |
| `correspondences` | نامه وارده/صادره، ابلاغ‌ها، فرم‌ها |
| `settings_app` | تنظیمات، کاربران، نقش‌ها، درون‌ریزی اکسل |

### چندشرکتی (Multi-Tenant)

- **توسعه**: `django-tenants` با schema جداگانه PostgreSQL برای هر شرکت
- **توسعه (SQLite)**: `CustomTenantMiddleware` با fallback به اولین شرکت فعال (`settings/development.py`)
- تنظیمات تفکیک‌شده: `base.py` + `development.py` + `production.py`

### موتورهای هسته (`core/engines/`)

| موتور | فایل |
|-------|------|
| شرکت | `company_engine.py` |
| زبان | `language_engine.py` |
| احراز هویت | `authentication_engine.py` |
| ذخیره‌سازی فایل | `file_storage_engine.py` |
| جستجو | `search_engine.py` |
| درون‌ریزی اکسل | `import_engine.py` |

---

## 🔑 API Endpoints

### احراز هویت

| Method | Endpoint | توضیح |
|--------|----------|-------|
| `POST` | `/api/auth/login/` | ورود — دریافت JWT |
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
| `GET/POST` | `/api/transactions/` | تراکنش‌ (مرخصی/غیبت/...) |

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
| `/api/reports/upcoming-birthdays/` | **تولدهای ۷ روز آینده** |
| `/api/reports/correspondences-summary/` | خلاصه مکاتبات |
| `/api/reports/salary-benefits-summary/` | خلاصه حقوق و مزایا |

### درون‌ریزی اکسل

| Method | Endpoint |
|--------|----------|
| `GET` | `/api/import/types/` |
| `GET` | `/api/import/template/{type}/` |
| `POST` | `/api/import/upload/` |

---

## 🌐 چندزبانه (i18n)

- **زبان‌ها**: فارسی (`fa`) و انگلیسی (`en`)
- **تشخیص خودکار**: هدر مرورگر → session → پیش‌فرض
- **RTL/LTR**: `document.dir` به‌صورت خودکار تنظیم می‌شود
- فایل‌های ترجمه: `frontend/src/locales/{fa,en}/translation.json`

---

## 📁 ساختار اصلی

```
HRMS/
├── hrms_project/              # بک‌اند Django
│   ├── core/                  # هسته (شرکت، موتورها، مدل‌ها)
│   ├── employees/             # پرسنل + گزارشات
│   ├── payroll/               # حقوق و مزایا
│   ├── orgchart/              # چارت سازمانی
│   ├── correspondences/       # مکاتبات
│   ├── settings_app/          # تنظیمات + کاربران + درون‌ریزی
│   ├── documents/             # مدارک
│   ├── leaves/                # مرخصی (فاز آینده)
│   ├── attendance/            # حضور و غیاب (فاز آینده)
│   └── locale/                # ترجمه‌ها
├── frontend/                  # فرانت‌اند React
│   └── src/
│       ├── core/              # api، hooks، context، کامپوننت‌های مشترک
│       ├── modules/           # ماژول‌ها (dataEntry، correspondences، settings)
│       ├── pages/             # صفحات (Dashboard، Employees، ...)
│       ├── locales/           # ترجمه‌ها
│       └── AppRoutes.jsx
├── QUICK_START.md
└── README.md
```

---

## 🎨 طراحی UI

- **Glassmorphism** شیشه‌ای در تمام کارت‌ها و سایدبار
- **تم بنفش/صورتی** مدرن ۲۰۲۶
- **اعداد فارسی** با جداکننده هزارگان
- **راست‌چین کامل** (RTL) در فارسی
- **نمودارهای SVG سفارشی** (Donut، Bar، Column، Line) بدون وابستگی خارجی

---

## 🐛 عیب‌یابی رایج

| مشکل | راه‌حل |
|-------|--------|
| `no such table: payroll_salaryrecord` | `python manage.py makemigrations payroll && python manage.py migrate` |
| `ModuleNotFoundError: correspondences.serializers` | اجرای migration اپ مربوطه |
| خطای `ComSpec` در npm | از CMD استفاده کنید نه PowerShell |
| لوگو ذخیره نمی‌شود | بک‌اند را بعد از تغییر `CustomTenantMiddleware` ری‌استارت کنید |
| تاریخ خودش عوض می‌شود | رفرش `Ctrl+Shift+R` (رفع شده با `focusedRef`) |

---

## 📝 مجوز

[Your License Here]

## 📧 پشتیبانی

برای سوالات، لطفاً با تیم توسعه تماس بگیرید.