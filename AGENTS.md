# AGENTS.md â€” handoff brief for the next coding agent

**Repo:** `C:\HRMS` (Kian ERP / HRMS) آ· **Remote:** `https://github.com/rezakianimajd/HRMS.git` (branch `main`)
**Last updated:** 2026-11-08 آ· **Baseline commit:** `32d0d0e09`

> ظ‡ط¯ظپ ط§غŒظ† ط³ظ†ط¯: ظ‡ط± ط§غŒط¬ظ†طھغŒ ع©ظ‡ طھط§ط²ظ‡ ط¨ظ‡ ظ¾ط±ظˆعکظ‡ ظ…غŒâ€Œط¢غŒط¯طŒ ط¨ط¯ظˆظ† ع©ط´ظپ ط¯ظˆط¨ط§ط±ظ‡طŒ ط³ط±غŒط¹ ظˆ ط§ظ…ظ† ع©ط§ط± ع©ظ†ط¯.
> Structure/headings are English; explanations and warnings are Persian; all code/commands are English and copyâ€‘paste ready.
> ط§غŒظ† ظپط§غŒظ„ ط±ط§ ظ‚ط¨ظ„ ط§ط² ظ‡ط± طھط؛غŒغŒط± ع©ط§ظ…ظ„ ط¨ط®ظˆط§ظ†غŒط¯ط› ط³ظ¾ط³ ط¨ط®ط´ ظ…ط±ط¨ظˆط· ط¨ظ‡ ظˆط¸غŒظپظ‡ ط±ط§ ط¯ظˆط¨ط§ط±ظ‡ ظ…ط±ظˆط± ع©ظ†غŒط¯.

---

## 0) Golden rules â€” ظ‚ظˆط§ط¹ط¯ ط·ظ„ط§غŒغŒ

1. **Verify before you finish**: backend â†’ `manage.py check` (+ tests), frontend â†’ the related smoke tests. ظ‡ط± طھط؛غŒغŒط± ط¨ط¯ظˆظ† ط§غŒظ† ط¯ظˆطŒ ظ†ط§طھظ…ط§ظ… ط§ط³طھ.
2. **UI must follow the Theme Studio** â€” ظ‡غŒع† ط±ظ†ع¯/ط´ط¹ط§ط¹/ط³ط§غŒظ‡ظ” hardâ€‘code. ط§ط² `useDesignTokens()` ظˆ `ModulePaletteContext` ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯ (ط¨ط®ط´ غ¶).
3. **Every list/table is a performance contract**: light serializer + targeted `select_related`/`Prefetch`, ط³ظ‚ظپ ط¹ظ…ظ„غŒ ~غ¸ ع©ظˆط¦ط±غŒ ط¨ط±ط§غŒ ظ‡ط± طµظپط­ظ‡ (ط¨ط®ط´ غ¸).
4. **Search lives in two layers**: endpoint search (`?search=` / `?q=`) **and** module search provider (`core/module_search.py`) â€” ط¨ط¯ظˆظ† ط¯ظˆظ…غŒطŒ ط³ط§غŒط¯ط¨ط§ط±/ظ¾ط§ظ„طھ ظپط±ظ…ط§ظ† ع†غŒط²غŒ ظ¾غŒط¯ط§ ظ†ظ…غŒâ€Œع©ظ†ط¯.
5. **Never commit** scratch files (`_*.py`, `_*.txt`, `_*.sh`, `_letters_pack/` â€¦). ط§ظ„ع¯ظˆظ‡ط§غŒ `_*.<ext>` ط¯ط± `.gitignore` ظ‡ط³طھظ†ط¯ط› ط§ع¯ط± ظپط§غŒظ„ ظ…ظˆظ‚طھغŒ ظ„ط§ط²ظ… ط´ط¯طŒ ط¨ط§ ظ¾غŒط´ظˆظ†ط¯ `_` ط¯ط± ط±ظˆطھ ط¨ط³ط§ط²غŒط¯ ظˆ ط¯ط± ظ¾ط§غŒط§ظ† ظ¾ط§ع© ع©ظ†غŒط¯.
6. **Secrets**: ظ‡غŒع† ط±ظ…ط²/طھظˆع©ظ†/ظ…ط­طھظˆط§غŒ `.env` ط±ط§ ط¯ط± ع©ط¯طŒ ط³ظ†ط¯ غŒط§ ع©ط§ظ…غŒطھ ظ†ع¯ط°ط§ط±غŒط¯. ط±ظ…ط² `sudo` ط³ط±ظˆط± ط±ط§ ظ‡ظ…غŒط´ظ‡ ط§ط² ع©ط§ط±ط¨ط± ط¨ظ¾ط±ط³غŒط¯.

---

## 1) Stack & versions

| Layer | Tech |
|---|---|
| Backend | Django 5 + Django REST Framework + SimpleJWT + djangoâ€‘tenants + djangoâ€‘filters + Celery (redis) |
| DB | **PostgreSQL only** (ظ‡غŒع† fallback ط¨ط±ط§غŒ SQLite ظ†غŒط³طھ) |
| Python | venv ظ…ط­ظ„غŒ: `C:\HRMS\venv\Scripts\python.exe` (ط³ط±ظˆط±: `/opt/hrms/venv`) |
| Frontend | React 18 + MUI 5.18 + `react-scripts` 5 (CRA) + `@tanstack/react-query` 5 + axios + recharts + i18next |
| i18n/UX | `LANGUAGE_CODE='fa'`, `TIME_ZONE='Asia/Tehran'`, RTLطŒ طھط§ط±غŒط® ط¬ظ„ط§ظ„غŒ (`toJalali`)طŒ ط§ط¹ط¯ط§ط¯ ظپط§ط±ط³غŒ (`toPersianDigits`) |
| Auth | JWT (access/refresh) ط¯ط± `localStorage`ط› `axiosInstance` ط®ظˆط¯ع©ط§ط± refresh ظ…غŒâ€Œع©ظ†ط¯ |
| Pagination | `core.pagination.StandardResultsSetPagination` â†’ `page_size=100`, max 1000 |

ظ†ع©طھظ‡: CRA build ط¨ط§ `PUBLIC_URL=/assets` ط§ظ†ط¬ط§ظ… ظ…غŒâ€Œط´ظˆط¯ط› ظپط§غŒظ„â€Œظ‡ط§غŒ ظ†ظ‡ط§غŒغŒ ط§ط² `/assets/static/...` ط³ط±ظˆ ظ…غŒâ€Œط´ظˆظ†ط¯.

---

## 2) Repo layout

```
C:\HRMS
â”œâ”€ hrms_project\            # Django project + apps (ظ‡ط± ط§ظ¾ = غŒع© ظ…ط§عکظˆظ„)
â”‚  â”œâ”€ hrms_project\settings\{base,development,production}.py
â”‚  â”œâ”€ core\                # shared app: Company/DomainطŒ search engineطŒ paginationطŒ theme API
â”‚  â””â”€ <apps>\              # employees, documents, correspondences, contracts, accounting, â€¦
â”œâ”€ frontend\src\           # React app (pages/, core/, modules/)
â”œâ”€ scripts\                # ط§ط¨ط²ط§ط±ظ‡ط§غŒ CLI (export/import ظ…ع©ط§طھط¨ط§طھطŒ â€¦)
â”œâ”€ docs\                   # correspondence-attachments.mdطŒ document-management-redesign.mdطŒ
â”‚                          # NEXT_AGENT_PROMPT.md (ظ¾ط±ط§ظ…ظ¾طھ ط¢ظ…ط§ط¯ظ‡ظ” ط§غŒط¬ظ†طھ ط¨ط¹ط¯غŒ)
â”œâ”€ deploy-frontend.ps1     # ط§ط³طھظ‚ط±ط§ط± ظپظ‚ط· ظپط±ط§ظ†طھ
â”œâ”€ deploy-backend.ps1      # ط§ط³طھظ‚ط±ط§ط± ط¨ع© (+ ظ…ط§غŒع¯ط±غŒط´ظ†)
â”œâ”€ update-server.ps1       # ظ‡ط± ط¯ظˆ
â”œâ”€ SERVER_UPDATE.md        # ط±ط§ظ‡ظ†ظ…ط§غŒ ط¯ط³طھغŒ ط³ط±ظˆط± + ط¹غŒط¨â€ŒغŒط§ط¨غŒ
â”œâ”€ README.md / INSTALLATION.md / DATABASE_MIGRATION.md
â””â”€ ط§ط¨ط²ط§ط± ع©ط§ط±ط§غŒغŒ: hrms_project\core\management\commands\dev_query_profile.py

---

## 3) Multiâ€‘tenancy & database â€” ع†ظ†ط¯â€Œظ…ط³طھط§ط¬ط±غŒ

- `TENANT_MODEL = 'core.Company'` ظˆ `TENANT_DOMAIN_MODEL = 'core.Domain'` â€” ط§غŒظ† ط¯ظˆ ط¯ط± **public schema** ظ‡ط³طھظ†ط¯.
- `SHARED_APPS` (public): `django_tenants`, `jazzmin`, `core`, `rest_framework*`, `corsheaders`, `django_filters`, celery apps.
- `TENANT_APPS` (ط¯ط§ط®ظ„ schema ظ‡ط± ط´ط±ع©طھ): `employees, documents, leaves, attendance, payroll, orgchart, settings_app, correspondences, notifications, lifecycle, recruitment, appraisal, contracts, projects, pettycash, accounting, procurement, treasury, datamapping`.
- tenant ظپط¹ط§ظ„ ظ¾ط±ظˆعکظ‡: **`kpsmi`** (ط´ط±ع©طھ آ«ظ…ظˆط³ط³ظ‡ ظ…ط¯غŒط±غŒطھ ط±ط§ظ‡ط¨ط±ط¯غŒ ط®ط§طھظ… ظ¾ط§ط³ط§ط±ع¯ط§ط¯آ»).

ظ‚ظˆط§ط¹ط¯ ط¹ظ…ظ„غŒ:
1. **ظ‡ط± ع†غŒط² ظ…ط±ط¨ظˆط· ط¨ظ‡ غŒع© ط´ط±ع©طھ (ظ…ط¯ظ„طŒ طھظ†ط¸غŒظ…ط§طھطŒ ظ¾ط±ظˆظپط§غŒظ„ ط¨ط§غŒع¯ط§ظ†غŒطŒ ط§ط³ظ†ط§ط¯) ط¯ط§ط®ظ„ schema ط§ط³طھ.** ط§ع¯ط± ط¯ط± public ع©ظˆط¦ط±غŒ ط¨ط²ظ†غŒط¯ ط®ط·ط§غŒ `relation "â€¦" does not exist` ظ…غŒâ€Œع¯غŒط±غŒط¯ â€” ط§غŒظ† ط·ط¨غŒط¹غŒ ط§ط³طھطŒ ظ†ظ‡ ط¨ط§ع¯.
2. ط¯ط± **management command**ظ‡ط§: ط§ط¨طھط¯ط§ ط´ط±ع©طھ ط±ط§ ط§ط² public ط¨ط®ظˆط§ظ†غŒط¯طŒ ط¨ط¹ط¯ ع©ط§ط± ط±ط§ ط¯ط§ط®ظ„ `schema_context(...)` ط¨ط¨ط±غŒط¯:
   ```python
   from django_tenants.utils import get_tenant_model, schema_context
   from core.models import Company

   company = Company.objects.filter(is_active=True).first()      # public
   for tenant in get_tenant_model().objects.exclude(schema_name='public'):
       with schema_context(tenant.schema_name):
           ...  # ظ‡ظ…ظ‡ظ” ظ…ط¯ظ„â€Œظ‡ط§غŒ tenant ط§غŒظ†ط¬ط§
   ```
   ط§ظ„ع¯ظˆغŒ ط¢ظ…ط§ط¯ظ‡: `correspondences/management/commands/import_letter_attachments.py` ظˆ `relocate_letter_attachments.py` (ع¯ط²غŒظ†ظ‡ظ” `--schema`).
3. ط¯ط± **shell/غŒع©â€Œط¨ط§ط±ظ‡** ظ‡ظ…غŒط´ظ‡ `with schema_context('kpsmi'):` ط¨ع¯ط°ط§ط±غŒط¯ (ظˆ `HTTP_HOST='192.168.1.63'` ظˆظ‚طھغŒ `build_absolute_uri` طµط¯ط§ ط²ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯).
4. ظ…ط§غŒع¯ط±غŒط´ظ†: `python manage.py migrate_schemas --noinput` (ط³ط±ظˆط±). ط¨ط±ط§غŒ ط¯غŒط¯ظ† ظˆط¶ط¹غŒطھ: `showmigrations`.
5. `Company` ط¯ط§ط±ط§غŒ `auto_create_schema` ط§ط³طھط› ط¯ط± طھط³طھâ€Œظ‡ط§غŒ ط¨ط¯ظˆظ† DB ط§ط² `SimpleTestCase` ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯ (ط¨ط®ط´ غ±غ°).

---

## 4) Module map â€” ظ†ظ‚ط´ظ‡ظ” ظ…ط§عکظˆظ„â€Œظ‡ط§

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

- ظ…ط³غŒط±ظ‡ط§/ط¢غŒع©ظˆظ†â€Œظ‡ط§: `frontend/src/core/constants/moduleIcons.js` (`MODULE_LANDING_PATHS`)طŒ ظ…ظ†ظˆظ‡ط§: `frontend/src/core/config/menuConfig.js` (`getMenuForApp(slug)`).
- accent ظ¾غŒط´â€Œظپط±ط¶ ظ‡ط± ظ…ط§عکظˆظ„: `MODULE_DEFAULT_ACCENTS` ط¯ط± `core/context/ModulePaletteContext.jsx` (طھظˆط¬ظ‡: `correspondence` ط¯ط± ط§غŒظ† ظ†ظ‚ط´ظ‡ ظ†غŒط³طھط› fallback ط±ظ†ع¯ ط¯ط± ط®ظˆط¯ ع©ط§ظ…ظ¾ظˆظ†ظ†طھâ€Œظ‡ط§ ظ…ط«ظ„ `correspondenceUi.ACCENT` ط§ط³طھ).
- `getPalette(slug)` ظپظ‚ط· ظˆظ‚طھغŒ ع†غŒط²غŒ ط¯ط± ط§ط³طھظˆط¯غŒظˆ ط°ط®غŒط±ظ‡ ط´ط¯ظ‡ ط¨ط§ط´ط¯ ظ…ظ‚ط¯ط§ط± ظ…غŒâ€Œط¯ظ‡ط¯طŒ ظˆع¯ط±ظ†ظ‡ `null` â†’ ظ‡ظ…غŒط´ظ‡ fallback ط¨ع¯ط°ط§ط±غŒط¯.


---

## 5) Frontend architecture â€” ظ…ط¹ظ…ط§ط±غŒ ظپط±ط§ظ†طھ

### Provider order (`frontend/src/App.jsx`)
```
ThemeProvider (MUI)               â†گ ط§ط² palettes/mode ط³ط§ط®طھظ‡ ظ…غŒâ€Œط´ظˆط¯
â””â”€ DesignTokenProvider(tokens)    â†گ resolvedDesign ط§ط² ط§ط³طھظˆط¯غŒظˆ طھظ… + normalizer
   â””â”€ AppThemeProvider            â†گ ThemeContext (mode, neonâ€¦)
      â””â”€ ModulePaletteProvider    â†گ /settings/appearance/ GET ط¯ط± ط´ط±ظˆط¹
         â””â”€ ApplicationProvider  â†گ currentApp (slug ظ…ط§عکظˆظ„ ظپط¹ط§ظ„)
            â””â”€ â€¦ Pages
```

### Contexts/hooks
| ع†غŒط²غŒ | ظ…ط­ظ„ | ع©ط§ط±ط¨ط±ط¯ |
|---|---|---|
| `useDesignTokens()` | `core/context/DesignTokenContext.jsx` | ظ‡ظ…ظ‡ظ” طھظˆع©ظ†â€Œظ‡ط§غŒ ط§ط³طھظˆط¯غŒظˆ (`infoCards`, `headers`, `tables`, `lists`, `surfaces`, â€¦) |
| `useModulePalette()` | `core/context/ModulePaletteContext.jsx` | `getPalette(slug)`, `typography`, `designTokens`, set/reset, save |
| `useModuleTheme()` | `pages/contracts/contractModuleUi.jsx` | `{ theme, tableTheme, toolbar, cardPadX, cardPadY, cardBorderColor }` |
| `useRowHeight/useModuleTableState` | ظ‡ظ…ط§ظ† ظپط§غŒظ„ | ط§ط±طھظپط§ط¹ ط±ط¯غŒظپ ط¨ط± ط§ط³ط§ط³ طھظ…طŒ طµظپط­ظ‡â€Œط¨ظ†ط¯غŒ ط³ط±ظˆط±غŒ |

### UI kit (ط§ط² ظ‡ظ…غŒظ†â€Œظ‡ط§ ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯طŒ ظ†ظ‡ ط³ط§ط®طھظ† ط¯ظˆط¨ط§ط±ظ‡)
- `PageHeader` â€” `icon={<Icon/>}` **ط¹ظ†طµط±** ظ…غŒâ€Œع¯غŒط±ط¯ط› badge/actions ط¯ط§ط±ط¯ ظˆ ط§ط² `headers` طھظ… ظ¾غŒط±ظˆغŒ ظ…غŒâ€Œع©ظ†ط¯.
- `ModuleToolbar`, `ModuleTable`, `ModulePager` â€” ظ†ظˆط§ط± ط¬ط³طھâ€Œظˆط¬ظˆ/ظپغŒظ„طھط±/ظ…ط±طھط¨â€Œط³ط§ط²غŒطŒ ط¬ط¯ظˆظ„ طھظ…â€Œظ…ط­ظˆط±طŒ طµظپط­ظ‡â€Œط¨ظ†ط¯غŒ ظپط§ط±ط³غŒ.
- `InfoCard`, `DataTable` â€” ع©ط§ط±طھ ط§ط·ظ„ط§ط¹ط§طھ ظˆ ط¬ط¯ظˆظ„ ط¹ظ…ظˆظ…غŒ (طھظˆع©ظ†â€Œظ…ط­ظˆط±).
- **ظ…ظˆطھظˆط± ظپظ‡ط±ط³طھ ط®ط²ط§ظ†ظ‡**: `pages/treasury/treasuryListUi.jsx` (`TreasuryListPage` + `statusChip` + `STATUS_TONE`)
  â€” ظ‡ط¯ط± طھط·ط¨غŒظ‚â€Œظ¾ط°غŒط± (`PageHeader`) + ظ†ظˆط§ط± ط¬ط³طھâ€Œظˆط¬ظˆ/ظپغŒظ„طھط± (ط¬ط³طھâ€Œظˆط¬ظˆغŒ debounceطŒ ظپغŒظ„طھط±ظ‡ط§غŒ select/طھط§ط±غŒط®طŒ `?status=â€¦` ط§ط² URL)
  + `ModuleTable` + `ModulePager` ط³ط±ظˆط±غŒ + KPI strip + row actions (POST/GET غŒط§ `onRun` ط¨ط±ط§غŒ ع†ط§ظ¾/ط¯غŒط§ظ„ظˆع¯)
  + `quickCreate`. ع©ط§ظ†ظپغŒع¯â€Œظ‡ط§: `treasuryListConfigs.jsx` (ط¯ط±غŒط§ظپطھâ€Œظ‡ط§طŒ ط¹ظ…ظ„غŒط§طھ)طŒ `treasuryListConfigs2.jsx`
  (ط¯ط±ط®ظˆط§ط³طھ/ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھطŒ طھط¹ظ‡ط¯ط§طھطŒ ط§ظ†طھظ‚ط§ظ„طŒ ط¹ظ„غŒâ€Œط§ظ„ط­ط³ط§ط¨طŒ ط³ظ¾ط±ط¯ظ‡طŒ ط¯ط³طھظ‡â€Œع†ع©طŒ ظ‚ط§ط¨ظ„â€Œظ¾ط±ط¯ط§ط®طھ)طŒ `treasuryCheckConfigs.jsx`
  (ع†ع© ط¯ط±غŒط§ظپطھغŒ/ظ¾ط±ط¯ط§ط®طھغŒ ط¨ط§ ظ‡ظ…ظ‡ظ” ظˆط¶ط¹غŒطھâ€Œظ‡ط§غŒ ظ…ظ†ظˆ). طµظپط­ظ‡ظ” ط¬ط¯غŒط¯ = غŒع© `<TreasuryListPage {...CONFIG} />`.
- **طµط¯ظˆط± ط³ظ†ط¯ ط¨ط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ع†ط§ظ¾**: `pages/treasury/TreasuryVoucherComposerDialog.jsx` â€” ظپط±ظ… ط³ظ…طھ ط±ط§ط³طھ
  (ظ†ظˆط¹ ط³ظ†ط¯: ظپغŒط´ ط¯ط±غŒط§ظپطھ / ط­ظˆط§ظ„ظ‡ ظ¾ط±ط¯ط§ط®طھ / ط±ط³غŒط¯ ط§ظ†طھظ‚ط§ظ„ + طھط§ط±غŒط® ط´ظ…ط³غŒطŒ ظ…ط¨ظ„ط؛طŒ ط·ط±ظپ ط­ط³ط§ط¨طŒ ط­ط³ط§ط¨/طµظ†ط¯ظˆظ‚طŒ ط±ظˆط´/ظ†ظˆط¹ ط³ظ†ط¯طŒ ع†ع© ظˆ ط³ط±ط±ط³غŒط¯)
  ظˆ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡ظ” ظ‚ط§ظ„ط¨ ع†ط§ظ¾ ط³ظ…طھ ع†ظ¾ (`iframe srcDoc`) ط¨ط§ طھط§ط±غŒط® ط´ظ…ط³غŒطŒ ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپطŒ ط¨ط§ط±ع©ط¯ ظˆ ط´ظ…ط§ط±ظ‡ظ” ط¨ط¹ط¯غŒ.
  ط¨ع©â€Œط§ظ†ط¯: `POST /api/treasury/voucher-preview/` (ط¨ط¯ظˆظ† ط«ط¨طھ) ظˆ `POST /api/treasury/voucher-issue/`
  (`kind: receipt|payment|transfer` â†’ `Receipt` / `TreasuryTransaction(payment, posted)` / `TreasuryTransfer(posted)`
  + `print_url`). ظ…ط§عکظˆظ„â€Œظ‡ط§: `treasury/voucher_compose.py` (ط®ط§ظ„طµ/ظ‚ط§ط¨ظ„ طھط³طھ) ظˆ `treasury/voucher_compose_views.py`.
  ع†ط§ظ¾ ظ†ظ‡ط§غŒغŒ ط¨ط§ `TreasuryVoucherDialog` ط±ظˆغŒ ظ‡ظ…ط§ظ† `print_url` (ظ‚ط§ظ„ط¨ ط¬ط§غŒâ€Œظ†ع¯ظ‡ط¯ط§ط± + ط¨ط§ط±ع©ط¯).
- **ظ‚ط§ظ„ط¨â€Œظ‡ط§غŒ ط§ظ„ع¯ظˆغŒ ط¨ط§ظ†ع© ظ¾ط§ط³ط§ط±ع¯ط§ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** ط¯ظˆ ظ†ظˆط¹ ط³ظ†ط¯ ع†ط§ظ¾غŒ ط¬ط¯غŒط¯ ط¯ط± `treasury/print_templates.py`:
  `interbank` (آ«ط­ظˆط§ظ„ظ‡ ط¨غŒظ†â€Œط¨ط§ظ†ع©غŒ (ط´ط¨ط§)آ» â€” ظپط±ظ… ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھ ط§ظ„ع©طھط±ظˆظ†غŒع©غŒ ط¨غŒظ†â€Œط¨ط§ظ†ع©غŒ ظ¾ط§غŒط§/ط³ط§طھظ†ط§ ط¯ط± A4) ظˆ
  `cash` (آ«ظپغŒط´ ظ†ظ‚ط¯غŒآ» â€” ط¨ط±ع¯ ط¯ط±غŒط§ظپطھ/ظ¾ط±ط¯ط§ط®طھ ظ†ظ‚ط¯غŒ ط¯ط± A5)ط› ظ‡ط± ط¯ظˆ ط¨ط§ ط®ط§ظ†ظ‡â€Œظ‡ط§غŒ ط¹ط¯ط¯غŒ ظ…ط¨ظ„ط؛ ظˆ ط´ط¨ط§
  (`{{amount_boxes}}` / `{{destination_iban_boxes}}` â€” ع©ظ„غŒط¯ظ‡ط§غŒ ط§ظ…ظ† HTML). ط§ظ†طھط®ط§ط¨ ط®ظˆط¯ع©ط§ط± ظ‚ط§ظ„ط¨:
  `voucher_compose.template_kind_for()` ظˆ `vouchers.build_transaction_voucher` â†’
  `instrument_kind='sheba'` â‡’ interbankطŒ `'cash'` â‡’ cash. طھطµط§ظˆغŒط± ظ…ط±ط¬ط¹ ط¯ط±
  `docs/refs/pasargad-satna-transfer-form.jpg` ظˆ `docs/refs/pasargad-cash-receipt.png`.
  ظپغŒظ„ط¯ظ‡ط§غŒ ظ…ظ‚طµط¯ (ط´ط¨ط§/ط­ط³ط§ط¨/ظ†ط§ظ…/ع©ط¯ ظ…ظ„غŒ/ط¨ط§ظ†ع©) ط¨ظ‡ `TreasuryTransaction` ط§ط¶ط§ظپظ‡ ط´ط¯
  (ظ…ط§غŒع¯ط±غŒط´ظ† `0011`) ظˆ ط¨ط§ `iban.is_valid` (mod 97) ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظ…غŒâ€Œط´ظˆظ†ط¯ط› seed ط¯ط± `0012`.
- `AttachmentPreviewDialog` â€” ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ PDF/ط¹ع©ط³/ظ…طھظ† ط¨ط¯ظˆظ† ط¯ط§ظ†ظ„ظˆط¯ + آ«ط¨ط§ط² ع©ط±ط¯ظ† ط¯ط± طھط¨ ط¬ط¯غŒط¯آ»/آ«ط¯ط±غŒط§ظپطھآ».
- `LetterDetailsDialog` (`pages/correspondence/correspondenceLetterDetails.jsx`) â€” ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ†ط§ظ…ظ‡ (ظ‡ط¯ط± + طھط¨â€Œظ‡ط§غŒ
  ظ…ط´ط®طµط§طھ/ط§ط±ط¬ط§ط¹ط§طھ/ظ¾غŒظˆط³طھâ€Œظ‡ط§/طھط§ط±غŒط®ع†ظ‡) **ع©ط§ظ…ظ„ط§ظ‹ ظ¾ط±ط§ظ¾â€Œظ…ط­ظˆط±**ط› ط¨ط±ط§غŒ ط§ط³طھظپط§ط¯ظ‡ظ” ظ…ط¬ط¯ط¯ ط¯ط± طھط¨ ظ…ع©ط§طھط¨ط§طھ ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯:
  `<LetterDetailsDialog open letter={x} tab onTabChange onClose onAction={(name, payload) => â€¦} canEditOf â€¦ />`.
- `FaviconSync` (`core/components/ui/FaviconSync.jsx`) â€” ط¢غŒع©ظ† طھط¨ ظ…ط±ظˆط±ع¯ط± ط±ط§ ط§ط² **ظ„ظˆع¯ظˆغŒ ط´ط±ع©طھ**
  (`طھظ†ط¸غŒظ…ط§طھ â†’ ظ…ط´ط®طµط§طھ ط´ط±ع©طھ`) ط³طھ ظ…غŒâ€Œع©ظ†ط¯. ظ…ظ†ط¨ط¹ ط¯ط§ط¯ظ‡: ط§ظ†ط¯ظ¾ظˆغŒظ†طھ ط¹ظ…ظˆظ…غŒ `GET /api/company/branding/`
  (`core.views.company_branding_view` / `company_branding_payload`) ع©ظ‡ `favicon_url` ط±ط§ ط¨ط§
  `?v=<updated_at>` ط¨ط±ط§غŒ ط´ع©ط³طھظ† ع©ط´ ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط§ظ†ط¯. ط¨ط¯ظˆظ† ظ„ظˆع¯ظˆطŒ ظ‡غŒع† ظ„غŒظ†ع©غŒ طھط²ط±غŒظ‚ ظ†ظ…غŒâ€Œط´ظˆط¯.
  ط¯ط± `App.jsx` ط¯ط§ط®ظ„ `ThemedApp` ط³ظˆط§ط± ط§ط³طھ (طµظپط­ظ‡ظ” ظˆط±ظˆط¯ ظ‡ظ… ظ¾ظˆط´ط´ ط¯ط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯)ط› ط¨ط¹ط¯ ط§ط² ط¢ظ¾ظ„ظˆط¯ ظ„ظˆع¯ظˆ ط¯ط±
  `CompanyProfilePage` ع©ظˆط¦ط±غŒ `['company-branding']` ط¨ط§ط·ظ„ ظ…غŒâ€Œط´ظˆط¯.

- ط§ظ„ع¯ظˆظ‡ط§غŒ ط¯ط§ط´ط¨ظˆط±ط¯: `pages/accounting/AccountingDashboardUI.jsx` (`SurfaceCard`, `KpiTile`, `KpiTileLine`, `ProgressBar`, `QuickTile`) ظˆ ظ†ط³ط®ظ‡ظ” ظ…ع©ط§طھط¨ط§طھ `pages/correspondence/correspondenceStudioUi.jsx` (`StudioKpi`, `StudioCard`, `StudioRow`, `StudioBar`, `QuickAction`, `deltaPercent`).
- **ع©غŒطھ ظ…ط´طھط±ع© ط¯ط§ط´ط¨ظˆط±ط¯:** `pages/contracts/contractsDashboardKit.jsx` â€” `Panel`طŒ `MetricTile`طŒ `StatRow`طŒ
  `Track`طŒ `SchematicRow`طŒ `TrendChart`طŒ `SparkLine`طŒ `CardPager`طŒ `EmptyNote` + ظ‡ظگظ„ظ¾ط±ظ‡ط§غŒ `money`طŒ
  `compactMoney`طŒ `daysUntil`/`daysText`/`daysColor`طŒ `num`طŒ `CARDS_PER_PAGE` ظˆ ط±ظ†ع¯â€Œظ‡ط§غŒ `RIAL_BLUE`/`FOREIGN_VIOLET`/â€¦
  **ظ‡ط± ط¯ط§ط´ط¨ظˆط±ط¯ طھط§ط²ظ‡ ط¨ط§غŒط¯ ط§ط² ط§غŒظ† ع©غŒطھ ط³ط§ط®طھظ‡ ط´ظˆط¯** (ط¯ط§ط´ط¨ظˆط±ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ ظˆ ط®ط±غŒط¯ظ‡ط§ ظ‡ظ…غŒظ† ع©ط§ط± ط±ط§ ظ…غŒâ€Œع©ظ†ظ†ط¯):
  `<Panel theme={moduleTheme} icon={XIcon} color={â€¦} title=â€¦ hint=â€¦>â€¦</Panel>`.

### API access
- ظپظ‚ط· ط§ط² `axiosInstance` (`core/api/axiosConfig.js`)ط› `baseURL='/api'` ظˆ JWT/refresh ط®ظˆط¯ع©ط§ط±. ط¯ط§ظ†ظ„ظˆط¯ ط¨ط§غŒظ†ط±غŒ: `responseType:'blob'` + `URL.createObjectURL`.
- ط¢ط¯ط±ط³â€Œظ‡ط§غŒ ظ¾ط±ع©ط§ط±ط¨ط±ط¯: `core/api/endpoints.js`, `globalSearch`, `moduleSearch`.

### Persian/RTL conventions
- ظ‡ظ…ظ‡ظ” ظ…طھظ†â€Œظ‡ط§ ظپط§ط±ط³غŒطŒ `direction: rtl`ط› ط§ط¹ط¯ط§ط¯/ظ…ط¨ط§ظ„ط؛ ظ†ظ…ط§غŒط´ ط¨ط§ `formatPersianNumber`/`toPersianDigits`طŒ ظˆط±ظˆط¯غŒ ط¨ط§ `toEnglishDigits`.
- طھط§ط±غŒط® ظ†ظ…ط§غŒط´غŒ `toJalali`/`dateLabel`ط› طھط§ط±غŒط® ظ…غŒظ„ط§ط¯غŒ ط®ط§ظ… ظ†ط´ط§ظ† ظ†ط¯ظ‡غŒط¯.


---

## 6) Theme Studio â€” ظ…ط´ط®طµط§طھ ط¯ظ‚غŒظ‚ (ط®غŒظ„غŒ ظ…ظ‡ظ…)

**ظ…ظ†ط¨ط¹ ط¯ط§ط¯ظ‡:** `frontend/src/core/theme/designTokens.js` (`DEFAULT_DESIGN_TOKENS`, ظ†ط³ط®ظ‡ غ²).
**API:** `GET/PUT /settings/appearance/` ط¨ط§ payload `{ palettes, typography, design }`
(ط¨ع©â€Œط§ظ†ط¯: `settings_app/views.py::appearance_settings_view` + `settings_app/appearance_schema.py`).
**UI ط§ط³طھظˆط¯غŒظˆ:** `frontend/src/pages/AppearancePage.jsx` (ظ…ط³غŒط± `/appearance`): ظ¾ط§ظ„طھ ظ…ط§عکظˆظ„طŒ طھط§غŒظ¾ظˆع¯ط±ط§ظپغŒطŒ ط³ط·ط­â€Œظ‡ط§طŒ ط¬ط¯ظˆظ„â€Œظ‡ط§طŒ ع©ط§ط±طھ ط§ط·ظ„ط§ط¹ط§طھطŒ ظ„غŒط³طھâ€Œظ‡ط§طŒ ط³ط§غŒظ‡â€Œظ‡ط§طŒ ع†ع¯ط§ظ„غŒ.

### Token schema (ع©ظ„غŒط¯ظ‡ط§غŒغŒ ع©ظ‡ UI ظ…غŒâ€Œط®ظˆط§ظ†ط¯)
```js
{
  version: 2,
  typography: { family, roles: { pageHeader, sectionTitle, cardTitle, cardSubtitle,
                cardValue, tableHeader, tableCell, formLabel, input, body, button,
                chip, navItem, caption, tooltip } },      // ظ‡ط± ظ†ظ‚ط´: { size, weight, lineHeight }
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
               visibleRows, showPagination, paginationVariant, â€¦ },
  lists:     { variant, surface, itemPadding, showDivider, hover, hoverTint, â€¦ }
}
```

### Helper functions (ط¨ظ‡â€Œط¬ط§غŒ ط¯ط³طھâ€Œع©ط§ط±غŒ ط¯ط³طھغŒ ط±ظ†ع¯/ط³ط§غŒظ‡)
`core/theme/designTokens.js` â†’ `infoCardBackground(design, config)` آ· `headerBackground(design, config)` آ·
`tableBackground(design, config)` آ· `shadowValue(design, key)` آ· `colorWithAlpha(color, alpha)` آ·
`mergeDesignTokens` آ· `normalizeDesignTokens` آ· `resolveTableTheme(tokens)`/`resolveToolbarTheme(tokens)`.

### CSS variables (طھظ… ظ‡ظ†ع¯ط§ظ… ط±ظ†ط¯ط± ط³طھ ظ…غŒâ€Œع©ظ†ط¯)
`--hrms-region-card-bg`, `--hrms-border-card`, `--hrms-radius-large`, `--hrms-radius`, `--hrms-shadow-card`,
`--hrms-info-card-border`, `--hrms-info-card-radius`, `--hrms-table-number-font`, `--hrms-table-*`
â†’ ظ‡ظ…غŒط´ظ‡ ط¨ط§ fallback: `var(--hrms-radius-large, 16px)`.

### ظ‚ظˆط§ط¹ط¯ ط·ط±ط§ط­غŒ
1. **Accent ظ…ط§عکظˆظ„:** `const palette = useModulePalette().getPalette(currentApp?.slug); const accent = palette?.accent || FALLBACK;`
   (`getPalette` ط§ع¯ط± ع†غŒط²غŒ ط°ط®غŒط±ظ‡ ظ†ط´ط¯ظ‡ ط¨ط§ط´ط¯ `null` ظ…غŒâ€Œط¯ظ‡ط¯.)
2. **ع©ط§ط±طھâ€Œظ‡ط§:** ط³ط·ط­/ط´ط¹ط§ط¹/ط³ط§غŒظ‡/ط¢غŒع©ظˆظ†/ط¹ظ†ظˆط§ظ† ط§ط² `tokens.infoCards` غŒط§ `tokens.headers`ط› ط­ط§ظ„طھâ€Œظ‡ط§غŒ `solid | glass | tinted | transparent` ط±ط§ ظ¾ط´طھغŒط¨ط§ظ†غŒ ع©ظ†غŒط¯.
3. **ط­ط¯ط§ظ‚ظ„ ط³ط§غŒط² ظپظˆظ†طھ:** `MIN_TYPOGRAPHY_SIZES` ط¯ط± `appearanceDefaults.js`.
4. **ع†ع¯ط§ظ„غŒ:** ط§ط±طھظپط§ط¹/ظپط§طµظ„ظ‡ ط§ط² `tokens.tables.rowHeight` ظˆ `density`طŒ ظ†ظ‡ ط¹ط¯ط¯ ط«ط§ط¨طھ.
5. **ط¯ط§ظ… ط«ط¨طھâ€Œط´ط¯ظ‡:** `PageHeader.icon` **ط¹ظ†طµط±** (`<MailIcon/>`) ظˆظ„غŒ `SectionCard.icon`/`StudioCard.icon` **ع©ط§ظ…ظ¾ظˆظ†ظ†طھ** (`MailIcon`) â†’ ط§ط´طھط¨ط§ظ‡ = **React #130** (طµظپط­ظ‡ظ” ط³ظپغŒط¯).
6. ط±ظ†ع¯â€Œظ‡ط§غŒ ظ…ط¹ظ†ط§غŒغŒ ط§ط² `tokens.colors` غŒط§ ظپط§غŒظ„ ظ…ط§عکظˆظ„ (`correspondenceUi.jsx` â†’ `DANGER/WARN/OK/â€¦`).


---

## 7) Recipes â€” ط¯ط³طھظˆط±â€Œظ¾ط®طھâ€Œظ‡ط§غŒ ط¢ظ…ط§ط¯ظ‡

### 7.1 طµظپط­ظ‡ظ” ظپظ‡ط±ط³طھ ط¬ط¯غŒط¯ (List page)
**ظپط±ط§ظ†طھ** (`frontend/src/pages/<module>/<X>Page.jsx`):
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
<ModuleTable ariaLabel="ظپظ‡ط±ط³طھ â€¦" theme={moduleTheme} columns={columns} rows={rows} â€¦ />
<ModulePager tableTheme={moduleTheme.tableTheme} page={page} onPage={setPage} â€¦ />
```
**ط¨ع©â€Œط§ظ†ط¯**: `ModelViewSet` + `filter_backends=[OrderingFilter]` + `get_serializer_class()` ع©ظ‡ ط¨ط±ط§غŒ `action == 'list'` ط³ط±غŒط§ظ„ط§غŒط²ط± ط³ط¨ع© ظ…غŒâ€Œط¯ظ‡ط¯ + `get_queryset()` ع©ظ‡ ظپظ‚ط· FKظ‡ط§غŒ ظ„ط§ط²ظ… ط±ط§ `select_related` ظ…غŒâ€Œع©ظ†ط¯.


