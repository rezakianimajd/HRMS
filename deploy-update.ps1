<#
.SYNOPSIS
    استقرار افزایشی HRMS روی سرور داخلی (192.168.1.63).

.DESCRIPTION
    رویهٔ اثبات‌شده:  scp به /tmp  →  sudo cp در مقصد  →  بیلد روی سرور  →  ری‌استارت.
    سرور اینترنت ندارد، پس روی آن npm install / git pull اجرا نمی‌شود.

    نکتهٔ کلیدی: nginx مسیر /static/ را از /var/www/hrms/static سرو می‌کند
    (location /static/ → alias) و index.html ساختهٔ CRA به /static/js/main.<hash>.js
    اشاره می‌کند؛ پس بعد از هر بیلد، اَسِت‌های build/static باید به آن مسیر هم کپی شوند.
    نصب آفلاین وابستگی‌های جدید: اگر پوشهٔ _transfer\wheels وجود داشته باشد، wheel ها به
    سرور منتقل و با «pip install --no-index» (بدون هیچ اتصال به اینترنت) نصب می‌شوند؛
    django-jazzmin و python-dotenv هر دو py3-none-any هستند و روی لینوکس نصب می‌شوند.



.PARAMETER LocalBuild
    بیلد روی ویندوز انجام شود و پوشهٔ build منتقل شود (پیش‌فرض: بیلد روی سرور).

.PARAMETER Migrate
    اجرای migrate_schemas روی سرور — لازم پس از هر تغییر مدل
    (مثلاً افزودن فیلد issues = چک‌لیست نواقص سند).

.PARAMETER MoveFiles
    فایل‌های آپلودشدهٔ قبلی را از مسیر قدیمی به ساختار بایگانی
    (archive/company_x/<module>/<entity>/) منتقل می‌کند. یک‌بار و پس از -Migrate.

.EXAMPLE
    .\deploy-update.ps1                  # استقرار کامل (بک‌اند + فرانت‌اند با بیلد روی سرور)
.EXAMPLE
    .\deploy-update.ps1 -Migrate          # همراه با اجرای مایگریشن (پس از تغییر مدل)
.EXAMPLE
    .\deploy-update.ps1 -CheckOnly        # فقط تست اتصال و مجوزها، بدون هیچ تغییری
.EXAMPLE
    .\deploy-update.ps1 -SkipFrontend     # فقط بک‌اند
.EXAMPLE
    .\deploy-update.ps1 -LocalBuild       # بیلد روی ویندوز و انتقال build
.EXAMPLE
    .\deploy-update.ps1 -User reza -Server 192.168.1.63
.EXAMPLE
    .\deploy-update.ps1 -Archive -LocalBuild -NoBuild -Migrate -MoveFiles   # بایگانی + انتقال فایل‌های موجود
#>
[CmdletBinding()]
param(
    [string] $User      = 'hradmin',               # کاربر SSH (باید sudo داشته باشد)
    [string] $Server    = '192.168.1.63',          # IP سرور
    [string] $AppUser   = 'hrms',                  # کاربر اجرای برنامه روی سرور
    [string] $AppDir    = '/opt/hrms',             # ریشهٔ پروژه روی سرور
    [string] $StaticDir = '/var/www/hrms/static',  # مقصد location /static/ در nginx
    [switch] $Archive,      # انتقال یک‌بارهٔ همهٔ فایل‌ها با یک آرشیو tar.gz (کمترین تعداد پرسش رمز)
    [switch] $LocalBuild,
    [switch] $Migrate,
    [switch] $SkipBackend,
    [switch] $SkipFrontend,
    [switch] $NoBuild,
    [switch] $CheckOnly,
    [switch] $MoveFiles    # انتقال فایل‌های موجود به ساختار archive/ (یک‌باره؛ پس از -Migrate)
)

$ErrorActionPreference = 'Stop'
$Srv      = "$User@$Server"
$RepoRoot = $PSScriptRoot

