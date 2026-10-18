<#
.SYNOPSIS
    استقرار بک‌اند HRMS با کمترین تعداد پرسش رمز.

.DESCRIPTION
    همهٔ فایل‌های سورس بک‌اند (فایل‌های تحت مدیریت Git در hrms_project و scripts)
    در یک بستهٔ tar.gz قرار می‌گیرند و با یک عملیات scp منتقل می‌شوند. سپس یک
    اسکریپت روی سرور، ابتدا یک‌بار رمز sudo را می‌گیرد و همهٔ کارهای مدیریتی
    (جای‌گزینی فایل‌ها، بررسی مایگریشن، migrate و ری‌استارت) را با همان
    اعتبار sudo انجام می‌دهد.

    نتیجه: بدون کلید SSH حداکثر دو پرسش رمز SSH (scp + ssh) و یک پرسش رمز sudo؛
    با کلید SSH فقط یک پرسش رمز sudo. برخلاف نسخهٔ قبلی، هیچ فایلی جداگانه منتقل
    نمی‌شود و رمز به ازای هر فایل پرسیده نمی‌شود.

.EXAMPLE
    .\deploy-backend.ps1 -Migrate
.EXAMPLE
    .\deploy-backend.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [string] $User      = 'hradmin',
    [string] $Server    = '192.168.1.63',
    [string] $AppUser   = 'hrms',
    [string] $AppDir    = '/opt/hrms',
    [switch] $Migrate,
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$Srv = "$User@$Server"
$RepoRoot = $PSScriptRoot

function Step($text) { Write-Host "`n===== $text =====" -ForegroundColor Cyan }
function Ok($text) { Write-Host "   [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   [..] $text" -ForegroundColor Yellow }

if ($CheckOnly) {
    Step "بررسی اتصال SSH به $Srv"
    $probe = @(ssh $Srv "hostname; id -un; test -d $AppDir/hrms_project && echo APP_OK || echo APP_NO; sudo -n true && echo SUDO_OK || echo SUDO_NEEDS_PASSWORD")
    if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد: $Srv" }
    if ($probe -notcontains 'APP_OK') { throw "مسیر برنامه روی سرور پیدا نشد: $AppDir/hrms_project" }
    if ($probe -contains 'SUDO_OK') { Ok 'sudo بدون رمز فعال است.' }
    else { Warn 'sudo بدون رمز نیست؛ هنگام اجرای واقعی یک بار رمز sudo پرسیده می‌شود.' }
    Ok 'اتصال و مسیر برنامه تأیید شد.'
    return
}

Step '۱/۴ بسته‌بندی سورس بک‌اند'
$tempRoot = (Get-Item -LiteralPath $env:TEMP).FullName
$stage = Join-Path $tempRoot ("hrms-backend-stage-" + [guid]::NewGuid().ToString('N'))
$payload = Join-Path $stage 'payload'
$archive = Join-Path $tempRoot ("hrms-backend-" + [guid]::NewGuid().ToString('N') + ".tar.gz")

$deployScript = @'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
APP_USER="$2"
DO_MIGRATE="$3"
TMP_DIR="$4"
HRMS_DIR="$APP_DIR/hrms_project"

if [ ! -d "$HRMS_DIR" ]; then
  echo "ERROR: application directory not found: $HRMS_DIR" >&2
  exit 1
fi

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# فقط یک بار رمز sudo را می‌گیریم؛ بقیهٔ دستورها از cache همان tty استفاده می‌کنند.
echo "Requesting sudo once..."
sudo -v

echo "Replacing backend source files..."
sudo -n cp -a "$TMP_DIR/payload/." "$APP_DIR/"
sudo -n chown -R "$APP_USER:$APP_USER" "$HRMS_DIR" "$APP_DIR/scripts"

echo "Checking model/migration sync..."
sudo -n -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $APP_DIR/venv/bin/python manage.py makemigrations --check --dry-run"

if [ "$DO_MIGRATE" = "1" ]; then
  echo "Running migrations..."
  sudo -n -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $APP_DIR/venv/bin/python manage.py migrate_schemas"
fi

echo "Restarting services..."
sudo -n systemctl restart gunicorn celery-worker celery-beat
sudo -n systemctl reload nginx

echo "--- service status ---"
systemctl is-active gunicorn celery-worker celery-beat nginx || true
echo "--- contracts migrations (tail) ---"
sudo -n -u "$APP_USER" bash -lc "cd '$HRMS_DIR' && set -a && . ./.env && set +a && DJANGO_SETTINGS_MODULE=hrms_project.settings.production $APP_DIR/venv/bin/python manage.py showmigrations contracts | tail -5"

echo "BACKEND_DEPLOY_OK"
'@

try {
    New-Item -ItemType Directory -Path $payload -Force | Out-Null
    $files = @(git -C $RepoRoot -c core.quotepath=false ls-files -- hrms_project scripts)
    if (Test-Path -LiteralPath (Join-Path $RepoRoot 'VERSION')) { $files += 'VERSION' }
    if ($files.Count -eq 0) { throw 'فهرست فایل‌های بک‌اند خالی است (git ls-files).' }

    foreach ($f in $files) {
        $src = Join-Path $RepoRoot $f
        if (-not (Test-Path -LiteralPath $src)) { throw "فایل پیدا نشد: $f" }
        $dst = Join-Path $payload $f
        New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }

    $scriptPath = Join-Path $stage 'deploy-backend.sh'
    $scriptText = $deployScript.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($scriptPath, $scriptText, (New-Object System.Text.UTF8Encoding($false)))

    & tar -czf $archive -C $stage .
    if ($LASTEXITCODE -ne 0) { throw 'ساخت بستهٔ بک‌اند ناموفق بود.' }
    Ok ("بستهٔ بک‌اند ساخته شد: {0:N1} KB — {1} فایل" -f ((Get-Item -LiteralPath $archive).Length / 1KB), $files.Count)
} catch {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
    throw
}
Step '۲/۴ انتقال بسته به سرور'
$remoteArchive = "/tmp/hrms-backend-$(Get-Date -Format 'yyyyMMddHHmmss').tgz"
try {
    scp -q $archive "${Srv}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'انتقال بستهٔ بک‌اند ناموفق بود.' }
    Ok 'بسته روی سرور قرار گرفت.'
} catch {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
    throw
}

Step '۳/۴ جای‌گزینی، مایگریشن و ری‌استارت (یک نشست SSH)'
$tmp = "/tmp/hrms-backend-$(Get-Date -Format 'yyyyMMddHHmmss')"
$migrateFlag = if ($Migrate) { '1' } else { '0' }
$remoteCmd = "set -e; rm -rf '$tmp'; mkdir -p '$tmp'; tar --warning=no-timestamp -xzf '$remoteArchive' -C '$tmp'; bash '$tmp/deploy-backend.sh' '$AppDir' '$AppUser' '$migrateFlag' '$tmp'; rm -f '$remoteArchive'"

Write-Host '   [..] در صورت ورود با رمز: حداکثر یک بار رمز SSH و یک بار رمز sudo.' -ForegroundColor Yellow
try {
    ssh -t $Srv $remoteCmd
    if ($LASTEXITCODE -ne 0) { throw 'استقرار بک‌اند روی سرور ناموفق بود.' }
    Ok 'استقرار بک‌اند با موفقیت انجام شد.'
} finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
}

Step '۴/۴ پایان'
Ok 'برای دریافت وضعیت سرویس‌ها، خروجی بخش قبل را بررسی کنید.'

