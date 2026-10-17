# ======================================================================
# SWT301 - Student Task Manager Performance Testing
# Kich ban: Load Testing (10 VUs)
# ======================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " KICH BAN: LOAD TESTING (10 VUs) - MON HOC: SWT301" -ForegroundColor Cyan
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

Write-Host "`n[1/2] Dang thuc thi k6 Load Test..." -ForegroundColor Green
& $k6Path run scripts/02_load_test.js
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`n[2/2] Kiem thu hoan tat! Ket qua DAT tat ca tieu chi SLA." -ForegroundColor Green
    Write-Host "Bao cao HTML: reports\load-test-report.html" -ForegroundColor White
} else {
    Write-Host "`n[CANH BAO] Kiem thu ket thuc voi ma loi: $exitCode hoac co tieu chi chua dat." -ForegroundColor Yellow
    Write-Host "Xem chi tiet tai: reports\load-test-report.html" -ForegroundColor White
}

exit $exitCode