# فایل‌های تغییریافتهٔ بک‌اند (مسیر نسبت به ریشهٔ مخزن — مقصد هم همان مسیر روی سرور است)
$BackendFiles = @(
    'hrms_project/accounting/models.py',
    'hrms_project/accounting/serializers.py',
    'hrms_project/accounting/views.py',
    'hrms_project/accounting/constants.py',
    'hrms_project/accounting/report_views.py',
    'hrms_project/accounting/coding.py',
    'hrms_project/accounting/account_tree.py',
    'hrms_project/accounting/text_normalization.py',
    'hrms_project/accounting/migrations/0024_normalize_arabic_chars_in_coding.py',
    'hrms_project/accounting/tests.py',
    # --- کدینگ والد-آگاه + ابزار رفع ناهمگونی نوع حساب ---
    'hrms_project/accounting/maintenance.py',
    'hrms_project/accounting/management/__init__.py',
    'hrms_project/accounting/management/commands/__init__.py',
    'hrms_project/accounting/migrations/0023_coding_locked_fields.py',
    'hrms_project/datamapping/views.py',
    'hrms_project/accounting/annual_views.py',
    'hrms_project/accounting/tax_views.py',
    'hrms_project/employees/views.py',
    'hrms_project/employees/admin.py',
    'hrms_project/attendance/admin.py',
    'hrms_project/leaves/admin.py',
    'hrms_project/orgchart/admin.py',
    'hrms_project/payroll/admin.py',
    'hrms_project/accounting/migrations/0021_accountingdocument_issues.py',
    'hrms_project/accounting/urls.py',
    'hrms_project/accounting/admin.py',
    'hrms_project/accounting/migrations/0022_financialstatementapproval.py',
    'hrms_project/projects/views.py',
    'hrms_project/projects/profile_views.py',
    'hrms_project/projects/urls.py',
    'hrms_project/projects/models.py',
    'hrms_project/projects/serializers.py',
    'hrms_project/projects/cost_models.py',
    'hrms_project/projects/cost_views.py',
    'hrms_project/projects/cost_serializers.py',
    'hrms_project/projects/admin.py',
    'hrms_project/projects/jalali_utils.py',
    'hrms_project/projects/audit.py',
    'hrms_project/projects/calendar_service.py',
    'hrms_project/projects/wbs_template_service.py',
    'hrms_project/core/models/audit_mixin.py',
    'hrms_project/core/models/__init__.py',
    'hrms_project/contracts/models.py',
    'hrms_project/contracts/serializers.py',
    'hrms_project/contracts/views.py',
    'hrms_project/contracts/excel_export.py',
    'hrms_project/contracts/tests.py',
    'hrms_project/contracts/addendum_schema.py',
    'hrms_project/contracts/addendum_effects.py',
    'hrms_project/contracts/guarantee_status.py',
    'hrms_project/contracts/migrations/0022_addendum_subject_type_alter_addendum_subject.py',
    'hrms_project/contracts/migrations/0023_addendum_advance_change_addendum_new_advance_payment_and_more.py',
    'hrms_project/contracts/migrations/0024_expand_guarantee_kind_choices.py',
    'hrms_project/projects/migrations/0004_costtransaction_currency_fk.py',
    'hrms_project/projects/migrations/0005_wbstemplatenode_budgetline_created_by_and_more.py',
    'hrms_project/contracts/migrations/0021_contract_contract_alloc_gin_idx_and_more.py',
    'hrms_project/projects/tests/__init__.py',
    'hrms_project/projects/tests/base.py',
    'hrms_project/projects/tests/test_jalali_utils.py',
    'hrms_project/projects/tests/test_wbs_template.py',
    'hrms_project/projects/tests/test_phase0_cost.py',
    'hrms_project/projects/tests/test_calendar_service.py',
    'hrms_project/projects/schedule_models.py',
    'hrms_project/projects/scheduling/__init__.py',
    'hrms_project/projects/scheduling/workcal.py',
    'hrms_project/projects/scheduling/cpm.py',
    'hrms_project/projects/scheduling/evm.py',
    'hrms_project/projects/scheduling/service.py',
    'hrms_project/projects/migrations/0006_baseline_workcalendar_activity_activityprogress_and_more.py',
    'hrms_project/projects/migrations/0007_resource_daily_capacity.py',
    'hrms_project/projects/tests/test_cpm.py',
    'hrms_project/projects/tests/test_evm.py',
    'hrms_project/projects/change_models.py',
    'hrms_project/projects/change_service.py',
    'hrms_project/projects/change_serializers.py',
    'hrms_project/projects/change_views.py',
    'hrms_project/projects/integration.py',
    'hrms_project/projects/migrations/0008_changeorder_changeorderapproval_changeorderline_and_more.py',
    'hrms_project/projects/tests/test_change_state_machine.py',
    'hrms_project/projects/tests/test_phase2_integration.py',
    'hrms_project/procurement/models.py',
    'hrms_project/procurement/views.py',
    'hrms_project/procurement/migrations/0003_goodsreceiptnote_cost_transaction_purchaseorder_cbs_and_more.py',
    # --- فاز ۲ (بخش دوم): صورتجلسه/گواهی پرداخت/تخصیص هزینه + جریان نقدی ---
    'hrms_project/projects/phase2_models.py',
    'hrms_project/projects/phase2_service.py',
    'hrms_project/projects/phase2_serializers.py',
    'hrms_project/projects/phase2_views.py',
    'hrms_project/projects/cashflow.py',
    'hrms_project/projects/migrations/0009_measurementsheet_measurementsheetline_and_more.py',
    'hrms_project/projects/tests/test_phase2_cert_cashflow.py',
    # --- فاز ۳: رجیستر ریسک ---
    'hrms_project/projects/risk_models.py',
    'hrms_project/projects/risk_engine.py',
    'hrms_project/projects/risk_service.py',
    'hrms_project/projects/risk_serializers.py',
    'hrms_project/projects/risk_views.py',
    'hrms_project/projects/migrations/0010_riskcategory_risk_riskreview_riskaction_and_more.py',
    'hrms_project/projects/tests/test_risk_engine.py',
    'hrms_project/projects/tests/test_phase3_risk_db.py',
    # --- فاز ۳ (بخش دوم): کیفیت و HSE ---
    'hrms_project/projects/quality_models.py',
    'hrms_project/projects/quality_engine.py',
    'hrms_project/projects/quality_service.py',
    'hrms_project/projects/quality_serializers.py',
    'hrms_project/projects/quality_views.py',
    'hrms_project/projects/migrations/0011_inspection_ncr_punchitem_qualityplan_qualityplanitem_and_more.py',
    'hrms_project/projects/tests/test_quality_engine.py',
    'hrms_project/projects/tests/test_phase3_quality_db.py',
    # --- تعاریف اولیهٔ پروژه: نگاشت کل/معین/تفصیل ---
    'hrms_project/projects/definition_models.py',
    'hrms_project/projects/accounting_definitions.py',
    'hrms_project/projects/definition_serializers.py',
    'hrms_project/projects/definition_views.py',
    'hrms_project/projects/migrations/0012_costtransactionline_account_and_more.py',
    'hrms_project/projects/migrations/0013_remove_projectaccountdefinition_uniq_proj_def_type_code_and_more.py',
    'hrms_project/projects/tests/test_accounting_definitions.py'
)

