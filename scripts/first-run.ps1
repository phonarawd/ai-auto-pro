#Requires -Version 5.1
<#
.SYNOPSIS
  Build + launch CLIME AI Growth Studio for local dogfood (first START).
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=== CLIME AI Growth Studio — First Run ===" -ForegroundColor Cyan
Write-Host ""

Set-Location $repoRoot

if (Get-Command fnm -ErrorAction SilentlyContinue) {
  fnm env --use-on-cd | Out-String | Invoke-Expression
  fnm use
}

Write-Host "[1/3] Quality smoke (lint/typecheck/test can be skipped with -SkipCi)" -ForegroundColor Yellow
if ($args -notcontains '-SkipCi') {
  pnpm run ci:quality
  if ($LASTEXITCODE -ne 0) { throw "ci:quality failed" }
} else {
  Write-Host "  skipped (-SkipCi)"
}

Write-Host "[2/3] Build desktop (main + preload + renderer)" -ForegroundColor Yellow
pnpm --filter @clime/desktop build
if ($LASTEXITCODE -ne 0) { throw "desktop build failed" }

Write-Host "[3/3] Launch Electron (Mission Center)" -ForegroundColor Yellow
Write-Host "  Close the window when done. Challenge → pause+Inbox is normal." -ForegroundColor DarkGray
try {
  pnpm --filter @clime/desktop start
} finally {
  Write-Host "Restoring better-sqlite3 for Node (tests/CI)..." -ForegroundColor DarkGray
  pnpm --filter @clime/storage exec npm rebuild better-sqlite3 | Out-Null
}
