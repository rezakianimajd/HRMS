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
    مسیر فایل Access نسخهٔ TTMS (مثلاً C:\TTMS\TTMS_96_New.mdb). اگر خالی بماند،
    فایل Access همراه بسته (که هنگام ساخت بسته ارسال شده) یا تنها فایل mdb/accdb
    کنار اسکریپت به‌طور خودکار انتخاب می‌شود.

.PARAMETER OutputDir
    پوشهٔ فایل پرشده. پیش‌فرض: پوشهٔ فایل هدف.

.PARAMETER DryRun
    درج آزمایشی و بازگردانی تراکنش؛ فایل پرشده باقی نمی‌ماند.

.PARAMETER InPlace
    نوشتن روی خود فایل هدف پس از تهیهٔ پشتیبان (پیش‌فرض: کار روی کپی).

.PARAMETER Force
    ادامهٔ کار حتی اگر بازبینی جمع‌ها اختلاف نشان دهد.

.PARAMETER AllowDuplicates
    درج ردیف‌هایی که با ردیف‌های موجود فایل یکسان‌اند (شمارهٔ فاکتور + شناسهٔ ملی + مبلغ).
    پیش‌فرض: ردیف‌های تکراری درج نمی‌شوند تا اجرای دوباره باعث رکورد تکراری نشود.

.EXAMPLE
    .\fill_ttms.ps1 -Target "C:\TTMS\TTMS_96_New.mdb"

.EXAMPLE
    .\fill_ttms.ps1 -Target "C:\TTMS\TTMS_96_New.mdb" -DryRun
#>
param(
    [string]$PackageDir = $PSScriptRoot,
    [string]$Target = '',
    [string]$OutputDir = '',
    [switch]$DryRun,
    [switch]$InPlace,
    [switch]$Force,
    [switch]$AllowDuplicates,
    [switch]$Inspect
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$manifestPath = Join-Path $PackageDir 'manifest.json'
$rowsPath = Join-Path $PackageDir 'rows.csv'
$resultPath = Join-Path $PackageDir 'result.json'
$logPath = Join-Path $PackageDir 'fill_ttms.log'
$startedAt = Get-Date
try { Start-Transcript -LiteralPath $logPath -Force | Out-Null } catch { }

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
    skipped          = 0
    duplicates       = @()
    allow_duplicates = [bool]$AllowDuplicates
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
    Write-Host ('گزارش کامل: ' + $logPath)
    try { Stop-Transcript | Out-Null } catch { }
    exit $Code
}

function Get-TableNames {
    param($Connection)
    $list = New-Object System.Collections.Generic.List[string]
    try {
        $schema = $Connection.OpenSchema(20)
        while (-not $schema.EOF) {
            $tableType = [string]$schema.Fields.Item('TABLE_TYPE').Value
            if ($tableType -eq 'TABLE') {
                $list.Add([string]$schema.Fields.Item('TABLE_NAME').Value)
            }
            $schema.MoveNext()
        }
        $schema.Close()
    } catch { }
    return $list
}

