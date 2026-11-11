# AGENTS.md — handoff brief for the next coding agent

**Repo:** `C:\HRMS` (Kian ERP / HRMS) · **Remote:** `https://github.com/rezakianimajd/HRMS.git` (branch `main`)
**Last updated:** 2026-11-08 · **Baseline commit:** `32d0d0e09`

> هدف این سند: هر ایجنتی که تازه به پروژه می‌آید، بدون کشف دوباره، سریع و امن کار کند.
> Structure/headings are English; explanations and warnings are Persian; all code/commands are English and copy‑paste ready.
> این فایل را قبل از هر تغییر کامل بخوانید؛ سپس بخش مربوط به وظیفه را دوباره مرور کنید.

---

## 0) Golden rules — قواعد طلایی

1. **Verify before you finish**: backend → `manage.py check` (+ tests), frontend → the related smoke tests. هر تغییر بدون این دو، ناتمام است.
2. **UI must follow the Theme Studio** — هیچ رنگ/شعاع/سایهٔ hard‑code. از `useDesignTokens()` و `ModulePaletteContext` استفاده کنید (بخش ۶).
3. **Every list/table is a performance contract**: light serializer + targeted `select_related`/`Prefetch`, سقف عملی ~۸ کوئری برای هر صفحه (بخش ۸).
4. **Search lives in two layers**: endpoint search (`?search=` / `?q=`) **and** module search provider (`core/module_search.py`) — بدون دومی، سایدبار/پالت فرمان چیزی پیدا نمی‌کند.
5. **Never commit** scratch files (`_*.py`, `_*.txt`, `_*.sh`, `_letters_pack/` …). الگوهای `_*.<ext>` در `.gitignore` هستند؛ اگر فایل موقتی لازم شد، با پیشوند `_` در روت بسازید و در پایان پاک کنید.
6. **Secrets**: هیچ رمز/توکن/محتوای `.env` را در کد، سند یا کامیت نگذارید. رمز `sudo` سرور را همیشه از کاربر بپرسید.

---

## 1) Stack & versions

| Layer | Tech |
|---|---|
| Backend | Django 5 + Django REST Framework + SimpleJWT + django‑tenants + django‑filters + Celery (redis) |
| DB | **PostgreSQL only** (هیچ fallback برای SQLite نیست) |
| Python | venv محلی: `C:\HRMS\venv\Scripts\python.exe` (سرور: `/opt/hrms/venv`) |
| Frontend | React 18 + MUI 5.18 + `react-scripts` 5 (CRA) + `@tanstack/react-query` 5 + axios + recharts + i18next |
| i18n/UX | `LANGUAGE_CODE='fa'`, `TIME_ZONE='Asia/Tehran'`, RTL، تاریخ جلالی (`toJalali`)، اعداد فارسی (`toPersianDigits`) |
| Auth | JWT (access/refresh) در `localStorage`؛ `axiosInstance` خودکار refresh می‌کند |
| Pagination | `core.pagination.StandardResultsSetPagination` → `page_size=100`, max 1000 |

نکته: CRA build با `PUBLIC_URL=/assets` انجام می‌شود؛ فایل‌های نهایی از `/assets/static/...` سرو می‌شوند.

---

## 2) Repo layout

```
C:\HRMS
├─ hrms_project\            # Django project + apps (هر اپ = یک ماژول)
│  ├─ hrms_project\settings\{base,development,production}.py
│  ├─ core\                # shared app: Company/Domain، search engine، pagination، theme API
│  └─ <apps>\              # employees, documents, correspondences, contracts, accounting, …
├─ frontend\src\           # React app (pages/, core/, modules/)
├─ scripts\                # ابزارهای CLI (export/import مکاتبات، …)
├─ docs\                   # correspondence-attachments.md، document-management-redesign.md،
│                          # NEXT_AGENT_PROMPT.md (پرامپت آمادهٔ ایجنت بعدی)
├─ deploy-frontend.ps1     # استقرار فقط فرانت
├─ deploy-backend.ps1      # استقرار بک (+ مایگریشن)
├─ update-server.ps1       # هر دو
├─ SERVER_UPDATE.md        # راهنمای دستی سرور + عیب‌یابی
├─ README.md / INSTALLATION.md / DATABASE_MIGRATION.md
└─ ابزار کارایی: hrms_project\core\management\commands\dev_query_profile.py

---

## 3) Multi‑tenancy & database — چند‌مستاجری

- `TENANT_MODEL = 'core.Company'` و `TENANT_DOMAIN_MODEL = 'core.Domain'` — این دو در **public schema** هستند.
- `SHARED_APPS` (public): `django_tenants`, `jazzmin`, `core`, `rest_framework*`, `corsheaders`, `django_filters`, celery apps.
- `TENANT_APPS` (داخل schema هر شرکت): `employees, documents, leaves, attendance, payroll, orgchart, settings_app, correspondences, notifications, lifecycle, recruitment, appraisal, contracts, projects, pettycash, accounting, procurement, treasury, datamapping`.
- tenant فعال پروژه: **`kpsmi`** (شرکت «موسسه مدیریت راهبردی خاتم پاسارگاد»).

قواعد عملی:
1. **هر چیز مربوط به یک شرکت (مدل، تنظیمات، پروفایل بایگانی، اسناد) داخل schema است.** اگر در public کوئری بزنید خطای `relation "…" does not exist` می‌گیرید — این طبیعی است، نه باگ.
2. در **management command**ها: ابتدا شرکت را از public بخوانید، بعد کار را داخل `schema_context(...)` ببرید:
   ```python
   from django_tenants.utils import get_tenant_model, schema_context
   from core.models import Company

   company = Company.objects.filter(is_active=True).first()      # public
   for tenant in get_tenant_model().objects.exclude(schema_name='public'):
       with schema_context(tenant.schema_name):
           ...  # همهٔ مدل‌های tenant اینجا
   ```
   الگوی آماده: `correspondences/management/commands/import_letter_attachments.py` و `relocate_letter_attachments.py` (گزینهٔ `--schema`).
3. در **shell/یک‌باره** همیشه `with schema_context('kpsmi'):` بگذارید (و `HTTP_HOST='192.168.1.63'` وقتی `build_absolute_uri` صدا زده می‌شود).
4. مایگریشن: `python manage.py migrate_schemas --noinput` (سرور). برای دیدن وضعیت: `showmigrations`.
5. `Company` دارای `auto_create_schema` است؛ در تست‌های بدون DB از `SimpleTestCase` استفاده کنید (بخش ۱۰).

---

## 4) Module map — نقشهٔ ماژول‌ها

| Module slug | Backend app(s) | Frontend landing | Accent fallback |
|---|---|---|---|
| `hrms` | employees, leaves, attendance, payroll, lifecycle, appraisal, recruitment, orgchart, notifications | `/dashboard` | `#6366f1` |
| `contracts` | contracts | `/contracts-dashboard` | `#f59e0b` |
| `documents` | documents (+ settings_app profiles) | `/document-management` | `#0f766e` |
| `projects` | projects | `/projects/dashboard` | `#8b5cf6` |
| `accounting` | accounting (+ datamapping) | `/accounting` | `#0ea5e9` |
| `treasury` | treasury | `/treasury` | `#14b8a6` |
| `procurement` | procurement | `/procurement` | `#3b82f6` |
| `pettycash` | pettycash | `/petty-cash/dashboard` | `#f59e0b` |
| **`correspondence`** | **correspondences** | **`/correspondence`** | `#0ea5e9` |
| `settings` | settings_app | `/settings` (+ `/appearance`) | `#64748b` |

- مسیرها/آیکون‌ها: `frontend/src/core/constants/moduleIcons.js` (`MODULE_LANDING_PATHS`)، منوها: `frontend/src/core/config/menuConfig.js` (`getMenuForApp(slug)`).
- accent پیش‌فرض هر ماژول: `MODULE_DEFAULT_ACCENTS` در `core/context/ModulePaletteContext.jsx` (توجه: `correspondence` در این نقشه نیست؛ fallback رنگ در خود کامپوننت‌ها مثل `correspondenceUi.ACCENT` است).
- `getPalette(slug)` فقط وقتی چیزی در استودیو ذخیره شده باشد مقدار می‌دهد، وگرنه `null` → همیشه fallback بگذارید.


---

## 5) Frontend architecture — معماری فرانت

### Provider order (`frontend/src/App.jsx`)
```
ThemeProvider (MUI)               ← از palettes/mode ساخته می‌شود
└─ DesignTokenProvider(tokens)    ← resolvedDesign از استودیو تم + normalizer
   └─ AppThemeProvider            ← ThemeContext (mode, neon…)
      └─ ModulePaletteProvider    ← /settings/appearance/ GET در شروع
         └─ ApplicationProvider  ← currentApp (slug ماژول فعال)
            └─ … Pages
```

### Contexts/hooks
| چیزی | محل | کاربرد |
|---|---|---|
| `useDesignTokens()` | `core/context/DesignTokenContext.jsx` | همهٔ توکن‌های استودیو (`infoCards`, `headers`, `tables`, `lists`, `surfaces`, …) |
| `useModulePalette()` | `core/context/ModulePaletteContext.jsx` | `getPalette(slug)`, `typography`, `designTokens`, set/reset, save |
| `useModuleTheme()` | `pages/contracts/contractModuleUi.jsx` | `{ theme, tableTheme, toolbar, cardPadX, cardPadY, cardBorderColor }` |
| `useRowHeight/useModuleTableState` | همان فایل | ارتفاع ردیف بر اساس تم، صفحه‌بندی سروری |

### UI kit (از همین‌ها استفاده کنید، نه ساختن دوباره)
- `PageHeader` — `icon={<Icon/>}` **عنصر** می‌گیرد؛ badge/actions دارد و از `headers` تم پیروی می‌کند.
- `ModuleToolbar`, `ModuleTable`, `ModulePager` — نوار جست‌وجو/فیلتر/مرتب‌سازی، جدول تم‌محور، صفحه‌بندی فارسی.
- `InfoCard`, `DataTable` — کارت اطلاعات و جدول عمومی (توکن‌محور).
- **موتور فهرست خزانه**: `pages/treasury/treasuryListUi.jsx` (`TreasuryListPage` + `statusChip` + `STATUS_TONE`)
  — هدر تطبیق‌پذیر (`PageHeader`) + نوار جست‌وجو/فیلتر (جست‌وجوی debounce، فیلترهای select/تاریخ، `?status=…` از URL)
  + `ModuleTable` + `ModulePager` سروری + KPI strip + row actions (POST/GET یا `onRun` برای چاپ/دیالوگ)
  + `quickCreate`. کانفیگ‌ها: `treasuryListConfigs.jsx` (دریافت‌ها، عملیات)، `treasuryListConfigs2.jsx`
  (درخواست/دستور پرداخت، تعهدات، انتقال، علی‌الحساب، سپرده، دسته‌چک، قابل‌پرداخت)، `treasuryCheckConfigs.jsx`
  (چک دریافتی/پرداختی با همهٔ وضعیت‌های منو). صفحهٔ جدید = یک `<TreasuryListPage {...CONFIG} />`.
- **صدور سند با پیش‌نمایش چاپ**: `pages/treasury/TreasuryVoucherComposerDialog.jsx` — فرم سمت راست
  (نوع سند: فیش دریافت / حواله پرداخت / رسید انتقال + تاریخ شمسی، مبلغ، طرف حساب، حساب/صندوق، روش/نوع سند، چک و سررسید)
  و پیش‌نمایش زندهٔ قالب چاپ سمت چپ (`iframe srcDoc`) با تاریخ شمسی، مبلغ به حروف، بارکد و شمارهٔ بعدی.
  بک‌اند: `POST /api/treasury/voucher-preview/` (بدون ثبت) و `POST /api/treasury/voucher-issue/`
  (`kind: receipt|payment|transfer` → `Receipt` / `TreasuryTransaction(payment, posted)` / `TreasuryTransfer(posted)`
  + `print_url`). ماژول‌ها: `treasury/voucher_compose.py` (خالص/قابل تست) و `treasury/voucher_compose_views.py`.
  چاپ نهایی با `TreasuryVoucherDialog` روی همان `print_url` (قالب جای‌نگهدار + بارکد).
- **قالب‌های الگوی بانک پاسارگاد (۲۰۲۶-۱۱-۰۷):** دو نوع سند چاپی جدید در `treasury/print_templates.py`:
  `interbank` («حواله بین‌بانکی (شبا)» — فرم دستور پرداخت الکترونیکی بین‌بانکی پایا/ساتنا در A4) و
  `cash` («فیش نقدی» — برگ دریافت/پرداخت نقدی در A5)؛ هر دو با خانه‌های عددی مبلغ و شبا
  (`{{amount_boxes}}` / `{{destination_iban_boxes}}` — کلیدهای امن HTML). انتخاب خودکار قالب:
  `voucher_compose.template_kind_for()` و `vouchers.build_transaction_voucher` →
  `instrument_kind='sheba'` ⇒ interbank، `'cash'` ⇒ cash. تصاویر مرجع در
  `docs/refs/pasargad-satna-transfer-form.jpg` و `docs/refs/pasargad-cash-receipt.png`.
  فیلدهای مقصد (شبا/حساب/نام/کد ملی/بانک) به `TreasuryTransaction` اضافه شد
  (مایگریشن `0011`) و با `iban.is_valid` (mod 97) اعتبارسنجی می‌شوند؛ seed در `0012`.
- `AttachmentPreviewDialog` — پیش‌نمایش PDF/عکس/متن بدون دانلود + «باز کردن در تب جدید»/«دریافت».
- `LetterDetailsDialog` (`pages/correspondence/correspondenceLetterDetails.jsx`) — پروندهٔ نامه (هدر + تب‌های
  مشخصات/ارجاعات/پیوست‌ها/تاریخچه) **کاملاً پراپ‌محور**؛ برای استفادهٔ مجدد در تب مکاتبات پروندهٔ قرارداد:
  `<LetterDetailsDialog open letter={x} tab onTabChange onClose onAction={(name, payload) => …} canEditOf … />`.
- `FaviconSync` (`core/components/ui/FaviconSync.jsx`) — آیکن تب مرورگر را از **لوگوی شرکت**
  (`تنظیمات → مشخصات شرکت`) ست می‌کند. منبع داده: اندپوینت عمومی `GET /api/company/branding/`
  (`core.views.company_branding_view` / `company_branding_payload`) که `favicon_url` را با
  `?v=<updated_at>` برای شکستن کش برمی‌گرداند. بدون لوگو، هیچ لینکی تزریق نمی‌شود.
  در `App.jsx` داخل `ThemedApp` سوار است (صفحهٔ ورود هم پوشش داده می‌شود)؛ بعد از آپلود لوگو در
  `CompanyProfilePage` کوئری `['company-branding']` باطل می‌شود.

- الگوهای داشبورد: `pages/accounting/AccountingDashboardUI.jsx` (`SurfaceCard`, `KpiTile`, `KpiTileLine`, `ProgressBar`, `QuickTile`) و نسخهٔ مکاتبات `pages/correspondence/correspondenceStudioUi.jsx` (`StudioKpi`, `StudioCard`, `StudioRow`, `StudioBar`, `QuickAction`, `deltaPercent`).
- **کیت مشترک داشبورد:** `pages/contracts/contractsDashboardKit.jsx` — `Panel`، `MetricTile`، `StatRow`،
  `Track`، `SchematicRow`، `TrendChart`، `SparkLine`، `CardPager`، `EmptyNote` + هِلپرهای `money`،
  `compactMoney`، `daysUntil`/`daysText`/`daysColor`، `num`، `CARDS_PER_PAGE` و رنگ‌های `RIAL_BLUE`/`FOREIGN_VIOLET`/…
  **هر داشبورد تازه باید از این کیت ساخته شود** (داشبورد قراردادها و خریدها همین کار را می‌کنند):
  `<Panel theme={moduleTheme} icon={XIcon} color={…} title=… hint=…>…</Panel>`.

### API access
- فقط از `axiosInstance` (`core/api/axiosConfig.js`)؛ `baseURL='/api'` و JWT/refresh خودکار. دانلود باینری: `responseType:'blob'` + `URL.createObjectURL`.
- آدرس‌های پرکاربرد: `core/api/endpoints.js`, `globalSearch`, `moduleSearch`.

### Persian/RTL conventions
- همهٔ متن‌ها فارسی، `direction: rtl`؛ اعداد/مبالغ نمایش با `formatPersianNumber`/`toPersianDigits`، ورودی با `toEnglishDigits`.
- تاریخ نمایشی `toJalali`/`dateLabel`؛ تاریخ میلادی خام نشان ندهید.


---

## 6) Theme Studio — مشخصات دقیق (خیلی مهم)

**منبع داده:** `frontend/src/core/theme/designTokens.js` (`DEFAULT_DESIGN_TOKENS`, نسخه ۲).
**API:** `GET/PUT /settings/appearance/` با payload `{ palettes, typography, design }`
(بک‌اند: `settings_app/views.py::appearance_settings_view` + `settings_app/appearance_schema.py`).
**UI استودیو:** `frontend/src/pages/AppearancePage.jsx` (مسیر `/appearance`): پالت ماژول، تایپوگرافی، سطح‌ها، جدول‌ها، کارت اطلاعات، لیست‌ها، سایه‌ها، چگالی.

### Token schema (کلیدهایی که UI می‌خواند)
```js
{
  version: 2,
  typography: { family, roles: { pageHeader, sectionTitle, cardTitle, cardSubtitle,
                cardValue, tableHeader, tableCell, formLabel, input, body, button,
                chip, navItem, caption, tooltip } },      // هر نقش: { size, weight, lineHeight }
  colors: { primary, secondary, success, warning, danger, info, background, surface,
            surfaceElevated, textPrimary, textSecondary, border, divider, hover, selected },
  surfaces: { page, appHeader, sidebar, pageHeader, card, table, dialog, drawer },
  shape: { small, medium, large, pill },
  spacing: { pagePadding, sectionGap, cardPadding, tableCellPadding },
  shadows: { none, soft, card, header, dropdown, dialog, drawer, focus },
  density: { mode, tableRowHeight, inputHeight, buttonHeight },
  infoCards: { variant, surface, align, accentMode, labelPosition, iconPosition,
               valuePosition, showIcon, showLabel, showSub, showDivider, tint,
               glassOpacity, glassBlur, radius, padding, shadow },
  headers:   { variant, surface, align, accentMode, showIcon, showSubtitle,
               subtitlePosition, showBadge, iconPosition, tint, glassOpacity, glassBlur,
               radius, padding, shadow },
  tables:    { variant, surface, striped, hover, showBorders, headerStyle, headerAlign,
               headerFontSize, headerFontWeight, headerHeight, headerColorMode, headerColor,
               cellFontSize, cellFontWeight, cellAlign, cellColorMode, cellColor, numberFont,
               hoverTint, stripeTint, dividerWidth, dividerStyle, dividerColor, dividerOpacity,
               frame, frameMarginX, framePadding, singleLine, columnMinWidth, rowsPerPage,
               visibleRows, showPagination, paginationVariant, … },
  lists:     { variant, surface, itemPadding, showDivider, hover, hoverTint, … }
}
```

### Helper functions (به‌جای دست‌کاری دستی رنگ/سایه)
`core/theme/designTokens.js` → `infoCardBackground(design, config)` · `headerBackground(design, config)` ·
`tableBackground(design, config)` · `shadowValue(design, key)` · `colorWithAlpha(color, alpha)` ·
`mergeDesignTokens` · `normalizeDesignTokens` · `resolveTableTheme(tokens)`/`resolveToolbarTheme(tokens)`.

### CSS variables (تم هنگام رندر ست می‌کند)
`--hrms-region-card-bg`, `--hrms-border-card`, `--hrms-radius-large`, `--hrms-radius`, `--hrms-shadow-card`,
`--hrms-info-card-border`, `--hrms-info-card-radius`, `--hrms-table-number-font`, `--hrms-table-*`
→ همیشه با fallback: `var(--hrms-radius-large, 16px)`.

### قواعد طراحی
1. **Accent ماژول:** `const palette = useModulePalette().getPalette(currentApp?.slug); const accent = palette?.accent || FALLBACK;`
   (`getPalette` اگر چیزی ذخیره نشده باشد `null` می‌دهد.)
2. **کارت‌ها:** سطح/شعاع/سایه/آیکون/عنوان از `tokens.infoCards` یا `tokens.headers`؛ حالت‌های `solid | glass | tinted | transparent` را پشتیبانی کنید.
3. **حداقل سایز فونت:** `MIN_TYPOGRAPHY_SIZES` در `appearanceDefaults.js`.
4. **چگالی:** ارتفاع/فاصله از `tokens.tables.rowHeight` و `density`، نه عدد ثابت.
5. **دام ثبت‌شده:** `PageHeader.icon` **عنصر** (`<MailIcon/>`) ولی `SectionCard.icon`/`StudioCard.icon` **کامپوننت** (`MailIcon`) → اشتباه = **React #130** (صفحهٔ سفید).
6. رنگ‌های معنایی از `tokens.colors` یا فایل ماژول (`correspondenceUi.jsx` → `DANGER/WARN/OK/…`).


---

## 7) Recipes — دستور‌پخت‌های آماده

### 7.1 صفحهٔ فهرست جدید (List page)
**فرانت** (`frontend/src/pages/<module>/<X>Page.jsx`):
```jsx
const moduleTheme = useModuleTheme();
const pageSize = moduleTheme.tableTheme.rowsPerPage;
const { page, setPage, totalPages, pageNumbers } = useModuleTableState(total, pageSize, [search, filters]);
const { data, isLoading } = useQuery({
  queryKey: ['x-list', params],
  queryFn: () => axiosInstance.get('/x/', { params }).then((r) => r.data),
  placeholderData: (prev) => prev,
  staleTime: 30_000,
});
<ModuleToolbar theme={moduleTheme} search={search} onSearch={setSearch}
  filters={filters} sort={sort} onSort={setSort} activeFilterCount={n} onReset={reset} />
<ModuleTable ariaLabel="فهرست …" theme={moduleTheme} columns={columns} rows={rows} … />
<ModulePager tableTheme={moduleTheme.tableTheme} page={page} onPage={setPage} … />
```
**بک‌اند**: `ModelViewSet` + `filter_backends=[OrderingFilter]` + `get_serializer_class()` که برای `action == 'list'` سریالایزر سبک می‌دهد + `get_queryset()` که فقط FKهای لازم را `select_related` می‌کند.


### 7.2 داشبورد استودیویی
```jsx
const { accent } = useStudio();                       // یا useModulePalette + fallback
<StudioKpi icon={InboxIcon} label="نامه‌های وارده" value={formatPersianNumber(n)}
  hint={`این ماه: ${formatPersianNumber(m)}`} delta={deltaPercent(prev, cur)} onClick={…} />
<StudioCard icon={TuneIcon} title="صف اقدام امروز" color={WARN} action={<Button …/>}>
  <QuickAction icon={WarningAmberIcon} label="معوق" description="۱۲ مکاتبه" onClick={…} />
</StudioCard>
```
قواعد: کارت‌ها `height:100%`، شبکه‌های responsive با `gridTemplateColumns`، همهٔ اعداد فارسی، هر ویجت لینک فیلترشدهٔ فهرست داشته باشد.

