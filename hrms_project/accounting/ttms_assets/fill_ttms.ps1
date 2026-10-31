<#
.SYNOPSIS
    درج ردیف‌های صورت معاملات فصلی (خرید) در فایل Access نسخهٔ TTMS.

.DESCRIPTION
    این اسکریپت فایل هدف را مستقیماً تغییر نمی‌دهد؛ ابتدا یک کپی می‌سازد و ردیف‌ها
    را در همان کپی درج می‌کند. همهٔ درج‌ها داخل یک تراکنش انجام می‌شود و در پایان
    جمع‌های کنترل (تعداد، مبلغ، مالیات) با manifest.json مقایسه می‌شود؛ در صورت
    اختلاف، تغییرات بازگردانی (rollback) می‌شود. نتیجه در result.json نوشته می‌شود
    تا در HRMS بارگذاری شود.

.PARAMETER PackageDir
    پوشهٔ بستهٔ دریافتی از HRMS (شامل manifest.json و rows.csv). پیش‌فرض: پوشهٔ این اسکریپت.

.PARAMETER Target
    مسیر فایل Access نسخهٔ TTMS (مثلاً C:\TTMS\TTMS_96_New.mdb).

.PARAMETER OutputDir
    پوشهٔ فایل پرشده. پیش‌فرض: پوشهٔ فایل هدف.

.PARAMETER DryRun
    درج آزمایشی و بازگردانی تراکنش؛ فایل پرشده باقی نمی‌ماند.

.PARAMETER InPlace
    نوشتن روی خود فایل هدف پس از تهیهٔ پشتیبان (پیش‌فرض: کار روی کپی).

.PARAMETER Force
    ادامهٔ کار حتی اگر بازبینی جمع‌ها اختلاف نشان دهد.

.EXAMPLE
    .\fill_ttms.ps1 -Target "C:\TTMS\TTMS_96_New.mdb"

.EXAMPLE
    .\fill_ttms.ps1 -Target "C:\TTMS\TTMS_96_New.mdb" -DryRun
