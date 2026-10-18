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
    if ($check -notcontains 'FRONTEND_OK' -or $check -notcontains 'STATIC_OK') {
        throw "دسترسی نوشتن کامل نیست ($($check -join ', ')). پوشه‌ها باید برای $User قابل نوشتن باشند."
    }
    Ok "اتصال و دسترسی نوشتن تأیید شد."
    Ok 'حالت CheckOnly؛ هیچ بیلد/تغییری انجام نشد.'
    return
}

Step '۱/۴ بیلد فرانت‌اند'
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
if [ ! -w "$FRONTEND_DIR" ] || [ ! -w "$STATIC_DIR" ]; then
  echo "ERROR: no write access to $FRONTEND_DIR or $STATIC_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"
restore() {
  trap - ERR
  if [ -d build.old ]; then
    rm -rf build
    mv build.old build || true
  fi
}
trap restore ERR

rm -rf build.old
if [ -d build ]; then mv build build.old; fi
if ! mv "$TMP_DIR/build" ./build; then
  restore
  exit 1
fi

mkdir -p "$STATIC_DIR"
cp -r --update=none build/static/. "$STATIC_DIR/" || true
chmod -R u=rwX,g=rX,o=rX build
trap - ERR
rm -rf build.old "$TMP_DIR"

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
$remoteCmd = "set -e; rm -rf '$tmp'; mkdir -p '$tmp'; tar -xzf - -C '$tmp'; bash '$tmp/deploy.sh' '$AppDir' '$StaticDir' '$tmp'"

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
$live = ($index.Content | Select-String -Pattern 'main\.[a-z0-9]+\.js' -AllMatches).Matches.Value | Select-Object -First 1
if ($index.StatusCode -ne 200 -or -not $live) { throw 'صفحهٔ اصلی یا باندل در دسترس نیست.' }
$asset = Invoke-WebRequest -Uri "http://$Server/static/js/$live" -Method Head -UseBasicParsing -TimeoutSec 15
Ok "HTTP $($index.StatusCode) — باندل زنده: $live ($($asset.StatusCode))"
Ok 'استقرار فرانت‌اند کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
