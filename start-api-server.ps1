# ======================================================================
# SWT301 - Khoi dong REST API Server cua Student Task Manager
# ======================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$apiDir = Join-Path $PSScriptRoot "..\student-task-manager-api-testing"
$serverFile = Join-Path $apiDir "src\server.js"

if (-not (Test-Path $serverFile)) {
    Write-Host "[LOI] Khong tim thay tap tin server tai: $serverFile" -ForegroundColor Red
    exit 1
}

Write-Host "Dang khoi dong REST API Server tai cong 3000..." -ForegroundColor Cyan
Set-Location $apiDir
node src/server.js