#>
param(
    [string]$PackageDir = $PSScriptRoot,
    [Parameter(Mandatory = $true)][string]$Target,
    [string]$OutputDir = '',
    [switch]$DryRun,
    [switch]$InPlace,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$manifestPath = Join-Path $PackageDir 'manifest.json'
$rowsPath = Join-Path $PackageDir 'rows.csv'
$resultPath = Join-Path $PackageDir 'result.json'
$startedAt = Get-Date

$result = [ordered]@{
    package_version  = ''
    package_name     = ''
    status           = 'failed'
    mode             = $(if ($DryRun) { 'dry_run' } elseif ($InPlace) { 'in_place' } else { 'copy' })
    provider         = ''
    target           = ''
    output           = ''
    header_created   = $false
    inserted         = 0
    expected         = [ordered]@{ rows = 0; amount = 0; vat = 0 }
    observed         = [ordered]@{ rows = 0; amount = 0; vat = 0 }
    verification     = [ordered]@{ rows = $false; amount = $false; vat = $false }
    started_at       = $startedAt.ToString('s')
    finished_at      = ''
    duration_seconds = 0
    message          = ''
    errors           = @()
}

function Save-Result {
    param([string]$Path = $resultPath)
    try {
        ($result | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $Path -Encoding UTF8
    } catch {
        Write-Host ('هشدار: نوشتن result.json ناموفق بود: ' + $_.Exception.Message) -ForegroundColor Yellow
    }
}

function Stop-WithError {
    param([string]$Message, [int]$Code = 2)
    $result.status = 'failed'
    $result.message = $Message
    $result.errors = @($result.errors) + @($Message)
    $result.finished_at = (Get-Date).ToString('s')
    $result.duration_seconds = [math]::Round(((Get-Date) - $script:startedAt).TotalSeconds, 1)
    Save-Result
    Write-Host ''
    Write-Host ('خطا: ' + $Message) -ForegroundColor Red
    Write-Host ('جزئیات در فایل: ' + $resultPath)
    exit $Code
}

function ConvertTo-SqlText {
    param($Value)
    if ($null -eq $Value) { return "''" }
    return "'" + ([string]$Value).Replace("'", "''") + "'"
}

function Get-Scalar {
    param($Connection, [string]$Sql)
    $rs = $Connection.Execute($Sql)
    $value = $null
    if (-not $rs.EOF) {
        $value = $rs.Fields.Item(0).Value
    }
    $rs.Close()
    return $value
}

function Get-Number {
    param($Value)
    if ($null -eq $Value -or $Value -is [System.DBNull]) { return 0 }
    return [double]$Value
}

Write-Host '=== درج ردیف‌های صورت معاملات فصلی در فایل TTMS ===' -ForegroundColor Cyan
Write-Host ('پوشهٔ بسته: ' + $PackageDir)
Write-Host ('فایل هدف : ' + $Target)
if ($DryRun) { Write-Host 'حالت: اجرای آزمایشی (بدون تغییر ماندگار)' -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# ۱) اعتبارسنجی بسته
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $manifestPath)) {
    Stop-WithError 'فایل manifest.json در پوشهٔ بسته پیدا نشد. بسته را دوباره دانلود و از حالت فشرده خارج کنید.' 2
}
if (-not (Test-Path -LiteralPath $rowsPath)) {
    Stop-WithError 'فایل rows.csv در پوشهٔ بسته پیدا نشد.' 2
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$result.package_version = [string]$manifest.package.version
$result.package_name = [string]$manifest.package.name
$result.target = $Target
$result.expected.rows = [int]$manifest.totals.rows
$result.expected.amount = [double]$manifest.totals.amount
$result.expected.vat = [double]$manifest.totals.vat

if ($result.package_version -ne 'ttms-fill-1.0') {
    Write-Host ('هشدار: نسخهٔ بسته (' + $result.package_version + ') با نسخهٔ این اسکریپت (ttms-fill-1.0) یکسان نیست.') -ForegroundColor Yellow
}

$rows = @(Import-Csv -LiteralPath $rowsPath -Encoding UTF8)
if ($rows.Count -eq 0) {
    Stop-WithError 'فایل rows.csv ردیفی ندارد؛ بستهٔ جدید بسازید.' 2
}
if ($rows.Count -ne $result.expected.rows) {
    Stop-WithError ('تعداد ردیف‌های rows.csv (' + $rows.Count + ') با manifest (' + $result.expected.rows + ') نمی‌خواند.') 2
}

if ($manifest.checksum -and $manifest.checksum.rows_file_sha256) {
    $actualHash = (Get-FileHash -LiteralPath $rowsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne ([string]$manifest.checksum.rows_file_sha256).ToLowerInvariant()) {
        Stop-WithError 'اثر انگشت rows.csv با بسته نمی‌خواند؛ فایل دست‌کاری شده یا ناقص است.' 2
    }
}

$columnNames = @($rows[0].PSObject.Properties | ForEach-Object { $_.Name })
$kindOf = @{}
foreach ($column in $manifest.columns) { $kindOf[[string]$column.name] = [string]$column.kind }
foreach ($name in $columnNames) {
    if (-not $kindOf.ContainsKey($name)) {
        Stop-WithError ('ستون ناشناخته در rows.csv: ' + $name) 2
    }
}
foreach ($required in @('Radif', 'KalaKhadamatName', 'Price', 'MaliatArzeshAfzoodeh', 'ForoushandeLastNameSherkatName')) {
    if ($columnNames -notcontains $required) {
        Stop-WithError ('ستون الزامی در rows.csv وجود ندارد: ' + $required) 2
    }
}

# ---------------------------------------------------------------------------
# ۲) آماده‌سازی فایل کاری (کپی) و پشتیبان
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Target)) {
    Stop-WithError ('فایل هدف پیدا نشد: ' + $Target) 2
}
$targetFull = (Resolve-Path -LiteralPath $Target).Path
$result.target = $targetFull
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($targetFull)
$extension = [System.IO.Path]::GetExtension($targetFull)

