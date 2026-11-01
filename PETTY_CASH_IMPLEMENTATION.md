# پیاده‌سازی و تغییرات ماژول تنخواه (فاز ۱ و ۲)

> مبنا: گزارش ممیزی `PETTY_CASH_AUDIT.md` · دامنهٔ این فاز: پایهٔ منطق مالی + کارتابل درخواست/تسویه + تنظیمات
> هیچ مدل، فیلد یا API موجودی حذف یا بازنویسی نشده است؛ همهٔ تغییرات افزایشی است.

## ۱. خلاصه

| حوزه | قبل | بعد |
|---|---|---|
| نوع تنخواه | نداشت | ثابت (Imprest) / موردی / علی‌الحساب + مبلغ ثابت + مهلت تسویه + بازهٔ اعتبار |
| کنترل‌های مالی | تقریباً هیچ (سمت کلاینت) | سقف اعتبار، سقف هر پرداخت، مانده، دورهٔ بسته، روش پرداخت، پروژه/مرکز هزینه/سرفصل مجاز، فاکتور تکراری |
| دوباره‌شماری هزینه | دو مسیر بدون کلید یکتا | یک نقطهٔ واحد (`services.apply_statement_to_fund`) + `unique_key` یکتا در دیتابیس |
| درخواست‌ها | نداشت | مدل `PettyCashRequest` با ۸ نوع و چرخهٔ draft→submitted→approved→done + اجرای خودکار |
| تسویه | نداشت | مدل `PettyCashSettlement` با پیش‌نمایش زنده، کسری/اضافه، برگشت وجه، شارژ مجدد |
| تنظیمات | نداشت | `PettyCashSettings` در سطح شرکت + صفحهٔ تنظیمات |
| پیوست هزینه | یک فایل در هر سطر | چند فایل (`PettyCashExpenseAttachment`) + API آپلود |
| مالیات/پروژه/قرارداد | نداشت | `net_amount`, `vat_amount`, `tax_amount`, `project`, `cost_center`, `contract` در سطر هزینه |
| ابطال | فقط بایگانی فلگ | ابطال با علت/کاربر/زمان (`is_void`, `void_reason`) بدون حذف فیزیکی |
| لاگ تغییرات | نداشت | `AuditLog` برای ایجاد/ویرایش/تأیید/رد/ابطال/تغییر وضعیت |
| گزارش‌ها | فقط CSV صورت‌ها | ۸ گزارش تحلیلی + خروجی CSV |
| داشبورد | ۹ شاخص ساده | ۲۰+ شاخص، فیلتر دوره/تنخواه/تنخواه‌دار/پروژه، هشدار و آخرین فعالیت‌ها |

## ۲. مدل‌ها و مایگریشن

مایگریشن جدید: `hrms_project/pettycash/migrations/0009_pettycashexpenseattachment_pettycashrequest_and_more.py`

- فقط `CreateModel`, `AddField` و یک `AlterField` (nullable شدن `PettyCashApprovalStep.statement`) — **بدون `RemoveField`/`DeleteModel`**.
- تمام فیلدهای جدید `null=True` یا `default` دارند ⇒ روی دادهٔ موجود بی‌خطر است.
- `UniqueConstraint` جدید فقط روی `(company, unique_key)` با شرط `unique_key != ''` است؛ رکوردهای قدیمی مقدار `''` دارند و مشمول قید نمی‌شوند.

### ۲.۱ `PettyCashFund` (افزوده‌ها)
`kind`, `fixed_amount`, `settlement_days`, `start_date`, `end_date`, `payment_methods`, `allowed_projects` (M2M), `allowed_cost_centers` (M2M), `allowed_accounts` (M2M), `advance_account` (لینک به `treasury.AdvanceAccount`).
`balance` اصلاح شد تا تراکنش‌های ابطال‌شده را حذف و از `Decimal` استفاده کند؛ `target_amount`, `usage_percent`, `limit_display` اضافه شد.

