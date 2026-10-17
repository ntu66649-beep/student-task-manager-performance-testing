@echo off
chcp 65001 > nul
echo ======================================================================
echo  SWT301 - STUDENT TASK MANAGER PERFORMANCE TESTING
echo  KICH BAN: LOAD TESTING (10 VUs)
echo ======================================================================
echo.

set K6_BIN=bin\k6.exe
if not exist "%K6_BIN%" (
    where k6 >nul 2>nul
    if %errorlevel% equ 0 (
        set K6_BIN=k6
    ) else (
        echo [LOI] Khong tim thay k6.exe trong thu muc bin hoac PATH he thong!
        pause
        exit /b 1
    )
)

echo [1/2] Dang chay k6 Load Test...
%K6_BIN% run scripts/02_load_test.js

if %errorlevel% equ 0 (
    echo.
    echo [2/2] Kiem thu hoan tat! Ket qua dat nguong tieu chuan.
    echo Bao cao HTML da duoc tao tai: reports\load-test-report.html
) else (
    echo.
    echo [CANH BAO] Kiem thu co chi so vuot nguong hoac gap loi.
    echo Kiem tra bao cao chi tiet tai: reports\load-test-report.html
)

echo.
echo ======================================================================
pause
