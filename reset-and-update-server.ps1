<#
.SYNOPSIS
    ریست کامل لایهٔ اجرایی HRMS و آپدیت سرور — بدون حذف یا ریست دیتابیس.

.DESCRIPTION
    این اسکریپت:
      1) فرانت‌اند را از نو build می‌کند.
      2) بستهٔ کامل بک‌اند (شامل فایل‌های جدید و مایگریشن‌ها) را می‌سازد.
      3) روی سرور از دیتابیس و کد فعلی بکاپ می‌گیرد.
      4) سرویس‌ها را متوقف، کدها را جای‌گزین، کش‌ها را پاک و مایگریشن‌ها را
         به‌صورت in-place اجرا می‌کند.
      5) build و فایل‌های استاتیک را از نو مستقر و سرویس‌ها را ری‌استارت می‌کند.
      6) وجود رکورد ماژول «مدیریت اسناد و مدارک» و مایگریشن core.0016 را تأیید می‌کند.

    دیتابیس هرگز drop/flush/truncate نمی‌شود. فقط migrate روی همان دیتابیس اجرا می‌شود.

.EXAMPLE
    .\reset-and-update-server.ps1

.EXAMPLE
    .\reset-and-update-server.ps1 -CheckOnly

.EXAMPLE
    .\reset-and-update-server.ps1 -SkipBackup

.EXAMPLE
    .\reset-and-update-server.ps1 -SkipFrontendBuild