### 7.2 ط¯ط§ط´ط¨ظˆط±ط¯ ط§ط³طھظˆط¯غŒظˆغŒغŒ
```jsx
const { accent } = useStudio();                       // غŒط§ useModulePalette + fallback
<StudioKpi icon={InboxIcon} label="ظ†ط§ظ…ظ‡â€Œظ‡ط§غŒ ظˆط§ط±ط¯ظ‡" value={formatPersianNumber(n)}
  hint={`ط§غŒظ† ظ…ط§ظ‡: ${formatPersianNumber(m)}`} delta={deltaPercent(prev, cur)} onClick={â€¦} />
<StudioCard icon={TuneIcon} title="طµظپ ط§ظ‚ط¯ط§ظ… ط§ظ…ط±ظˆط²" color={WARN} action={<Button â€¦/>}>
  <QuickAction icon={WarningAmberIcon} label="ظ…ط¹ظˆظ‚" description="غ±غ² ظ…ع©ط§طھط¨ظ‡" onClick={â€¦} />
</StudioCard>
```
ظ‚ظˆط§ط¹ط¯: ع©ط§ط±طھâ€Œظ‡ط§ `height:100%`طŒ ط´ط¨ع©ظ‡â€Œظ‡ط§غŒ responsive ط¨ط§ `gridTemplateColumns`طŒ ظ‡ظ…ظ‡ظ” ط§ط¹ط¯ط§ط¯ ظپط§ط±ط³غŒطŒ ظ‡ط± ظˆغŒط¬طھ ظ„غŒظ†ع© ظپغŒظ„طھط±ط´ط¯ظ‡ظ” ظپظ‡ط±ط³طھ ط¯ط§ط´طھظ‡ ط¨ط§ط´ط¯.

### 7.3 ط³ط±غŒط§ظ„ط§غŒط²ط± ط³ط¨ع© ظپظ‡ط±ط³طھ + ظ‚ط§ط¹ط¯ظ‡ظ” N+1
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
âڑ ï¸ڈ ط¯ط± serializer ظپظ‡ط±ط³طھ **ظ‡ط±ع¯ط²** M2M/related ط±ط§ ط¯ط³طھغŒ طµط¯ط§ ظ†ط²ظ†غŒط¯ (`obj.to_employees.all()` â†’ N+1). ط§ع¯ط± ط¨ط±ع†ط³ط¨ ظ„ط§ط²ظ… ط§ط³طھطŒ ط§ط² FKظ‡ط§غŒ `select_related`ط´ط¯ظ‡ ط¨ط³ط§ط²غŒط¯.

### 7.4 ط¬ط³طھâ€Œظˆط¬ظˆغŒ ط¬ط§ظ…ط¹ (ط¯ظˆ ظ„ط§غŒظ‡)
```python
# 1) endpoint: ط¯ط± viewset
SEARCH_FIELDS = ('number', 'subject', 'summary', 'body', 'party_account__name', 'tags', â€¦)
SEARCH_JOIN_FIELDS = ('referrals__to_name', 'referrals__instruction',
                      'referrals__to_user__first_name', 'referrals__to_employee__last_name',
                      'attachments__title')
# ط§ط±ط¬ط§ط¹ط§طھ/ظ¾غŒظˆط³طھ ط¨ط§ ط²غŒط±ع©ظˆط¦ط±غŒ IN (ظ†ظ‡ join) ط¬ط³طھâ€Œظˆط¬ظˆ ظ…غŒâ€Œط´ظˆظ†ط¯:
qs.filter(base_condition | Q(id__in=referral_ids) | Q(id__in=attachment_ids))
```
```python
# 2) module search (ط³ط§غŒط¯ط¨ط§ط±/ظ¾ط§ظ„طھ ظپط±ظ…ط§ظ†) ط¯ط± core/module_search.py
PROVIDERS['<module>'] = [
    SearchProvider('app.Model', ('subject', 'number', â€¦),
                   path=lambda obj: f'/<route>?q={_q(obj.number or obj.subject)}',
                   title_fields=('number', 'subject'), subtitle_fields=('sender_name',),
                   subtitle_display='status', icon='mail', color='#0ea5e9',
                   select_related=('party_account',),
                   extra_q=lambda term: Q(party_account__name__icontains=term) | Q(referrals__to_name__icontains=term),
                   distinct=True),
]
```
ط³ظ¾ط³ ط¨ط§ ط¯ط³طھظˆط± `python manage.py dev_query_profile --schema kpsmi --params "search=â€¦&page_size=20"` ظˆ غŒع© ط¬ط³طھâ€Œظˆط¬ظˆغŒ ظˆط§ظ‚ط¹غŒ طµط­طھ ط±ط§ ط¨ط³ظ†ط¬غŒط¯.

### 7.5 ظ…ط§عکظˆظ„ ط¨ط§غŒع¯ط§ظ†غŒ/ظ¾ط±ظˆظپط§غŒظ„ ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ + ظ¾ظˆط´ظ‡â€Œظ‡ط§غŒ DMS
1. `settings_app/models.py::default_storage_profiles()` â†’ ط¢غŒطھظ… ط¬ط¯غŒط¯ `{module_key, module_name, root_folder, entity_folder_pattern, subfolders, allowed_extensions, max_file_size_mb, color, icon, sort_order}`.
2. seed ظ…ظˆط¬ظˆط¯: `settings_app/archive_views.py::_ensure_seed` ظˆ `documents/management_folders.py::ensure_default_document_folders` (ظ‡ط± ط¯ظˆ **get_or_create ط¨ط±ط§غŒ ع©ظ„غŒط¯ظ‡ط§غŒ ظ†ط¨ظˆط¯** â€” ظ¾ط±ظˆظپط§غŒظ„ ظ…ظˆط¬ظˆط¯ ط±ط§ ط¨ط§ط²ظ†ظˆغŒط³غŒ ظ†ع©ظ†غŒط¯).
3. ع©ط§طھط§ظ„ظˆع¯ ع©طھط§ط¨ط®ط§ظ†ظ‡ظ” ط§ط³ظ†ط§ط¯ (ظپط±ط§ظ†طھ): `core/config/documentLibraryModules.js` (label + keywords + mapping ط¯ط± `APPLICATION_LIBRARY_MODULES`).
4. ط¢ظ¾ظ„ظˆط¯ ظپط§غŒظ„ ظ…ط§عکظˆظ„: `core/engines/archive_storage_engine.resolve_upload_path(company_id, module_key, fields, filename, fallback_dir=â€¦)` â†’ `archive/company_<id>/<root>/<entity>/<uuid.ext>`.

### 7.6 ظ¾غŒظˆط³طھ + ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ (ط¨ط¯ظˆظ† ط¯ط§ظ†ظ„ظˆط¯)
- serializer ظ¾غŒظˆط³طھ: `file_url` ظ…ط·ظ„ظ‚ (`request.build_absolute_uri(obj.file.url)`).
- ظپط±ط§ظ†طھ: `<AttachmentPreviewDialog open items={files} index={i} title={subject} onClose={â€¦} />` ظˆ ط¯ع©ظ…ظ‡ ط¨ط§ `aria-label="ظ…ط´ط§ظ‡ط¯ظ‡ظ” ظ¾غŒظˆط³طھ"`.
- ط¯ط± ظپظ‡ط±ط³طھ ط³ط¨ع©طŒ ظ¾غŒظˆط³طھâ€Œظ‡ط§غŒ ظپط´ط±ط¯ظ‡ (`id/title/kind_display/file_url/size`) ط±ط§ ظ†ع¯ظ‡ ط¯ط§ط±غŒط¯ طھط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط¨ط¯ظˆظ† ط¯ط±ط®ظˆط§ط³طھ ط§ط¶ط§ظپظ‡ ط¨ط§ط² ط´ظˆط¯.


---

### 7.7 ع†ط§ظ¾ â€” ظ…ظˆطھظˆط± ع†ط§ظ¾ غŒع©ظ¾ط§ط±ع†ظ‡ (ط§ط¬ط¨ط§ط±غŒ ط¨ط±ط§غŒ ظ‡ط± ع†ط§ظ¾ ط¬ط¯غŒط¯)
**ظ‚ط§ط¹ط¯ظ‡:** ظ‡غŒع† `window.print()` ظ…ط³طھظ‚غŒظ… ظˆ ظ‡غŒع† ظ‚ط§ظ„ط¨ HTML ع†ط§ظ¾غŒ ظ…ط³طھظ‚ظ„ ظ†ط³ط§ط²غŒط¯. ظ‡ظ…ظ‡ظ” ع†ط§ظ¾â€Œظ‡ط§ ط§ط² ظ…ظˆطھظˆط± ع†ط§ظ¾ ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯.

**ط¨ع©â€Œط§ظ†ط¯** `core/print_engine/`:
- `components.py`: `esc` آ· `fa_digits` آ· `jalali` آ· `money` (ط¬ط¯ط§ع©ظ†ظ†ط¯ظ‡ظ” ظپط§ط±ط³غŒ + ظˆط§ط­ط¯) آ· `amount_words` آ· `barcode` (Code 39) آ· `field_grid([(label, value)])` آ· `data_table(columns, rows, {total_row})` آ· `signatures([...])` آ· `watermark` آ· `raw(html)` (ط¨ط±ط§غŒ ظ…ط­طھظˆط§غŒ ط§ط² ظ‚ط¨ظ„ ط§غŒظ…ظ†ط› ظ…ظ‚ط¯ط§ط± ظ…طھظ†غŒ ظ‡ظ…غŒط´ظ‡ escape ظ…غŒâ€Œط´ظˆط¯).
- `layout.py`: `render_document(document, options)` â†’ HTML ع©ط§ظ…ظ„ RTL ط¨ط§ `@page` (A4/A5/A3/LetterطŒ ط¹ظ…ظˆط¯غŒ/ط§ظپظ‚غŒ)طŒ ط³ط±طµظپط­ظ‡ظ” ط¨ط±ظ†ط¯ + badge + metaطŒ ط¨ط®ط´â€Œظ‡ط§طŒ ع©ط§ط¯ط± ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپطŒ ط¨ط§ط±ع©ط¯طŒ ط§ظ…ط¶ط§طŒ ظ¾ط§طµظپط­ظ‡ ط¨ط§ ط´ظ…ط§ط±ظ‡ظ” طµظپط­ظ‡ ظˆ طھط§ط±غŒط® ع†ط§ظ¾طŒ ظˆط§طھط±ظ…ط§ط±ع©.
- `registry.py`: `render(document, payload, options, request=request)` ط¨ط§ ط§ظ†ظˆط§ط¹ `letter` / `table` / `custom` / `payslip` / `voucher`ط› ظ…ط¬ظˆط² ط¨ط§ `can_print(user, module)` (ط³ظˆظ¾ط±غŒظˆط²ط± غŒط§ `view/export`ط› ع©ط§ط±ط¨ط± ط¨ط¯ظˆظ† ع©ط¯ ط±غŒط² ظ…ط³ط¯ظˆط¯ ظ†ظ…غŒâ€Œط´ظˆط¯).
- `builders/` (ط§ط³ظ†ط§ط¯ ط±ط³ظ…غŒ ط³ط±ظˆط±غŒطŒ ط§ط² غ²غ°غ²غ¶-غ±غ±-غ°غ¸):
  - `payslip.py` â€” `payslip_document(data)` ط®ط§ظ„طµ + `load_payslip`ط› ظپغŒط´ ط­ظ‚ظˆظ‚غŒ ط¨ط§ ظ…ط´ط®طµط§طھ ظ¾ط±ط³ظ†ظ„طŒ ط¯ظˆ ط¬ط¯ظˆظ„ ظ…ط²ط§غŒط§/ع©ط³ظˆط±ط§طھطŒ آ«ط¬ظ…ط¹آ» ظ‡ط± ط¯ظˆطŒ ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپطŒ ط¨ط§ط±ع©ط¯ ظˆ ط§ظ…ط¶ط§ (A5).
  - `voucher.py` â€” `voucher_document(data)` ط®ط§ظ„طµ + `load_voucher`ط› ظپغŒط´ ط¯ط±غŒط§ظپطھ / ط­ظˆط§ظ„ظ‡ ظ¾ط±ط¯ط§ط®طھ / ط±ط³غŒط¯ ط§ظ†طھظ‚ط§ظ„ / طھط±ط§ع©ظ†ط´ ط®ط²ط§ظ†ظ‡ ط§ط² ط¯ط§ط¯ظ‡ظ” `treasury.vouchers` (ط´ظ…ط§ط±ظ‡طŒ طھط§ط±غŒط® ط´ظ…ط³غŒطŒ ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپطŒ ط§ط·ظ„ط§ط¹ط§طھ ط§ط¨ط²ط§ط±طŒ ع©ط¯ ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒطŒ ظˆط§طھط±ظ…ط§ط±ع© آ«ظ¾غŒط´â€Œظ†ظˆغŒط³آ» ط¨ط±ط§غŒ ط§ط³ظ†ط§ط¯ ط«ط¨طھâ€Œظ†ط´ط¯ظ‡).
  - `treasury.vouchers._document_brief` ط­ط§ظ„ط§ `id` ظˆ `kind` ظ‡ظ… ظ…غŒâ€Œط¯ظ‡ط¯ طھط§ ط¯غŒط§ظ„ظˆع¯ ط³ظ†ط¯ ط¨طھظˆط§ظ†ط¯ ط³ظ†ط¯ ط§ط³طھط§ظ†ط¯ط§ط±ط¯ ظ…ظˆطھظˆط± ع†ط§ظ¾ ط±ط§ ط¯ط±ط®ظˆط§ط³طھ ع©ظ†ط¯.
- ط§ظ†ط¯ظ¾ظˆغŒظ†طھâ€Œظ‡ط§: `POST /api/print/preview/` `{document, payload, options}` â†’ `{html}` ظˆ `GET /api/print/options/`.
- طھط³طھ: `core/tests_print_engine.py` (غ²غ¶) + `core/tests_print_documents.py` (غ¸ طھط³طھ ظپغŒط´/ط³ظ†ط¯ ط®ط²ط§ظ†ظ‡) â€” ظ‡ظ…ظ‡ ط¨ط¯ظˆظ† ط¯غŒطھط§ط¨غŒط³.

**ظپط±ط§ظ†طھ** `core/print/`:
- `printEngine.js`: `printHtml(html)` (iframe ظ…ط®ظپغŒطŒ ط¨ط¯ظˆظ† ظ¾ط§ظ¾â€Œط¢ظ¾) آ· `printElement(target, {title, paper, orientation})` آ· `buildElementDocument`.
- `PrintPreviewDialog.jsx`: ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ iframe + ط¯ع©ظ…ظ‡ظ” ع†ط§ظ¾.
- `usePrintDocument.js`: `openDocument({document, payload, options})` / `printDocument` / `printCurrent` / `close`.
- `PrintButton.jsx`: `<PrintButton target="main" title="â€¦" />` ط¨ط±ط§غŒ ع¯ط²ط§ط±ط´â€Œظ‡ط§غŒ ع©ظ„ط§غŒظ†طھغŒ.

```jsx
// ط³ظ†ط¯ ط±ط³ظ…غŒ ط§ط² ط³ط±ظˆط± (ظ†ط§ظ…ظ‡/ظپغŒط´/ع¯ط²ط§ط±ط´ ط³ط±ظˆط±غŒ)
const print = usePrintDocument();
<Button onClick={() => print.openDocument({ document: 'letter', payload: { id } })}>ع†ط§ظ¾</Button>
<PrintPreviewDialog open={print.open} html={print.html} loading={print.loading}
  error={print.error} title={print.title} onClose={print.close} />

// ع¯ط²ط§ط±ط´ ع©ظ„ط§غŒظ†طھغŒ
<PrintButton target={tableRef} title="طھط±ط§ط²ظ†ط§ظ…ظ‡" orientation="landscape" />
```
ظ…ظ‡ط§ط¬ط±طھ ع†ط§ظ¾â€Œظ‡ط§غŒ ظ‚ط¯غŒظ…غŒ: `window.print()` â†’ `PrintButton`/`printElement` (ظپظˆط±غŒ) ظˆ ط¯ط± ع¯ط§ظ… ط¨ط¹ط¯ ط³ظ†ط¯ ط¨ظ‡ `registry` ط¨ع©â€Œط§ظ†ط¯ ظ…ظ†طھظ‚ظ„ ط´ظˆط¯.

**ظˆط¶ط¹غŒطھ ظ…ظ‡ط§ط¬ط±طھ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ظ‡غŒع† `window.print()` ط¯ط± ظپط±ط§ظ†طھ ط¨ط§ظ‚غŒ ظ†ظ…ط§ظ†ط¯ظ‡ ط§ط³طھ. `printElement` ظ‡ظ… ط³ظ„ع©طھظˆط±
(`'main'`)طŒ ظ‡ظ… ref ظˆ ظ‡ظ… ط¹ظ†طµط± ط±ط§ ظ…غŒâ€Œظ¾ط°غŒط±ط¯ ظˆ ط¯ط± ع†ط§ظ¾طŒ ط§ط¨ط²ط§ط±ظ‡ط§غŒ ط±ط§ط¨ط· (ط¯ع©ظ…ظ‡/طھط¨/ظپغŒظ„طھط±/طµظپط­ظ‡â€Œط¨ظ†ط¯غŒ) ط±ط§ ط­ط°ظپ ظ…غŒâ€Œع©ظ†ط¯:

| ظ…ط­ظ„ | ط±ظˆط´ ع†ط§ظ¾ |
|---|---|
| ظ†ط§ظ…ظ‡ظ” ظ…ع©ط§طھط¨ط§طھ (ع©ط´ظˆغŒ ط¬ط²ط¦غŒط§طھ) | ط³ظ†ط¯ ط³ط±ظˆط±غŒ `document:'letter'` + `PrintPreviewDialog` |
| غ±غ¸ طµظپط­ظ‡ظ” ع¯ط²ط§ط±ط´/ط¯ط§ط´ط¨ظˆط±ط¯ (ط­ط³ط§ط¨ط¯ط§ط±غŒطŒ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§طŒ طھظ‚ظˆغŒظ…طŒ ع†ط§ط±طھ ط³ط§ط²ظ…ط§ظ†غŒطŒ ظ¾ط±ظˆعکظ‡طŒ ط¨غŒظ…ظ‡طŒ ط¯ط§ط´ط¨ظˆط±ط¯) | `printElement('main', {title, orientation})` â€” ط¬ط¯ظˆظ„â€Œظ‡ط§غŒ ط¹ط±غŒط¶ `landscape` |
| `SalaryPayslip` | ط³ظ†ط¯ ط³ط±ظˆط±غŒ `document:'payslip'` + `PrintPreviewDialog` (A5)ط› fallback: `printElement(payslipRef)` |
| `LedgerDrillDialog` | `printElement(contentRef, {orientation:'landscape'})` |
| `TreasuryVoucherDialog` | ظ‚ط§ظ„ط¨ ط´ط±ع©طھ `printHtml(data.html)` â†’ ط³ظ†ط¯ ط§ط³طھط§ظ†ط¯ط§ط±ط¯ `document:'voucher'` â†’ `printElement(contentRef)` |
| `StatementEditorPage` | ط±ط³طھط± `html2canvas` + `printHtml` (غŒع© طµظپط­ظ‡ظ” A4طŒ ظ¾غŒع©ط³ظ„â€Œط¨ظ‡â€Œظ¾غŒع©ط³ظ„ ظ…ط«ظ„ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´) |

ظ‚ط§ط¹ط¯ظ‡ظ” ط¬ط¯غŒط¯: ظ‡ط± ط¯ع©ظ…ظ‡ظ” ع†ط§ظ¾ غŒط§ `PrintButton` ط§ط³طھ غŒط§ `printElement`/`printHtml`ط› ط§ظپط²ظˆط¯ظ† `window.print()` ظ…ظ…ظ†ظˆط¹.

## 8) Performance playbook â€” ع©ط§ط±ط§غŒغŒ

**ظ‚ظˆط§ط¹ط¯ ط³ط®طھâ€Œع¯غŒط±ط§ظ†ظ‡:**
1. ظ‡ط± طµظپط­ظ‡ظ” ظپظ‡ط±ط³طھ: **â‰¤ ~غ±غ° ع©ظˆط¦ط±غŒ** ط¨ط±ط§غŒ غ²غ° ط±ط¯غŒظپ (ع©ظ‡ غ´â€“غµ ع©ظˆط¦ط±غŒ ط¢ظ† `SET search_path` ظ…ط±ط¨ظˆط· ط¨ظ‡ djangoâ€‘tenants ط§ط³طھ).
2. ط³ط±غŒط§ظ„ط§غŒط²ط± ظپظ‡ط±ط³طھ ط³ط¨ع©: ط¨ط¯ظˆظ† `body`/ط¢ط±ط§غŒظ‡â€Œظ‡ط§غŒ `events`/`referrals`طŒ ظ¾غŒظˆط³طھ/ط¢ط®ط±غŒظ† ط§ط±ط¬ط§ط¹ ظپط´ط±ط¯ظ‡.
3. `select_related` ظپظ‚ط· ط¨ط±ط§غŒ FKظ‡ط§غŒ ظ„ط§ط²ظ…ط› `Prefetch(queryset=â€¦select_related(â€¦))` ط¨ط±ط§غŒ relatedظ‡ط§غŒ ظ„ط§ط²ظ….
4. ط¯ط± ط¬ط³طھâ€Œظˆط¬ظˆغŒ ع†ظ†ط¯â€‘ط¬ط¯ظˆظ„غŒ ط§ط² **`Q(id__in=Subquery)`** ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯طŒ ظ†ظ‡ join + `DISTINCT`.
5. `DISTINCT` ط±ط§ ظپظ‚ط· ظˆظ‚طھغŒ ظ„ط§ط²ظ… ط§ط³طھ (ظپغŒظ„طھط±ظ‡ط§غŒ M2M/join) ط§ط¹ظ…ط§ظ„ ع©ظ†غŒط¯.
6. ط³ظ…طھ ع©ظ„ط§غŒظ†طھ: `staleTime` ظپظ‡ط±ط³طھ غ³غ°sطŒ ط¯ط§ط´ط¨ظˆط±ط¯ غ¶غ°sطŒ `refetchOnWindowFocus: false` ط¨ط±ط§غŒ ط¯ط§ط´ط¨ظˆط±ط¯ط› `placeholderData` ط¨ط±ط§غŒ طµظپط­ظ‡â€Œط¨ظ†ط¯غŒ.
7. `page_size` ط±ط§ ط¨غŒâ€Œط¯ظ„غŒظ„ ط¨ط§ظ„ط§ ظ†ط¨ط±غŒط¯ (ط³ظ‚ظپ غ±غ°غ°غ°). ط¬ط³طھâ€Œظˆط¬ظˆ غ³غ°غ°â€“غ³غµغ°ms debounce ط¯ط§ط±ط¯.

**ط§ط¹ط¯ط§ط¯ ظ…ط±ط¬ط¹ (ط§ظ†ط¯ط§ط²ظ‡â€Œع¯غŒط±غŒâ€Œط´ط¯ظ‡ ط±ظˆغŒ ط³ط±ظˆط±طŒ غ¶ظ¬غ²غ´غ¶ ظ†ط§ظ…ظ‡):**
| Operation | Before | After |
|---|---|---|
| Letters list (20 rows) | 762 ms / 154 queries | **159 ms / 8 queries** |
| Search `ط¨ط§غŒع¯ط§ظ†غŒ` | 2,305 ms | **424 ms** |
| Filter â€œwithout attachmentâ€‌ | 514 ms | **68 ms** |
| Dashboard `/letters/stats/` | 157 ms / 18 q | **57â€“73 ms** |
| Main SELECT of the list | 495 ms | **93 ms** |

**ط±ظˆط´ ط§ظ†ط¯ط§ط²ظ‡â€Œع¯غŒط±غŒ:** `python manage.py dev_query_profile --schema kpsmi --params "page_size=20"`
(ط¯ط³طھظˆط± ظ…ط¯غŒط±غŒطھغŒ ط¢ظ…ط§ط¯ظ‡ ط¯ط± `core/management/commands/dev_query_profile.py`ط› ط®ط±ظˆط¬غŒ: ط²ظ…ط§ظ† ع©ظ„طŒ طھط¹ط¯ط§ط¯ ع©ظˆط¦ط±غŒطŒ ع©ظˆط¦ط±غŒâ€Œظ‡ط§غŒ ع©ظ†ط¯ ظˆ ع©ظˆط¦ط±غŒâ€Œظ‡ط§غŒ طھع©ط±ط§ط±غŒ ط¨ط§ WHERE â†’ N+1 ظپظˆط±ط§ظ‹ ط¯غŒط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯.)
ط¨ط±ط§غŒ ط§ظ†ط¯ظ¾ظˆغŒظ†طھâ€Œظ‡ط§غŒ ط¯غŒع¯ط±: `--action stats --path /api/letters/stats/ --params ""` غŒط§ `--viewset <dotted.path> --path <url>`.

**ع¯ط§ظ…â€Œظ‡ط§غŒ طھط´ط®غŒطµ ع©ظ†ط¯غŒ (ط¨ظ‡ طھط±طھغŒط¨):**
1. ظ¾ط±ظˆظپط§غŒظ„ ط¨ع¯غŒط±غŒط¯ط› ط§ع¯ط± ع©ظˆط¦ط±غŒ ط²غŒط§ط¯ ط§ط³طھ â†’ N+1 (ط³ط±غŒط§ظ„ط§غŒط²ط±/M2M).
2. ط§ع¯ط± غŒع© ع©ظˆط¦ط±غŒ ع©ظ†ط¯ ط§ط³طھ â†’ plan/joinط› `select_related` ط±ط§ ع©ظ… ع©ظ†غŒط¯ غŒط§ ط§غŒظ†ط¯ع©ط³ ط§ط¶ط§ظپظ‡ ع©ظ†غŒط¯.
3. ط§ع¯ط± ط¬ط³طھâ€Œظˆط¬ظˆ ع©ظ†ط¯ ط§ط³طھ â†’ ظپغŒظ„ط¯ظ‡ط§غŒ `body` ظˆ `icontains` ط±ط§ ظ…ط­ط¯ظˆط¯ ع©ظ†غŒط¯ غŒط§ `pg_trgm` (ط¨ع©â€Œظ„ط§ع¯).
4. ط§ع¯ط± ظپط±ط§ظ†طھ ع©ظ†ط¯ ط§ط³طھ â†’ ط­ط¬ظ… payload (`payload KB` ط¯ط± ظ¾ط±ظˆظپط§غŒظ„)طŒ ط³ظ¾ط³ `staleTime`/`placeholderData`.

---

## 9) Server & deployment â€” ط³ط±ظˆط± ظˆ ط§ط³طھظ‚ط±ط§ط±

### ظ…ط´ط®طµط§طھ ط³ط±ظˆط±
| Item | Value |
|---|---|
| Host / user | `hradmin@192.168.1.63` (SSH key ط¯ط§ط±ط¯ط› `ssh -o BatchMode=yes` ط¨ط¯ظˆظ† ط±ظ…ط² ع©ط§ط± ظ…غŒâ€Œع©ظ†ط¯) |
| App dir | `/opt/hrms/hrms_project` آ· venv `/opt/hrms/venv` آ· app user `hrms` |
| Env | `/opt/hrms/hrms_project/.env` (ع©ظ„غŒط¯ظ‡ط§ ط±ط§ ظ‡ظ…غŒظ†â€Œط¬ط§ ط¨ط®ظˆط§ظ†غŒط¯: `SECRET_KEY`, `ALLOWED_HOSTS`, `DB_*`, `MEDIA_ROOT`, `STATIC_ROOT`, redis) |
| Services | `gunicorn` + `nginx` (`systemctl is-active gunicorn nginx`) |
| Frontend | `/opt/hrms/frontend/build` (+ assets ط¯ط± `/var/www/hrms/static/`) |
| Media | `/var/www/hrms/media` â€” nginx ظ…ط³طھظ‚غŒظ… ط³ط±ظˆ ظ…غŒâ€Œع©ظ†ط¯ (`/media/...`, PDF ط¨ظ‡â€Œطµظˆط±طھ inline) |
| DB | PostgreSQL `hrms_db` / `hrms_user@localhost` آ· tenant schema `kpsmi` |
| Static/Front | index.html ط§ط² `/assets/static/js/main.<hash>.js` ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ط¯ |

### ط³ظ‡ ط³ظ†ط§ط±غŒظˆغŒ ط§ط³طھظ‚ط±ط§ط±
```powershell
# 1) ظپظ‚ط· ظپط±ط§ظ†طھâ€Œط§ظ†ط¯ (ط¨ط¯ظˆظ† sudoط› غŒع© ط§طھطµط§ظ„ SSH)
.\deploy-frontend.ps1                 # ط¨غŒظ„ط¯ + ط¢ظ¾ظ„ظˆط¯ + ط¬ط§غŒâ€Œع¯ط°ط§ط±غŒ + طھط£غŒغŒط¯ HTTP
.\deploy-frontend.ps1 -NoBuild        # ظپظ‚ط· ط¢ظ¾ظ„ظˆط¯ ط¨غŒظ„ط¯ ظ…ظˆط¬ظˆط¯
.\deploy-frontend.ps1 -CheckOnly      # ظپظ‚ط· ط¨ط±ط±ط³غŒ ط¯ط³طھط±ط³غŒ

# 2) ظپظ‚ط· ط¨ع©â€Œط§ظ†ط¯ (ظپط§غŒظ„â€Œظ‡ط§غŒ طھط­طھ Git + migrate + restart)
.\deploy-backend.ps1 -Migrate
.\deploy-backend.ps1 -CheckOnly

# 3) ظ‡ط± ط¯ظˆ ط¨ط§ ظ‡ظ…
.\update-server.ps1                   # -NoMigrate -NoBuild -SkipBackend -SkipFrontend
```
**طھط£غŒغŒط¯ ط¨ط¹ط¯ ط§ط² ط§ط³طھظ‚ط±ط§ط±:**
```powershell
curl.exe -s -o NUL -w "index=%{http_code}\n" http://192.168.1.63/
curl.exe -s -o NUL -w "bundle=%{http_code}\n" http://192.168.1.63/assets/static/js/main.<hash>.js
# ظ„ط§ع¯ ط¨ع©â€Œط§ظ†ط¯:
ssh -o BatchMode=yes hradmin@192.168.1.63 'journalctl -u gunicorn -n 50 --no-pager'
```

