# SmartBlood Project Cleanup Script
# Removes cache files, build artifacts, and other unwanted files

Write-Host "=== SmartBlood Project Cleanup ===" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$itemsRemoved = 0

# Function to remove directory if exists
function Remove-DirectoryIfExists {
    param($path)
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "[REMOVED] $path" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "[FAILED] $path - $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    return $false
}

# Function to remove file if exists
function Remove-FileIfExists {
    param($path)
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Force -ErrorAction Stop
            Write-Host "[REMOVED] $path" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "[FAILED] $path - $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    return $false
}

Write-Host "Cleaning Python cache files..." -ForegroundColor Yellow

# Remove all __pycache__ directories in backend
$pycacheDirs = @(
    "$projectRoot\backend\__pycache__",
    "$projectRoot\backend\app\__pycache__",
    "$projectRoot\backend\app\admin\__pycache__",
    "$projectRoot\backend\app\api\__pycache__",
    "$projectRoot\backend\app\auth\__pycache__",
    "$projectRoot\backend\app\config\__pycache__",
    "$projectRoot\backend\app\donor\__pycache__",
    "$projectRoot\backend\app\homepage\__pycache__",
    "$projectRoot\backend\app\requests\__pycache__",
    "$projectRoot\backend\app\services\__pycache__",
    "$projectRoot\backend\app\utils\__pycache__",
    "$projectRoot\backend\migrations\__pycache__",
    "$projectRoot\backend\migrations\versions\__pycache__"
)

foreach ($dir in $pycacheDirs) {
    if (Remove-DirectoryIfExists $dir) {
        $itemsRemoved++
    }
}

Write-Host ""
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow

# Remove frontend build directory
if (Remove-DirectoryIfExists "$projectRoot\frontend\dist") {
    $itemsRemoved++
}

# Remove frontend .vite cache
if (Remove-DirectoryIfExists "$projectRoot\frontend\.vite") {
    $itemsRemoved++
}

# Remove backend instance directory (contains SQLite DB if any)
if (Remove-DirectoryIfExists "$projectRoot\backend\instance") {
    $itemsRemoved++
}

Write-Host ""
Write-Host "Cleaning temporary files..." -ForegroundColor Yellow

# Remove .pyc files
Get-ChildItem -Path "$projectRoot\backend" -Filter "*.pyc" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    if (Remove-FileIfExists $_.FullName) {
        $itemsRemoved++
    }
}

# Remove .log files
Get-ChildItem -Path $projectRoot -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    if (Remove-FileIfExists $_.FullName) {
        $itemsRemoved++
    }
}

# Remove .db files from backend (SQLite databases)
Get-ChildItem -Path "$projectRoot\backend" -Filter "*.db" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    if (Remove-FileIfExists $_.FullName) {
        $itemsRemoved++
    }
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "Total items removed: $itemsRemoved" -ForegroundColor Green
Write-Host ""
Write-Host "Note: node_modules and .venv are preserved (add them to .gitignore)" -ForegroundColor Yellow
Write-Host "To remove node_modules: Remove-Item frontend\node_modules -Recurse -Force" -ForegroundColor Yellow
Write-Host "To remove .venv: Remove-Item backend\.venv -Recurse -Force" -ForegroundColor Yellow