### ۲.۲ `PettyCashTransaction` (افزوده‌ها)
`payment_method`, `reference`, `counterparty`, `project`, `cost_center`, `statement`, `settlement`, `unique_key`, `is_void`, `voided_at`, `voided_by`, `void_reason`, `created_by`, متد `signed_amount()`.

### ۲.۳ `PettyCashExpenseStatement` (افزوده‌ها)
`project`, `cost_center`, `payment_method`, `due_date`, `settled_at` + `net_total`, `tax_total`, `is_editable`, `is_settled`.
**باگ رفع شد:** `total` قبلاً با `float` محاسبه می‌شد (خطای گرد کردن مبالغ ریالی)؛ اکنون `Decimal` است.

### ۲.۴ `PettyCashExpenseStatementLine` (افزوده‌ها)
`net_amount`, `vat_amount`, `tax_amount`, `category`, `project`, `cost_center`, `contract` + `computed_net`, `has_document`.

### ۲.۵ مدل‌های جدید
- `PettyCashSettings` (تنظیمات شرکت؛ یک رکورد)
- `PettyCashRequest` (درخواست‌ها؛ ۸ نوع، ۶ وضعیت)
- `PettyCashSettlement` (تسویه؛ M2M با صورت‌های هزینه، مبالغ محاسبه‌شده، وضعیت، تراکنش منبع حسابداری)
- `PettyCashExpenseAttachment` (پیوست چندگانهٔ سطر)
- `PettyCashApprovalStep` تعمیم یافت: `statement` / `request` / `settlement` (دقیقاً یکی).

## ۳. سرویس مشترک `pettycash/services.py`

| تابع | کار |
|---|---|
| `money`, `assert_amount_positive` | تبدیل/اعتبارسنجی مبلغ با `Decimal` |
| `assert_period_open` | ممنوعیت ثبت در `FiscalPeriod` بسته/قفل |
| `assert_fund_usable` | وضعیت فعال و بازهٔ اعتبار تنخواه |
| `assert_payment_allowed` | سقف هر پرداخت + مانده (بر اساس تنظیمات) |
| `assert_charge_allowed` | عبور نکردن شارژ از سقف تنخواه |
| `assert_payment_method_allowed`, `assert_project_allowed`, `assert_cost_center_allowed`, `assert_account_allowed` | محدودیت‌های «مجاز بودن» |
| `find_duplicate_invoice` | فاکتور تکراری (شماره + فروشنده) در همان شرکت |
| `validate_statement_for_submission` | کنترل کامل صورت هزینه پیش از ارسال/تأیید/ثبت |
| `assert_segregation` | تفکیک وظایف با قابلیت خاموش کردن در تنظیمات |
| `apply_statement_to_fund` | **تنها** نقطهٔ کسر هزینه از تنخواه (idempotent؛ سازگار با رکوردهای قدیمی) |
| `register_movement` | ثبت حرکت مالی با همهٔ کنترل‌ها + `unique_key` + صف حسابداری + لاگ |
| `void_movement` | ابطال با علت (بدون حذف) |
| `settlement_summary` | محاسبهٔ هزینهٔ تأییدشده/ردشده/در انتظار، کسری، اضافه، برگشت وجه، شارژ مجدد |
| `imprest_status` | نقد + اسناد تسویه‌نشده در برابر مبلغ ثابت (کنترل تنخواه ثابت) |
| `overdue_statements` | تسویه‌های معوق با تعداد روز تأخیر |
| `next_*_number` | شماره‌گذاری `PC-EXP/REQ/STL-YYYY-0001` |
| `audit` | ثبت `AuditLog` (بی‌صدا در صورت خطا) |

## ۴. APIهای جدید/تغییر‌یافته