### âڑ ï¸ڈ ط¯ط§ظ…â€Œظ‡ط§غŒ ظ…ط­غŒط· (ط®غŒظ„غŒ ظ…ظ‡ظ…)
1. **`powershell -File script.ps1` ط¯ط± ط§غŒظ† ظ…ط§ط´غŒظ† ط¨غŒâ€Œطµط¯ط§ ط§ط¬ط±ط§ ظ…غŒâ€Œط´ظˆط¯** (ط®ط±ظˆط¬غŒ طµظپط±طŒ ط¨ط¯ظˆظ† ط§ط«ط±). ط§ط² ط§غŒظ† ط´ع©ظ„ ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯:
   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\HRMS\deploy-frontend.ps1'"
   ```
2. **ط§ط¬ط±ط§غŒ ط·ظˆظ„ط§ظ†غŒ (ط¨غŒظ„ط¯/طھط³طھ) ط±ط§ detached ط§ط¬ط±ط§ ع©ظ†غŒط¯**ط› `Start-Process powershell` ظ…ظ…ع©ظ† ط§ط³طھ ط¨ط§ ظ¾ط§غŒط§ظ† ط¯ط³طھظˆط± ع©ط´طھظ‡ ط´ظˆط¯. ط§ظ„ع¯ظˆغŒ ظ…ط·ظ…ط¦ظ†: غŒع© ظ„ط§ظ†ع†ط± ظ¾ط§غŒطھظˆظ†غŒ ع©ظ‡ `subprocess.Popen` ظ…غŒâ€Œع©ظ†ط¯ ظˆ ظ„ط§ع¯ ظ…غŒâ€Œظ†ظˆغŒط³ط¯ (ظ†ظ…ظˆظ†ظ‡: ظ‡ظ…ط§ظ† ط±ظˆط´غŒ ع©ظ‡ ط¯ط± ط§ط³طھظ‚ط±ط§ط±ظ‡ط§ ط§ط³طھظپط§ط¯ظ‡ ط´ط¯).
3. **sudo ط±ظˆغŒ ط³ط±ظˆط±:** `printf '%s\n' '<SUDO_PASSWORD>' | sudo -S bash /tmp/script.sh` â€” ط±ظ…ط² ط±ط§ ط§ط² **ع©ط§ط±ط¨ط±** ط¨ظ¾ط±ط³غŒط¯ ظˆ ظ‡ط±ع¯ط² ع©ط§ظ…غŒطھ ظ†ع©ظ†غŒط¯.
4. `/tmp` ط³ط±ظˆط± **tmpfs (غ·.غ¶GB)** ط§ط³طھط› ظپط§غŒظ„ ط¨ط²ط±ع¯ ط±ط§ ط¯ط± `/var/tmp` غŒط§ `/opt/hrms/import` ط¨ع¯ط°ط§ط±غŒط¯.
5. ظپط§غŒظ„â€Œظ‡ط§غŒ ع©ظ¾غŒâ€Œط´ط¯ظ‡ ط¯ط± `correspondences/` ظˆ `core/` ط±ط§ ط·ط¨ظ‚ ط§ظ„ع¯ظˆ `cp /tmp/x.py â€¦; chown hrms:hrms â€¦; systemctl restart gunicorn` ط¬ط§غŒâ€Œع¯ط°ط§ط±غŒ ع©ظ†غŒط¯ ظˆ **ظ‡ظ…غŒط´ظ‡ ظ‚ط¨ظ„ط´ backup** ط¨ع¯غŒط±غŒط¯.
6. ط¨ط¹ط¯ ط§ط² ظ‡ط± طھط؛غŒغŒط± ط¨ع©â€Œط§ظ†ط¯طŒ `manage.py check` ط±ظˆغŒ ط³ط±ظˆط± (ط¨ط§ `.env` sourced) ظˆ ط³ظ¾ط³ restart.
7. **طµظپط­ظ‡ظ” ط³ظپغŒط¯ = ط¨غŒظ„ط¯ ط¨ط¯ظˆظ† `PUBLIC_URL=/assets`.**
   - ط­ط§ظ„طھ غ±: ط¨غŒظ„ط¯ ظ…ط­ظ„غŒ (`react-scripts build` ط¨ط¯ظˆظ† env) ظˆ ط¨ط¹ط¯ `deploy-frontend.ps1 -NoBuild` â‡’ `index.html` ط¨ظ‡
     `/static/js/...` ط§ط´ط§ط±ظ‡ ظ…غŒâ€Œع©ظ†ط¯ (404) ظˆ ع©ظ„ ط¨ط±ظ†ط§ظ…ظ‡ ط³ظپغŒط¯ ظ…غŒâ€Œط´ظˆط¯.
   - ط­ط§ظ„طھ غ² (غ²غ°غ²غ¶-غ±غ±-غ°غ¸ ط¨ط±ط§غŒ ظ…ط§ ط±ط® ط¯ط§ط¯): **`PUBLIC_URL` ط±ط§ ط¨ط§ `cmd.exe` ط³طھ ظ†ع©ظ†غŒط¯.** ط¯ط³طھظˆط±
     `cmd /c "cd /d C:\HRMS\frontend && set PUBLIC_URL=/assets && npm run build"` ظ…ظ‚ط¯ط§ط± ط±ط§ ط¨ط§ **ظپط§طµظ„ظ‡ظ” ط§ظ†طھظ‡ط§غŒغŒ**
     ط°ط®غŒط±ظ‡ ظ…غŒâ€Œع©ظ†ط¯ (`'/assets '`) ظˆ ط®ط±ظˆط¬غŒ ظ…غŒâ€Œط´ظˆط¯
     `<script src="/assets /static/js/main.<hash>.js">` â€” غŒع© ظپط§طµظ„ظ‡ظ” ط§ط¶ط§ظپظ‡طŒ URL ظ†ط§ظ…ط¹طھط¨ط±طŒ غ´غ°غ´ ظˆ **طµظپط­ظ‡ظ” ط³ظپغŒط¯**طŒ
     ط¯ط± ط­ط§ظ„غŒ ع©ظ‡ `curl` ط®ظˆط¯ظگ ط¨ط§ظ†ط¯ظ„ ط±ط§ غ²غ°غ° ظ†ط´ط§ظ† ظ…غŒâ€Œط¯ظ‡ط¯ (ع†ظˆظ† ظپط§غŒظ„ ظ‡ط³طھطŒ ط¢ط¯ط±ط³ ط؛ظ„ط· ط§ط³طھ).
   - ظ‡ظ…غŒط´ظ‡ ط¨غŒظ„ط¯ ط±ط§ ط¨ط§ ط®ظˆط¯ ط§ط³ع©ط±غŒظ¾طھ (`deploy-frontend.ps1` ط¨ط¯ظˆظ† `-NoBuild`) ط§ظ†ط¬ط§ظ… ط¯ظ‡غŒط¯ ظˆ **ظ‚ط¨ظ„ ط§ط² ط¢ظ¾ظ„ظˆط¯** ط¨غŒظ„ط¯ ط±ط§ ع†ع© ع©ظ†غŒط¯:
     ```powershell
     Select-String -Path C:\HRMS\frontend\build\index.html -Pattern '/assets /'   # ط¨ط§غŒط¯ ط®ط±ظˆط¬غŒ ط®ط§ظ„غŒ ط¨ط¯ظ‡ط¯
     Select-String -Path C:\HRMS\frontend\build\index.html -Pattern 'src="/assets/static/js/main\.'
     ```
     طھط£غŒغŒط¯ ظ†ظ‡ط§غŒغŒ ط¨ط¹ط¯ ط§ط² ط§ط³طھظ‚ط±ط§ط±: `curl /` ط¨ط§غŒط¯ `src="/assets/static/js/main.<hash>.js"` (ط¨ط¯ظˆظ† ظپط§طµظ„ظ‡) ط¨ط¯ظ‡ط¯ ظˆ
     ظ‡ظ…ط§ظ† ظ…ط³غŒط± + ظپط§غŒظ„ CSS + غŒع© chunk (`/assets/static/js/949.<hash>.chunk.js`) ظ‡ط± ط³ظ‡ غ²غ°غ° ط¨ط§ط´ظ†ط¯.
8. **ط§ط³ع©ط±غŒظ¾طھâ€Œظ‡ط§ ط±ط§ ط¨ط§ `-Command` طµط¯ط§ ط¨ط²ظ†غŒط¯طŒ ظ†ظ‡ `-File`:** `powershell -File deploy-backend.ps1` ط¨غŒâ€Œطµط¯ط§ ظˆ ط¨غŒâ€Œط§ط«ط± ط§ط³طھ.
   ط´ع©ظ„ ط¯ط±ط³طھ: `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\HRMS\deploy-backend.ps1'"`.
   `deploy-backend.ps1` ظˆط³ط· ع©ط§ط± ط±ظ…ط² sudo ظ…غŒâ€Œظ¾ط±ط³ط¯ ظˆ ط¯ط± ط§ط¬ط±ط§غŒ ط؛غŒط±طھط¹ط§ظ…ظ„غŒ (CI/Start-Process) ظ‡ط§ظ„طھغŒ ظ…غŒâ€Œع©ظ†ط¯ط›
   ط¯ط± ع†ظ†غŒظ† ط­ط§ظ„طھغŒ ظپط§غŒظ„â€Œظ‡ط§غŒ طھط؛غŒغŒط±â€ŒغŒط§ظپطھظ‡ ط±ط§ ط¨ط§ `scp` ط¨ظ‡ `/tmp/...` ط¨ظپط±ط³طھغŒط¯طŒ ط³ظ¾ط³ ط¨ط§ غŒع© ط§ط³ع©ط±غŒظ¾طھ bash ط±ظˆغŒ ط³ط±ظˆط±
   (`sudo bash /tmp/apply.sh` ط¨ط§ `cp` + `chown hrms:hrms` + `systemctl restart gunicorn`) ط¬ط§غŒâ€Œع¯ط°ط§ط±غŒ ع©ظ†غŒط¯.
   ع©ظˆط¦ط±غŒ/طھط³طھ ط³ظ…طھ ط³ط±ظˆط±: `sudo -u hrms bash -c 'set -a; . /opt/hrms/hrms_project/.env; set +a; cd /opt/hrms/hrms_project; PYTHONPATH=/opt/hrms/hrms_project /opt/hrms/venv/bin/python <script>'`
   (ط¨ط¯ظˆظ† `PYTHONPATH` ظ¾غŒط§ظ… `No module named 'hrms_project'` ظ…غŒâ€Œع¯غŒط±غŒط¯).


---

## 10) Testing & verification â€” طھط³طھ ظˆ ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ

### Backend (PostgreSQL ظ…ط­ظ„غŒ ظ…ط¹ظ…ظˆظ„ط§ظ‹ ط®ط§ظ…ظˆط´ ط§ط³طھ â†’ طھط³طھâ€Œظ‡ط§ ط¨ط§غŒط¯ DB-free ط¨ط§ط´ظ†ط¯)
```powershell
cd C:\HRMS\hrms_project
$env:SECRET_KEY='dev-only-secret-key-for-checks'; $env:PYTHONIOENCODING='utf-8'
C:\HRMS\venv\Scripts\python.exe manage.py check --settings=hrms_project.settings.development
C:\HRMS\venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=hrms_project.settings.development
C:\HRMS\venv\Scripts\python.exe manage.py test correspondences documents core --settings=hrms_project.settings.development
```
- ط§ظ„ع¯ظˆغŒ طھط³طھ: `SimpleTestCase` + `SimpleNamespace`/`unittest.mock.patch` (ط¨ط¯ظˆظ† DB). ظ†ظ…ظˆظ†ظ‡â€Œظ‡ط§: `correspondences/tests.py`, `documents/tests.py`, `core/tests_module_search.py`.
- ط§ع¯ط± ظˆط§ظ‚ط¹ط§ظ‹ DB ظ„ط§ط²ظ… ط´ط¯ (queryset/filter/tenant)طŒ `TestCase` ط¨ظ†ظˆغŒط³غŒط¯ ظˆ ط¨ط¯ط§ظ†غŒط¯ PostgreSQL ظ…ط­ظ„غŒ ظ†غŒط³طھط› غŒط§ ط±ظˆغŒ ط³ط±ظˆط± ط¨ط§ `schema_context` ط¨ط³ظ†ط¬غŒط¯.

### Frontend (CRA/Jest smoke tests)
```powershell
cd C:\HRMS\frontend
$env:CI='true'
npx react-scripts test --watchAll=false --testPathPattern=correspondenceSmoke
```
ط§ظ„ع¯ظˆغŒ طھط³طھ (`frontend/src/__tests__/`):
```jsx
jest.mock('../core/api/axiosConfig', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../core/context/ModulePaletteContext', () => ({ useModulePalette: () => ({ getPalette: () => null, typography: {} }) }));
const renderPage = async (element, entry = '/x') => { /* QueryClientProvider(no retry) + MemoryRouter + act + wait */ };
```
- ظ‡ط± ع©ط§ظ…ظ¾ظˆظ†ظ†طھغŒ ع©ظ‡ `useQuery` ط¯ط§ط±ط¯ ط¨ط§غŒط¯ ط¯ط§ط®ظ„ `QueryClientProvider` ط±ظ†ط¯ط± ط´ظˆط¯.
- **ع©ظ„ ط³ظˆط¦غŒطھ ط²غŒط± ط¨ط§ط± ط³ظ†ع¯غŒظ† flaky ظ…غŒâ€Œط´ظˆط¯** (timeout غµ ط«ط§ظ†غŒظ‡)ط› ط³ظˆط¦غŒطھâ€Œظ‡ط§غŒ ط´ع©ط³طھâ€Œط®ظˆط±ط¯ظ‡ ط±ط§ طھع©â€Œطھع© ط¯ظˆط¨ط§ط±ظ‡ ط§ط¬ط±ط§ ع©ظ†غŒط¯ (ط§ظ„ع¯ظˆغŒ ط§ظ…ط±ظˆط²: غµغ¸ ط³ظˆط¦غŒطھ / غ²غ°غ· طھط³طھ ط³ط¨ط²).

### Definition of Done
1. `manage.py check` ظ¾ط§ع©ط› ظ…ط§غŒع¯ط±غŒط´ظ† ظ„ط§ط²ظ… ط³ط§ط®طھظ‡ ظˆ ط±ظˆغŒ ط³ط±ظˆط± ط§ط¹ظ…ط§ظ„ ط´ط¯ظ‡.
2. طھط³طھâ€Œظ‡ط§غŒ ظ…ط±ط¨ظˆط·ظ‡ (ط¨ع© + ظپط±ط§ظ†طھ) ط³ط¨ط².
3. UI ط§ط² طھظˆع©ظ†â€Œظ‡ط§غŒ ط§ط³طھظˆط¯غŒظˆ طھظ… ظ¾غŒط±ظˆغŒ ظ…غŒâ€Œع©ظ†ط¯ (ظ‡غŒع† ط±ظ†ع¯ ظ‡ط§ط±ط¯ع©ط¯ ط¬ط¯غŒط¯).
4. ط§ع¯ط± ظپظ‡ط±ط³طھ/ط¬ط³طھâ€Œظˆط¬ظˆ طھط؛غŒغŒط± ع©ط±ط¯ظ‡: ظ¾ط±ظˆظپط§غŒظ„ ع©ط§ط±ط§غŒغŒ ع¯ط±ظپطھظ‡ ظˆ ط§ط¹ط¯ط§ط¯ ط¯ط± طھظˆط¶غŒط­ ع©ط§ظ…غŒطھ ط¢ظ…ط¯ظ‡.
5. ط§ط³طھظ‚ط±ط§ط± ط§ظ†ط¬ط§ظ… ظˆ **ط²ظ†ط¯ظ‡ طھط£غŒغŒط¯** ط´ط¯ظ‡ (hash ط¨ط§ظ†ط¯ظ„ + HTTP 200 + ظ„ط§ع¯).
6. `git status` طھظ…غŒط²ط› ظپط§غŒظ„ ظ…ظˆظ‚طھ `_*` ط¨ط§ظ‚غŒ ظ†ظ…ط§ظ†ط¯ظ‡.

---

## 11) Lessons learned â€” ط¯ط±ط³â€Œظ‡ط§غŒ ط«ط¨طھâ€Œط´ط¯ظ‡

1. **`relation "â€¦" does not exist`** غŒط¹ظ†غŒ ظ…ط¯ظ„ tenant ط¯ط± public ع©ظˆط¦ط±غŒ ط´ط¯ظ‡ط› ط§ط² `schema_context` ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯ (`Company` ط¯ط± public ط§ط³طھ).
2. **N+1 ط§ط² M2M**: ط®ظˆط§ظ†ط¯ظ† `obj.to_employees.all()` ط¯ط± serializer ظ‡ط± ط±ط¯غŒظپ غŒع© ع©ظˆط¦ط±غŒ ظ…غŒâ€Œط²ظ†ط¯ط› ط¨ط±ع†ط³ط¨ ط±ط§ ط§ط² FKظ‡ط§غŒ `select_related`ط´ط¯ظ‡ ط¨ط³ط§ط²غŒط¯.
3. **`select_related` ط²غŒط§ط¯ ظ‡ظ… ع©ظ†ط¯ ط§ط³طھ**: غ±غ´ joinطŒ ع©ظˆط¦ط±غŒ ط§طµظ„غŒ ط±ط§ ط§ط² غ¹غ³ms ط¨ظ‡ غ´غ¹غµms ط¨ط±ط¯ط› ظپظ‚ط· FKظ‡ط§غŒ ظ…طµط±ظپغŒ.
4. **ط¬ط³طھâ€Œظˆط¬ظˆغŒ join+distinct** ط±ظˆغŒ غ¶k ط±ع©ظˆط±ط¯ غ².غ³s ط¨ظˆط¯ط› ط¨ط§ `Q(id__in=Subquery)` ط¨ظ‡ غ°.غ´s ط±ط³غŒط¯.
5. **ط³ظ‚ظپ `sync_archive_files`** (غµظ¬غ°غ°غ°) ظ…ط§ظ†ط¹ ع©ط§ظ…ظ„â€Œط´ط¯ظ† ط§غŒظ†ط¯ع©ط³ ظ…ط§عکظˆظ„â€Œظ‡ط§غŒ ظ¾ط±ط­ط¬ظ… ظ…غŒâ€Œط´ط¯ط› غµغ°ظ¬غ°غ°غ° ط´ط¯.
6. **ظپط§غŒظ„â€Œظ‡ط§ ط¨ط§غŒط¯ ط¯ط§ط®ظ„ ط¨ط§غŒع¯ط§ظ†غŒ ط¨ط§ط´ظ†ط¯** (`archive/company_<id>/<root>/â€¦`) ظˆع¯ط±ظ†ظ‡ ط­ط¬ظ…/ط¢ظ…ط§ط± غ°ط› ط¯ط³طھظˆط± `relocate_letter_attachments --schema kpsmi --sync-dms`.
7. **seed ظ¾ط±ظˆظپط§غŒظ„ ط¨ط§غŒع¯ط§ظ†غŒ** ط¨ط§غŒط¯ `get_or_create` ط¨ط§ط´ط¯ طھط§ طھظ†ط¸غŒظ…ط§طھ ع©ط§ط±ط¨ط± ط¨ط§ط²ظ†ظˆغŒط³غŒ ظ†ط´ظˆط¯.
8. طھط³طھâ€Œظ‡ط§غŒ ط¨ع©â€Œط§ظ†ط¯ ط¨ط¯ظˆظ† `SECRET_KEY` ط¨ط§ظ„ط§ ظ†ظ…غŒâ€Œط¢غŒظ†ط¯ط› env ط¨ط¯ظ‡غŒط¯.
9. **CRA**: `PUBLIC_URL=/assets`ط› ط§ع¯ط± ط±ط´طھظ‡ظ” ط¬ط¯غŒط¯ ط¯ط± ط¨ط§ظ†ط¯ظ„ ط²ظ†ط¯ظ‡ ظ†ط¨ظˆط¯طŒ ط¨غŒظ„ط¯/ط¢ظ¾ظ„ظˆط¯ ط§ظ†ط¬ط§ظ… ظ†ط´ط¯ظ‡ غŒط§ ع©ط´ ظ…ط±ظˆط±ع¯ط± ط§ط³طھ.
10. **`git add -A`** ظپط§غŒظ„ ظ…ظˆظ‚طھ ط±ط§ ظ…غŒâ€Œط¢ظˆط±ط¯ط› ظ‚ط¨ظ„ ط§ط² ع©ط§ظ…غŒطھ `git status` ط¨ط¨غŒظ†غŒط¯.
11. **`PageHeader.icon` ط¹ظ†طµط± â‰  `SectionCard.icon` ع©ط§ظ…ظ¾ظˆظ†ظ†طھ** â†’ React #130.
12. ط¬ط§ط¨ظ‡â€Œط¬ط§غŒغŒ ظپط§غŒظ„ ط±ط³ط§ظ†ظ‡ ط¨ط¯ظˆظ† ط¨ظ‡â€Œط±ظˆط²ط±ط³ط§ظ†غŒ `file.name` ط¯ط± DB = ظ„غŒظ†ع© غ´غ°غ´.
13. **ط´ع©ط³طھظ† `views.py` ط¨ظ‡ ط¨ط³طھظ‡ظ” `views/` ظ…غŒâ€Œطھظˆط§ظ†ط¯ import ط¬ط§ط§ظپطھط§ط¯ظ‡ ط¨ط³ط§ط²ط¯** (`NameError` ظپظ‚ط· ط¯ط± ط²ظ…ط§ظ† ط§ط¬ط±ط§غŒ
   ط¢ظ† ظ…طھط¯ ط¯غŒط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯ط› ظ…ط«ظ„ط§ظ‹ `Organization` ط¯ط± `views/aliases.py` â†’ ط§ظ†ط¯ظ¾ظˆغŒظ†طھ `unmapped/` ط¨ط§ 500 ظˆ
   آ«ظ†ع¯ط§ط´طھâ€Œظ†ط´ط¯ظ‡â€Œظ‡ط§آ» ط®ط§ظ„غŒ). ط¨ط±ط§غŒ ظ‡ظ…غŒظ† طھط³طھ `correspondences/tests_view_names.py` ظ‡ط± ظ†ط§ظ… ع©ظ„ط§ط³â€Œظ…ط§ظ†ظ†ط¯ظگ
   طھط¹ط±غŒظپâ€Œظ†ط´ط¯ظ‡ ط¯ط± ط¨ط³طھظ‡ظ” views ط±ط§ ط¨ط§ `ast` ظ…غŒâ€Œع¯غŒط±ط¯ط› ط¨ط¹ط¯ ط§ط² ظ‡ط± split ط§غŒظ† طھط³طھ ط±ط§ ط§ط¬ط±ط§ ع©ظ†غŒط¯.
14. **`cmd.exe set VAR=value && next` ظپط§طµظ„ظ‡ظ” ط§ظ†طھظ‡ط§غŒغŒ ط±ط§ ظˆط§ط±ط¯ ظ…ظ‚ط¯ط§ط± ظ…غŒâ€Œع©ظ†ط¯** â†’ `PUBLIC_URL='/assets '` â†’
   `index.html` ط¨ط§ `<script src="/assets /static/js/main.<hash>.js">` â†’ غ´غ°غ´ ظˆ **طµظپط­ظ‡ظ” ط³ظپغŒط¯**طŒ ط¯ط± ط­ط§ظ„غŒ ع©ظ‡
   `curl` ط¨ط§ظ†ط¯ظ„ ط±ط§ غ²غ°غ° ظ…غŒâ€Œط¯ظ‡ط¯. ط¨غŒظ„ط¯ ط±ط§ ظپظ‚ط· ط¨ط§ `deploy-frontend.ps1` (ع©ظ‡ `$env:PUBLIC_URL = '/assets'` ط±ط§ ط¯ط±
   PowerShell ط³طھ ظ…غŒâ€Œع©ظ†ط¯) ط¨ط²ظ†غŒط¯ ظˆ ظ‡ظ…غŒط´ظ‡ `Select-String -Path build\index.html -Pattern '/assets /'` ط±ط§ ع†ع© ع©ظ†غŒط¯.
15. **ظ‡ظˆع©â€Œظ‡ط§غŒ ظ†ظˆط´طھظ† ط±ط§ ط¨ط§ ظ†ط§ظ… `refetch`ظ‡ط§غŒ ظˆط§ظ‚ط¹غŒ طµط¯ط§ ط¨ط²ظ†غŒط¯**: ط¯ط± طµظپط­ظ‡ظ” ظ…ع©ط§طھط¨ط§طھطŒ ط±غŒâ€Œظپع†â€Œظ‡ط§ `refetchStats` ظˆ
   `refetchReferrals` ظ‡ط³طھظ†ط¯ (ظ†ظ‡ `refreshâ€¦`)ط› ظˆ ظ‡ط± stateط§غŒ ع©ظ‡ ظ‡ظˆع© ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط§ظ†ط¯ (ظ…ط«ظ„ `editRowId`) ط¨ط§غŒط¯ ط¯ط± طµظپط­ظ‡
   destructure ط´ظˆط¯ ظˆع¯ط±ظ†ظ‡ `ReferenceError` ظپظ‚ط· ط¯ط± ط±ظ†ط¯ط± ط§ظˆظ„ ط¯غŒط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯ (طھط³طھ smoke ط³ط±غŒط¹ ظ…غŒâ€Œع¯غŒط±ط¯).
16. **ط§ط³ع©ط±غŒظ¾طھ bash ع©ظ‡ ط¨ط±ط§غŒ ط³ط±ظˆط± ظ…غŒâ€Œط³ط§ط²غŒط¯ ط¨ط§غŒط¯ LF ط¨ط§ط´ط¯.** ظپط§غŒظ„غŒ ع©ظ‡ ط§ط¯غŒطھظˆط± ظˆغŒظ†ط¯ظˆط² ظ…غŒâ€Œط³ط§ط²ط¯ CRLF ط§ط³طھ ظˆ
   `sudo bash /var/tmp/x.sh` ط¨ط§ `$'\r': command not found` غŒط§ ط§ط¬ط±ط§غŒ ظ†ط§ظ‚طµ ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط¯ط› ط§ظˆظ„
   `sed -i 's/\r$//' /var/tmp/x.sh` ط¨ط²ظ†غŒط¯ (غŒط§ ط¯ط³طھظˆط± ط±ط§ طھع©â€Œط®ط·غŒ ط¨ط§ `;` ط¨ظپط±ط³طھغŒط¯).
   ظ‡ظ…ع†ظ†غŒظ† `deploy-frontend.ps1` ط¯ط± ط§ط¬ط±ط§غŒ detached ظ…غŒâ€Œطھظˆط§ظ†ط¯ ط¯ط± ظ…ط±ط­ظ„ظ‡ظ” غ³/غ´ ط±ظˆغŒ SSH ظ…ط¹ظ„ظ‚ ط¨ظ…ط§ظ†ط¯ط› ط¯ط± ط¢ظ† ط­ط§ظ„طھ
   `tar -czf` + `scp` ط¨ظپط±ط³طھغŒط¯ ظˆ ط¬ط§غŒâ€Œع¯ط°ط§ط±غŒ ط§طھظ…غŒع© ط±ط§ ط¨ط§ غŒع© ط¯ط³طھظˆط± طھع©â€Œط®ط·غŒ ssh ط§ظ†ط¬ط§ظ… ط¯ظ‡غŒط¯
   (`mv build build.old.$(date +%s)` â†’ `mv $TMP/build build` â†’ `chmod -R u=rwX,g=rX,o=rX`).

---

## 12) Current snapshot â€” ظˆط¶ط¹غŒطھ ظپط¹ظ„غŒ

- **Last commit:** `feat(auth): redesign login page with branding background and centered card`
- **Live:** frontend `main.d5b27b13.js` (HTTP 200طŒ ط³ط±ظˆ ط§ط² `/assets/static/js`) آ· backend deployed (ظ…ظˆطھظˆط± ع†ط§ظ¾ `core/print_engine/` + `core.urls` ع†ط§ظ¾ + ظ…ط§غŒع¯ط±غŒط´ظ† `procurement.0004` + `GET /api/procurement/dashboard/` + `GET /api/procurement/suppliers/{id}/profile/` + `GET /api/external-contracts/completeness/` + ع©ط§طھط§ظ„ظˆع¯ ظ…ط¬ظˆط² غ²غ¶غµ ظ…ظ†ظˆ/غ±غ°غ¹غ· ع©ط¯)طŒ gunicorn/celery/nginx active.
- **ع©ط§ط±ط§غŒغŒ ظ…ط§عکظˆظ„ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط¯ط§ط´ط¨ظˆط±ط¯/ظپط§ع©طھظˆط±ظ‡ط§/طµظˆط±طھâ€Œظˆط¶ط¹غŒطھâ€Œظ‡ط§/ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§/ط§ظ„ط­ط§ظ‚غŒظ‡â€Œظ‡ط§/طھط¶ط§ظ…غŒظ† ظˆ طھط­ظ„غŒظ„ ظ…ط§ظ„غŒ
  ع©ظ†ط¯ ط¨ظˆط¯ظ†ط¯ (ط§ظ†ط¯ط§ط²ظ‡â€Œع¯غŒط±غŒ ط¨ط§ `dev_query_profile` ط±ظˆغŒ `kpsmi`):
  | ط§ظ†ط¯ظ¾ظˆغŒظ†طھ | ظ‚ط¨ظ„ | ط¨ط¹ط¯ |
  |---|---|---|
  | `/external-contracts/?page_size=500` | 2702ms / 4236q / 1944KB | **302ms / 60q / 363KB** |
  | `/external-contracts/?page_size=20` | 169ms / 130q | **76ms / 30q** |
  | `/external-contracts/stats/` | 252ms / 46q | **18ms / 14q** |
  | `/contract-addendums/?page_size=500` | 430ms / 468q | **102ms / 8q** |
  | `/external-contracts/guarantees-overview/` | 818ms / 1669q | **78ms / 6q** |
  - `guarantees_overview` ط¯غŒع¯ط± `.iterator()` ظ†ط¯ط§ط±ط¯ (iterator ظ¾غŒط´â€Œط¨ط§ط±ع¯ط°ط§ط±غŒ ط±ط§ ظ†ط§ط¯غŒط¯ظ‡ ظ…غŒâ€Œع¯ط±ظپطھ ظˆ ط¨ط±ط§غŒ ظ‡ط±
    ظ‚ط±ط§ط±ط¯ط§ط¯ طھط¶ط§ظ…غŒظ†/ط§ظ„ط­ط§ظ‚غŒظ‡â€Œظ‡ط§/ط·ط±ظپ ط±ط§ ط¬ط¯ط§ ظ…غŒâ€Œط®ظˆط§ظ†ط¯) ظˆ ط¨ط§ `prefetch_related('guarantees','addendums')`
    ط§ط¬ط±ط§ ظ…غŒâ€Œط´ظˆط¯.
  - `ContractListSerializer` (ط³ط¨ع©) ط¨ط±ط§غŒ `action in ('list','options')`: ط¨ط¯ظˆظ† ط§ط³ظ†ط§ط¯/ظ„ط§ع¯/ط§ط®طھظ„ط§ظپ/ظ…طھظ†â€Œظ‡ط§غŒ ط¨ظ„ظ†ط¯ ظˆ ط¨ط§
    ط¢ط±ط§غŒظ‡â€Œظ‡ط§غŒ ظپط´ط±ط¯ظ‡ (`ContractInvoiceBriefSerializer`/`StatementBrief`/`PaymentBrief`/`GuaranteeBrief`).
  - `ContractViewSet._lean_queryset()`: `select_related` ع†ظ‡ط§ط± FK ظ„ط§ط²ظ… + `Prefetch` ط¨ط§ `.only()` ط¨ط±ط§غŒ
    invoices/statements/payments/guarantees/addendums (+`payment_allocations` ظپظ‚ط· `amount/kind`).
    prefetch ط³ظ†ع¯غŒظ† ظ‚ط¨ظ„غŒ (غ±غ´ ط±ط§ط¨ط·ظ‡ + `addendums__documents`/`guarantees__actions`/`audit_logs`) ظپظ‚ط· ط¨ط±ط§غŒ
    `action='retrieve'` (ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯) ظ…غŒâ€Œظ…ط§ظ†ط¯.
  - `GET /api/external-contracts/options/` (ط¬ط¯غŒط¯): ظپظ‡ط±ط³طھ ط³ط¨ع© ط¨ط§ `values()` ط¨ط±ط§غŒ ط§ظ†طھط®ط§ط¨ع¯ط±ظ‡ط§ â€” طµظپط­ط§طھ ظپط§ع©طھظˆط±ظ‡ط§طŒ
    ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§طŒ ط§ظ„ط­ط§ظ‚غŒظ‡â€Œظ‡ط§ ظˆ `GuaranteesPage` ط§ط² ط¢ظ† ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯ (ط¨ظ‡â€Œط¬ط§غŒ `?page_size=500`).
  - `stats` ط¯غŒع¯ط± prefetch ظپظ‡ط±ط³طھ ط±ط§ ط¨ط±ظ†ظ…غŒâ€Œط¯ط§ط±ط¯ ظˆ `get_project_allocations_display` ظ†ط§ظ… ظ¾ط±ظˆعکظ‡â€Œظ‡ط§ ط±ط§ ط¯ط± ط³ط·ط­
    ط³ط±غŒط§ظ„ط§غŒط²ط± ع©ط´ ظ…غŒâ€Œع©ظ†ط¯ (ظ‚ط¨ظ„ط§ظ‹ ظ‡ط± ظ‚ط±ط§ط±ط¯ط§ط¯ غŒع© ع©ظˆط¦ط±غŒ `projects_project`).
  - `AddendumViewSet`: `select_related('contract__party','contract__currency','currency')` + prefetch
    `documents` ط¨ط§ `select_related('contract__party', â€¦)` ظˆ `contract__addendums` (N+1 طھط¶ظ…غŒظ†/ط·ط±ظپ/ط§ظ„ط­ط§ظ‚غŒظ‡ ط¨ط³طھظ‡ ط´ط¯).

- **آ«ط¸ط§ظ‡ط± ظˆ ظ¾ظˆط³طھظ‡آ» طھط¨â€Œط¨ظ†ط¯غŒ ط´ط¯ ظˆ طھظ†ط¸غŒظ… ظˆط±ظˆط¯ ظ…ظ†طھظ‚ظ„ ط´ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `pages/AppearancePage.jsx` ط­ط§ظ„ط§ ظ¾ظ†ط¬ طھط¨ ط¯ط§ط±ط¯
  (`APPEARANCE_TABS`طŒ ع©ظ„غŒط¯ طھط¨ ط¯ط± ط¢ط¯ط±ط³ `?tab=â€¦` ط°ط®غŒط±ظ‡ ظ…غŒâ€Œط´ظˆط¯ ظˆ `data-testid="appearance-tabs"` ط¯ط§ط±ط¯):
  **ظ¾ظˆط³طھظ‡â€Œظ‡ط§** (ع©ط§ط±طھâ€Œظ‡ط§غŒ طھظ… + ط±ظ†ع¯ ظ†ط¦ظˆظ† ط¯ط± F-ظ…ظˆط¯) آ· **ظ¾ط§ظ„طھâ€Œظ‡ط§غŒ ط±ظ†ع¯غŒ** (ظ¾ط§ظ„طھ ظ‡ط± ظ…ط§عکظˆظ„) آ· **ط§ط³طھظˆط¯غŒظˆ طھظ…**
  (`ThemeStudioCard`) آ· **ظˆط±ظˆط¯** آ· **ظپظˆظ†طھ ظˆ ط§ظ†ط¯ط§ط²ظ‡â€Œظ‡ط§** (`TypographyCard`).
  ع©ظ„ ط¨ط®ط´ آ«ط¸ط§ظ‡ط± طµظپط­ظ‡ظ” ظˆط±ظˆط¯آ» ط§ط² `pages/CompanyProfilePage.jsx` (ع©ظ‡ ط§ط² غ¶غ°غ°+ ط®ط· ط¨ظ‡ غ²غ±غ° ط®ط· ط±ط³غŒط¯) ط¨ظ‡
  `pages/appearance/LoginBrandingPanel.jsx` ظ…ظ†طھظ‚ظ„ ط´ط¯ â€” ظ‡ظ…ط§ظ† ط§ظ…ع©ط§ظ†ط§طھ (طھطµظˆغŒط±/ع¯ط±ط§ط¯غŒط§ظ†طھطŒ ط±ظ†ع¯ ظ¾ظˆط´ط´طŒ ط¨ظ„ظˆط±طŒ
  ط§ظ†ط¯ط§ط²ظ‡ ظˆ ط±ظ†ع¯ ظ¾ظ†ظ„ ظ„ظˆع¯ظˆطŒ ط±ظ†ع¯ ظ…طھظ†â€Œظ‡ط§طŒ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡) ط¨ط§ `PanelSection` ظ…ط­ظ„غŒ. طھط³طھ:
  `__tests__/appearanceTabsSmoke.test.js` (غ³ طھط³طھ: ظ¾ظ†ط¬ طھط¨طŒ ظ…ط­طھظˆط§غŒ طھط¨ ظˆط±ظˆط¯طŒ ظˆ payload ط°ط®غŒط±ظ‡).
