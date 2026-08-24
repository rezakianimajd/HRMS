# 🚀 HRMS — راهنمای شروع سریع (ویندوز / SQLite)

راهنمای کامل اجرای سیستم مدیریت منابع انسانی روی ویندوز با SQLite (بدون نیاز به PostgreSQL و Redis).

---

## 📋 پیش‌نیازها

| نرم‌افزار | نسخه | نکته |
|-----------|------|------|
| Python | 3.10+ | حتماً «Add Python to PATH» |
| Node.js | 18+ | برای فرانت‌اند React |

> ⚠️ **مهم**: تمام دستورات بک‌اند باید از پوشه `C:\HRMS\hrms_project` اجرا شوند، نه از `C:\HRMS`.

---

## ⚡ نصب اولیه (فقط بار اول)

### ۱. بک‌اند (Django)

```powershell
cd C:\HRMS\hrms_project

# ایجاد محیط مجازی
python -m venv venv
venv\Scripts\activate

# نصب کتابخانه‌ها
pip install -r requirements.txt
```

### ۲. ساخت دیتابیس (migrations)

```powershell
# ساخت migration برای همه اپ‌ها
python manage.py makemigrations core employees documents leaves attendance payroll orgchart settings_app

# اعمال migrationها (ساخت db.sqlite3)
python manage.py migrate
```

### ۳. ساخت superuser و داده‌های نمونه

```powershell
# روش یک‌دستوری (پیشنهادی) — admin + شرکت + دپارتمان‌ها + چارت سازمانی
python manage.py setup_dev

# یا دستی:
# python manage.py createsuperuser
# python manage.py load_sample_data
```

> `setup_dev` همه چیز را می‌سازد — superuser با `admin/admin123`، شرکت پیش‌فرض، دپارتمان‌ها، عناوین شغلی، محل‌ها، بیمه‌ها، انواع مدارک، و ۹ پوزیشن چارت سازمانی.

---

## 🔄 اجرای روزانه (بعد از نصب)

### بک‌اند — ترمینال ۱

```powershell
cd C:\HRMS\hrms_project
venv\Scripts\activate
python manage.py runserver
```

بک‌اند روی `http://127.0.0.1:8000/` اجرا می‌شود.

### فرانت‌اند — ترمینال ۲ (CMD، نه PowerShell)

```cmd
cd C:\HRMS\frontend
npm start
```

> ⚠️ اگر در PowerShell خطای «scripts is disabled» یا «ComSpec» گرفتید، از **CMD** (نه PowerShell) برای `npm start` استفاده کنید.

فرانت‌اند روی `http://localhost:3000` اجرا می‌شود.

---

## 🔑 ورود به سیستم

| آیتم | مقدار |
|------|-------|
| **آدرس** | http://localhost:3000 |
| **کاربر** | `admin` |
| **رمز** | `admin123` |

---

## 📦 ماژول‌های فعال

| ماژول | مسیر | توضیح |
|-------|------|-------|
| **داشبورد** | `/dashboard` | آمار + نمودار + هشدارها (تک‌صفحه) |
| **پرسنل** | `/employees` | لیست + افزودن/ویرایش + پروفایل |
| **ورود اطلاعات** | `/data-entry` | مرخصی، غیبت، مزایا، حقوق، کسورات |
| **دفترچه تلفن** | `/phonebook` | کارت‌های تماس + خروجی اکسل |
| **جستجو** | `/search` | جستجوی پیشرفته + فیلتر |
| **چارت سازمانی** | `/org-chart` | درخت سلسله‌مراتبی |
| **گزارشات** | `/reports` | ۱۳ نمودار + تراکنش‌ها |
| **تعاریف اولیه** | `/definitions` | مشخصات شرکت + لیست‌های پایه |
| **تنظیمات** | `/settings` | کاربران، نقش‌ها، درون‌ریزی اکسل |

---

## 🐛 عیب‌یابی رایج

| مشکل | راه‌حل |
|-------|--------|
| `ModuleNotFoundError: payroll.serializers` | مطمئن شوید فایل `payroll/serializers.py` موجود است |
| `no such table: payroll_employeetransaction` | اجرا نکرده‌اید: `python manage.py makemigrations payroll` + `migrate` |
| خطای `ComSpec` در npm | از CMD استفاده کنید نه PowerShell |
| خطای `scripts is disabled` | در PowerShell: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| لوگو ذخیره نمی‌شود | بک‌اند را بعد از تغییر `CustomTenantMiddleware` ری‌استارت کنید |

---

## 🔐 تغییر مهم پس از افزودن model جدید

هر بار که model جدیدی اضافه می‌کنید، باید:

```cmd
python manage.py makemigrations <app_name>
python manage.py migrate
python manage.py runserver
```
