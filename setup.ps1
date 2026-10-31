# Dijkstra Visualizer - PowerShell Setup Script for AI Agents & Developers
[CmdletBinding()]
param (
    [switch]$RunServer
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Dijkstra Visualizer - Automated Setup (PowerShell)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Error "Python not found in PATH. Please install Python 3.10+ and add to PATH."
    exit 1
}

# 2. Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "[INFO] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    & python -m venv .venv
} else {
    Write-Host "[INFO] Virtual environment .venv exists." -ForegroundColor Green
}

# 3. Virtual Environment Python executable
$venvPython = Join-Path (Get-Location) ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    # Unix style fallback if run in WSL/cross-platform
    $venvPython = Join-Path (Get-Location) ".venv/bin/python"
}

# 4. Install dependencies
Write-Host "[INFO] Upgrading pip & installing requirements.txt..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r requirements.txt --quiet

# 5. Run Django Check
Write-Host "[INFO] Running Django check..." -ForegroundColor Yellow
& $venvPython manage.py check

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Setup succeeded!                                      " -ForegroundColor Green
Write-Host "  Launch command: & `"$venvPython`" manage.py runserver 8000" -ForegroundColor Green
Write-Host "  App URL: http://127.0.0.1:8000/                      " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

if ($RunServer) {
    Write-Host "[INFO] Starting Django server on http://127.0.0.1:8000/ ..." -ForegroundColor Cyan
    & $venvPython manage.py runserver 8000
}