| متد و مسیر | توضیح |
|---|---|
| `GET /petty-cash-funds/options/` | انواع، روش‌های پرداخت، وضعیت‌ها، پیش‌فرض‌ها |
| `POST /petty-cash-funds/{id}/charge/` | شارژ تنخواه با کنترل سقف |
| `POST /petty-cash-funds/{id}/set_status/` | فعال/معلق/بایگانی (بایگانی با ماندهٔ غیرصفر مسدود) |
| `POST /petty-cash-funds/{id}/extend/` | تمدید اعتبار |
| `POST /petty-cash-funds/{id}/reconcile/` | مغایرت‌گیری واقعی با وجه شمارش‌شده |
| `GET /petty-cash-funds/dashboard/` | داشبورد کامل + فیلتر + هشدار |
| `GET /petty-cash-funds/{id}/ledger/` | دفتر با ماندهٔ تجمعی + وضعیت تنخواه ثابت |
| `POST /petty-cash-expense-statements/{id}/approve/` | تأیید با SoD و اعتبارسنجی |
| `POST /petty-cash-expense-statements/{id}/reject/` | برگشت با علت اجباری |
| `POST /petty-cash-expense-statements/{id}/upload_attachment/` | آپلود چند فایل (حداکثر ۱۰ مگابایت) |
| `GET /petty-cash-expense-statements/compliance/` | فاقد مستند / مغایرت مبلغ / خارج از سقف |
| `POST /petty-cash-transactions/transfer/` | انتقال وجه بین دو تنخواه (دوطرفه، اتمیک) |
| `POST /petty-cash-transactions/{id}/void/` | ابطال با علت |
| `/petty-cash-settings/current/` (`GET`/`PATCH`) | خواندن/به‌روزرسانی تنظیمات شرکت |
| `/petty-cash-requests/` + `submit|approve|reject|cancel|execute` | چرخهٔ کامل درخواست‌ها |
| `/petty-cash-settlements/` + `preview|submit|approve|reject|post` | چرخهٔ کامل تسویه و ثبت نهایی |
| `/petty-cash-reports/...` (`summary`, `custodian-performance`, `by-category`, `by-project`, `cashflow`, `credit-vs-usage`, `overdue`, `settlements`) | گزارش‌ها با `?export=csv` |

## ۵. فرانت‌اند

| فایل | نقش |
|---|---|
| `frontend/src/pages/PettyCashRequestsPage.jsx` (جدید) | فهرست/فیلتر/ایجاد درخواست + ارسال/تأیید/رد/اجرا |
| `frontend/src/pages/PettyCashSettlementsPage.jsx` (جدید) | فهرست تسویه‌ها + فرم تسویه با انتخاب صورت‌ها و **پیش‌نمایش زنده** + چرخهٔ تأیید/ثبت |
| `frontend/src/pages/PettyCashSettingsPage.jsx` (جدید) | تنظیمات شرکت: پیشوند شماره، مهلت، سقف‌ها، روش‌های پرداخت، سوئیچ‌های کنترلی |
| `frontend/src/pages/PettyCashExpensesPage.jsx` | افزودن اکشن‌های تأیید/برگشت با علت |
| `frontend/src/AppRoutes.jsx` | روت‌های `/petty-cash/requests`, `/petty-cash/settlements`, `/petty-cash/settings` |
| `frontend/src/core/config/menuConfig.js` | آیتم‌های منو (درخواست‌ها، تسویه‌ها، تنظیمات) و فعال‌سازی صفحهٔ تنظیمات |

## ۶. کنترل داخلی و امنیت

1. **حذف فیزیکی ممنوع**: `FinancialViewSet.destroy` روی تراکنش/صورت/درخواست/تسویه → `405`.
2. **قفل اسناد**: صورت در وضعیت `posted` قابل ویرایش/حذف نیست (`is_editable`, `validate`, `soft_delete`).
3. **تفکیک وظایف**: `assert_segregation` در `approve`, `mark_status`, `reject` و همچنین در مسیر کارتابل حسابداری (`SourceTransactionViewSet.decide`).
4. **جلوگیری از دوباره‌شماری**: `unique_key` + قید یکتا + یک نقطهٔ واحد کسر هزینه؛ مسیر حسابداری نیز به سرویس مشترک منتقل شد.
5. **دورهٔ بسته**: کنترل در ثبت حرکت مالی و صورت هزینه.
6. **محدودسازی چندشرکتی**: `BaseViewSet` بدون شناسایی شرکت هیچ رکوردی برنمی‌گرداند.
7. **لاگ عملیات حساس**: `AuditLog` در ایجاد/ویرایش/تأیید/رد/ابطال/تغییر وضعیت.
8. **اعلان**: ارسال/تأیید/برگشت صورت، درخواست و تسویه در `notifications` با `category=petty_cash`.