#>
[CmdletBinding()]
param(
    [string] $User      = 'hradmin',
    [string] $Server    = '192.168.1.63',
    [string] $AppUser   = 'hrms',
    [string] $AppDir    = '/opt/hrms',
    [string] $StaticDir = '/var/www/hrms/static',
    [switch] $CheckOnly,
    [switch] $PackageOnly,
    [switch] $SkipBackup,
    [switch] $SkipFrontendBuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LocalLog = Join-Path $RepoRoot "reset-update-$Stamp.log"
$Srv = "$User@$Server"

function Step($text) { Write-Host "`n===== $text =====" -ForegroundColor Cyan }
function Ok($text) { Write-Host "   [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   [..] $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "   [error] $text" -ForegroundColor Red }

try {
    Start-Transcript -Path $LocalLog -Force | Out-Null
    Write-Host "HRMS reset/update — $Stamp" -ForegroundColor Cyan
    Write-Host "Database policy: PRESERVE (no drop/flush/truncate)" -ForegroundColor Green

    foreach ($cmd in @('ssh', 'scp', 'tar', 'git', 'node', 'npm')) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            throw "دستور '$cmd' در PATH پیدا نشد."
        }
    }

    Step "بررسی اتصال و دسترسی‌ها"
    $probe = @(ssh -o BatchMode=yes -o ConnectTimeout=12 $Srv "hostname; id -un; test -d $AppDir/hrms_project && echo APP_OK || echo APP_NO; test -w $AppDir/frontend && echo FRONTEND_OK || echo FRONTEND_NO; test -w $StaticDir && echo STATIC_OK || echo STATIC_NO; command -v systemctl >/dev/null && echo SYSTEMCTL_OK; sudo -n true 2>/dev/null && echo SUDO_NOPASS || echo SUDO_NEEDS_PASSWORD")
    if ($LASTEXITCODE -ne 0) { throw "اتصال SSH به $Srv برقرار نشد." }
    $probe | ForEach-Object { Write-Host "   $_" }
    if ($probe -notcontains 'APP_OK') { throw "مسیر برنامه روی سرور پیدا نشد: $AppDir/hrms_project" }
    if ($probe -contains 'SUDO_NEEDS_PASSWORD') {
        Warn 'sudo بدون رمز نیست؛ هنگام اجرای واقعی یک‌بار رمز sudo پرسیده می‌شود.'
    } else {
        Ok 'sudo بدون رمز فعال است.'
    }

    if ($CheckOnly) {
        Ok 'بررسی اتصال و مسیرها کامل شد؛ هیچ تغییری اعمال نشد.'
        return
    }

    Step "ساخت build تمیز فرانت‌اند"
    $frontendDir = Join-Path $RepoRoot 'frontend'
    $buildDir = Join-Path $frontendDir 'build'
    if ($SkipFrontendBuild) {
        if (-not (Test-Path (Join-Path $buildDir 'index.html'))) {
            throw "build موجود نیست؛ بدون -SkipFrontendBuild اجرا کنید."
        }
        Warn 'ساخت build رد شد (-SkipFrontendBuild).'
    } else {
        Push-Location $frontendDir
        try {
            if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
            & npm run build
            if ($LASTEXITCODE -ne 0) { throw 'build فرانت‌اند ناموفق بود.' }
        } finally {
            Pop-Location
        }
    }
    if (-not (Test-Path (Join-Path $buildDir 'index.html'))) {
        throw "index.html در build پیدا نشد: $buildDir"
    }
    Ok 'build فرانت‌اند آماده است.'

    Step "بسته‌بندی بک‌اند، اسکریپت و build"
    $stage = Join-Path $env:TEMP ("hrms-reset-stage-" + [guid]::NewGuid().ToString('N'))
    $payload = Join-Path $stage 'payload'
    $archive = Join-Path $env:TEMP ("hrms-reset-" + $Stamp + ".tgz")
    New-Item -ItemType Directory -Path $payload -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $stage 'frontend') -Force | Out-Null

    $files = @(git -C $RepoRoot -c core.quotepath=false ls-files --cached --others --exclude-standard -- hrms_project scripts | Sort-Object -Unique)
    if (-not $files.Count) { throw 'فهرست فایل‌های بک‌اند خالی است.' }
    foreach ($relative in $files) {
        $source = Join-Path $RepoRoot $relative
        if (-not (Test-Path -LiteralPath $source)) { continue }
        $destination = Join-Path $payload $relative
        New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination -Force
    }
    if (Test-Path (Join-Path $RepoRoot 'VERSION')) {
        Copy-Item -LiteralPath (Join-Path $RepoRoot 'VERSION') -Destination (Join-Path $payload 'VERSION') -Force
    }

    # Ensure the reset script is included and uses LF line endings on Linux.
    $remoteShellSource = Join-Path $RepoRoot 'scripts\reset-update-server.sh'
    if (-not (Test-Path $remoteShellSource)) { throw "اسکریپت سرور پیدا نشد: $remoteShellSource" }
    $remoteShellStage = Join-Path $payload 'scripts\reset-update-server.sh'
    New-Item -ItemType Directory -Path (Split-Path $remoteShellStage -Parent) -Force | Out-Null
    $shellText = [IO.File]::ReadAllText($remoteShellSource).Replace("`r`n", "`n").Replace("`r", "`n")
    [IO.File]::WriteAllText($remoteShellStage, $shellText, (New-Object System.Text.UTF8Encoding($false)))

    Copy-Item -LiteralPath $buildDir -Destination (Join-Path $stage 'frontend\build') -Recurse -Force
    & tar -czf $archive -C $stage .
    if ($LASTEXITCODE -ne 0) { throw 'ساخت آرشیو استقرار ناموفق بود.' }

    $sizeKb = [math]::Round((Get-Item -LiteralPath $archive).Length / 1KB, 1)
    Ok "بسته آماده شد: $sizeKb KB — $($files.Count) فایل بک‌اند"
    if ($PackageOnly) {
        Write-Host "Package: $archive" -ForegroundColor Cyan
        Write-Host "Stage:   $stage" -ForegroundColor Cyan
        return
    }

    Step "انتقال بسته به سرور"
    $remoteArchive = "/tmp/hrms-reset-$Stamp.tgz"
    $remoteDir = "/tmp/hrms-reset-$Stamp"
    & scp -q $archive "${Srv}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw 'انتقال بسته به سرور ناموفق بود.' }
    Ok "بسته روی سرور قرار گرفت: $remoteArchive"

    Step "اجرای ریست/آپدیت روی سرور"
    $backupFlag = if ($SkipBackup) { '0' } else { '1' }
    $remoteCmd = "set -e; rm -rf '$remoteDir'; mkdir -p '$remoteDir'; tar --warning=no-timestamp -xzf '$remoteArchive' -C '$remoteDir'; bash '$remoteDir/payload/scripts/reset-update-server.sh' '$AppDir' '$AppUser' '$StaticDir' '$remoteDir' '$Stamp' '$backupFlag'"
    Write-Host '   [..] در صورت نیاز، رمز sudo سرور را یک‌بار وارد کنید.' -ForegroundColor Yellow
    & ssh -t $Srv $remoteCmd
    if ($LASTEXITCODE -ne 0) { throw 'اجرای اسکریپت ریست/آپدیت روی سرور ناموفق بود.' }
    Ok 'ریست/آپدیت سرور با موفقیت انجام شد.'

    Step "تأیید نهایی از سمت ویندوز"
    $index = Invoke-WebRequest -Uri "http://$Server/" -UseBasicParsing -TimeoutSec 20
    $liveBundle = ($index.Content | Select-String -Pattern 'main\.[a-z0-9]+\.js' -AllMatches).Matches.Value | Select-Object -First 1
    $localBundle = ((Get-Content (Join-Path $buildDir 'index.html') -Raw) | Select-String -Pattern 'main\.[a-z0-9]+\.js' -AllMatches).Matches.Value | Select-Object -First 1
    if ($index.StatusCode -ne 200 -or -not $liveBundle) { throw 'صفحهٔ اصلی سایت در دسترس نیست.' }
    if ($localBundle -and $liveBundle -ne $localBundle) {
        throw "باندل زنده با build محلی یکی نیست. live=$liveBundle local=$localBundle"
    }
    $asset = Invoke-WebRequest -Uri "http://$Server/static/js/$liveBundle" -Method Head -UseBasicParsing -TimeoutSec 20
    if ($asset.StatusCode -ne 200) { throw "باندل استاتیک در دسترس نیست: $liveBundle" }
    Ok "HTTP 200 — باندل زنده: $liveBundle"

    # Cleanup remote temp files (best effort) and local staging.
    # Normalize 8.3 TEMP paths (e.g. R0F1F~1.KIA) before Remove-Item.
    & ssh -o BatchMode=yes $Srv "rm -rf '$remoteDir' '$remoteArchive'" 2>$null
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        $fullStage = (Get-Item -LiteralPath $stage).FullName
        Remove-Item -LiteralPath $fullStage -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($archive -and (Test-Path -LiteralPath $archive)) {
        $fullArchive = (Get-Item -LiteralPath $archive).FullName
        Remove-Item -LiteralPath $fullArchive -Force -ErrorAction SilentlyContinue
    }
    Ok 'ریست/آپدیت کامل شد. در مرورگر Ctrl+Shift+R بزنید.'
    Write-Host "Local log: $LocalLog" -ForegroundColor DarkGray
} catch {
    Fail $_.Exception.Message
    Write-Host "`nLocal log: $LocalLog" -ForegroundColor Yellow
    exit 1
} finally {
    try { Stop-Transcript | Out-Null } catch { }
}
