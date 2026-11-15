# ماژول حقوق و دستمزد Kian ERP — معماری و راهنمای توسعه

این سند وضعیت پیاده‌سازی ماژول حقوق و دستمزد (payroll) را در Kian ERP توصیف می‌کند.
ماژول به‌صورت **افزایشی** روی دادهٔ HR موجود ساخته شده و `Employee` را منبع واحد
هویت/استخدام می‌داند؛ اطلاعات پرسنلی در payroll تکرار نمی‌شود.

## 1. جریان کار

```
Draft → Open → Calculating → Calculated → Under Review → Approved
      → Payment Pending → Paid → Closed
```

* محاسبه فقط در وضعیت‌های draft/open/calculated/review قابل اجراست.
* محاسبهٔ مجدد پیش از پرداخت با `recalculate=1` و علت مجاز است.
* دورهٔ پرداخت‌شده/بسته‌شده قابل ویرایش نیست؛ اصلاح از طریق `PayrollAdjustment`
  (ثبت اصلاح با علت و دورهٔ مقصد) انجام می‌شود. اصلاح‌های **تأییدشده** با `target_period`
  در محاسبهٔ همان دوره به‌صورت آیتم `earning|deduction` اعمال می‌شوند و هنگام «پرداخت‌شده»
  وضعیت‌شان `applied` می‌شود.
* هر تغییر وضعیت/محاسبه/تأیید/ثبت سند/پرداخت در `PayrollChangeLog` ثبت می‌شود.

## 2. مدل داده

| مدل | نقش |
|---|---|
| `PayrollSettings` | سیاست شرکت: روز/ساعت کاری، ضرایب اضافه‌کاری، نرخ بیمهٔ پیش‌فرض، معافیت مالیاتی، گرد کردن |
| `PayrollInsuranceRate` | نرخ بیمهٔ مؤثر بر اساس تاریخ (جایگزین نرخ‌های hard-code) |
| `PayrollTaxBracket` | پلهٔ مالیات مؤثر بر اساس تاریخ |
| `PayrollComponent` | تعریف مؤلفهٔ حقوق (دریافتی/کسورات/هزینهٔ کارفرما) با پرچم بیمه، مالیات، بهای تمام‌شده و حساب‌ها |
| `PayrollComponentRule` | قاعدهٔ مؤثر بر اساس تاریخ برای مبلغ/درصد/فرمول مؤلفه |
| `EmployeePayrollProfile` | پروفایل حقوقی مؤثر بر اساس تاریخ (حقوق پایه، مزایا، پروژه/مرکز هزینه) |
| `EmployeePayrollComponent` | مؤلفهٔ اختصاصی پرسنل (مبلغ/فرمول) |
| `PayrollPeriod` | دورهٔ حقوق + مجموع‌ها + وضعیت + ارجاع سند/درخواست پرداخت |
| `PayrollEmployeeResult` | Snapshot محاسبهٔ هر پرسنل (کارکرد، بیمه، مالیات، خالص، هشدارها، بانک) |
| `PayrollItem` | سطرهای ریز هر نتیجه (کد/عنوان/مبلغ/نوع/مشمولیت) |
| `PayrollOvertime` | اضافه‌کاری/شب‌کاری/تعطیل‌کاری/نوبت‌کاری با وضعیت تأیید |
| `EmployeeAdvance` | مساعده با قسط و مانده و کسر کنترل‌شده |
| `EmployeeLoanInstallment` | اقساط وام HR با اتصال به دوره و پرداخت |
| `PayrollCostAllocation` | درصد تخصیص حقوق به پروژه/مرکز هزینه |
| `PayrollCost` | خوراک بهای تمام‌شده (پرسنل/پروژه/مرکز هزینه/مؤلفه/مستقیم یا غیرمستقیم) |
| `PayrollAccountMapping` | نگاشت رویداد حقوق به حساب/روزنامهٔ حسابداری |
| `PayrollBankFormat` | قالب فایل پرداخت بانکی (ستون‌ها/جداکننده/کدگذاری) |
| `PayrollPaymentBatch` / `Line` | دستهٔ پرداخت بانکی و سطرهای ذی‌نفع |
| `PayrollSettlement` | تسویه حساب پایان همکاری |
| `PayrollAdjustment` | اصلاح رسمی دورهٔ بسته/پرداخت‌شده |
| `PayrollChangeLog` | Audit ریز حقوق |

