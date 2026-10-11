<#
.SYNOPSIS
    استقرار افزایشی HRMS روی سرور داخلی (سرور اینترنت ندارد → بیلد محلی + کپی).

.DESCRIPTION
    ۱) بررسی اتصال SSH
    ۲) ارسال فایل‌های تغییریافتهٔ بک‌اند به /opt/hrms/hrms_project/accounting
    ۳) بیلد محلی فرانت‌اند (npm run build)
    ۴) انتقال پوشهٔ build به /opt/hrms/frontend/build  (nginx: location / )
    ۵) کپی اَسِت‌های JS/CSS به /var/www/hrms/static  (nginx: location /static/ )
    ۶) ری‌استارت gunicorn/celery و reload nginx
    ۷) تأیید وضعیت سرویس‌ها و نسخهٔ فایل‌های مستقرشده

.EXAMPLE
    .\deploy-update.ps1                     # استقرار کامل (بک‌اند + فرانت‌اند)
.EXAMPLE
    .\deploy-update.ps1 -CheckOnly           # فقط تست اتصال SSH، بدون هیچ تغییری
.EXAMPLE
    .\deploy-update.ps1 -SkipFrontend        # فقط بک‌اند
.EXAMPLE
    .\deploy-update.ps1 -User hradmin -Server 192.168.1.63
#>
[CmdletBinding()]
param(
    [string] $User      = 'hrms',                  # کاربر SSH روی سرور
    [string] $Server    = '192.168.1.63',          # IP سرور
    [string] $AppDir    = '/opt/hrms',             # ریشهٔ پروژه روی سرور
    [string] $StaticDir = '/var/www/hrms/static',  # مسیر location /static/ در nginx
    [switch] $SkipBackend,
    [switch] $SkipFrontend,
    [switch] $NoBuild,
    [switch] $NoSudo,
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$Srv      = "$User@$Server"
$RepoRoot = $PSScriptRoot
# اگر کاربر SSH شما sudo ندارد (مثلاً کاربر hrms) این سوییچ را بزنید؛
# در آن حالت باید با کاربر مالک /opt/hrms (یا root) وارد شده باشید.
$S = if ($NoSudo) { '' } else { 'sudo ' }

# فایل‌هایی که در این تغییر دست‌خورده‌اند (می‌توانید برای تغییرات دیگر ویرایش کنید)
$BackendFiles = @(
    'hrms_project/accounting/constants.py',
    'hrms_project/accounting/report_views.py',
    'hrms_project/accounting/annual_views.py',
    'hrms_project/accounting/tax_views.py'
)

function Step ($m) { Write-Host "`n===== $m =====" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "   [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "   [..] $m" -ForegroundColor Yellow }

Step "۱/۶ بررسی اتصال به $Srv"
ssh -o ConnectTimeout=10 $Srv 'echo "   connected: $(hostname) / user: $(whoami)"'
if ($LASTEXITCODE -ne 0) {
    throw "اتصال SSH برقرار نشد. نام کاربری (-User) یا کلید SSH را بررسی کنید."
}
Ok 'اتصال برقرار است.'
if ($CheckOnly) { Warn '-CheckOnly → پایان بدون تغییر.'; return }

# ---------------------------------------------------------------- بک‌اند
if (-not $SkipBackend) {
    Step '۲/۶ ارسال فایل‌های بک‌اند'
    Push-Location $RepoRoot
    try {
        foreach ($f in $BackendFiles) {
            if (-not (Test-Path $f)) { throw "فایل پیدا نشد: $f" }
            scp $f "${Srv}:$AppDir/hrms_project/accounting/"
            if ($LASTEXITCODE -ne 0) { throw "انتقال ناموفق: $f" }
            Ok $f
        }
    } finally { Pop-Location }
} else { Warn 'بک‌اند رد شد (-SkipBackend)' }

# ---------------------------------------------------------------- فرانت‌اند
if (-not $SkipFrontend) {
    Step '۳/۶ بیلد محلی فرانت‌اند'
    Push-Location "$RepoRoot\frontend"
    try {
        if (-not $NoBuild) {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw 'بیلد فرانت‌اند ناموفق بود.' }
        } else { Warn 'بیلد رد شد (-NoBuild)' }
    } finally { Pop-Location }

    $buildDir = Join-Path $RepoRoot 'frontend\build'
    if (-not (Test-Path (Join-Path $buildDir 'index.html'))) { throw "پوشهٔ build پیدا نشد: $buildDir" }

    Step '۴/۶ انتقال build به سرور'
    ssh $Srv 'rm -rf /tmp/hrms-new && mkdir -p /tmp/hrms-new'
    if ($LASTEXITCODE -ne 0) { throw 'آماده‌سازی /tmp روی سرور ناموفق بود.' }
    scp -r $buildDir "${Srv}:/tmp/hrms-new"          # → /tmp/hrms-new/build
    if ($LASTEXITCODE -ne 0) { throw 'انتقال build ناموفق بود.' }
    Ok 'build منتقل شد.'

    # جای‌گزینی امن پوشهٔ build + کپی اَسِت‌ها در مسیر /static/
    ssh -t $Srv "rm -rf $AppDir/frontend/build.old; if [ -d $AppDir/frontend/build ]; then ${S}mv $AppDir/frontend/build $AppDir/frontend/build.old; fi; ${S}mv /tmp/hrms-new/build $AppDir/frontend/build && ${S}chown -R ${User}:www-data $AppDir/frontend/build && ${S}rm -rf $AppDir/frontend/build.old /tmp/hrms-new && ${S}cp -a $AppDir/frontend/build/static/. $StaticDir/ && ${S}chown -R ${User}:www-data $StaticDir"
    if ($LASTEXITCODE -ne 0) { throw 'جای‌گزینی build روی سرور ناموفق بود.' }
    Ok "build و اَسِت‌های /static جای‌گزین شدند."
} else { Warn 'فرانت‌اند رد شد (-SkipFrontend)' }

# ---------------------------------------------------------------- ری‌استارت
Step '۵/۶ ری‌استارت سرویس‌ها'
ssh -t $Srv "${S}systemctl restart gunicorn celery-worker celery-beat && ${S}systemctl reload nginx"
if ($LASTEXITCODE -ne 0) { throw 'ری‌استارت سرویس‌ها ناموفق بود (شاید این کاربر sudo ندارد).' }
Ok 'سرویس‌ها ری‌استارت شدند.'

Step '۶/۶ تأیید نهایی'
ssh $Srv "systemctl is-active gunicorn celery-worker celery-beat nginx; echo '--- backend:'; grep -c REPORTABLE_DOCUMENT_STATUSES $AppDir/hrms_project/accounting/report_views.py; echo '--- build:'; ls $AppDir/frontend/build/static/js/ | head -3; echo '--- static:'; ls $StaticDir/js/ | head -3"
Ok "کامل شد. مرورگر را با Ctrl+F5 بازآوری کنید (index.html کش‌شده نکند)."