### 7.3 سریالایزر سبک فهرست + قاعدهٔ N+1
```python
class XListSerializer(XSerializer):
    class Meta(XSerializer.Meta):
        fields = [f for f in XSerializer.Meta.fields if f not in ('body', 'events', 'referrals')]

# viewset
def get_serializer_class(self):
    return XListSerializer if self.action == 'list' else XSerializer

def get_queryset(self):
    qs = super().get_queryset().select_related('category', 'organization', 'party_account', 'entered_by')
    if self.action != 'list':
        qs = qs.select_related('drafter', 'created_by', 'reply_to').prefetch_related(
            'attachments', 'referrals', 'events', 'replies')
    else:
        qs = qs.prefetch_related(
            Prefetch('attachments', queryset=Attachment.objects.only('id', 'letter_id', 'title', 'file', 'size')),
            Prefetch('referrals', queryset=Referral.objects.select_related('to_user', 'to_employee')),
        )
    return qs
```
⚠️ در serializer فهرست **هرگز** M2M/related را دستی صدا نزنید (`obj.to_employees.all()` → N+1). اگر برچسب لازم است، از FKهای `select_related`شده بسازید.

### 7.4 جست‌وجوی جامع (دو لایه)
```python
# 1) endpoint: در viewset
SEARCH_FIELDS = ('number', 'subject', 'summary', 'body', 'party_account__name', 'tags', …)
SEARCH_JOIN_FIELDS = ('referrals__to_name', 'referrals__instruction',
                      'referrals__to_user__first_name', 'referrals__to_employee__last_name',
                      'attachments__title')
# ارجاعات/پیوست با زیرکوئری IN (نه join) جست‌وجو می‌شوند:
qs.filter(base_condition | Q(id__in=referral_ids) | Q(id__in=attachment_ids))
```
```python
# 2) module search (سایدبار/پالت فرمان) در core/module_search.py
PROVIDERS['<module>'] = [
    SearchProvider('app.Model', ('subject', 'number', …),
                   path=lambda obj: f'/<route>?q={_q(obj.number or obj.subject)}',
                   title_fields=('number', 'subject'), subtitle_fields=('sender_name',),
                   subtitle_display='status', icon='mail', color='#0ea5e9',
                   select_related=('party_account',),
                   extra_q=lambda term: Q(party_account__name__icontains=term) | Q(referrals__to_name__icontains=term),
                   distinct=True),
]
```
سپس با دستور `python manage.py dev_query_profile --schema kpsmi --params "search=…&page_size=20"` و یک جست‌وجوی واقعی صحت را بسنجید.

### 7.5 ماژول بایگانی/پروفایل ذخیره‌سازی + پوشه‌های DMS
1. `settings_app/models.py::default_storage_profiles()` → آیتم جدید `{module_key, module_name, root_folder, entity_folder_pattern, subfolders, allowed_extensions, max_file_size_mb, color, icon, sort_order}`.
2. seed موجود: `settings_app/archive_views.py::_ensure_seed` و `documents/management_folders.py::ensure_default_document_folders` (هر دو **get_or_create برای کلیدهای نبود** — پروفایل موجود را بازنویسی نکنید).
3. کاتالوگ کتابخانهٔ اسناد (فرانت): `core/config/documentLibraryModules.js` (label + keywords + mapping در `APPLICATION_LIBRARY_MODULES`).
4. آپلود فایل ماژول: `core/engines/archive_storage_engine.resolve_upload_path(company_id, module_key, fields, filename, fallback_dir=…)` → `archive/company_<id>/<root>/<entity>/<uuid.ext>`.

### 7.6 پیوست + پیش‌نمایش (بدون دانلود)
- serializer پیوست: `file_url` (لینک مستقیم رسانه) + `download_url` + `preview_url` (`?t=<توکن>&inline=1`).
- فرانت: **همیشه `preview_url` برای iframe/`img`/«تب جدید» و `download_url` برای «دریافت»** استفاده شود
  (`AttachmentPreviewDialog.attachmentUrls`).
- ⚠️ پیش‌نمایش در iframe فقط با `X_FRAME_OPTIONS='SAMEORIGIN'` (settings) + هدرهای `downloads.PREVIEW_HEADERS`
  + بلوک `/media/` در nginx کار می‌کند؛ `DENY` ⇒ خطای «refused to connect».
- اندپوینت دانلود از **HTTP Range** پشتیبانی می‌کند (`206` + `Content-Range`) تا نمایشگر PDF فایل بزرگ را
  تکه‌تکه بخواند.
- فرانت: `<AttachmentPreviewDialog open items={files} index={i} title={subject} onClose={…} />` و دکمه با `aria-label="مشاهدهٔ پیوست"`.
- در فهرست سبک، پیوست‌های فشرده (`id/title/kind_display/file_url/download_url/preview_url/size`) را نگه دارید تا پیش‌نمایش بدون درخواست اضافه باز شود.


---

### 7.7 چاپ — موتور چاپ یکپارچه (اجباری برای هر چاپ جدید)
**قاعده:** هیچ `window.print()` مستقیم و هیچ قالب HTML چاپی مستقل نسازید. همهٔ چاپ‌ها از موتور چاپ استفاده می‌کنند.

**بک‌اند** `core/print_engine/`:
- `components.py`: `esc` · `fa_digits` · `jalali` · `money` (جداکنندهٔ فارسی + واحد) · `amount_words` · `barcode` (Code 39) · `field_grid([(label, value)])` · `data_table(columns, rows, {total_row})` · `signatures([...])` · `watermark` · `raw(html)` (برای محتوای از قبل ایمن؛ مقدار متنی همیشه escape می‌شود).
- `layout.py`: `render_document(document, options)` → HTML کامل RTL با `@page` (A4/A5/A3/Letter، عمودی/افقی)، سرصفحهٔ برند + badge + meta، بخش‌ها، کادر مبلغ به حروف، بارکد، امضا، پاصفحه با شمارهٔ صفحه و تاریخ چاپ، واترمارک.
- `registry.py`: `render(document, payload, options, request=request)` با انواع `letter` / `table` / `custom` / `payslip` / `voucher`؛ مجوز با `can_print(user, module)` (سوپریوزر یا `view/export`؛ کاربر بدون کد ریز مسدود نمی‌شود).
- `builders/` (اسناد رسمی سروری، از ۲۰۲۶-۱۱-۰۸):
  - `payslip.py` — `payslip_document(data)` خالص + `load_payslip`؛ فیش حقوقی با مشخصات پرسنل، دو جدول مزایا/کسورات، «جمع» هر دو، مبلغ به حروف، بارکد و امضا (A5).
  - `voucher.py` — `voucher_document(data)` خالص + `load_voucher`؛ فیش دریافت / حواله پرداخت / رسید انتقال / تراکنش خزانه از دادهٔ `treasury.vouchers` (شماره، تاریخ شمسی، مبلغ به حروف، اطلاعات ابزار، کد اعتبارسنجی، واترمارک «پیش‌نویس» برای اسناد ثبت‌نشده).
  - `treasury.vouchers._document_brief` حالا `id` و `kind` هم می‌دهد تا دیالوگ سند بتواند سند استاندارد موتور چاپ را درخواست کند.
- اندپوینت‌ها: `POST /api/print/preview/` `{document, payload, options}` → `{html}` و `GET /api/print/options/`.
- تست: `core/tests_print_engine.py` (۲۶) + `core/tests_print_documents.py` (۸ تست فیش/سند خزانه) — همه بدون دیتابیس.

**فرانت** `core/print/`:
- `printEngine.js`: `printHtml(html)` (iframe مخفی، بدون پاپ‌آپ) · `printElement(target, {title, paper, orientation})` · `buildElementDocument`.
- `PrintPreviewDialog.jsx`: پیش‌نمایش iframe + دکمهٔ چاپ.
- `usePrintDocument.js`: `openDocument({document, payload, options})` / `printDocument` / `printCurrent` / `close`.
- `PrintButton.jsx`: `<PrintButton target="main" title="…" />` برای گزارش‌های کلاینتی.

```jsx
// سند رسمی از سرور (نامه/فیش/گزارش سروری)
const print = usePrintDocument();
<Button onClick={() => print.openDocument({ document: 'letter', payload: { id } })}>چاپ</Button>
<PrintPreviewDialog open={print.open} html={print.html} loading={print.loading}
  error={print.error} title={print.title} onClose={print.close} />

// گزارش کلاینتی
<PrintButton target={tableRef} title="ترازنامه" orientation="landscape" />
```
مهاجرت چاپ‌های قدیمی: `window.print()` → `PrintButton`/`printElement` (فوری) و در گام بعد سند به `registry` بک‌اند منتقل شود.

**وضعیت مهاجرت (۲۰۲۶-۱۱-۰۸):** هیچ `window.print()` در فرانت باقی نمانده است. `printElement` هم سلکتور
(`'main'`)، هم ref و هم عنصر را می‌پذیرد و در چاپ، ابزارهای رابط (دکمه/تب/فیلتر/صفحه‌بندی) را حذف می‌کند:

| محل | روش چاپ |
|---|---|
| نامهٔ مکاتبات (کشوی جزئیات) | سند سروری `document:'letter'` + `PrintPreviewDialog` |
| ۱۸ صفحهٔ گزارش/داشبورد (حسابداری، قراردادها، تقویم، چارت سازمانی، پروژه، بیمه، داشبورد) | `printElement('main', {title, orientation})` — جدول‌های عریض `landscape` |
| `SalaryPayslip` | سند سروری `document:'payslip'` + `PrintPreviewDialog` (A5)؛ fallback: `printElement(payslipRef)` |
| `LedgerDrillDialog` | `printElement(contentRef, {orientation:'landscape'})` |
| `TreasuryVoucherDialog` | قالب شرکت `printHtml(data.html)` → سند استاندارد `document:'voucher'` → `printElement(contentRef)` |
| `StatementEditorPage` | رستر `html2canvas` + `printHtml` (یک صفحهٔ A4، پیکسل‌به‌پیکسل مثل پیش‌نمایش) |

قاعدهٔ جدید: هر دکمهٔ چاپ یا `PrintButton` است یا `printElement`/`printHtml`؛ افزودن `window.print()` ممنوع.

## 8) Performance playbook — کارایی

**قواعد سخت‌گیرانه:**
1. هر صفحهٔ فهرست: **≤ ~۱۰ کوئری** برای ۲۰ ردیف (که ۴–۵ کوئری آن `SET search_path` مربوط به django‑tenants است).
2. سریالایزر فهرست سبک: بدون `body`/آرایه‌های `events`/`referrals`، پیوست/آخرین ارجاع فشرده.
3. `select_related` فقط برای FKهای لازم؛ `Prefetch(queryset=…select_related(…))` برای relatedهای لازم.
4. در جست‌وجوی چند‑جدولی از **`Q(id__in=Subquery)`** استفاده کنید، نه join + `DISTINCT`.
5. `DISTINCT` را فقط وقتی لازم است (فیلترهای M2M/join) اعمال کنید.
6. سمت کلاینت: `staleTime` فهرست ۳۰s، داشبورد ۶۰s، `refetchOnWindowFocus: false` برای داشبورد؛ `placeholderData` برای صفحه‌بندی.
7. `page_size` را بی‌دلیل بالا نبرید (سقف ۱۰۰۰). جست‌وجو ۳۰۰–۳۵۰ms debounce دارد.

**اعداد مرجع (اندازه‌گیری‌شده روی سرور، ۶٬۲۴۶ نامه):**
| Operation | Before | After |
|---|---|---|
| Letters list (20 rows) | 762 ms / 154 queries | **159 ms / 8 queries** |
| Search `بایگانی` | 2,305 ms | **424 ms** |
| Filter “without attachment” | 514 ms | **68 ms** |
| Dashboard `/letters/stats/` | 157 ms / 18 q | **57–73 ms** |
| Main SELECT of the list | 495 ms | **93 ms** |

**روش اندازه‌گیری:** `python manage.py dev_query_profile --schema kpsmi --params "page_size=20"`
(دستور مدیریتی آماده در `core/management/commands/dev_query_profile.py`؛ خروجی: زمان کل، تعداد کوئری، کوئری‌های کند و کوئری‌های تکراری با WHERE → N+1 فوراً دیده می‌شود.)
برای اندپوینت‌های دیگر: `--action stats --path /api/letters/stats/ --params ""` یا `--viewset <dotted.path> --path <url>`.

**گام‌های تشخیص کندی (به ترتیب):**
1. پروفایل بگیرید؛ اگر کوئری زیاد است → N+1 (سریالایزر/M2M).
2. اگر یک کوئری کند است → plan/join؛ `select_related` را کم کنید یا ایندکس اضافه کنید.
3. اگر جست‌وجو کند است → فیلدهای `body` و `icontains` را محدود کنید یا `pg_trgm` (بک‌لاگ).
4. اگر فرانت کند است → حجم payload (`payload KB` در پروفایل)، سپس `staleTime`/`placeholderData`.

---

## 9) Server & deployment — سرور و استقرار

### مشخصات سرور
| Item | Value |
|---|---|
| Host / user | `hradmin@192.168.1.63` (SSH key دارد؛ `ssh -o BatchMode=yes` بدون رمز کار می‌کند) |
| App dir | `/opt/hrms/hrms_project` · venv `/opt/hrms/venv` · app user `hrms` |
| Env | `/opt/hrms/hrms_project/.env` (کلیدها را همین‌جا بخوانید: `SECRET_KEY`, `ALLOWED_HOSTS`, `DB_*`, `MEDIA_ROOT`, `STATIC_ROOT`, redis) |
| Services | `gunicorn` + `nginx` (`systemctl is-active gunicorn nginx`) |
| Frontend | `/opt/hrms/frontend/build` (+ assets در `/var/www/hrms/static/`) |
| Media | `/var/www/hrms/media` — nginx مستقیم سرو می‌کند (`/media/...`, PDF به‌صورت inline) |
| DB | PostgreSQL `hrms_db` / `hrms_user@localhost` · tenant schema `kpsmi` |
| Static/Front | index.html از `/assets/static/js/main.<hash>.js` استفاده می‌کند |

### سه سناریوی استقرار
```powershell
# 1) فقط فرانت‌اند (بدون sudo؛ یک اتصال SSH)
.\deploy-frontend.ps1                 # بیلد + آپلود + جای‌گذاری + تأیید HTTP
.\deploy-frontend.ps1 -NoBuild        # فقط آپلود بیلد موجود
.\deploy-frontend.ps1 -CheckOnly      # فقط بررسی دسترسی

# 2) فقط بک‌اند (فایل‌های تحت Git + migrate + restart)
.\deploy-backend.ps1 -Migrate
.\deploy-backend.ps1 -CheckOnly

# 3) هر دو با هم
.\update-server.ps1                   # -NoMigrate -NoBuild -SkipBackend -SkipFrontend
```
**تأیید بعد از استقرار:**
```powershell
curl.exe -s -o NUL -w "index=%{http_code}\n" http://192.168.1.63/
curl.exe -s -o NUL -w "bundle=%{http_code}\n" http://192.168.1.63/assets/static/js/main.<hash>.js
# لاگ بک‌اند:
ssh -o BatchMode=yes hradmin@192.168.1.63 'journalctl -u gunicorn -n 50 --no-pager'
```

### ⚠️ دام‌های محیط (خیلی مهم)
1. **`powershell -File script.ps1` در این ماشین بی‌صدا اجرا می‌شود** (خروجی صفر، بدون اثر). از این شکل استفاده کنید:
   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\HRMS\deploy-frontend.ps1'"
   ```
2. **اجرای طولانی (بیلد/تست) را detached اجرا کنید**؛ `Start-Process powershell` ممکن است با پایان دستور کشته شود. الگوی مطمئن: یک لانچر پایتونی که `subprocess.Popen` می‌کند و لاگ می‌نویسد (نمونه: همان روشی که در استقرارها استفاده شد).
3. **sudo روی سرور:** `printf '%s\n' '<SUDO_PASSWORD>' | sudo -S bash /tmp/script.sh` — رمز را از **کاربر** بپرسید و هرگز کامیت نکنید.
4. `/tmp` سرور **tmpfs (۷.۶GB)** است؛ فایل بزرگ را در `/var/tmp` یا `/opt/hrms/import` بگذارید.
5. فایل‌های کپی‌شده در `correspondences/` و `core/` را طبق الگو `cp /tmp/x.py …; chown hrms:hrms …; systemctl restart gunicorn` جای‌گذاری کنید و **همیشه قبلش backup** بگیرید.
6. بعد از هر تغییر بک‌اند، `manage.py check` روی سرور (با `.env` sourced) و سپس restart.
7. **صفحهٔ سفید = بیلد بدون `PUBLIC_URL=/assets`.**
   - حالت ۱: بیلد محلی (`react-scripts build` بدون env) و بعد `deploy-frontend.ps1 -NoBuild` ⇒ `index.html` به
     `/static/js/...` اشاره می‌کند (404) و کل برنامه سفید می‌شود.
   - حالت ۲ (۲۰۲۶-۱۱-۰۸ برای ما رخ داد): **`PUBLIC_URL` را با `cmd.exe` ست نکنید.** دستور
     `cmd /c "cd /d C:\HRMS\frontend && set PUBLIC_URL=/assets && npm run build"` مقدار را با **فاصلهٔ انتهایی**
     ذخیره می‌کند (`'/assets '`) و خروجی می‌شود
     `<script src="/assets /static/js/main.<hash>.js">` — یک فاصلهٔ اضافه، URL نامعتبر، ۴۰۴ و **صفحهٔ سفید**،
     در حالی که `curl` خودِ باندل را ۲۰۰ نشان می‌دهد (چون فایل هست، آدرس غلط است).
   - همیشه بیلد را با خود اسکریپت (`deploy-frontend.ps1` بدون `-NoBuild`) انجام دهید و **قبل از آپلود** بیلد را چک کنید:
     ```powershell
     Select-String -Path C:\HRMS\frontend\build\index.html -Pattern '/assets /'   # باید خروجی خالی بدهد
     Select-String -Path C:\HRMS\frontend\build\index.html -Pattern 'src="/assets/static/js/main\.'
     ```
     تأیید نهایی بعد از استقرار: `curl /` باید `src="/assets/static/js/main.<hash>.js"` (بدون فاصله) بدهد و
     همان مسیر + فایل CSS + یک chunk (`/assets/static/js/949.<hash>.chunk.js`) هر سه ۲۰۰ باشند.
8. **اسکریپت‌ها را با `-Command` صدا بزنید، نه `-File`:** `powershell -File deploy-backend.ps1` بی‌صدا و بی‌اثر است.
   شکل درست: `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\HRMS\deploy-backend.ps1'"`.
   `deploy-backend.ps1` وسط کار رمز sudo می‌پرسد و در اجرای غیرتعاملی (CI/Start-Process) هالتی می‌کند؛
   در چنین حالتی فایل‌های تغییر‌یافته را با `scp` به `/tmp/...` بفرستید، سپس با یک اسکریپت bash روی سرور
   (`sudo bash /tmp/apply.sh` با `cp` + `chown hrms:hrms` + `systemctl restart gunicorn`) جای‌گذاری کنید.
   کوئری/تست سمت سرور: `sudo -u hrms bash -c 'set -a; . /opt/hrms/hrms_project/.env; set +a; cd /opt/hrms/hrms_project; PYTHONPATH=/opt/hrms/hrms_project /opt/hrms/venv/bin/python <script>'`
   (بدون `PYTHONPATH` پیام `No module named 'hrms_project'` می‌گیرید).


---

## 10) Testing & verification — تست و اعتبارسنجی

### Backend (PostgreSQL محلی معمولاً خاموش است → تست‌ها باید DB-free باشند)
```powershell
cd C:\HRMS\hrms_project
$env:SECRET_KEY='dev-only-secret-key-for-checks'; $env:PYTHONIOENCODING='utf-8'
C:\HRMS\venv\Scripts\python.exe manage.py check --settings=hrms_project.settings.development
C:\HRMS\venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=hrms_project.settings.development
C:\HRMS\venv\Scripts\python.exe manage.py test correspondences documents core --settings=hrms_project.settings.development
```
- الگوی تست: `SimpleTestCase` + `SimpleNamespace`/`unittest.mock.patch` (بدون DB). نمونه‌ها: `correspondences/tests.py`, `documents/tests.py`, `core/tests_module_search.py`.
- اگر واقعاً DB لازم شد (queryset/filter/tenant)، `TestCase` بنویسید و بدانید PostgreSQL محلی نیست؛ یا روی سرور با `schema_context` بسنجید.

### Frontend (CRA/Jest smoke tests)
```powershell
cd C:\HRMS\frontend
$env:CI='true'
npx react-scripts test --watchAll=false --testPathPattern=correspondenceSmoke
```
الگوی تست (`frontend/src/__tests__/`):
```jsx
jest.mock('../core/api/axiosConfig', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../core/context/ModulePaletteContext', () => ({ useModulePalette: () => ({ getPalette: () => null, typography: {} }) }));
const renderPage = async (element, entry = '/x') => { /* QueryClientProvider(no retry) + MemoryRouter + act + wait */ };
```
- هر کامپوننتی که `useQuery` دارد باید داخل `QueryClientProvider` رندر شود.
- **کل سوئیت زیر بار سنگین flaky می‌شود** (timeout ۵ ثانیه)؛ سوئیت‌های شکست‌خورده را تک‌تک دوباره اجرا کنید (الگوی امروز: ۵۸ سوئیت / ۲۰۷ تست سبز).

### Definition of Done
1. `manage.py check` پاک؛ مایگریشن لازم ساخته و روی سرور اعمال شده.
2. تست‌های مربوطه (بک + فرانت) سبز.
3. UI از توکن‌های استودیو تم پیروی می‌کند (هیچ رنگ هاردکد جدید).
4. اگر فهرست/جست‌وجو تغییر کرده: پروفایل کارایی گرفته و اعداد در توضیح کامیت آمده.
5. استقرار انجام و **زنده تأیید** شده (hash باندل + HTTP 200 + لاگ).
6. `git status` تمیز؛ فایل موقت `_*` باقی نمانده.

---

## 11) Lessons learned — درس‌های ثبت‌شده

1. **`relation "…" does not exist`** یعنی مدل tenant در public کوئری شده؛ از `schema_context` استفاده کنید (`Company` در public است).
2. **N+1 از M2M**: خواندن `obj.to_employees.all()` در serializer هر ردیف یک کوئری می‌زند؛ برچسب را از FKهای `select_related`شده بسازید.
3. **`select_related` زیاد هم کند است**: ۱۴ join، کوئری اصلی را از ۹۳ms به ۴۹۵ms برد؛ فقط FKهای مصرفی.
4. **جست‌وجوی join+distinct** روی ۶k رکورد ۲.۳s بود؛ با `Q(id__in=Subquery)` به ۰.۴s رسید.
5. **سقف `sync_archive_files`** (۵٬۰۰۰) مانع کامل‌شدن ایندکس ماژول‌های پرحجم می‌شد؛ ۵۰٬۰۰۰ شد.
6. **فایل‌ها باید داخل بایگانی باشند** (`archive/company_<id>/<root>/…`) وگرنه حجم/آمار ۰؛ دستور `relocate_letter_attachments --schema kpsmi --sync-dms`.
7. **seed پروفایل بایگانی** باید `get_or_create` باشد تا تنظیمات کاربر بازنویسی نشود.
8. تست‌های بک‌اند بدون `SECRET_KEY` بالا نمی‌آیند؛ env بدهید.
9. **CRA**: `PUBLIC_URL=/assets`؛ اگر رشتهٔ جدید در باندل زنده نبود، بیلد/آپلود انجام نشده یا کش مرورگر است.
10. **`git add -A`** فایل موقت را می‌آورد؛ قبل از کامیت `git status` ببینید.
11. **`PageHeader.icon` عنصر ≠ `SectionCard.icon` کامپوننت** → React #130.
12. جابه‌جایی فایل رسانه بدون به‌روزرسانی `file.name` در DB = لینک ۴۰۴.
13. **شکستن `views.py` به بستهٔ `views/` می‌تواند import جاافتاده بسازد** (`NameError` فقط در زمان اجرای
   آن متد دیده می‌شود؛ مثلاً `Organization` در `views/aliases.py` → اندپوینت `unmapped/` با 500 و
   «نگاشت‌نشده‌ها» خالی). برای همین تست `correspondences/tests_view_names.py` هر نام کلاس‌مانندِ
   تعریف‌نشده در بستهٔ views را با `ast` می‌گیرد؛ بعد از هر split این تست را اجرا کنید.