## ۷. سازگاری و ملاحظات عملیاتی

- **بدون تغییر مخرب در دادهٔ موجود**: نه فیلدی حذف شد، نه جدولی.
- پیش‌فرض‌های محافظه‌کارانه برای جلوگیری از توقف گردش فعلی:
  - `require_attachment=False` (الزام پیوست خاموش تا فعال‌سازی در تنظیمات)
  - `allow_negative_balance=True` (اجازهٔ ماندهٔ منفی باز تا کنترل در تنظیمات فعال شود)
  - `enforce_segregation_of_duties=True` (هم‌راستا با رفتار قبلی `mark_status`)
- رکورد `PettyCashSettings` در اولین استفاده به‌صورت خودکار ساخته می‌شود.
- تراکنش‌های قدیمی `unique_key=''` دارند و مشمول قید یکتا نیستند؛ `apply_statement_to_fund` آن‌ها را با تطبیق `statement`/مبلغ شناسایی و کلیدگذاری می‌کند.

## ۹. تعاریف اولیهٔ تنخواه‌داران و کنترل محرمانگی (افزوده)

### ۹.۱ مدل و API
- مدل جدید `PettyCashCustodian` در `hrms_project/pettycash/models.py`:
  `employee`, `user` (اختیاری، اتصال خودکار از پروفایل), `role` (تنخواه‌دار / کمک‌تنخواه‌دار),
  `supervisor` (تنخواه‌دار مسئول کمک‌تنخواه‌دار), `funds` (M2M تنخواه‌های مجاز),
  `can_create_expense`, `can_approve`, `can_view_reports`, `note`, `is_active`.
  قید یکتایی: `(company, employee)`.
- `PettyCashSettings` دو فیلد جدید دارد: `restrict_visibility` و `senior_manager_ids`.
- مایگریشن: `0010_pettycashsettings_restrict_visibility_and_more.py` (فقط افزایشی).
- APIها: `/petty-cash-custodians/` (CRUD، فقط مدیر ارشد می‌نویسد)،
  `/petty-cash-custodians/options/`، `/petty-cash-custodians/me/`،
  `/petty-cash-settings/access_summary/`.

### ۹.۲ قاعدهٔ دید (سرورساید، `pettycash/access.py`)
| نقش | تنخواه‌های قابل مشاهده |
|---|---|
| مدیر ارشد سیستم (`is_superuser`/`is_staff`/نقش `super_admin`) | همه |
| کاربران فهرست «مدیران ارشد ناظر» در تنظیمات | همه |
| تنخواه‌دار | تنخواه‌هایی که تنخواه‌دار آن‌هاست + تنخواه‌های تخصیص‌یافته |
| کمک‌تنخواه‌دار | تنخواه‌های تخصیص‌یافته + تنخواه‌های تنخواه‌دار مسئول |
| کاربر بدون تعریف | هیچ (در حالت محدودسازی فعال) |

اعمال محدودسازی در: فهرست/جزئیات تنخواه‌ها، تراکنش‌ها، صورت هزینه‌ها، درخواست‌ها، تسویه‌ها،
دفتر گردش، تقویم، داشبورد، همهٔ گزارش‌ها، مغایرت‌گیری، انتقال بین تنخواه‌ها و مراحل تأیید.
همچنین ثبت صورت هزینه/تراکنش برای تنخواه خارج از دامنهٔ دید با خطای ۴۰۳ رد می‌شود و
«ثبت هزینه» نیازمند مجوز `can_create_expense` است.

### ۹.۳ رابط کاربری
صفحهٔ جدید `frontend/src/pages/PettyCashDefinitionsPage.jsx` (مسیر `/petty-cash/definitions`،
منو: تنخواه ← پیکربندی ← تعاریف اولیه) شامل:
- کارت «کنترل دسترسی و محرمانگی»: کلید فعال/غیرفعال محدودسازی + انتخاب چندگانهٔ مدیران ارشد ناظر
- جدول تنخواه‌داران/کمک‌تنخواه‌داران با ستون‌های پرسنل، کد، واحد، نقش، تنخواه‌دار مسئول،
  تنخواه‌های مجاز، دسترسی‌ها، کاربر سیستم، وضعیت و ویرایش