# فایل‌های تغییریافتهٔ فرانت‌اند (در حالت پیش‌فرض = بیلد روی سرور)
$FrontendFiles = @(
    'frontend/src/pages/EmployeeForm.jsx',
    'frontend/src/pages/AccountingDocumentsPage.jsx',
    'frontend/src/pages/AccountingDocumentNewPage.jsx',
    'frontend/src/core/components/accounting/DocumentIssuesDialog.jsx',
    'frontend/src/core/components/ui/Timeline.jsx',
    'frontend/src/pages/accounting/reports/MatrixReportPage.jsx',
    'frontend/src/pages/accounting/reports/LedgerDrillDialog.jsx',
    'frontend/src/pages/accounting/annual/YearAction.jsx',
    'frontend/src/pages/accounting/annual/OpeningDocumentPage.jsx',
    'frontend/src/pages/accounting/annual/ClosingDocumentPage.jsx',
    'frontend/src/pages/accounting/annual/CloseAccountsPage.jsx',
    'frontend/src/pages/accounting/reports/reportHelpers.jsx',
    'frontend/src/pages/accounting/reports/TreeTrialBalancePage.jsx',
    'frontend/src/pages/accounting/reports/LedgerReviewPage.jsx',
    'frontend/src/pages/accounting/reports/BalanceSheetPage.jsx',
    'frontend/src/core/utils/downloadUtils.js',
    'frontend/src/pages/ExternalContractsPage.jsx',
    'frontend/src/pages/ContractProfilePage.jsx',
    'frontend/src/pages/AccountingDocumentsPage.jsx',
    'frontend/src/pages/PettyCashExpensesPage.jsx',
    'frontend/src/pages/AccountGroupsPage.jsx',
    'frontend/src/pages/AccountingAccountTreePage.jsx',
    'frontend/src/pages/AccountsClassicPage.jsx',
    'frontend/src/pages/AccountingCodingsPage.jsx',
    'frontend/src/pages/ProjectProfilePage.jsx',
    'frontend/src/pages/AccountingPage.jsx',
    'frontend/src/pages/AssetsPage.jsx',
    'frontend/src/pages/AssistantPage.jsx',
    'frontend/src/pages/ProjectCalendarPage.jsx',
    'frontend/src/pages/ProjectSchedulePage.jsx',
    'frontend/src/pages/ProjectChangeOrdersPage.jsx',
    'frontend/src/pages/ProjectCertificationPage.jsx',
    'frontend/src/pages/ProjectRiskPage.jsx',
    'frontend/src/pages/ProjectQualityPage.jsx',
    'frontend/src/pages/ProjectsStructurePage.jsx',
    'frontend/src/AppRoutes.jsx',
    'frontend/src/core/config/menuConfig.js',
    'frontend/src/pages/ContractAddendumsPage.jsx',
    'frontend/src/pages/ContractProfilePage.jsx',
    'frontend/src/pages/contracts/contractSubPages.jsx',
    'frontend/src/core/constants/addendumSubjects.js',
    # --- تعاریف اولیهٔ پروژه ---
    'frontend/src/pages/ProjectDefinitionsPage.jsx',
    'frontend/src/pages/CostDashboardPage.jsx',
    'frontend/src/pages/projects/ProjectsShared.jsx'
)

# ---------------------------------------------------------------- سامانهٔ بایگانی فایل
# (تنظیمات → تنظیمات عمومی → «ذخیره‌سازی و فایل‌ها»)
$BackendFiles += @(
    'hrms_project/core/engines/archive_storage_engine.py',
    'hrms_project/settings_app/models.py',
    'hrms_project/settings_app/serializers.py',
    'hrms_project/settings_app/urls.py',
    'hrms_project/settings_app/admin.py',
    'hrms_project/settings_app/archive_views.py',
    'hrms_project/settings_app/migrations/0012_storageprofile_archivefolder.py',
    # اتصال آپلودها به موتور بایگانی (مدارک پرسنل/قرارداد/سازمانی)
    'hrms_project/documents/models.py',
    'hrms_project/documents/serializers.py',
    'hrms_project/documents/views.py',
    'hrms_project/documents/migrations/0005_alter_organizationdocument_file.py',
    # زیرپوشهٔ «افراد تحت تکفل» برای مدارک وابستگان
    'hrms_project/documents/migrations/0006_documenttype_archive_folder.py',
    'hrms_project/documents/migrations/0007_organizationdocument_dependent_related.py',
    'hrms_project/settings_app/migrations/0013_employees_dependents_subfolder.py',
    'hrms_project/contracts/migrations/0025_alter_contractdocument_file.py',
    # عکس پرسنل و تصویر امضا در پوشهٔ همان پرسنل
    'hrms_project/employees/models.py',
    'hrms_project/employees/migrations/0019_alter_contractversion_signature_image_and_more.py',
    # مرور/دانلود/حذف فایل از پنل تنظیمات
    'hrms_project/settings_app/archive_views.py',
    'hrms_project/settings_app/urls.py',
    # دستور انتقال فایل‌های موجود به ساختار archive/
    'hrms_project/documents/management/__init__.py',
    'hrms_project/documents/management/commands/__init__.py',
    'hrms_project/documents/management/commands/archive_existing_files.py'
)