function Get-ColumnNames {
    param($Connection, [string]$Table)
    $list = New-Object System.Collections.Generic.List[string]
    try {
        $rs = $Connection.Execute("SELECT TOP 1 * FROM [$Table]")
        foreach ($field in $rs.Fields) { $list.Add([string]$field.Name) }
        $rs.Close()
    } catch { }
    return $list
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

# ---------------------------------------------------------------------------
# ۰) تعیین فایل هدف: اگر -Target داده نشده باشد، فایل Access همراه بسته یا
#    تنها فایل mdb/accdb کنار اسکریپت به‌طور خودکار انتخاب می‌شود.
# ---------------------------------------------------------------------------
if (-not $Target) {
    $bundled = [string]$manifest.target.template_file
    if ($bundled) {
        $candidate = Join-Path $PackageDir $bundled
        if (Test-Path -LiteralPath $candidate) { $Target = $candidate }
    }
}
if (-not $Target) {
    $found = Get-ChildItem -LiteralPath $PackageDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in '.mdb', '.accdb' -and $_.Name -notlike '*.filled-*' } |
        Select-Object -First 1
    if ($found) { $Target = $found.FullName }
}
if (-not $Target) {
    Stop-WithError 'فایل Access پیدا نشد. فایل TTMS را کنار همین اسکریپت بگذارید یا مسیر را با -Target بدهید (مثال: -Target "C:\TTMS\TTMS_96_New.mdb").' 2
}
Write-Host ('فایل هدف : ' + $Target)

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
# اگر فایل داخل بسته (ttms_template.mdb) هدف است، نام خروجی را از نام اصلی TTMS بگیر
try {
    $templateName = [string]$manifest.target.template_name
    if ($bundled -and $templateName) {
        $bundledFull = [System.IO.Path]::GetFullPath((Join-Path $PackageDir $bundled))
        if ($bundledFull -eq $targetFull) {
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($templateName)
        }
    }
} catch { }
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

# ---------------------------------------------------------------------------
# ۳.۵) بازبینی ساختار فایل: جدول‌ها و ستون‌ها باید با نسخهٔ TTMS بخوانند
# ---------------------------------------------------------------------------
$tableNames = Get-TableNames $cn
if ($Inspect) {
    Write-Host ''
    Write-Host '=== ساختار فایل Access انتخاب‌شده ===' -ForegroundColor Cyan
    Write-Host ('جدول‌ها (' + $tableNames.Count + '): ' + (($tableNames | Sort-Object) -join ', '))
    $detailColumnsPreview = Get-ColumnNames $cn $detailTable
    Write-Host ''
    Write-Host ('ستون‌های ' + $detailTable + ' (' + $detailColumnsPreview.Count + '):')
    Write-Host (($detailColumnsPreview | Sort-Object) -join ', ')
    try { $cn.Close() } catch { }
    if (-not $InPlace) { Remove-Item -LiteralPath $workPath -Force -ErrorAction SilentlyContinue }
    try { Stop-Transcript | Out-Null } catch { }
    exit 0
}

if ($tableNames.Count -gt 0 -and ($tableNames -notcontains $headerTable -or $tableNames -notcontains $detailTable)) {
    Stop-WithError ('جدول‌های مورد نیاز در فایل Access پیدا نشد: ' + $headerTable + ' و/یا ' + $detailTable +
        '. جدول‌های موجود در این فایل: ' + (($tableNames | Select-Object -First 25) -join ', ') +
        '. احتمالاً فایل/نسخهٔ TTMS متفاوت است یا فایل اشتباه انتخاب شده.') 5
}

$detailColumns = Get-ColumnNames $cn $detailTable
$missingColumns = @($columnNames | Where-Object { $detailColumns -notcontains $_ })
if ($missingColumns.Count -gt 0) {
    Stop-WithError ('این ستون‌ها در جدول ' + $detailTable + ' وجود ندارند: ' + ($missingColumns -join ', ') +
        '. ستون‌های موجود: ' + (($detailColumns | Select-Object -First 40) -join ', ') +
        '. یعنی ساختار این فایل Access با نگاشت بسته نمی‌خواند.') 5
}

