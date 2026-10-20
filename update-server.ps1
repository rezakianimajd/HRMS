<#
.SYNOPSIS
    آپدیت کامل سرور HRMS: بک‌اند + فرانت‌اند + مایگریشن + ری‌استارت.

.DESCRIPTION
    این اسکریپت همان مسیر امن و تست‌شدهٔ deploy-backend.ps1 و
    deploy-frontend.ps1 را orchestration می‌کند و فهرست فایل ثابتی ندارد؛
    بنابراین فایل‌های جدید و تغییرکرده به‌صورت خودکار منتقل می‌شوند.

    ترتیب اجرا:
      1) بررسی اتصال و ابزارهای لازم
      2) استقرار بک‌اند (همهٔ فایل‌های تحت Git + migrate + restart)
      3) بیلد و استقرار فرانت‌اند
      4) تأیید سرویس‌ها و باندل زنده

.PARAMETER NoMigrate
    اجرای migrate_schemas را غیرفعال می‌کند.

.PARAMETER NoBuild
    بیلد فرانت‌اند انجام نشود و آخرین build موجود منتقل شود.

.PARAMETER SkipBackend
    فقط فرانت‌اند به‌روزرسانی شود.

.PARAMETER SkipFrontend
    فقط بک‌اند و مایگریشن به‌روزرسانی شود.

.PARAMETER CheckOnly
    فقط اتصال SSH، مسیرها و مجوزها بررسی شوند؛ هیچ تغییری اعمال نمی‌شود.

.EXAMPLE
    .\update-server.ps1

.EXAMPLE
    .\update-server.ps1 -CheckOnly

.EXAMPLE
    .\update-server.ps1 -NoBuild

.EXAMPLE
    .\update-server.ps1 -SkipFrontend

.EXAMPLE
    .\update-server.ps1 -SkipBackend

.EXAMPLE
    .\update-server.ps1 -NoMigrate
#>
[CmdletBinding()]
param(
    [string] $User      = 'hradmin',
    [string] $Server    = '192.168.1.63',
    [string] $AppUser   = 'hrms',
    [string] $AppDir    = '/opt/hrms',
    [string] $StaticDir = '/var/www/hrms/static',
    [switch] $NoMigrate,
    [switch] $NoBuild,
    [switch] $SkipBackend,
    [switch] $SkipFrontend,
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
$BackendScript = Join-Path $RepoRoot 'deploy-backend.ps1'
$FrontendScript = Join-Path $RepoRoot 'deploy-frontend.ps1'

function Step($text) { Write-Host "`n===== $text =====" -ForegroundColor Cyan }
function Ok($text) { Write-Host "   [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   [..] $text" -ForegroundColor Yellow }

if ($SkipBackend -and $SkipFrontend) {
    throw 'هر دو بخش بک‌اند و فرانت‌اند رد شده‌اند؛ چیزی برای آپدیت وجود ندارد.'
}

foreach ($cmd in @('ssh', 'scp', 'tar', 'git')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "دستور '$cmd' در PATH پیدا نشد."
    }
}

if (-not $SkipBackend -and -not (Test-Path -LiteralPath $BackendScript)) {
    throw "اسکریپت بک‌اند پیدا نشد: $BackendScript"
}
if (-not $SkipFrontend -and -not (Test-Path -LiteralPath $FrontendScript)) {
    throw "اسکریپت فرانت‌اند پیدا نشد: $FrontendScript"
}
if (-not $SkipFrontend -and -not $NoBuild -and -not (Test-Path (Join-Path $RepoRoot 'frontend\node_modules'))) {
    throw 'frontend\node_modules پیدا نشد. یک‌بار npm install را اجرا کنید یا از -NoBuild استفاده کنید.'
}

Step "آپدیت سرور $Server"

if ($CheckOnly) {
    if (-not $SkipBackend) {
        & $BackendScript -User $User -Server $Server -AppUser $AppUser -AppDir $AppDir -CheckOnly
        if (-not $?) { throw 'بررسی بک‌اند ناموفق بود.' }
    } else {
        Warn 'بررسی بک‌اند رد شد (-SkipBackend).'
    }

    if (-not $SkipFrontend) {
        & $FrontendScript -User $User -Server $Server -AppDir $AppDir -StaticDir $StaticDir -CheckOnly
        if (-not $?) { throw 'بررسی فرانت‌اند ناموفق بود.' }
    } else {
        Warn 'بررسی فرانت‌اند رد شد (-SkipFrontend).'
    }

    Ok 'بررسی اتصال و دسترسی‌ها کامل شد؛ هیچ تغییری اعمال نشد.'
    return
}

if (-not $SkipBackend) {
    Step '۱/۲ استقرار بک‌اند و مایگریشن'
    $backendArgs = @{
        User    = $User
        Server  = $Server
        AppUser = $AppUser
        AppDir  = $AppDir
    }
    if (-not $NoMigrate) { $backendArgs.Migrate = $true }
    & $BackendScript @backendArgs
    if (-not $?) { throw 'استقرار بک‌اند ناموفق بود.' }
    Ok 'بک‌اند با موفقیت به‌روزرسانی شد.'
} else {
    Warn 'بک‌اند رد شد (-SkipBackend).'
}

if (-not $SkipFrontend) {
    Step '۲/۲ بیلد و استقرار فرانت‌اند'
    $frontendArgs = @{
        User      = $User
        Server    = $Server
        AppDir    = $AppDir
        StaticDir = $StaticDir
    }
    if ($NoBuild) { $frontendArgs.NoBuild = $true }
    & $FrontendScript @frontendArgs
    if (-not $?) { throw 'استقرار فرانت‌اند ناموفق بود.' }
} else {
    Warn 'فرانت‌اند رد شد (-SkipFrontend).'
}

Step 'تأیید نهایی'
$probe = @(ssh $User@$Server "hostname; systemctl is-active gunicorn celery-worker celery-beat nginx")
if ($LASTEXITCODE -ne 0) { throw 'بررسی نهایی سرویس‌ها ناموفق بود.' }
$probe | ForEach-Object { Write-Host "   $_" }

Ok 'آپدیت کامل سرور انجام شد. در مرورگر Ctrl+Shift+R بزنید.'
