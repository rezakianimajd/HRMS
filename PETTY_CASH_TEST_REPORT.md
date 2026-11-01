# گزارش تست ماژول تنخواه

> تاریخ: ۱۴۰۵/۰۸/۱۰ · محیط: Windows / Python 3.14 + Django 5.0.14 (global) / Node (react-scripts)
> محدودیت محیط: PostgreSQL محلی در دسترس نیست، بنابراین تست‌های نیازمند دیتابیس
> (`TestCase` چندمستاجری) در این محیط اجرا نشدند؛ کنترل‌های ساختاری و منطق خالص اجرا شد.

## ۱. کنترل‌های بک‌اند

| بررسی | فرمان | نتیجه |
|---|---|---|
| بارگذاری مدل‌ها و سیستم | `python manage.py check --settings=hrms_project.settings.development` | ✅ `System check identified no issues` |
| هم‌خوانی مایگریشن با مدل‌ها | `python manage.py makemigrations --check --dry-run` | ✅ `No changes detected` |
| ساخت مایگریشن فاز ۱ | `python manage.py makemigrations pettycash` | ✅ `0009_...` بدون عملیات حذف |
| رجیستری روتر DRF | `django.urls` + `pettycash.urls.router.urls` | ✅ ۱۳۰ الگوی آدرس ثبت شد |
| ساخت سریالایزرها | instantiate همهٔ ۱۱ سریالایزر | ✅ همه بدون خطا |
| تست‌های منطق خالص | ۲۱ تست (`money`, SoD, روش پرداخت, محاسبهٔ تسویه, دسترسی و دامنهٔ دید) | ✅ `Ran 21 tests — OK` |

### اجرای تست‌های منطق خالص
```powershell
cd C:\HRMS\hrms_project
$env:SECRET_KEY='dev-local-only-secret-key-1234567890'
python _run_petty_tests.py      # یا در سرور: python manage.py test pettycash.tests
```
خروجی: `Ran 13 tests in 0.006s — OK`

## ۲. کنترل‌های فرانت‌اند

| بررسی | فرمان | نتیجه |
|---|---|---|
| ESLint روی فایل‌های تغییر‌یافته | `npx eslint --config .eslintrc.check.json src/pages/PettyCash*.jsx src/AppRoutes.jsx src/core/config/menuConfig.js` | ✅ بدون خطا (فقط هشدارهای از قبل موجود) |
| بیلد تولیدی | `npx react-scripts build` | ✅ `Compiled successfully` |

## ۳. سناریوهای منطقی که کد پوشش می‌دهد (تست دستی پیشنهادی روی سرور)

| # | سناریو | مسیر/کنترل |
|---|---|---|
| ۱ | ایجاد تنخواه ثابت با مبلغ ثابت و مهلت تسویه | `POST /petty-cash-funds/` (فیلدهای `kind`, `fixed_amount`, `settlement_days`) |
| ۲ | شارژ بیش از سقف | `POST /petty-cash-funds/{id}/charge/` → خطای «شارژ پیشنهادی از سقف تنخواه عبور می‌کند» |
| ۳ | پرداخت بیش از مانده (با خاموش کردن `allow_negative_balance`) | `POST /petty-cash-transactions/` → خطای «ماندهٔ تنخواه کافی نیست» |
| ۴ | ثبت در دورهٔ بسته | هر عملیات مالی → خطای «دورهٔ مالی … بسته یا قفل است» |
| ۵ | فاکتور تکراری | ارسال صورت با `invoice_number` تکراری → خطای «قبلاً در صورت … ثبت شده است» |
| ۶ | الزام پیوست (پس از فعال‌سازی در تنظیمات) | ارسال صورت بدون پیوست → خطای «پیوست فاکتور/رسید الزامی است» |
| ۷ | تفکیک وظایف | تأیید توسط همان کاربر ارسال‌کننده → خطای «تفکیک وظایف…» |
| ۸ | دوباره‌شماری هزینه | `mark_status(posted)` دو بار و سپس `decide(post)` در کارتابل حسابداری → تنها یک تراکنش debit (`unique_key`) |
| ۹ | ابطال | `POST /petty-cash-transactions/{id}/void/` با علت → مانده اصلاح و رکورد حفظ می‌شود |
| ۱۰ | حذف فیزیکی | `DELETE /petty-cash-transactions/{id}/` → `405` |
| ۱۱ | انتقال بین تنخواه‌ها | `POST /petty-cash-transactions/transfer/` → دو تراکنش متناظر و اتمیک |
| ۱۲ | درخواست شارژ | ایجاد → ارسال → تأیید → اجرا → تراکنش credit با `unique_key=request:{id}:credit` |
| ۱۳ | تسویهٔ تنخواه ثابت | `preview` → `create` → `submit` → `approve` → `post` (برگشت وجه + شارژ مجدد، `settled_at` صورت‌ها) |
| ۱۴ | گزارش‌ها | `/petty-cash-reports/summary|by-project|cashflow|overdue|credit-vs-usage/` و `?export=csv` |
| ۱۵ | دسترسی بین‌شرکتی | درخواست بدون tenant → نتیجهٔ خالی (نه دادهٔ شرکت دیگر) |
| ۱۶ | محدودسازی تنخواه‌دار | ورود با اکانت تنخواه‌دار → فقط تنخواه‌های خودش در فهرست/داشبورد/گزارش‌ها |
| ۱۷ | کمک‌تنخواه‌دار | مشاهدهٔ تنخواه‌های تخصیص‌یافته + تنخواه‌های تنخواه‌دار مسئول |
| ۱۸ | مدیر ارشد | مشاهدهٔ همهٔ تنخواه‌ها (superuser / نقش super_admin / فهرست مدیران ارشد ناظر) |
| ۱۹ | تعریف تنخواه‌دار توسط غیرمدیر | `POST/PATCH /petty-cash-custodians/` → خطای ۴۰۰/۴۰۳ |
| ۲۰ | ثبت هزینه خارج از دامنه | `POST /petty-cash-expense-statements/` با تنخواه غیرمجاز → `403` |