$inserted = 0
$skipped = 0
$expectedRows = 0
$expectedPrice = 0.0
$expectedVat = 0.0
$duplicateNotes = New-Object System.Collections.Generic.List[string]
$rowErrors = New-Object System.Collections.Generic.List[string]
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

    # ردیف‌های موجود برای جلوگیری از درج تکراری (کلید: شمارهٔ فاکتور + شناسهٔ ملی + مبلغ)
    $existing = @{}
    $existingCount = 0
    $rsExisting = $cn.Execute("SELECT FactorNo, ForoushandeNationalCode, Price FROM [$detailTable]")
    while (-not $rsExisting.EOF) {
        $fNo = [string]$rsExisting.Fields.Item('FactorNo').Value
        $fNat = [string]$rsExisting.Fields.Item('ForoushandeNationalCode').Value
        $fPrice = [string]$rsExisting.Fields.Item('Price').Value
        if ($fNo.Trim() -ne '') {
            $existing[($fNo.Trim() + '|' + $fNat.Trim() + '|' + $fPrice.Trim())] = $true
            $existingCount = $existingCount + 1
        }
        $rsExisting.MoveNext()
    }
    $rsExisting.Close()
    Write-Host ('ردیف‌های موجود در فایل TTMS: ' + $existingCount) -ForegroundColor DarkGray

    $radif = $maxRadif
    $columnList = ($columnNames -join ', ')
    foreach ($row in $rows) {
        $rowFactorNo = ([string]$row.FactorNo).Trim()
        $rowNational = ([string]$row.ForoushandeNationalCode).Trim()
        $rowPrice = ([string]$row.Price).Trim()
        $rowKey = $rowFactorNo + '|' + $rowNational + '|' + $rowPrice
        if ($rowFactorNo -ne '' -and -not $AllowDuplicates -and $existing.ContainsKey($rowKey)) {
            $skipped = $skipped + 1
            $duplicateNotes.Add('فاکتور ' + $rowFactorNo + ' | شناسه ' + $rowNational + ' | مبلغ ' + $rowPrice)
            continue
        }

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
            } elseif ($kind -eq 'guid') {
                $values.Add('NULL')
            } else {
                $values.Add((ConvertTo-SqlText $raw))
            }
        }
        $sql = "INSERT INTO [$detailTable] ($columnList) VALUES (" + ($values -join ', ') + ')'
        try {
            $cn.Execute($sql) | Out-Null
        } catch {
            $rowErrors.Add('ردیف ' + $radif + ' (فاکتور ' + $rowFactorNo + '): ' + $_.Exception.Message)
            if ($rowErrors.Count -ge 10) {
                throw ('درج ردیف‌ها متوقف شد. نمونهٔ خطاها: ' + ($rowErrors -join ' | '))
            }
            continue
        }
        $inserted = $inserted + 1
        $expectedRows = $expectedRows + 1
        $expectedPrice = $expectedPrice + (Get-Number $row.Price)
        $expectedVat = $expectedVat + (Get-Number $row.MaliatArzeshAfzoodeh)
        if ($rowFactorNo -ne '') { $existing[$rowKey] = $true }
    }
    if ($rowErrors.Count -gt 0) {
        throw ('درج بعضی ردیف‌ها ناموفق بود: ' + ($rowErrors -join ' | '))
    }


    $countAfter = Get-Number (Get-Scalar $cn "SELECT COUNT(*) AS C FROM [$detailTable]")
    $sumPriceAfter = Get-Number (Get-Scalar $cn "SELECT SUM(Price) AS S FROM [$detailTable]")
    $sumVatAfter = Get-Number (Get-Scalar $cn "SELECT SUM(MaliatArzeshAfzoodeh) AS V FROM [$detailTable]")

    $deltaRows = [int]($countAfter - $countBefore)
    $deltaPrice = $sumPriceAfter - $sumPriceBefore
    $deltaVat = $sumVatAfter - $sumVatBefore

    $result.inserted = $inserted
    $result.skipped = $skipped
    $result.duplicates = @($duplicateNotes)
    $result.expected.rows = $expectedRows
    $result.expected.amount = $expectedPrice
    $result.expected.vat = $expectedVat
    $result.observed.rows = $deltaRows
    $result.observed.amount = $deltaPrice
    $result.observed.vat = $deltaVat
    $result.verification.rows = ($deltaRows -eq $expectedRows)
    $result.verification.amount = ([math]::Abs($deltaPrice - $expectedPrice) -lt 1)
    $result.verification.vat = ([math]::Abs($deltaVat - $expectedVat) -lt 1)
    $allVerified = $result.verification.rows -and $result.verification.amount -and $result.verification.vat

    if (-not $allVerified -and -not $Force) {
        throw ('بازبینی جمع‌ها موفق نبود؛ انتظار: ' + $expectedRows + ' ردیف / مبلغ ' + $expectedPrice + ' / مالیات ' + $expectedVat +
            ' — مشاهده: ' + $deltaRows + ' ردیف / مبلغ ' + $deltaPrice + ' / مالیات ' + $deltaVat)
    }

    if ($DryRun) {
        $cn.RollbackTrans()
    } else {
        $cn.CommitTrans()
    }
} catch {
    try { $cn.RollbackTrans() } catch { }
    $lineInfo = $_.InvocationInfo
    $failure = $_.Exception.Message
    if ($lineInfo -and $lineInfo.ScriptLineNumber) {
        $failure = $failure + ' (خط ' + $lineInfo.ScriptLineNumber + ': ' + ([string]$lineInfo.Line).Trim() + ')'
    }
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
} elseif ($inserted -eq 0) {
    $result.status = 'failed'
    $result.errors = @($result.errors) + @('هیچ ردیفی درج نشد.')
    if ($skipped -gt 0) {
        $result.message = 'هیچ ردیف جدیدی درج نشد: همهٔ ' + $skipped + ' ردیف از قبل در فایل وجود داشتند. ' +
            'برای درج دوباره، یا فایل TTMS بدون این ردیف‌ها را انتخاب کنید یا اسکریپت را با -AllowDuplicates اجرا کنید.'
    } else {
        $result.message = 'هیچ ردیفی درج نشد؛ ستون‌ها/مقادیر CSV با فایل Access نخواند. گزارش fill_ttms.log را ببینید.'
    }
} else {
    $result.status = 'filled'
    $result.message = 'ردیف‌ها در فایل کپی‌شده درج و جمع‌ها بازبینی شد.'
}
if ($skipped -gt 0 -and $result.status -eq 'filled') {
    $result.message = 'ردیف‌های درج‌شده بازبینی شد؛ ' + $skipped + ' ردیف تکراری (از قبل موجود) درج نشد.'
}

