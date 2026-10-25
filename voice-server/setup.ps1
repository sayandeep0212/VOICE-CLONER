# Smriti voice-server setup (Windows)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Test-Python311 {
    try {
        & py -3.11 -c "import sys; print(sys.version)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Write-Host "Smriti Voice Server setup" -ForegroundColor Cyan
Write-Host ""

if (Test-Python311) {
    Write-Host "Python 3.11 found — creating .venv for XTTS-v2..." -ForegroundColor Green
    & py -3.11 -m venv .venv
    & .\.venv\Scripts\python.exe -m pip install --upgrade pip
    & .\.venv\Scripts\pip.exe install -r requirements-xtts.txt
    Write-Host ""
    Write-Host "Done. Start the server with:" -ForegroundColor Green
    Write-Host "  .\.venv\Scripts\activate"
    Write-Host "  python main.py"
} else {
    Write-Host "Python 3.11 not found. Installing simulation-only deps on default Python..." -ForegroundColor Yellow
    Write-Host "Coqui TTS needs Python 3.9–3.11. Install 3.11 from https://www.python.org/downloads/ and re-run this script for real voice cloning."
    Write-Host ""
    & py -3 -m pip install --upgrade pip
    & py -3 -m pip install -r requirements.txt
    Write-Host ""
    Write-Host "Simulation server ready. Start with:" -ForegroundColor Green
    Write-Host "  py -3 main.py"
}