- دیالوگ تعریف/ویرایش با انتخاب پرسنل، نقش، تنخواه‌دار مسئول (برای کمک‌تنخواه‌دار)،
  تنخواه‌های مجاز و کلیدهای دسترسی
- برای کاربر غیرمدیر ارشد، صفحه فقط تعریف خودش را نشان می‌دهد و دکمه‌های ویرایش غیرفعال است.



## ۱۱. جای‌گذاری منوها (نسخهٔ نهایی)

### ۱۱.۱ ماژول تنخواه (سایدبار تنخواه) — فقط عملیاتی
| گروه | آیتم‌ها |
|---|---|
| **خانه** | داشبورد |
| **عملیات** | صورت هزینه جدید · صورت ریز هزینه‌ها · دفتر تنخواه · درخواست‌ها · تسویه‌ها |
| **گزارشات** | گزارش دهی جزئیات · وضعیت تنخواه‌ها · گردش دریافت و پرداخت · هزینه به تفکیک سرفصل · هزینه به تفکیک پروژه · عملکرد تنخواه‌داران · اعتبار در برابر مصرف · تسویه‌های معوق · تاریخچهٔ تسویه‌ها · کنترل مستندات · تقویم هزینه‌ها |

### ۱۱.۲ ماژول «تنظیمات و تعاریف» (سایدبار تنظیمات) — گروه «تنخواه»
| آیتم | مسیر |
|---|---|
| تعاریف اولیه (تنخواه‌داران/کمک‌تنخواه‌داران + تعریف تنخواه‌ها + مدیران ارشد ناظر) | `/petty-cash/definitions` |
| تنظیمات تنخواه (قوانین و محدودیت‌ها) | `/petty-cash/settings` |
| سیاست تأیید | `/petty-cash/policies` |

> الگوی استفاده‌شده همان الگوی ماژول‌های دیگر است (پروژه‌ها → `/projects/definitions`،
> قراردادها → `/contracts-definitions`، حسابداری → `/settings?tab=accounting`): آیتم‌های
> پایه در سایدبار «تنظیمات و تعاریف» قرار می‌گیرند و صفحهٔ تخصصی خودشان را باز می‌کنند.
> سایدبار بر اساس ماژول انتخاب‌شدهٔ کاربر (`currentApp`) نمایش داده می‌شود، بنابراین با کلیک
> روی این آیتم‌ها، سایدبار تنظیمات حفظ می‌شود.

- صفحهٔ `PettyCashReportsPage.jsx` (`/petty-cash/reports/:report`): **هر گزارش یک صفحهٔ مستقل** است
  (بدون تب) و از آیتم منوی خودش باز می‌شود؛ هر صفحه فیلتر تاریخ/تنخواه/تنخواه‌دار/وضعیت، کارت‌های
  جمع، جدول حرفه‌ای و خروجی CSV مخصوص همان گزارش را دارد.
- صفحهٔ `PettyCashFundsTab.jsx` داخل «تعاریف اولیه»: تعریف/ویرایش تنخواه (کد، عنوان، تنخواه‌دار،
  نوع ثابت/موردی/علی‌الحساب، اعتبار اولیه، مبلغ ثابت، سقف، مهلت تسویه و بازهٔ اعتبار).
- APIهای جدید گزارش: `GET /petty-cash-reports/details/` (ریز صورت‌ها یا حرکات مالی + جمع کل + CSV)
  و `GET /petty-cash-reports/compliance-summary/` (فاقد پیوست / مغایرت مبلغ / خارج از سقف).




## ۱۳. هم‌شکل‌سازی رابط کاربری با ماژول حسابداری