14. **`cmd.exe set VAR=value && next` فاصلهٔ انتهایی را وارد مقدار می‌کند** → `PUBLIC_URL='/assets '` →
   `index.html` با `<script src="/assets /static/js/main.<hash>.js">` → ۴۰۴ و **صفحهٔ سفید**، در حالی که
   `curl` باندل را ۲۰۰ می‌دهد. بیلد را فقط با `deploy-frontend.ps1` (که `$env:PUBLIC_URL = '/assets'` را در
   PowerShell ست می‌کند) بزنید و همیشه `Select-String -Path build\index.html -Pattern '/assets /'` را چک کنید.
15. **هوک‌های نوشتن را با نام `refetch`های واقعی صدا بزنید**: در صفحهٔ مکاتبات، ری‌فچ‌ها `refetchStats` و
   `refetchReferrals` هستند (نه `refresh…`)؛ و هر stateای که هوک برمی‌گرداند (مثل `editRowId`) باید در صفحه
   destructure شود وگرنه `ReferenceError` فقط در رندر اول دیده می‌شود (تست smoke سریع می‌گیرد).
16. **اسکریپت bash که برای سرور می‌سازید باید LF باشد.** فایلی که ادیتور ویندوز می‌سازد CRLF است و
   `sudo bash /var/tmp/x.sh` با `$'\r': command not found` یا اجرای ناقص برمی‌گردد؛ اول
   `sed -i 's/\r$//' /var/tmp/x.sh` بزنید (یا دستور را تک‌خطی با `;` بفرستید).
   همچنین `deploy-frontend.ps1` در اجرای detached می‌تواند در مرحلهٔ ۳/۴ روی SSH معلق بماند؛ در آن حالت
   `tar -czf` + `scp` بفرستید و جای‌گذاری اتمیک را با یک دستور تک‌خطی ssh انجام دهید
   (`mv build build.old.$(date +%s)` → `mv $TMP/build build` → `chmod -R u=rwX,g=rX,o=rX`).
17. **پیش‌نمایش iframe با `X_FRAME_OPTIONS='DENY'` می‌شکند** («refused to connect»): برای قاب‌گرفتن فایل‌های
   خودمان `SAMEORIGIN` بگذارید (settings + nginx `/media/`) و در پاسخ دانلود هم صریح
   `X-Frame-Options` + `frame-ancestors 'self'` بدهید. علاوه بر این، نمایشگر PDF مرورگر برای فایل‌های
   بزرگ **Range** می‌خواهد؛ بدون پاسخ `206`/`Accept-Ranges` پیش‌نمایش ناقص/کند می‌شود.
18. **در PowerShell داخل `ssh "... \\$VAR"` متغیر محلی خالی می‌شود.** برای اسکریپت‌های چندخطی سرور، یک فایل
   `.sh` بسازید، `scp` کنید، `sed -i 's/\r$//'` بزنید و `sudo bash /var/tmp/x.sh` اجرا کنید.
19. **فهرست‌های بزرگ را با `page_size` ثابت + فیلتر سمت کلاینت نسازید.** کتابخانهٔ اسناد ۵۰۰ سند آخر را
   می‌گرفت و بقیه (قراردادها/پرسنل/سازمانی) «گم» می‌شدند، در حالی که همه در DB و بایگانی بودند.
   الگوی درست: کوئری با `page`/`page_size` + پارامترهای فیلتر سروری + `ModulePager` با `count`؛
   برای پوشه هم `folder_roots` بفرستید تا بک‌اند زیرشاخه‌ها را خودش باز کند (نه محاسبهٔ کلاینتی).
20. **در کامپوننت‌های تازه هر متغیری مثل `user` را از هوک بگیرید** (`const { user } = useAuth()`)، وگرنه
   `ReferenceError: user is not defined` فقط هنگام باز شدن همان دیالوگ/تب رخ می‌دهد (صفحهٔ خطای ErrorBoundary).
   تست smoke باید خودِ دیالوگ را هم باز کند (مثل «وظیفه جدید» در `planningSmoke`) تا این نوع خطا گرفته شود.
21. **ترتیب زنجیرهٔ صورت‌وضعیت «دوره» است، نه `pk`:** اگر «دورهٔ قبل» با `pk__lt` تعیین شود، ثبت سند
   شمارهٔ ۱ برای قراردادی که از قبل سند شمارهٔ ۱۴ دارد خطای «مبلغ تجمعی کمتر از دوره قبل» می‌دهد.
   قاعده در `contracts/statement_chain.py` و آینهٔ فرانت `pages/contracts/statementChain.js` است:
   شمارهٔ عددی یکتا ⇒ مرتب‌سازی/مقایسه با شماره، در غیر این صورت شناسه (رفتار قبلی). بازمحاسبهٔ زنجیره
   (`statement_totals.recalculate_contract_statements`) هم باید با همان تابع مرتب شود، وگرنه سند تازه با
   کارکرد صفر بازنویسی می‌شود. اعتبارسنجی «قبل از ذخیره» در فرانت هم باید عدد را از `form.number` بگیرد.
22. **حریم خصوصی چت مقدم بر نقش مدیریتی است:** استثنای `is_superuser` در «دیدن گفتگو» یعنی مدیر سیستم
   می‌تواند گفتگوی خصوصی دو همکار را بخواند؛ در `communication/permissions.py` هیچ‌کدام از
   `can_view`/`visible_conversations`/`can_post`/`is_privileged` نباید شاخهٔ سوپریوزر داشته باشد
   (تنها استثنا: کانال عمومی). تستِ `ChatPrivacyTests` همین را قفل می‌کند.
23. **بیلد CRA را با `npm run build` در محیط غیرتعاملی اجرا نکنید:** `npm.ps1` هنگام ریدایرکت خروجی با
   خطای «SetConsoleWindowTitle / No process is on the other end of the pipe» می‌میرد و بیلد نیمه‌کاره
   می‌ماند. راه مطمئن: `node node_modules/react-scripts/bin/react-scripts.js build` با
   `PUBLIC_URL='/assets'` (و به‌صورت detached، چون ابزار اجرای دستور پس از ۳۰ ثانیه قطع می‌شود).



---

## 12) Current snapshot — وضعیت فعلی

- **چت: حریم مجوزها، آواتار پرسنلی و ظاهر آبی «پنل کاربران» (۲۰۲۶-۱۱-۱۰):**
  - **اعلان‌ها خودکار خوانده می‌شوند:** اکشن `read` حالا اعلان‌های همان گفتگو را هم می‌بندد
    (`_mark_conversation_notifications_read` → `notifications_read` در پاسخ) و فرانت پس از
    mark-read، کوئری `['notifications']` را باطل می‌کند؛ زنگوله و آیکن تب دیگر عقب نمی‌مانند.
  - **گیت سخت‌گیرانهٔ مجوز ماژول‌ها:** `can_read_module` روی همان موتور منوها
    (`core.engines.permission_engine.module_action_granted` + `READ_ACTIONS`) اجرا می‌شود؛
    کاربر بدون مجوز، ارجاع به رکورد را «دسترسی ندارید» می‌بیند و `label`/`url` هم در
    `MessageEntityRefSerializer` ماسک می‌شوند (چت دیگر راه دور زدن مجوز مدارک پرسنل/پرسنل نیست).
  - **آواتار پرسنلی:** `core.employee_link.employee_photo_map(user_ids)` (۲ کوئری bulk) →
    `photo_url` در اعضای گفتگو، `avatar_url`/`peer_user` در گفتگوی خصوصی و `/chat/directory/`.
    فرانت با `ChatAvatar` عکس را نشان می‌دهد و در نبود عکس **فقط حرف اول نام**.
  - **ظاهر:** پالت آبی `CHAT_BLUES` (کم‌رنگ/پررنگ، هم‌خانوادهٔ پنل کاربران) برای تب/ارسال/حباب؛
    حباب‌های تلگرام‌گونه (آواتار فرستنده در پیام‌های پیاپی، تیک خوانده‌شدن رنگی داخل حباب،
    متادیتای زمان/سنجاق در پایین حباب)؛ تب‌های استاندارد `TabsCard` (dense) برای وضعیت
    (همه/خوانده‌نشده/سنجاق‌شده) و نوع (همه/خصوصی/گروهی/کانال)؛ فاصلهٔ ۱٫۷۵ بین کارت فهرست و
    محیط چت؛ «الصاق رکورد» به‌صورت آیکن کنار ایموجی/پیوست/منشن و حذف توضیحات اضافی
    (زیر «گفتگوی سازمانی»، کنار الصاق رکورد و شمارندهٔ نویسه).
  - تست: بک‌اند `communication` (**۳۶**؛ `EntityRefPrivacyTests` و `ChatNotificationTests`
    جدید)؛ فرانت `chatSmoke` (۴)، `chatRail` (۴)، `chatMessageText` (۴)، `workspaceDock` (۱).
  - **تأیید زندهٔ `kpsmi`:** کاربران غیرسوپریوزر برای `documents`/`hr` = `False` (مگر مجوز
    داشته باشند مثل contracts برای hashemi)، ارجاع مدارک پرسنل → «دسترسی به این رکورد را
    ندارید» با `url=''`، دایرکتوری ۱۳ کاربر / ۴ عکس، ۲ از ۶ گفتگوی خصوصی `avatar_url` دارد،
    و `read` با `notifications_read=1` اعلان را خوانده کرد (۱ → ۰، سپس rollback).
  - باندل زندهٔ فرانت: **`main.95186231.js`**.
- **بازطراحی حرفه‌ای چت + امکانات پیشرفته (۲۰۲۶-۱۱-۱۰):** صفحهٔ چت به سه ستون بازنویسی شد
  (فهرست گفتگوها · رشتهٔ پیام · پنل اطلاعات) و کامپوننت‌ها شکسته شدند تا هر فایل کوچک بماند:
  `chat/chatUi.jsx` (فراداده/برچسب‌ها/هوک ظاهری `useChatLook`)، `chat/ChatMessageBubble.jsx`،
  `chat/ChatConversationRail.jsx`، `chat/ChatInfoPanel.jsx` و خودِ `ChatPage.jsx`.
  - **واکنش ایموجی:** مدل `MessageReaction` (+ مایگریشن `communication.0002`) و ماژول خالص/سرویس
    `communication/reactions.py` (`clean_emoji`، `summarize_reactions`، `toggle_reaction`).
    `POST /api/chat/messages/{id}/reactions/` با `{emoji}` به‌صورت toggle کار می‌کند و خلاصهٔ تازهٔ
    `[{emoji, count, mine, user_ids}]` را برمی‌گرداند؛ `MessageSerializer.reactions` با
    `prefetch_related('reactions')` (بدون N+1) و رویداد `reaction` در outbox.
    در UI: نوار اقدام شناور روی حباب (واکنش/پاسخ/کپی/سنجاق/ویرایش/حذف)، ۶ واکنش سریع و چیپ‌های
    واکنش با شمارش فارسی.
  - **«در حال نوشتن»:** `POST /api/chat/conversations/{id}/typing/` (بدون مدل جدید؛ رویداد `typing`
    در `ChatEvent` با `audience` اعضا و پاک‌سازی رویدادهای قدیمی‌تر از ۱۰ دقیقه). فرانت با
    throttle ۳ ثانیه اعلام می‌کند و از polling رویدادها (۴ ثانیه در گفتگوی فعال) نشان می‌دهد.
  - **سایر امکانات تازه:** تب‌های فهرست (همه/خوانده‌نشده/سنجاق‌شده) + فیلتر نوع (خصوصی/گروه/کانال)،
    نشان سنجاق/بی‌صدا روی ردیف‌ها، جست‌وجوی درون‌گفتگو (`?search=` روی پیام‌ها)، جداکنندهٔ
    «پیام‌های خوانده‌نشده» (بر اساس `membership.last_read_message`)، پرش و هایلایت پیامِ پاسخ/سنجاق،
    پیش‌نویس جدا برای هر گفتگو (`localStorage`)، پنل اطلاعات با اعضا + پیام‌های سنجاق‌شده + تنظیمات
    شخصی (سنجاق/بی‌صدا/بایگانی)، شمارندهٔ نویسه و «باز کردن در صفحهٔ کامل».
  - مایگریشن `notifications.0005` (فقط choices دسته‌ها) هم روی همهٔ schemaها اعمال شد تا
    `migrate_schemas` بدون هشدار باشد.
  - تست: بک‌اند `communication` (**۳۱**؛ شامل `ChatPrivacyTests` و `ReactionRulesTests`)، فرانت
    `chatSmoke` (۴)، `chatRail` (۴)، `chatMessageText` (۴)، `workspaceDock` (۱).
    **تأیید زندهٔ `kpsmi` (داخل تراکنش و rollback):** واکنش add/toggle = ۲۰۰ و `mine:true`،
    typing = ۲۰۰ با `audience=1` و ثبت رویداد، فهرست پیام‌ها کلید `reactions` را دارد.
    باندل زندهٔ فرانت: **`main.5b9a7ce9.js`**.
- **نوار جست‌وجوی «پروندهٔ پرسنل» استاندارد شد (۲۰۲۶-۱۱-۱۰):** `pages/EmployeeListPage.jsx` روی کیت مشترک
  تم بازنویسی شد (`useModuleTheme` + `ModuleToolbar` + `ModuleTable` + `ModulePager` + `useRowHeight`)؛
  نوار شیشه‌ای/هاردکد قبلی حذف و شعاع/سایه/ارتفاع/چیدمان از استودیو تم می‌آید.
  - **فیلترها همان‌های قبلی‌اند:** دپارتمان، عنوان شغلی، محل استقرار، لیست بیمه، وضعیت و حالا **جنسیت**
    (که در state بود ولی کنترل نداشت) + چیپ‌های «فیلتر فعال» با حذف تک‌تک و «حذف فیلترها».
  - **ترتیب:** پیش‌فرض همان `-created_at` (جدیدترین) و گزینه‌های افزوده: نام خانوادگی (الف↔ی، با
    `last_name,first_name`)، نام، کد پرسنلی، دپارتمان، عنوان شغلی، محل استقرار، تاریخ استخدام و وضعیت.
    بک‌اند `EmployeeViewSet.ordering_fields` با `department__name`/`job_title__name`/
    `work_location__name`/`insurance_list__name` گسترش یافت.
  - جست‌وجو ۳۵۰ms debounce روی `?search=` (نام، نام خانوادگی، کد ملی، کد پرسنلی، موبایل، ایمیل)،
    صفحه‌بندی سروری با `page_size` از تم (`tables.rowsPerPage`), خروجی اکسل با همان فیلتر/ترتیب.
  - تست: `__tests__/employeesListSmoke.test.js` (۳ تست: پارامترهای پیش‌فرض، ترتیب نام خانوادگی،
    پنل فیلترها). تأیید زندهٔ `kpsmi`: `?ordering=last_name,first_name` = ۲۰۰ و فهرست الفبایی بر اساس
    نام خانوادگی (۵۱ پرسنل). باندل زندهٔ فرانت: **`main.6091e142.js`**.
- **حریم خصوصی چت: بدون عضویت، هیچ‌کس (حتی سوپریوزر) گفتگو را نمی‌بیند (۲۰۲۶-۱۱-۱۰):** کاربرِ مدیر
  سیستم گفتگوی خصوصی دو همکار را در فهرست چت می‌دید، چون `communication/permissions.py` برای
  `is_superuser` استثنا داشت (`can_view`/`visible_conversations`/`can_post`/`is_privileged` همه True).
  - حالا **دیدن/ارسال/مدیریت عضو فقط با عضویت** است؛ تنها استثنا **کانال عمومی** (`kind='channel'` و
    `is_public=True`) که برای همهٔ کاربران شرکت خواندنی است (ارسال/join پس از عضویت).
  - `visible_conversations` دیگر شاخهٔ `Conversation.objects.all()` برای سوپریوزر ندارد؛ بنابراین
    فهرست، جست‌وجوی پیام (`/chat/search/`)، پیوست‌ها (`AttachmentViewSet.download`)،
    `MessageViewSet` (ویرایش/حذف/سنجاق) و کارتابل همه با همان فیلتر عضویت کار می‌کنند و
    دسترسی مستقیم به گفتگوی غیرخودی `404` می‌دهد.
  - **تأیید زندهٔ `kpsmi`:** سوپریوزر ۵ گفتگو از ۶ گفتگوی خصوصیِ خودش را می‌بیند؛ گفتگوی دو نفرِ دیگر
    لو نمی‌رود و `/api/chat/conversations/9/` و `.../9/messages/` برایش **404** است.
  - تست: `communication/tests.py::ChatPrivacyTests` (۶ تست) + کل `communication` (**۲۶ تست**).
- **ایموجی در چت (۲۰۲۶-۱۱-۱۰):** `frontend/src/pages/chat/ChatEmojiPicker.jsx` — بدون وابستگی بیرونی:
  ۵ گروه (چهره‌ها/دست‌ها/کار اداری/اشیا و نمادها/طبیعت و غذا، ~۳۵۰ ایموجی)، جست‌وجوی فارسی
  (نام/کلیدواژهٔ گروه + خود ایموجی)، چیپ دسته‌ها و فهرست «اخیر» در `localStorage`
  (`hrms-chat-emoji-recent`). در نوار نوشتن، دکمهٔ «ایموجی» (`aria-label="ایموجی"`) پاپ‌اور را باز
  می‌کند و انتخاب، ایموجی را **در محل نشانگر** درج می‌کند (`composerRef` + `setSelectionRange`).
  - **ایموجیِ تنها بزرگ‌تر نمایش داده می‌شود (سبک تلگرام):** `pages/chat/chatMessageText.js` با
    `isEmojiOnly` (پشتیبانی از ZWJ، flag، keycap، رنگ پوست و variation selector) و
    `emojiOnlyFontSize` — ۱ ایموجی ۴۴px، ۲ ⇒ ۳۸، ۳ ⇒ ۳۲، ۴ ⇒ ۲۸، ۵ ⇒ ۲۴، ۶ و بیشتر ⇒ ۲۰
    (متن معمولی همان ۱۲٫۵px). در `MessageBubble` با `data-testid="chat-message-body"` و
    `data-emoji-only` قابل تست است.
  استایل کاملاً توکن‌محور است (`--hrms-radius-large`, `--hrms-shadow-dialog`, accent ماژول).
  تست: `chatSmoke` (۳ تست؛ انتخابگر، درج در متن، ارسال `👍` در `FormData` و بزرگ‌بودن حباب ایموجی)
  + `chatMessageText.test.js` (۴ تست). باندل زندهٔ فرانت: **`main.8eb1b3b0.js`**.
- **زنجیرهٔ صورت‌وضعیت «شماره‌محور» شد (۲۰۲۶-۱۱-۱۰):** ثبت صورت‌وضعیت شمارهٔ ۱ برای قرارداد
  `C-KPSMI-05-073` خطای «مبلغ تجمعی این صورت‌وضعیت نمی‌تواند کمتر از مبلغ تجمعی دوره قبل باشد» می‌داد،
  چون «دورهٔ قبل» با `pk__lt` تعیین می‌شد و سند شمارهٔ ۱۴ (`119,418,749,420` ریال) «دورهٔ قبل» حساب می‌شد.
  - **بک‌اند** `contracts/statement_chain.py` (خالص/DB-free): `chain_mode` / `order_statements` /
    `previous_rows` — وقتی همهٔ اسناد یک زنجیره شمارهٔ عددی **یکتا** دارند ترتیب با شماره است، وگرنه
    (شمارهٔ خالی/غیرعددی/تکراری) مثل قبل با شناسه. زنجیرهٔ «صورت‌وضعیت/چندسطحی» و «تعدیل‌ها» جدا
    شمرده می‌شوند (`kind__in` در همان کوئری) تا شمارهٔ تعدیل، شمارهٔ صورت‌وضعیت را خراب نکند.
    `StatementSerializer._previous_cumulative` / `_previous_foreign_cumulative` /
    `_previous_adjustment_cumulative` و `previous_level_cumulatives` شمارهٔ سند را می‌گیرند و
    `statement_totals.recalculate_contract_statements` هم با `order_statements` مرتب می‌کند (وگرنه سند
    تازه با کارکرد صفر بازنویسی می‌شد).
  - **فرانت** `pages/contracts/statementChain.js` (آینهٔ همان قاعده): `previousPeriodRows` /
    `previousCumulativeFor` / `foreignCumulativeFor` / `adjustmentCumulativeFor` / `seedLevelsFrom`؛
    `StatementEditorPage` از آن استفاده می‌کند و افکت «بازمحاسبهٔ تجمعی دوره قبل» با `form.number`
    (وابستگی جدید effect) اجرا می‌شود.
  - **تأیید زنده (kpsmi):** سریالایزر با شمارهٔ `1`/`01` معتبر و `cumulative_previous_amount=0`؛
    شمارهٔ `15` همچنان خطای «کمتر از دوره قبل» می‌دهد. شبیه‌سازی ساخت سند #۰۱ + بازمحاسبه داخل
    `transaction.atomic()` (و rollback): سند ۵۴۹ با `previous=0, work=10,000,000` و سند ۱۴ با
    `previous=10,000,000`؛ دادهٔ واقعی دست‌نخورده ماند. `manage.py check` پاک، gunicorn ری‌استارت شد.
  - تست: `contracts/tests_statement_chain.py` (۱۲ تست DB-free)، `__tests__/statementChain.test.js`
    (۸ تست)، `contractStatementsSmoke` (۴ تست). باندل زندهٔ فرانت: **`main.a60bb616.js`**.
