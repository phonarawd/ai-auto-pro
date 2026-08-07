#Requires -Version 5.1
<#
.SYNOPSIS
  Run every Phase-0-available quality gate. Exit non-zero if any fail.
#>
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$failed = 0

function Run-Gate([string]$name, [scriptblock]$block) {
  Write-Host "`n########## $name ##########" -ForegroundColor Magenta
  & $block
  if ($LASTEXITCODE -ne 0) {
    Write-Host "GATE FAIL: $name (exit $LASTEXITCODE)" -ForegroundColor Red
    $script:failed++
  } else {
    Write-Host "GATE PASS: $name" -ForegroundColor Green
  }
}

Run-Gate 'Toolchain' { powershell -ExecutionPolicy Bypass -File "$Root\scripts\check-toolchain.ps1" }
Run-Gate 'Phase0 SSOT' { powershell -ExecutionPolicy Bypass -File "$Root\scripts\check-phase0.ps1" }
Run-Gate 'Markdownlint' {
  if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx --yes markdownlint-cli2
  } else {
    Write-Host '[FAIL] npx missing' -ForegroundColor Red
    exit 1
  }
}

if (Test-Path (Join-Path $Root 'package.json')) {
  Run-Gate 'pnpm lint' { pnpm lint }
  Run-Gate 'pnpm typecheck' { pnpm typecheck }
  Run-Gate 'pnpm test' { pnpm test }
}

Write-Host ""
if ($failed -eq 0) {
  Write-Host "ALL GATES GREEN" -ForegroundColor Green
  exit 0
} else {
  Write-Host "ALL GATES: $failed FAILED" -ForegroundColor Red
  exit 1
}
