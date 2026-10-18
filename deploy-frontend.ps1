<#
.SYNOPSIS
    بیلد و استقرار سریع فقط فرانت‌اند HRMS روی سرور داخلی (بدون sudo).

.DESCRIPTION
    این اسکریپت برای تغییرات UI/فرانت‌اند است و برخلاف deploy-update.ps1
    به sudo نیازی ندارد؛ چون پوشه‌های /opt/hrms/frontend و /var/www/hrms/static
    برای کاربر hradmin قابل نوشتن هستند.

    مراحل:
      1) بررسی اتصال SSH
      2) بررسی دسترسی نوشتن مقصد
      3) بیلد محلی (قابل رد کردن با -NoBuild)
      4) انتقال build به /tmp روی سرور
      5) جایگزینی اتمیک build + کپی دارایی‌ها به /static + پاک‌سازی
      6) تأیید HTTP و نمایش باندل فعال

.EXAMPLE
    .\deploy-frontend.ps1
.EXAMPLE
    .\deploy-frontend.ps1 -NoBuild
.EXAMPLE
    .\deploy-frontend.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [string] $User      = 'hradmin',
    [string] $Server    = '192.168.1.63',
    [string] $AppDir    = '/opt/hrms',
    [string] $StaticDir = '/var/www/hrms/static',
    [switch] $NoBuild,
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$Srv = "$User@$Server"
$RepoRoot = $PSScriptRoot

function Step($text) { Write-Host "`n===== $text =====" -ForegroundColor Cyan }
function Ok($text) { Write-Host "   [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   [..] $text" -ForegroundColor Yellow }

Step "۱/۵ بررسی اتصال SSH به $Srv"
ssh -o BatchMode=yes -o ConnectTimeout=8 $Srv 'hostname; id -un'
if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد: $Srv" }
Ok 'اتصال برقرار است.'

Step '۲/۵ بررسی دسترسی نوشتن مقصد (بدون sudo)'
$access = @(ssh -o BatchMode=yes $Srv "test -w $AppDir/frontend && echo FRONTEND_OK || echo FRONTEND_NO; test -w $StaticDir && echo STATIC_OK || echo STATIC_NO")
if ($LASTEXITCODE -ne 0) { throw 'بررسی دسترسی‌ها ناموفق بود.' }
if ($access -notcontains 'FRONTEND_OK' -or $access -notcontains 'STATIC_OK') {
    throw "دسترسی نوشتن کامل نیست ($($access -join ', ')). پوشه‌ها باید برای $User قابل نوشتن باشند."
}
Ok 'دسترسی نوشتن روی build و static تأیید شد.'

if ($CheckOnly) {
    Ok 'حالت CheckOnly؛ هیچ بیلد/تغییری انجام نشد.'
    return
}

Step '۳/۵ بیلد فرانت‌اند'
if ($NoBuild) {
    Warn 'بیلد رد شد (-NoBuild).'
} else {
    Push-Location (Join-Path $RepoRoot 'frontend')
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'بیلد فرانت‌اند ناموفق بود.' }
    } finally { Pop-Location }
}
$buildDir = Join-Path $RepoRoot 'frontend\build'
if (-not (Test-Path (Join-Path $buildDir 'index.html'))) { throw "پوشهٔ build پیدا نشد: $buildDir" }

Step '۴/۵ انتقال build به سرور'
$tmp = "/tmp/hrms-frontend-$(Get-Date -Format 'yyyyMMddHHmmss')"
ssh -o BatchMode=yes $Srv "rm -rf $tmp && mkdir -p $tmp"
if ($LASTEXITCODE -ne 0) { throw 'آماده‌سازی پوشهٔ موقت ناموفق بود.' }

scp -r -q $buildDir "${Srv}:$tmp"
if ($LASTEXITCODE -ne 0) { throw 'انتقال build ناموفق بود.' }

ssh -o BatchMode=yes $Srv "test -f $tmp/build/index.html"
if ($LASTEXITCODE -ne 0) { throw 'build روی سرور تأیید نشد؛ بیلد فعلی دست‌نخورده ماند.' }
Ok "build روی سرور تأیید شد ($tmp)."

Step '۵/۵ جایگزینی build و کپی دارایی‌ها'
$remote = "cd $AppDir/frontend || exit 1; " +
    "rm -rf build.old; " +
    "if [ -d build ]; then mv build build.old || exit 1; fi; " +
    "mv $tmp/build ./build || { [ -d build.old ] && mv build.old build; exit 1; }; " +
    "cp -r --update=none build/static/. $StaticDir/ || true; " +
    "chmod -R u=rwX,g=rX,o=rX build; " +
    "rm -rf build.old $tmp || true; " +
    "grep -o 'main\.[a-z0-9]*\.js' build/index.html | head -1"

$bundle = ssh -o BatchMode=yes $Srv $remote
if ($LASTEXITCODE -ne 0) { throw 'جایگزینی build ناموفق بود (در صورت وجود build.old، خودکار بازگردانی می‌شود).' }
Ok "باندل فعال روی سرور: $bundle"

Step 'تأیید نهایی'
$index = Invoke-WebRequest -Uri "http://$Server/" -UseBasicParsing -TimeoutSec 15
$live = ($index.Content | Select-String -Pattern 'main\.[a-z0-9]+\.js' -AllMatches).Matches.Value | Select-Object -First 1
if ($index.StatusCode -ne 200 -or -not $live) { throw 'صفحهٔ اصلی یا باندل در دسترس نیست.' }
$asset = Invoke-WebRequest -Uri "http://$Server/static/js/$live" -Method Head -UseBasicParsing -TimeoutSec 15
Ok "HTTP $($index.StatusCode) — باندل زنده: $live ($($asset.StatusCode))"
Ok 'استقرار فرانت‌اند کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