- **Last commit:** `feat(communication): add the organizational chat and personal planning modules`
- **Live:** frontend `main.445d7ea0.js` (HTTP 200، سرو از `/assets/static/js`) · backend deployed (ماژول‌های `communication` + `planning` و مایگریشن‌های آن‌ها روی همهٔ schemaها + موتور چاپ `core/print_engine/` + `core.urls` چاپ + مایگریشن `procurement.0004` + `GET /api/procurement/dashboard/` + `GET /api/procurement/suppliers/{id}/profile/` + `GET /api/external-contracts/completeness/` + مایگریشن‌های `accounting.0033`، `correspondences.0021/0022` + همگام‌سازی «شماره ثبت» وارده + اصلاح شمارندهٔ شماره‌گذاری + پیش‌نمایش پیوست‌ها + فیلتر سروری کتابخانهٔ اسناد)، gunicorn/celery/nginx active.
- **اعلان‌ها و حریم خصوصی برنامه‌ریزی (۲۰۲۶-۱۱-۱۰):** دو اصلاح مهم:
  - **اعلان‌های چت/برنامه‌ریزی همیشه شخصی‌اند:** `notifications/views.py::apply_notification_visibility`
    دسته‌های `chat_message|chat_mention|chat_member_added|planning_share|planning_due` را **حتی برای
    سوپریوزر** به `user_id=خودم` محدود می‌کند؛ قبلاً سوپریوزر همهٔ اعلان‌های شرکت را می‌دید و اعلانِ
    ساخته‌شده برای سایر اعضا (بابت پیام خودش) به‌نظر «اعلان پیام خودم» می‌آمد. تست: `notifications/tests.py` (۴).
  - **یادداشت/وظیفه به‌صورت پیش‌فرض خصوصی:** `planning.services.notes_for_scope/tasks_for_scope` با
    `scope=mine|shared|all` و **پیش‌فرض `mine`** (فقط مالک)؛ `scope=shared` فقط آیتم‌های اشتراک‌گذاری‌شده با من؛
    `all` صریحاً هر دو. نشان سایدبار و `/planning/summary/` هم فقط آیتم‌های خود کاربر را می‌شمارند و
    `shared_notes`/`shared_tasks` جدا گزارش می‌شوند. فرانت: انتخابگر «فقط من / اشتراکی با من / همه»
    با پیش‌فرض «فقط من» و پیام «یادداشت‌ها و وظایف شما خصوصی هستند…».
  - **تأیید زنده (`kpsmi`):** سوپریوزر اعلان چت خودش را می‌بیند و اعلان چت کاربر دیگر را **نه**؛
    کاربر دوم یادداشت مدیر را در `mine` و `all` (قبل از اشتراک) نمی‌بیند، پس از اشتراک فقط در `shared`
    می‌بیند و در `mine` هرگز. دادهٔ تست پاک شد.
  `communication` (چت) و `planning` (یادداشت/وظیفه) — با معماری «چت لایهٔ ارتباطی است، نه مالک داده».
  - **مدل‌ها (communication):** `Conversation` (نوع `direct|group|channel|system`، `related_module/object_*`،
    `post_policy`, `is_public`, `direct_key` یکتا برای گفتگوی خصوصی)، `ConversationMember` (نقش،
    `last_read_message`, `notify`, `is_pinned`, `is_archived`)، `Message` (بدنهٔ **رمزنگاری‌شده** +
    `search_tokens` به‌عنوان blind index، `reply_to`, `thread_root`, `edited_at`, `deleted_at`)،
    `MessageAttachment` (با `document` FK اختیاری به DMS ⇒ بدون کپی فایل)، `MessageEntityRef`
    (ارجاع قرارداد/پروژه/خرید/حسابداری/مکاتبه/DMS)، `MessageMention`، `MessageReceipt`، `ChatAuditLog`،
    `ChatEvent` (outbox رویداد).
  - **مدل‌ها (planning):** `Note` (متن رمزنگاری‌شده، رنگ/برچسب/چک‌لیست/سنجاق)، `Task` (وضعیت/اولویت/سررسید/
    یادآور/`source_message` برای «تبدیل پیام به وظیفه»)، `PlanningShare` (اشتراک با `view|edit`).
  - **امنیت:** `communication/crypto.py` — Fernet (`core.engines.encryption_engine`) برای متن پیام/یادداشت و
    HMAC-SHA256 (کلید مشتق از `SECRET_KEY`) به‌عنوان ایندکس کور جست‌وجو (متن در DB قابل بازسازی نیست).
    دسترسی: `communication/permissions.py` — عضویت، کانال عمومی، `post_policy` کانال، و `can_read_module`
    برای ارجاع‌ها (اگر کاربر مجوز ماژول مقصد را ندارد، برچسب ارجاع «دسترسی ندارد» می‌شود).
  - **API:** `/api/chat/conversations/` (+`messages/`, `members/`, `read/`, `preferences/`, `audit/`, `pinned/`,
    `join/`)، `/api/chat/messages/{id}/` (PATCH/DELETE)، `/api/chat/attachments/{id}/download/`،
    `/api/chat/events/?since=`, `/api/chat/unread/`, `/api/chat/directory/`, `/api/chat/search/`؛
    `/api/planning/notes/`, `/api/planning/tasks/` (+`share/`, `unshare/`, `toggle/`), `/api/planning/summary/`.
  - **Real-time (بدون بازنویسی آینده):** `communication/realtime.py` با `Publisher` و پیاده‌سازی پیش‌فرض
    `DatabaseEventPublisher` (جدول `ChatEvent`، Polling سمت فرانت). با نصب `channels`+`channels_redis`
    همان `publish()` به `ChannelsPublisher` سوییچ می‌کند و سرویس‌ها/API تغییر نمی‌کنند.
  - **اعلان‌ها:** دسته‌های تازه در `notifications.Notification` (`chat_message`, `chat_mention`,
    `chat_member_added`, `planning_share`, `planning_due`) با `entity_type='chat_conversation'|'planning_*'`؛
    `NotificationBell` به `/chat?conversation=<id>` و `/planning` مسیر می‌دهد.
  - **فرانت:** `/chat` (`pages/chat/ChatPage.jsx`) — چیدمان تلگرام‌گونه (فهرست گفتگوها + رشتهٔ پیام + نوار
    نوشتن با پیوست/منشن/ارجاع)، حباب‌های ما/دیگری، پاسخ، ویرایش/حذف، رسید «x از y خواندند»، جست‌وجو،
    ساخت گروه/کانال، اعضا. `/planning` (`pages/planning/PlanningPage.jsx`) — تب یادداشت‌ها (کارت‌های رنگی)
    و وظایف (چک‌لیست، سررسید شمسی با `JalaliMaskedDateInput`، اولویت)، اشتراک‌گذاری با کاربران.
    ریل سایدبار: دو دکمهٔ همیشگی «گفتگوی سازمانی» و «برنامه‌ریزی شخصی» با نشان خوانده‌نشده/سررسید
    (`/api/chat/unread/` هر ۳۰ ثانیه).
  - **گفتگوی خصوصی (اصلاح ۲۰۲۶-۱۱-۱۰):** `POST /api/chat/conversations/` با `{kind:'direct', user:<id>}`
    گفتگوی دو نفره را **idempotent** می‌سازد/برمی‌گرداند (`direct_key`)، عنوان در پاسخ = نام طرف مقابل
    (`ConversationSerializer.to_representation`) و `member_count` برای نمونهٔ تازه هم درست است.
    در UI: دکمهٔ «گفتگوی خصوصی» در سربرگ فهرست، گزینهٔ «گفتگوی خصوصی (دو نفره)» در دیالوگ ساخت،
    کلیک روی هر عضو در دیالوگ اعضا، و دکمهٔ میان‌بر در حالت خالی.
  - **پنجرهٔ کاری شناور (۲۰۲۶-۱۱-۱۰):** چت و برنامه‌ریزی دیگر الزاماً صفحه نیستند؛
    `core/components/ui/WorkspaceDock.jsx` (`WorkspaceDockProvider` + `useWorkspaceDock`) دو دیالوگ بزرگ
    `maxWidth="xl"` با ارتفاع ۹۰vh روی **همان صفحه‌ای که کاربر در آن است** باز می‌کند
    (`openChat(conversationId?)` / `openPlanning(tab?)` / `close…`)، پس کاربر مجبور نیست صفحه را ترک کند.
    دکمه‌های ریل سایدبار و اعلان‌ها همین شناور را باز می‌کنند؛ مسیرهای `/chat` و `/planning` هم به‌عنوان
    **صفحهٔ کامل (deep link)** باقی مانده‌اند و داخل دیالوگ دکمهٔ «باز کردن در صفحهٔ کامل» دارد.
    منطق مشترک در `ChatPanel`/`PlanningPanel` است (`embedded`, `syncUrl`, `height`)، صفحه‌ها فقط wrapperند.
    ⚠️ ارتفاع داخل دیالوگ **صریح** است (`calc(92vh - 150px)` که dock پاس می‌دهد) چون زنجیرهٔ `height:100%`
    در فلکس دیالوگ می‌تواند کوچک حل شود؛ پهنای دیالوگ `calc(100vw - 40px)` با `maxWidth:1700px` و
    فهرست گفتگوها ۳۲۰–۳۶۰px است و بقیهٔ فضا برای رشتهٔ پیام.
  - **محول‌کردن وظیفه (۲۰۲۶-۱۱-۱۰):** در فرم ساخت/ویرایش وظیفه سه حالت وجود دارد:
    **فقط خودم** (پیش‌فرض، کاملاً خصوصی) / **یک یا چند نفر** / **گروه**. مدل تازه:
    `PlanningGroup` + `PlanningGroupMember` (گروه‌های کاربری مثل «تیم مالی») و روی `Task` فیلد M2M
    `assignee_groups`؛ روی `PlanningShare` فیلدهای `role` (`assignee|editor|viewer`) و `group`.
    سرویس `planning.services.assign_task` اعضای افراد+گروه‌ها را باز می‌کند، برای هر نفر یک
    `PlanningShare(role=assignee, permission=edit)` می‌سازد (idempotent)، اعلان «وظیفه‌ای به شما محول شد»
    می‌فرستد و گروه‌های انتخابی را روی تسک ثبت می‌کند. `tasks_for_scope(scope='mine')` حالا
    «مالک **یا** مسئول انجام» است؛ `shared` فقط اشتراکی‌ها و `all` همه. API گروه‌ها:
    `/api/planning/groups/` (+`members`) و در تسک `assignees`/`groups` در بدنهٔ POST/PATCH.
    نمایش فهرست: چیپ گروه + آواتار مسئولان + چیپ «فقط من» برای وظیفهٔ خصوصی.
    تأیید زنده: گروه ۲ نفره → تسک محول‌شده به گروه، هر دو نفر در `scope=mine` دیدند و اعلان گرفتند؛
    وظیفهٔ بدون مسئول برای دیگری دیده نشد.
  - **الصاق رکورد از ماژول‌ها + بهبود طراحی چت (۲۰۲۶-۱۱-۱۰):** در نوار نوشتن، دکمهٔ «الصاق رکورد» یک
    دیالوگ جست‌وجو باز می‌کند که **در خودِ ماژول مقصد** جست‌وجو می‌کند (نه در چت):
    `GET /api/chat/entity-search/?q=&module=` → `communication/entity_search.py` با استفاده از موتور
    جست‌وجوی ماژول‌ها (`core.module_search.module_search`) و فقط ماژول‌هایی که کاربر مجوز خواندن دارد
    (`can_read_module`). خروجی برای هر رکورد: `module, module_label, object_type, object_id, label,
    subtitle, url` و در پیام به‌صورت `MessageEntityRef` (بدون کپی داده) ذخیره می‌شود؛ کارت ارجاع داخل حباب
    با آیکن ماژول و «باز کردن» نمایش داده می‌شود یا اگر کاربر مجوز نداشته باشد «دسترسی ندارد».
    ماژول‌های پشتیبانی‌شده: قراردادها، پروژه‌ها، خرید، حسابداری، خزانه‌داری، کتابخانهٔ اسناد، مکاتبات، منابع انسانی.
    فرانت: `pages/chat/EntityPickerDialog.jsx` (جست‌وجوی ۳۵۰ms debounce + چیپ فیلتر ماژول + انتخاب چندگانه)
    و ارجاع‌های چندگانه در نوار نوشتن. بهبود ظاهر: جداکنندهٔ تاریخ (امروز/دیروز/شمسی)، گروه‌بندی پیام‌های
    پشت‌سرهم یک فرستنده، حباب‌های بازطراحی‌شده و کارت‌های ارجاع.
    تأیید زنده (superuser، `kpsmi`): `q=قرارداد` → ۲۲ نتیجه از contracts/accounting/correspondence/documents؛
    `module=contracts` فقط قراردادها؛ عبارت یک‌حرفی → ۰.
  - **تست:** `communication/tests.py` (۱۴) + `planning/tests.py` (۷) DB-free؛ فرانت `chatSmoke` (۲) و
    `planningSmoke` (۲). **تأیید زندهٔ `kpsmi`:** جدول‌ها ساخته شد؛ بدنهٔ پیام در DB `gAAAAA…` (رمز)،
    `search_tokens` تولید شد، جست‌وجوی کور نتیجه داد، اعلان برای عضو ساخته شد، ویرایش در `ChatAuditLog`
    ثبت شد، حذف نرم کار کرد، یادداشت رمزنگاری و اشتراک آن با کاربر دوم دیده شد (و همهٔ دادهٔ تست پاک شد).
  - **باقی‌مانده (فاز ۲):** کانال‌های پیش‌فرض per-company، Thread/Reaction، تولید سند از پیام، Presence،
    `channels` روی سرور، و «تبدیل پیام به وظیفه» در UI (مدل/فیلد `source_message` آماده است).
- **Live:** frontend `main.00f52485.js` (HTTP 200، سرو از `/assets/static/js`) · backend deployed (موتور چاپ `core/print_engine/` + `core.urls` چاپ + مایگریشن `procurement.0004` + `GET /api/procurement/dashboard/` + `GET /api/procurement/suppliers/{id}/profile/` + `GET /api/external-contracts/completeness/` + مایگریشن‌های `accounting.0033` (سازمان‌ها و اشخاص)، `correspondences.0021` (گروه‌های شماره‌گذاری) و `correspondences.0022` (تاریخ نامهٔ اختیاری) + همگام‌سازی «شماره ثبت» وارده از اندیکاتور + اصلاح شمارندهٔ شماره‌گذاری پیشنهادی + پیش‌نمایش درون‌برنامه‌ای پیوست‌ها + فیلتر/صفحه‌بندی سروری کتابخانهٔ اسناد + کاتالوگ مجوز ۲۷۰ منو/۱۱۲۱ کد)، gunicorn/celery/nginx active.
- **مدیریت اسناد: کتابخانه حالا سروری صفحه‌بندی/فیلتر می‌شود (۲۰۲۶-۱۱-۱۰):** علت «مدارک قرارداد/پرسنلی/
  سازمانی در کتابخانه دیده نمی‌شوند» داده نبود؛ فرانت **فقط ۵۰۰ سند آخر** را یک‌جا می‌گرفت
  (`page_size: 500`) و فیلتر/جست‌وجو/صفحه‌بندی را سمت کلاینت انجام می‌داد، بنابراین با ۷٬۵۷۲ سند
  (۷٬۱۳۲ مکاتبه در صدر) مدارک قدیمی‌ترِ قرارداد/پرسنل هرگز بارگذاری نمی‌شدند.
  - **همه‌چیز از قبل یک‌جا بود:** همهٔ فایل‌ها زیر `archive/company_1/<root>/…` هستند و ایندکس شده‌اند —
    HR **۱۲۱/۱۲۱**، سازمانی **۷/۷** (همه «افراد تحت تکفل» → طبق قاعده در پروندهٔ پرسنل)، قرارداد **۲۶۷**،
    مکاتبات **۷٬۱۳۲**؛ `sync_archive_files` نتیجهٔ `created: 0` داد (چیزی بیرون بایگانی نیست).
  - **بک‌اند** (`ManagedDocumentViewSet.get_queryset`): پارامترهای تازهٔ `folder_ids`، `folder_roots`
    (زیرشاخه‌ها با پیمایش سروری درخت پوشه)، `module` (`source_module_key` یا `folder.code`)،
    `scope=mine|expiring|expired` و `ordering` — هم‌ارز همان فیلترهای سمت کلاینت. `_id_list` برای پارس
    پارامترها + ۲ تست DB-free در `documents/tests.py`.
  - **فرانت** (`pages/DocumentManagementPage.jsx`): یک کوئری سروری با
    `page/page_size/search/folder_roots/document_type/status/workflow_status/confidentiality/review/scope/ordering`،
    `count` برای `ModulePager`، حذف `filtered`/`matchesDocumentFilters`، جدول از `tableRows` (نمای پرسنلی از
    `personnelRows`)، خروجی CSV با پیمایش همهٔ صفحه‌ها، و آمار پایین جدول از `/stats/` (حجم کل/انقضا) به‌جای
    جمع صفحه. تا رسیدن فهرست پرسنل، متن «در حال بارگذاری فهرست پرسنل…» نمایش داده می‌شود.
  - **تأیید زنده (API، `kpsmi`):** `count=7572` با صفحه‌بندی؛ `folder_roots=42` (قراردادها) = **۲۶۷**؛
    `folder_roots=1` (پرسنل) = **۱۶۹**؛ `folder_roots=266` (مکاتبات) = **۷٬۱۳۲**؛ `search=قرارداد` = ۲۶۹؛
    `document_type=contract` = ۲۶۷.
  - تست: `documents` (**۳۶**) + `documentManagementSmoke` (۴، با mock فیلتر سروری) +
    `documentManagementDashboardSmoke` (۱).
- **پیش‌نمایش پیوست‌ها داخل برنامه (۲۰۲۶-۱۱-۱۰ — رفع «refused to connect»):** پیش‌نمایش PDF در
  iframe خطای مرورگر می‌داد و فقط «باز کردن در تب جدید» کار می‌کرد؛ علت‌ها و اصلاح‌ها:
  - **علت اصلی:** در فهرست مکاتبات، `previewItems` آدرس امن اندپوینت (`/api/letter-attachments/{id}/download/?t=…&inline=1`)
    را در `file_url` می‌گذاشت و جنگو با `X_FRAME_OPTIONS='DENY'` (production) پاسخ می‌داد ⇒ مرورگر قاب را
    مسدود می‌کرد.
  - **بک‌اند:** `X_FRAME_OPTIONS = 'SAMEORIGIN'` در `base.py` و `production.py` (ضد clickjacking برای
    سایت‌های دیگر حفظ می‌شود) + هدرهای صریح روی پاسخ دانلود (`downloads.PREVIEW_HEADERS`:
    `X-Frame-Options: SAMEORIGIN` و CSP `default-src 'self'; script-src 'none'; object-src 'self';
    base-uri 'none'; frame-ancestors 'self'`) + پشتیبانی **HTTP Range** (`parse_range`/`iter_chunks` →
    پاسخ `206` با `Content-Range`) تا نمایشگر PDF مرورگر فایل را تکه‌تکه بخواند؛ `Accept-Ranges: bytes`
    و `Content-Disposition: inline` برای PDF/تصویر.
  - **nginx (`/etc/nginx/sites-enabled/hrms`، بلوک `location /media/`):** پیش‌تر تنها `nosniff` و یک CSP
    با `default-src 'none'` داشت؛ حالا `X-Frame-Options "SAMEORIGIN"` و CSP
    `default-src 'self'; script-src 'none'; object-src 'self'; base-uri 'none'; frame-ancestors 'self'`
    (بکاپ: `/var/tmp/hrms.nginx.bak`).
  - **فرانت (`AttachmentPreviewDialog.jsx`):** تابع `attachmentUrls()` — پیش‌نمایش و «تب جدید» از
    `preview_url`، دکمهٔ «دریافت» از `download_url`، و fallback به `file_url/url`. تشخیص نوع فایل حالا از
    **همهٔ** نشانه‌ها (`file_name`/`file`/`file_url`/`preview_url`/`download_url`/`title`) پسوند می‌گیرد
    (قبلاً عنوان فارسی بدون پسوند باعث می‌شد PDF «پیش‌نمایش ممکن نیست» شود). اگر iframe تا ۸ ثانیه
    لود نشود یا تصویر خطا بدهد، نوار راهنمای «باز کردن در تب جدید» نمایش داده می‌شود.
  - `LetterAttachmentBriefSerializer` هم `download_url` گرفت؛ `CorrespondenceLettersPage.previewItems`
    دیگر `file_url` را بازنویسی نمی‌کند؛ `ContractLetterDetailsDialog` آیتم‌های `preview_url`-دار را هم می‌پذیرد.
  - تست: `correspondences/tests_permissions.py` (+۷ تست: هدرها، تنظیم SAMEORIGIN، Range کامل/باز/پسوندی/نامعتبر،
    `iter_chunks`) → **۲۳۹ تست** سبز؛ `__tests__/attachmentPreviewDialog.test.js` (۵ تست) و
    `correspondenceSmoke` (۱۷) سبز. تأیید زنده: پاسخ دانلود ۲۰۰ با `X-Frame-Options: SAMEORIGIN` و
    `Content-Disposition: inline`؛ درخواست `Range: bytes=0-1023` → **۲۰۶** با `Content-Range`؛
    `/media/…pdf` هم `X-Frame-Options: SAMEORIGIN` می‌دهد.
- **قراردادها به دفتر داخلی برگشتند + الصاق ۳۳۸ پیوست (۲۰۲۶-۱۱-۱۰، تصمیم کاربر):** ۴۲۰ نامهٔ
  شیت «قرارداد» از **صادره → داخلی** منتقل شدند (`direction='internal'`) و پیوست‌های همان شیت
  (هایپرلینک‌های اکسل) استخراج و به نامه‌ها الصاق شد:
  - **استخراج فایل‌ها** (`_stage_contract_files.py`): ۴۱۷ لینک شیت «قرارداد» خوانده شد؛ مسیرها نسبت به
    `Z:\Group\Accounting` حل می‌شوند؛ ۳۲۴ فایل در محل اصلی و ۲۱ فایل دیگر با پایهٔ جایگزین
    **`Z:\Everyone`** (`../S.mousavi/...` → `Z:\Everyone\S.mousavi\...`) پیدا شد → **۳۴۵ فایل / ۱٬۱۳۵MB**.
  - **آپلود/الصاق** (`_import_contract_attachments.py`): tar (`929MB`) روی سرور در `/var/tmp`، استخراج،
    سپس برای هر ردیف نامه با `source_ref='contract:<row>'` یک `LetterAttachment` با
    `company=letter.company` (**الزامی — بدون آن `null value in column "company_id"`**، چون
    `LetterAttachment` از `BaseModel` ارث می‌برد) + `title` = موضوع اکسل + `size` + `kind='attachment'`.
    نتیجه: **۳۳۸ پیوست** برای **۳۳۶ نامهٔ قرارداد** (کل پیوست‌ها ۶٬۷۸۲ → **۷٬۱۲۲**)، ۷ ردیف بدون نامه در
    سیستم، ۰ خطا؛ همهٔ ۷٬۱۲۲ فایل روی دیسک موجودند و `/media/...` = ۲۰۰.
  - **۷۲ فایل باقی‌مانده:** مسیرشان (`کل قرارداد ها/...`، `مؤسسه مدیریت راهبردی خاتم پاسارگاد/...`،
    `../Addendum/...`) با نام دقیق در پوشهٔ متناظر پیدا نشد (پوشه‌ها موجودند ولی نام فایل متفاوت است)؛
    برای این‌ها تطبیق فازی (pass 3) هم کافی نبود — نیاز به تأیید کاربر برای نام/مسیر درست.
  - **فایل‌های سرگردان:** تلاش اول (بدون `company`) در DB خطا داد ولی فایل‌ها روی دیسک نوشته شده بودند؛
    `_cleanup_orphans.py` فایل‌های بدون رکورد در DB (۳۳۸ فایل / ۱٬۱۲۳MB) را شناسایی و حذف کرد.
  - **درس:** هر `LetterAttachment`/مدل `BaseModel` در نوشتن برنامه‌ای باید `company` بگیرد؛
    `FileField.save()` تراکنشی نیست، پس مسیر «save فایل → insert» باید در except فایل را پاک کند.