- **ط±ظ†ع¯غŒظ†â€Œع©ظ…ط§ظ† ط®ط·غŒ + ظپط§طµظ„ظ‡ظ” ط¢غŒع©ظ†/ط¹ظ†ظˆط§ظ† ظ…ط§عکظˆظ„ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ظ¾ط±غŒط³طھ `rainbow` ط¬ط§غŒ `conic-rainbow` ط±ط§ ع¯ط±ظپطھ ظˆ
  ط¨ظ‡â€Œط¬ط§غŒ `conic-gradient` (ع©ظ‡ ظ‡ظ…ظ‡ظ” ط±ظ†ع¯â€Œظ‡ط§ ط±ط§ ط¯ط± ظ…ط±ع©ط² ط¬ظ…ط¹ ظ…غŒâ€Œع©ط±ط¯) ط¨ط§ `linear-gradient(<angle>deg, غ· ط±ظ†ع¯)` غŒط¹ظ†غŒ
  **ظ†ظˆط§ط±ظ‡ط§غŒ ظ…ظˆط±ط¨ ط±ظˆغŒ ع©ظ„ طµظپط­ظ‡** ط±ظ†ط¯ط± ظ…غŒâ€Œط´ظˆط¯ط› ط´ظ†ط§ط³ظ‡ظ” ظ‚ط¯غŒظ…غŒ ط¨ط§ `PRESET_ALIASES` (`colorUtils`) ظˆ
  `GRADIENT_PRESET_ALIASES` (ط¨ع©â€Œط§ظ†ط¯) ط¨ظ‡ `rainbow` ظ…ظ‡ط§ط¬ط±طھ ظ…غŒâ€Œط´ظˆط¯طŒ ظ¾ط³ ط¯ط§ط¯ظ‡ظ” ط°ط®غŒط±ظ‡â€Œط´ط¯ظ‡ظ” ظ‚ط¨ظ„غŒ ظ‡ظ… ط¯ط±ط³طھ ظ†ظ…ط§غŒط´ ط¯ط§ط¯ظ‡
  ظ…غŒâ€Œط´ظˆط¯. ط¨ط±ط§غŒ ط§غŒظ† ظ¾ط±غŒط³طھ ط§ظ†طھط®ط§ط¨ع¯ط± ط±ظ†ع¯ ط¯ط± UI ظ¾ظ†ظ‡ط§ظ† ط§ط³طھ (ط±ظ†ع¯â€Œظ‡ط§ ط«ط§ط¨طھ) ظˆ `gradientColorCount('rainbow') === 0`.
  ط¯ط± ع©ط§ط±طھâ€Œظ‡ط§غŒ ظ…ط§عکظˆظ„طŒ ظپط§طµظ„ظ‡ظ” ط¢غŒع©ظ†â†”ط¹ظ†ظˆط§ظ† ط¨ط§ **`gap: 20px`** (ط¨ظ‡â€Œط¬ط§غŒ `spacing` ع©ظ‡ ط¯ط± RTL ظ‚ط§ط¨ظ„ ط§طھع©ط§ ظ†ط¨ظˆط¯) ظˆ
  ط¢غŒع©ظ† غ´غ²px طھظ†ط¸غŒظ… ط´ط¯ط› `CompanyIdentity` ظ‡ظ… `gap: 10px` ع¯ط±ظپطھ. طھط³طھ: `settings_app/tests_login_branding.py` (غ³غµ)
  ظˆ `__tests__/loginAndModuleSelectionSmoke.test.js` (غ¸).