## 3. موتور محاسبه

* `payroll/engine/formula.py`: مفسر امن با AST؛ فقط عملیات ریاضی/مقایسه و توابع
  `SUM/MIN/MAX/ROUND/IF/ABS/COALESCE` مجاز است. Attribute/import/comprehension
  مسدود است. `validate_formula` هنگام ذخیرهٔ مؤلفه اجرا می‌شود.
* `payroll/engine/calculator.py`: محاسبات خالص `Decimal` (بیمه، مالیات تصاعدی،
  نرخ ساعتی/روزانه، اضافه‌کاری، جمع سطرها) — بدون Django و بدون نرخ قانونی hard-code.
* `payroll/services.py`: خواندن دسته‌ای HR/حضور/مرخصی/اضافه‌کاری/وام/مساعده در
  تعداد محدود کوئری، سپس محاسبه و ساخت Snapshot و سطرها در یک تراکنش.
* `EmployeePayrollProfile` با `effective_from` انتخاب می‌شود؛ تغییر حقوق بعدی
  محاسبات دوره‌های قبلی را تغییر نمی‌دهد.
* نتیجهٔ هر پرسنل شامل `snapshot` (هویت/واحد/قرارداد/بیمه) و `bank_snapshot` است؛
  API بانک را ماسک می‌کند (`****1234`).

## 4. یکپارچگی‌ها

* **HR**: `Employee`، `Department`، `JobTitle`، قرارداد/بیمه و حساب بانکی از HR خوانده می‌شود.
* **حضور/مرخصی**: `attendance.AttendanceRecord` و `leaves.LeaveRequest` برای کارکرد، غیبت،
  مرخصی بدون حقوق و اضافه‌کاری. اضافه‌کاری بدون تأیید به‌طور پیش‌فرض وارد محاسبه نمی‌شود.
* **وام/مساعده**: `payroll.EmployeeLoan` به `EmployeeLoanInstallment` تبدیل می‌شود؛
  اقساط سررسیدشده در دوره کسر و در `mark-paid` تسویه می‌شوند.
* **بهای تمام‌شده**: `PayrollCost` با درصدهای `PayrollCostAllocation` تولید می‌شود؛
  هر مؤلفه پرچم `affects_cost` و قابلیت تخصیص پروژه/مرکز هزینه دارد.
* **حسابداری**: `post_accounting` سند متوازن از `PayrollAccountMapping` می‌سازد
  (هزینه حقوق، بیمه کارفرما، بیمه پرداختنی، مالیات، سایر کسورات، حقوق پرداختنی).
  هیچ کد حسابی hard-code نیست.
* **خزانه**: `create_payment_request` یک `PaymentRequest` با `source_type='payroll'`
  می‌سازد؛ `mark_paid` وضعیت پرداخت و اقساط/مساعده را نهایی می‌کند.
* **چاپ**: سند `payroll-payslip` در موتور چاپ سروری (`core/print_engine`) ثبت شده است.
* **جست‌وجو**: providerهای `PayrollPeriod` و `PayrollEmployeeResult` در `core/module_search.py`.

## 5. API