- **اصلاح شماره‌گذاری پیشنهادی — پیشنهاد روی همان عدد نمی‌ماند (۲۰۲۶-۱۱-۱۰):**
  - **باگ ۱ (`numbering.extract_sequence`):** regex قالب، توکن‌های غیر `{seq}` را با `[^/\-\.\s]+`
    می‌ساخت و پیشوند دارای فاصله (`ص م`) را نمی‌گرفت → برای `5802/ص م/05` به fallback می‌رفت و
    **سال (05)** را به‌عنوان شمارهٔ سری می‌گرفت. حالا `[^/]+` است و در نبود تطبیق، **عدد ابتدای
    شماره** (`^(\d+)/`) ملاک است (قالب استاندارد `{seq}/{prefix}/{yy}`).
  - **باگ ۲ (`LetterViewSet.perform_create`):** وقتی کاربر **شمارهٔ پیشنهادی** را می‌پذیرفت، شماره
    خالی نبود پس `_assign_number` صدا زده نمی‌شد و **شمارنده جلو نمی‌رفت** (پیشنهاد بعدی همان عدد).
    حالا با انتخاب گروه شماره‌گذاری و نامهٔ غیرپیش‌نویس، `_assign_number(letter, user, series_id=…)`
    همیشه اجرا می‌شود و `sync_series_counter` شمارنده را هم‌گام می‌کند.
  - **فرانت:** `correspondenceLetterForm.jsx` — کوئری `letter-series-preview` با `staleTime: 0` و
    `refetchOnMount:'always'`، و پس از ذخیره، `['letter-series-preview']` و `META_KEY` باطل می‌شوند
    تا پیشنهاد بعدی تازه باشد.
  - **تأیید زنده (API، `kpsmi`):** گروه موقت → پیشنهاد `0700/ت س/05` → `POST /api/letters/` با همان
    شماره = ۲۰۱ → شمارنده ۷۰۱ → پیشنهاد بعدی `0701/ت س/05` → نامه ۲۰۴ حذف و گروه موقت پاک شد.
  - تست: `correspondences/tests_numbering.py` (+۳ تست: قالب `{seq}/{prefix}/{yy}` با پیشوند فاصله‌دار،
    شمارهٔ بدون قالب، fallback) → کل `correspondences` **۲۳۲ تست سبز**.
- **وضعیت زندهٔ `kpsmi` (۲۰۲۶-۱۱-۱۰):** وارده **۴٬۰۷۱** · صادره **۱٬۶۳۹** · داخلی **۴۲۰** (همان
  نامه‌های قرارداد) · پیوست فعال **۷٬۱۲۲** (۰ فایل گم‌شده).
- **قالب شمارهٔ صادره و مرتب‌سازی «آخرین سری اول» (۲۰۲۶-۱۱-۰۹):** قالب استاندارد به
  **`{seq}/{prefix}/{yy}`** برگشت (مثل ``5802/ص م/05``) چون متن فارسی/RTL است و سال در سمت چپ
  نمایش داده می‌شود؛ ``letter_numbers.normalize_letter_number`` همهٔ ۸۲۸ شمارهٔ فعال را برگرداند و
  گروه «مؤسسه» هم به `{seq}/{prefix}/{yy}` با ۴ رقم و «دانشگاه» به `{seq}` با ۳ رقم تنظیم شد.
  - **مرتب‌سازی:** کلید `?ordering=-out_no` در `LetterOrderingFilter` با دو حاشیه‌نویسی
    `_out_no_year` (دو رقم آخر بعد از «/») و `_out_no_seq` (عدد ابتدای شماره) → **اول سال نزولی،
    بعد شمارهٔ سری نزولی** (نامبرهای ساده/بدون اسلش مثل سری دانشگاه با `nulls_last` ته فهرست).
    فرانت `SORT_ORDERS.out_no`/`out_no_asc` + `defaultSortFor('outgoing') = 'out_no'` و گزینه‌های
    «شماره نامه (آخرین سری اول)» در نوار ابزار؛ لیست ۶ ردیفی ۱۶۳ms/۸ کوئری.
- **بازرسی هایپرلینک‌های اندیکاتور (پیوست‌ها، ۲۰۲۶-۱۱-۰۹):** ۱٬۲۵۰ لینک در ۵ شیت استخراج و با
  پیوست‌های برنامه مقایسه شد:
  | شیت | ردیف با لینک | پیوست کامل | بدون پیوست |
  |---|---|---|---|
  | نام های صادره | ۴ | ۴ | ۰ |
  | نامه صادره مالی | ۰ | — | — |
  | **قرارداد** | ۴۱۴ (۴۰۵ نامه در سیستم) | ۳۳۸ (۳۳۶ نامه) | ۷۲ فایل (مسیر/نام یافت نشد) + ۷ ردیف بدون نامه |
  | ارسالی به دانشگاه | ۸۰۳ | ۸۰۲ | ۱ |
  | امور بانکداری پاسارگاد | ۲۰ | ۲۰ | ۰ |
  - همهٔ **۶٬۷۷۹** فایل پیوست فعال روی دیسک موجودند (۰ فایل گم‌شده) و لینک دانلود/پیش‌نمایش ۲۰۰ است؛
    تنها شکاف واقعی: **پیوست‌های شیت «قرارداد» وارد نشده‌اند** (و یک نامهٔ دانشگاه).
- **اصلاح نهایی نامه‌های صادره طبق تصمیم کاربر (۲۰۲۶-۱۱-۰۹):** شماره‌ها با
  ``correspondences/letter_numbers.py`` (`parse_letter_number`/`normalize_letter_number`/`university_number`)
  یکسان شدند (قالب نهایی ``{seq}/{prefix}/{yy}`` — بخش «قالب شمارهٔ صادره» بالا)؛ ۱۸۰۷ نامهٔ شیت‌ها
  و ۵ نامهٔ دستی اصلاح شد.
  - **تاریخ صادره:** ستون «تاریخ وارده» در این شیت‌ها در واقع **تاریخ صدور** است → در `sent_date`
    نوشته شد (۱۱۲۰ نامه) و اگر `letter_date` خالی بود همان مقدار گرفت.
  - **قرارداد:** ۴۲۰ نامهٔ شیت «قرارداد» ابتدا از «داخلی» به **صادره** منتقل شد؛ **در ۲۰۲۶-۱۱-۱۰ طبق
    تصمیم کاربر به دفتر «داخلی» برگشت** (بخش «قراردادها به دفتر داخلی برگشتند» بالاتر).
  - **ردیف‌های خالی (شماره‌های کشیده‌شده در اکسل):** ۱۸۹ ردیف که فقط شماره داشتند (بدون موضوع، تاریخ،
    طرف و پیوست) بایگانی شدند (`is_active=False`) تا در دفتر دیده نشوند؛ معیار اعتبار: «موضوع یا تاریخ».
  - **موضوع‌های جانشین** («نامه صادره شماره …») خالی شدند تا «—» نمایش داده شود و نامه‌های بدون شماره
    در صادره بمانند (۴۲۹ مورد، بیشترشان قرارداد).
  - **گروه‌های شماره‌گذاری** با همین قالب هم‌سو شدند: «مؤسسه» = `{seq}/{prefix}/{yy}` با ۴ رقم و
    «دانشگاه» = `{seq}` با ۳ رقم.
  - وضعیت زندهٔ `kpsmi`: صادرهٔ فعال **۲۰۶۲** (بانک ۲۰، قرارداد ۴۲۰، دانشگاه ۸۰۵)، بایگانی ۱۸۹،
    بدون شماره ۴۲۹، دارای `sent_date` ۱۸۱۳؛ ۹ گروه شمارهٔ تکراری در خود اکسل باقی است (مثل
    ``05/ص م/5497`` سه‌بار) و دست‌نخورده مانده.
  - تست: `correspondences/tests_letter_numbers.py` (۱۱ تست DB-free) + کل `correspondences` (**۲۳۰ تست**).
- **تطبیق نامه‌های صادره با فایل اندیکاتور (۲۰۲۶-۱۱-۰۹):** شیت‌های «نام های صادره »، «نامه صادره مالی»،
  «قرارداد»، «ارسالی ها به دانشگاه» و «امور بانکداری پاسارگاد» با نامه‌های صادره مقایسه شدند.
  - **نقشهٔ ستون‌ها (تأیید‌شده):** در دو شیت اول ۰=شماره وارده، ۱=ترنسمیتال، ۲=تاریخ وارده،
    **۳=شماره نامه، ۴=موضوع، ۵=گیرنده**، ۶=تنظیم‌کننده، ۹=شماره اندیکاتور، ۱۰=توضیحات؛ دانشگاه:
    ۰=شماره ارسالی، ۲=تاریخ ارسال، ۳=تاریخ نامه، ۴=بابت، ۵=مبلغ، ۶=گیرنده، ۷=فرستنده، ۱۰=اندیکاتور؛
    بانک: ۳=تاریخ نامه، ۴=شماره، ۵=طرف، ۶=توضیحات.
  - **نتیجهٔ تطبیق (source_ref):** ۹۸۶ صادره + ۱۳ مالی + ۸۰۵ دانشگاه + ۲۰ بانک + ۴۲۰ قرارداد = **۲۲۴۴** نامه؛
    شماره‌ها **۱۰۰٪** منطبق بودند؛ ۱۷ موضوع، ۱۸ تاریخ و ۱۲ گیرنده اصلاح شد (subject های جانشین
    «نامه صادره شماره …» و تاریخ پایهٔ ۱۴۰۳/۰۱/۰۱ جای‌گذاری شدند).
  - **جهت نامه‌ها:** ۲۰ نامهٔ شیت بانک از «وارده» به **صادره** منتقل شدند (شماره‌هایشان صادره است)؛
    ۴۲۰ نامهٔ قرارداد فعلاً در «داخلی» باقی مانده‌اند (نیازمند تصمیم کاربر).
  - **تاریخ نامه اختیاری شد:** `letter_date` اکنون nullable است (مایگریشن `0022_letter_date_nullable`) و
    **۳۱۰** تاریخ جعلی ۱۴۰۳/۰۱/۰۱ (ردیف‌های بدون تاریخ در اکسل) پاک شد تا «—» نمایش داده شود؛
    `LetterOrderingFilter` برای فیلدهای تاریخ `nulls_last` اعمال می‌کند تا نامهٔ بدون تاریخ ته فهرست بیاید.
  - **باقی‌مانده (در نسخهٔ بعدی حل شد):** ۱۹۸ ردیف فقط-شماره با موضوع جانشین، ۴۲۰ نامهٔ قرارداد در «داخلی»،
    ۸۰۵ نامهٔ دانشگاه بدون شماره نامه — در بخش «اصلاح نهایی نامه‌های صادره» بالا انجام شد.
  - تست: `correspondences` (۲۱۷ تست) شامل تست جدید «تاریخ‌های خالی ته فهرست».

- **«شماره ثبت» وارده از فایل اندیکاتور (۲۰۲۶-۱۱-۰۹):** در شیت «نام های وارده» فایل
  `اندیکاتور مالی.xlsx` ستون **«ردیف»** = شماره ثبت ورود به شرکت (``company_reg_no``) و ستون
  **«ردیف۲»** = شماره ثبت ورود به واحد (``unit_reg_no``) است؛ ستون اول جدول وارده («شماره ثبت»)
  همان **ردیف۲** را نشان می‌دهد و شمارهٔ مؤسسه (ردیف) در خط دوم همان سلول («مؤسسه: …») و در tooltip
  می‌آید. هر دو ممکن است در منبع خالی باشند.
  - **منطق خالص** `correspondences/reg_numbers.py`: نرمال‌سازی ارقام/شماره/موضوع، `number_signature`
    (مستقل از ترتیب بخش‌های شماره)، `build_indexes`/`match_letter` با اولویت
    ``source_ref`` → شماره+تاریخ → شمارهٔ یکتا → **بخش‌های جابه‌جا** → تاریخ+موضوع →
    **پیشوند موضوع در همان تاریخ** → موضوع یکتا، و `build_updates` (فقط پرکردن خالی‌ها؛ با
    `overwrite=True` اصلاح مقادیر متفاوت).
  - **دستور** `manage.py import_incoming_reg_numbers --schema kpsmi [--path …] [--sheet …] [--dry-run] [--overwrite]`
    (روی سرور فایل اکسل را با `scp` در `/var/tmp` بگذارید؛ مسیر پیش‌فرض درایو ویندوز است).
  - **نتیجهٔ اجرا روی `kpsmi`:** از ۴٬۰۸۰ نامهٔ وارده، **۳٬۸۴۱** شمارهٔ واحد و **۲٬۵۷۴** شمارهٔ مؤسسه
    پر شد (۶۸ نامه بدون هیچ شماره: نامه‌های شیت بانک/دانشگاه و نامه‌های تازه‌ای که در اکسل نیستند)؛
    ۵ مورد جابه‌جایی (ردیف/ردیف۲) اصلاح شد و یک نامهٔ دستی با مقادیر جابه‌جا تصحیح گردید.
    چند شمارهٔ تکراری در خود اکسل وجود دارد (مثل 2088، 1214) و دست‌نخورده مانده.
  - تست: `correspondences/tests_reg_numbers.py` (۲۱ تست DB-free) + `correspondenceSmoke` (۱۷).
    اجرای دوبارهٔ دستور idempotent است (updates=0).

- **شماره‌گذاری خودکار و گروهی مکاتبات صادره (۲۰۲۶-۱۱-۰۹):** در «تنظیمات و تعاریف» گروه منوی
  **«مکاتبات اداری»** (`settings-correspondence`) اضافه شد با صفحهٔ
  **`/settings/correspondence-numbering`** («تعاریف اولیه و شماره‌گذاری») و میان‌برهای انواع مکاتبه،
  مخاطبین و نگاشت نام‌ها.
  - **مدل/مایگریشن:** `LetterSeries` به **گروه شماره‌گذاری** ارتقا یافت: `start_number` (شماره شروع)،
    `end_number` (سقف اختیاری — فقط هشدار) و `description` (`correspondences.0021_letter_series_numbering_range`).
  - **موتور** `correspondences/numbering.py`: توکن‌های `{prefix} {seq} {year} {yy} {month} {day}`،
    `validate_template`، `sequence_start`، `current_sequence`، `preview_payload` (شماره + seq + هشدار سقف)،
    `extract_sequence`/`sync_series_counter` (شمارهٔ دستیِ جلوتر، شمارنده را هم‌گام می‌کند) و
    `allocate_number` با `select_for_update`. شمارش سالانه به «شماره شروع» برمی‌گردد (نه لزوماً ۱).
  - **API:** `GET/POST /api/letter-series/` + `preview/?letter_date=`، `set-default/`، `reset-counter/`،
    فیلتر `?direction=`، جست‌وجو در عنوان/پیشوند/قالب، `letter_count` (annotate) و `last_number`
    (write-only: آخرین شمارهٔ زده‌شده ⇒ `next_number = last + 1`). `perform_create` نامه: اگر گروه
    انتخاب‌شده و شماره خالی باشد (و نامه پیش‌نویس نباشد) شماره خودکار تخصیص می‌یابد.
  - **فرانت:** `pages/correspondence/CorrespondenceNumberingPage.jsx` (کاشی‌های شاخص، چیپ‌های جهت،
    جدول گروه‌ها، فرم «سازندهٔ الگو» با چیپ توکن‌ها + نمونه‌های آماده + پیش‌نمایش زنده، شماره شروع/آخرین
    شماره/سقف، تعیین پیش‌فرض و بازنشانی شمارنده) و ابزار مشترک `correspondenceNumbering.js` (آینهٔ بک‌اند).
    در دیالوگ نامهٔ صادره فیلد **«گروه شماره‌گذاری»** اضافه شد و شمارهٔ بعدی از `preview` همان گروه
    پیشنهاد و خودکار درج می‌شود تا وقتی کاربر شماره را دستی تغییر دهد.
  - کاتالوگ مجوز: **۲۷۰ منو / ۱۱۲۱ کد / ۶۸ گروه** (`settings.correspondence-numbering.*` و …).
  - تست: `correspondences/tests_numbering.py` (۲۷ تست DB-free)، `__tests__/correspondenceNumbering.test.js`
    (۹) و `__tests__/correspondenceNumberingPage.test.js` (۳)؛ `correspondenceSmoke` (۱۷) هم گروه و
    پیشنهاد شماره را بررسی می‌کند. برای ماندن زیر سقف ۱۰۰۰ خط، `views/letters.py` به دو ماژول
    `views/series.py` (ویوست گروه‌ها) و `views/ordering.py` (مرتب‌سازی «شماره ثبت») شکسته شد.
  - دادهٔ زندهٔ `kpsmi`: سه گروه پیش‌فرض (وارده/صادره/داخلی) موجود؛ گروه آزمایشی با `start_number=500`
    پیشنهاد `م/1405/0500` داد و پس از تخصیص شمارنده به ۵۰۱ رسید (سپس پاک شد).

- **ستون «شماره ثبت» در دفتر وارده + مرتب‌سازی «آخرین اول» (۲۰۲۶-۱۱-۰۹):** جدول نامه‌های وارده
  (`/correspondence/incoming`) ستون اول **«شماره ثبت»** (فیلد `unit_reg_no` = «شماره ثبت ورود به واحد»)
  را پیش از «تاریخ ورود» دارد؛ در ویرایش درجا تغییرپذیر است و tooltip آن تاریخ ثبت ورود به واحد، شمارهٔ ثبت
  ورود به شرکت و واحد را نشان می‌دهد.
  - **مرتب‌سازی عددی سمت سرور:** `correspondences/views/letters.py::LetterOrderingFilter` +
    `reg_no_sort_expression()` — `?ordering=-reg_no` رقم‌های `unit_reg_no` را با `regexp_replace`
    استخراج و به `bigint` تبدیل می‌کند و با `nulls_last` (نامه‌های بدون شماره ته فهرست) و سپس `-id`
    مرتب می‌کند. `reg_no`/`unit_reg_no`/`unit_reg_date`/`company_reg_no` به `ordering_fields` اضافه شدند؛
    بقیهٔ ترتیب‌ها مثل قبل متنی‌اند.
  - **فرانت:** `useLetterListState.SORT_ORDERS` گزینه‌های `reg_no`/`reg_no_asc` و
    `defaultSortFor(direction)` دارد → دفتر وارده پیش‌فرض `-reg_no` (آخرین شماره اول) و بقیه «جدیدترین»؛
    گزینه‌های ترتیب نوار ابزار: «شماره ثبت (آخرین اول)» و «شماره ثبت (اولین اول)».
  - دادهٔ زندهٔ `kpsmi`: ۴۶ از ۴٬۰۷۵ نامهٔ وارده شمارهٔ ثبت دارند؛ خروجی سرور: 3882 → 3881 → 3880 …
    (لیست ۸ ردیفی ۱۷۸ms / ۸ کوئری، بدون کوئری تکراری).
  - تست: `correspondences/tests_ordering.py` (۱۲ تست DB-free) و `__tests__/correspondenceSmoke.test.js`
    (۱۷ تست، شامل وجود ستون جدید و `ordering=-reg_no`).

- **«سازمان‌ها و اشخاص» در تعاریف حسابداری (۲۰۲۶-۱۱-۰۹):** صفحهٔ جدید `/accounting/org-parties`
  (گروه «تعاریف حسابداری»، منو `acc-org-parties`) برای ثبت نهاد/شخص به‌عنوان مرجع واحد مالی:
  **۹ دسته** — سازمان و نهاد عمومی، مرجع قانونی و نظارتی (تأمین اجتماعی/امور مالیاتی/…)، کارفرما،
  سهامدار (با درصد سهام)، شرکت بیمه، حسابرس/بازرس قانونی، سایر اشخاص حقوقی، سایر اشخاص حقیقی، سایر.
  - **مدل** `accounting.OrgParty` (مایگریشن `0033_org_party_registry`): کد خودکار با پیشوند نوع
    (`ORG-0001`، `REG-0001`…)، `unit_name` برای شعبه‌ها، `parent` خودارجاع (سازمان ← شعبه)، هویت حقوقی
    (شناسه ملی/کد اقتصادی/شماره ثبت/درصد سهام)، تماس و شخص رابط، بانکی (حساب/شبا) و **چهار اتصال اختیاری**:
    `account` (حساب تفصیلی)، `contract_party`، `organization` و `correspondent` (مکاتبات). شخصیت
    حقوقی/حقیقی از نوع مشتق می‌شود (`person_type`) و فیلد تکراری نگه نمی‌داریم.
  - **API** `/api/accounting/org-parties/` (+`stats/`، `options/`، `{id}/toggle_status/`) با جست‌وجو در
    ۱۲ فیلد، فیلتر `?kind=a,b&is_active=&parent=root|id&linked=1`، `annotate(children_count)` و
    `select_related` پنج FK. حذف رکورد دارای زیرمجموعه ۴۰۰ می‌دهد. منطق خالص در
    `accounting/org_parties.py` (کد، برچسب، آمار) و گیت مجوز در `accounting/permissions.py`
    (`accounting.acc-org-parties.*` با fallback ماژول‌محور). provider جست‌وجوی سراسری در
    `core/module_search.py`.
  - **فرانت** `pages/accounting/OrgPartiesPage.jsx`: سرصفحهٔ توکن‌محور + ۴ کاشی شاخص + چیپ‌های نوع
    (با شمارش و فیلتر سروری) + جست‌وجوی debounce + `ModuleTable`/`ModulePager` + پروندهٔ رکورد
    (شش کارت اطلاعاتی) + فرم بخش‌بندی‌شده (نوع/هویت/تماس/بانکی/ارتباط ماژول‌ها) + حذف با تأیید +
    چاپ با `PrintButton`. دکمه‌ها با `core/utils/accountingPermissions.js` (آینهٔ بک‌اند) گیت می‌شوند.
  - تست: `accounting/tests_org_parties.py` (۳۴ تست DB-free) و `__tests__/orgPartiesSmoke.test.js` (۵ تست).
    دادهٔ زندهٔ `kpsmi` هنگام استقرار: ۰ رکورد (صفحه آمادهٔ ثبت)؛ list ۵ms/۲query و `stats` ۲ms/۰query.

- **کارایی ماژول قراردادها (۲۰۲۶-۱۱-۰۸):** داشبورد/فاکتورها/صورت‌وضعیت‌ها/پرداخت‌ها/الحاقیه‌ها/تضامین و تحلیل مالی
  کند بودند (اندازه‌گیری با `dev_query_profile` روی `kpsmi`):
  | اندپوینت | قبل | بعد |
  |---|---|---|
  | `/external-contracts/?page_size=500` | 2702ms / 4236q / 1944KB | **302ms / 60q / 363KB** |
  | `/external-contracts/?page_size=20` | 169ms / 130q | **76ms / 30q** |
  | `/external-contracts/stats/` | 252ms / 46q | **18ms / 14q** |
  | `/contract-addendums/?page_size=500` | 430ms / 468q | **102ms / 8q** |
  | `/external-contracts/guarantees-overview/` | 818ms / 1669q | **78ms / 6q** |
  - `guarantees_overview` دیگر `.iterator()` ندارد (iterator پیش‌بارگذاری را نادیده می‌گرفت و برای هر
    قرارداد تضامین/الحاقیه‌ها/طرف را جدا می‌خواند) و با `prefetch_related('guarantees','addendums')`
    اجرا می‌شود.
  - `ContractListSerializer` (سبک) برای `action in ('list','options')`: بدون اسناد/لاگ/اختلاف/متن‌های بلند و با
    آرایه‌های فشرده (`ContractInvoiceBriefSerializer`/`StatementBrief`/`PaymentBrief`/`GuaranteeBrief` +
    `AddendumBrief`/`DisputeBrief`) و `documents_count` (annotate) به‌جای اسناد کامل — چون داشبورد و تقویم
    همین آرایه‌ها را می‌خوانند و حذف‌شان داده را خالی نشان می‌داد.
  - `ContractViewSet._lean_queryset()`: `select_related` چهار FK لازم + `Prefetch` با `.only()` برای
    invoices/statements/payments/guarantees/addendums (+`payment_allocations` فقط `amount/kind`).
    prefetch سنگین قبلی (۱۴ رابطه + `addendums__documents`/`guarantees__actions`/`audit_logs`) فقط برای
    `action='retrieve'` (پروندهٔ قرارداد) می‌ماند.
  - `GET /api/external-contracts/options/` (جدید): فهرست سبک با `values()` برای انتخابگرها — صفحات فاکتورها،
    پرداخت‌ها، الحاقیه‌ها و `GuaranteesPage` از آن استفاده می‌کنند (به‌جای `?page_size=500`).
  - `stats` دیگر prefetch فهرست را برنمی‌دارد و `get_project_allocations_display` نام پروژه‌ها را در سطح
    سریالایزر کش می‌کند (قبلاً هر قرارداد یک کوئری `projects_project`).
  - `AddendumViewSet`: `select_related('contract__party','contract__currency','currency')` + prefetch
    `documents` با `select_related('contract__party', …)` و `contract__addendums` (N+1 تضمین/طرف/الحاقیه بسته شد).

