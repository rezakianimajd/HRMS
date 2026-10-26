<#
.SYNOPSIS
    فعال‌سازی/به‌روزرسانی بک‌اند تنظیمات ظاهر (پالت ماژول‌ها، فونت‌ها و توکن‌های جدول) روی سرور HRMS.

.DESCRIPTION
    فایل‌های settings_app (از جمله appearance_schema.py که توکن‌های جدول را اعتبارسنجی می‌کند)
    به /tmp/hrms-appearance روی سرور منتقل می‌شوند، سپس با sudo در
    /opt/hrms/hrms_project/settings_app جایگزین شده، مالکیت به کاربر hrms داده می‌شود و
    gunicorn ری‌استارت می‌شود. در پایان تطابق MD5، وجود توکن‌های جدید جدول و پاسخ 401
    اندپوینت‌ها بررسی می‌شود.

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
    @{ Local = 'hrms_project/settings_app/appearance_schema.py';       Remote = 'settings_app/appearance_schema.py' },
    @{ Local = 'hrms_project/settings_app/login_branding.py';          Remote = 'settings_app/login_branding.py' },
    @{ Local = 'hrms_project/settings_app/views.py';                   Remote = 'settings_app/views.py' },
    @{ Local = 'hrms_project/settings_app/urls.py';                    Remote = 'settings_app/urls.py' },
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
Ok ("{0} فایل بک‌اند موجود است." -f $Files.Count)

$probe = @(ssh -o BatchMode=yes -o ConnectTimeout=10 $Srv 'hostname; id -un; sudo -n true 2>/dev/null && echo SUDO_OK || echo SUDO_NEEDS_PASSWORD')
if ($LASTEXITCODE -ne 0) { throw "اتصال SSH برقرار نشد: $Srv" }
Ok ("اتصال برقرار است: {0}" -f ($probe -join ', '))
if ($probe -contains 'SUDO_NEEDS_PASSWORD') {
    Warn 'sudo رمز عبور می‌خواهد؛ هنگام اجرای مرحلهٔ نصب، رمز را در ترمینال وارد کنید.'
}

$remoteFiles = ($Files | ForEach-Object { "$AppDir/hrms_project/$($_.Remote)" }) -join ' '
$copyCmds = ($Files | ForEach-Object { "cp $Stage/$($_.Remote) $AppDir/hrms_project/$($_.Remote);" }) -join ' '
$applyCmd = "sudo bash -c 'set -e; $copyCmds chown $AppUser`:$AppUser $remoteFiles; systemctl restart gunicorn'"

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

Step '۴/۴ بررسی نهایی (تطابق MD5 و توکن‌های جدید جدول)'
$localSchema = Join-Path $RepoRoot 'hrms_project/settings_app/appearance_schema.py'
$localHash = (Get-FileHash -LiteralPath $localSchema -Algorithm MD5).Hash.ToLower()
$remoteHash = (@(ssh -o BatchMode=yes $Srv "md5sum $AppDir/hrms_project/settings_app/appearance_schema.py | cut -d' ' -f1") -join '').Trim().ToLower()
if ($remoteHash -ne $localHash) {
    throw "appearance_schema.py روی سرور با نسخهٔ محلی یکسان نیست (remote=$remoteHash local=$localHash)."
}
Ok 'MD5 فایل appearance_schema.py روی سرور با نسخهٔ محلی یکسان است.'

$tokens = (@(ssh -o BatchMode=yes $Srv "grep -c -E 'dividerStyle|headerAlign|frameMarginX' $AppDir/hrms_project/settings_app/appearance_schema.py") -join '').Trim()
if ([int]$tokens -lt 3) {
    throw "توکن‌های جدید جدول در فایل نصب‌شده پیدا نشد (count=$tokens)."
}
Ok "توکن‌های جدید جدول (خط جداکننده/تراز هدر/قاب) در بک‌اند فعال‌اند (count=$tokens)."

foreach ($path in @('/api/settings/appearance/', '/api/settings/login-branding/')) {
    $http = (& curl.exe -s -o NUL -w '%{http_code}' "http://$Server$path").Trim()
    if ($http -eq '401') {
        Ok "GET $path → 401 (اندپوینت فعال است)."
    } else {
        Warn "GET $path → $http؛ انتظار 401 بود. وضعیت gunicorn/nginx را بررسی کنید."
    }
}
Ok 'به‌روزرسانی بک‌اند تنظیمات ظاهر کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