| مسیر | توضیح |
|---|---|
| `GET /api/payroll/dashboard/` | داشبورد و روند دوره‌ها |
| `GET /api/payroll/options/` | گزینه‌های پرسنل/پروژه/مرکز هزینه/حساب/قالب بانکی |
| `GET /api/payroll/reports/` | گزارش روند و تفکیک واحد |
| `GET /api/payroll/reconciliation/?period=` | مغایرت حقوق/حسابداری/خزانه/بانک |
| `/api/payroll-periods/` | CRUD دوره + actions: `calculate`, `recalculate`, `open`, `review`, `approve`, `post-accounting`, `payment-request`, `mark-paid`, `close`, `reopen`, `results`, `summary` |
| `/api/payroll-results/` | نتایج (کارمند فقط فیش خودش) + `payslip` |
| `/api/payroll-profiles/` | پروفایل مؤثر حقوقی |
| `/api/payroll-components/` + `/rules/` | تعریف مؤلفه و قاعده |
| `/api/payroll-settings/` | تنظیمات شرکت |
| `/api/payroll-insurance-rates/`، `/tax-brackets/` | نرخ‌های تاریخ‌محور |
| `/api/payroll-overtimes/` | ثبت/تأیید اضافه‌کاری |
| `/api/payroll-advances/`، `/payroll-loan-installments/` | مساعده و اقساط |
| `/api/payroll-cost-allocations/`، `/payroll-costs/` | تخصیص و هزینه |
| `/api/payroll-account-mappings/`، `/payroll-bank-formats/` | نگاشت حساب و قالب بانک |
| `/api/payroll-payment-batches/` | تولید/پرداخت فایل بانکی |
| `/api/payroll-settlements/` | تسویه + `calculate`/`approve`/`mark-paid` |
| `/api/payroll-adjustments/`، `/payroll-change-logs/` | اصلاح و Audit |

## 6. امنیت و حریم خصوصی

* مجوزهای ریز منو (`hrms.payroll-*` و سازگار با `payroll.*`) از موتور مجوز Kian.
* کاربر غیرمدیر فقط نتیجهٔ پرسنل متصل به خود را می‌بیند؛ `PayrollEmployeeResultViewSet`
  در سطح queryset فیلتر می‌کند (نه فقط فرانت) و چاپ فیش نیز مالکیت را بررسی می‌کند.
* اطلاعات بانکی در serializer ماسک می‌شود؛ چاپ فقط شبا/حساب ماسک‌شده را نشان می‌دهد.
* دورهٔ بسته/پرداخت‌شده قفل است و اصلاح فقط با `Adjustment` و Audit انجام می‌شود.
* تمام عملیات حساس در `PayrollChangeLog` (کاربر/زمان/اقدام/شیء/مقادیر/علت/IP) ثبت می‌شود.

## 7. تست

```powershell
cd C:\HRMS\hrms_project
$env:SECRET_KEY='dev-only-secret-key-for-checks'
C:\HRMS\venv\Scripts\python.exe manage.py test payroll --settings=hrms_project.settings.development
```

* `payroll/tests_payroll.py`: ۱۲ تست DB-free برای فرمول امن، بیمه، مالیات تصاعدی،
  اضافه‌کاری، گرد کردن، جمع سطرها و تقویم شمسی.
* سوئیت فرانت: `payrollSmoke` (۲ تست) — داشبورد و تب دوره‌ها.

## 8. نکات عملیاتی

* نرخ‌های بیمه/مالیات را در «تنظیمات» وارد کنید؛ مقدار پیش‌فرض صفر است تا نرخ
  قانونی جعل نشود. بدون نرخ، محاسبه هشدار می‌دهد.
* قبل از ثبت سند، همهٔ رویدادهای پرکاربرد در «نگاشت حساب‌های حقوق» تعریف شوند.
* برای پرداخت بانکی، قالب بانک را در «قالب فایل پرداخت» بسازید و در تب گزارش‌ها
  فایل را تولید کنید.
* برای تخصیص بهای تمام‌شده، حداقل یک `PayrollCostAllocation` یا پروژه/مرکز هزینهٔ
  پیش‌فرض در پروفایل تعیین کنید.