- **«ظاهر و پوسته» تب‌بندی شد و تنظیم ورود منتقل شد (۲۰۲۶-۱۱-۰۸):** `pages/AppearancePage.jsx` حالا پنج تب دارد
  (`APPEARANCE_TABS`، کلید تب در آدرس `?tab=…` ذخیره می‌شود و `data-testid="appearance-tabs"` دارد):
  **پوسته‌ها** (کارت‌های تم + رنگ نئون در F-مود) · **پالت‌های رنگی** (پالت هر ماژول) · **استودیو تم**
  (`ThemeStudioCard`) · **ورود** · **فونت و اندازه‌ها** (`TypographyCard`).
  کل بخش «ظاهر صفحهٔ ورود» از `pages/CompanyProfilePage.jsx` (که از ۶۰۰+ خط به ۲۱۰ خط رسید) به
  `pages/appearance/LoginBrandingPanel.jsx` منتقل شد — همان امکانات (تصویر/گرادیانت، رنگ پوشش، بلور،
  اندازه و رنگ پنل لوگو، رنگ متن‌ها، پیش‌نمایش زنده) با `PanelSection` محلی. تست:
  `__tests__/appearanceTabsSmoke.test.js` (۳ تست: پنج تب، محتوای تب ورود، و payload ذخیره).
- **رنگین‌کمان خطی + فاصلهٔ آیکن/عنوان ماژول (۲۰۲۶-۱۱-۰۸):** پریست `rainbow` جای `conic-rainbow` را گرفت و
  به‌جای `conic-gradient` (که همهٔ رنگ‌ها را در مرکز جمع می‌کرد) با `linear-gradient(<angle>deg, ۷ رنگ)` یعنی
  **نوارهای مورب روی کل صفحه** رندر می‌شود؛ شناسهٔ قدیمی با `PRESET_ALIASES` (`colorUtils`) و
  `GRADIENT_PRESET_ALIASES` (بک‌اند) به `rainbow` مهاجرت می‌شود، پس دادهٔ ذخیره‌شدهٔ قبلی هم درست نمایش داده
  می‌شود. برای این پریست انتخابگر رنگ در UI پنهان است (رنگ‌ها ثابت) و `gradientColorCount('rainbow') === 0`.
  در کارت‌های ماژول، فاصلهٔ آیکن↔عنوان با **`gap: 20px`** (به‌جای `spacing` که در RTL قابل اتکا نبود) و
  آیکن ۴۲px تنظیم شد؛ `CompanyIdentity` هم `gap: 10px` گرفت. تست: `settings_app/tests_login_branding.py` (۳۵)
  و `__tests__/loginAndModuleSelectionSmoke.test.js` (۸).
- **لوگوی پنل ورود: اندازه و رنگ قابل تنظیم (۲۰۲۶-۱۱-۰۸):** کلیدهای جدید `logo_size` (۸۰–۳۲۰px،
  پیش‌فرض ۱۷۶، `MIN/MAX_LOGO_SIZE` + `_logo_size()` در `settings_app/login_branding.py`) و
  `logo_panel_color` (هگز، پیش‌فرض `#ffffff`). فرانت: `LOGIN_LOGO_SIZE` و `clampLogoSize` در
  `colorUtils.js`؛ `resolveLoginBranding` حالا `logoSize`/`logoPanelColor` می‌دهد. در تنظیمات شرکت:
  اسلایدر «اندازهٔ لوگوی پنل ورود» (گام ۴px) + فیلد رنگ «رنگ پس‌زمینهٔ پنل لوگو» و این دو در
  `submitBranding` ارسال می‌شوند؛ پیش‌نمایش کارت هم همان رنگ/نسبت اندازه را نشان می‌دهد. لوگوی موبایل
  ۰٫۴۲× اندازهٔ انتخابی (بین ۵۶ و ۱۱۰px) است. فاصلهٔ آیکن/عنوان کارت‌های ماژول از `1.1` به `2`
  (≈۱۶px) و آیکن ۴۰px شد (RTL). تست‌ها: `settings_app/tests_login_branding.py` (۳۴) و
  `__tests__/loginAndModuleSelectionSmoke.test.js` (۸).
- **پس‌زمینهٔ گرادیانتی صفحهٔ ورود (۲۰۲۶-۱۱-۰۸):** به‌جای تصویر می‌توان **گرادیانت رنگی** انتخاب کرد.
  - بک‌اند `settings_app/login_branding.py`: کلیدهای `background_kind` (`image|gradient`) و
    `gradient: {preset, angle, colors[2..4]}` با پریست‌های `linear-two|linear-three|linear-four|radial|
    conic-rainbow|mesh`؛ `_gradient()` رنگ‌ها را هگز/حداکثر ۴ رنگ اعتبارسنجی می‌کند و زاویه را `mod 360`
    می‌برد؛ `save_login_branding` گرادیانت را **partial-merge** می‌کند و آپلود تصویر خودکار
    `background_kind='image'` می‌گذارد.
  - فرانت `core/utils/colorUtils.js`: `LOGIN_GRADIENT_PRESETS`، `normalizeLoginGradient`،
    `loginGradientCss`، `gradientColorCount` و `resolveLoginBranding` → `backgroundKind` / `gradient` /
    `gradientCss` / `useGradient`.
  - UI: در «تنظیمات → مشخصات شرکت → ظاهر صفحهٔ ورود» یک `ToggleButtonGroup` **تصویر پس‌زمینه / گرادیانت رنگی**؛
    در حالت گرادیانت: چیپ‌های پریست (۲/۳/۴ رنگ، شعاعی، رنگین‌کمان، مش)، انتخاب رنگ هر استاپ، اسلایدر زاویه
    (۰–۳۶۰) و پیش‌نمایش زندهٔ کارت. **سوئیچ «بلور پس‌زمینه»** بلور را کامل خاموش/روشن می‌کند و در حالت گرادیانت
    غیرفعال است؛ رنگ/شفافیت پوشش (`overlay_color`/`overlay_opacity`) روی گرادیانت هم اعمال می‌شود (۰ = گرادیانت خالص).
  - صفحهٔ ورود لایهٔ `data-testid="login-branding-gradient"` (`data-gradient-preset/-angle/-colors`) را
    رندر می‌کند؛ تست‌ها: `settings_app/tests_login_branding.py` (۳۲) و
    `__tests__/loginAndModuleSelectionSmoke.test.js` (۷).
- **جزئیات بصری کارت ورود (۲۰۲۶-۱۱-۰۸):** خط جداکنندهٔ خاکستری جلوی سربرگ‌های «ورود اطلاعات»/«انتخاب ماژول»
  حذف شد (فقط `Typography` با `mb`)؛ لوگوی پنل سمت چپ از ۱۷۶ به **۲۴۰px** (موبایل ۷۸px) رسید؛ و در فیلد
  «شرکت» به‌جای آیکن عمومی، **لوگوی همان شرکت** (`CompanyLogo` سایز ۲۴) با `startAdornment` نمایش داده می‌شود
  (بدون لوگو → مونوگرام). تست: `__tests__/loginAndModuleSelectionSmoke.test.js` (۵، شامل بررسی `<img>` داخل
  فیلد شرکت).
- **ترنزیشن چرخشی ورود ⇄ انتخاب ماژول (۲۰۲۶-۱۱-۰۸):** در `pages/Login.jsx` پس‌زمینهٔ صفحه **بیرون از کارت**
  رندر می‌شود و همیشه mount می‌ماند؛ داخل صحنهٔ `perspective` یک بلوک `data-testid="login-flip"`
  (`data-flip-step`/`data-flip-pose`) قرار دارد که فقط **کارت** را با `rotateY(±84deg) + scale(.94)` می‌چرخاند
  (خروج ۲۰۰ms، ورود ۳۶۰ms؛ `prefers-reduced-motion` خاموش می‌شود) و با `goToStep(next, direction)` تعویض
  می‌شود. برای همین، کارت انتخاب ماژول به دو بخش شکسته شد: `ModuleSelectionCard` (فقط کارت، برای صحنهٔ چرخش)
  و `ModuleSelection` پیش‌فرض (کارت + پس‌زمینهٔ مستقل، برای `AppSelectPage` و مسیر مستقل). سربرگ
  «انتخاب ماژول» هم به کارت اضافه شد. تست: `__tests__/loginAndModuleSelectionSmoke.test.js` (۵) و
  `__tests__/documentModulePlaces.test.js` (۲).
- **بازطراحی صفحهٔ ورود و صفحهٔ انتخاب ماژول (۲۰۲۶-۱۱-۰۸):**
  - **صفحهٔ ورود (`pages/Login.jsx`):** کارت مستطیلی وسط‌چین روی تصویر پس‌زمینهٔ تنظیمات شرکت — سمت راست
    فرم با عنوان **«خوش آمدید»** + سربرگ **«ورود اطلاعات»** و فیلدهای **شرکت / نام کاربری / رمز عبور** (فیلد شرکت
    حتی با یک شرکت هم نمایش داده می‌شود)، سمت چپ **پنل کاملاً سفید** (`bgcolor:#fff` + `borderInlineStart`) که
    فقط لوگوی شرکت (بدون قاب/سایه/گرادیان) در آن است. هیچ متن تبلیغاتی دیگری روی صفحه نیست.
    `data-testid="login-page"` با `data-branding-text-color`/`data-branding-accent-color`، `login-card`،
    `login-logo-panel`، `login-branding-image` (`data-background-url`) و `login-branding-overlay`
    (`data-overlay-color`/`data-overlay-opacity`/`data-overlay-blur`).
  - **`overlay_blur` (۰–۲۴px):** در `settings_app/login_branding.py` (`MAX_OVERLAY_BLUR`, default 8,
    `_blur()` + merge در `save_login_branding`) و `core/utils/colorUtils.js`
    (`resolveLoginBranding` → `theme.blur`)؛ در «تنظیمات → مشخصات شرکت → ظاهر صفحهٔ ورود» اسلایدر
    «میزان بلور تصویر پس‌زمینه» + پیش‌نمایش کارت اضافه شد. تست: `settings_app/tests_login_branding.py` (۲۷).
    **مستقر شد (۲۰۲۶-۱۱-۰۸):** `manage.py check` پاک، gunicorn ری‌استارت و
    `GET /api/auth/login-companies/` کلید `overlay_blur` را در `login_branding` برمی‌گرداند.
  - **صفحهٔ انتخاب ماژول (`core/components/ui/ModuleSelection.jsx`) — بازطراحی، نه حذف:** همان قابلیت‌ها
    (سلام/نام کاربر، هویت شرکت، کارت ماژول‌های مجاز با accent ماژول، حالت بارگذاری هر ماژول، خطا، بازگشت) با
    زبان بصری صفحهٔ ورود: پس‌زمینهٔ تصویری `company.login_branding` + پوشش/بلور، کارت وسط‌چین
    (`module-selection-card`) با شبکهٔ سه‌ستونی کارت‌های outlined و شِورون. تست:
    `__tests__/loginAndModuleSelectionSmoke.test.js` (۴ تست، شامل بلور و حذف متن‌های تبلیغاتی).

- **آیکن تب مرورگر از لوگوی شرکت (۲۰۲۶-۱۱-۰۸):** اندپوینت عمومی `GET /api/company/branding/`
  (`core/views.py::company_branding_view` + تابع خالص `company_branding_payload`/`load_company_branding`)
  نام حقوقی و لوگوی tenant جاری را می‌دهد: `logo_url` و `favicon_url` با `?v=<updated_at>` برای شکستن کش.
  منبع لوگو اول `CompanyProfile.logo` (مشخصات شرکت) و بعد `Company.logo`. فرانت: `FaviconSync` در
  `App.jsx` یک `<link rel="icon" id="hrms-company-favicon">` می‌سازد/به‌روز می‌کند (بدون لوگو → بدون لینک)
  و `CompanyProfilePage` پس از آپلود لوگو کش `['company-branding']` را باطل می‌کند.
  تست‌ها: `core/tests_branding.py` (۸) و `__tests__/faviconSync.test.js` (۳). دادهٔ زندهٔ kpsmi:
  `/media/company_logos/لوگو_HJMTNTX.png` (۹۱KB، HTTP 200).
- **بازطراحی داشبورد خریدها مطابق داشبورد قراردادها (۲۰۲۶-۱۱-۰۸):**
  - **بک‌اند:** اندپوینت تجمیعی `GET /api/procurement/dashboard/` (`procurement/views.py::dashboard_view`) با
    منطق خالص در `procurement/dashboard.py` (بدون دیتابیسِ لازم برای تست): تفکیک ریالی/ارزی، مجموع سفارش/صورتحساب/
    پرداخت، نرخ تسویه، فاکتور معوق، سری زمانی ۶ ماهه (`rial_orders`/`foreign_orders`/`rial_amount`/`foreign_amount`/
    `invoice_amount`/`payment_amount`)، ترکیب وضعیت سفارش‌ها و استعلام‌ها، تأمین‌کنندگان برتر، تفکیک پروژه،
    سفارش‌های نزدیک سررسید و خلاصهٔ تضامین (اعتبار با `contracts.guarantee_validity`). هر مدل **یک کوئری**
    (`values()` تخت + سقف ۲۰۰۰ ردیف) و بدون N+1. تست: `procurement/tests_dashboard.py` (۱۲ تست).
  - **فرانت:** کیت مشترک `pages/contracts/contractsDashboardKit.jsx` از داشبورد قراردادها استخراج شد
    (`ContractsDashboardPage.jsx` از ۱٬۰۳۸ به ۷۹۳ خط) و `ProcurementDashboardPage.jsx` با همان زبان بصری بازنویسی شد:
    نوار ۵ شاخص، پنل‌های «خرید ریالی/ارزی» با SparkLine و ردیف‌های آماری، دو نمودار روند، نوار جست‌وجو/مرتب‌سازی،
    کارت‌های سفارش ریالی و ارزی با صفحه‌بندی، «سلامت مالی خریدها»، «سررسید تحویل سفارش‌ها»، «تضامین خرید» و
    چهار توزیع شماتیک (وضعیت سفارش‌ها، وضعیت استعلام‌ها، تأمین‌کنندگان برتر، خرید در پروژه‌ها).
    تست: `__tests__/procurementDashboardSmoke.test.js`؛ `contractsDashboardSmoke` هم سبز ماند.
- **صفحهٔ تأمین‌کنندگان هم‌ساخت صفحهٔ «طرف حساب‌ها» (۲۰۲۶-۱۱-۰۸):** `procurementSuppliersList.jsx` بازنویسی شد به
- **صفحهٔ «نواقص قراردادها» در گروه «پایش قراردادها» (۲۰۲۶-۱۱-۰۸):**
  - **بک‌اند:** اکشن `GET /api/external-contracts/completeness/` روی `ContractViewSet` + موتور خالص
    `contracts/completeness.py` با **۲۹ قاعده** در ۷ گروه (فیلدهای ناقص / مدارک / تاریخ‌ها / مالی /
    پروژه و درصد تخصیص / تضامین / طرف حساب) و شدت `high|medium|low`:
    `missing_*` (شماره، مبلغ، تاریخ‌ها، امضاکننده، ارز، شرایط پرداخت/جریمه/بیمه/تحویل، طبقه‌بندی، محل اجرا،
    توضیحات، درصد حسن انجام کار، پیش‌پرداخت)، `party_missing_national_id|economic_code`،
    `no_project`، **`project_share_missing` (درصد تخصیص پروژه خالی)**، `project_share_invalid` (جمع ≠ ۱۰۰٪)،
    `no_documents`، `no_contract_document`، `end_before_start`، `signing_after_start`،
    `expired_but_active`، `tender_number_missing`، `no_financial_documents`، `invoice_over_amount`،
    `guarantee_missing`، `guarantee_undefined`. امتیاز سلامت هر قرارداد = ۱۰۰ − (بحرانی ۱۲ / متوسط ۶ / کم ۲)
    و خروجی شامل `summary` (تعداد/شدت/هر قاعده/هر گروه)، `contracts` (مرتب‌شده بر اساس شدت و تعداد نقص) و
    `rules` است. **سه کوئری** برای کل صفحه (قراردادها با `Count(distinct)` + جمع فاکتورها + عناوین مدارک)؛
    فیلترها: `?code=a,b`، `?severity=`، `?group=`، `?search=`، `?status=`.
    تست: `contracts/tests_completeness.py` (۲۲ تست DB-free).
  - **فرانت:** `pages/ContractsCompletenessPage.jsx` روی مسیر `/contracts-completeness` (منوی «پایش قراردادها →
    نواقص قراردادها»)، با کیت مشترک داشبورد: ۵ کاشی شاخص (کل/دارای نقص/بدون مدرک/بدون درصد پروژه/فیلدهای ناقص)،
    پنل فیلتر (جست‌وجو، شدت، گروه، نوع نقص، چیپ‌های شدت)، **جدول تک‌ردیفی با پنج ستون** (شمارهٔ قرارداد،
    طرف حساب، موضوع، امتیاز، «ویرایش پرونده»)، `ModulePager`، دیالوگ جزئیات نواقص هر قرارداد (گروه‌بندی‌شده +
    لینک «باز کردن پروندهٔ قرارداد») و چاپ با موتور چاپ (`printElement`).
    تست: `__tests__/contractsCompletenessSmoke.test.js`.
  - **کاتالوگ مجوزها بازتولید شد:** `python scripts/build_permission_catalog.py` → کپی روی
    `core/permission_catalog_data.json` (اکنون **۲۶۶ منو / ۱۱۰۱ کد**). این کار پنج آیتم قدیمی خرید را هم
    که در `menuConfig.js` بودند ولی در کاتالوگ نبودند اضافه کرد (`procurement-inquiries/profiles/proforma/
    guarantees/allocations`) — بدون آن‌ها منو برای کاربران با مجوز ریز پنهان می‌ماند.
  - دادهٔ زندهٔ `kpsmi` هنگام استقرار: ۱۷۱ قرارداد، ۲۱۱۵ نقص، میانگین امتیاز ۴۲٫۱ (بیشترین قواعد:
    `missing_category`/`missing_description`/`missing_insurance_terms` روی همهٔ ۱۷۱ قرارداد و
    `no_documents` روی ۱۵).

  چیدمان master/detail صفحهٔ `ContractPartiesPage`: سرصفحه + نوار جست‌وجو (نام/کد/شناسه ملی/کد اقتصادی/شماره ثبت/
  موبایل/شخص رابط) + ستون فهرست (md=5، آواتار رنگی بر اساس وضعیت، کد/دسته/موبایل، چیپ وضعیت) + ستون جزئیات
  (md=7) با کارت‌های اطلاعاتی «آمار خرید» (از `GET /api/procurement/suppliers/{id}/profile/`)، «سفارش‌های اخیر»،
  «تضامین خرید»، «اطلاعات حقوقی»، «اطلاعات تماس»، «اطلاعات بانکی» و دکمهٔ «باز کردن پروندهٔ خرید».
  دیالوگ ثبت/ویرایش هم بخش‌بندی همان صفحه را دارد (مشخصات پایه / حقوقی / تماس / بانکی / توضیحات) با کد
  خودکار (`SUP-xxxxxx`)، تغییر وضعیت با PATCH و حذف با تأیید. `procurementSuppliersStudio.jsx` (نسخهٔ قدیمی و
  بی‌استفاده) حذف شد. تست: `__tests__/procurementSuppliersSmoke.test.js`.
  روی `SupplierViewSet` یک payload واحد می‌دهد: `supplier` + `summary` (سفارش/صورتحساب/پرداخت/مانده/
  نرخ تسویه/تفکیک ریالی-ارزی) + لیست‌های `orders`، `quotations`، `proformas`، `invoices`، `payments`،
  `guarantees` (با `valid_until`/`days_to_expiry`/`is_expired` از `contracts.guarantee_validity`)
  و `documents`/`timeline`. هر رابطه **یک کوئری** `values()` (بدون N+1) و محاسبات در
  `procurement/profile.py` (خالص؛ ۱۴ تست در `procurement/tests_profile.py`).
  فرانت: `ProcurementSupplierProfilePage` با الگوی «پروندهٔ قرارداد» بازنویسی شد — کارت هویت + کاشی‌های مالی +
  دسترسی سریع + ۹ تب (نمای کلی/سفارش‌ها/پیشنهادها/پیش‌فاکتورها/صورتحساب‌ها/پرداخت‌ها/تضامین/اسناد/خط زمانی)
- **مجوزهای ریز در UI همیشه تازه می‌مانند (۲۰۲۶-۱۱-۰۸):** `AuthContext` تابع `refreshUser` را دارد و
  `/auth/me` را **روی `focus` پنجره و هر ۶۰ ثانیه** دوباره می‌گیرد (`USER_REFRESH_MS`)، بنابراین مجوزی که
  مدیر در «مجوزهای کاربران» می‌دهد/می‌گیرد بدون خروج-ورود مجدد اعمال می‌شود (قبلاً تا رفرش صفحه دکمه‌ها عوض نمی‌شدند).
  همچنین «حذف نامه» در سرصفحهٔ **پروندهٔ نامه** (`correspondenceLetterDetails.jsx`، پراپ `onDelete`) هم اضافه شد؛
  تا قبل از آن حذف فقط در منوی ردیف جدول بود. تست‌ها: `__tests__/authRefresh.test.js` و بررسی دکمه در
  `correspondenceSmoke` (۱۶ تست).
  نکتهٔ تست: CRA گزینهٔ **`resetMocks: true`** دارد؛ پیاده‌سازی هر mock باید در `beforeEach` دوباره ست شود،
  وگرنه `jest.fn(() => value)` داخل `jest.mock` بی‌اثر می‌شود (همین باعث شد `AuthEngine.isAuthenticated` ناموفق شود).

  روی کیت مشترک داشبورد. مسیر همان `/procurement/supplier-profile?supplier=<id>` است (لینک فهرست پرونده‌ها
  دست‌نخورده). تست: `__tests__/procurementProfileSmoke.test.js`.


