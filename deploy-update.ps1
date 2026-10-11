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

.EXAMPLE
    .\deploy-update.ps1                  # استقرار کامل (بک‌اند + فرانت‌اند با بیلد روی سرور)
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
    [switch] $LocalBuild,
    [switch] $SkipBackend,
    [switch] $SkipFrontend,
    [switch] $NoBuild,
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$Srv      = "$User@$Server"
$RepoRoot = $PSScriptRoot

# فایل‌های تغییریافتهٔ بک‌اند (مسیر نسبت به ریشهٔ مخزن)
$BackendFiles = @(
    'hrms_project/accounting/constants.py',
    'hrms_project/accounting/report_views.py',
    'hrms_project/accounting/annual_views.py',
    'hrms_project/accounting/tax_views.py'
)

# فایل‌های تغییریافتهٔ فرانت‌اند (در حالت پیش‌فرض = بیلد روی سرور)
$FrontendFiles = @(
    'frontend/src/pages/accounting/reports/MatrixReportPage.jsx',
    'frontend/src/pages/accounting/reports/TreeTrialBalancePage.jsx',
    'frontend/src/pages/accounting/reports/LedgerReviewPage.jsx'
)

function Step ($m) { Write-Host "`n===== $m =====" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "   [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "   [..] $m" -ForegroundColor Yellow }

Step "۱/۶ بررسی اتصال و مجوز sudo روی $Srv"
ssh -o ConnectTimeout=10 $Srv 'echo "  host: $(hostname) | user: $(whoami) | sudo: $(sudo -n true 2>/dev/null && echo yes || echo no-password-required-no)"'
if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد. نام کاربری (-User) یا کلید/رمز را بررسی کنید." }
Ok 'اتصال برقرار است.'
if ($CheckOnly) { Warn '-CheckOnly → پایان بدون تغییر.'; return }

# ---------------------------------------------------------------- بک‌اند
if (-not $SkipBackend) {
    Step '۲/۶ ارسال فایل‌های بک‌اند'
    Push-Location $RepoRoot
    try {
        foreach ($f in $BackendFiles) {
            if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
            $name = Split-Path $f -Leaf
            scp $f "${Srv}:/tmp/$name"
            if ($LASTEXITCODE -ne 0) { throw "انتقال ناموفق: $f" }
            ssh -t $Srv "sudo cp /tmp/$name $AppDir/hrms_project/accounting/$name; sudo chown ${AppUser}:${AppUser} $AppDir/hrms_project/accounting/$name; sudo chmod 644 $AppDir/hrms_project/accounting/$name; rm -f /tmp/$name"
            if ($LASTEXITCODE -ne 0) { throw "جای‌گزینی ناموفق روی سرور: $name" }
            Ok $f
        }
    } finally { Pop-Location }
    Ok 'فایل‌های بک‌اند جای‌گزین شدند.'
} else { Warn 'بک‌اند رد شد (-SkipBackend)' }

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
        ssh -t $Srv "rm -rf $AppDir/frontend/build.old; if [ -d $AppDir/frontend/build ]; then sudo mv $AppDir/frontend/build $AppDir/frontend/build.old; fi; sudo mv /tmp/hrms-new/build $AppDir/frontend/build && sudo chown -R ${AppUser}:${AppUser} $AppDir/frontend/build && sudo rm -rf $AppDir/frontend/build.old /tmp/hrms-new"
        if ($LASTEXITCODE -ne 0) { throw 'جای‌گزینی build روی سرور ناموفق بود.' }
        Ok 'build جای‌گزین شد.'
    }
    else {
        Step '۳/۶ ارسال سورس فرانت‌اند'
        Push-Location $RepoRoot
        try {
            foreach ($f in $FrontendFiles) {
                if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
                $name = Split-Path $f -Leaf
                scp $f "${Srv}:/tmp/$name"
                if ($LASTEXITCODE -ne 0) { throw "انتقال ناموفق: $f" }
                ssh -t $Srv "sudo cp /tmp/$name $AppDir/$f; sudo chown ${AppUser}:${AppUser} $AppDir/$f; rm -f /tmp/$name"
                if ($LASTEXITCODE -ne 0) { throw "جای‌گزینی ناموفق روی سرور: $f" }
                Ok $f
            }
        } finally { Pop-Location }

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