# ---------------------------------------------------------------- به‌روزرسانی درون‌برنامه‌ای (فاز ۰ و ۱)
$BackendFiles += @(
    'VERSION',
    'hrms_project/core/version.py',
    'hrms_project/core/models/update.py',
    'hrms_project/core/models/__init__.py',
    'hrms_project/core/models/user.py',
    'hrms_project/core/serializers.py',
    'hrms_project/core/system_views.py',
    'hrms_project/core/updates_service.py',
    'hrms_project/core/updates_views.py',
    'hrms_project/core/urls.py',
    'hrms_project/core/migrations/0014_updatesettings_apprelease_systembroadcast_updaterun_and_more.py',
    'hrms_project/hrms_project/settings/base.py',
    'scripts/patch_nginx_for_updates.sh',
    # فاز ۲: حالت تعمیرات + به‌روزرسان ممتاز
    'hrms_project/core/maintenance.py',
    'hrms_project/core/middleware/maintenance.py',
    'scripts/kian_updater.py',
    'scripts/install_updater_units.sh',
    'scripts/systemd/hrms-update.service',
    'scripts/systemd/hrms-update.path',
    # فاز ۳: زمان‌بندی، کانال‌ها و اطلاع‌رسانی
    'hrms_project/core/update_notify.py',
    'hrms_project/core/management/commands/apply_due_updates.py',
    'hrms_project/core/migrations/0015_updatesettings_notify_bale_and_more.py',
    'scripts/systemd/hrms-update-schedule.service',
    'scripts/systemd/hrms-update-schedule.timer',
    # پرسنل: فیلتر لیست بیمه + خروجی اکسل
    'hrms_project/employees/excel_export.py',
    'hrms_project/employees/serializers.py',
    'hrms_project/employees/views.py',
    # پرسنل: آواتار جنسیت‌محور + حذف عکس
    'hrms_project/employees/phonebook_views.py'
)
$FrontendFiles += @(
    'frontend/src/core/components/settings/StorageArchivePanel.jsx',
    'frontend/src/core/components/settings/settingsUi.jsx',
    'frontend/src/core/components/settings/shared.jsx',
    'frontend/src/core/components/employee/DocumentUploadModal.jsx',
    'frontend/src/pages/CompanyDocumentsPage.jsx',
    'frontend/src/pages/DefinitionsPage.jsx',
    'frontend/src/core/components/settings/GeneralSettingsPanel.jsx',
    'frontend/src/core/components/settings/UpdatePanel.jsx',
    'frontend/src/core/components/ui/SystemBroadcastGate.jsx',
    'frontend/src/core/hooks/useSystemStatus.js',
    'frontend/src/modules/settings/Settings.jsx',
    'frontend/src/App.jsx',
    'frontend/src/pages/EmployeeListPage.jsx',
    'frontend/src/pages/EmployeeForm.jsx',
    'frontend/src/core/components/ui/EmployeeAvatar.jsx',
    'frontend/src/core/components/employee/DocumentsTab.jsx'
)

# وابستگی‌های پایتونی جدید (سرور اینترنت ندارد → نصب آفلاین از wheel های محلی)
#   django-jazzmin و python-dotenv هر دو py3-none-any هستند و روی لینوکس کار می‌کنند.
$WheelDir = Join-Path $RepoRoot '_transfer\wheels'


