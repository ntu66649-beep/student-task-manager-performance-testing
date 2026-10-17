@echo off
chcp 65001 > nul
echo ======================================================================
echo  SWT301 - STUDENT TASK MANAGER PERFORMANCE TESTING
echo  CHAY TOAN BO CAC KICH BAN (SMOKE, LOAD, STRESS)
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

echo [KICH BAN 1/3] Bat dau Smoke Test (5 VUs)...
%K6_BIN% run scripts/01_smoke_test.js
timeout /t 3 /nobreak > nul

echo.
echo [KICH BAN 2/3] Bat dau Load Test (10 VUs)...
%K6_BIN% run scripts/02_load_test.js
timeout /t 3 /nobreak > nul

echo.
echo [KICH BAN 3/3] Bat dau Stress Test (20 VUs)...
%K6_BIN% run scripts/03_stress_test.js

echo.
echo ======================================================================
echo  DA HOAN TAT TOAN BO KICH BAN KIEM THU HIEU NANG!
echo  Tat ca bao cao HTML va JSON da duoc luu vao thu muc: reports\
echo ======================================================================
pause