if ($DryRun) {
    $workPath = Join-Path ([System.IO.Path]::GetTempPath()) ('ttms-dryrun-' + $stamp + $extension)
    Copy-Item -LiteralPath $targetFull -Destination $workPath -Force
    $result.mode = 'dry_run'
} elseif ($InPlace) {
    $backupPath = Join-Path ([System.IO.Path]::GetDirectoryName($targetFull)) ('{0}.backup-{1}{2}' -f $baseName, $stamp, $extension)
    Copy-Item -LiteralPath $targetFull -Destination $backupPath -Force
    Write-Host ('پشتیبان تهیه شد: ' + $backupPath) -ForegroundColor DarkGray
    $workPath = $targetFull
    $result.mode = 'in_place'
} else {
    $outDir = if ($OutputDir) { $OutputDir } else { [System.IO.Path]::GetDirectoryName($targetFull) }
    if (-not (Test-Path -LiteralPath $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $workPath = Join-Path $outDir ('{0}.filled-{1}{2}' -f $baseName, $stamp, $extension)
    Copy-Item -LiteralPath $targetFull -Destination $workPath -Force
    $result.mode = 'copy'
}
$result.output = $workPath
Write-Host ('فایل کاری: ' + $workPath) -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# ۳) اتصال به فایل (ACE در اولویت، سپس Jet)
# ---------------------------------------------------------------------------
$cn = $null
$lastError = ''
foreach ($candidate in @('Microsoft.ACE.OLEDB.16.0', 'Microsoft.ACE.OLEDB.12.0', 'Microsoft.Jet.OLEDB.4.0')) {
    try {
        $connection = New-Object -ComObject ADODB.Connection
        $connection.Open("Provider=$candidate;Data Source=$workPath;Mode=Share Deny None;")
        $cn = $connection
        $result.provider = $candidate
        break
    } catch {
        $lastError = $_.Exception.Message
        try { $connection.Close() } catch { }
    }
}
if ($null -eq $cn) {
    if ($DryRun) { Remove-Item -LiteralPath $workPath -Force -ErrorAction SilentlyContinue }
    Stop-WithError ('هیچ درایور Access (ACE/Jet) در دسترس نیست. Microsoft Access Database Engine 2016 (یا Microsoft Access) را نصب کنید. جزئیات: ' + $lastError) 3
}
Write-Host ('درایور: ' + $result.provider) -ForegroundColor DarkGray


# ---------------------------------------------------------------------------
# ۴) درج تراکنشی سرصفحه و ردیف‌ها
# ---------------------------------------------------------------------------
$headerTable = [string]$manifest.target.header_table
$detailTable = [string]$manifest.target.detail_table
$yearCode = [int]$manifest.target.hc_year_code
$seasonCode = [int]$manifest.target.hc_fasl_type_code
$continueRadif = $true
if ($null -ne $manifest.options.continue_radif) { $continueRadif = [bool]$manifest.options.continue_radif }

$inserted = 0
$failure = $null
$allVerified = $false

$cn.BeginTrans()
try {
    $headerCount = [int](Get-Number (Get-Scalar $cn ("SELECT COUNT(*) AS C FROM [$headerTable] WHERE HCYearCode=$yearCode AND HCFaslTypeCode=$seasonCode")))
    if ($headerCount -eq 0) {
        $guid = [guid]::NewGuid().ToString()
        $cn.Execute("INSERT INTO [$headerTable] (Code, HCFaslTypeCode, HCYearCode, IsSent) VALUES ('$guid', $seasonCode, $yearCode, False)") | Out-Null
        $result.header_created = $true
        Write-Host ('سرصفحهٔ جدید فصل ساخته شد: ' + $guid) -ForegroundColor DarkGray
    } else {
        Write-Host ('سرصفحهٔ فصل از قبل موجود است (' + $headerCount + ' ردیف).') -ForegroundColor DarkGray
    }

    $countBefore = Get-Number (Get-Scalar $cn "SELECT COUNT(*) AS C FROM [$detailTable]")
    $sumPriceBefore = Get-Number (Get-Scalar $cn "SELECT SUM(Price) AS S FROM [$detailTable]")
    $sumVatBefore = Get-Number (Get-Scalar $cn "SELECT SUM(MaliatArzeshAfzoodeh) AS V FROM [$detailTable]")

    $maxRadif = 0
    $maxRs = $cn.Execute("SELECT MAX(Radif) AS M FROM [$detailTable]")
    if (-not $maxRs.EOF) {
        $maxValue = $maxRs.Fields.Item(0).Value
        if ($null -ne $maxValue -and $maxValue -isnot [System.DBNull]) { $maxRadif = [int]$maxValue }
    }
    $maxRs.Close()

    $radif = $maxRadif
    $columnList = ($columnNames -join ', ')
    foreach ($row in $rows) {
        $radif = $radif + 1
        $values = New-Object System.Collections.Generic.List[string]
        foreach ($name in $columnNames) {
            $raw = [string]$row.$name
            if ($name -eq 'Radif') {
                if ($continueRadif) { $values.Add([string]$radif) } else { $values.Add([string]([int]$raw)) }
                continue
            }
            $kind = $kindOf[$name]
            if ($kind -eq 'int') {
                $text = $raw.Trim()
                if ($text -eq '') { $values.Add('NULL') } else { $values.Add($text) }
            } elseif ($kind -eq 'bool') {
                $flag = $raw.Trim().ToLowerInvariant()
                if ($flag -eq 'true' -or $flag -eq '1' -or $flag -eq 'بله') {
                    $values.Add('True')
                } else {
                    $values.Add('False')
                }
            } else {
                $values.Add((ConvertTo-SqlText $raw))
            }
        }
        $sql = "INSERT INTO [$detailTable] ($columnList) VALUES (" + ($values -join ', ') + ')'
        $cn.Execute($sql) | Out-Null
        $inserted = $inserted + 1
    }

    $countAfter = Get-Number (Get-Scalar $cn "SELECT COUNT(*) AS C FROM [$detailTable]")
    $sumPriceAfter = Get-Number (Get-Scalar $cn "SELECT SUM(Price) AS S FROM [$detailTable]")
    $sumVatAfter = Get-Number (Get-Scalar $cn "SELECT SUM(MaliatArzeshAfzoodeh) AS V FROM [$detailTable]")

    $deltaRows = [int]($countAfter - $countBefore)
    $deltaPrice = $sumPriceAfter - $sumPriceBefore
    $deltaVat = $sumVatAfter - $sumVatBefore

    $result.inserted = $inserted
    $result.observed.rows = $deltaRows
    $result.observed.amount = $deltaPrice
    $result.observed.vat = $deltaVat
    $result.verification.rows = ($deltaRows -eq $result.expected.rows)
    $result.verification.amount = ([math]::Abs($deltaPrice - $result.expected.amount) -lt 1)
    $result.verification.vat = ([math]::Abs($deltaVat - $result.expected.vat) -lt 1)
    $allVerified = $result.verification.rows -and $result.verification.amount -and $result.verification.vat

    if (-not $allVerified -and -not $Force) {
        throw ('بازبینی جمع‌ها موفق نبود؛ انتظار: ' + $result.expected.rows + ' ردیف / مبلغ ' + $result.expected.amount + ' / مالیات ' + $result.expected.vat +
            ' — مشاهده: ' + $deltaRows + ' ردیف / مبلغ ' + $deltaPrice + ' / مالیات ' + $deltaVat)
    }

    if ($DryRun) {
        $cn.RollbackTrans()
    } else {
        $cn.CommitTrans()
    }
} catch {
    try { $cn.RollbackTrans() } catch { }
    $failure = $_.Exception.Message
} finally {
    try { $cn.Close() } catch { }
}

if ($DryRun) {
    Remove-Item -LiteralPath $workPath -Force -ErrorAction SilentlyContinue
    $result.output = ''
}

if ($failure) {
    Stop-WithError ('درج ردیف‌ها ناموفق بود و همهٔ تغییرات بازگردانی شد: ' + $failure) 4
}

if ($DryRun) {
    $result.status = 'dry_run'
    $result.message = 'اجرای آزمایشی موفق بود؛ تراکنش بازگردانی شد و فایلی تغییر نکرد.'
} else {
    $result.status = 'filled'
    $result.message = 'ردیف‌ها در فایل کپی‌شده درج و جمع‌ها بازبینی شد.'
}

$result.finished_at = (Get-Date).ToString('s')
$result.duration_seconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
Save-Result

Write-Host ''
Write-Host ('نتیجه: ' + $result.status) -ForegroundColor Green
Write-Host ('ردیف‌های درج‌شده: ' + $inserted)
Write-Host ('بازبینی تعداد: ' + $result.observed.rows + ' | مبلغ: ' + $result.observed.amount + ' | مالیات: ' + $result.observed.vat)
if ($result.output) { Write-Host ('فایل پرشده: ' + $result.output) -ForegroundColor Cyan }
Write-Host ('گزارش نتیجه: ' + $resultPath) -ForegroundColor Cyan
Write-Host 'این فایل result.json را در HRMS بارگذاری کنید تا نتیجه در تاریخچهٔ گزارش ثبت شود.'
exit 0

if ($InPlace) { Write-Host 'حالت: نوشتن روی فایل هدف (پشتیبان تهیه می‌شود)' -ForegroundColor Yellow }