## ۵. استقرار واقعی و تأیید زنده (۱۴۰۵/۰۸/۱۰)

| گام | نتیجه |
|---|---|
| انتقال فایل‌های بک‌اند به `/opt/hrms` (۵۸۸ فایل) | ✅ |
| `makemigrations --check --dry-run` روی سرور | ✅ `No changes detected` |
| پشتیبان دیتابیس پیش از مایگریشن | ✅ `/var/backups/hrms/pre_pettycash_20261101_135907.dump` (۲.۵MB) |
| `migrate_schemas` | ✅ `pettycash.0009` و `pettycash.0010` اعمال شد (`MIGRATE_EXIT=0`) |
| ری‌استارت سرویس‌ها | ✅ `gunicorn`, `celery-worker`, `celery-beat`, `nginx` = active |
| بیلد فرانت‌اند با `PUBLIC_URL=/assets` و استقرار اتمیک | ✅ باندل زنده: `main.f5cc732a.js` |
| `GET /` | ۲۰۰ و `main.f5cc732a.js` با وضعیت ۲۰۰ |
| `/api/petty-cash-custodians/` | ۴۰۱ (وجود مسیر + نیاز به احراز هویت) — قبل از دیپلوی ۴۰۴ بود |
| `/api/petty-cash-settings/current/`, `/reports/summary/`, `/requests/`, `/settlements/` | ۴۰۱ (مسیرها فعال) |
| وجود صفحهٔ تعاریف در باندل | ✅ (`petty-cash/definitions` در باندل زنده) |

**علت خطای ۴۰۴ که کاربر دید:** بک‌اند روی سرور به‌روز نشده بود و مسیرهای جدید وجود نداشتند؛
کد فقط در گیت بود. با استقرار انجام‌شده، مسیرها ۴۰۱ (یعنی موجود و نیازمند توکن) پاسخ می‌دهند.



## ۷. رفع خطاها (Hotfix)

| خطا | ریشه | اصلاح |
|---|---|---|
| `405 متد PATCH مجاز نیست` روی `/api/petty-cash-settings/current/` | دو اکشن DRF با `url_path='current'` تعریف شده بود؛ روتر فقط متد اولین اکشن (GET) را ثبت می‌کرد | ادغام در یک اکشن با `methods=['get','post','patch']` و تصمیم‌گیری بر اساس `request.method` |
| `404` روی گزارش «هزینه به تفکیک سرفصل/پروژه» | DRF پیش‌فرض نام تابع را با `_` در مسیر می‌گذارد (`by_category`) ولی فرانت‌اند `by-category` صدا می‌زد | افزودن `url_path='by-category'` و `url_path='by-project'` به اکشن‌ها |
| تأیید زنده | `OPTIONS /api/petty-cash-settings/current/` → `Allow: GET, POST, PATCH, HEAD, OPTIONS` · هر ۱۰ مسیر گزارش → `401` (وجود مسیر) | ✅ |
| تست رگرسیون | `ReportRouteTests` با `resolve()` روی هر ۱۰ مسیر گزارش + بررسی متد PATCH تنظیمات (در مجموع ۲۳ تست) | ✅ |



## ۶. ریسک‌های باقی‌مانده

1. **مایگریشن‌ها اعمال شدند** (`0009`, `0010`) و پشتیبان پیش از اجرا در
   `/var/backups/hrms/pre_pettycash_20261101_135907.dump` نگهداری می‌شود؛ برای بازگردانی در صورت
   نیاز: `pg_restore -d hrms_db <dump>`. آزمون دودی (smoke test) روی فرم‌های واقعی توصیه می‌شود.
2. کنترل‌های «الزام پیوست» و «ماندهٔ غیرمنفی» به‌صورت پیش‌فرض خاموش/باز هستند تا گردش فعلی متوقف نشود؛ فعال‌سازی آن‌ها پس از آموزش کاربران توصیه می‌شود.
3. مسیر تصمیم کارتابل حسابداری برای `source_type=settlement` و `transaction` هنوز پیاده‌سازی نشده؛ این منابع فقط صف می‌شوند.
4. تست‌های دیتابیسی چندمستاجری (`TestCase`) در این محیط قابل اجرا نبودند (پیش‌نیاز: PostgreSQL + schema تست).