- **ظ„ظˆع¯ظˆغŒ ظ¾ظ†ظ„ ظˆط±ظˆط¯: ط§ظ†ط¯ط§ط²ظ‡ ظˆ ط±ظ†ع¯ ظ‚ط§ط¨ظ„ طھظ†ط¸غŒظ… (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ع©ظ„غŒط¯ظ‡ط§غŒ ط¬ط¯غŒط¯ `logo_size` (غ¸غ°â€“غ³غ²غ°pxطŒ
  ظ¾غŒط´â€Œظپط±ط¶ غ±غ·غ¶طŒ `MIN/MAX_LOGO_SIZE` + `_logo_size()` ط¯ط± `settings_app/login_branding.py`) ظˆ
  `logo_panel_color` (ظ‡ع¯ط²طŒ ظ¾غŒط´â€Œظپط±ط¶ `#ffffff`). ظپط±ط§ظ†طھ: `LOGIN_LOGO_SIZE` ظˆ `clampLogoSize` ط¯ط±
  `colorUtils.js`ط› `resolveLoginBranding` ط­ط§ظ„ط§ `logoSize`/`logoPanelColor` ظ…غŒâ€Œط¯ظ‡ط¯. ط¯ط± طھظ†ط¸غŒظ…ط§طھ ط´ط±ع©طھ:
  ط§ط³ظ„ط§غŒط¯ط± آ«ط§ظ†ط¯ط§ط²ظ‡ظ” ظ„ظˆع¯ظˆغŒ ظ¾ظ†ظ„ ظˆط±ظˆط¯آ» (ع¯ط§ظ… غ´px) + ظپغŒظ„ط¯ ط±ظ†ع¯ آ«ط±ظ†ع¯ ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” ظ¾ظ†ظ„ ظ„ظˆع¯ظˆآ» ظˆ ط§غŒظ† ط¯ظˆ ط¯ط±
  `submitBranding` ط§ط±ط³ط§ظ„ ظ…غŒâ€Œط´ظˆظ†ط¯ط› ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ع©ط§ط±طھ ظ‡ظ… ظ‡ظ…ط§ظ† ط±ظ†ع¯/ظ†ط³ط¨طھ ط§ظ†ط¯ط§ط²ظ‡ ط±ط§ ظ†ط´ط§ظ† ظ…غŒâ€Œط¯ظ‡ط¯. ظ„ظˆع¯ظˆغŒ ظ…ظˆط¨ط§غŒظ„
  غ°ظ«غ´غ²أ— ط§ظ†ط¯ط§ط²ظ‡ظ” ط§ظ†طھط®ط§ط¨غŒ (ط¨غŒظ† غµغ¶ ظˆ غ±غ±غ°px) ط§ط³طھ. ظپط§طµظ„ظ‡ظ” ط¢غŒع©ظ†/ط¹ظ†ظˆط§ظ† ع©ط§ط±طھâ€Œظ‡ط§غŒ ظ…ط§عکظˆظ„ ط§ط² `1.1` ط¨ظ‡ `2`
  (â‰ˆغ±غ¶px) ظˆ ط¢غŒع©ظ† غ´غ°px ط´ط¯ (RTL). طھط³طھâ€Œظ‡ط§: `settings_app/tests_login_branding.py` (غ³غ´) ظˆ
  `__tests__/loginAndModuleSelectionSmoke.test.js` (غ¸).
- **ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” ع¯ط±ط§ط¯غŒط§ظ†طھغŒ طµظپط­ظ‡ظ” ظˆط±ظˆط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط¨ظ‡â€Œط¬ط§غŒ طھطµظˆغŒط± ظ…غŒâ€Œطھظˆط§ظ† **ع¯ط±ط§ط¯غŒط§ظ†طھ ط±ظ†ع¯غŒ** ط§ظ†طھط®ط§ط¨ ع©ط±ط¯.
  - ط¨ع©â€Œط§ظ†ط¯ `settings_app/login_branding.py`: ع©ظ„غŒط¯ظ‡ط§غŒ `background_kind` (`image|gradient`) ظˆ
    `gradient: {preset, angle, colors[2..4]}` ط¨ط§ ظ¾ط±غŒط³طھâ€Œظ‡ط§غŒ `linear-two|linear-three|linear-four|radial|
    conic-rainbow|mesh`ط› `_gradient()` ط±ظ†ع¯â€Œظ‡ط§ ط±ط§ ظ‡ع¯ط²/ط­ط¯ط§ع©ط«ط± غ´ ط±ظ†ع¯ ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظ…غŒâ€Œع©ظ†ط¯ ظˆ ط²ط§ظˆغŒظ‡ ط±ط§ `mod 360`
    ظ…غŒâ€Œط¨ط±ط¯ط› `save_login_branding` ع¯ط±ط§ط¯غŒط§ظ†طھ ط±ط§ **partial-merge** ظ…غŒâ€Œع©ظ†ط¯ ظˆ ط¢ظ¾ظ„ظˆط¯ طھطµظˆغŒط± ط®ظˆط¯ع©ط§ط±
    `background_kind='image'` ظ…غŒâ€Œع¯ط°ط§ط±ط¯.
  - ظپط±ط§ظ†طھ `core/utils/colorUtils.js`: `LOGIN_GRADIENT_PRESETS`طŒ `normalizeLoginGradient`طŒ
    `loginGradientCss`طŒ `gradientColorCount` ظˆ `resolveLoginBranding` â†’ `backgroundKind` / `gradient` /
    `gradientCss` / `useGradient`.
  - UI: ط¯ط± آ«طھظ†ط¸غŒظ…ط§طھ â†’ ظ…ط´ط®طµط§طھ ط´ط±ع©طھ â†’ ط¸ط§ظ‡ط± طµظپط­ظ‡ظ” ظˆط±ظˆط¯آ» غŒع© `ToggleButtonGroup` **طھطµظˆغŒط± ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ / ع¯ط±ط§ط¯غŒط§ظ†طھ ط±ظ†ع¯غŒ**ط›
    ط¯ط± ط­ط§ظ„طھ ع¯ط±ط§ط¯غŒط§ظ†طھ: ع†غŒظ¾â€Œظ‡ط§غŒ ظ¾ط±غŒط³طھ (غ²/غ³/غ´ ط±ظ†ع¯طŒ ط´ط¹ط§ط¹غŒطŒ ط±ظ†ع¯غŒظ†â€Œع©ظ…ط§ظ†طŒ ظ…ط´)طŒ ط§ظ†طھط®ط§ط¨ ط±ظ†ع¯ ظ‡ط± ط§ط³طھط§ظ¾طŒ ط§ط³ظ„ط§غŒط¯ط± ط²ط§ظˆغŒظ‡
    (غ°â€“غ³غ¶غ°) ظˆ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡ظ” ع©ط§ط±طھ. **ط³ظˆط¦غŒع† آ«ط¨ظ„ظˆط± ظ¾ط³â€Œط²ظ…غŒظ†ظ‡آ»** ط¨ظ„ظˆط± ط±ط§ ع©ط§ظ…ظ„ ط®ط§ظ…ظˆط´/ط±ظˆط´ظ† ظ…غŒâ€Œع©ظ†ط¯ ظˆ ط¯ط± ط­ط§ظ„طھ ع¯ط±ط§ط¯غŒط§ظ†طھ
    ط؛غŒط±ظپط¹ط§ظ„ ط§ط³طھط› ط±ظ†ع¯/ط´ظپط§ظپغŒطھ ظ¾ظˆط´ط´ (`overlay_color`/`overlay_opacity`) ط±ظˆغŒ ع¯ط±ط§ط¯غŒط§ظ†طھ ظ‡ظ… ط§ط¹ظ…ط§ظ„ ظ…غŒâ€Œط´ظˆط¯ (غ° = ع¯ط±ط§ط¯غŒط§ظ†طھ ط®ط§ظ„طµ).
  - طµظپط­ظ‡ظ” ظˆط±ظˆط¯ ظ„ط§غŒظ‡ظ” `data-testid="login-branding-gradient"` (`data-gradient-preset/-angle/-colors`) ط±ط§
    ط±ظ†ط¯ط± ظ…غŒâ€Œع©ظ†ط¯ط› طھط³طھâ€Œظ‡ط§: `settings_app/tests_login_branding.py` (غ³غ²) ظˆ
    `__tests__/loginAndModuleSelectionSmoke.test.js` (غ·).
- **ط¬ط²ط¦غŒط§طھ ط¨طµط±غŒ ع©ط§ط±طھ ظˆط±ظˆط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط®ط· ط¬ط¯ط§ع©ظ†ظ†ط¯ظ‡ظ” ط®ط§ع©ط³طھط±غŒ ط¬ظ„ظˆغŒ ط³ط±ط¨ط±ع¯â€Œظ‡ط§غŒ آ«ظˆط±ظˆط¯ ط§ط·ظ„ط§ط¹ط§طھآ»/آ«ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„آ»
  ط­ط°ظپ ط´ط¯ (ظپظ‚ط· `Typography` ط¨ط§ `mb`)ط› ظ„ظˆع¯ظˆغŒ ظ¾ظ†ظ„ ط³ظ…طھ ع†ظ¾ ط§ط² غ±غ·غ¶ ط¨ظ‡ **غ²غ´غ°px** (ظ…ظˆط¨ط§غŒظ„ غ·غ¸px) ط±ط³غŒط¯ط› ظˆ ط¯ط± ظپغŒظ„ط¯
  آ«ط´ط±ع©طھآ» ط¨ظ‡â€Œط¬ط§غŒ ط¢غŒع©ظ† ط¹ظ…ظˆظ…غŒطŒ **ظ„ظˆع¯ظˆغŒ ظ‡ظ…ط§ظ† ط´ط±ع©طھ** (`CompanyLogo` ط³ط§غŒط² غ²غ´) ط¨ط§ `startAdornment` ظ†ظ…ط§غŒط´ ط¯ط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯
  (ط¨ط¯ظˆظ† ظ„ظˆع¯ظˆ â†’ ظ…ظˆظ†ظˆع¯ط±ط§ظ…). طھط³طھ: `__tests__/loginAndModuleSelectionSmoke.test.js` (غµطŒ ط´ط§ظ…ظ„ ط¨ط±ط±ط³غŒ `<img>` ط¯ط§ط®ظ„
  ظپغŒظ„ط¯ ط´ط±ع©طھ).
- **طھط±ظ†ط²غŒط´ظ† ع†ط±ط®ط´غŒ ظˆط±ظˆط¯ â‡„ ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط¯ط± `pages/Login.jsx` ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” طµظپط­ظ‡ **ط¨غŒط±ظˆظ† ط§ط² ع©ط§ط±طھ**
  ط±ظ†ط¯ط± ظ…غŒâ€Œط´ظˆط¯ ظˆ ظ‡ظ…غŒط´ظ‡ mount ظ…غŒâ€Œظ…ط§ظ†ط¯ط› ط¯ط§ط®ظ„ طµط­ظ†ظ‡ظ” `perspective` غŒع© ط¨ظ„ظˆع© `data-testid="login-flip"`
  (`data-flip-step`/`data-flip-pose`) ظ‚ط±ط§ط± ط¯ط§ط±ط¯ ع©ظ‡ ظپظ‚ط· **ع©ط§ط±طھ** ط±ط§ ط¨ط§ `rotateY(آ±84deg) + scale(.94)` ظ…غŒâ€Œع†ط±ط®ط§ظ†ط¯
  (ط®ط±ظˆط¬ غ²غ°غ°msطŒ ظˆط±ظˆط¯ غ³غ¶غ°msط› `prefers-reduced-motion` ط®ط§ظ…ظˆط´ ظ…غŒâ€Œط´ظˆط¯) ظˆ ط¨ط§ `goToStep(next, direction)` طھط¹ظˆغŒط¶
  ظ…غŒâ€Œط´ظˆط¯. ط¨ط±ط§غŒ ظ‡ظ…غŒظ†طŒ ع©ط§ط±طھ ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„ ط¨ظ‡ ط¯ظˆ ط¨ط®ط´ ط´ع©ط³طھظ‡ ط´ط¯: `ModuleSelectionCard` (ظپظ‚ط· ع©ط§ط±طھطŒ ط¨ط±ط§غŒ طµط­ظ†ظ‡ظ” ع†ط±ط®ط´)
  ظˆ `ModuleSelection` ظ¾غŒط´â€Œظپط±ط¶ (ع©ط§ط±طھ + ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” ظ…ط³طھظ‚ظ„طŒ ط¨ط±ط§غŒ `AppSelectPage` ظˆ ظ…ط³غŒط± ظ…ط³طھظ‚ظ„). ط³ط±ط¨ط±ع¯
  آ«ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„آ» ظ‡ظ… ط¨ظ‡ ع©ط§ط±طھ ط§ط¶ط§ظپظ‡ ط´ط¯. طھط³طھ: `__tests__/loginAndModuleSelectionSmoke.test.js` (غµ) ظˆ
  `__tests__/documentModulePlaces.test.js` (غ²).
- **ط¨ط§ط²ط·ط±ط§ط­غŒ طµظپط­ظ‡ظ” ظˆط±ظˆط¯ ظˆ طµظپط­ظ‡ظ” ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - **طµظپط­ظ‡ظ” ظˆط±ظˆط¯ (`pages/Login.jsx`):** ع©ط§ط±طھ ظ…ط³طھط·غŒظ„غŒ ظˆط³ط·â€Œع†غŒظ† ط±ظˆغŒ طھطµظˆغŒط± ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” طھظ†ط¸غŒظ…ط§طھ ط´ط±ع©طھ â€” ط³ظ…طھ ط±ط§ط³طھ
    ظپط±ظ… ط¨ط§ ط¹ظ†ظˆط§ظ† **آ«ط®ظˆط´ ط¢ظ…ط¯غŒط¯آ»** + ط³ط±ط¨ط±ع¯ **آ«ظˆط±ظˆط¯ ط§ط·ظ„ط§ط¹ط§طھآ»** ظˆ ظپغŒظ„ط¯ظ‡ط§غŒ **ط´ط±ع©طھ / ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ / ط±ظ…ط² ط¹ط¨ظˆط±** (ظپغŒظ„ط¯ ط´ط±ع©طھ
    ط­طھغŒ ط¨ط§ غŒع© ط´ط±ع©طھ ظ‡ظ… ظ†ظ…ط§غŒط´ ط¯ط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯)طŒ ط³ظ…طھ ع†ظ¾ **ظ¾ظ†ظ„ ع©ط§ظ…ظ„ط§ظ‹ ط³ظپغŒط¯** (`bgcolor:#fff` + `borderInlineStart`) ع©ظ‡
    ظپظ‚ط· ظ„ظˆع¯ظˆغŒ ط´ط±ع©طھ (ط¨ط¯ظˆظ† ظ‚ط§ط¨/ط³ط§غŒظ‡/ع¯ط±ط§ط¯غŒط§ظ†) ط¯ط± ط¢ظ† ط§ط³طھ. ظ‡غŒع† ظ…طھظ† طھط¨ظ„غŒط؛ط§طھغŒ ط¯غŒع¯ط±غŒ ط±ظˆغŒ طµظپط­ظ‡ ظ†غŒط³طھ.
    `data-testid="login-page"` ط¨ط§ `data-branding-text-color`/`data-branding-accent-color`طŒ `login-card`طŒ
    `login-logo-panel`طŒ `login-branding-image` (`data-background-url`) ظˆ `login-branding-overlay`
    (`data-overlay-color`/`data-overlay-opacity`/`data-overlay-blur`).
  - **`overlay_blur` (غ°â€“غ²غ´px):** ط¯ط± `settings_app/login_branding.py` (`MAX_OVERLAY_BLUR`, default 8,
    `_blur()` + merge ط¯ط± `save_login_branding`) ظˆ `core/utils/colorUtils.js`
    (`resolveLoginBranding` â†’ `theme.blur`)ط› ط¯ط± آ«طھظ†ط¸غŒظ…ط§طھ â†’ ظ…ط´ط®طµط§طھ ط´ط±ع©طھ â†’ ط¸ط§ظ‡ط± طµظپط­ظ‡ظ” ظˆط±ظˆط¯آ» ط§ط³ظ„ط§غŒط¯ط±
    آ«ظ…غŒط²ط§ظ† ط¨ظ„ظˆط± طھطµظˆغŒط± ظ¾ط³â€Œط²ظ…غŒظ†ظ‡آ» + ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ع©ط§ط±طھ ط§ط¶ط§ظپظ‡ ط´ط¯. طھط³طھ: `settings_app/tests_login_branding.py` (غ²غ·).
    **ظ…ط³طھظ‚ط± ط´ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `manage.py check` ظ¾ط§ع©طŒ gunicorn ط±غŒâ€Œط§ط³طھط§ط±طھ ظˆ
    `GET /api/auth/login-companies/` ع©ظ„غŒط¯ `overlay_blur` ط±ط§ ط¯ط± `login_branding` ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط§ظ†ط¯.
  - **طµظپط­ظ‡ظ” ط§ظ†طھط®ط§ط¨ ظ…ط§عکظˆظ„ (`core/components/ui/ModuleSelection.jsx`) â€” ط¨ط§ط²ط·ط±ط§ط­غŒطŒ ظ†ظ‡ ط­ط°ظپ:** ظ‡ظ…ط§ظ† ظ‚ط§ط¨ظ„غŒطھâ€Œظ‡ط§
    (ط³ظ„ط§ظ…/ظ†ط§ظ… ع©ط§ط±ط¨ط±طŒ ظ‡ظˆغŒطھ ط´ط±ع©طھطŒ ع©ط§ط±طھ ظ…ط§عکظˆظ„â€Œظ‡ط§غŒ ظ…ط¬ط§ط² ط¨ط§ accent ظ…ط§عکظˆظ„طŒ ط­ط§ظ„طھ ط¨ط§ط±ع¯ط°ط§ط±غŒ ظ‡ط± ظ…ط§عکظˆظ„طŒ ط®ط·ط§طŒ ط¨ط§ط²ع¯ط´طھ) ط¨ط§
    ط²ط¨ط§ظ† ط¨طµط±غŒ طµظپط­ظ‡ظ” ظˆط±ظˆط¯: ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” طھطµظˆغŒط±غŒ `company.login_branding` + ظ¾ظˆط´ط´/ط¨ظ„ظˆط±طŒ ع©ط§ط±طھ ظˆط³ط·â€Œع†غŒظ†
    (`module-selection-card`) ط¨ط§ ط´ط¨ع©ظ‡ظ” ط³ظ‡â€Œط³طھظˆظ†غŒ ع©ط§ط±طھâ€Œظ‡ط§غŒ outlined ظˆ ط´ظگظˆط±ظˆظ†. طھط³طھ:
    `__tests__/loginAndModuleSelectionSmoke.test.js` (غ´ طھط³طھطŒ ط´ط§ظ…ظ„ ط¨ظ„ظˆط± ظˆ ط­ط°ظپ ظ…طھظ†â€Œظ‡ط§غŒ طھط¨ظ„غŒط؛ط§طھغŒ).

- **ط¢غŒع©ظ† طھط¨ ظ…ط±ظˆط±ع¯ط± ط§ط² ظ„ظˆع¯ظˆغŒ ط´ط±ع©طھ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط§ظ†ط¯ظ¾ظˆغŒظ†طھ ط¹ظ…ظˆظ…غŒ `GET /api/company/branding/`
  (`core/views.py::company_branding_view` + طھط§ط¨ط¹ ط®ط§ظ„طµ `company_branding_payload`/`load_company_branding`)
  ظ†ط§ظ… ط­ظ‚ظˆظ‚غŒ ظˆ ظ„ظˆع¯ظˆغŒ tenant ط¬ط§ط±غŒ ط±ط§ ظ…غŒâ€Œط¯ظ‡ط¯: `logo_url` ظˆ `favicon_url` ط¨ط§ `?v=<updated_at>` ط¨ط±ط§غŒ ط´ع©ط³طھظ† ع©ط´.
  ظ…ظ†ط¨ط¹ ظ„ظˆع¯ظˆ ط§ظˆظ„ `CompanyProfile.logo` (ظ…ط´ط®طµط§طھ ط´ط±ع©طھ) ظˆ ط¨ط¹ط¯ `Company.logo`. ظپط±ط§ظ†طھ: `FaviconSync` ط¯ط±
  `App.jsx` غŒع© `<link rel="icon" id="hrms-company-favicon">` ظ…غŒâ€Œط³ط§ط²ط¯/ط¨ظ‡â€Œط±ظˆط² ظ…غŒâ€Œع©ظ†ط¯ (ط¨ط¯ظˆظ† ظ„ظˆع¯ظˆ â†’ ط¨ط¯ظˆظ† ظ„غŒظ†ع©)
  ظˆ `CompanyProfilePage` ظ¾ط³ ط§ط² ط¢ظ¾ظ„ظˆط¯ ظ„ظˆع¯ظˆ ع©ط´ `['company-branding']` ط±ط§ ط¨ط§ط·ظ„ ظ…غŒâ€Œع©ظ†ط¯.
  طھط³طھâ€Œظ‡ط§: `core/tests_branding.py` (غ¸) ظˆ `__tests__/faviconSync.test.js` (غ³). ط¯ط§ط¯ظ‡ظ” ط²ظ†ط¯ظ‡ظ” kpsmi:
  `/media/company_logos/ظ„ظˆع¯ظˆ_HJMTNTX.png` (غ¹غ±KBطŒ HTTP 200).
- **ط¨ط§ط²ط·ط±ط§ط­غŒ ط¯ط§ط´ط¨ظˆط±ط¯ ط®ط±غŒط¯ظ‡ط§ ظ…ط·ط§ط¨ظ‚ ط¯ط§ط´ط¨ظˆط±ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - **ط¨ع©â€Œط§ظ†ط¯:** ط§ظ†ط¯ظ¾ظˆغŒظ†طھ طھط¬ظ…غŒط¹غŒ `GET /api/procurement/dashboard/` (`procurement/views.py::dashboard_view`) ط¨ط§
    ظ…ظ†ط·ظ‚ ط®ط§ظ„طµ ط¯ط± `procurement/dashboard.py` (ط¨ط¯ظˆظ† ط¯غŒطھط§ط¨غŒط³ظگ ظ„ط§ط²ظ… ط¨ط±ط§غŒ طھط³طھ): طھظپع©غŒع© ط±غŒط§ظ„غŒ/ط§ط±ط²غŒطŒ ظ…ط¬ظ…ظˆط¹ ط³ظپط§ط±ط´/طµظˆط±طھط­ط³ط§ط¨/
    ظ¾ط±ط¯ط§ط®طھطŒ ظ†ط±ط® طھط³ظˆغŒظ‡طŒ ظپط§ع©طھظˆط± ظ…ط¹ظˆظ‚طŒ ط³ط±غŒ ط²ظ…ط§ظ†غŒ غ¶ ظ…ط§ظ‡ظ‡ (`rial_orders`/`foreign_orders`/`rial_amount`/`foreign_amount`/
    `invoice_amount`/`payment_amount`)طŒ طھط±ع©غŒط¨ ظˆط¶ط¹غŒطھ ط³ظپط§ط±ط´â€Œظ‡ط§ ظˆ ط§ط³طھط¹ظ„ط§ظ…â€Œظ‡ط§طŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ† ط¨ط±طھط±طŒ طھظپع©غŒع© ظ¾ط±ظˆعکظ‡طŒ
    ط³ظپط§ط±ط´â€Œظ‡ط§غŒ ظ†ط²ط¯غŒع© ط³ط±ط±ط³غŒط¯ ظˆ ط®ظ„ط§طµظ‡ظ” طھط¶ط§ظ…غŒظ† (ط§ط¹طھط¨ط§ط± ط¨ط§ `contracts.guarantee_validity`). ظ‡ط± ظ…ط¯ظ„ **غŒع© ع©ظˆط¦ط±غŒ**
    (`values()` طھط®طھ + ط³ظ‚ظپ غ²غ°غ°غ° ط±ط¯غŒظپ) ظˆ ط¨ط¯ظˆظ† N+1. طھط³طھ: `procurement/tests_dashboard.py` (غ±غ² طھط³طھ).
  - **ظپط±ط§ظ†طھ:** ع©غŒطھ ظ…ط´طھط±ع© `pages/contracts/contractsDashboardKit.jsx` ط§ط² ط¯ط§ط´ط¨ظˆط±ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ ط§ط³طھط®ط±ط§ط¬ ط´ط¯
    (`ContractsDashboardPage.jsx` ط§ط² غ±ظ¬غ°غ³غ¸ ط¨ظ‡ غ·غ¹غ³ ط®ط·) ظˆ `ProcurementDashboardPage.jsx` ط¨ط§ ظ‡ظ…ط§ظ† ط²ط¨ط§ظ† ط¨طµط±غŒ ط¨ط§ط²ظ†ظˆغŒط³غŒ ط´ط¯:
    ظ†ظˆط§ط± غµ ط´ط§ط®طµطŒ ظ¾ظ†ظ„â€Œظ‡ط§غŒ آ«ط®ط±غŒط¯ ط±غŒط§ظ„غŒ/ط§ط±ط²غŒآ» ط¨ط§ SparkLine ظˆ ط±ط¯غŒظپâ€Œظ‡ط§غŒ ط¢ظ…ط§ط±غŒطŒ ط¯ظˆ ظ†ظ…ظˆط¯ط§ط± ط±ظˆظ†ط¯طŒ ظ†ظˆط§ط± ط¬ط³طھâ€Œظˆط¬ظˆ/ظ…ط±طھط¨â€Œط³ط§ط²غŒطŒ
    ع©ط§ط±طھâ€Œظ‡ط§غŒ ط³ظپط§ط±ط´ ط±غŒط§ظ„غŒ ظˆ ط§ط±ط²غŒ ط¨ط§ طµظپط­ظ‡â€Œط¨ظ†ط¯غŒطŒ آ«ط³ظ„ط§ظ…طھ ظ…ط§ظ„غŒ ط®ط±غŒط¯ظ‡ط§آ»طŒ آ«ط³ط±ط±ط³غŒط¯ طھط­ظˆغŒظ„ ط³ظپط§ط±ط´â€Œظ‡ط§آ»طŒ آ«طھط¶ط§ظ…غŒظ† ط®ط±غŒط¯آ» ظˆ
    ع†ظ‡ط§ط± طھظˆط²غŒط¹ ط´ظ…ط§طھغŒع© (ظˆط¶ط¹غŒطھ ط³ظپط§ط±ط´â€Œظ‡ط§طŒ ظˆط¶ط¹غŒطھ ط§ط³طھط¹ظ„ط§ظ…â€Œظ‡ط§طŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ† ط¨ط±طھط±طŒ ط®ط±غŒط¯ ط¯ط± ظ¾ط±ظˆعکظ‡â€Œظ‡ط§).
    طھط³طھ: `__tests__/procurementDashboardSmoke.test.js`ط› `contractsDashboardSmoke` ظ‡ظ… ط³ط¨ط² ظ…ط§ظ†ط¯.
- **طµظپط­ظ‡ظ” طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ† ظ‡ظ…â€Œط³ط§ط®طھ طµظپط­ظ‡ظ” آ«ط·ط±ظپ ط­ط³ط§ط¨â€Œظ‡ط§آ» (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `procurementSuppliersList.jsx` ط¨ط§ط²ظ†ظˆغŒط³غŒ ط´ط¯ ط¨ظ‡
- **طµظپط­ظ‡ظ” آ«ظ†ظˆط§ظ‚طµ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§آ» ط¯ط± ع¯ط±ظˆظ‡ آ«ظ¾ط§غŒط´ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§آ» (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - **ط¨ع©â€Œط§ظ†ط¯:** ط§ع©ط´ظ† `GET /api/external-contracts/completeness/` ط±ظˆغŒ `ContractViewSet` + ظ…ظˆطھظˆط± ط®ط§ظ„طµ
    `contracts/completeness.py` ط¨ط§ **غ²غ¹ ظ‚ط§ط¹ط¯ظ‡** ط¯ط± غ· ع¯ط±ظˆظ‡ (ظپغŒظ„ط¯ظ‡ط§غŒ ظ†ط§ظ‚طµ / ظ…ط¯ط§ط±ع© / طھط§ط±غŒط®â€Œظ‡ط§ / ظ…ط§ظ„غŒ /
    ظ¾ط±ظˆعکظ‡ ظˆ ط¯ط±طµط¯ طھط®طµغŒطµ / طھط¶ط§ظ…غŒظ† / ط·ط±ظپ ط­ط³ط§ط¨) ظˆ ط´ط¯طھ `high|medium|low`:
    `missing_*` (ط´ظ…ط§ط±ظ‡طŒ ظ…ط¨ظ„ط؛طŒ طھط§ط±غŒط®â€Œظ‡ط§طŒ ط§ظ…ط¶ط§ع©ظ†ظ†ط¯ظ‡طŒ ط§ط±ط²طŒ ط´ط±ط§غŒط· ظ¾ط±ط¯ط§ط®طھ/ط¬ط±غŒظ…ظ‡/ط¨غŒظ…ظ‡/طھط­ظˆغŒظ„طŒ ط·ط¨ظ‚ظ‡â€Œط¨ظ†ط¯غŒطŒ ظ…ط­ظ„ ط§ط¬ط±ط§طŒ
    طھظˆط¶غŒط­ط§طھطŒ ط¯ط±طµط¯ ط­ط³ظ† ط§ظ†ط¬ط§ظ… ع©ط§ط±طŒ ظ¾غŒط´â€Œظ¾ط±ط¯ط§ط®طھ)طŒ `party_missing_national_id|economic_code`طŒ
    `no_project`طŒ **`project_share_missing` (ط¯ط±طµط¯ طھط®طµغŒطµ ظ¾ط±ظˆعکظ‡ ط®ط§ظ„غŒ)**طŒ `project_share_invalid` (ط¬ظ…ط¹ â‰  غ±غ°غ°ظھ)طŒ
    `no_documents`طŒ `no_contract_document`طŒ `end_before_start`طŒ `signing_after_start`طŒ
    `expired_but_active`طŒ `tender_number_missing`طŒ `no_financial_documents`طŒ `invoice_over_amount`طŒ
    `guarantee_missing`طŒ `guarantee_undefined`. ط§ظ…طھغŒط§ط² ط³ظ„ط§ظ…طھ ظ‡ط± ظ‚ط±ط§ط±ط¯ط§ط¯ = غ±غ°غ° âˆ’ (ط¨ط­ط±ط§ظ†غŒ غ±غ² / ظ…طھظˆط³ط· غ¶ / ع©ظ… غ²)
    ظˆ ط®ط±ظˆط¬غŒ ط´ط§ظ…ظ„ `summary` (طھط¹ط¯ط§ط¯/ط´ط¯طھ/ظ‡ط± ظ‚ط§ط¹ط¯ظ‡/ظ‡ط± ع¯ط±ظˆظ‡)طŒ `contracts` (ظ…ط±طھط¨â€Œط´ط¯ظ‡ ط¨ط± ط§ط³ط§ط³ ط´ط¯طھ ظˆ طھط¹ط¯ط§ط¯ ظ†ظ‚طµ) ظˆ
    `rules` ط§ط³طھ. **ط³ظ‡ ع©ظˆط¦ط±غŒ** ط¨ط±ط§غŒ ع©ظ„ طµظپط­ظ‡ (ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ ط¨ط§ `Count(distinct)` + ط¬ظ…ط¹ ظپط§ع©طھظˆط±ظ‡ط§ + ط¹ظ†ط§ظˆغŒظ† ظ…ط¯ط§ط±ع©)ط›
    ظپغŒظ„طھط±ظ‡ط§: `?code=a,b`طŒ `?severity=`طŒ `?group=`طŒ `?search=`طŒ `?status=`.
    طھط³طھ: `contracts/tests_completeness.py` (غ²غ² طھط³طھ DB-free).
  - **ظپط±ط§ظ†طھ:** `pages/ContractsCompletenessPage.jsx` ط±ظˆغŒ ظ…ط³غŒط± `/contracts-completeness` (ظ…ظ†ظˆغŒ آ«ظ¾ط§غŒط´ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ â†’
    ظ†ظˆط§ظ‚طµ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§آ»)طŒ ط¨ط§ ع©غŒطھ ظ…ط´طھط±ع© ط¯ط§ط´ط¨ظˆط±ط¯: غµ ع©ط§ط´غŒ ط´ط§ط®طµ (ع©ظ„/ط¯ط§ط±ط§غŒ ظ†ظ‚طµ/ط¨ط¯ظˆظ† ظ…ط¯ط±ع©/ط¨ط¯ظˆظ† ط¯ط±طµط¯ ظ¾ط±ظˆعکظ‡/ظپغŒظ„ط¯ظ‡ط§غŒ ظ†ط§ظ‚طµ)طŒ
    ظ¾ظ†ظ„ ظپغŒظ„طھط± (ط¬ط³طھâ€Œظˆط¬ظˆطŒ ط´ط¯طھطŒ ع¯ط±ظˆظ‡طŒ ظ†ظˆط¹ ظ†ظ‚طµطŒ ع†غŒظ¾â€Œظ‡ط§غŒ ط´ط¯طھ)طŒ **ط¬ط¯ظˆظ„ طھع©â€Œط±ط¯غŒظپغŒ ط¨ط§ ظ¾ظ†ط¬ ط³طھظˆظ†** (ط´ظ…ط§ط±ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯طŒ
    ط·ط±ظپ ط­ط³ط§ط¨طŒ ظ…ظˆط¶ظˆط¹طŒ ط§ظ…طھغŒط§ط²طŒ آ«ظˆغŒط±ط§غŒط´ ظ¾ط±ظˆظ†ط¯ظ‡آ»)طŒ `ModulePager`طŒ ط¯غŒط§ظ„ظˆع¯ ط¬ط²ط¦غŒط§طھ ظ†ظˆط§ظ‚طµ ظ‡ط± ظ‚ط±ط§ط±ط¯ط§ط¯ (ع¯ط±ظˆظ‡â€Œط¨ظ†ط¯غŒâ€Œط´ط¯ظ‡ +
    ظ„غŒظ†ع© آ«ط¨ط§ط² ع©ط±ط¯ظ† ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯آ») ظˆ ع†ط§ظ¾ ط¨ط§ ظ…ظˆطھظˆط± ع†ط§ظ¾ (`printElement`).
    طھط³طھ: `__tests__/contractsCompletenessSmoke.test.js`.
  - **ع©ط§طھط§ظ„ظˆع¯ ظ…ط¬ظˆط²ظ‡ط§ ط¨ط§ط²طھظˆظ„غŒط¯ ط´ط¯:** `python scripts/build_permission_catalog.py` â†’ ع©ظ¾غŒ ط±ظˆغŒ
    `core/permission_catalog_data.json` (ط§ع©ظ†ظˆظ† **غ²غ¶غµ ظ…ظ†ظˆ / غ±غ°غ¹غ· ع©ط¯**). ط§غŒظ† ع©ط§ط± ظ¾ظ†ط¬ ط¢غŒطھظ… ظ‚ط¯غŒظ…غŒ ط®ط±غŒط¯ ط±ط§ ظ‡ظ…
    ع©ظ‡ ط¯ط± `menuConfig.js` ط¨ظˆط¯ظ†ط¯ ظˆظ„غŒ ط¯ط± ع©ط§طھط§ظ„ظˆع¯ ظ†ط¨ظˆط¯ظ†ط¯ ط§ط¶ط§ظپظ‡ ع©ط±ط¯ (`procurement-inquiries/profiles/proforma/
    guarantees/allocations`) â€” ط¨ط¯ظˆظ† ط¢ظ†â€Œظ‡ط§ ظ…ظ†ظˆ ط¨ط±ط§غŒ ع©ط§ط±ط¨ط±ط§ظ† ط¨ط§ ظ…ط¬ظˆط² ط±غŒط² ظ¾ظ†ظ‡ط§ظ† ظ…غŒâ€Œظ…ط§ظ†ط¯.
  - ط¯ط§ط¯ظ‡ظ” ط²ظ†ط¯ظ‡ظ” `kpsmi` ظ‡ظ†ع¯ط§ظ… ط§ط³طھظ‚ط±ط§ط±: غ±غ·غ± ظ‚ط±ط§ط±ط¯ط§ط¯طŒ غ²غ±غ±غµ ظ†ظ‚طµطŒ ظ…غŒط§ظ†ع¯غŒظ† ط§ظ…طھغŒط§ط² غ´غ²ظ«غ± (ط¨غŒط´طھط±غŒظ† ظ‚ظˆط§ط¹ط¯:
    `missing_category`/`missing_description`/`missing_insurance_terms` ط±ظˆغŒ ظ‡ظ…ظ‡ظ” غ±غ·غ± ظ‚ط±ط§ط±ط¯ط§ط¯ ظˆ
    `no_documents` ط±ظˆغŒ غ±غµ).

  ع†غŒط¯ظ…ط§ظ† master/detail طµظپط­ظ‡ظ” `ContractPartiesPage`: ط³ط±طµظپط­ظ‡ + ظ†ظˆط§ط± ط¬ط³طھâ€Œظˆط¬ظˆ (ظ†ط§ظ…/ع©ط¯/ط´ظ†ط§ط³ظ‡ ظ…ظ„غŒ/ع©ط¯ ط§ظ‚طھطµط§ط¯غŒ/ط´ظ…ط§ط±ظ‡ ط«ط¨طھ/
  ظ…ظˆط¨ط§غŒظ„/ط´ط®طµ ط±ط§ط¨ط·) + ط³طھظˆظ† ظپظ‡ط±ط³طھ (md=5طŒ ط¢ظˆط§طھط§ط± ط±ظ†ع¯غŒ ط¨ط± ط§ط³ط§ط³ ظˆط¶ط¹غŒطھطŒ ع©ط¯/ط¯ط³طھظ‡/ظ…ظˆط¨ط§غŒظ„طŒ ع†غŒظ¾ ظˆط¶ط¹غŒطھ) + ط³طھظˆظ† ط¬ط²ط¦غŒط§طھ
  (md=7) ط¨ط§ ع©ط§ط±طھâ€Œظ‡ط§غŒ ط§ط·ظ„ط§ط¹ط§طھغŒ آ«ط¢ظ…ط§ط± ط®ط±غŒط¯آ» (ط§ط² `GET /api/procurement/suppliers/{id}/profile/`)طŒ آ«ط³ظپط§ط±ط´â€Œظ‡ط§غŒ ط§ط®غŒط±آ»طŒ
  آ«طھط¶ط§ظ…غŒظ† ط®ط±غŒط¯آ»طŒ آ«ط§ط·ظ„ط§ط¹ط§طھ ط­ظ‚ظˆظ‚غŒآ»طŒ آ«ط§ط·ظ„ط§ط¹ط§طھ طھظ…ط§ط³آ»طŒ آ«ط§ط·ظ„ط§ط¹ط§طھ ط¨ط§ظ†ع©غŒآ» ظˆ ط¯ع©ظ…ظ‡ظ” آ«ط¨ط§ط² ع©ط±ط¯ظ† ظ¾ط±ظˆظ†ط¯ظ‡ظ” ط®ط±غŒط¯آ».
  ط¯غŒط§ظ„ظˆع¯ ط«ط¨طھ/ظˆغŒط±ط§غŒط´ ظ‡ظ… ط¨ط®ط´â€Œط¨ظ†ط¯غŒ ظ‡ظ…ط§ظ† طµظپط­ظ‡ ط±ط§ ط¯ط§ط±ط¯ (ظ…ط´ط®طµط§طھ ظ¾ط§غŒظ‡ / ط­ظ‚ظˆظ‚غŒ / طھظ…ط§ط³ / ط¨ط§ظ†ع©غŒ / طھظˆط¶غŒط­ط§طھ) ط¨ط§ ع©ط¯
  ط®ظˆط¯ع©ط§ط± (`SUP-xxxxxx`)طŒ طھط؛غŒغŒط± ظˆط¶ط¹غŒطھ ط¨ط§ PATCH ظˆ ط­ط°ظپ ط¨ط§ طھط£غŒغŒط¯. `procurementSuppliersStudio.jsx` (ظ†ط³ط®ظ‡ظ” ظ‚ط¯غŒظ…غŒ ظˆ
  ط¨غŒâ€Œط§ط³طھظپط§ط¯ظ‡) ط­ط°ظپ ط´ط¯. طھط³طھ: `__tests__/procurementSuppliersSmoke.test.js`.
  ط±ظˆغŒ `SupplierViewSet` غŒع© payload ظˆط§ط­ط¯ ظ…غŒâ€Œط¯ظ‡ط¯: `supplier` + `summary` (ط³ظپط§ط±ط´/طµظˆط±طھط­ط³ط§ط¨/ظ¾ط±ط¯ط§ط®طھ/ظ…ط§ظ†ط¯ظ‡/
  ظ†ط±ط® طھط³ظˆغŒظ‡/طھظپع©غŒع© ط±غŒط§ظ„غŒ-ط§ط±ط²غŒ) + ظ„غŒط³طھâ€Œظ‡ط§غŒ `orders`طŒ `quotations`طŒ `proformas`طŒ `invoices`طŒ `payments`طŒ
  `guarantees` (ط¨ط§ `valid_until`/`days_to_expiry`/`is_expired` ط§ط² `contracts.guarantee_validity`)
  ظˆ `documents`/`timeline`. ظ‡ط± ط±ط§ط¨ط·ظ‡ **غŒع© ع©ظˆط¦ط±غŒ** `values()` (ط¨ط¯ظˆظ† N+1) ظˆ ظ…ط­ط§ط³ط¨ط§طھ ط¯ط±
  `procurement/profile.py` (ط®ط§ظ„طµط› غ±غ´ طھط³طھ ط¯ط± `procurement/tests_profile.py`).
  ظپط±ط§ظ†طھ: `ProcurementSupplierProfilePage` ط¨ط§ ط§ظ„ع¯ظˆغŒ آ«ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯آ» ط¨ط§ط²ظ†ظˆغŒط³غŒ ط´ط¯ â€” ع©ط§ط±طھ ظ‡ظˆغŒطھ + ع©ط§ط´غŒâ€Œظ‡ط§غŒ ظ…ط§ظ„غŒ +
  ط¯ط³طھط±ط³غŒ ط³ط±غŒط¹ + غ¹ طھط¨ (ظ†ظ…ط§غŒ ع©ظ„غŒ/ط³ظپط§ط±ط´â€Œظ‡ط§/ظ¾غŒط´ظ†ظ‡ط§ط¯ظ‡ط§/ظ¾غŒط´â€Œظپط§ع©طھظˆط±ظ‡ط§/طµظˆط±طھط­ط³ط§ط¨â€Œظ‡ط§/ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§/طھط¶ط§ظ…غŒظ†/ط§ط³ظ†ط§ط¯/ط®ط· ط²ظ…ط§ظ†غŒ)
- **ظ…ط¬ظˆط²ظ‡ط§غŒ ط±غŒط² ط¯ط± UI ظ‡ظ…غŒط´ظ‡ طھط§ط²ظ‡ ظ…غŒâ€Œظ…ط§ظ†ظ†ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `AuthContext` طھط§ط¨ط¹ `refreshUser` ط±ط§ ط¯ط§ط±ط¯ ظˆ
  `/auth/me` ط±ط§ **ط±ظˆغŒ `focus` ظ¾ظ†ط¬ط±ظ‡ ظˆ ظ‡ط± غ¶غ° ط«ط§ظ†غŒظ‡** ط¯ظˆط¨ط§ط±ظ‡ ظ…غŒâ€Œع¯غŒط±ط¯ (`USER_REFRESH_MS`)طŒ ط¨ظ†ط§ط¨ط±ط§غŒظ† ظ…ط¬ظˆط²غŒ ع©ظ‡
  ظ…ط¯غŒط± ط¯ط± آ«ظ…ط¬ظˆط²ظ‡ط§غŒ ع©ط§ط±ط¨ط±ط§ظ†آ» ظ…غŒâ€Œط¯ظ‡ط¯/ظ…غŒâ€Œع¯غŒط±ط¯ ط¨ط¯ظˆظ† ط®ط±ظˆط¬-ظˆط±ظˆط¯ ظ…ط¬ط¯ط¯ ط§ط¹ظ…ط§ظ„ ظ…غŒâ€Œط´ظˆط¯ (ظ‚ط¨ظ„ط§ظ‹ طھط§ ط±ظپط±ط´ طµظپط­ظ‡ ط¯ع©ظ…ظ‡â€Œظ‡ط§ ط¹ظˆط¶ ظ†ظ…غŒâ€Œط´ط¯ظ†ط¯).
  ظ‡ظ…ع†ظ†غŒظ† آ«ط­ط°ظپ ظ†ط§ظ…ظ‡آ» ط¯ط± ط³ط±طµظپط­ظ‡ظ” **ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ†ط§ظ…ظ‡** (`correspondenceLetterDetails.jsx`طŒ ظ¾ط±ط§ظ¾ `onDelete`) ظ‡ظ… ط§ط¶ط§ظپظ‡ ط´ط¯ط›
  طھط§ ظ‚ط¨ظ„ ط§ط² ط¢ظ† ط­ط°ظپ ظپظ‚ط· ط¯ط± ظ…ظ†ظˆغŒ ط±ط¯غŒظپ ط¬ط¯ظˆظ„ ط¨ظˆط¯. طھط³طھâ€Œظ‡ط§: `__tests__/authRefresh.test.js` ظˆ ط¨ط±ط±ط³غŒ ط¯ع©ظ…ظ‡ ط¯ط±
  `correspondenceSmoke` (غ±غ¶ طھط³طھ).
  ظ†ع©طھظ‡ظ” طھط³طھ: CRA ع¯ط²غŒظ†ظ‡ظ” **`resetMocks: true`** ط¯ط§ط±ط¯ط› ظ¾غŒط§ط¯ظ‡â€Œط³ط§ط²غŒ ظ‡ط± mock ط¨ط§غŒط¯ ط¯ط± `beforeEach` ط¯ظˆط¨ط§ط±ظ‡ ط³طھ ط´ظˆط¯طŒ
  ظˆع¯ط±ظ†ظ‡ `jest.fn(() => value)` ط¯ط§ط®ظ„ `jest.mock` ط¨غŒâ€Œط§ط«ط± ظ…غŒâ€Œط´ظˆط¯ (ظ‡ظ…غŒظ† ط¨ط§ط¹ط« ط´ط¯ `AuthEngine.isAuthenticated` ظ†ط§ظ…ظˆظپظ‚ ط´ظˆط¯).

  ط±ظˆغŒ ع©غŒطھ ظ…ط´طھط±ع© ط¯ط§ط´ط¨ظˆط±ط¯. ظ…ط³غŒط± ظ‡ظ…ط§ظ† `/procurement/supplier-profile?supplier=<id>` ط§ط³طھ (ظ„غŒظ†ع© ظپظ‡ط±ط³طھ ظ¾ط±ظˆظ†ط¯ظ‡â€Œظ‡ط§
  ط¯ط³طھâ€Œظ†ط®ظˆط±ط¯ظ‡). طھط³طھ: `__tests__/procurementProfileSmoke.test.js`.


- **ط¨ط§ط²ط·ط±ط§ط­غŒ ظ…ط§عکظˆظ„ ط®ط±غŒط¯ ظˆ طھط¯ط§ط±ع©ط§طھ â€” ظ…ط±ط­ظ„ظ‡ظ” ط¨ع©â€Œط§ظ†ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ظ…ط¯ظ„â€Œظ‡ط§غŒ ط¬ط¯غŒط¯ ط¯ط± `procurement/models.py`
  (ط¨ظ‡ ط³ط¨ع© ظ…ط§عکظˆظ„ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§) ط§ط¶ط§ظپظ‡ ط´ط¯ظ†ط¯ ظˆ ظ…ط§غŒع¯ط±غŒط´ظ† `procurement.0004` ط±ظˆغŒ ظ‡ظ…ظ‡ظ” schemaظ‡ط§ ط§ط¹ظ…ط§ظ„ ط´ط¯:
  - **ط§ط³طھط¹ظ„ط§ظ… (RFQ):** `Inquiry` (ط´ظ…ط§ط±ظ‡طŒ ظ…ظˆط¶ظˆط¹طŒ ط¯ط±ط®ظˆط§ط³طھ ظ…ط¨ط¯ط£طŒ ظ¾ط±ظˆعکظ‡طŒ ظˆط§ط­ط¯طŒ ظ…ظ‡ظ„طھطŒ ط±ظˆط´ ط§ط±ط²غŒط§ط¨غŒطŒ ط§ط±ط²طŒ
    ظ¾غŒط´ظ†ظ‡ط§ط¯ ط¨ط±ظ†ط¯ظ‡طŒ طھط§ط±غŒط®ع†ظ‡) + `InquiryLine` (ع©ط§ظ„ط§/ط®ط¯ظ…طھطŒ ظ…ط´ط®طµط§طھ ظپظ†غŒطŒ ظ…ظ‚ط¯ط§ط±طŒ ظ‚غŒظ…طھ ظ‡ط¯ظپطŒ WBS/CBS) +
    `InquirySupplier` (طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡ظ” ط¯ط¹ظˆطھâ€Œط´ط¯ظ‡ ط¨ط§ ظˆط¶ط¹غŒطھ ط¯ط¹ظˆطھ/ط§ط±ط³ط§ظ„/ظ¾ط§ط³ط®).
  - **ظ¾غŒط´ظ†ظ‡ط§ط¯ ظ‚غŒظ…طھ:** `Quotation` (طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡طŒ ط§ط¹طھط¨ط§ط± ظ¾غŒط´ظ†ظ‡ط§ط¯طŒ ط§ط±ط²/ظ†ط±ط®طŒ طھط®ظپغŒظپطŒ ظ†ط±ط® ط§ط±ط²ط´ ط§ظپط²ظˆط¯ظ‡طŒ
    ط²ظ…ط§ظ† طھط­ظˆغŒظ„طŒ ط´ط±ط§غŒط· ظ¾ط±ط¯ط§ط®طھطŒ ط¯ظˆط±ظ‡ظ” طھط¶ظ…غŒظ†طŒ ط§ظ…طھغŒط§ط² ظپظ†غŒطŒ ط¨ط±ظ†ط¯ظ‡) + `QuotationLine` (ظ‚غŒظ…طھ ظˆط§ط­ط¯طŒ طھط®ظپغŒظپطŒ
    ط²ظ…ط§ظ† طھط­ظˆغŒظ„طŒ ط§ظ†ط·ط¨ط§ظ‚ ظپظ†غŒط› ظ…ط¨ظ„ط؛ ط¯ط± `save()` ظ…ط­ط§ط³ط¨ظ‡ ظ…غŒâ€Œط´ظˆط¯).
  - **ظ¾غŒط´â€Œظپط§ع©طھظˆط±:** `ProformaInvoice` + `ProformaInvoiceLine` ط¨ط§ طھط¨ط¯غŒظ„ ظ…ط³طھظ‚غŒظ… ط¨ظ‡ `PurchaseInvoice`
    (`POST /api/procurement/proforma-invoices/{id}/convert/`).
  - **طھط¶ط§ظ…غŒظ† ط®ط±غŒط¯:** `ProcurementGuarantee` (ط´ط±ع©طھ ط¯ط± ط§ط³طھط¹ظ„ط§ظ…/ط­ط³ظ† ط§ظ†ط¬ط§ظ… طھط¹ظ‡ط¯ط§طھ/ظ¾غŒط´â€Œظ¾ط±ط¯ط§ط®طھ/ط­ط³ظ† ظ¾ط±ط¯ط§ط®طھ/
    ط¯ظˆط±ظ‡ظ” طھط¶ظ…غŒظ†ط› ط§ط¨ط²ط§ط± ع†ع©/ط³ظپطھظ‡/ط¶ظ…ط§ظ†طھâ€Œظ†ط§ظ…ظ‡/ظˆط¬ظ‡ ظ†ظ‚ط¯) + `ProcurementGuaranteeAction`ط› ط§ط¹طھط¨ط§ط± ط¨ط§ ظ‡ظ…ط§ظ†
    `contracts.guarantee_validity` (ع†ع© = غµ ط³ط§ظ„ ط§ط² طµط¯ظˆط±) ظˆ ط§ع©ط´ظ† `POST .../procurement-guarantees/{id}/action/`
    ظˆ ع¯ط²ط§ط±ط´ `GET .../procurement-guarantees/overview/`.
  - **ظ¾ط±ط¯ط§ط®طھ ظˆ ط§ط³ظ†ط§ط¯:** `PurchasePaymentAllocation` (طھط®طµغŒطµ ظ¾ط±ط¯ط§ط®طھ ط¨ظ‡ ظپط§ع©طھظˆط±/ظ¾غŒط´â€Œظپط§ع©طھظˆط± ط¨ط§ ط¨ط§ط²ظ…ط­ط§ط³ط¨ظ‡ظ”
    `paid_amount` ظˆ `payment_status`) ظˆ `ProcurementDocument` (ظ¾غŒظˆط³طھ ط§ط³طھط¹ظ„ط§ظ…/ظ¾غŒط´ظ†ظ‡ط§ط¯/ظ¾غŒط´â€Œظپط§ع©طھظˆط±/ظپط§ع©طھظˆط±/
    طھط¶ظ…غŒظ† ط¨ط§ `file_url` ظ…ط·ظ„ظ‚).
  - **ط؛ظ†غŒâ€Œط³ط§ط²غŒ ظ…ظˆط¬ظˆط¯:** `Item` (ظ…ط´ط®طµط§طھ ظپظ†غŒطŒ ظ‚غŒظ…طھ ط§ط³طھط§ظ†ط¯ط§ط±ط¯طŒ ط­ط¯ط§ظ‚ظ„ ط³ظپط§ط±ط´طŒ ط³ط§ط²ظ†ط¯ظ‡طŒ ظ¾ط§ط±طھâ€Œظ†ط§ظ…ط¨ط±)طŒ
    `PurchaseOrder` (ظ¾غŒط´ظ†ظ‡ط§ط¯ ظ…ط¨ط¯ط£طŒ ط§ط±ط²طŒ ظ†ط±ط®)طŒ `PurchaseInvoice` (ط§ط±ط²طŒ ظ†ط±ط®طŒ ظ†ط±ط® ط§ط±ط²ط´ ط§ظپط²ظˆط¯ظ‡طŒ ظˆط¶ط¹غŒطھ ظ¾ط±ط¯ط§ط®طھ).
  - **API:** `/api/procurement/inquiries/` (+`comparison/`طŒ `award/`طŒ `add_suppliers/`)طŒ
    `/quotations/`طŒ `/proforma-invoices/` (+`convert/`)طŒ `/procurement-guarantees/` (+`action/`طŒ `overview/`)طŒ
    `/payment-allocations/`طŒ `/procurement-documents/`.
  - ظ…ط­ط§ط³ط¨ط§طھ ط¯ط± `procurement/pricing.py` (ط®ط§ظ„طµ): `line_amount`طŒ `document_totals`طŒ `payment_status_of`طŒ
    `compare_quotations` (ظ…ط§طھط±غŒط³ ظ‚غŒظ…طھ ظ‡ط± ط³ط·ط± + ط±طھط¨ظ‡â€Œط¨ظ†ط¯غŒ + ظ¾غŒط´ظ†ظ‡ط§ط¯ ط¨ط±ظ†ط¯ظ‡ ط¨ط§ ظ†ط§ط¯غŒط¯ظ‡â€Œع¯ط±ظپطھظ† ط±ط¯â€Œط´ط¯ظ‡â€Œظ‡ط§).
  - طھط³طھ: `procurement/tests_inquiry.py` (غ¹ طھط³طھ DB-free) â€” ط³ط¨ط².
- **ط®ط±غŒط¯ ظˆ طھط¯ط§ط±ع©ط§طھ â€” ظپط±ط§ظ†طھâ€Œط§ظ†ط¯ ظ…ط±ط­ظ„ظ‡ظ” ط§ظˆظ„ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `pages/procurement/procurementUi.jsx` (ط§ط¨ط²ط§ط± ظ…ط´طھط±ع©:
  `useList`طŒ `SectionShell`طŒ `SimpleTable`طŒ `DialogShell`طŒ `Field`طŒ `FormGrid`طŒ `StatusChip`طŒ `money/dateLabel`طŒ
  ط±ظ†ع¯â€Œظ‡ط§غŒ ظ…ط§عکظˆظ„) + ط¯ظˆ طµظپط­ظ‡ظ” ع©ط§ظ…ظ„:
  - `ProcurementInquiriesPage` (ظ…ط³غŒط± `/procurement/inquiries`): ظپظ‡ط±ط³طھ ط§ط³طھط¹ظ„ط§ظ… ط¨ط§ ط¬ط³طھâ€Œظˆط¬ظˆ/ظپغŒظ„طھط± ظˆط¶ط¹غŒطھطŒ
    ط´ظ…ط§ط±ط´ ظ¾غŒط´ظ†ظ‡ط§ط¯ظ‡ط§طŒ ط¨ط±ط¢ظˆط±ط¯ ع©ظ„ ظˆ **ظپط±ظ… ط«ط¨طھ ط§ط³طھط¹ظ„ط§ظ… ع†ظ†ط¯ط³ط·ط±غŒ** (ط´ط±ط­طŒ ظ…ط´ط®طµط§طھ ظپظ†غŒطŒ ظ…ظ‚ط¯ط§ط±طŒ ظ‚غŒظ…طھ ظ‡ط¯ظپ + ط¨ط±ط¢ظˆط±ط¯ ط²ظ†ط¯ظ‡).
  - `ProcurementInquiryComparisonPage` (ظ…ط³غŒط± `/procurement/inquiries/:id/comparison`): **ظ…ط§طھط±غŒط³ ظ…ظ‚ط§غŒط³ظ‡ظ”
    ظ¾غŒط´ظ†ظ‡ط§ط¯ظ‡ط§** (ط³ط·ط± ط§ط³طھط¹ظ„ط§ظ… أ— طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡طŒ ط¨ط±ط¬ط³طھظ‡â€Œط³ط§ط²غŒ ط§ط±ط²ط§ظ†â€Œطھط±غŒظ† ظ‚غŒظ…طھ ظ‡ط± ط³ط·ط±طŒ ط±طھط¨ظ‡ ظˆ ط¬ظ…ط¹ ظ‡ط± ظ¾غŒط´ظ†ظ‡ط§ط¯)طŒ
    **ط«ط¨طھ ظ¾غŒط´ظ†ظ‡ط§ط¯** (طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡طŒ ط§ط¹طھط¨ط§ط±طŒ ط²ظ…ط§ظ† طھط­ظˆغŒظ„طŒ ظ†ط±ط® ط§ط±ط²ط´ ط§ظپط²ظˆط¯ظ‡ ظˆ ظ‚غŒظ…طھ ظ‡ط± ط³ط·ط±) ظˆ **ط§ظ†طھط®ط§ط¨ ط¨ط±ظ†ط¯ظ‡**.
  - ظ…ظ†ظˆ: ط¢غŒطھظ… آ«ط§ط³طھط¹ظ„ط§ظ…â€Œظ‡ط§ (RFQ)آ» ط¯ط± ع¯ط±ظˆظ‡ آ«ع†ط±ط®ظ‡ظ” ط®ط±غŒط¯آ» (`menuConfig.js`)ط› ظ…ط³غŒط±ظ‡ط§ ط¯ط± `AppRoutes.jsx`.
  - **ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ (ع¯ط§ظ… ط¨ط¹ط¯):** طµظپط­ط§طھ ظ¾غŒط´â€Œظپط§ع©طھظˆط± (ظپظ‡ط±ط³طھ/ظپط±ظ…/طھط¨ط¯غŒظ„ ط¨ظ‡ ظپط§ع©طھظˆط±)طŒ طھط¶ط§ظ…غŒظ† ط®ط±غŒط¯ (ظپظ‡ط±ط³طھ + KPI ط§ط²
    `overview/` + ط§ظ‚ط¯ط§ظ…ط§طھ)طŒ طھط®طµغŒطµ ظ¾ط±ط¯ط§ط®طھطŒ ظˆ ظ¾ط±ظˆظ†ط¯ظ‡ظ” ط®ط±غŒط¯ ط¨ط§ طھط¨â€Œظ‡ط§ط› ط³ظ¾ط³ ط§طھطµط§ظ„ ط¯ع©ظ…ظ‡ظ” آ«ع†ط§ظ¾آ» ط¨ظ‡ ظ…ظˆطھظˆط± ع†ط§ظ¾
    (`document:'voucher'`/`custom`) ط¨ط±ط§غŒ ط§ط³طھط¹ظ„ط§ظ… ظˆ ظ¾غŒط´â€Œظپط§ع©طھظˆط±.
  - **ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ (ع¯ط§ظ… ط¨ط¹ط¯):** ظپط±ط§ظ†طھâ€Œط§ظ†ط¯ ظ…ط§عکظˆظ„ (ط¯ط§ط´ط¨ظˆط±ط¯ طھط¯ط§ط±ع©ط§طھطŒ ظپظ‡ط±ط³طھ/docs ط§ط³طھط¹ظ„ط§ظ…طŒ ظپط±ظ… ط§ط³طھط¹ظ„ط§ظ…طŒ
    طµظپط­ظ‡ظ” ظ…ظ‚ط§غŒط³ظ‡ظ” ظ¾غŒط´ظ†ظ‡ط§ط¯ظ‡ط§طŒ ظ¾غŒط´â€Œظپط§ع©طھظˆط±طŒ طھط¶ط§ظ…غŒظ†طŒ طھط®طµغŒطµ ظ¾ط±ط¯ط§ط®طھطŒ ظ¾ط±ظˆظ†ط¯ظ‡ظ” ط®ط±غŒط¯ ط¨ط§ طھط¨â€Œظ‡ط§) + ظ…ظ†ظˆغŒ ظ…ط§عکظˆظ„.
- **ظ…ظˆطھظˆط± ع†ط§ظ¾ â€” ط§ط³ظ†ط§ط¯ ط³ط±ظˆط±غŒ ظپغŒط´ ط­ظ‚ظˆظ‚غŒ ظˆ ط³ظ†ط¯ ط®ط²ط§ظ†ظ‡ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `core/print_engine/builders/`
  (`payslip.py`طŒ `voucher.py`) ط¨ط§ ط§ظ„ع¯ظˆغŒ آ«طھط§ط¨ط¹ ط®ط§ظ„طµ ط³ظ†ط¯ + loader ط¯غŒطھط§ط¨غŒط³آ» ط§ط¶ط§ظپظ‡ ط´ط¯ط› ط§ظ†ظˆط§ط¹ ط¬ط¯غŒط¯
  `document:'payslip'` ظˆ `document:'voucher'` (receipt/payment/payment_order/transfer/transaction)
  ط¯ط± `registry`. `SalaryPayslip` ظˆ `TreasuryVoucherDialog` ط¨ظ‡ ط³ظ†ط¯ ط³ط±ظˆط±غŒ ظˆطµظ„ ط´ط¯ظ†ط¯ (ط¨ط§ fallback ظ…ط±ط­ظ„ظ‡â€Œط§غŒ).
- **ط§ط¹طھط¨ط§ط± طھط¶ط§ظ…غŒظ† â€” ع†ع© ظ…ظ†ظ‚ط¶غŒ ظ†ظ…غŒâ€Œط´ظˆط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ظ‚ط§ط¹ط¯ظ‡ظ” ع©ط³ط¨â€Œظˆع©ط§ط± ط¯ط± `contracts/guarantee_validity.py`
  (`guarantee_validity`, `CHECK_VALIDITY_YEARS = 5`) ظ¾غŒط§ط¯ظ‡ ط´ط¯: ط¨ط±ط§غŒ ط§ط¨ط²ط§ط±ظ‡ط§غŒ ع†ع©â€Œظ…ط­ظˆط±
  (`check`, `check_and_guarantee`) آ«ط³ط±ط¢ظ…ط¯ ط§ط¹طھط¨ط§ط±آ» = **طھط§ط±غŒط® طµط¯ظˆط± + غµ ط³ط§ظ„** ظˆ آ«طھط§ط±غŒط® ط³ط±ط±ط³غŒط¯آ» ظپظ‚ط· ظ‡ط´ط¯ط§ط±
  ط¹ظ…ظ„غŒط§طھغŒ ط§ط³طھط› ط¶ظ…ط§ظ†طھâ€Œظ†ط§ظ…ظ‡â€Œظ‡ط§ ظ‡ظ…ط§ظ† `guarantee_expiry_date` ط±ط§ ظ…ظ„ط§ع© ط§ظ†ظ‚ط¶ط§ ط¯ط§ط±ظ†ط¯.
  - `guarantee_status.guarantee_payload` ظˆ `GuaranteeSerializer` ط­ط§ظ„ط§ `valid_until`طŒ `due_date`طŒ
    `due_days`طŒ `days_to_expiry`طŒ `is_expired`طŒ `expiry_kind`طŒ `validity_years`طŒ `is_check` ظ…غŒâ€Œط¯ظ‡ظ†ط¯
    (`days_to_expiry` = ط±ظˆط² طھط§ **ظ¾ط§غŒط§ظ† ط§ط¹طھط¨ط§ط±**). ط²ظ†ط¬غŒط±ظ‡ظ” ظ‡ط´ط¯ط§ط±ظ‡ط§: آ«ط§ط¹طھط¨ط§ط± ظ‚ط§ظ†ظˆظ†غŒ ع†ع© â€¦ ط¨ظ‡ ظ¾ط§غŒط§ظ† ط±ط³غŒط¯ظ‡آ»طŒ
    آ«ط³ط±ط±ط³غŒط¯ ع†ع© â€¦ ع¯ط°ط´طھظ‡ ط§ط³طھط› ط·ط¨ظ‚ ظ‚ط§ظ†ظˆظ† طھط§ â€¦ ظ…ط¹طھط¨ط± ط§ط³طھ (ظ…ظ†ظ‚ط¶غŒ ظ†ط´ط¯ظ‡)آ».
  - ظپط±ط§ظ†طھ: `core/utils/guaranteeValidity.js` (`guaranteeValidity`, `guaranteeIsExpiring`, `addYears`طŒ
    fallback ظ…ط­ظ„غŒ ط¨ط±ط§غŒ ظ¾ط§ط³ط® ظ‚ط¯غŒظ…غŒ/ع©ط´) ط¯ط± `GuaranteesPage`طŒ `ContractGuaranteesMonitorPage`طŒ
    `contracts/ContractGuarantees` ظˆ `ContractProfileTabs` ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯ط› ط³طھظˆظ† ط³ط±ط±ط³غŒط¯ ع†ع©
    آ«ط§ط¹طھط¨ط§ط± طھط§ â€¦آ» ط±ط§ ظ‡ظ… ظ†ط´ط§ظ† ظ…غŒâ€Œط¯ظ‡ط¯. ع†ع©ظگ ط¨ط§ ط³ط±ط±ط³غŒط¯ ظ†ط²ط¯غŒع© ظ‡ظ…ع†ظ†ط§ظ† ط¯ط± ع¯ط±ظˆظ‡ آ«ظ†ط²ط¯غŒع© ط§ظ†ظ‚ط¶ط§آ» ظ…غŒâ€Œظ…ط§ظ†ط¯.
  - ط¯ط§ط¯ظ‡ظ” ط²ظ†ط¯ظ‡ظ” `kpsmi`: ع†ع© #غ³غ¸ (ط³ط±ط±ط³غŒط¯ غ²غ°غ²غµ-غ°غ·-غ²غ°) â†’ `valid_until` غ²غ°غ³غ°-غ°غ·-غ²غ°طŒ `is_expired=false`
    (ظ‚ط¨ظ„ط§ظ‹ آ«ظ…ظ†ظ‚ط¶غŒآ» ظ†ط´ط§ظ† ط¯ط§ط¯ظ‡ ظ…غŒâ€Œط´ط¯). طھط³طھâ€Œظ‡ط§: `contracts/tests_guarantee_validity.py` (غ±غ´) ظˆ
    `__tests__/guaranteeValidity.test.js` (غ±غ°).
- **ظ…ظˆطھظˆط± ع†ط§ظ¾ غŒع©ظ¾ط§ط±ع†ظ‡ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸طŒ ظ…ظ‡ط§ط¬ط±طھ ع©ط§ظ…ظ„):** `core/print_engine/` (components/layout/registry/views) +
  `POST /api/print/preview/`طŒ `GET /api/print/options/` ظˆ ع©ظ„ط§غŒظ†طھ `core/print/`
  (`printEngine.js`طŒ `PrintPreviewDialog`طŒ `PrintButton`طŒ `usePrintDocument`). **ظ‡ظ…ظ‡ظ” غ²غ´ ظپط§غŒظ„ `window.print()`**
  (غ±غ¸ طµظپط­ظ‡ظ” ع¯ط²ط§ط±ط´ + ظپغŒط´ ط­ظ‚ظˆظ‚غŒ + ط¯ظپطھط± طھظپطµغŒظ„غŒ + ط³ظ†ط¯ ط®ط²ط§ظ†ظ‡ + طµظˆط±طھâ€Œظˆط¶ط¹غŒطھ) ط¨ظ‡ `printElement`/`printHtml` ظ…ظ†طھظ‚ظ„ ط´ط¯ظ†ط¯ط›
  ط¯ط± ع†ط§ظ¾طŒ ط¯ع©ظ…ظ‡/طھط¨/ظپغŒظ„طھط±/طµظپط­ظ‡â€Œط¨ظ†ط¯غŒ ط­ط°ظپ ظ…غŒâ€Œط´ظˆظ†ط¯ ظˆ ط¬ط¯ظˆظ„â€Œظ‡ط§غŒ ط¹ط±غŒط¶ ط§ظپظ‚غŒ ع†ط§ظ¾ ظ…غŒâ€Œط´ظˆظ†ط¯. طھط³طھâ€Œظ‡ط§:
  `core/tests_print_engine.py` (غ²غ¶) ظˆ `__tests__/printEngineSmoke.test.js` (غµ) â€” ظپط±ط§ظ†طھ غ³غ± طھط³طھ ط¯ط± غµ ط³ظˆط¦غŒطھ ط³ط¨ط².
- **ظپط§ط² غ´ ظ†ع¯ظ‡ط¯ط§ط´طھâ€Œظ¾ط°غŒط±غŒ ظپط±ط§ظ†طھ (ط§ط¯ط§ظ…ظ‡):** ظˆط¶ط¹غŒطھ ظپظ‡ط±ط³طھ ظ†ط§ظ…ظ‡â€Œظ‡ط§ ط¨ظ‡ ظ‡ظˆع© `useLetterListState.js` ظ…ظ†طھظ‚ظ„ ط´ط¯
  (ظپغŒظ„طھط±ظ‡ط§طŒ ط¬ط³طھâ€Œظˆط¬ظˆغŒ غ³غµغ°msطŒ طµظپط­ظ‡â€Œط¨ظ†ط¯غŒطŒ ظ…ط±طھط¨â€Œط³ط§ط²غŒطŒ ظ¾ط§ط±ط§ظ…طھط±ظ‡ط§غŒ ط³ط±ظˆط±طŒ `?q`/`?has_attachments`/`?new=1`) ظˆ
  `CorrespondenceLettersPage.jsx` ظپظ‚ط· UI ظ…ط§ظ†ط¯. ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ظ” ط§غŒظ† ظپط§ط²: ط§ط³طھط®ط±ط§ط¬ ع©ط´ظˆغŒ ط¬ط²ط¦غŒط§طھ
  (`correspondenceLetterDetails.jsx`) ظˆ ظ‡ظˆع© `useLetterMutations` (ظ‡ط¯ظپ: ~غ¹غ°غ° ط®ط·).
- **ظپط§ط² غ´ ظ…ع©ط§طھط¨ط§طھ â€” ع©ط´ظˆغŒ ط¬ط²ط¦غŒط§طھ ظˆ ظ‡ظˆع© ظ†ظˆط´طھظ† ط¬ط¯ط§ ط´ط¯ظ†ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** `CorrespondenceLettersPage.jsx`
  ط§ط² **غ±ظ¬غ·غ¸غµ ط¨ظ‡ غ±ظ¬غ±غ·غ´ ط®ط·** ط±ط³غŒط¯ (غ³غ´ظھ ع©ظ…طھط±) ظˆ ط¯ظˆ ظ…ط§عکظˆظ„ طھط§ط²ظ‡ ع¯ط±ظپطھ:
  - `correspondenceLetterDetails.jsx` (غ´غ´غ³ ط®ط·): `LetterDetailsDialog` â€” ظ‡ظ…ط§ظ† ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ†ط§ظ…ظ‡ ط¨ط§ ظ‡ط¯ط±طŒ طھط¨â€Œظ‡ط§غŒ
    ظ…ط´ط®طµط§طھ/ط§ط±ط¬ط§ط¹ط§طھ/ظ¾غŒظˆط³طھâ€Œظ‡ط§/طھط§ط±غŒط®ع†ظ‡طŒ ط¢ظ¾ظ„ظˆط¯ ظˆ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ظˆ ط­ط°ظپ ظ¾غŒظˆط³طھطŒ ط«ط¨طھ غŒط§ط¯ط¯ط§ط´طھ ظˆ آ«ط«ط¨طھ ظ¾ط§ط³ط® ظˆ ظ†طھغŒط¬ظ‡آ».
    **ع©ط§ظ…ظ„ط§ظ‹ ظ¾ط±ط§ظ¾â€Œظ…ط­ظˆط± ط§ط³طھ** (ط¨ط¯ظˆظ† state ظ…ط­ظ„غŒ): `onAction(name, payload)` ظ…ط«ظ„ `onAction('register')`طŒ
    `onOpen/onClose/onTabChange/onEdit/onPrint/onRefer/onCompleteReferral/onPreview/onUpload/onDeleteAttachment`
    ظˆ `canEditOf/canCreateOf/canDeleteOf` â†’ ظ‡ظ…ط§ظ† ظ¾ط±ظˆظ†ط¯ظ‡ ط±ط§ ظ…غŒâ€Œطھظˆط§ظ† ط¯ط± آ«طھط¨ ظ…ع©ط§طھط¨ط§طھ ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯آ» ظ‡ظ… ط±ظ†ط¯ط± ع©ط±ط¯.
  - `useLetterMutations.js` (غ³غ³غ° ط®ط·): ظ‡ظ…ظ‡ظ” ظ…ط³غŒط±ظ‡ط§غŒ ظ†ظˆط´طھظ† â€” ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§غŒ ط±ط¯غŒظپâ€Œظ‡ط§ (`EDITABLE_FIELDS`,
    `seedLetterDraft`, `buildLetterPatch`, drafts/savingIds/bulkSavingطŒ `saveRowEdit`/`saveAllEdits`),
    `letterAction` (ط«ط¨طھ/ط§ط±ط¬ط§ط¹/ظ¾ط§ط³ط®/ط¨ط³طھظ†/ط¨ط§غŒع¯ط§ظ†غŒ/غŒط§ط¯ط¯ط§ط´طھ)طŒ `referralComplete`, `deleteLetter`,
    `deleteAttachment` ظˆ `uploadAttachment` (+`uploading`/`uploadRef`) ظˆ `refreshAll`.
    ظˆط±ظˆط¯غŒâ€Œظ‡ط§: `letters`, `qc`, `refreshList/refreshStats/refreshReferrals`, `setError/setToast/setComment/
    setDrawerLetter/setCompleteReferral`, `activeLetterId`, `canEditOf`.
  - ظ†ع©طھظ‡ظ” ط¯ط§ظ…: `refetch`ظ‡ط§غŒ طµظپط­ظ‡ `refetchStats`/`refetchReferrals` ظ†ط§ظ… ط¯ط§ط±ظ†ط¯ (ظ†ظ‡ `refreshâ€¦`) ظˆ
    `editRowId` ظ‡ظ… ط¨ط§غŒط¯ ط§ط² ظ‡ظˆع© destructure ط´ظˆط¯ط› `handleRowClick`/`handleRowDoubleClick` (ع©ظ„غŒع© طھع©غŒ = ظ¾ط±ظˆظ†ط¯ظ‡طŒ
    ط¯ظˆط¨ط§ط± = ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§) ط¯ط± طµظپط­ظ‡ ظ…ط§ظ†ط¯ظ†ط¯ ظˆ ط§ط² `editRowId`/`startRowEdit` ظ‡ظˆع© ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯.
  - ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ: `npx react-scripts test --testPathPattern=correspondence` â†’ **غ²غ± طھط³طھ / غ² ط³ظˆط¦غŒطھ ط³ط¨ط²**ط›
    `npm run build` ط¨ط§ `PUBLIC_URL=/assets` = آ«Compiled successfullyآ»ط› ESLint (`no-undef`) ط¨ط¯ظˆظ† ط®ط·ط§ ظˆ
    ظ‡ط´ط¯ط§ط±ظ‡ط§غŒ ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ ظ‡ظ…ط§ظ† غµ ظ‡ط´ط¯ط§ط± ظ‚ط¨ظ„غŒ HEAD ط§ط³طھ (غ¸ â†’ غµ).
- **Data (tenant `kpsmi`):** غ¶ظ¬غ²غ´غ¶ ظ†ط§ظ…ظ‡ آ· غ³ظ¬غ¸غ¸غ¶ ظ†ط§ظ…ظ‡ ط¨ط§ ظ¾غŒظˆط³طھ (غµظ¬غ¸غ¸غ´ ظپط§غŒظ„طŒ ~غ¸.غµGB ط¯ط± `media/archive/company_1/correspondences`) آ· غ´ظ¬غ°غ¹غ¶ ط§ط±ط¬ط§ط¹ آ· DMS: غµظ¬غ¸غ¸غ´ ط³ظ†ط¯ ط§غŒظ†ط¯ع©ط³â€Œط´ط¯ظ‡ ظˆ ~غ¹.غ¶GB.
- ظ…ط§عکظˆظ„ ظ…ع©ط§طھط¨ط§طھ ع©ط§ظ…ظ„ ط§ط³طھ: ط¯ظپطھط± ظˆط§ط±ط¯ظ‡/طµط§ط¯ط±ظ‡/ط¯ط§ط®ظ„غŒطŒ ط§ط±ط¬ط§ط¹ ع†ظ†ط¯ط³ط·ط­غŒ + ع©ط§ط±طھط§ط¨ظ„طŒ ظ¾غŒظˆط³طھ ط¨ط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´طŒ **طµظپط­ظ‡ظ” ظ…ط³طھظ‚ظ„ ظ†ع¯ط§ط´طھ ظ†ط§ظ…â€Œظ‡ط§**طŒ طھط¨ ظ…ع©ط§طھط¨ط§طھ ظ¾ط±ظˆظ†ط¯ظ‡ظ” ظ‚ط±ط§ط±ط¯ط§ط¯طŒ ط¯ط§ط´ط¨ظˆط±ط¯ ط§ط³طھظˆط¯غŒظˆغŒغŒطŒ ط¬ط³طھâ€Œظˆط¬ظˆغŒ ط¬ط§ظ…ط¹طŒ ط¨ط§غŒع¯ط§ظ†غŒ ظ…ط§عکظˆظ„ ط¯ط± طھظ†ط¸غŒظ…ط§طھ ظˆ ظ…ط¯غŒط±غŒطھ ط§ط³ظ†ط§ط¯.
  - **ط¯غŒط§ظ„ظˆع¯ ط¯ط±ط¬ ظ†ط§ظ…ظ‡ظ” ظˆط§ط±ط¯ظ‡ (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** ظپغŒظ„ط¯ظ‡ط§غŒ آ«ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡ظ” ظˆط±ظˆط¯ / ظ†ط§ظ… ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡طŒ ط³ط±غŒ ط´ظ…ط§ط±ظ‡â€Œع¯ط°ط§ط±غŒطŒ طھط±ظ†ط³ظ…غŒطھط§ظ„طŒ
    ط´ظ…ط§ط±ظ‡ ط§ظ†ط¯غŒع©ط§طھظˆط±طŒ ط´ظ…ط§ط±ظ‡ ظ†ط§ظ…ظ‡ ط·ط±ظپ ظ…ظ‚ط§ط¨ظ„طŒ ط³ظ…طھ ط§ط±ط³ط§ظ„â€Œع©ظ†ظ†ط¯ظ‡طŒ ط´ظ…ط§ط±ظ‡ ط¨ط§غŒع¯ط§ظ†غŒطŒ طھظ†ط¸غŒظ…â€Œع©ظ†ظ†ط¯ظ‡ ظˆ ظ†ط§ظ… طھظ†ط¸غŒظ…â€Œع©ظ†ظ†ط¯ظ‡آ»
    **ط­ط°ظپ** ط´ط¯ظ†ط¯ط› ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡ظ” ظˆط±ظˆط¯ ط§ط² ط·ط±غŒظ‚ آ«طھط­ظˆغŒظ„â€Œط¯ظ‡ظ†ط¯ظ‡ (ظ¾ط±ط³ظ†ظ„)آ» غŒط§ آ«ظ†ط§ظ… طھط­ظˆغŒظ„â€Œط¯ظ‡ظ†ط¯ظ‡ (ط®ط§ط±ط¬ ط§ط² ط³ط§ظ…ط§ظ†ظ‡)آ» ط«ط¨طھ ظ…غŒâ€Œط´ظˆط¯.
    آ«ظپط±ط³طھظ†ط¯ظ‡آ» ظ†ظˆط¹ ط¯ط§ط±ط¯: **ظ¾ط±ط³ظ†ظ„** غŒط§ **ط´ط±ع©طھ/ط·ط±ظپ ط­ط³ط§ط¨ (ظ…ط¯غŒط±غŒطھ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§)**ط› آ«ظ‚ط±ط§ط±ط¯ط§ط¯ ظ…ط±طھط¨ط·آ» ط¨ط§ ط§ظ†طھط®ط§ط¨ ط§ط²
    `/external-contracts/` (FK ط¬ط¯غŒط¯ `Letter.contract`طŒ ظ…ط§غŒع¯ط±غŒط´ظ† `0018`) ظˆ ط¨ط®ط´ آ«ط·ط±ظپغŒظ† ظ…ع©ط§طھط¨ظ‡آ» ع†غŒط¯ظ…ط§ظ† ط¯ظˆط³طھظˆظ†غŒ ظپط´ط±ط¯ظ‡ ط¯ط§ط±ط¯.
    ظ¾غŒط´â€Œظپط±ط¶ ظ†ط§ظ…ظ‡â€Œظ‡ط§غŒ ظˆط§ط±ط¯ظ‡: ع¯غŒط±ظ†ط¯ظ‡ = **ظ…ظ‡ط¯غŒظ‡ ط¬ظ…ط´غŒط¯ظ†غŒط§** ظˆ ظ…ط®ط§ط·ط¨ = **ظ…ط±طھط¶غŒ ط§ط³ط¯ظ†عکط§ط¯** (ط§ع¯ط± ظ†ط¨ظˆط¯طŒ غŒع©â€Œط¨ط§ط± ط¨ط§
    `POST /correspondents/` ط³ط§ط®طھظ‡ ظ…غŒâ€Œط´ظˆط¯).
  - **ظ†ظ…ط§غŒ ط¬ط²ط¦غŒط§طھ ظˆ ط±ط¯غŒظپâ€Œظ‡ط§غŒ ظپظ‡ط±ط³طھ** ظ‡ظ… ط¨ظ‡ ظ‡ظ…ط§ظ† ط³ط§ط®طھط§ط± ط¬ط¯غŒط¯ ط¯ط±ط¢ظ…ط¯ظ†ط¯: آ«طھط­ظˆغŒظ„â€Œط¯ظ‡ظ†ط¯ظ‡ / ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡ظ” ظˆط±ظˆط¯آ» (ط¨ط§
    fallback ط§ط² `entered_by_label` ظ‚ط¯غŒظ…غŒ)طŒ ط­ط°ظپ ط§ظ†ط¯غŒع©ط§طھظˆط±/طھط±ظ†ط³ظ…غŒطھط§ظ„/ط´ظ…ط§ط±ظ‡ ط·ط±ظپ ظ…ظ‚ط§ط¨ظ„/ط³ظ…طھ ط§ط±ط³ط§ظ„â€Œع©ظ†ظ†ط¯ظ‡/ط¨ط§غŒع¯ط§ظ†غŒ/طھظ†ط¸غŒظ…â€Œع©ظ†ظ†ط¯ظ‡طŒ
    ظˆ ظ†ظ…ط§غŒط´ آ«ظ‚ط±ط§ط±ط¯ط§ط¯ ظ…ط±طھط¨ط·آ». ط¯ط§ط¯ظ‡ظ” ظ‚ط¯غŒظ…غŒ ط¨ط§ ظ…ط§غŒع¯ط±غŒط´ظ† `0019_backfill_delivered_by` ط¨ظ‡ `delivered_by_name` ظ…ظ†طھظ‚ظ„ ط´ط¯
    (غ³ظ¬غ²غ³غµ ظ†ط§ظ…ظ‡).
- **ط·ط±ظپ ط­ط³ط§ط¨ ط´ط±ع©طھâ€Œظ‡ط§غŒ ط¨ط¯ظˆظ† ظ‚ط±ط§ط±ط¯ط§ط¯ (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** ط§ظ†طھط®ط§ط¨ع¯ط± آ«ط·ط±ظپ ط­ط³ط§ط¨آ» ظˆ آ«ظپط±ط³طھظ†ط¯ظ‡ (ط´ط±ع©طھ)آ» ط¯غŒع¯ط± ط§ط¬ط¨ط§ط±ط§ظ‹
  ط§ط² `ContractParty` ظ†ظ…غŒâ€Œط³ط§ط²ط¯ط› ظ¾غŒط´â€Œظپط±ط¶ طھط§ط²ظ‡ ط§غŒظ† ط§ط³طھ ع©ظ‡ ظ†ط§ظ… ط´ط±ع©طھ **ظپظ‚ط· ط¯ط± ظ…ع©ط§طھط¨ط§طھ** ط«ط¨طھ ط´ظˆط¯:
  - ظپغŒظ„ط¯ ط¬ط¯غŒط¯ `Letter.party_name` (ظ…طھظ† ط¢ط²ط§ط¯) + `Letter.sender_kind` (`employee|party`)ط› ظ…ط§غŒع¯ط±غŒط´ظ†
    `correspondences.0020_letter_party_name`. ط¯ط± ط¯غŒط§ظ„ظˆع¯ ظ†ط§ظ…ظ‡ ط³ظˆغŒغŒع† آ«ط´ط±ع©طھ ط¬ط¯غŒط¯ ط¯ط± ظ…ط¯غŒط±غŒطھ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ ظ‡ظ… ط«ط¨طھ ط´ظˆط¯آ»
    (ط®ط§ظ…ظˆط´ = ظپظ‚ط· ظ…ع©ط§طھط¨ط§طھط› ط±ظˆط´ظ† = ظ‡ظ…ط§ظ† `POST /letters/quick-party/` ظ‚ط¨ظ„غŒ).
  - `PartyPicker` (`correspondenceLookups.jsx`) ظ¾ط±ط§ظ¾ ط¬ط¯غŒط¯ `createInContracts` ع¯ط±ظپطھ: ط®ط§ظ…ظˆط´ â‡’ ظ†ط§ظ… طھط§غŒظ¾â€Œط´ط¯ظ‡
    ط¨ط¯ظˆظ† ط¯ط±ط®ظˆط§ط³طھ ط³ط±ظˆط± ط¨ظ‡â€Œط¹ظ†ظˆط§ظ† ظ…طھظ† ط¢ط²ط§ط¯ ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط¯ط› ط±ظˆط´ظ† â‡’ ط³ط§ط®طھ `ContractParty`.
  - ظ†ع¯ط§ط´طھ ظ†ط§ظ…â€Œظ‡ط§: `matching.iter_name_samples` ط­ط§ظ„ط§ `party_name` ط±ط§ ظ‡ظ… ط¨ط§ ط¯ط§ظ…ظ†ظ‡ظ” `counterparty` ط§ط³ع©ظ† ظ…غŒâ€Œع©ظ†ط¯ ظˆ
    `mapping._apply_party` ظ†ط§ظ…â€Œظ‡ط§غŒ ط¢ط²ط§ط¯ ط±ط§ آ«طھط¹ظ…غŒظ…آ» ظ…غŒâ€Œط¯ظ‡ط¯ (`party_account`/`sender_party` ط±ط§ ط³طھ ظ…غŒâ€Œع©ظ†ط¯).
    ط¯غŒط§ظ„ظˆع¯ ظ†ع¯ط§ط´طھ ط¨ط±ط§غŒ ظ…ظ‚طµط¯ آ«ط·ط±ظپ ط­ط³ط§ط¨آ» ط§ظ…ع©ط§ظ† ط³ط§ط®طھ ط·ط±ظپ ط­ط³ط§ط¨ ط¬ط¯غŒط¯ ط¯ط± ظ…ط¯غŒط±غŒطھ ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ ط±ط§ ط¯ط§ط±ط¯.
  - `party_label`/`SEARCH_FIELDS` ظˆ ط³طھظˆظ† آ«ط·ط±ظپ ط­ط³ط§ط¨/ط·ط±ظپ ظ…ع©ط§طھط¨ظ‡آ» + ط¬ط²ط¦غŒط§طھ ظˆ ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§ ط¨ط§ `party_name` ظ‡ظ…â€Œط®ظˆط§ظ† ط´ط¯ظ†ط¯.
- **ظ‡ظ…ع¯ط§ظ…â€Œط³ط§ط²غŒ ط´غŒطھâ€Œظ‡ط§غŒ طµط§ط¯ط±ظ‡ ط§ط² ط§ع©ط³ظ„ + ظ¾غŒظˆط³طھâ€Œظ‡ط§ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط´غŒطھâ€Œظ‡ط§غŒ آ«ظ†ط§ظ… ظ‡ط§غŒ طµط§ط¯ط±ظ‡آ»طŒ آ«ظ†ط§ظ…ظ‡ طµط§ط¯ط±ظ‡ ظ…ط§ظ„غŒآ»طŒ
  آ«ط§ط±ط³ط§ظ„غŒ ظ‡ط§ ط¨ظ‡ ط¯ط§ظ†ط´ع¯ط§ظ‡آ» ظˆ آ«ط§ظ…ظˆط± ط¨ط§ظ†ع©ط¯ط§ط±غŒ ظ¾ط§ط³ط§ط±ع¯ط§ط¯آ» ط¨ط§ DB ظ…ظ‚ط§غŒط³ظ‡ ط´ط¯ (`source_ref` = `<sheet_code>:<row>`):
  - ط¨ط³طھظ‡ظ” JSON ظ…ط­ظ„غŒ ط§ط² `legacy.iter_legacy_rows` ط³ط§ط®طھظ‡ ظˆ ط±ظˆغŒ ط³ط±ظˆط± ط¯ط§ط®ظ„ `schema_context('kpsmi')` ط¨ط§
    `legacy.import_rows` ظˆط§ط±ط¯ ط´ط¯ â†’ **غ· ظ†ط§ظ…ظ‡ظ” طھط§ط²ظ‡ظ” ط¯ط§ظ†ط´ع¯ط§ظ‡** (ط±ط¯غŒظپ غ·غ¹غ²â€“غ·غ¹غ¸) ظˆ غ· ط±ط¯غŒظپ ظ…ظˆط¬ظˆط¯ ط¨ط§ ظپغŒظ„ط¯ظ‡ط§غŒ ط®ط§ظ„غŒ طھع©ظ…غŒظ„ ط´ط¯ط›
    ط®ط±ظˆط¬غŒ/ظ…ط§ظ„غŒ/ط¨ط§ظ†ع© ع©ط§ظ…ظ„ ط¨ظˆط¯ظ†ط¯ (outgoing 986طŒ finance 13طŒ bank 20).
  - ظ¾غŒظˆط³طھâ€Œظ‡ط§: `scripts/export_letter_attachments.py` ط­ط§ظ„ط§ ع©ظ„غŒط¯ظ‡ط§غŒ ظپط§ط±ط³غŒ ط¨غŒط´طھط±غŒ ظ…غŒâ€Œط´ظ†ط§ط³ط¯
    (`ط´ظ…ط§ط±ظ‡ ط§ط±ط³ط§ظ„غŒ ظ…ط§ظ„غŒ`طŒ `ط¨ط§ط¨طھ`طŒ `طھظˆط¶غŒط­ط§طھ`) ظˆ ط±ط¯غŒظپ ط¨ط¯ظˆظ† ع©ظ„غŒط¯ ظ…طھظ†غŒ ط±ط§ ظ‡ظ… ط¨ط§ `source_ref` ظ…غŒâ€Œظ¾ط°غŒط±ط¯.
    `--fallback-dir` ط¨ط±ط§غŒ ظ…ط³غŒط±ظ‡ط§غŒ ط´ع©ط³طھظ‡ظ” `Z:\Group\Accounting\ظ†ط§ظ…ظ‡ ظ‡ط§ ظˆ ط§ط³ع©ظ† ظ‡ط§` ظˆ `ط§ط¯ط§ط±غŒ\ط¨ط§ظ†ع©` ط§ط³طھظپط§ط¯ظ‡ ط´ط¯.
    ظ†طھغŒط¬ظ‡: **outgoing غ´ ظپط§غŒظ„/غ´ ظ†ط§ظ…ظ‡طŒ bank غ²غ°/غ²غ°طŒ university غ¸غ°غ¸/غ¸غ°غ²** (غ²ظ«غ± ع¯غŒع¯ط§ط¨ط§غŒطھط› غ± ظپط§غŒظ„ ع¯ظ…â€Œط´ط¯ظ‡)ط›
    `relocate_letter_attachments --sync-dms` ظ‡ظ… غ¸غ¶غ± ط³ظ†ط¯ طھط§ط²ظ‡ ط±ط§ ط¯ط± DMS ط§غŒظ†ط¯ع©ط³ ع©ط±ط¯ (ع©ظ„ ظ¾غŒظˆط³طھâ€Œظ‡ط§: غ¶ظ¬غ·غ²غµ).
- **ط´ع©ط³طھظ† طµظپط­ظ‡ظ” ظ…ع©ط§طھط¨ط§طھ ط¨ظ‡ ظ…ط§عکظˆظ„â€Œظ‡ط§غŒ ع©ظˆع†ع© (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - `CorrespondenceLettersPage.jsx` ط§ط² **غ²ظ¬غ¹غ³غ± ط¨ظ‡ غ±ظ¬غ·غµغ´ ط®ط·** ط±ط³غŒط¯ (غ´غ°ظھ ع©ظ…طھط±) ظˆ ع†ظ‡ط§ط± ظ…ط§عکظˆظ„ طھط§ط²ظ‡ ع¯ط±ظپطھ:
    - `correspondenceFormUi.jsx` (غ²غ¶غ· ط®ط·): `FormSection`/`FormTable`/`InfoTable`/`InfoGroup`/`PersianTimeInput`/`CellText` ظˆ ظˆغŒط¬طھâ€Œظ‡ط§غŒ ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§ (`InlineText`/`InlineSelect`/`InlineDate` + `inlineSx`).
    - `correspondenceLetterForm.jsx` (غ¶غ·غ¸ ط®ط·): `LetterFormDialog` + ط«ط§ط¨طھâ€Œظ‡ط§ ظˆ helperظ‡ط§غŒ ظپط±ظ…
      (`EMPTY_LETTER`طŒ `DATE_KEYS`طŒ `cleanPayload` ط¨ط§ `NULLABLE_FIELDS`/`CLEARABLE_TEXT_FIELDS`طŒ
      `ENTRY_METHOD_META`طŒ `DELIVERY_TYPE_META`طŒ `ensureDefaultCorrespondent`طŒ `asList`طŒ `safeDate`).
    - `correspondenceReferDialogs.jsx` (غ±غ·غ¹ ط®ط·): `ReferDialog` + `CompleteReferralDialog` + `REFERRAL_PURPOSE_META`.
    - `correspondenceQueryKeys.js`: ع©ظ„غŒط¯ظ‡ط§غŒ ع©ط´ React Query (`LETTERS_KEY`طŒ `STATS_KEY`طŒ `META_KEY`طŒ `REFERRALS_KEY`طŒ `CONTACTS_KEY`).
  - ط§ظ„ع¯ظˆغŒ ع©ط§ط±: ط§ط³طھط®ط±ط§ط¬ ط¨ط§ ط§ط³ع©ط±غŒظ¾طھ + ع†ع© آ«ط´ظ†ط§ط³ظ‡â€Œظ‡ط§غŒ ط¨ط¯ظˆظ† importآ» (`_check_form_imports`) + ط§ط¬ط±ط§غŒ ط³ظˆط¦غŒطھ
    `correspondence*` ط¨ط¹ط¯ ط§ط² ظ‡ط± ع¯ط§ظ… (ط³ظ‡ ع¯ط§ظ…طŒ ظ‡ط± ط¨ط§ط± غ²غ± طھط³طھ ط³ط¨ط²)ط› importظ‡ط§غŒ ط¨غŒâ€Œط§ط³طھظپط§ط¯ظ‡ ظ‡ظ… ظ¾ط§ع© ط´ط¯ظ†ط¯
    طھط§ ط¨غŒظ„ط¯ CRA ط¨ط§ `CI=true` ظ‡ط´ط¯ط§ط± ظ†ط¯ظ‡ط¯.
  - **ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡:** ع©ط´ظˆغŒ ط¬ط²ط¦غŒط§طھ (ط¨ط®ط´ inline ط¨ط²ط±ع¯ ط¯ط§ط®ظ„ ع©ط§ظ…ظ¾ظˆظ†ظ†طھ) ظˆ ظ‡ظˆع©â€Œظ‡ط§غŒ
    `useLetterListState`/`useLetterMutations` طھط§ طµظپط­ظ‡ ط¨ظ‡ ~غ¹غ°غ° ط®ط· ط¨ط±ط³ط¯.
- **ظ†ع¯ظ‡ط¯ط§ط´طھâ€Œظ¾ط°غŒط±غŒ ظ…ع©ط§طھط¨ط§طھ â€” ط¨ط³طھظ‡ظ” `views/` ظˆ ط³ط¨ع©â€Œط³ط§ط²غŒ `/auth/me` (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - `correspondences/views.py` (غ²ظ¬غ´غ¸غ¹ ط®ط·) ط¨ظ‡ ط¨ط³طھظ‡ظ” `correspondences/views/` ط´ع©ط³طھظ‡ ط´ط¯:
    `base.py` (ظˆط§ط±ط¯ط§طھ/ط«ط§ط¨طھâ€Œظ‡ط§/helperظ‡ط§غŒ ط§ط±ط¬ط§ط¹ + `BaseLetterViewSet`)طŒ `legacy.py`طŒ `letters.py`
    (ط§ظ†ظˆط§ط¹/ط³ط±غŒ/ظ…ط®ط§ط·ط¨غŒظ† + `LetterViewSet`)طŒ `referrals.py`طŒ `attachments.py`طŒ `aliases.py`طŒ `requests.py`.
    `views/__init__.py` ظ‡ظ…ظ‡ظ” ظˆغŒظˆط³طھâ€Œظ‡ط§ ظˆ helperظ‡ط§ ط±ط§ re-export ظ…غŒâ€Œع©ظ†ط¯طŒ ط¨ظ†ط§ط¨ط±ط§غŒظ†
    `from correspondences.views import LetterViewSet` (ظˆ ظ…ط³غŒط± ط±ط´طھظ‡â€Œط§غŒ `dev_query_profile`) ط¨ط¯ظˆظ† طھط؛غŒغŒط± ع©ط§ط± ظ…غŒâ€Œع©ظ†ط¯.
  - `/auth/me`: ظپغŒظ„ط¯ ط¬ط¯غŒط¯ **`is_full_access`** ظˆ `fine_permissions` ظپظ‚ط· ط´ط§ظ…ظ„ ع©ط¯ظ‡ط§غŒ **ط¯ط§ط¯ظ‡â€Œط´ط¯ظ‡**
    (ط¨ط±ط§غŒ ط³ظˆظ¾ط±غŒظˆط²ط±/ط¯ط³طھط±ط³غŒâ€Œع©ط§ظ…ظ„ ط¯غŒع©ط´ظ†ط±غŒ ط®ط§ظ„غŒ) â†’ ظ¾ط§ط³ط® ط§ط² ~غ´غ°â€“غµغ°KB ط¨ظ‡ **غ±ظ«غ´KB** ط±ط³غŒط¯.
    `correspondencePermissions.js` ظ‡ظ… ط¨ط§ `is_full_access` ع©ظˆطھط§ظ‡â€Œظ…غŒâ€Œط´ظˆط¯.
  - طھط³طھ ط¬ط¯غŒط¯ `correspondences/tests_structure.py` (غ±غ° طھط³طھ): ظ†ط¨ظˆط¯ظگ `views.py`طŒ ظˆط¬ظˆط¯ ظ…ط§عکظˆظ„â€Œظ‡ط§طŒ
    import ظ‡ظ…ظ‡ظ” ظˆغŒظˆط³طھâ€Œظ‡ط§/helperظ‡ط§طŒ طµط­طھ `router.registry`طŒ ط³ظ‚ظپ غ±غ°غ°غ° ط®ط· ط¨ط±ط§غŒ ظ‡ط± ظ…ط§عکظˆظ„طŒ ظˆ ط±ظپطھط§ط±
    `/auth/me` (ع©ط¯ظ‡ط§غŒ ط¯ط§ط¯ظ‡â€Œط´ط¯ظ‡/ط¯ط³طھط±ط³غŒ ع©ط§ظ…ظ„/ط³ظˆظ¾ط±غŒظˆط²ط±).
  - **ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ظ” ط§غŒظ† ظپط§ط²:** ط´ع©ط³طھظ† `CorrespondenceLettersPage.jsx` (غ²ظ¬غ¹غ³غ± ط®ط·) ط¨ظ‡
    `LetterFormDialog` + `LetterDetailsDrawer` + `LettersTable` + ظ‡ظˆع©â€Œظ‡ط§غŒ `useLetterListState`/`useLetterMutations`
    (ظˆ ط´غŒط± ع©ط±ط¯ظ† ط¬ط²ط¦غŒط§طھ ط¨ط§ طھط¨ ظ…ع©ط§طھط¨ط§طھ ظ‚ط±ط§ط±ط¯ط§ط¯) ظˆ ط§ظپط²ظˆط¯ظ† طھط³طھâ€Œظ‡ط§غŒ DB-ظ…ط­ظˆط± ط±ظˆغŒ ط³ط±ظˆط±.
- **ط¨ط§ط²ظ†ط´ط³طھع¯غŒ ط§ط³طھع© ظ‚ط¯غŒظ…غŒ ظ…ع©ط§طھط¨ط§طھ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - ط³ظ…طھ ع©ط§ط±ط¨ط±: ظ…ط³غŒط± `/correspondences` ط­ط§ظ„ط§ ط¨ظ‡ `/correspondence` **ط±غŒط¯ط§غŒط±ع©طھ** ظ…غŒâ€Œط´ظˆط¯ ظˆ ط¯ظˆ ظ…ظ†ظˆغŒ
    آ«ظ…ع©ط§طھط¨ط§طھ ط§ط¯ط§ط±غŒآ» (ظ…ط§عکظˆظ„ ظ…ط¯ط§ط±ع©) ظˆ آ«ظ…ع©ط§طھط¨ط§طھآ» (ط§ط±طھط¨ط§ط·ط§طھ ظˆ ط§ط³ظ†ط§ط¯) ط¨ظ‡ `/correspondence` ط§ط´ط§ط±ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯.
    `pages/CorrespondencesPage.jsx` ظˆ ع©ظ„ `modules/correspondences/` (غµ طµظپط­ظ‡ + `shared.jsx`) ط­ط°ظپ ط´ط¯ظ†ط¯.
  - ط³ظ…طھ ط³ط±ظˆط±: ظ¾ظ†ط¬ ظˆغŒظˆط³طھ ظ‚ط¯غŒظ…غŒ (`incoming-letters`طŒ `outgoing-letters`طŒ `announcements`طŒ `forms`طŒ
    `organizational-letters`) ط¨ظ‡ **`ReadOnlyModelViewSet`** طھط¨ط¯غŒظ„ ط´ط¯ظ†ط¯ (ظ†ظˆط´طھظ† = غ´غ°غµ) طھط§ ظ…ط³غŒط± طھع©ط«غŒط±
    `OrganizationDocument` ظˆ ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظ…ظˆط§ط²غŒ ط¨ط³طھظ‡ ط´ظˆط¯ط› ط¯ط§ط¯ظ‡â€Œظ‡ط§ ط¨ط±ط§غŒ طھط§ط±غŒط®ع†ظ‡ ط®ظˆط§ظ†ط¯ظ†غŒ ظ…غŒâ€Œظ…ط§ظ†ظ†ط¯.
    `organizations` طھظ†ظ‡ط§ ظ…ط¯ظ„ ظ‚ط¯غŒظ…غŒ ط§ط³طھ ع©ظ‡ ظ†ظˆط´طھظ† ط¯ط§ط±ط¯ (طھط¨ ظ…ط®ط§ط·ط¨غŒظ†) ظˆ ط¨ط§ `DefinitionPermissionMixin` ع¯غŒطھ ط´ط¯ظ‡.
    ظ…طھط¯ `_set_employees_and_archive` (ع©ظ‡ ط¨ط§ ظ‡ط± ظˆغŒط±ط§غŒط´ غŒع© ط³ظ†ط¯ ط¨ط§غŒع¯ط§ظ†غŒ طھع©ط±ط§ط±غŒ ظ…غŒâ€Œط³ط§ط®طھ) ط­ط°ظپ ط´ط¯.
  - `module_search`: providerظ‡ط§غŒ ظ†ط§ظ…ظ‡ظ” ظ‚ط¯غŒظ…غŒ (Incoming/Outgoing/Announcement) ط­ط°ظپ ط´ط¯ظ†ط¯ط›
    `Organization` ظˆ `Correspondent` ط­ط§ظ„ط§ ط¨ظ‡ `/correspondence/settings?tab=contacts&q=â€¦` ظ…غŒâ€Œط±ظˆظ†ط¯
    (ط¢غŒع©ظˆظ† `contacts` ط¯ط± `CommandPalette.RESULT_ICONS` ط§ط¶ط§ظپظ‡ ط´ط¯).
  - غŒع©ط¯ط³طھâ€Œط³ط§ط²غŒ ط¨ط±ع†ط³ط¨â€Œظ‡ط§: `Letter.party_display` / `sender_display()` / `receiver_display()` ط¯ط± **ظ…ط¯ظ„**
    (ظ…ظ†ط¨ط¹ ظˆط§ط­ط¯) ظˆ serializer/ط§ع©ط³ظ„ ط§ط² ظ‡ظ…ط§ظ† ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯ط› `sender_display(include_employee=False)`
    ط¨ط±ط§غŒ ظپظ‡ط±ط³طھ ط³ط¨ع© طھط§ FK ظ¾ط±ط³ظ†ظ„ ط®ظˆط§ظ†ط¯ظ‡ ظ†ط´ظˆط¯.
  - ظپظ‡ط±ط³طھ ط³ط¨ع©: ع†ظ‡ط§ط± ظپغŒظ„ط¯ ظ…ط±ط¯ظ‡ (`series_title`طŒ `category_color`طŒ `entered_by`طŒ `source_ref`) ط§ط²
    `LetterListSerializer` ط­ط°ظپ ط´ط¯ (ط§ط³ع©ظ† ط®ظˆط¯ع©ط§ط±: طھظ†ظ‡ط§ ظپغŒظ„ط¯ظ‡ط§غŒ ط¨غŒâ€Œظ…طµط±ظپ ظپط±ط§ظ†طھ ط¨ظˆط¯ظ†ط¯).
  - **غŒع©طھط§غŒغŒ ط´ظ…ط§ط±ظ‡ظ” ظ†ط§ظ…ظ‡ ظ…ظ…ع©ظ† ظ†ط´ط¯:** ط¯ط± ط¯ط§ط¯ظ‡ظ” ظˆط§ظ‚ط¹غŒ غ±غ³غµ ع¯ط±ظˆظ‡ `(direction, number)` طھع©ط±ط§ط±غŒ ظˆط¬ظˆط¯ ط¯ط§ط±ط¯
    (ظ…ط«ظ„ط§ظ‹ آ«140405/457آ» ط³ظ‡ ط¨ط§ط±) ظˆ غ±ظ¬غ´غ¹غ¸ ظ†ط§ظ…ظ‡ ط¨ط¯ظˆظ† ط´ظ…ط§ط±ظ‡ ط§ط³طھط› ط§ظپط²ظˆط¯ظ† `UniqueConstraint` ط¨ط¯ظˆظ† ظ¾ط§ع©â€Œط³ط§ط²غŒ
    ط¯ط§ط¯ظ‡ ط¨ط§ط¹ط« ط®ط·ط§غŒ ظ…ط§غŒع¯ط±غŒط´ظ† ظ…غŒâ€Œط´ظˆط¯. طھطµظ…غŒظ…: ط¨ط¯ظˆظ† constraintطŒ ظˆ ظ…طµط±ظپâ€Œع©ظ†ظ†ط¯ظ‡â€Œظ‡ط§ ط¨ظ‡ `series`/`source_ref`
    طھع©غŒظ‡ ع©ظ†ظ†ط¯. (ط¯ط± ط¨ع©â€Œظ„ط§ع¯ ط¨ط§ ظ‡ظ…غŒظ† طھظˆط¶غŒط­ ط«ط¨طھ ط´ط¯.)
  - طھط³طھâ€Œظ‡ط§: غ±غ¹غ¶ طھط³طھ ط¨ع©â€Œط§ظ†ط¯ (ط´ط§ظ…ظ„ آ«ط¨ط±ع†ط³ط¨â€Œظ‡ط§غŒ ظ…ط¯ظ„ ظ…ظ†ط¨ط¹ ظˆط§ط­ط¯ظ†ط¯آ») + غ²غ± طھط³طھ ظپط±ط§ظ†طھط› طھط£غŒغŒط¯ ط²ظ†ط¯ظ‡:
    ظ†ظˆط´طھظ† ط±ظˆغŒ ظ…ط³غŒط±ظ‡ط§غŒ ظ‚ط¯غŒظ…غŒ `405`طŒ ظپظ‡ط±ط³طھ/ط¬ط²ط¦غŒط§طھ `200`طŒ ط¬ط³طھâ€Œظˆط¬ظˆغŒ ظ…ط§عکظˆظ„ `200` ط¨ط§ ظ…ط³غŒط±ظ‡ط§غŒ ط¬ط¯غŒط¯.
- **ع©ط§ط±ط§غŒغŒ ظ…ع©ط§طھط¨ط§طھ â€” ظ†ع¯ط§ط´طھ ع¯ط±ظˆظ‡غŒطŒ ع©ط´ ط¢ظ…ط§ط± ظˆ ط­ط°ظپ N+1 (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - ظ…ظˆطھظˆط± ط§ط¹ظ…ط§ظ„ ظ†ع¯ط§ط´طھ ط¨ط§ط²ظ†ظˆغŒط³غŒ ط´ط¯ (`mapping.py`): ع©ط´ظگ آ«ظ…ظ‚ط§ط¯غŒط± ط®ط§ظ… ظ…طھظ…ط§غŒط²آ» (`_raw_values`/`_values_matching`)
    ط¨ظ‡â€Œط¬ط§غŒ ط®ظˆط§ظ†ط¯ظ† ع©ظ„ ط¬ط¯ظˆظ„ ط¯ط± ط­ط§ظپط¸ظ‡طŒ ظˆ `queryset.update(...)` ط¨ظ‡â€Œط¬ط§غŒ `bulk_update` ط±ظˆغŒ ظ†ظ…ظˆظ†ظ‡â€Œظ‡ط§.
    ط§ط¹ط¯ط§ط¯ ظˆط§ظ‚ط¹غŒ (غ¶ظ¬غ²غ¶غ¸ ظ†ط§ظ…ظ‡طŒ غ´ظ¬غ±غ±غ± ط§ط±ط¬ط§ط¹طŒ غ³غ¹ ظ†ع¯ط§ط´طھ): `apply_all(dry_run)` = **غ³غ²غµms / غ±غ±غ¸ ع©ظˆط¦ط±غŒ**طŒ
    `apply_batch(scope=counterparty, dry)` = **غ¸غ¸ms / غ²غ¶ ع©ظˆط¦ط±غŒ** (ظ‚ط¨ظ„ط§ظ‹ ظ‡ط± ظ†ع¯ط§ط´طھ طھظ…ط§ظ… ط¬ط¯ظˆظ„ ط±ط§ ط§ط³ع©ظ† ظ…غŒâ€Œع©ط±ط¯).
  - ط§ظ†ط¯ظ¾ظˆغŒظ†طھ ط¬ط¯غŒط¯ `POST /api/correspondence-name-aliases/apply-batch/` ط¨ط§ `{scope}` غŒط§ `{ids}` ظˆ `dry_run`;
    ظپط±ط§ظ†طھ ط¯غŒع¯ط± ط¨ط±ط§غŒ آ«ط§ط¹ظ…ط§ظ„ ط³طھظˆظ† / ط§ط¹ظ…ط§ظ„ ع¯ط±ظˆظ‡ / ظ†ع¯ط§ط´طھ ط³ط±غŒط¹آ» ط­ظ„ظ‚ظ‡ظ” ط¯ط±ط®ظˆط§ط³طھ ظ†ظ…غŒâ€Œط²ظ†ط¯ (غŒع© call).
  - `/api/letters/stats/`: ط¨ط®ط´ ط´ط±ع©طھâ€Œظ…ط­ظˆط± ط¨ط§ ع©ط´ Redis (غ³غ° ط«ط§ظ†غŒظ‡) ظˆ ط¨ط®ط´ آ«ط§ط±ط¬ط§ط¹ط§طھ ظ…ظ†آ» ط¬ط¯ط§ â†’ ط§ط² غ²غ¶ ع©ظˆط¦ط±غŒ ط¨ظ‡
    **غ´ ع©ظˆط¦ط±غŒ ط¯ط± ط­ط§ظ„طھ ع©ط´â€Œط´ط¯ظ‡** (`stats` ط­ط¯ظˆط¯ غµms). `get_queryset` ط¨ط±ط§غŒ `stats`/`export_excel` prefetch ط³ظ†ع¯غŒظ† ظ†ظ…غŒâ€Œع¯غŒط±ط¯.
  - N+1 ط­ط°ظپ ط´ط¯: ط±ظˆغŒط¯ط§ط¯ظ‡ط§غŒ ظ†ط§ظ…ظ‡ ط¨ط§ `Prefetch(...select_related('actor'))` ظˆ ظ¾غŒظˆط³طھâ€Œظ‡ط§ ط¨ط§ `select_related('uploaded_by')`ط›
    ط®ط±ظˆط¬غŒ ط§ع©ط³ظ„ ط¨ط§ `Prefetch` + `select_related('to_user')` (غ²غ°غ° ط±ط¯غŒظپ â‰ˆ غ²غ°غ°ms / غ¶ ع©ظˆط¦ط±غŒ).
  - **ع©ط´ظپ ظ…ظ‡ظ…:** ط§ظˆظ„غŒظ† `reverse()` ظ…ط³غŒط± `letter-attachment-download` ط¯ط± ظ‡ط± worker ~غ°ظ«غ¶ ط«ط§ظ†غŒظ‡ ط·ظˆظ„ ظ…غŒâ€Œع©ط´غŒط¯ ظˆ
    ط³ط§ط®طھ `download_url`/`preview_url` ط¨ط±ط§غŒ ظ‡ط± ظ¾غŒظˆط³طھ ط¯ظˆط¨ط§ط±ظ‡ ط¢ظ† ط±ط§ طµط¯ط§ ظ…غŒâ€Œط²ط¯. ط­ط§ظ„ط§ ظ‚ط§ظ„ط¨ ظ…ط³غŒط± ط¨ط§ `lru_cache`
    غŒع© ط¨ط§ط± ط³ط§ط®طھظ‡ ظˆ ط¯ط± `CorrespondencesConfig.ready()` ع¯ط±ظ… ظ…غŒâ€Œط´ظˆط¯ â†’ ظپظ‡ط±ط³طھ غ²غ° ط±ط¯غŒظپغŒ ط§ط² **غ¸غ·غ³ms ط¨ظ‡ غ²غ·غ¶ms (cold)**
    ظˆ **~غ±غµغ°â€“غ²غµغ°ms (warm)** ط¨ط§ غ±غ° ع©ظˆط¦ط±غŒ ط±ط³غŒط¯.
  - طھط³طھâ€Œظ‡ط§: `correspondences/tests_mapping.py` (غ¹ طھط³طھ: ع©ط´ ظ†ط§ظ…â€Œظ‡ط§طŒ ع©ط´ ظپغŒظ„طھط±ظ‡ط§طŒ ظ…ط§طھط±غŒط³ apply-batchطŒ ظ¾ط°غŒط±ط´ `index` ط¯ط± ظ‡ظ…ظ‡ظ” handlerظ‡ط§)
    ظˆ طھط³طھ ع©ط´â€Œط´ط¯ظ† ط¢ظ…ط§ط± ط¯ط± `tests.py`.
- **ط§ظ…ظ†غŒطھ ظ…ع©ط§طھط¨ط§طھ â€” ظ…ط¬ظˆط² ط±غŒط²طŒ ظ…ط­ط±ظ…ط§ظ†ع¯غŒ ظˆ ط¯ط§ظ†ظ„ظˆط¯ ط§ظ…ظ† (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):**
  - `correspondences/permissions.py` (ط¬ط¯غŒط¯): ع¯غŒطھ per-action + per-direction. ع©ط¯ ط±غŒط² ع©ط§ط±ط¨ط± طھط¹غŒغŒظ†â€Œع©ظ†ظ†ط¯ظ‡ ط§ط³طھط›
    ع©ط§ط±ط¨ط± ط¨ط¯ظˆظ† ع©ط¯ ط±غŒط² (ظ†ظ‚ط´ ظ‚ط¯غŒظ…غŒ) ظ…ط«ظ„ ظ‚ط¨ظ„ ط§ط² `module_action_granted` ط¹ط¨ظˆط± ظ…غŒâ€Œع©ظ†ط¯ طھط§ ع©ط³غŒ ظ‚ظپظ„ ظ†ط´ظˆط¯.
    ظ…غŒع©ط³غŒظ†â€Œظ‡ط§: `CorrespondencePermissionMixin` (ظ†ط§ظ…ظ‡/ط§ط±ط¬ط§ط¹/ظ¾غŒظˆط³طھ/ظ†ع¯ط§ط´طھ/ط¯ط±ط®ظˆط§ط³طھ) ظˆ
    `DefinitionPermissionMixin` (ط§ظ†ظˆط§ط¹/ط³ط±غŒ/ظ…ط®ط§ط·ط¨غŒظ†: ظپظ‚ط· ظˆغŒط±ط§غŒط´ ظˆ ط­ط°ظپ ع¯غŒطھ ط´ط¯ظ‡â€Œط§ظ†ط¯).
    ظ…ط§طھط±غŒط³â€Œظ‡ط§: `LetterViewSet.permission_matrix`طŒ `LetterAttachmentViewSet`طŒ `CorrespondenceNameAliasViewSet`طŒ
    `LetterRequestViewSet`ط› ط§ع©ط´ظ†â€Œظ‡ط§غŒ ط´ط®طµغŒ (`cartable`/`seen`/`note`/`instruction`/`complete`) ط§ط² ع¯غŒطھ ظ…ط§عکظˆظ„
    ظ…ط¹ط§ظپâ€Œط§ظ†ط¯ ظˆ ط®ظˆط¯ط´ط§ظ† آ«ظ…ط§ظ„ظگ ظ…ظ†آ» ط±ط§ ط¨ط±ط±ط³غŒ ظ…غŒâ€Œع©ظ†ظ†ط¯ (`_referral_assigned_to_me` / `_require_referral_access`).
  - ظ…ط­ط±ظ…ط§ظ†ع¯غŒ: `confidential_letter_filter` ط±ظˆغŒ ظپظ‡ط±ط³طھ/ط¬ط²ط¦غŒط§طھ ظ†ط§ظ…ظ‡طŒ ط§ط±ط¬ط§ط¹ط§طھطŒ ظ¾غŒظˆط³طھâ€Œظ‡ط§ ظˆ ع©ط§ط±طھط§ط¨ظ„ ط§ط¹ظ…ط§ظ„ ظ…غŒâ€Œط´ظˆط¯
    (ظ…ط­ط±ظ…ط§ظ†ظ‡/ط³ط±غŒ ظپظ‚ط· ط¨ط±ط§غŒ ط³ط§ط²ظ†ط¯ظ‡طŒ طھظ†ط¸غŒظ…â€Œع©ظ†ظ†ط¯ظ‡طŒ ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡طŒ ط§ط±ط¬ط§ط¹â€Œط´ط¯ع¯ط§ظ† ظˆ ط¯ط§ط±ظ†ط¯ع¯ط§ظ† `approve`).
  - ط¢ظ¾ظ„ظˆط¯ ط§ظ…ظ†: `correspondences/uploads.py` â€” ظˆط§غŒطھâ€Œظ„غŒط³طھ ظ¾ط³ظˆظ†ط¯طŒ ط³ظ‚ظپ ط­ط¬ظ…
    (`CORRESPONDENCE_ATTACHMENT_MAX_MB`طŒ ظ¾غŒط´â€Œظپط±ط¶ غµغ°MB)طŒ ظ†ط§ظ…â€Œع¯ط°ط§ط±غŒ ظ¾ط§ع©â€Œط³ط§ط²غŒâ€Œط´ط¯ظ‡ط›
    `.html/.svg/.js/...` ط±ط¯ ظ…غŒâ€Œط´ظˆظ†ط¯. ط­ط°ظپ ظ†ط§ظ…ظ‡/ظ¾غŒظˆط³طھ ط­ط§ظ„ط§ ظپط§غŒظ„ ط¯غŒط³ع© ط±ط§ ظ‡ظ… ظ¾ط§ع© ظ…غŒâ€Œع©ظ†ط¯.
  - ط¯ط§ظ†ظ„ظˆط¯ ط¨ط§ ط§ط­ط±ط§ط² ظ‡ظˆغŒطھ: `GET /api/letter-attachments/{id}/download/?t=<token>&inline=1`
    (`correspondences/downloads.py`طŒ طھظˆع©ظ† ط§ظ…ط¶ط§ط´ط¯ظ‡ظ” غ±غ² ط³ط§ط¹طھظ‡) â€” ع†ظˆظ† iframe/img ظ‡ط¯ط± JWT ظ†ظ…غŒâ€Œظپط±ط³طھط¯.
    ظ…ط­ط±ظ…ط§ظ†ع¯غŒ ظˆ ظ…ط¬ظˆط² آ«ظ…ط´ط§ظ‡ط¯ظ‡آ» ط¯ط± ظ„ط­ط¸ظ‡ظ” ط¯ط§ظ†ظ„ظˆط¯ ط¯ظˆط¨ط§ط±ظ‡ ط¨ط±ط±ط³غŒ ظ…غŒâ€Œط´ظˆط¯ط› `inline` ظپظ‚ط· ط¨ط±ط§غŒ PDF/طھطµظˆغŒط±.
    serializerظ‡ط§ `download_url`/`preview_url` ظ…غŒâ€Œط¯ظ‡ظ†ط¯ ظˆ UI ط§ط² ط¢ظ†â€Œظ‡ط§ ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ط¯.
  - ظپط±ط§ظ†طھ: `core/utils/correspondencePermissions.js` (ط¢غŒظ†ظ‡ظ” ط¨ع©â€Œط§ظ†ط¯) â†’ ط¯ع©ظ…ظ‡â€Œظ‡ط§غŒ ط«ط¨طھ/ظˆغŒط±ط§غŒط´/ط­ط°ظپ/ط§ط±ط¬ط§ط¹/ط®ط±ظˆط¬غŒ
    ظˆ ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§ ظˆ ظ†ع¯ط§ط´طھ ظ†ط§ظ…â€Œظ‡ط§ ط¨ط§ ظ‡ظ…ط§ظ† ع©ط¯ظ‡ط§ ظپط¹ط§ظ„/ط؛غŒط±ظپط¹ط§ظ„ ظ…غŒâ€Œط´ظˆظ†ط¯ط› ظ…ظ†ظˆظ‡ط§ ظ‡ظ… ط¨ط§
    `getMenuForApp(slug, { permissions })` ظپغŒظ„طھط± ظ…غŒâ€Œط´ظˆظ†ط¯ (ظپظ‚ط· ظˆظ‚طھغŒ ع©ط§ط±ط¨ط± ع©ط¯ ط±غŒط² ط¢ظ† ظ…ط§عکظˆظ„ ط±ط§ ط¯ط§ط±ط¯).
  - ط±ظپط¹ ط¨ط§ع¯â€Œظ‡ط§: ط®ط§ظ„غŒâ€Œع©ط±ط¯ظ† ظپغŒظ„ط¯ظ‡ط§ ط¯ط± ط¯غŒط§ظ„ظˆع¯ ظˆغŒط±ط§غŒط´ (`cleanPayload(form, {editing})`)طŒ ط¢ظ¾ظ„ظˆط¯ ظ…ظˆط§ط²غŒ ظ¾غŒظˆط³طھ ط¨ط§
    ع¯ط²ط§ط±ط´ ط®ط·ط§غŒ ظ‡ط± ظپط§غŒظ„طŒ ظˆ ط´ظ…ط§ط±ظ†ط¯ظ‡â€Œظ‡ط§غŒ ع©ط§ط±طھط§ط¨ظ„ ط¯ط± **غŒع© ع©ظˆط¦ط±غŒ** (ظ‚ط¨ظ„ط§ظ‹ غ±غ° ع©ظˆط¦ط±غŒطŒ ظ‡ط± غ³غ° ط«ط§ظ†غŒظ‡ ط§ط² ط³ط§غŒط¯ط¨ط§ط±).
  - nginx: ط¨ط±ط§غŒ `/media/` ظ‡ط¯ط±ظ‡ط§غŒ `X-Content-Type-Options: nosniff` ظˆ CSP ط§ط¶ط§ظپظ‡ ط´ط¯ ظˆ ظ¾ط³ظˆظ†ط¯ظ‡ط§غŒ ط§ط¬ط±ط§غŒغŒ
    (`html/svg/js/xml/css/...`) ط¨ط§ `Content-Disposition: attachment` ط³ط±ظˆ ظ…غŒâ€Œط´ظˆظ†ط¯ (ط¨ط³طھظ† ظ…ط³غŒط± XSS ط°ط®غŒط±ظ‡â€Œط´ط¯ظ‡).
  - طھط³طھâ€Œظ‡ط§: `correspondences/tests_permissions.py` (غ´غ° طھط³طھ: ظ…ط¬ظˆط²/ط¬ظ‡طھ/ظ…ط­ط±ظ…ط§ظ†ع¯غŒ/ط¢ظ¾ظ„ظˆط¯/طھظˆع©ظ†/ظ…ط§طھط±غŒط³) +
    طھط³طھ ظپط±ط§ظ†طھ آ«ع©ط§ط±ط¨ط± ظپظ‚ط·-ظ…ط´ط§ظ‡ط¯ظ‡آ». طھط£غŒغŒط¯ ط²ظ†ط¯ظ‡ ط±ظˆغŒ ط³ط±ظˆط±: `list/stats/export=200`طŒ
    `create/patch/refer/alias=403`طŒ `create` ظ¾ط³ ط§ط² ط¯ط§ط¯ظ† ظ…ط¬ظˆط² `=201`طŒ ط¯ط§ظ†ظ„ظˆط¯ ط¨ط§ طھظˆع©ظ† `=200` ظˆ ط¨ط¯ظˆظ†/ط¨ط§ طھظˆع©ظ† ط¨ط¯ `=403`.
- **ط¨ط±ط§ط¨ط±غŒ طµظپط­ظ‡ظ” طµط§ط¯ط±ظ‡ ط¨ط§ ظˆط§ط±ط¯ظ‡ (غ²غ°غ²غ¶-غ±غ±-غ°غ¸):** ط¯غŒط§ظ„ظˆع¯ ظ†ط§ظ…ظ‡ ط¬ظ‡طھâ€Œط¢ع¯ط§ظ‡ ط´ط¯: ط¨ط®ط´ آ«ط«ط¨طھ ظˆ ط§ط±ط³ط§ظ„آ» (ظ†ظˆط¹ ط§ط±ط³ط§ظ„طŒ ظ†ط­ظˆظ‡ظ” ط«ط¨طھطŒ
  ط³ط§ط¹طھ ط§ط±ط³ط§ظ„)طŒ ظپغŒظ„ط¯ظ‡ط§غŒ آ«ط´ظ…ط§ط±ظ‡ ط§ظ†ط¯غŒع©ط§طھظˆط± / طھط±ظ†ط³ظ…غŒطھط§ظ„ / ط´ظ…ط§ط±ظ‡ظ” ظ†ط§ظ…ظ‡ظ” ط·ط±ظپ ظ…ظ‚ط§ط¨ظ„آ» ط¨ط±ط§غŒ طµط§ط¯ط±ظ‡ (ط¨ظ‡â€Œط¬ط§غŒ ط´ظ…ط§ط±ظ‡â€Œظ‡ط§غŒ ط«ط¨طھ ظˆط±ظˆط¯)طŒ
  ط³طھظˆظ† آ«طھط§ط±غŒط® ط§ط±ط³ط§ظ„آ» ط¯ط± ط¬ط¯ظˆظ„ طµط§ط¯ط±ظ‡ (ظˆغŒط±ط§غŒط´ ط¯ط±ط¬ط§ ظ‡ظ… ط¯ط§ط±ط¯)طŒ ط¨ط±ع†ط³ط¨â€Œظ‡ط§غŒ ط³ظˆط±طھ/ظپغŒظ„طھط± ظˆ ع©ط´ظˆغŒ ط¬ط²ط¦غŒط§طھ ط¨ط± ط§ط³ط§ط³ ط¬ظ‡طھطŒ
  ظˆ `effective_date` ط­ط§ظ„ط§ `Coalesce(received_date, sent_date, letter_date)` ط§ط³طھ. ط­ط°ظپ ظ†ط§ظ…ظ‡/ظ¾غŒظˆط³طھطŒ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´طŒ
  ط·ط±ظپ ط­ط³ط§ط¨ ظ…طھظ†غŒ ط¢ط²ط§ط¯ ظˆ ظ†ع¯ط§ط´طھ ظ‡ظ… ط±ظˆغŒ طµط§ط¯ط±ظ‡ ظپط¹ط§ظ„ ط§ط³طھ.
- **ط­ط°ظپ ظ†ط§ظ…ظ‡/ظ¾غŒظˆط³طھ ط¨ط§ ظ…ط¬ظˆط² ط±غŒط² (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** ط³طھظˆظ† آ«ط¹ظ…ظ„غŒط§طھآ» ظپظ‡ط±ط³طھ ظ…ع©ط§طھط¨ط§طھ ع¯ط²غŒظ†ظ‡ظ” **ط­ط°ظپ ظ†ط§ظ…ظ‡** ط¯ط§ط±ط¯
  (`DELETE /letters/{id}/`)طŒ ظ¾غŒظˆط³طھâ€Œظ‡ط§غŒ ظپظ‡ط±ط³طھ ط¬ط²ط¦غŒط§طھ ظˆ **ط¯غŒط§ظ„ظˆع¯ ظˆغŒط±ط§غŒط´** ط¯ع©ظ…ظ‡ظ” **ط­ط°ظپ ظ¾غŒظˆط³طھ**
  (`DELETE /letter-attachments/{id}/`) ط¯ط§ط±ظ†ط¯. ع©ظ†طھط±ظ„ ظ†ظ…ط§غŒط´ ط³ظ…طھ ظپط±ط§ظ†طھ ط¨ط§ ظ…ط¬ظˆط² ط±غŒط²
  (`correspondence.*.delete`) غŒط§ ظ…ط¬ظˆط² ظ‚ط¯غŒظ…غŒ `can_delete_documents`ط› ط³ظ…طھ ط¨ع©â€Œط§ظ†ط¯
  `permission_engine.require_module_action(user, 'correspondence', ('delete',))` ط¯ط±
  `LetterViewSet.destroy` ظˆ `LetterAttachmentViewSet.destroy` â†’ ع©ط§ط±ط¨ط± ط¨ط¯ظˆظ† ظ…ط¬ظˆط² غ´غ°غ³ ظ…غŒâ€Œع¯غŒط±ط¯.
  `LEGACY_RULES` ط­ط§ظ„ط§ ط¨ط±ط§غŒ `can_manage_documents`/`can_delete_documents`/`can_approve_documents`/
  `can_publish_documents` ظ‡ظ… ظ…ط§عکظˆظ„ `documents` ظˆ ظ‡ظ… `correspondence` ط±ط§ ظ¾ظˆط´ط´ ظ…غŒâ€Œط¯ظ‡ط¯ ظˆ
  `legacy_permissions_from_fine` ظ‡ظ…ظ‡ظ” ط±ظˆظ„â€Œظ‡ط§ ط±ط§ (ظ†ظ‡ ظپظ‚ط· ط§ظˆظ„غŒ) ط¨ط±ط±ط³غŒ ظ…غŒâ€Œع©ظ†ط¯.
  `/auth/me` ظپغŒظ„ط¯ ط¬ط¯غŒط¯ **`fine_permissions`** (dict ع©ط¯â†’ط¨ظˆظ„غŒظ†) ظ…غŒâ€Œط¯ظ‡ط¯ طھط§ UI ط¯ع©ظ…ظ‡â€Œظ‡ط§ ط±ط§ gate ع©ظ†ط¯.
- **ط±ظپط¹ آ«ط¯ط³طھط±ط³غŒ ط؛غŒط±ظ…ط¬ط§ط²آ» ط¯ط± ظ¾ط§غŒغŒظ† طµظپط­ظ‡ظ” ظ…ع©ط§طھط¨ط§طھ:** طµظپط­ظ‡ظ” ظپظ‡ط±ط³طھ ظ‚ط¨ظ„ط§ظ‹ `/api/users/` ط±ط§ ظ‡ظ… طµط¯ط§ ظ…غŒâ€Œط²ط¯
  (ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ظ” ظپغŒظ„ط¯ظ‡ط§غŒ ط­ط°ظپâ€Œط´ط¯ظ‡ظ” آ«ط«ط¨طھâ€Œع©ظ†ظ†ط¯ظ‡/طھظ†ط¸غŒظ…â€Œع©ظ†ظ†ط¯ظ‡آ») ظˆ ط¨ط±ط§غŒ ع©ط§ط±ط¨ط±غŒ ع©ظ‡ ظپظ‚ط· ط¨ظ‡ ظ…ع©ط§طھط¨ط§طھ ط¯ط³طھط±ط³غŒ ط¯ط§ط±ط¯
  غ´غ°غ³ + ظ¾غŒط§ظ… آ«ط¯ط³طھط±ط³غŒ ط؛غŒط±ظ…ط¬ط§ط²آ» طھظˆظ„غŒط¯ ظ…غŒâ€Œع©ط±ط¯. ط§غŒظ† ط¯ط±ط®ظˆط§ط³طھ ط­ط°ظپ ط´ط¯ط› ط¨ط±ط§غŒ ط§ظ‡ط¯ط§ظپ ط§ط±ط¬ط§ط¹ ط§ط²
  `/letters/personnel/` ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯.
- **ظ†ع¯ط§ط´طھ ظ†ط§ظ…â€Œظ‡ط§ â€” ط¨ط§ط²ط·ط±ط§ط­غŒ ط³طھظˆظ†â€Œظ…ط­ظˆط± (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** طµظپط­ظ‡ظ” `/correspondence/name-mapping` ط­ط§ظ„ط§ ظ…غŒط²ع©ط§ط± ظ‡ط± آ«ط³طھظˆظ†آ» ط§ط³طھ:
  ع©ط§ط±طھâ€Œظ‡ط§غŒ ط³طھظˆظ†â€Œظ‡ط§ (ط·ط±ظپ ط­ط³ط§ط¨طŒ ظپط±ط³طھظ†ط¯ظ‡طŒ ع¯غŒط±ظ†ط¯ظ‡طŒ ظ…ط®ط§ط·ط¨طŒ ط³ط§ط²ظ…ط§ظ†طŒ طھط­ظˆغŒظ„â€Œط¯ظ‡ظ†ط¯ظ‡طŒ ع¯غŒط±ظ†ط¯ظ‡ظ” ط§ط±ط¬ط§ط¹طŒ
  ع¯غŒط±ظ†ط¯ظ‡ظ” ط§ط±ط¬ط§ط¹ (ط·ط±ظپ ط­ط³ط§ط¨)طŒ ظ…ظˆط¶ظˆط¹â†’ظ†ظˆط¹ ظ…ع©ط§طھط¨ظ‡ â€” طھط§ط±غŒط® ظˆ ط´ظ…ط§ط±ظ‡ظ” ظ†ط§ظ…ظ‡ ط³طھظˆظ† ظ†ع¯ط§ط´طھ ظ†غŒط³طھظ†ط¯) ط¨ط§ ط´ظ…ط§ط±ط´
  ظ†ط§ظ…/ظ†ع¯ط§ط´طھâ€Œط´ط¯ظ‡/ط¨ط¯ظˆظ†â€Œظ†ع¯ط§ط´طھ ظˆ ظ†ظˆط§ط± ظ¾غŒط´ط±ظپطھط› ط§ظ†طھط®ط§ط¨ ط³طھظˆظ† â‡’ ط¬ط¯ظˆظ„ ظ†ط§ظ…â€Œظ‡ط§غŒ ظ‡ظ…ط§ظ† ط³طھظˆظ† (ظ†ع¯ط§ط´طھâ€Œط´ط¯ظ‡ ظˆ ط¨ط¯ظˆظ†â€Œظ†ع¯ط§ط´طھ)
  ط¨ط§ **ظ¾غŒط´ظ†ظ‡ط§ط¯ غŒع©â€Œع©ظ„غŒع©غŒ** (ط«ط¨طھ ظ†ع¯ط§ط´طھ + ط§ط¹ظ…ط§ظ„ ظ‡ظ…ط§ظ† ظ„ط­ط¸ظ‡) ظˆ **ط¢ط¯ط±ط³â€Œط¯ظ‡غŒ ط¯ط³طھغŒ** (ط¯غŒط§ظ„ظˆع¯ طھط®طµطµغŒ)ط› آ«ط§ط¹ظ…ط§ظ„ ط§غŒظ† ط³طھظˆظ†آ»طŒ
  آ«ظپظ‚ط· ط¨ط¯ظˆظ† ظ†ع¯ط§ط´طھآ»طŒ ط¬ط³طھâ€Œظˆط¬ظˆغŒ ط¯ط±ظˆظ†â€Œط³طھظˆظ†غŒطŒ ظˆ آ«ط§ط¹ظ…ط§ظ„ ظ‡ظ…ظ‡آ» ط¨ط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´.
  ط§ظ†ط¯ظ¾ظˆغŒظ†طھ ط¬ط¯غŒط¯ `GET /api/correspondence-name-aliases/columns/` ط´ظ…ط§ط±ط´ ظ‡ط± ط³طھظˆظ† ط±ط§ ظ…غŒâ€Œط¯ظ‡ط¯ ظˆ
  `unmapped/` ظ¾ط§ط±ط§ظ…طھط±ظ‡ط§غŒ `scope`طŒ `kinds` (ظ…ط­ط¯ظˆط¯ع©ط±ط¯ظ† ظ…ط­ط§ط³ط¨ظ‡ظ” ظ¾غŒط´ظ†ظ‡ط§ط¯ ط¨ظ‡ ط§ظ†ظˆط§ط¹ ظ…ط¬ط§ط² ظ‡ظ…ط§ظ† ط³طھظˆظ†) ظˆ `search` ع¯ط±ظپطھ.
  ع©ط§ط±ط§غŒغŒ: ظ¾غŒط´â€ŒظپغŒظ„طھط± `matching.prefilter_candidates` (طھط·ط¨غŒظ‚ ط§ط±ط²ط§ظ† ظ¾غŒط´ظˆظ†ط¯/ط²غŒط±ط±ط´طھظ‡/طھظˆع©ظ† ظ¾غŒط´ ط§ط²
  `SequenceMatcher`) â‡’ `unmapped` ط³طھظˆظ† ط·ط±ظپ ط­ط³ط§ط¨ (غ¶غ° ظ†ط§ظ…طŒ غ±غ°غ´غµ ط³ط§ط²ظ…ط§ظ†) ط§ط² غ²ظ¬غ¸s ط¨ظ‡ **غ³غ¸غ°ms** ظˆ
  `columns/` ط­ط¯ظˆط¯ **غ´غµغ°ms**.
- **ع©ط§ط±ط¨ط±ط¯ظ‡ط§غŒ طھط®طµطµغŒ ظ†ع¯ط§ط´طھ:** ط§ط² ط±ط¬غŒط³طھط±غŒ `correspondences/alias_purposes.py`
  (ط§ط±ط¬ط§ط¹ / ط§ط±ط¬ط§ط¹ ط¨ط±ظˆظ†â€Œط³ط§ط²ظ…ط§ظ†غŒ / ظپط±ط³طھظ†ط¯ظ‡ / ع¯غŒط±ظ†ط¯ظ‡ / ط·ط±ظپ ط­ط³ط§ط¨ / طھط­ظˆغŒظ„â€Œط¯ظ‡ظ†ط¯ظ‡ / ظ…ط®ط§ط·ط¨ / ط³ط§ط²ظ…ط§ظ† / **ظ…ظˆط¶ظˆط¹ â†’ ظ†ظˆط¹ ظ…ع©ط§طھط¨ظ‡** / ظ‡ظ…ظ‡ظ” ظپغŒظ„ط¯ظ‡ط§)طŒ
  آ«ظ†ع¯ط§ط´طھ ط¯ظˆ ظ…ط³غŒط±ظ‡آ» (sender â†” receiverطŒ ظپظ‚ط· ط¨ط±ط§غŒ ط§غŒظ† ط¯ظˆ ط¯ط§ظ…ظ†ظ‡)طŒ ع†ظ†ط¯ ظ…ظ‚طµط¯ ط¨ط±ط§غŒ غŒع© ظ†ط§ظ… ط¨ط§ ط¨ط±ع†ط³ط¨ ط®ط·â€ŒطھغŒط±ظ‡â€Œط§غŒطŒ
  ط§ظ†ط¯ظ¾ظˆغŒظ†طھâ€Œظ‡ط§غŒ `groups/` (ع¯ط±ظˆظ‡â€Œط¨ظ†ط¯غŒ ط³ظ…طھ ط³ط±ظˆط±طŒ غ± ع©ظˆط¦ط±غŒ) ظˆ `meta/` (ظپط±ط§ط¯ط§ط¯ظ‡ + ط´ظ…ط§ط±ط´ ط³ط¨ع©) ظˆ `summary/` (ط¨ط§ ط§ط³ع©ظ† ظ†ط§ظ…â€Œظ‡ط§غŒ ط¨ط¯ظˆظ† ظ†ع¯ط§ط´طھ).
  طھط¨ ظ‚ط¯غŒظ…غŒ `?tab=mapping` ط¯ط± طھظ†ط¸غŒظ…ط§طھ ط¨ظ‡ ط§غŒظ† طµظپط­ظ‡ ظ‡ط¯ط§غŒطھ ظ…غŒâ€Œط´ظˆط¯.
- **ط®ط²ط§ظ†ظ‡â€Œط¯ط§ط±غŒ (Treasury):** Master Data طھع©ظ…غŒظ„ ط´ط¯ (ط¨ط§ظ†ع©/ط´ط¹ط¨ظ‡/ط­ط³ط§ط¨ ط¨ط§ظ†ع©غŒ/طµظ†ط¯ظˆظ‚/ظ¾ط§غŒط§ظ†ظ‡ظ” ع©ط§ط±طھâ€Œط®ظˆط§ظ†/ط±ظˆط´ ط¯ط±غŒط§ظپطھ ظˆ ظ¾ط±ط¯ط§ط®طھ)طŒ
  ط´ظ…ط§ط±ظ‡â€Œع¯ط°ط§ط±غŒ ظ‚ط§ط¨ظ„ طھظ†ط¸غŒظ… (`treasury/numbering.py` â†’ `RC/PY/TR/PR/PO`)طŒ ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپ (`treasury/amount_words.py`)طŒ
  ع©ظ†طھط±ظ„â€Œظ‡ط§غŒ ط¹ظ…ظ„غŒط§طھغŒ (`treasury/guards.py`)طŒ ظپغŒط´/ط±ط³غŒط¯ ع†ط§ظ¾غŒ ط¨ط§ طھظˆع©ظ† ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ (`treasury/vouchers.py` + `/api/treasury/verify/`)طŒ
  ط¯ط§ط´ط¨ظˆط±ط¯ ظ†ظ‚ط¯غŒظ†ع¯غŒ (`/api/treasury/dashboard/`)طŒ ع†ط±ط®ظ‡ظ” ع©ط§ظ…ظ„ ع†ع© (طµظ†ط¯ظˆظ‚ ط§ط³ظ†ط§ط¯/ظˆط§ع¯ط°ط§ط±غŒ/ظˆطµظˆظ„/ط¨ط±ع¯ط´طھ/ط¹ظˆط¯طھ/ظˆط§ع¯ط°ط§ط±غŒ ط¨ظ‡ ط´ط®طµ).
  طµظپط­ط§طھ ظپط±ط§ظ†طھ: `/treasury/accounts`, `/treasury/cashboxes`, `/treasury/banks`, `/treasury/bank-branches`,
  `/treasury/terminals`, `/treasury/payment-methods`, `/treasury/numbering`, `/treasury/verify`.
- **ط®ط²ط§ظ†ظ‡â€Œط¯ط§ط±غŒ â€” ظ…ظ†ظˆغŒ ط¨ط§ط²ع†غŒظ†غŒâ€Œط´ط¯ظ‡ ظˆ طµظپط­ط§طھ طھظ…â€Œظ…ط­ظˆط± (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** `treasuryMenu` ط¯ط± `core/config/menuConfig.js`
  غ±غ¶ ع¯ط±ظˆظ‡ ط¯ط§ط±ط¯: ط®ط§ظ†ظ‡ / ط¯ط±غŒط§ظپطھ ظˆ ظ¾ط±ط¯ط§ط®طھ / ط¯ط±ط®ظˆط§ط³طھ ظˆ ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھ / ط¨ط§ظ†ع© ظˆ ط­ط³ط§ط¨â€Œظ‡ط§ / ع©ط§ط±طھâ€Œط®ظˆط§ظ† ظˆ ط¯ط±ع¯ط§ظ‡ /
  ط§ط³ظ†ط§ط¯ ط¯ط±غŒط§ظپطھظ†غŒ / ط§ط³ظ†ط§ط¯ ظ¾ط±ط¯ط§ط®طھظ†غŒ / ط¹ظ…ظ„غŒط§طھ ع†ع© / طµظ†ط¯ظˆظ‚ ظˆ ظˆط¬ظˆظ‡ ظ†ظ‚ط¯ / طھط¹ظ‡ط¯ط§طھ ظˆ ط³ط±ط±ط³غŒط¯ظ‡ط§ / ظ…ط¯غŒط±غŒطھ ظ†ظ‚ط¯غŒظ†ع¯غŒ /
  ظ…ط؛ط§غŒط±طھ ط¨ط§ظ†ع©غŒ / ط¹ظ…ظ„غŒط§طھ ط§ط±ط²غŒ / ع¯ط²ط§ط±ط´â€Œظ‡ط§ / ط§ط³ظ†ط§ط¯ ظˆ ع†ط§ظ¾ / طھط¹ط§ط±غŒظپ. ط¢غŒطھظ…â€Œظ‡ط§غŒ آ«ظ†ظ…ط§غŒ ظپغŒظ„طھط±ط´ط¯ظ‡آ» ط¨ط§ ع©ظˆط¦ط±غŒâ€Œط§ط³طھط±غŒظ†ع¯
  ط¨ظ‡ ظ‡ظ…ط§ظ† طµظپط­ظ‡ظ” ظˆط§ظ‚ط¹غŒ ظ…غŒâ€Œط±ظˆظ†ط¯ (`?status=deposited,clearing`, `?direction=payment`, `?method=pos`, `?due_soon=1`, â€¦).
  ظ‡ظ…ظ‡ظ” ظپظ‡ط±ط³طھâ€Œظ‡ط§ ط±ظˆغŒ ظ…ظˆطھظˆط± ظ…ط´طھط±ع© `TreasuryListPage` ط³ظˆط§ط± ط´ط¯ظ‡â€Œط§ظ†ط¯ (ظ‡ط¯ط± طھط·ط¨غŒظ‚â€Œظ¾ط°غŒط± + ظ†ظˆط§ط± ط¬ط³طھâ€Œظˆط¬ظˆ/ظپغŒظ„طھط± + `ModuleTable` + `ModulePager`).
  طµظپط­ط§طھ ط¬ط¯غŒط¯: `/treasury/payment-orders` (ط¯ط³طھظˆط±ظ‡ط§غŒ ظ¾ط±ط¯ط§ط®طھ) ظˆ `/treasury/approval-rules` (ط³ط·ظˆط­ طھط£غŒغŒط¯ + طھظ†ط¸غŒظ…ط§طھ طھظپع©غŒع© ظˆط¸ط§غŒظپ).
  `/treasury/entities` ط­ط°ظپ ظˆ ط¨ظ‡ ط­ط³ط§ط¨â€Œظ‡ط§غŒ ط¨ط§ظ†ع©غŒ ظ†ع¯ط§ط´طھ ط´ط¯ط› ط¨ط®ط´â€Œظ‡ط§غŒ ظ‚ط¯غŒظ…غŒ `*Sections.jsx` ط­ط°ظپ ط´ط¯ظ†ط¯.
  ط¨ع©â€Œط§ظ†ط¯: ظپغŒظ„طھط±ظ‡ط§غŒ `status` (ع†ظ†ط¯ظ…ظ‚ط¯ط§ط±غŒ)طŒ `date_from/date_to`, `entity`, `due_soon`, `instrument_kind`طŒ
  ط¬ط³طھâ€Œظˆط¬ظˆ ط¯ط± ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§ ظˆ ظپغŒظ„طھط±ظ‡ط§غŒ طھط¹ظ‡ط¯ط§طھ/ط§ظ†طھظ‚ط§ظ„/ط¹ظ„غŒâ€Œط§ظ„ط­ط³ط§ط¨/ط³ظ¾ط±ط¯ظ‡ ط§ط¶ط§ظپظ‡ ط´ط¯.
- **طµط¯ظˆط± ط³ظ†ط¯ ط¨ط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ع†ط§ظ¾ (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** ط¯ط± آ«ط¯ط±غŒط§ظپطھâ€Œظ‡ط§آ»طŒ آ«ظ‡ظ…ظ‡ ط¹ظ…ظ„غŒط§طھآ» (ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§) ظˆ آ«ط§ظ†طھظ‚ط§ظ„ ظˆط¬ظˆظ‡آ»
  ط¯ع©ظ…ظ‡ظ” آ«طµط¯ظˆط± ظپغŒط´ ط¯ط±غŒط§ظپطھ / طµط¯ظˆط± ط­ظˆط§ظ„ظ‡ ظ¾ط±ط¯ط§ط®طھ / طµط¯ظˆط± ط±ط³غŒط¯ ط§ظ†طھظ‚ط§ظ„آ» غŒع© ط¯غŒط§ظ„ظˆع¯ ط¯ظˆط³طھظˆظ†ظ‡ ط¨ط§ط² ظ…غŒâ€Œع©ظ†ط¯:
  ظپط±ظ… (ظپغŒظ„ط¯ظ‡ط§غŒ ط³ظ†ط¯) + **ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡ظ” ظ‚ط§ظ„ط¨ ع†ط§ظ¾** (طھط§ط±غŒط® ط´ظ…ط³غŒطŒ ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپطŒ ط¨ط§ط±ع©ط¯طŒ ط´ظ…ط§ط±ظ‡ظ” ط¨ط¹ط¯غŒ)ط›
  ط¨ط§ آ«ط«ط¨طھ ظˆ طµط¯ظˆط±آ»طŒ ط³ظ†ط¯ ظˆط§ظ‚ط¹غŒ ط³ط§ط®طھظ‡ ظ…غŒâ€Œط´ظˆط¯ (Receipt / TreasuryTransaction posted / TreasuryTransfer posted)
  ظˆ ط¨ظ„ط§ظپط§طµظ„ظ‡ ع†ط§ظ¾ ظ†ظ‡ط§غŒغŒ ط¨ط§ط² ظ…غŒâ€Œط´ظˆط¯. ط§ظ†ط¯ظ¾ظˆغŒظ†طھâ€Œظ‡ط§: `/api/treasury/voucher-preview/` ظˆ `/api/treasury/voucher-issue/`.
  ع†ط§ظ¾ طھط±ط§ع©ظ†ط´â€Œظ‡ط§غŒ ط®ط²ط§ظ†ظ‡ ط§ع©ظ†ظˆظ† HTML ظ‚ط§ظ„ط¨ (ظ†ظ‡ ظپظ‚ط· ط¯ط§ط¯ظ‡) ط¨ط±ظ…غŒâ€Œع¯ط±ط¯ط§ظ†ط¯ط› آ«ط«ط¨طھ ط§ظ†طھظ‚ط§ظ„آ» ط¯ط± غŒع© طھط§ط¨ط¹ ظ…ط´طھط±ع©
  `vouchers.post_transfer_documents` ظ…طھظ…ط±ع©ط² ط´ط¯.
- **ع©ط§ط±ط¨ط±ط§ظ† ظˆ ظ…ط¬ظˆط²ظ‡ط§غŒ ط±غŒط² ظ‡ط± ظ¾ط±ط³ظ†ظ„ (غ²غ°غ²غ¶-غ±غ±-غ°غ·):** `/users` ط¯ظˆ طھط¨ ط¯ط§ط±ط¯:
  **ع©ط§ط±ط¨ط±ط§ظ†** (ط¬ط¯ظˆظ„ ط¨ط§ ط¹ظ†ظˆط§ظ† ط´ط؛ظ„غŒ/ط¯ظ¾ط§ط±طھظ…ط§ظ† ظ¾ط±ط³ظ†ظ„طŒ ط¨ط±ع†ط³ط¨ آ«ظ…ط¯غŒط± ط³غŒط³طھظ…آ» غŒط§ طھط¹ط¯ط§ط¯ ظ…ط¬ظˆط²طŒ ظ…ط§عکظˆظ„â€Œظ‡ط§غŒ ظ…ط¬ط§ط²طŒ
  ط¢ط®ط±غŒظ† ظˆط±ظˆط¯طŒ ظˆغŒط±ط§غŒط´/ط؛غŒط±ظپط¹ط§ظ„â€Œط³ط§ط²غŒ) ظˆ **ظ…ط¬ظˆط²ظ‡ط§غŒ ع©ط§ط±ط¨ط±ط§ظ†** (ط§ظ†طھط®ط§ط¨ ظ‡ط± ع©ط§ط±ط¨ط± â†’ ظ…ط§طھط±غŒط³ ظ…ط§عکظˆظ„â†’ع¯ط±ظˆظ‡â†’ظ…ظ†ظˆ
  ط¨ط§ ظ…ط´ط§ظ‡ط¯ظ‡/ط§غŒط¬ط§ط¯/ظˆغŒط±ط§غŒط´/ط­ط°ظپ/طھط£غŒغŒط¯/ط®ط±ظˆط¬غŒطŒ آ«ط§ظ†طھط®ط§ط¨ ظ‡ظ…ظ‡آ» ظ…ط§عکظˆظ„طŒ ط¬ط³طھâ€Œظˆط¬ظˆغŒ ظ…ظ†ظˆطŒ ط³ظˆط¦غŒع† آ«ط¯ط³طھط±ط³غŒ ع©ط§ظ…ظ„ = ظ…ط¯غŒط± ط³غŒط³طھظ…آ»).
  - **ط¨ط¯ظˆظ† ظ†ظ‚ط´â€Œظ…ط­ظˆط±غŒ**: ظ…ط¬ظˆط²ظ‡ط§ ط¨ط±ط§غŒ آ«ظ‡ط± ع©ط§ط±ط¨ط±آ» ظ…ط³طھظ‚ظ„ ط°ط®غŒط±ظ‡ ظ…غŒâ€Œط´ظˆط¯ط› ظپظ‚ط· غŒع© ظ†ظ‚ط´ ط³غŒط³طھظ…غŒ آ«ظ…ط¯غŒط± ط³غŒط³طھظ…آ»
    (ط³ظˆظ¾ط±غŒظˆط²ط± غŒط§ `is_full_access`) ط¨ط§ ط¯ط³طھط±ط³غŒ ع©ط§ظ…ظ„ ظˆط¬ظˆط¯ ط¯ط§ط±ط¯. غŒع© ع©ط§ط±ط¨ط± ظ…غŒâ€Œطھظˆط§ظ†ط¯ ط¯ط± غŒع© ظ…ط§عکظˆظ„ ظپظ‚ط· آ«ظ…ط´ط§ظ‡ط¯ظ‡آ»
    ظˆ ط¯ط± ظ…ط§عکظˆظ„ ط¯غŒع¯ط± آ«طھط£غŒغŒط¯آ» ط¯ط§ط´طھظ‡ ط¨ط§ط´ط¯.
  - ع©ط§طھط§ظ„ظˆع¯: `core/permission_catalog.py` + `core/permission_catalog_data.json`
    (غ±غ° ظ…ط§عکظˆظ„طŒ غ·غµ ع¯ط±ظˆظ‡طŒ **غ²غµغ¹ ظ…ظ†ظˆ**طŒ **غ±غ°غ·غ² ع©ط¯** `module.menu.action`). ط¨ط§ط²طھظˆظ„غŒط¯:
    `python scripts/build_permission_catalog.py` ط¨ط¹ط¯ ط§ط² طھط؛غŒغŒط± `menuConfig.js`.
  - ظ…ط¯ظ„ `core.UserAccess` (user OneToOneطŒ `permissions` JSONطŒ `is_full_access`, `applications`, `note`)
    + ظ…ط§غŒع¯ط±غŒط´ظ† `core.0019`. ظ…ظˆطھظˆط±: `fine_permissions_for` ط§ط² `UserAccess` ظ…غŒâ€Œط®ظˆط§ظ†ط¯ط› ظ…ط¬ظˆط²ظ‡ط§غŒ ظ‚ط¯غŒظ…غŒ
    (`treasury_execute`, `can_approve_documents`â€¦) ط¨ط§ `LEGACY_RULES` ط§ط² ظ‡ظ…ط§ظ† ع©ط¯ظ‡ط§غŒ ط±غŒط² ظ…ط´طھظ‚ ظ…غŒâ€Œط´ظˆظ†ط¯
    (ط³ط§ط²ع¯ط§ط±غŒ ع©ط§ظ…ظ„ ظˆغŒظˆظ‡ط§) ظˆ ع©ط§ط±ط¨ط±ط§ظ† ط¨ط¯ظˆظ† ط±ط¯غŒظپ UserAccess ظ‡ظ†ظˆط² ط§ط² ظ¾غŒط´â€Œظپط±ط¶ ظ†ظ‚ط´ ظ‚ط¯غŒظ…غŒ ط§ط³طھظپط§ط¯ظ‡ ظ…غŒâ€Œع©ظ†ظ†ط¯.
  - ط§ظ†ط¯ظ¾ظˆغŒظ†طھâ€Œظ‡ط§: `GET users/` (ط¨ط§ `employee_position`/`employee_department`/`modules`/`is_full_access`)طŒ
    `GET users/access/catalog/`طŒ `GET|POST users/<id>/access/` (ظ…ط§طھط±غŒط³ + ط¯ط³طھط±ط³غŒ ع©ط§ظ…ظ„)طŒ
    ظˆ ظ…ط³غŒط±ظ‡ط§غŒ ط³ط§ط²ع¯ط§ط±غŒ `users/roles/â€¦` (ط¯غŒع¯ط± ط¯ط± UI ط§ط³طھظپط§ط¯ظ‡ ظ†ظ…غŒâ€Œط´ظˆظ†ط¯).
  - طھط³طھâ€Œظ‡ط§: `core/tests_permissions.py` ظˆ `__tests__/usersAccessSmoke.test.js`.
  - ظ†ع©طھظ‡: ط§ظ†ط¯ظ¾ظˆغŒظ†طھ `/applications/catalog/` ظپغŒظ„ط¯ **`title`** (ظˆ `icon` ط¨ظ‡â€Œطµظˆط±طھ **ط±ط´طھظ‡**) ظ…غŒâ€Œط¯ظ‡ط¯ط›
    ط¯ط± UI ط¹ظ†ظˆط§ظ† ط¨ط§ `app.title` ظˆ ط¢غŒع©ظˆظ† ط¨ط§ ظ†ظ‚ط´ظ‡ظ” `MODULE_ICONS[slug]` ط±ظ†ط¯ط± ظ…غŒâ€Œط´ظˆط¯ (ظ†ظ‡ `name/label`).
- **ط¯ط±غŒط§ظپطھ/ظ¾ط±ط¯ط§ط®طھ ظ¾غŒط´ط±ظپطھظ‡:** ط¯ظپطھط± ط§ط³ظ†ط§ط¯ (`/treasury/voucher-book` ط¨ط§ ط§ظ†ظˆط§ط¹ ع†ع©/ظ†ظ‚ط¯غŒ/ط´ط¨ط§/ط³ظ†ط¯ ظˆ ط­ط³ط§ط¨ ط¨ط¯ظ‡ع©ط§ط±)طŒ
  ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھ ط¨غŒظ†â€Œط¨ط§ظ†ع©غŒ ظ¾ط§غŒط§/ط³ط§طھظ†ط§ (`/treasury/bank-orders` + ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ط´ط¨ط§ mod 97 ظˆ طھط´ط®غŒطµ ط¨ط§ظ†ع© ط§ط² ع©ط¯ ط´ط¨ط§)طŒ
  ع©ط³ظˆط±ط§طھ ع†ظ†ط¯ع¯ط§ظ†ظ‡ظ” ظ¾ط±ط¯ط§ط®طھ (`PaymentDeduction`طŒ ظ…ط¨ظ„ط؛ ط®ط§ظ„طµطŒ `/payment-requests/{id}/distribution/`),
  ظ‚ظˆط§ط¹ط¯ ط³ط·ط­ طھط£غŒغŒط¯ (`TreasuryApprovalRule`) + طھظپع©غŒع© ظˆط¸ط§غŒظپ (`/treasury/settings/`), ع¯ط²ط§ط±ط´â€Œظ‡ط§ (`/treasury/reports/` + Excel),
  ظ…ط؛ط§غŒط±طھ ط¨ط§ظ†ع©غŒ (`/treasury/statement-lines/` + طھط·ط¨غŒظ‚ ط®ظˆط¯ع©ط§ط±/ط¯ط³طھغŒ), ظˆ ظ‚ط§ظ„ط¨ ع†ط§ظ¾ ط¬ط§غŒâ€Œظ†ع¯ظ‡ط¯ط§ط± (`/treasury/print-templates/`) ط¨ط§ ط¨ط§ط±ع©ط¯ Code 39
  (ط¨ظ‡â€Œط¬ط§غŒ QR ع©ظ‡ ط¨ظ‡ ط¨ط³طھظ‡ظ” ط¨غŒط±ظˆظ†غŒ ظ†غŒط§ط² ط¯ط§ط±ط¯).

---

## 13) Backlog / known gaps

1. **`pg_trgm` + GIN** ط±ظˆغŒ `subject`/`body` (ظ†غŒط§ط² ط¨ظ‡ `CREATE EXTENSION`).
2. ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ Office ط¯ط± DMS (طھط¨ط¯غŒظ„ ط³ظ…طھ ط³ط±ظˆط±).
3. ع†غŒط¯ظ…ط§ظ† ظ‚ط§ط¨ظ„â€Œطھظ†ط¸غŒظ… ظˆغŒط¬طھâ€Œظ‡ط§غŒ ط¯ط§ط´ط¨ظˆط±ط¯ (طھط±ط¬غŒط­ط§طھ ع©ط§ط±ط¨ط±).
4. طھط³طھâ€Œظ‡ط§غŒ DB-based ط¨ط±ط§غŒ querysetظ‡ط§غŒ ظ¾غŒع†غŒط¯ظ‡.
5. ع¯ط²ط§ط±ط´â€Œظ‡ط§غŒ ظ…ع©ط§طھط¨ط§طھ (ظ…غŒط§ظ†ع¯غŒظ† ط²ظ…ط§ظ† ظ¾ط§ط³ط®طŒ ط¨ط§ط± ع©ط§ط±غŒ ظˆط§ط­ط¯ظ‡ط§).
6. ط§غŒظ†ط¯ع©ط³ طھع©ظ…غŒظ„غŒ `(company, direction, due_date)` ط¯ط± طµظˆط±طھ ط±ط´ط¯ ط¯ط§ط¯ظ‡.
7. **غŒع©طھط§غŒغŒ ط´ظ…ط§ط±ظ‡ظ” ظ†ط§ظ…ظ‡:** ظپط¹ظ„ط§ظ‹ ظ…ظ…ع©ظ† ظ†غŒط³طھ â€” غ±غ³غµ ع¯ط±ظˆظ‡ `(direction, number)` طھع©ط±ط§ط±غŒ ظˆ غ±ظ¬غ´غ¹غ¸ ظ†ط§ظ…ظ‡ظ”
   ط¨ط¯ظˆظ† ط´ظ…ط§ط±ظ‡ ط¯ط± ط¯ط§ط¯ظ‡ظ” `kpsmi` ظˆط¬ظˆط¯ ط¯ط§ط±ط¯ط› ظ¾غŒط´ ط§ط² ط§ظپط²ظˆط¯ظ† `UniqueConstraint` ط¨ط§غŒط¯ ط¯ط§ط¯ظ‡ ظ¾ط§ع©â€Œط³ط§ط²غŒ ط´ظˆط¯
   (`series` ظپط¹ظ„غŒ ظ…ظ†ط¨ط¹ ظ‚ط§ط¨ظ„â€Œط§طھع©ط§طھط± ط§ط³طھ).
8. طھع©ظ…غŒظ„ ط³ط®طھâ€Œط³ط§ط²غŒ ط±ط³ط§ظ†ظ‡: `internal` ع©ط±ط¯ظ† `/media/` ط¯ط± nginx + `X-Accel-Redirect` طھط§ ط­طھغŒ ظ„غŒظ†ع© ظ…ط³طھظ‚غŒظ…
   ظپط§غŒظ„ ظ‡ظ… ط¨ط¯ظˆظ† ط§ط­ط±ط§ط² ظ‡ظˆغŒطھ ع©ط§ط± ظ†ع©ظ†ط¯ (ط§ع©ظ†ظˆظ† XSS ط¨ط³طھظ‡ ط´ط¯ظ‡ ط§ظ…ط§ ط¯ط³طھط±ط³غŒ ظ…ط³طھظ‚غŒظ… ط¨ظ‡ ظپط§غŒظ„â€Œظ‡ط§غŒ ط؛غŒط±ظ…ط­ط±ظ…ط§ظ†ظ‡ ط¨ط§ط² ط§ط³طھ).

---

## 14) Persian UI glossary â€” ظˆط§عکظ‡â€Œظ†ط§ظ…ظ‡

| ظپظ†غŒ | ظ…طھظ† UI |
|---|---|
| incoming / outgoing / internal | ظˆط§ط±ط¯ظ‡ / طµط§ط¯ط±ظ‡ / ط¯ط§ط®ظ„غŒ |
| referral / refer | ط§ط±ط¬ط§ط¹ / ط§ط±ط¬ط§ط¹ ط¯ط§ط¯ظ† |
| cartable / workdesk | ع©ط§ط±طھط§ط¨ظ„ / ظ…غŒط²ع©ط§ط± |
| counterparty / party | ط·ط±ظپ ط­ط³ط§ط¨ |
| correspondent / organization | ظ…ط®ط§ط·ط¨ / ط³ط§ط²ظ…ط§ظ† |
| attachment / draft | ظ¾غŒظˆط³طھ / ظ¾غŒط´â€Œظ†ظˆغŒط³ |
| in progress / answered / closed / archived | ط¯ط± ط¬ط±غŒط§ظ† / ظ¾ط§ط³ط®â€Œط¯ط§ط¯ظ‡â€Œط´ط¯ظ‡ / ط¨ط³طھظ‡â€Œط´ط¯ظ‡ / ط¨ط§غŒع¯ط§ظ†غŒâ€Œط´ط¯ظ‡ |
| overdue / due soon | ظ…ط¹ظˆظ‚ / ظ†ط²ط¯غŒع© ظ…ظ‡ظ„طھ |
| indicator no. / transmittal no. | ط´ظ…ط§ط±ظ‡ظ” ط§ظ†ط¯غŒع©ط§طھظˆط± / ط´ظ…ط§ط±ظ‡ظ” طھط±ط§ط¨ط±غŒ |
| scan / scanned ratio | ط§ط³ع©ظ† / ظ†ط³ط¨طھ ط§ط³ع©ظ†â€Œط´ط¯ظ‡ |
| archive profile / archive folder | ظ¾ط±ظˆظپط§غŒظ„ ط¨ط§غŒع¯ط§ظ†غŒ / ظ¾ظˆط´ظ‡ظ” ط¨ط§غŒع¯ط§ظ†غŒ |
| name mapping | ظ†ع¯ط§ط´طھ ظ†ط§ظ…â€Œظ‡ط§ |
| name mapping purpose / scope | ع©ط§ط±ط¨ط±ط¯ ظ†ع¯ط§ط´طھ / ط¯ط§ظ…ظ†ظ‡ظ” ع©ط§ط±ط¨ط±ط¯ |
| dual (two-way) mapping | ظ†ع¯ط§ط´طھ ط¯ظˆ ظ…ط³غŒط±ظ‡ |
| multi-target mapping | ظ†ع¯ط§ط´طھ ع†ظ†ط¯ ظ…ظ‚طµط¯ظ‡ |
| treasury voucher (receipt/payment) | ظپغŒط´ ط¯ط±غŒط§ظپطھ / ظپغŒط´ ظ¾ط±ط¯ط§ط®طھ |
| payment request / payment order | ط¯ط±ط®ظˆط§ط³طھ ظ¾ط±ط¯ط§ط®طھ / ط¯ط³طھظˆط± ظ¾ط±ط¯ط§ط®طھ |
| bank account / cash box | ط­ط³ط§ط¨ ط¨ط§ظ†ع©غŒ / طµظ†ط¯ظˆظ‚ |
| received check / issued check | ع†ع© ط¯ط±غŒط§ظپطھغŒ / ع†ع© ظ¾ط±ط¯ط§ط®طھغŒ |
| bank reconciliation | ظ…ط؛ط§غŒط±طھ ط¨ط§ظ†ع©غŒ |
| amount in words | ظ…ط¨ظ„ط؛ ط¨ظ‡ ط­ط±ظˆظپ |
| theme studio / appearance | ط§ط³طھظˆط¯غŒظˆ طھظ… / ط¸ط§ظ‡ط± ظˆ ظ¾ظˆط³طھظ‡ |
| quick actions / action queue | ط¯ط³طھط±ط³غŒ ط³ط±غŒط¹ / طµظپ ط§ظ‚ط¯ط§ظ… |

---

**ظ¾ط§غŒط§ظ† ط³ظ†ط¯.** ط§ع¯ط± ط¬ط§غŒغŒ ط§غŒظ† ط³ظ†ط¯ ط¨ط§ ع©ط¯ ظ†ظ…غŒâ€Œط®ظˆط§ظ†ط¯طŒ **ع©ط¯ ظ…ط±ط¬ط¹ ط§ط³طھ**ط› ظ‡ظ…غŒظ† ظپط§غŒظ„ ط±ط§ ط§طµظ„ط§ط­ ع©ظ†غŒط¯ طھط§ ط²ظ†ط¯ظ‡ ط¨ظ…ط§ظ†ط¯.

```