- **بازطراحی ماژول خرید و تدارکات — مرحلهٔ بک‌اند (۲۰۲۶-۱۱-۰۸):** مدل‌های جدید در `procurement/models.py`
  (به سبک ماژول قراردادها) اضافه شدند و مایگریشن `procurement.0004` روی همهٔ schemaها اعمال شد:
  - **استعلام (RFQ):** `Inquiry` (شماره، موضوع، درخواست مبدأ، پروژه، واحد، مهلت، روش ارزیابی، ارز،
    پیشنهاد برنده، تاریخچه) + `InquiryLine` (کالا/خدمت، مشخصات فنی، مقدار، قیمت هدف، WBS/CBS) +
    `InquirySupplier` (تأمین‌کنندهٔ دعوت‌شده با وضعیت دعوت/ارسال/پاسخ).
  - **پیشنهاد قیمت:** `Quotation` (تأمین‌کننده، اعتبار پیشنهاد، ارز/نرخ، تخفیف، نرخ ارزش افزوده،
    زمان تحویل، شرایط پرداخت، دورهٔ تضمین، امتیاز فنی، برنده) + `QuotationLine` (قیمت واحد، تخفیف،
    زمان تحویل، انطباق فنی؛ مبلغ در `save()` محاسبه می‌شود).
  - **پیش‌فاکتور:** `ProformaInvoice` + `ProformaInvoiceLine` با تبدیل مستقیم به `PurchaseInvoice`
    (`POST /api/procurement/proforma-invoices/{id}/convert/`).
  - **تضامین خرید:** `ProcurementGuarantee` (شرکت در استعلام/حسن انجام تعهدات/پیش‌پرداخت/حسن پرداخت/
    دورهٔ تضمین؛ ابزار چک/سفته/ضمانت‌نامه/وجه نقد) + `ProcurementGuaranteeAction`؛ اعتبار با همان
    `contracts.guarantee_validity` (چک = ۵ سال از صدور) و اکشن `POST .../procurement-guarantees/{id}/action/`
    و گزارش `GET .../procurement-guarantees/overview/`.
  - **پرداخت و اسناد:** `PurchasePaymentAllocation` (تخصیص پرداخت به فاکتور/پیش‌فاکتور با بازمحاسبهٔ
    `paid_amount` و `payment_status`) و `ProcurementDocument` (پیوست استعلام/پیشنهاد/پیش‌فاکتور/فاکتور/
    تضمین با `file_url` مطلق).
  - **غنی‌سازی موجود:** `Item` (مشخصات فنی، قیمت استاندارد، حداقل سفارش، سازنده، پارت‌نامبر)،
    `PurchaseOrder` (پیشنهاد مبدأ، ارز، نرخ)، `PurchaseInvoice` (ارز، نرخ، نرخ ارزش افزوده، وضعیت پرداخت).
  - **API:** `/api/procurement/inquiries/` (+`comparison/`، `award/`، `add_suppliers/`)،
    `/quotations/`، `/proforma-invoices/` (+`convert/`)، `/procurement-guarantees/` (+`action/`، `overview/`)،
    `/payment-allocations/`، `/procurement-documents/`.
  - محاسبات در `procurement/pricing.py` (خالص): `line_amount`، `document_totals`، `payment_status_of`،
    `compare_quotations` (ماتریس قیمت هر سطر + رتبه‌بندی + پیشنهاد برنده با نادیده‌گرفتن رد‌شده‌ها).
  - تست: `procurement/tests_inquiry.py` (۹ تست DB-free) — سبز.
- **خرید و تدارکات — فرانت‌اند مرحلهٔ اول (۲۰۲۶-۱۱-۰۸):** `pages/procurement/procurementUi.jsx` (ابزار مشترک:
  `useList`، `SectionShell`، `SimpleTable`، `DialogShell`، `Field`، `FormGrid`، `StatusChip`، `money/dateLabel`،
  رنگ‌های ماژول) + دو صفحهٔ کامل:
  - `ProcurementInquiriesPage` (مسیر `/procurement/inquiries`): فهرست استعلام با جست‌وجو/فیلتر وضعیت،
    شمارش پیشنهادها، برآورد کل و **فرم ثبت استعلام چندسطری** (شرح، مشخصات فنی، مقدار، قیمت هدف + برآورد زنده).
  - `ProcurementInquiryComparisonPage` (مسیر `/procurement/inquiries/:id/comparison`): **ماتریس مقایسهٔ
    پیشنهادها** (سطر استعلام × تأمین‌کننده، برجسته‌سازی ارزان‌ترین قیمت هر سطر، رتبه و جمع هر پیشنهاد)،
    **ثبت پیشنهاد** (تأمین‌کننده، اعتبار، زمان تحویل، نرخ ارزش افزوده و قیمت هر سطر) و **انتخاب برنده**.
  - منو: آیتم «استعلام‌ها (RFQ)» در گروه «چرخهٔ خرید» (`menuConfig.js`)؛ مسیرها در `AppRoutes.jsx`.
  - **باقی‌مانده (گام بعد):** صفحات پیش‌فاکتور (فهرست/فرم/تبدیل به فاکتور)، تضامین خرید (فهرست + KPI از
    `overview/` + اقدامات)، تخصیص پرداخت، و پروندهٔ خرید با تب‌ها؛ سپس اتصال دکمهٔ «چاپ» به موتور چاپ
    (`document:'voucher'`/`custom`) برای استعلام و پیش‌فاکتور.
  - **باقی‌مانده (گام بعد):** فرانت‌اند ماژول (داشبورد تدارکات، فهرست/docs استعلام، فرم استعلام،
    صفحهٔ مقایسهٔ پیشنهادها، پیش‌فاکتور، تضامین، تخصیص پرداخت، پروندهٔ خرید با تب‌ها) + منوی ماژول.
- **موتور چاپ — اسناد سروری فیش حقوقی و سند خزانه (۲۰۲۶-۱۱-۰۸):** `core/print_engine/builders/`
  (`payslip.py`، `voucher.py`) با الگوی «تابع خالص سند + loader دیتابیس» اضافه شد؛ انواع جدید
  `document:'payslip'` و `document:'voucher'` (receipt/payment/payment_order/transfer/transaction)
  در `registry`. `SalaryPayslip` و `TreasuryVoucherDialog` به سند سروری وصل شدند (با fallback مرحله‌ای).
- **اعتبار تضامین — چک منقضی نمی‌شود (۲۰۲۶-۱۱-۰۸):** قاعدهٔ کسب‌وکار در `contracts/guarantee_validity.py`
  (`guarantee_validity`, `CHECK_VALIDITY_YEARS = 5`) پیاده شد: برای ابزارهای چک‌محور
  (`check`, `check_and_guarantee`) «سرآمد اعتبار» = **تاریخ صدور + ۵ سال** و «تاریخ سررسید» فقط هشدار
  عملیاتی است؛ ضمانت‌نامه‌ها همان `guarantee_expiry_date` را ملاک انقضا دارند.
  - `guarantee_status.guarantee_payload` و `GuaranteeSerializer` حالا `valid_until`، `due_date`،
    `due_days`، `days_to_expiry`، `is_expired`، `expiry_kind`، `validity_years`، `is_check` می‌دهند
    (`days_to_expiry` = روز تا **پایان اعتبار**). زنجیرهٔ هشدارها: «اعتبار قانونی چک … به پایان رسیده»،
    «سررسید چک … گذشته است؛ طبق قانون تا … معتبر است (منقضی نشده)».
  - فرانت: `core/utils/guaranteeValidity.js` (`guaranteeValidity`, `guaranteeIsExpiring`, `addYears`،
    fallback محلی برای پاسخ قدیمی/کش) در `GuaranteesPage`، `ContractGuaranteesMonitorPage`،
    `contracts/ContractGuarantees` و `ContractProfileTabs` استفاده می‌شود؛ ستون سررسید چک
    «اعتبار تا …» را هم نشان می‌دهد. چکِ با سررسید نزدیک همچنان در گروه «نزدیک انقضا» می‌ماند.
  - دادهٔ زندهٔ `kpsmi`: چک #۳۸ (سررسید ۲۰۲۵-۰۷-۲۰) → `valid_until` ۲۰۳۰-۰۷-۲۰، `is_expired=false`
    (قبلاً «منقضی» نشان داده می‌شد). تست‌ها: `contracts/tests_guarantee_validity.py` (۱۴) و
    `__tests__/guaranteeValidity.test.js` (۱۰).
- **موتور چاپ یکپارچه (۲۰۲۶-۱۱-۰۸، مهاجرت کامل):** `core/print_engine/` (components/layout/registry/views) +
  `POST /api/print/preview/`، `GET /api/print/options/` و کلاینت `core/print/`
  (`printEngine.js`، `PrintPreviewDialog`، `PrintButton`، `usePrintDocument`). **همهٔ ۲۴ فایل `window.print()`**
  (۱۸ صفحهٔ گزارش + فیش حقوقی + دفتر تفصیلی + سند خزانه + صورت‌وضعیت) به `printElement`/`printHtml` منتقل شدند؛
  در چاپ، دکمه/تب/فیلتر/صفحه‌بندی حذف می‌شوند و جدول‌های عریض افقی چاپ می‌شوند. تست‌ها:
  `core/tests_print_engine.py` (۲۶) و `__tests__/printEngineSmoke.test.js` (۵) — فرانت ۳۱ تست در ۵ سوئیت سبز.
- **فاز ۴ نگهداشت‌پذیری فرانت (ادامه):** وضعیت فهرست نامه‌ها به هوک `useLetterListState.js` منتقل شد
  (فیلترها، جست‌وجوی ۳۵۰ms، صفحه‌بندی، مرتب‌سازی، پارامترهای سرور، `?q`/`?has_attachments`/`?new=1`) و
  `CorrespondenceLettersPage.jsx` فقط UI ماند. باقی‌ماندهٔ این فاز: استخراج کشوی جزئیات
  (`correspondenceLetterDetails.jsx`) و هوک `useLetterMutations` (هدف: ~۹۰۰ خط).
- **فاز ۴ مکاتبات — کشوی جزئیات و هوک نوشتن جدا شدند (۲۰۲۶-۱۱-۰۸):** `CorrespondenceLettersPage.jsx`
  از **۱٬۷۸۵ به ۱٬۱۷۴ خط** رسید (۳۴٪ کمتر) و دو ماژول تازه گرفت:
  - `correspondenceLetterDetails.jsx` (۴۴۳ خط): `LetterDetailsDialog` — همان پروندهٔ نامه با هدر، تب‌های
    مشخصات/ارجاعات/پیوست‌ها/تاریخچه، آپلود و پیش‌نمایش و حذف پیوست، ثبت یادداشت و «ثبت پاسخ و نتیجه».
    **کاملاً پراپ‌محور است** (بدون state محلی): `onAction(name, payload)` مثل `onAction('register')`،
    `onOpen/onClose/onTabChange/onEdit/onPrint/onRefer/onCompleteReferral/onPreview/onUpload/onDeleteAttachment`
    و `canEditOf/canCreateOf/canDeleteOf` → همان پرونده را می‌توان در «تب مکاتبات پروندهٔ قرارداد» هم رندر کرد.
  - `useLetterMutations.js` (۳۳۰ خط): همهٔ مسیرهای نوشتن — ویرایش درجای ردیف‌ها (`EDITABLE_FIELDS`,
    `seedLetterDraft`, `buildLetterPatch`, drafts/savingIds/bulkSaving، `saveRowEdit`/`saveAllEdits`),
    `letterAction` (ثبت/ارجاع/پاسخ/بستن/بایگانی/یادداشت)، `referralComplete`, `deleteLetter`,
    `deleteAttachment` و `uploadAttachment` (+`uploading`/`uploadRef`) و `refreshAll`.
    ورودی‌ها: `letters`, `qc`, `refreshList/refreshStats/refreshReferrals`, `setError/setToast/setComment/
    setDrawerLetter/setCompleteReferral`, `activeLetterId`, `canEditOf`.
  - نکتهٔ دام: `refetch`های صفحه `refetchStats`/`refetchReferrals` نام دارند (نه `refresh…`) و
    `editRowId` هم باید از هوک destructure شود؛ `handleRowClick`/`handleRowDoubleClick` (کلیک تکی = پرونده،
    دوبار = ویرایش درجا) در صفحه ماندند و از `editRowId`/`startRowEdit` هوک استفاده می‌کنند.
  - اعتبارسنجی: `npx react-scripts test --testPathPattern=correspondence` → **۲۱ تست / ۲ سوئیت سبز**؛
    `npm run build` با `PUBLIC_URL=/assets` = «Compiled successfully»؛ ESLint (`no-undef`) بدون خطا و
    هشدارهای باقی‌مانده همان ۵ هشدار قبلی HEAD است (۸ → ۵).
- **Data (tenant `kpsmi`):** ۶٬۲۴۶ نامه · ۳٬۸۸۶ نامه با پیوست (۵٬۸۸۴ فایل، ~۸.۵GB در `media/archive/company_1/correspondences`) · ۴٬۰۹۶ ارجاع · DMS: ۵٬۸۸۴ سند ایندکس‌شده و ~۹.۶GB.
- ماژول مکاتبات کامل است: دفتر وارده/صادره/داخلی، ارجاع چندسطحی + کارتابل، پیوست با پیش‌نمایش، **صفحهٔ مستقل نگاشت نام‌ها**، تب مکاتبات پروندهٔ قرارداد، داشبورد استودیویی، جست‌وجوی جامع، بایگانی ماژول در تنظیمات و مدیریت اسناد.
  - **دیالوگ درج نامهٔ وارده (۲۰۲۶-۱۱-۰۷):** فیلدهای «ثبت‌کنندهٔ ورود / نام ثبت‌کننده، سری شماره‌گذاری، ترنسمیتال،
    شماره اندیکاتور، شماره نامه طرف مقابل، سمت ارسال‌کننده، شماره بایگانی، تنظیم‌کننده و نام تنظیم‌کننده»
    **حذف** شدند؛ ثبت‌کنندهٔ ورود از طریق «تحویل‌دهنده (پرسنل)» یا «نام تحویل‌دهنده (خارج از سامانه)» ثبت می‌شود.
    «فرستنده» نوع دارد: **پرسنل** یا **شرکت/طرف حساب (مدیریت قراردادها)**؛ «قرارداد مرتبط» با انتخاب از
    `/external-contracts/` (FK جدید `Letter.contract`، مایگریشن `0018`) و بخش «طرفین مکاتبه» چیدمان دوستونی فشرده دارد.
    پیش‌فرض نامه‌های وارده: گیرنده = **مهدیه جمشیدنیا** و مخاطب = **مرتضی اسدنژاد** (اگر نبود، یک‌بار با
    `POST /correspondents/` ساخته می‌شود).
  - **نمای جزئیات و ردیف‌های فهرست** هم به همان ساختار جدید درآمدند: «تحویل‌دهنده / ثبت‌کنندهٔ ورود» (با
    fallback از `entered_by_label` قدیمی)، حذف اندیکاتور/ترنسمیتال/شماره طرف مقابل/سمت ارسال‌کننده/بایگانی/تنظیم‌کننده،
    و نمایش «قرارداد مرتبط». دادهٔ قدیمی با مایگریشن `0019_backfill_delivered_by` به `delivered_by_name` منتقل شد
    (۳٬۲۳۵ نامه).
- **طرف حساب شرکت‌های بدون قرارداد (۲۰۲۶-۱۱-۰۷):** انتخابگر «طرف حساب» و «فرستنده (شرکت)» دیگر اجباراً
  از `ContractParty` نمی‌سازد؛ پیش‌فرض تازه این است که نام شرکت **فقط در مکاتبات** ثبت شود:
  - فیلد جدید `Letter.party_name` (متن آزاد) + `Letter.sender_kind` (`employee|party`)؛ مایگریشن
    `correspondences.0020_letter_party_name`. در دیالوگ نامه سوییچ «شرکت جدید در مدیریت قراردادها هم ثبت شود»
    (خاموش = فقط مکاتبات؛ روشن = همان `POST /letters/quick-party/` قبلی).
  - `PartyPicker` (`correspondenceLookups.jsx`) پراپ جدید `createInContracts` گرفت: خاموش ⇒ نام تایپ‌شده
    بدون درخواست سرور به‌عنوان متن آزاد برمی‌گردد؛ روشن ⇒ ساخت `ContractParty`.
  - نگاشت نام‌ها: `matching.iter_name_samples` حالا `party_name` را هم با دامنهٔ `counterparty` اسکن می‌کند و
    `mapping._apply_party` نام‌های آزاد را «تعمیم» می‌دهد (`party_account`/`sender_party` را ست می‌کند).
    دیالوگ نگاشت برای مقصد «طرف حساب» امکان ساخت طرف حساب جدید در مدیریت قراردادها را دارد.
  - `party_label`/`SEARCH_FIELDS` و ستون «طرف حساب/طرف مکاتبه» + جزئیات و ویرایش درجا با `party_name` هم‌خوان شدند.
- **همگام‌سازی شیت‌های صادره از اکسل + پیوست‌ها (۲۰۲۶-۱۱-۰۸):** شیت‌های «نام های صادره»، «نامه صادره مالی»،
  «ارسالی ها به دانشگاه» و «امور بانکداری پاسارگاد» با DB مقایسه شد (`source_ref` = `<sheet_code>:<row>`):
  - بستهٔ JSON محلی از `legacy.iter_legacy_rows` ساخته و روی سرور داخل `schema_context('kpsmi')` با
    `legacy.import_rows` وارد شد → **۷ نامهٔ تازهٔ دانشگاه** (ردیف ۷۹۲–۷۹۸) و ۷ ردیف موجود با فیلدهای خالی تکمیل شد؛
    خروجی/مالی/بانک کامل بودند (outgoing 986، finance 13، bank 20).
  - پیوست‌ها: `scripts/export_letter_attachments.py` حالا کلیدهای فارسی بیشتری می‌شناسد
    (`شماره ارسالی مالی`، `بابت`، `توضیحات`) و ردیف بدون کلید متنی را هم با `source_ref` می‌پذیرد.
    `--fallback-dir` برای مسیرهای شکستهٔ `Z:\Group\Accounting\نامه ها و اسکن ها` و `اداری\بانک` استفاده شد.
    نتیجه: **outgoing ۴ فایل/۴ نامه، bank ۲۰/۲۰، university ۸۰۸/۸۰۲** (۲٫۱ گیگابایت؛ ۱ فایل گم‌شده)؛
    `relocate_letter_attachments --sync-dms` هم ۸۶۱ سند تازه را در DMS ایندکس کرد (کل پیوست‌ها: ۶٬۷۲۵).
- **شکستن صفحهٔ مکاتبات به ماژول‌های کوچک (۲۰۲۶-۱۱-۰۸):**
  - `CorrespondenceLettersPage.jsx` از **۲٬۹۳۱ به ۱٬۷۵۴ خط** رسید (۴۰٪ کمتر) و چهار ماژول تازه گرفت:
    - `correspondenceFormUi.jsx` (۲۶۷ خط): `FormSection`/`FormTable`/`InfoTable`/`InfoGroup`/`PersianTimeInput`/`CellText` و ویجت‌های ویرایش درجا (`InlineText`/`InlineSelect`/`InlineDate` + `inlineSx`).
    - `correspondenceLetterForm.jsx` (۶۷۸ خط): `LetterFormDialog` + ثابت‌ها و helperهای فرم
      (`EMPTY_LETTER`، `DATE_KEYS`، `cleanPayload` با `NULLABLE_FIELDS`/`CLEARABLE_TEXT_FIELDS`،
      `ENTRY_METHOD_META`، `DELIVERY_TYPE_META`، `ensureDefaultCorrespondent`، `asList`، `safeDate`).
    - `correspondenceReferDialogs.jsx` (۱۷۹ خط): `ReferDialog` + `CompleteReferralDialog` + `REFERRAL_PURPOSE_META`.
    - `correspondenceQueryKeys.js`: کلیدهای کش React Query (`LETTERS_KEY`، `STATS_KEY`، `META_KEY`، `REFERRALS_KEY`، `CONTACTS_KEY`).
  - الگوی کار: استخراج با اسکریپت + چک «شناسه‌های بدون import» (`_check_form_imports`) + اجرای سوئیت
    `correspondence*` بعد از هر گام (سه گام، هر بار ۲۱ تست سبز)؛ importهای بی‌استفاده هم پاک شدند
    تا بیلد CRA با `CI=true` هشدار ندهد.
  - **باقی‌مانده:** کشوی جزئیات (بخش inline بزرگ داخل کامپوننت) و هوک‌های
    `useLetterListState`/`useLetterMutations` تا صفحه به ~۹۰۰ خط برسد.
- **نگهداشت‌پذیری مکاتبات — بستهٔ `views/` و سبک‌سازی `/auth/me` (۲۰۲۶-۱۱-۰۸):**
  - `correspondences/views.py` (۲٬۴۸۹ خط) به بستهٔ `correspondences/views/` شکسته شد:
    `base.py` (واردات/ثابت‌ها/helperهای ارجاع + `BaseLetterViewSet`)، `legacy.py`، `letters.py`
    (انواع/سری/مخاطبین + `LetterViewSet`)، `referrals.py`، `attachments.py`، `aliases.py`، `requests.py`.
    `views/__init__.py` همهٔ ویوست‌ها و helperها را re-export می‌کند، بنابراین
    `from correspondences.views import LetterViewSet` (و مسیر رشته‌ای `dev_query_profile`) بدون تغییر کار می‌کند.
  - `/auth/me`: فیلد جدید **`is_full_access`** و `fine_permissions` فقط شامل کدهای **داده‌شده**
    (برای سوپریوزر/دسترسی‌کامل دیکشنری خالی) → پاسخ از ~۴۰–۵۰KB به **۱٫۴KB** رسید.
    `correspondencePermissions.js` هم با `is_full_access` کوتاه‌می‌شود.
  - تست جدید `correspondences/tests_structure.py` (۱۰ تست): نبودِ `views.py`، وجود ماژول‌ها،
    import همهٔ ویوست‌ها/helperها، صحت `router.registry`، سقف ۱۰۰۰ خط برای هر ماژول، و رفتار
    `/auth/me` (کدهای داده‌شده/دسترسی کامل/سوپریوزر).
  - **باقی‌ماندهٔ این فاز:** شکستن `CorrespondenceLettersPage.jsx` (۲٬۹۳۱ خط) به
    `LetterFormDialog` + `LetterDetailsDrawer` + `LettersTable` + هوک‌های `useLetterListState`/`useLetterMutations`
    (و شیر کردن جزئیات با تب مکاتبات قرارداد) و افزودن تست‌های DB-محور روی سرور.
- **بازنشستگی استک قدیمی مکاتبات (۲۰۲۶-۱۱-۰۸):**
  - سمت کاربر: مسیر `/correspondences` حالا به `/correspondence` **ریدایرکت** می‌شود و دو منوی
    «مکاتبات اداری» (ماژول مدارک) و «مکاتبات» (ارتباطات و اسناد) به `/correspondence` اشاره می‌کنند.
    `pages/CorrespondencesPage.jsx` و کل `modules/correspondences/` (۵ صفحه + `shared.jsx`) حذف شدند.
  - سمت سرور: پنج ویوست قدیمی (`incoming-letters`، `outgoing-letters`، `announcements`، `forms`،
    `organizational-letters`) به **`ReadOnlyModelViewSet`** تبدیل شدند (نوشتن = ۴۰۵) تا مسیر تکثیر
    `OrganizationDocument` و داده‌های موازی بسته شود؛ داده‌ها برای تاریخچه خواندنی می‌مانند.
    `organizations` تنها مدل قدیمی است که نوشتن دارد (تب مخاطبین) و با `DefinitionPermissionMixin` گیت شده.
    متد `_set_employees_and_archive` (که با هر ویرایش یک سند بایگانی تکراری می‌ساخت) حذف شد.
  - `module_search`: providerهای نامهٔ قدیمی (Incoming/Outgoing/Announcement) حذف شدند؛
    `Organization` و `Correspondent` حالا به `/correspondence/settings?tab=contacts&q=…` می‌روند
    (آیکون `contacts` در `CommandPalette.RESULT_ICONS` اضافه شد).
  - یکدست‌سازی برچسب‌ها: `Letter.party_display` / `sender_display()` / `receiver_display()` در **مدل**
    (منبع واحد) و serializer/اکسل از همان استفاده می‌کنند؛ `sender_display(include_employee=False)`
    برای فهرست سبک تا FK پرسنل خوانده نشود.
  - فهرست سبک: چهار فیلد مرده (`series_title`، `category_color`، `entered_by`، `source_ref`) از
    `LetterListSerializer` حذف شد (اسکن خودکار: تنها فیلدهای بی‌مصرف فرانت بودند).
  - **یکتایی شمارهٔ نامه ممکن نشد:** در دادهٔ واقعی ۱۳۵ گروه `(direction, number)` تکراری وجود دارد
    (مثلاً «140405/457» سه بار) و ۱٬۴۹۸ نامه بدون شماره است؛ افزودن `UniqueConstraint` بدون پاک‌سازی
    داده باعث خطای مایگریشن می‌شود. تصمیم: بدون constraint، و مصرف‌کننده‌ها به `series`/`source_ref`
    تکیه کنند. (در بک‌لاگ با همین توضیح ثبت شد.)
  - تست‌ها: ۱۹۶ تست بک‌اند (شامل «برچسب‌های مدل منبع واحدند») + ۲۱ تست فرانت؛ تأیید زنده:
    نوشتن روی مسیرهای قدیمی `405`، فهرست/جزئیات `200`، جست‌وجوی ماژول `200` با مسیرهای جدید.