$result.finished_at = (Get-Date).ToString('s')
$result.duration_seconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
Save-Result
if (-not $DryRun -and $result.output) {
    try {
        Set-Content -LiteralPath (Join-Path $PackageDir 'output_path.txt') -Value ([string]$result.output) -Encoding UTF8
    } catch { }
}

Write-Host ''
Write-Host ('نتیجه: ' + $result.status) -ForegroundColor Green
Write-Host ('ردیف‌های درج‌شده: ' + $inserted)
if ($skipped -gt 0) {
    Write-Host ('ردیف‌های تکراری (درج‌نشده): ' + $skipped) -ForegroundColor Yellow
    foreach ($note in ($duplicateNotes | Select-Object -First 5)) {
        Write-Host ('  - ' + $note) -ForegroundColor DarkYellow
    }
}
Write-Host ('بازبینی تعداد: ' + $result.observed.rows + ' | مبلغ: ' + $result.observed.amount + ' | مالیات: ' + $result.observed.vat)
if ($result.output) {
    Write-Host ''
    Write-Host ('فایل پرشده (این فایل را در TTMS باز کنید): ' + $result.output) -ForegroundColor Green
    Write-Host 'توجه: فایل اصلی دست‌نخورده می‌ماند؛ درج‌ها در نسخهٔ کپی‌شدهٔ بالا انجام شده است.'
}
Write-Host ('گزارش نتیجه: ' + $resultPath) -ForegroundColor Cyan
Write-Host 'این فایل result.json را در HRMS بارگذاری کنید تا نتیجه در تاریخچهٔ گزارش ثبت شود.'
try { Stop-Transcript | Out-Null } catch { }
exit 0
