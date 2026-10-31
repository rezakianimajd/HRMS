<#
.SYNOPSIS
    بیلد و استقرار سریع فقط فرانت‌اند HRMS روی سرور داخلی (بدون sudo).

.DESCRIPTION
    این اسکریپت برای تغییرات UI/فرانت‌اند است و برخلاف deploy-update.ps1
    به sudo نیازی ندارد؛ چون پوشه‌های /opt/hrms/frontend و /var/www/hrms/static
    برای کاربر hradmin قابل نوشتن هستند.

    مراحل:
      1) بیلد محلی (قابل رد کردن با -NoBuild)
      2) ساخت بستهٔ فشرده از build + اسکریپت استقرار
      3) یک اتصال SSH: انتقال بسته از stdin، استخراج و جایگزینی اتمیک build
      4) کپی دارایی‌ها به /static، پاک‌سازی و تأیید HTTP

    نکته: کل عملیات فقط یک اتصال SSH باز می‌کند؛ بنابراین در حالت ورود با رمز،
    رمز سرور حداکثر یک بار پرسیده می‌شود (نه به ازای هر فایل/دستور).

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

# فقط برای بررسی اتصال/دسترسی؛ یک اتصال SSH و حداکثر یک بار رمز.
if ($CheckOnly) {
    Step "بررسی اتصال SSH به $Srv"
    $check = @(ssh $Srv "hostname; id -un; test -w $AppDir/frontend && echo FRONTEND_OK || echo FRONTEND_NO; test -w $StaticDir && echo STATIC_OK || echo STATIC_NO")
    if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد: $Srv" }
    if ($check -notcontains 'FRONTEND_OK') {
        throw "پوشهٔ فرانت‌اند برای $User قابل نوشتن نیست ($($check -join ', '))."
    }
    if ($check -notcontains 'STATIC_OK') {
        Warn 'پوشهٔ /static قابل نوشتن نیست؛ دارایی‌ها از build/assets سرو می‌شوند (بدون نیاز به sudo).'
    }
    Ok "اتصال و دسترسی نوشتن فرانت‌اند تأیید شد."
    Ok 'حالت CheckOnly؛ هیچ بیلد/تغییری انجام نشد.'
    return
}

Step '۱/۴ بیلد فرانت‌اند'
if ($NoBuild) {
    Warn 'بیلد رد شد (-NoBuild).'
} else {
    Push-Location (Join-Path $RepoRoot 'frontend')
    try {
        # PUBLIC_URL=/assets باعث می‌شود همهٔ فایل‌ها (از جمله chunkهای lazy)
        # با مسیر /assets/static/... سرو شوند؛ nginx مسیر / را از build می‌خواند
        # و مسیر /static/ به Django (فایل‌های استاتیک) می‌رسد.
        $env:PUBLIC_URL = '/assets'
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'بیلد فرانت‌اند ناموفق بود.' }
    } finally {
        Remove-Item Env:PUBLIC_URL -ErrorAction SilentlyContinue
        Pop-Location
    }
}
$buildDir = Join-Path $RepoRoot 'frontend\build'
if (-not (Test-Path (Join-Path $buildDir 'index.html'))) { throw "پوشهٔ build پیدا نشد: $buildDir" }

# ساختار نهایی: build/assets/static/{js,css,media} + build/index.html
# (index.html همین حالا به /assets/static/... اشاره می‌کند؛ بازنویسی لازم نیست)
$staticDirLocal = Join-Path $buildDir 'static'
$assetsDirLocal = Join-Path $buildDir 'assets'
if (Test-Path $staticDirLocal) {
    Step '۱.۵/۴ آماده‌سازی دارایی‌های build/assets'
    $targetStatic = Join-Path $assetsDirLocal 'static'
    if (Test-Path $targetStatic) { Remove-Item -LiteralPath $targetStatic -Recurse -Force }
    New-Item -ItemType Directory -Path $assetsDirLocal -Force | Out-Null
    Copy-Item -LiteralPath $staticDirLocal -Destination $targetStatic -Recurse -Force
    Remove-Item -LiteralPath $staticDirLocal -Recurse -Force
    $fileCount = (Get-ChildItem -LiteralPath $targetStatic -Recurse -File | Measure-Object).Count
    Ok "دارایی‌ها (شامل chunkهای lazy) به build/assets/static منتقل شدند: $fileCount فایل"
} else {
    Warn 'پوشهٔ static در build وجود ندارد؛ فرض می‌شود دارایی‌ها از قبل در build/assets هستند.'
}

