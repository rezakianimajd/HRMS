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

## ۴. ریسک‌های باقی‌مانده

1. **مایگریشن `0009` روی دیتابیس عملیاتی اجرا نشده است.** ساختار آن افزایشی است، اما اجرای واقعی باید در پنجرهٔ نگهداری و با پشتیبان‌گیری انجام شود:
   `python manage.py migrate pettycash` (روی سرور، پس از `backup.sh`).
2. کنترل‌های «الزام پیوست» و «ماندهٔ غیرمنفی» به‌صورت پیش‌فرض خاموش/باز هستند تا گردش فعلی متوقف نشود؛ فعال‌سازی آن‌ها پس از آموزش کاربران توصیه می‌شود.
3. مسیر تصمیم کارتابل حسابداری برای `source_type=settlement` و `transaction` هنوز پیاده‌سازی نشده؛ این منابع فقط صف می‌شوند.
4. تست‌های دیتابیسی چندمستاجری (`TestCase`) در این محیط قابل اجرا نبودند (پیش‌نیاز: PostgreSQL + schema تست).
