@echo off
chcp 65001 > nul
echo ======================================================================
echo  SWT301 - STUDENT TASK MANAGER REST API SERVER
echo ======================================================================
echo.

set TARGET_DIR=..\student-task-manager-api-testing
if not exist "%TARGET_DIR%\src\server.js" (
    echo [LOI] Khong tim thay source code API Server tai: %TARGET_DIR%
    pause
    exit /b 1
)

echo Dang khoi dong REST API Server tai cong 3000...
cd "%TARGET_DIR%"
node src/server.js
