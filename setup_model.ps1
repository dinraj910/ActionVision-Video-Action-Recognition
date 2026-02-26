# setup_model.ps1
# ---------------------------------------------------------------
# Run this ONCE before starting the backend.
# Copies the trained Keras model into the backend/model directory
# so both local and Docker deployments can find it.
# ---------------------------------------------------------------

$srcDir  = Join-Path $PSScriptRoot "model"
$destDir = Join-Path $PSScriptRoot "backend\model"

Write-Host "Copying model files from '$srcDir' to '$destDir'..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

# Copy all .keras and .h5 model files
Get-ChildItem -Path $srcDir -Include "*.keras","*.h5" | ForEach-Object {
    $dest = Join-Path $destDir $_.Name
    Copy-Item $_.FullName -Destination $dest -Force
    Write-Host "  Copied: $($_.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. You can now run:" -ForegroundColor Yellow
Write-Host "  cd backend && uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "  -- or --"
Write-Host "  docker-compose up --build" -ForegroundColor White
