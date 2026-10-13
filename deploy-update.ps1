<#
.SYNOPSIS
    استقرار افزایشی HRMS روی سرور داخلی (192.168.1.63).

.DESCRIPTION
    رویهٔ اثبات‌شده:  scp به /tmp  →  sudo cp در مقصد  →  بیلد روی سرور  →  ری‌استارت.
    سرور اینترنت ندارد، پس روی آن npm install / git pull اجرا نمی‌شود.

    نکتهٔ کلیدی: nginx مسیر /static/ را از /var/www/hrms/static سرو می‌کند
    (location /static/ → alias) و index.html ساختهٔ CRA به /static/js/main.<hash>.js
    اشاره می‌کند؛ پس بعد از هر بیلد، اَسِت‌های build/static باید به آن مسیر هم کپی شوند.

.PARAMETER LocalBuild
    بیلد روی ویندوز انجام شود و پوشهٔ build منتقل شود (پیش‌فرض: بیلد روی سرور).

.PARAMETER Migrate
    اجرای migrate_schemas روی سرور — لازم پس از هر تغییر مدل
    (مثلاً افزودن فیلد issues = چک‌لیست نواقص سند).

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
    [switch] $CheckOnly
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
    'hrms_project/contracts/views.py',
    'hrms_project/contracts/excel_export.py',
    'hrms_project/contracts/tests.py',
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
    'hrms_project/projects/tests/test_phase3_quality_db.py'
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
    'frontend/src/pages/ExternalContractsPage.jsx',
    'frontend/src/pages/ContractProfilePage.jsx',
    'frontend/src/pages/AccountGroupsPage.jsx',
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
    'frontend/src/core/config/menuConfig.js'
)

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
if ($Migrate) {
    Step 'مایگریشن (migrate_schemas روی همهٔ شرکت‌ها)'
    ssh -t $Srv "sudo -u ${AppUser} bash -lc 'cd $AppDir/hrms_project && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $AppDir/venv/bin/python manage.py migrate_schemas'"
    if ($LASTEXITCODE -ne 0) { throw 'اجرای migrate_schemas ناموفق بود.' }
    Ok 'مایگریشن اعمال شد.'
} elseif (-not $SkipBackend) {
    Warn 'اگر مدل تغییر کرده، با -Migrate هم اجرا کنید (این تغییر فیلد issues نیاز به مایگریشن دارد).'
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
    Ok "$StaticDir به‌روزرسانی شد."
} else { Warn 'فرانت‌اند رد شد (-SkipFrontend)' }

# ---------------------------------------------------------------- ری‌استارت
Step '۶/۶ ری‌استارت سرویس‌ها'
ssh -t $Srv "sudo systemctl restart gunicorn celery-worker celery-beat && sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) { throw 'ری‌استارت ناموفق بود (کاربر sudo دارد؟ نام سرویس‌ها درست است؟).' }
Ok 'سرویس‌ها ری‌استارت شدند.'

Step 'تأیید نهایی'
ssh $Srv "systemctl is-active gunicorn celery-worker celery-beat nginx; echo '--- backend (باید 2 باشد):'; grep -c REPORTABLE_DOCUMENT_STATUSES $AppDir/hrms_project/accounting/report_views.py; echo '--- nginx /static/ alias:'; grep -n 'alias' /etc/nginx/sites-available/hrms 2>/dev/null || echo '  (config با این نام پیدا نشد)'; echo '--- hash در index.html:'; grep -o 'main\.[a-z0-9]*\.js' $AppDir/frontend/build/index.html; echo '--- hash موجود در ${StaticDir}:'; ls $StaticDir/js/ 2>/dev/null | grep main"
Ok 'کامل شد → مرورگر: Ctrl+Shift+R'