function Step ($m) { Write-Host "`n===== $m =====" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "   [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "   [..] $m" -ForegroundColor Yellow }

Step "۱/۶ بررسی اتصال و مجوز sudo روی $Srv"
# مهم: در دستورهای ssh از کوتیشن دوتایی و $(...) استفاده نکنید؛ کلاینت ssh ویندوز
# کوتیشن‌های داخلی را حذف می‌کند و دستور روی سرور شکسته می‌شود (pipe اشتباه اجرا می‌شود).
$probe = @(ssh -o ConnectTimeout=10 $Srv 'hostname; id -un; sudo -n true && echo SUDO_OK || echo SUDO_NEEDS_PASSWORD')
if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد. نام کاربری (-User) یا کلید/رمز را بررسی کنید." }
$rHost = ($probe | Select-Object -First 1)
$rUser = ($probe | Select-Object -Skip 1 -First 1)
Ok "اتصال برقرار است — سرور: $rHost | کاربر: $rUser"
if ($probe -contains 'SUDO_OK') { Ok 'sudo بدون رمز فعال است.' }
else { Warn 'sudo بدون رمز فعال نیست؛ در ادامه هر دستور sudo رمز کاربر SSH را می‌خواهد.' }
if ($CheckOnly) { Warn '-CheckOnly → پایان بدون تغییر.'; return }

# ---------------------------------------------------------------- ایمنی انتقال
# هر فایل پایتون/فرانت‌اندی که در مخزن محلی هست ولی روی سرور وجود ندارد (مثل ماژول
# تازه‌ساخته‌شده) خودکار به لیست انتقال افزوده می‌شود؛ در غیر این صورت import روی سرور
# با خطای «No module named ...» می‌شکند.
if ($Archive -and -not $SkipBackend) {
    Step '۱.۵/۶ شناسایی فایل‌های جاافتاده روی سرور'
    $remotePy = @(ssh -o ConnectTimeout=15 $Srv "cd $AppDir && find hrms_project -name '*.py' -not -path '*__pycache__*' -not -path '*/venv/*' 2>/dev/null")
    $remoteJs = @(ssh -o ConnectTimeout=15 $Srv "cd $AppDir && find frontend/src -type f -name '*.js' -o -type f -name '*.jsx' 2>/dev/null")
    if ($remotePy.Count -lt 50 -or $remoteJs.Count -lt 50) {
        Warn 'فهرست فایل‌های سرور کامل خوانده نشد؛ پرش از تکمیل خودکار لیست.'
    } else {
        $rel = { param($p) $p.FullName.Substring($RepoRoot.Length + 1).Replace('\', '/') }
        $localPy = @(Get-ChildItem -Path (Join-Path $RepoRoot 'hrms_project') -Recurse -File -Filter '*.py' |
            Where-Object { $_.FullName -notmatch '[\\/](venv|__pycache__)[\\/]' } | ForEach-Object { & $rel $_ })
        $localJs = @(Get-ChildItem -Path (Join-Path $RepoRoot 'frontend/src') -Recurse -File -Include '*.js', '*.jsx' |
            ForEach-Object { & $rel $_ })
        $added = @()
        foreach ($f in $localPy) { if ($remotePy -notcontains $f -and $BackendFiles -notcontains $f) { $BackendFiles += $f; $added += $f } }
        foreach ($f in $localJs) { if ($remoteJs -notcontains $f -and $FrontendFiles -notcontains $f) { $FrontendFiles += $f; $added += $f } }
        if ($added.Count -gt 0) {
            Ok ("{0} فایل جاافتاده به بسته افزوده شد:" -f $added.Count)
            $added | ForEach-Object { Write-Host "      + $_" -ForegroundColor DarkGray }
        } else { Ok 'همهٔ فایل‌های مخزن روی سرور موجودند.' }
    }
}

# ---------------------------------------------------------------- بک‌اند
if (-not $SkipBackend) {
    Step '۲/۶ ارسال فایل‌های بک‌اند'
    if ($Archive) {
        # --- انتقال یک‌باره با آرشیو: ۲ پرسش رمز، به‌جای ۲× تعداد فایل ---
        $send = @()
        if (-not $SkipBackend) { $send += $BackendFiles }
        if (-not $SkipFrontend) { $send += $FrontendFiles }
        $stage = Join-Path $RepoRoot ('.deploy-stage-' + [guid]::NewGuid().ToString('N'))
        # نام نسبی برای بسته: tar ویندوز مسیر «C:\...» را به‌صورت host:path تفسیر می‌کند
        # نکته: نام متغیرها با پارامترهای اسکریپت (-Archive) هم‌نام نباشد (PowerShell بی‌توجه به بزرگی/کوچکی است)
        $pkgName = '_hrms-files.tgz'
        $pkgPath = Join-Path $RepoRoot $pkgName
        New-Item -ItemType Directory -Path $stage -Force | Out-Null
        if (Test-Path $pkgPath) { Remove-Item $pkgPath -Force }
        Push-Location $RepoRoot
        try {
            foreach ($f in $send) {
                if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
                $dst = Join-Path $stage $f
                New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
                Copy-Item -LiteralPath $f -Destination $dst -Force
            }
            tar -czf $pkgName -C $stage .
        } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $pkgPath)) { throw 'ساخت آرشیو ناموفق بود.' }
        Ok ('آرشیو ساخته شد: {0:N1} KB — {1} فایل' -f ((Get-Item $pkgPath).Length / 1KB), $send.Count)
        scp $pkgPath "${Srv}:/tmp/hrms-files.tgz"
        if ($LASTEXITCODE -ne 0) { throw 'انتقال آرشیو ناموفق بود.' }
        ssh -t $Srv "rm -rf /tmp/hrms-files && mkdir -p /tmp/hrms-files && tar xzf /tmp/hrms-files.tgz -C /tmp/hrms-files && test -f /tmp/hrms-files/hrms_project/projects/urls.py && sudo cp -a /tmp/hrms-files/. $AppDir/ && sudo chown -R ${AppUser}:${AppUser} $AppDir/hrms_project $AppDir/frontend/src && rm -rf /tmp/hrms-files /tmp/hrms-files.tgz"
        if ($LASTEXITCODE -ne 0) { throw 'استخراج/جای‌گزینی آرشیو روی سرور ناموفق بود.' }
        Remove-Item $stage -Recurse -Force
        Remove-Item $pkgPath -Force -ErrorAction SilentlyContinue
        Ok 'همهٔ فایل‌ها یک‌باره جای‌گزین شدند (حالت -Archive).'
    }
    else {
    Push-Location $RepoRoot
    try {
        foreach ($f in $BackendFiles) {
            if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
            $name = Split-Path $f -Leaf
            $remoteDir = (Split-Path $f -Parent) -replace '\\', '/'
            scp $f "${Srv}:/tmp/$name"
            if ($LASTEXITCODE -ne 0) { throw "انتقال ناموفق: $f" }
            ssh -t $Srv "sudo mkdir -p $AppDir/$remoteDir; sudo cp /tmp/$name $AppDir/$f; sudo chown ${AppUser}:${AppUser} $AppDir/$f; sudo chmod 644 $AppDir/$f; rm -f /tmp/$name"
            if ($LASTEXITCODE -ne 0) { throw "جای‌گزینی ناموفق روی سرور: $name" }
            Ok $f
        }
    } finally { Pop-Location }
    Ok 'فایل‌های بک‌اند جای‌گزین شدند.'
    }
} else { Warn 'بک‌اند رد شد (-SkipBackend)' }

# --------------------------------- بررسی سازگاری مدل با مایگریشن‌های سرور (همیشه)
# نکته: `manage.py check` فایل مایگریشن جاافتاده را نمی‌بیند، اما
# `makemigrations --check --dry-run` گراف مایگریشن را اعتبارسنجی می‌کند.
if (-not $SkipBackend) {
    Step '۲.۵/۶ بررسی همگامی مدل با مایگریشن‌های سرور'
    ssh -t $Srv "sudo -u ${AppUser} bash -lc 'cd $AppDir/hrms_project && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $AppDir/venv/bin/python manage.py makemigrations --check --dry-run'"
    if ($LASTEXITCODE -ne 0) {
        throw 'مدل‌ها با مایگریشن‌های روی سرور همگام نیستند (احتمالاً یک فایل مایگریشن منتقل نشده). لیست BackendFiles را بازبینی کنید.'
    }
    Ok 'مدل و مایگریشن همگام است.'
}


# ---------------------------------------------------------------- مایگریشن
# ---------------------------------------------------------------- نصب آفلاین وابستگی‌های جدید
# نکته: پوشهٔ venv روی سرور ممکن است مالکیت root داشته باشد؛ بنابراین اول بررسی
# می‌کنیم بسته‌ها واقعاً غایب‌اند، و در صورت نیاز نصب را با root انجام می‌دهیم.
if (Test-Path $WheelDir) {
    $wheels = @(Get-ChildItem -Path $WheelDir -Filter '*.whl' -File -ErrorAction SilentlyContinue)
    if ($wheels.Count -gt 0) {
        Step '۲.۶/۶ نصب آفلاین وابستگی‌های پایتون (در صورت نیاز)'

        # ۱) آیا هر دو بسته روی سرور import می‌شوند؟ (بدون هیچ تغییری)
        $probeImport = @(ssh $Srv "$AppDir/venv/bin/python -c 'import jazzmin, dotenv' && echo HAVE_ALL || echo NEED_SOME")
        if ($probeImport -contains 'HAVE_ALL') {
            Ok 'هر دو بسته از قبل نصب‌اند (django-jazzmin + python-dotenv)؛ نیازی به نصب نیست.'
        } else {
            ssh $Srv 'rm -rf /tmp/hrms-wheels && mkdir -p /tmp/hrms-wheels'
            if ($LASTEXITCODE -ne 0) { throw 'آماده‌سازی /tmp/hrms-wheels ناموفق بود.' }
            scp $wheels.FullName "${Srv}:/tmp/hrms-wheels/"
            if ($LASTEXITCODE -ne 0) { throw 'انتقال wheel ها ناموفق بود.' }

            # تلاش ۱: نصب با کاربر برنامه (بدون --upgrade تا بسته‌های موجود دست نخورند)
            ssh -t $Srv "sudo -u ${AppUser} $AppDir/venv/bin/pip install --no-index --find-links /tmp/hrms-wheels django-jazzmin python-dotenv"
            $installRc = $LASTEXITCODE

            if ($installRc -ne 0) {
                # تلاش ۲: مالکیت venv احتمالاً root است → نصب با root و بازگرداندن مالکیت
                Warn 'نصب با کاربر برنامه ناموفق بود (مالکیت venv). تلاش دوم با root...'
                ssh -t $Srv "sudo $AppDir/venv/bin/pip install --no-index --find-links /tmp/hrms-wheels django-jazzmin python-dotenv; sudo chown -R ${AppUser}:${AppUser} $AppDir/venv"
                $installRc = $LASTEXITCODE
            }

            ssh $Srv 'rm -rf /tmp/hrms-wheels'
            if ($installRc -ne 0) {
                Warn 'نصب آفلاین کامل نشد. اگر بستهٔ لازم غایب است، دستی نصب کنید (راهنما در انتهای همین اسکریپت).'
            } else {
                Ok 'نصب آفلاین وابستگی‌ها انجام شد.'
            }
        }
    }
}


if ($Migrate) {
    Step 'مایگریشن (migrate_schemas روی همهٔ شرکت‌ها)'
    ssh -t $Srv "sudo -u ${AppUser} bash -lc 'cd $AppDir/hrms_project && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $AppDir/venv/bin/python manage.py migrate_schemas'"
    if ($LASTEXITCODE -ne 0) { throw 'اجرای migrate_schemas ناموفق بود.' }
    Ok 'مایگریشن اعمال شد.'
} elseif (-not $SkipBackend) {
    Warn 'اگر مدل تغییر کرده، با -Migrate هم اجرا کنید (این تغییر فیلد issues نیاز به مایگریشن دارد).'
}

# ---------------------------------------------------------------- انتقال فایل‌های موجود
# فایل‌هایی که قبلاً با مسیر قدیمی آپلود شده‌اند (company_x/employee_y/documents/...)
# به ساختار جدید archive/company_x/<module>/<entity>/ منتقل می‌شوند.
# پیش‌فرض دستور «پیش‌نمایش» است؛ اینجا با --apply اجرا می‌شود.
if ($MoveFiles) {
    Step 'انتقال فایل‌های موجود به ساختار بایگانی'
    ssh -t $Srv "sudo -u ${AppUser} bash -lc 'cd $AppDir/hrms_project && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $AppDir/venv/bin/python manage.py archive_existing_files --apply'"
    if ($LASTEXITCODE -ne 0) {
        Warn 'انتقال فایل‌ها کامل نشد؛ خروجی بالا را بررسی کنید (فایل‌های ناموجود/خطای دسترسی).'
    } else { Ok 'فایل‌های موجود در ساختار بایگانی قرار گرفتند.' }
}

# ---------------------------------------------------------------- فرانت‌اند
if (-not $SkipFrontend) {
    if ($LocalBuild) {
        Step '۳/۶ بیلد محلی فرانت‌اند (حالت -LocalBuild)'
        Push-Location "$RepoRoot\frontend"
        try {
            if (-not $NoBuild) {
                npm run build
                if ($LASTEXITCODE -ne 0) { throw 'بیلد محلی ناموفق بود.' }
            } else { Warn 'بیلد رد شد (-NoBuild)' }
        } finally { Pop-Location }

        $buildDir = Join-Path $RepoRoot 'frontend\build'
        if (-not (Test-Path (Join-Path $buildDir 'index.html'))) { throw "پوشهٔ build پیدا نشد: $buildDir" }

        Step '۴/۶ انتقال build به سرور'
        ssh $Srv 'rm -rf /tmp/hrms-new && mkdir -p /tmp/hrms-new'
        if ($LASTEXITCODE -ne 0) { throw 'آماده‌سازی /tmp روی سرور ناموفق بود.' }
        scp -r $buildDir "${Srv}:/tmp/hrms-new"          # نتیجه: /tmp/hrms-new/build
        if ($LASTEXITCODE -ne 0) { throw 'انتقال build ناموفق بود.' }

        # محافظ: تا وقتی build جدید روی سرور تأیید نشده، build فعلی جابه‌جا/حذف نمی‌شود.
        ssh $Srv "test -d /tmp/hrms-new/build && test -f /tmp/hrms-new/build/index.html"
        if ($LASTEXITCODE -ne 0) { throw 'پوشهٔ build روی سرور در /tmp/hrms-new پیدا نشد؛ انتقال کامل نشده است (build فعلی دست‌نخورده ماند).' }
        Ok 'build جدید روی سرور تأیید شد (/tmp/hrms-new/build).'

        ssh -t $Srv "rm -rf $AppDir/frontend/build.old; if [ -d $AppDir/frontend/build ]; then sudo mv $AppDir/frontend/build $AppDir/frontend/build.old; fi; sudo mv /tmp/hrms-new/build $AppDir/frontend/build && sudo chown -R ${AppUser}:${AppUser} $AppDir/frontend/build && sudo rm -rf $AppDir/frontend/build.old /tmp/hrms-new"
        if ($LASTEXITCODE -ne 0) { throw 'جای‌گزینی build روی سرور ناموفق بود.' }
        Ok 'build جای‌گزین شد.'
    }
    else {
        if ($Archive -and -not $SkipBackend) {
            Warn 'سورس فرانت‌اند داخل همان آرشیو بک‌اند منتقل شد (-Archive).'
        }
        else {
        Step '۳/۶ ارسال سورس فرانت‌اند'
        Push-Location $RepoRoot
        try {
            foreach ($f in $FrontendFiles) {
                if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
                $name = Split-Path $f -Leaf
                $remoteDir = (Split-Path $f -Parent) -replace '\\', '/'
                scp $f "${Srv}:/tmp/$name"
                if ($LASTEXITCODE -ne 0) { throw "انتقال ناموفق: $f" }
                ssh -t $Srv "sudo mkdir -p $AppDir/$remoteDir; sudo cp /tmp/$name $AppDir/$f; sudo chown ${AppUser}:${AppUser} $AppDir/$f; rm -f /tmp/$name"
                if ($LASTEXITCODE -ne 0) { throw "جای‌گزینی ناموفق روی سرور: $f" }
                Ok $f
            }
        } finally { Pop-Location }
        }

        Step '۴/۶ بیلد روی سرور'
        if (-not $NoBuild) {
            ssh -t $Srv "sudo -u ${AppUser} bash -lc 'cd $AppDir/frontend && npm run build'"
            if ($LASTEXITCODE -ne 0) { throw 'بیلد روی سرور ناموفق بود (اگر node_modules ناقص است از -LocalBuild استفاده کنید).' }
        } else { Warn 'بیلد رد شد (-NoBuild)' }
    }

    Step '۵/۶ کپی اَسِت‌ها به مسیر /static (لازم برای nginx)'
    ssh -t $Srv "sudo cp -a $AppDir/frontend/build/static/. $StaticDir/ && sudo chown -R ${AppUser}:${AppUser} $StaticDir"
    if ($LASTEXITCODE -ne 0) { throw 'کپی اَسِت‌ها به /static ناموفق بود.' }

    # پاک‌سازی نسخه‌های قدیمی (۵ نسخهٔ آخر نگه داشته می‌شود؛ فایل‌های .map
    # قدیمی هر کدام چند مگابایت‌اند و دیسک را پر می‌کنند).
    ssh -t $Srv "sudo bash -c 'cd $StaticDir/js 2>/dev/null && ls -1t main.*.js 2>/dev/null | tail -n +6 | xargs -r rm -f; cd $StaticDir/js 2>/dev/null && ls -1t main.*.js.map 2>/dev/null | tail -n +6 | xargs -r rm -f; cd $StaticDir/js 2>/dev/null && ls -1t main.*.js.LICENSE.txt 2>/dev/null | tail -n +6 | xargs -r rm -f; cd $StaticDir/css 2>/dev/null && ls -1t main.*.css 2>/dev/null | tail -n +6 | xargs -r rm -f; cd $StaticDir/css 2>/dev/null && ls -1t main.*.css.map 2>/dev/null | tail -n +6 | xargs -r rm -f'"
    if ($LASTEXITCODE -ne 0) { Warn 'پاک‌سازی نسخه‌های قدیمی /static انجام نشد (ادامهٔ استقرار بی‌اثر است).' }
    Ok "$StaticDir به‌روزرسانی شد (نسخه‌های قدیمی پاک‌سازی شدند)."
} else { Warn 'فرانت‌اند رد شد (-SkipFrontend)' }

# ---------------------------------------------------------------- پوشهٔ بسته‌ها
# بسته‌های به‌روزرسانی خارج از MEDIA_ROOT نگهداری می‌شوند و باید قابل نوشتن
# توسط کاربر برنامه باشند.
Step '۵.۴/۶ آماده‌سازی پوشهٔ به‌روزرسانی'
ssh -t $Srv "sudo mkdir -p $AppDir/updates/inbox $AppDir/updates/staging $AppDir/updates/archive && sudo chown -R ${AppUser}:${AppUser} $AppDir/updates"
if ($LASTEXITCODE -ne 0) { Warn 'ساخت پوشهٔ updates ناموفق بود؛ آپلود بسته کار نخواهد کرد.' }

# ---------------------------------------------------------------- سرویس به‌روزرسان
# نصب systemd path/oneshot تا اجرای آپدیت از پنل بدون رمز sudo ممکن شود.
Step '۵.۵/۶ نصب سرویس به‌روزرسان (systemd)'
ssh -t $Srv "sudo sed -i 's/\r$//' $AppDir/scripts/install_updater_units.sh $AppDir/scripts/kian_updater.py 2>/dev/null; sudo bash $AppDir/scripts/install_updater_units.sh $AppDir"
if ($LASTEXITCODE -ne 0) {
    Warn 'نصب سرویس به‌روزرسان ناموفق بود؛ دکمهٔ «نصب» در پنل کار نخواهد کرد.'
} else {
    Ok 'سرویس به‌روزرسان نصب و فعال شد (hrms-update.path).'
}

# ---------------------------------------------------------------- تنظیم nginx
# لازم برای آپلود بسته‌های بزرگ و رفرش خودکار پس از به‌روزرسانی.
# اسکریپت idempotent است: اگر تنظیمات از قبل درست باشد چیزی تغییر نمی‌کند.
Step '۵.۶/۶ تنظیم nginx برای به‌روزرسانی درون‌برنامه‌ای'
ssh -t $Srv "sudo sed -i 's/\r$//' $AppDir/scripts/patch_nginx_for_updates.sh 2>/dev/null; sudo bash $AppDir/scripts/patch_nginx_for_updates.sh"
if ($LASTEXITCODE -ne 0) {
    Warn 'تنظیم nginx انجام نشد؛ برای آپلود بستهٔ بزرگ و رفرش خودکار، اسکریپت scripts/patch_nginx_for_updates.sh را دستی اجرا کنید.'
} else {
    Ok 'nginx برای به‌روزرسانی درون‌برنامه‌ای تنظیم شد.'
}

# ---------------------------------------------------------------- ری‌استارت
Step '۶/۶ ری‌استارت سرویس‌ها'
ssh -t $Srv "sudo systemctl restart gunicorn celery-worker celery-beat && sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) { throw 'ری‌استارت ناموفق بود (کاربر sudo دارد؟ نام سرویس‌ها درست است؟).' }
Ok 'سرویس‌ها ری‌استارت شدند.'

Step 'تأیید نهایی'
ssh $Srv "systemctl is-active gunicorn celery-worker celery-beat nginx; echo '--- storage backend:'; test -f $AppDir/hrms_project/settings_app/archive_views.py && echo 'archive_views OK' || echo 'MISSING archive_views'; echo '--- storage migration:'; ls $AppDir/hrms_project/settings_app/migrations/0012_*.py 2>/dev/null || echo 'MISSING 0012'; echo '--- jazzmin:'; $AppDir/venv/bin/pip show django-jazzmin 2>/dev/null | head -1 || echo 'jazzmin NOT installed'; echo '--- nginx /static/ alias:'; grep -n 'alias' /etc/nginx/sites-available/hrms 2>/dev/null || echo '  (config با این نام پیدا نشد)'; echo '--- آخرین فایل‌های js در static:'; ls -1t $StaticDir/js/main.*.js 2>/dev/null | head -5; echo '--- ارجاع index.html:'; grep -o 'main\.[a-z0-9]*\.js' $AppDir/frontend/build/index.html | head -1"
Ok 'کامل شد → مرورگر: Ctrl+Shift+R'

