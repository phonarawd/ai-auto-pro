#Requires -Version 5.1
<#
.SYNOPSIS
  K2 ship smoke — disk ≥20GB, brand/builder/updater config, unpackaged .exe.
  Exit 0 = green.
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop = Join-Path $repoRoot 'apps\desktop'
$minFreeGb = 20

function Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; throw $msg }

Write-Host ""
Write-Host "=== CLIME AI Growth Studio - Ship Smoke (K2) ==="
Write-Host ""

# --- Disk ≥20GB ---
try {
  $freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
  if ($freeGb -lt $minFreeGb) {
    Fail "C: free space ${freeGb}GB (<${minFreeGb}GB) — free disk before Electron packaging (see docs/setup/06_SHIP.md)"
  }
  Ok "C: free space ${freeGb}GB (>= ${minFreeGb}GB)"
} catch {
  Fail "Could not read C: free space: $_"
}

# --- Brand / builder config ---
$builderYml = Join-Path $desktop 'electron-builder.yml'
$brandTs = Join-Path $desktop 'src\ship\brand.ts'
$updaterTs = Join-Path $desktop 'src\main\auto-updater.ts'
$pkgJson = Join-Path $desktop 'package.json'
$shipDoc = Join-Path $repoRoot 'docs\setup\06_SHIP.md'

foreach ($p in @($builderYml, $brandTs, $updaterTs, $pkgJson, $shipDoc)) {
  if (-not (Test-Path $p)) { Fail "Missing required ship file: $p" }
}

$yml = Get-Content -Raw $builderYml
$brand = Get-Content -Raw $brandTs
$updater = Get-Content -Raw $updaterTs
$pkg = Get-Content -Raw $pkgJson
$doc = Get-Content -Raw $shipDoc

if ($yml -notmatch 'productName:\s*CLIME AI Growth Studio') {
  Fail "electron-builder.yml productName must be CLIME AI Growth Studio"
}
if ($yml -notmatch 'appId:\s*com\.clime\.growth-studio') {
  Fail "electron-builder.yml appId mismatch"
}
if ($yml -notmatch 'artifactName:\s*\$\{productName\}\.\$\{ext\}') {
  Fail "electron-builder.yml artifactName must produce brand .exe"
}
if ($yml -notmatch '(?m)^publish:') {
  Fail "electron-builder.yml must declare publish (updater feed)"
}
Ok "electron-builder.yml brand + publish present"

if ($brand -notmatch 'APP_BRAND_NAME\s*=\s*"CLIME AI Growth Studio"') {
  Fail "brand.ts APP_BRAND_NAME mismatch"
}
if ($brand -notmatch 'WINDOWS_EXE_NAME\s*=\s*"CLIME AI Growth Studio\.exe"') {
  Fail "brand.ts WINDOWS_EXE_NAME mismatch"
}
Ok "ship/brand.ts brand strings locked"

if ($updater -notmatch 'electron-updater') {
  Fail "auto-updater.ts must import electron-updater"
}
if ($updater -notmatch 'setupAutoUpdater') {
  Fail "auto-updater.ts must export setupAutoUpdater"
}
if ($updater -notmatch 'app\.isPackaged') {
  Fail "auto-updater.ts must gate on app.isPackaged"
}
Ok "electron-updater wiring present"

if ($pkg -notmatch '"electron-builder"') { Fail "package.json missing electron-builder" }
if ($pkg -notmatch '"electron-updater"') { Fail "package.json missing electron-updater" }
if ($pkg -notmatch '"main"\s*:\s*"dist/main/index.js"') { Fail "package.json main must be dist/main/index.js" }
Ok "package.json ship deps + main entry"

if ($doc -notmatch 'Code signing|code-sign|CSC_LINK') {
  Fail "06_SHIP.md must document code-signing awareness"
}
if ($doc -notmatch '20 GB|20GB') {
  Fail "06_SHIP.md must document disk >=20GB"
}
if ($doc -notmatch 'electron-updater|auto-updater') {
  Fail "06_SHIP.md must document updater path"
}
Ok "06_SHIP.md code-sign + disk + updater notes"

# --- Build + unpackaged .exe ---
Push-Location $repoRoot
try {
  Write-Host "`nBuilding + packing unpackaged win-unpacked .exe...`n"
  pnpm --filter @clime/desktop run pack
  if ($LASTEXITCODE -ne 0) { Fail "pnpm --filter @clime/desktop pack failed (exit $LASTEXITCODE)" }

  $exe = Join-Path $desktop 'release\win-unpacked\CLIME AI Growth Studio.exe'
  if (-not (Test-Path $exe)) {
    Fail "Expected unpackaged exe missing: $exe"
  }
  $sizeMb = [math]::Round((Get-Item $exe).Length / 1MB, 2)
  Ok "Unpackaged exe present ($sizeMb MB): $exe"

  # electron-rebuild overwrites better-sqlite3 for Electron ABI — restore Node ABI for vitest/CI
  Write-Host ""
  Write-Host "Restoring better-sqlite3 for Node (post Electron rebuild)..."
  pnpm --filter @clime/storage exec npm rebuild better-sqlite3
  if ($LASTEXITCODE -ne 0) {
    Fail "Failed to restore better-sqlite3 for Node after pack (exit $LASTEXITCODE)"
  }
  Ok "better-sqlite3 restored for Node ABI"
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "RESULT: GREEN - ship smoke passed (unsigned local OK; see 06_SHIP.md for signing)" -ForegroundColor Green
exit 0