| صفحهٔ تنخواه | مرجع طراحی | تغییرات کلیدی |
|---|---|---|
| صورت ریز هزینه جدید (`/petty-cash/expenses/new`) | «سند حسابداری جدید» (`AccountingDocumentNewPage`) | `PageHeader` با badge و اکشن‌های ذخیره/ارسال، کارت «مشخصات صورت هزینه» (تنخواه/تاریخ/شماره/پروژه/روش پرداخت/مرکز هزینه/شرح)، کارت «خلاصهٔ مبالغ» با `InfoCard` و `ProgressBar`، گرید ردیف‌ها با هدر چسبان و ارتفاع ثابت (`ROWS=8`, `ROW_HEIGHT=42`)، ورود کد با تایپ + `Space` برای انتخاب و `CodePickerDialog`، ردیف فعال با هایلایت و نوار رنگی، هشدارهای ردیف (معین/مبلغ/فاکتور/پیوست)، کارت «شناسه‌های ردیف انتخاب‌شده» با `MetaPill`، پیوست فایل در هر ردیف، اعداد فارسی با جداکننده |
| صورت ریز هزینه‌ها (`/petty-cash/expenses`) | «فهرست اسناد حسابداری» (`AccountingDocumentsPage`) | `PageHeader` با شمارش و «در انتظار تأیید» + اکشن‌های به‌روزرسانی/CSV/جدید، نوار جستجو + پنل فیلتر (تنخواه، از/تا تاریخ، مرحله، مرتب‌سازی، نمایش حذف‌شده‌ها)، `SurfaceCard` با هدر چسبان، انتخاب چندگانه و نوار عملیات انبوه (ارسال/تأیید/برگشت)، ستون «سطر/مستند» با هشدار «فاقد پیوست»، `TableFooter` جمع صفحه، `TablePagination`، تایم‌لاین در دیالوگ |

- فونت و اندازه‌ها از `useModulePalette().typography` و رنگ از `getPalette('pettycash')` گرفته می‌شود؛
  بنابراین تغییرات «استودیوی ظاهر» روی این دو صفحه هم اعمال می‌شود.
- صفحهٔ جدید از APIهای موجود استفاده می‌کند (`/petty-cash-funds/`, `/accounting/accounts/?kind=subsidiary`,
  `/accounting/auxiliary-accounts/`, `/projects/`, `/accounting/cost-centers/`) و ارسال چندبخشی
  (`lines[i].field`) را مانند نسخهٔ قبلی حفظ می‌کند؛ فیلدهای `vat_amount`, `tax_amount`, `net_amount`,
  `project`, `cost_center`, `payment_method` نیز ارسال می‌شوند.
- **ورود تاریخ** دقیقاً با همان متد «ورود اطلاعات معاملات فصلی خرید» انجام می‌شود: کامپوننت مشترک
  `core/components/ui/JalaliMaskedDateInput.jsx` — ارقام فارسی، ماسک `YYYY/MM/DD`، درج خودکار اسلش
  با تایپ ۸ رقم، تبدیل فوری به میلادی (`YYYY-MM-DD`) برای ارسال به API و بازنویسی مقدار معتبر در `blur`.
  این کامپوننت هم برای «تاریخ صورت» (حالت outlined) و هم برای «تاریخ هزینه» هر ردیف گرید استفاده می‌شود.




## ۱۴. کارهای باقی‌مانده (فاز ۳ و ۴)

1. اتصال اسناد دریافت/شارژ/برگشت/تسویه به `PostingTemplate` و کارتابل حسابداری (اکنون `SourceTransaction` با `source_type=transaction/settlement` تولید می‌شود ولی مسیر تصمیم در حسابداری برای آن‌ها اضافه نشده است).
2. اتصال `fund.advance_account` به `treasury.AdvanceAccount` در فرم تنخواه نوع علی‌الحساب (فیلد مدل آماده است).
3. گزارش چندارزی (معماری فعلی ریالی است؛ نیازمند تصمیم دربارهٔ ارز پایه و نرخ).
4. خروجی Excel/PDF استاندارد گزارش‌ها (CSV و چاپ صورت هزینه آماده است).
5. کنترل نقش‌محور در سطح API (اکنون احراز هویت + محدودیت شرکت).