- **کارایی مکاتبات — نگاشت گروهی، کش آمار و حذف N+1 (۲۰۲۶-۱۱-۰۸):**
  - موتور اعمال نگاشت بازنویسی شد (`mapping.py`): کشِ «مقادیر خام متمایز» (`_raw_values`/`_values_matching`)
    به‌جای خواندن کل جدول در حافظه، و `queryset.update(...)` به‌جای `bulk_update` روی نمونه‌ها.
    اعداد واقعی (۶٬۲۶۸ نامه، ۴٬۱۱۱ ارجاع، ۳۹ نگاشت): `apply_all(dry_run)` = **۳۲۵ms / ۱۱۸ کوئری**،
    `apply_batch(scope=counterparty, dry)` = **۸۸ms / ۲۶ کوئری** (قبلاً هر نگاشت تمام جدول را اسکن می‌کرد).
  - اندپوینت جدید `POST /api/correspondence-name-aliases/apply-batch/` با `{scope}` یا `{ids}` و `dry_run`;
    فرانت دیگر برای «اعمال ستون / اعمال گروه / نگاشت سریع» حلقهٔ درخواست نمی‌زند (یک call).
  - `/api/letters/stats/`: بخش شرکت‌محور با کش Redis (۳۰ ثانیه) و بخش «ارجاعات من» جدا → از ۲۶ کوئری به
    **۴ کوئری در حالت کش‌شده** (`stats` حدود ۵ms). `get_queryset` برای `stats`/`export_excel` prefetch سنگین نمی‌گیرد.
  - N+1 حذف شد: رویدادهای نامه با `Prefetch(...select_related('actor'))` و پیوست‌ها با `select_related('uploaded_by')`؛
    خروجی اکسل با `Prefetch` + `select_related('to_user')` (۲۰۰ ردیف ≈ ۲۰۰ms / ۶ کوئری).
  - **کشف مهم:** اولین `reverse()` مسیر `letter-attachment-download` در هر worker ~۰٫۶ ثانیه طول می‌کشید و
    ساخت `download_url`/`preview_url` برای هر پیوست دوباره آن را صدا می‌زد. حالا قالب مسیر با `lru_cache`
    یک بار ساخته و در `CorrespondencesConfig.ready()` گرم می‌شود → فهرست ۲۰ ردیفی از **۸۷۳ms به ۲۷۶ms (cold)**
    و **~۱۵۰–۲۵۰ms (warm)** با ۱۰ کوئری رسید.
  - تست‌ها: `correspondences/tests_mapping.py` (۹ تست: کش نام‌ها، کش فیلترها، ماتریس apply-batch، پذیرش `index` در همهٔ handlerها)
    و تست کش‌شدن آمار در `tests.py`.
- **امنیت مکاتبات — مجوز ریز، محرمانگی و دانلود امن (۲۰۲۶-۱۱-۰۸):**
  - `correspondences/permissions.py` (جدید): گیت per-action + per-direction. کد ریز کاربر تعیین‌کننده است؛
    کاربر بدون کد ریز (نقش قدیمی) مثل قبل از `module_action_granted` عبور می‌کند تا کسی قفل نشود.
    میکسین‌ها: `CorrespondencePermissionMixin` (نامه/ارجاع/پیوست/نگاشت/درخواست) و
    `DefinitionPermissionMixin` (انواع/سری/مخاطبین: فقط ویرایش و حذف گیت شده‌اند).
    ماتریس‌ها: `LetterViewSet.permission_matrix`، `LetterAttachmentViewSet`، `CorrespondenceNameAliasViewSet`،
    `LetterRequestViewSet`؛ اکشن‌های شخصی (`cartable`/`seen`/`note`/`instruction`/`complete`) از گیت ماژول
    معاف‌اند و خودشان «مالِ من» را بررسی می‌کنند (`_referral_assigned_to_me` / `_require_referral_access`).
  - محرمانگی: `confidential_letter_filter` روی فهرست/جزئیات نامه، ارجاعات، پیوست‌ها و کارتابل اعمال می‌شود
    (محرمانه/سری فقط برای سازنده، تنظیم‌کننده، ثبت‌کننده، ارجاع‌شدگان و دارندگان `approve`).
  - آپلود امن: `correspondences/uploads.py` — وایت‌لیست پسوند، سقف حجم
    (`CORRESPONDENCE_ATTACHMENT_MAX_MB`، پیش‌فرض ۵۰MB)، نام‌گذاری پاک‌سازی‌شده؛
    `.html/.svg/.js/...` رد می‌شوند. حذف نامه/پیوست حالا فایل دیسک را هم پاک می‌کند.
  - دانلود با احراز هویت: `GET /api/letter-attachments/{id}/download/?t=<token>&inline=1`
    (`correspondences/downloads.py`، توکن امضاشدهٔ ۱۲ ساعته) — چون iframe/img هدر JWT نمی‌فرستد.
    محرمانگی و مجوز «مشاهده» در لحظهٔ دانلود دوباره بررسی می‌شود؛ `inline` فقط برای PDF/تصویر.
    serializerها `download_url`/`preview_url` می‌دهند و UI از آن‌ها استفاده می‌کند.
  - فرانت: `core/utils/correspondencePermissions.js` (آینهٔ بک‌اند) → دکمه‌های ثبت/ویرایش/حذف/ارجاع/خروجی
    و ویرایش درجا و نگاشت نام‌ها با همان کدها فعال/غیرفعال می‌شوند؛ منوها هم با
    `getMenuForApp(slug, { permissions })` فیلتر می‌شوند (فقط وقتی کاربر کد ریز آن ماژول را دارد).
  - رفع باگ‌ها: خالی‌کردن فیلدها در دیالوگ ویرایش (`cleanPayload(form, {editing})`)، آپلود موازی پیوست با
    گزارش خطای هر فایل، و شمارنده‌های کارتابل در **یک کوئری** (قبلاً ۱۰ کوئری، هر ۳۰ ثانیه از سایدبار).
  - nginx: برای `/media/` هدرهای `X-Content-Type-Options: nosniff` و CSP اضافه شد و پسوندهای اجرایی
    (`html/svg/js/xml/css/...`) با `Content-Disposition: attachment` سرو می‌شوند (بستن مسیر XSS ذخیره‌شده).
  - تست‌ها: `correspondences/tests_permissions.py` (۴۰ تست: مجوز/جهت/محرمانگی/آپلود/توکن/ماتریس) +
    تست فرانت «کاربر فقط-مشاهده». تأیید زنده روی سرور: `list/stats/export=200`،
    `create/patch/refer/alias=403`، `create` پس از دادن مجوز `=201`، دانلود با توکن `=200` و بدون/با توکن بد `=403`.
- **برابری صفحهٔ صادره با وارده (۲۰۲۶-۱۱-۰۸):** دیالوگ نامه جهت‌آگاه شد: بخش «ثبت و ارسال» (نوع ارسال، نحوهٔ ثبت،
  ساعت ارسال)، فیلدهای «شماره اندیکاتور / ترنسمیتال / شمارهٔ نامهٔ طرف مقابل» برای صادره (به‌جای شماره‌های ثبت ورود)،
  ستون «تاریخ ارسال» در جدول صادره (ویرایش درجا هم دارد)، برچسب‌های سورت/فیلتر و کشوی جزئیات بر اساس جهت،
  و `effective_date` حالا `Coalesce(received_date, sent_date, letter_date)` است. حذف نامه/پیوست، پیش‌نمایش،
  طرف حساب متنی آزاد و نگاشت هم روی صادره فعال است.
- **حذف نامه/پیوست با مجوز ریز (۲۰۲۶-۱۱-۰۷):** ستون «عملیات» فهرست مکاتبات گزینهٔ **حذف نامه** دارد
  (`DELETE /letters/{id}/`)، پیوست‌های فهرست جزئیات و **دیالوگ ویرایش** دکمهٔ **حذف پیوست**
  (`DELETE /letter-attachments/{id}/`) دارند. کنترل نمایش سمت فرانت با مجوز ریز
  (`correspondence.*.delete`) یا مجوز قدیمی `can_delete_documents`؛ سمت بک‌اند
  `permission_engine.require_module_action(user, 'correspondence', ('delete',))` در
  `LetterViewSet.destroy` و `LetterAttachmentViewSet.destroy` → کاربر بدون مجوز ۴۰۳ می‌گیرد.
  `LEGACY_RULES` حالا برای `can_manage_documents`/`can_delete_documents`/`can_approve_documents`/
  `can_publish_documents` هم ماژول `documents` و هم `correspondence` را پوشش می‌دهد و
  `legacy_permissions_from_fine` همهٔ رول‌ها را (نه فقط اولی) بررسی می‌کند.
  `/auth/me` فیلد جدید **`fine_permissions`** (dict کد→بولین) می‌دهد تا UI دکمه‌ها را gate کند.
- **رفع «دسترسی غیرمجاز» در پایین صفحهٔ مکاتبات:** صفحهٔ فهرست قبلاً `/api/users/` را هم صدا می‌زد
  (باقی‌ماندهٔ فیلدهای حذف‌شدهٔ «ثبت‌کننده/تنظیم‌کننده») و برای کاربری که فقط به مکاتبات دسترسی دارد
  ۴۰۳ + پیام «دسترسی غیرمجاز» تولید می‌کرد. این درخواست حذف شد؛ برای اهداف ارجاع از
  `/letters/personnel/` استفاده می‌شود.
- **نگاشت نام‌ها — بازطراحی ستون‌محور (۲۰۲۶-۱۱-۰۷):** صفحهٔ `/correspondence/name-mapping` حالا میزکار هر «ستون» است:
  کارت‌های ستون‌ها (طرف حساب، فرستنده، گیرنده، مخاطب، سازمان، تحویل‌دهنده، گیرندهٔ ارجاع،
  گیرندهٔ ارجاع (طرف حساب)، موضوع→نوع مکاتبه — تاریخ و شمارهٔ نامه ستون نگاشت نیستند) با شمارش
  نام/نگاشت‌شده/بدون‌نگاشت و نوار پیشرفت؛ انتخاب ستون ⇒ جدول نام‌های همان ستون (نگاشت‌شده و بدون‌نگاشت)
  با **پیشنهاد یک‌کلیکی** (ثبت نگاشت + اعمال همان لحظه) و **آدرس‌دهی دستی** (دیالوگ تخصصی)؛ «اعمال این ستون»،
  «فقط بدون نگاشت»، جست‌وجوی درون‌ستونی، و «اعمال همه» با پیش‌نمایش.
  اندپوینت جدید `GET /api/correspondence-name-aliases/columns/` شمارش هر ستون را می‌دهد و
  `unmapped/` پارامترهای `scope`، `kinds` (محدودکردن محاسبهٔ پیشنهاد به انواع مجاز همان ستون) و `search` گرفت.
  کارایی: پیش‌فیلتر `matching.prefilter_candidates` (تطبیق ارزان پیشوند/زیررشته/توکن پیش از
  `SequenceMatcher`) ⇒ `unmapped` ستون طرف حساب (۶۰ نام، ۱۰۴۵ سازمان) از ۲٬۸s به **۳۸۰ms** و
  `columns/` حدود **۴۵۰ms**.
- **کاربردهای تخصصی نگاشت:** از رجیستری `correspondences/alias_purposes.py`
  (ارجاع / ارجاع برون‌سازمانی / فرستنده / گیرنده / طرف حساب / تحویل‌دهنده / مخاطب / سازمان / **موضوع → نوع مکاتبه** / همهٔ فیلدها)،
  «نگاشت دو مسیره» (sender ↔ receiver، فقط برای این دو دامنه)، چند مقصد برای یک نام با برچسب خط‌تیره‌ای،
  اندپوینت‌های `groups/` (گروه‌بندی سمت سرور، ۱ کوئری) و `meta/` (فراداده + شمارش سبک) و `summary/` (با اسکن نام‌های بدون نگاشت).
  تب قدیمی `?tab=mapping` در تنظیمات به این صفحه هدایت می‌شود.
- **خزانه‌داری (Treasury):** Master Data تکمیل شد (بانک/شعبه/حساب بانکی/صندوق/پایانهٔ کارت‌خوان/روش دریافت و پرداخت)،
  شماره‌گذاری قابل تنظیم (`treasury/numbering.py` → `RC/PY/TR/PR/PO`)، مبلغ به حروف (`treasury/amount_words.py`)،
  کنترل‌های عملیاتی (`treasury/guards.py`)، فیش/رسید چاپی با توکن اعتبارسنجی (`treasury/vouchers.py` + `/api/treasury/verify/`)،
  داشبورد نقدینگی (`/api/treasury/dashboard/`)، چرخهٔ کامل چک (صندوق اسناد/واگذاری/وصول/برگشت/عودت/واگذاری به شخص).
  صفحات فرانت: `/treasury/accounts`, `/treasury/cashboxes`, `/treasury/banks`, `/treasury/bank-branches`,
  `/treasury/terminals`, `/treasury/payment-methods`, `/treasury/numbering`, `/treasury/verify`.
- **خزانه‌داری — منوی بازچینی‌شده و صفحات تم‌محور (۲۰۲۶-۱۱-۰۷):** `treasuryMenu` در `core/config/menuConfig.js`
  ۱۶ گروه دارد: خانه / دریافت و پرداخت / درخواست و دستور پرداخت / بانک و حساب‌ها / کارت‌خوان و درگاه /
  اسناد دریافتنی / اسناد پرداختنی / عملیات چک / صندوق و وجوه نقد / تعهدات و سررسیدها / مدیریت نقدینگی /
  مغایرت بانکی / عملیات ارزی / گزارش‌ها / اسناد و چاپ / تعاریف. آیتم‌های «نمای فیلترشده» با کوئری‌استرینگ
  به همان صفحهٔ واقعی می‌روند (`?status=deposited,clearing`, `?direction=payment`, `?method=pos`, `?due_soon=1`, …).
  همهٔ فهرست‌ها روی موتور مشترک `TreasuryListPage` سوار شده‌اند (هدر تطبیق‌پذیر + نوار جست‌وجو/فیلتر + `ModuleTable` + `ModulePager`).
  صفحات جدید: `/treasury/payment-orders` (دستورهای پرداخت) و `/treasury/approval-rules` (سطوح تأیید + تنظیمات تفکیک وظایف).
  `/treasury/entities` حذف و به حساب‌های بانکی نگاشت شد؛ بخش‌های قدیمی `*Sections.jsx` حذف شدند.
  بک‌اند: فیلترهای `status` (چندمقداری)، `date_from/date_to`, `entity`, `due_soon`, `instrument_kind`،
  جست‌وجو در دستور پرداخت‌ها و فیلترهای تعهدات/انتقال/علی‌الحساب/سپرده اضافه شد.
- **صدور سند با پیش‌نمایش چاپ (۲۰۲۶-۱۱-۰۷):** در «دریافت‌ها»، «همه عملیات» (پرداخت‌ها) و «انتقال وجوه»
  دکمهٔ «صدور فیش دریافت / صدور حواله پرداخت / صدور رسید انتقال» یک دیالوگ دوستونه باز می‌کند:
  فرم (فیلدهای سند) + **پیش‌نمایش زندهٔ قالب چاپ** (تاریخ شمسی، مبلغ به حروف، بارکد، شمارهٔ بعدی)؛
  با «ثبت و صدور»، سند واقعی ساخته می‌شود (Receipt / TreasuryTransaction posted / TreasuryTransfer posted)
  و بلافاصله چاپ نهایی باز می‌شود. اندپوینت‌ها: `/api/treasury/voucher-preview/` و `/api/treasury/voucher-issue/`.
  چاپ تراکنش‌های خزانه اکنون HTML قالب (نه فقط داده) برمی‌گرداند؛ «ثبت انتقال» در یک تابع مشترک
  `vouchers.post_transfer_documents` متمرکز شد.
- **کاربران و مجوزهای ریز هر پرسنل (۲۰۲۶-۱۱-۰۷):** `/users` دو تب دارد:
  **کاربران** (جدول با عنوان شغلی/دپارتمان پرسنل، برچسب «مدیر سیستم» یا تعداد مجوز، ماژول‌های مجاز،
  آخرین ورود، ویرایش/غیرفعال‌سازی) و **مجوزهای کاربران** (انتخاب هر کاربر → ماتریس ماژول→گروه→منو
  با مشاهده/ایجاد/ویرایش/حذف/تأیید/خروجی، «انتخاب همه» ماژول، جست‌وجوی منو، سوئیچ «دسترسی کامل = مدیر سیستم»).
  - **بدون نقش‌محوری**: مجوزها برای «هر کاربر» مستقل ذخیره می‌شود؛ فقط یک نقش سیستمی «مدیر سیستم»
    (سوپریوزر یا `is_full_access`) با دسترسی کامل وجود دارد. یک کاربر می‌تواند در یک ماژول فقط «مشاهده»
    و در ماژول دیگر «تأیید» داشته باشد.
  - کاتالوگ: `core/permission_catalog.py` + `core/permission_catalog_data.json`
    (۱۰ ماژول، ۷۵ گروه، **۲۵۹ منو**، **۱۰۷۲ کد** `module.menu.action`). بازتولید:
    `python scripts/build_permission_catalog.py` بعد از تغییر `menuConfig.js`.
  - مدل `core.UserAccess` (user OneToOne، `permissions` JSON، `is_full_access`, `applications`, `note`)
    + مایگریشن `core.0019`. موتور: `fine_permissions_for` از `UserAccess` می‌خواند؛ مجوزهای قدیمی
    (`treasury_execute`, `can_approve_documents`…) با `LEGACY_RULES` از همان کدهای ریز مشتق می‌شوند
    (سازگاری کامل ویوها) و کاربران بدون ردیف UserAccess هنوز از پیش‌فرض نقش قدیمی استفاده می‌کنند.
  - اندپوینت‌ها: `GET users/` (با `employee_position`/`employee_department`/`modules`/`is_full_access`)،
    `GET users/access/catalog/`، `GET|POST users/<id>/access/` (ماتریس + دسترسی کامل)،
    و مسیرهای سازگاری `users/roles/…` (دیگر در UI استفاده نمی‌شوند).
  - تست‌ها: `core/tests_permissions.py` و `__tests__/usersAccessSmoke.test.js`.
  - نکته: اندپوینت `/applications/catalog/` فیلد **`title`** (و `icon` به‌صورت **رشته**) می‌دهد؛
    در UI عنوان با `app.title` و آیکون با نقشهٔ `MODULE_ICONS[slug]` رندر می‌شود (نه `name/label`).
- **دریافت/پرداخت پیشرفته:** دفتر اسناد (`/treasury/voucher-book` با انواع چک/نقدی/شبا/سند و حساب بدهکار)،
  دستور پرداخت بین‌بانکی پایا/ساتنا (`/treasury/bank-orders` + اعتبارسنجی شبا mod 97 و تشخیص بانک از کد شبا)،
  کسورات چندگانهٔ پرداخت (`PaymentDeduction`، مبلغ خالص، `/payment-requests/{id}/distribution/`),
  قواعد سطح تأیید (`TreasuryApprovalRule`) + تفکیک وظایف (`/treasury/settings/`), گزارش‌ها (`/treasury/reports/` + Excel),
  مغایرت بانکی (`/treasury/statement-lines/` + تطبیق خودکار/دستی), و قالب چاپ جای‌نگهدار (`/treasury/print-templates/`) با بارکد Code 39
  (به‌جای QR که به بستهٔ بیرونی نیاز دارد).

---

## 13) Backlog / known gaps

1. **`pg_trgm` + GIN** روی `subject`/`body` (نیاز به `CREATE EXTENSION`).
2. پیش‌نمایش Office در DMS (تبدیل سمت سرور).
3. چیدمان قابل‌تنظیم ویجت‌های داشبورد (ترجیحات کاربر).
4. تست‌های DB-based برای querysetهای پیچیده.
5. گزارش‌های مکاتبات (میانگین زمان پاسخ، بار کاری واحدها).
6. ایندکس تکمیلی `(company, direction, due_date)` در صورت رشد داده.
7. **یکتایی شمارهٔ نامه:** فعلاً ممکن نیست — ۱۳۵ گروه `(direction, number)` تکراری و ۱٬۴۹۸ نامهٔ
   بدون شماره در دادهٔ `kpsmi` وجود دارد؛ پیش از افزودن `UniqueConstraint` باید داده پاک‌سازی شود
   (`series` فعلی منبع قابل‌اتکاتر است).
8. تکمیل سخت‌سازی رسانه: `internal` کردن `/media/` در nginx + `X-Accel-Redirect` تا حتی لینک مستقیم
   فایل هم بدون احراز هویت کار نکند (اکنون XSS بسته شده اما دسترسی مستقیم به فایل‌های غیرمحرمانه باز است).

---

## 14) Persian UI glossary — واژه‌نامه

| فنی | متن UI |
|---|---|
| incoming / outgoing / internal | وارده / صادره / داخلی |
| referral / refer | ارجاع / ارجاع دادن |
| cartable / workdesk | کارتابل / میزکار |
| counterparty / party | طرف حساب |
| correspondent / organization | مخاطب / سازمان |
| attachment / draft | پیوست / پیش‌نویس |
| in progress / answered / closed / archived | در جریان / پاسخ‌داده‌شده / بسته‌شده / بایگانی‌شده |
| overdue / due soon | معوق / نزدیک مهلت |
| indicator no. / transmittal no. | شمارهٔ اندیکاتور / شمارهٔ ترابری |
| scan / scanned ratio | اسکن / نسبت اسکن‌شده |
| archive profile / archive folder | پروفایل بایگانی / پوشهٔ بایگانی |
| name mapping | نگاشت نام‌ها |
| name mapping purpose / scope | کاربرد نگاشت / دامنهٔ کاربرد |
| dual (two-way) mapping | نگاشت دو مسیره |
| multi-target mapping | نگاشت چند مقصده |
| treasury voucher (receipt/payment) | فیش دریافت / فیش پرداخت |
| payment request / payment order | درخواست پرداخت / دستور پرداخت |
| bank account / cash box | حساب بانکی / صندوق |
| received check / issued check | چک دریافتی / چک پرداختی |
| bank reconciliation | مغایرت بانکی |
| amount in words | مبلغ به حروف |
| theme studio / appearance | استودیو تم / ظاهر و پوسته |
| quick actions / action queue | دسترسی سریع / صف اقدام |

---

**پایان سند.** اگر جایی این سند با کد نمی‌خواند، **کد مرجع است**؛ همین فایل را اصلاح کنید تا زنده بماند.

```
