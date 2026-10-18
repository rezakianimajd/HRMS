<#
.SYNOPSIS
    فعال‌سازی/به‌روزرسانی بک‌اند تنظیمات ظاهر (پالت ماژول‌ها و فونت‌ها) روی سرور HRMS.

.DESCRIPTION
    فایل‌های settings_app را به /tmp/hrms-appearance روی سرور منتقل می‌کند،
    سپس با sudo در /opt/hrms/hrms_project/settings_app جایگزین کرده،
    مالکیت را به کاربر hrms می‌دهد و gunicorn را ری‌استارت می‌کند.
    در پایان وجود فیلدهای buttonSize/buttonWeight و پاسخ 401 اندپوینت را بررسی می‌کند.

    این اسکریپت برای تغییرات بک‌اند است و برخلاف deploy-frontend.ps1 به sudo نیاز دارد؛
    هنگام اجرا رمز sudo کاربر hradmin را در ترمینال وارد کنید.

.EXAMPLE
    .\deploy-appearance-backend.ps1

.EXAMPLE
    .\deploy-appearance-backend.ps1 -CheckOnly

.EXAMPLE
    .\deploy-appearance-backend.ps1 -User hradmin -Server 192.168.1.63
#>
[CmdletBinding()]
param(
    [string] $User    = 'hradmin',
    [string] $Server  = '192.168.1.63',
    [string] $AppUser = 'hrms',
    [string] $AppDir  = '/opt/hrms',
    [string] $Stage   = '/tmp/hrms-appearance',
    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'
$Srv = "$User@$Server"
$RepoRoot = $PSScriptRoot
$Files = @(
    @{ Local = 'hrms_project/settings_app/views.py';                  Remote = 'settings_app/views.py' },
    @{ Local = 'hrms_project/settings_app/urls.py';                   Remote = 'settings_app/urls.py' },
    @{ Local = 'hrms_project/settings_app/engines/settings_engine.py'; Remote = 'settings_app/engines/settings_engine.py' }
)

function Step($text) { Write-Host "`n===== $text =====" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "   [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   [..] $text" -ForegroundColor Yellow }

Step "۱/۴ بررسی فایل‌های محلی و اتصال SSH به $Srv"
foreach ($f in $Files) {
    $p = Join-Path $RepoRoot $f.Local
    if (-not (Test-Path $p)) { throw "فایل محلی پیدا نشد: $p" }
}
Ok 'هر سه فایل بک‌اند موجود هستند.'

$probe = @(ssh -o BatchMode=yes -o ConnectTimeout=10 $Srv 'hostname; id -un; sudo -n true 2>/dev/null && echo SUDO_OK || echo SUDO_NEEDS_PASSWORD')
if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد: $Srv" }
Ok ("اتصال برقرار است: {0}" -f ($probe -join ', '))
if ($probe -contains 'SUDO_NEEDS_PASSWORD') {
    Warn 'sudo رمز عبور می‌خواهد؛ هنگام اجرای مرحلهٔ نصب، رمز را در ترمینال وارد کنید.'
}

$applyCmd = "sudo bash -c 'set -e; cp $Stage/settings_app/views.py $AppDir/hrms_project/settings_app/views.py; cp $Stage/settings_app/urls.py $AppDir/hrms_project/settings_app/urls.py; cp $Stage/settings_app/engines/settings_engine.py $AppDir/hrms_project/settings_app/engines/settings_engine.py; chown $AppUser`:$AppUser $AppDir/hrms_project/settings_app/views.py $AppDir/hrms_project/settings_app/urls.py $AppDir/hrms_project/settings_app/engines/settings_engine.py; systemctl restart gunicorn'"

if ($CheckOnly) {
    Step '۲/۴ حالت CheckOnly'
    Ok 'هیچ فایلی آپلود یا جایگزین نشد.'
    Write-Host "`nدستور نصب (در حالت عادی اجرا می‌شود):" -ForegroundColor DarkGray
    Write-Host "ssh -t $Srv `"$applyCmd`"" -ForegroundColor DarkGray
    return
}

Step '۲/۴ آپلود فایل‌های بک‌اند به پوشهٔ موقت سرور'
ssh -o BatchMode=yes $Srv "mkdir -p $Stage/settings_app/engines"
if ($LASTEXITCODE -ne 0) { throw 'ساخت پوشهٔ موقت روی سرور ناموفق بود.' }
foreach ($f in $Files) {
    $local = Join-Path $RepoRoot $f.Local
    scp -q -o BatchMode=yes $local "${Srv}:$Stage/$($f.Remote)"
    if ($LASTEXITCODE -ne 0) { throw "انتقال فایل ناموفق بود: $($f.Local)" }
}
Ok "فایل‌ها در $Stage آپلود شدند."

Step '۳/۴ جایگزینی فایل‌ها و ری‌استارت gunicorn (نیازمند sudo)'
Write-Host 'اگر رمز sudo خواسته شد، آن را وارد کنید...' -ForegroundColor Yellow
ssh -t $Srv $applyCmd
if ($LASTEXITCODE -ne 0) { throw 'جایگزینی فایل‌ها یا ری‌استارت gunicorn ناموفق بود.' }
Ok 'فایل‌ها جایگزین و gunicorn ری‌استارت شد.'

Step '۴/۴ بررسی نهایی'
$count = @(ssh -o BatchMode=yes $Srv "grep -c buttonSize $AppDir/hrms_project/settings_app/views.py 2>/dev/null || echo 0")
$countText = ($count -join '').Trim()
if ([int]$countText -lt 2) {
    throw "فیلدهای buttonSize در فایل نصب‌شده پیدا نشد (count=$countText)."
}
Ok "فیلدهای فونت دکمهٔ هدر در بک‌اند فعال هستند (count=$countText)."

$http = (& curl.exe -s -o NUL -w '%{http_code}' "http://$Server/api/settings/appearance/").Trim()
if ($http -eq '401') {
    Ok 'GET /api/settings/appearance/ برای کاربر مهمان 401 برمی‌گرداند (اندپوینت فعال است).'
} else {
    Warn "پاسخ اندپوینت $http است؛ انتظار 401 بود. وضعیت gunicorn/nginx را بررسی کنید."
}
Ok 'فعال‌سازی بک‌اند تنظیمات ظاهر کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