Step '۲/۴ آماده‌سازی بستهٔ استقرار'
$tempRoot = (Get-Item -LiteralPath $env:TEMP).FullName
$stage = Join-Path $tempRoot ("hrms-frontend-stage-" + [guid]::NewGuid().ToString('N'))
$archive = Join-Path $tempRoot ("hrms-frontend-" + [guid]::NewGuid().ToString('N') + ".tar.gz")
$deployScript = @'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
STATIC_DIR="$2"
TMP_DIR="$3"
FRONTEND_DIR="$APP_DIR/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "ERROR: frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi
if [ ! -w "$FRONTEND_DIR" ]; then
  echo "ERROR: no write access to $FRONTEND_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"
OLD_DIR="build.old.$(date +%s)"
restore() {
  trap - ERR
  if [ -d "$OLD_DIR" ]; then
    rm -rf build 2>/dev/null || true
    mv "$OLD_DIR" build || true
  fi
}
trap restore ERR

if [ -d build ]; then mv build "$OLD_DIR"; fi
if ! mv "$TMP_DIR/build" ./build; then
  restore
  exit 1
fi

# حالت سازگار با نسخه‌های قدیمی؛ در حالت build/assets نیازی به /static نیست.
if [ -d build/static ] && [ -w "$STATIC_DIR" ]; then
  cp -r --update=none build/static/. "$STATIC_DIR/" || true
fi
chmod -R u=rwX,g=rX,o=rX build
trap - ERR
rm -rf "$TMP_DIR"
rm -rf "$OLD_DIR" 2>/dev/null || true

BUNDLE=$(grep -o 'main\.[a-z0-9]*\.js' build/index.html | head -1 || true)
echo "ACTIVE_BUNDLE=$BUNDLE"
'@

try {
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    Copy-Item -Path $buildDir -Destination (Join-Path $stage 'build') -Recurse -Force
    $scriptPath = Join-Path $stage 'deploy.sh'
    $scriptText = $deployScript.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($scriptPath, $scriptText, (New-Object System.Text.UTF8Encoding($false)))

    & tar -czf $archive -C $stage .
    if ($LASTEXITCODE -ne 0) { throw 'ساخت بستهٔ استقرار ناموفق بود.' }
    Ok 'بستهٔ استقرار ساخته شد.'
} catch {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
    throw
}

Step '۳/۴ انتقال و استقرار روی سرور'
$tmp = "/tmp/hrms-frontend-$(Get-Date -Format 'yyyyMMddHHmmss')"
$remoteCmd = "set -e; rm -rf '$tmp'; mkdir -p '$tmp'; tar --warning=no-timestamp -xzf - -C '$tmp'; bash '$tmp/deploy.sh' '$AppDir' '$StaticDir' '$tmp'"

Write-Host '   [..] اتصال SSH و انتقال بسته؛ در صورت نیاز فقط همین یک بار رمز سرور را وارد کنید.' -ForegroundColor Yellow
try {
    # یک اتصال SSH: بسته از stdin منتقل و همان‌جا استخراج/استقرار می‌شود.
    $cmdLine = "type `"$archive`" | ssh $Srv `"$remoteCmd`""
    & cmd.exe /c $cmdLine
    if ($LASTEXITCODE -ne 0) { throw 'انتقال/استقرار روی سرور ناموفق بود.' }
    Ok 'باندل روی سرور جایگزین شد.'
} finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
}

Step '۴/۴ تأیید نهایی'
$index = Invoke-WebRequest -Uri "http://$Server/" -UseBasicParsing -TimeoutSec 15
$match = [regex]::Match($index.Content, 'src="([^"]*main\.[a-z0-9]+\.js)"')
$livePath = if ($match.Success) { $match.Groups[1].Value } else { '' }
if ($index.StatusCode -ne 200 -or -not $livePath) { throw 'صفحهٔ اصلی یا مسیر باندل در دسترس نیست.' }
$asset = Invoke-WebRequest -Uri ("http://$Server" + $livePath) -Method Head -UseBasicParsing -TimeoutSec 15
Ok "HTTP $($index.StatusCode) — باندل زنده: $livePath ($($asset.StatusCode))"
Ok 'استقرار فرانت‌اند کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
