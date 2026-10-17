# ======================================================================
# SWT301 - Student Task Manager Performance Testing
# Chay toan bo cac kich ban: Smoke (5 VUs) -> Load (10 VUs) -> Stress (20 VUs)
# ======================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " KHOI CHAY TOAN BO SUITE KIEM THU HIEU NANG - MON HOC: SWT301" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Kiem tra ket noi API Server tren cong 3000
$tcpConn = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $tcpConn) {
    Write-Host "[CANH BAO] API Server chua chay tren cong 3000!" -ForegroundColor Yellow
    Write-Host "Vui long khoi dong API Server tai http://localhost:3000 truoc khi chay test." -ForegroundColor Yellow
    exit 1
}

# Xac dinh binary k6
$k6Path = ".\bin\k6.exe"
if (-not (Test-Path $k6Path)) {
    if (Get-Command k6 -ErrorAction SilentlyContinue) {
        $k6Path = "k6"
    } else {
        Write-Host "[LOI] Khong tim thay k6.exe!" -ForegroundColor Red
        exit 1
    }
}

$results = @{}

Write-Host "`n[KICH BAN 1/3] Bat dau Smoke Test (5 VUs)..." -ForegroundColor Yellow
& $k6Path run scripts/01_smoke_test.js
$results["Smoke Test"] = $LASTEXITCODE
Start-Sleep -Seconds 3

Write-Host "`n[KICH BAN 2/3] Bat dau Load Test (10 VUs)..." -ForegroundColor Yellow
& $k6Path run scripts/02_load_test.js
$results["Load Test"] = $LASTEXITCODE
Start-Sleep -Seconds 3

Write-Host "`n[KICH BAN 3/3] Bat dau Stress Test (20 VUs)..." -ForegroundColor Yellow
& $k6Path run scripts/03_stress_test.js
$results["Stress Test"] = $LASTEXITCODE

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host " TONG HOP KET QUA KIEM THU HIEU NANG" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

foreach ($testName in $results.Keys) {
    $code = $results[$testName]
    $statusText = if ($code -eq 0) { "PASS (DAT)" } else { "FAIL (KHONG DAT)" }
    $color = if ($code -eq 0) { "Green" } else { "Red" }
    Write-Host (" - {0,-15}: {1}" -f $testName, $statusText) -ForegroundColor $color
}

Write-Host "`nBao cao HTML da duoc xuat tai:" -ForegroundColor White
Write-Host " 1. reports\smoke-test-report.html" -ForegroundColor White
Write-Host " 2. reports\load-test-report.html" -ForegroundColor White
Write-Host " 3. reports\stress-test-report.html" -ForegroundColor White
Write-Host "======================================================================`n" -ForegroundColor Cyan
