#Requires -Version 5.1
<#
.SYNOPSIS
  Verify CLIME AI Growth OS V1 toolchain. Exit 0 = green.
#>
$ErrorActionPreference = 'Continue'
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $failures.Add($msg) | Out-Null }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow; $warnings.Add($msg) | Out-Null }

function Has-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "`n=== CLIME AI Growth OS — Toolchain Check ===`n"

# Node
if (Has-Cmd node) {
  $nv = (node -v).TrimStart('v')
  Ok "Node.js v$nv"
  try {
    $major = [int]($nv.Split('.')[0])
    if ($major -lt 22) { Fail "Node >= 22.12 required (found v$nv)" }
    elseif ($major -ge 24) { Warn "Node v$nv is newer than typical Electron LTS pin; prefer 22 LTS via fnm if rebuilds fail" }
  } catch { Warn "Could not parse Node version" }
} else { Fail "Node.js missing" }

# pnpm
if (Has-Cmd pnpm) { Ok "pnpm $((pnpm -v).Trim())" } else { Fail "pnpm missing (npm i -g pnpm)" }

# npm (needed for some tooling)
if (Has-Cmd npm) { Ok "npm $((npm -v).Trim())" } else { Warn "npm missing" }

# Git
if (Has-Cmd git) {
  Ok "$((git --version).Trim())"
  $gn = git config --get user.name 2>$null
  $ge = git config --get user.email 2>$null
  if ([string]::IsNullOrWhiteSpace($gn) -or [string]::IsNullOrWhiteSpace($ge)) {
    Fail "git user.name / user.email not set (required before commits; set local or global)"
  } else {
    Ok "git identity: $gn <$ge>"
  }
} else { Fail "Git missing" }

# gh
if (Has-Cmd gh) {
  Ok "gh present"
  $auth = gh auth status 2>&1 | Out-String
  if ($auth -match 'Logged in') { Ok "gh authenticated" } else { Fail "gh not authenticated (gh auth login)" }
} else { Fail "GitHub CLI (gh) missing" }

# Python (node-gyp)
if (Has-Cmd python) {
  Ok "python $((python --version 2>&1).ToString().Replace('Python ',''))"
} elseif (Has-Cmd py) {
  Ok "py launcher present"
} else { Fail "Python missing (needed for node-gyp / native builds)" }

# VS Build Tools
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
  $inst = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
  if ($inst) { Ok "VS C++ tools: $inst" } else { Fail "vswhere found but MSVC VC Tools not installed" }
} else {
  Fail "Visual Studio Build Tools / vswhere missing (MSVC required for Electron native modules)"
}

# cl.exe optional visibility
if (Has-Cmd cl) { Ok "cl.exe on PATH" } else { Warn "cl.exe not on PATH (OK if using VS Developer shell / node-gyp auto-detect)" }

# fnm
if (Has-Cmd fnm) { Ok "fnm present" } else { Warn "fnm missing (recommended to pin Node 22 LTS)" }

# Ollama
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (Has-Cmd ollama) { Ok "ollama $((ollama --version 2>&1 | Select-Object -First 1))" }
elseif (Test-Path $ollamaExe) { Ok "ollama installed at $ollamaExe (restart shell to refresh PATH)" }
else { Warn "Ollama missing (needed for local LLM adapter; cloud adapters still work)" }

# sqlite3
if (Has-Cmd sqlite3) { Ok "sqlite3 CLI present" } else { Warn "sqlite3 CLI missing (Drizzle/SQLite CLI is for debug; app uses embedded SQLite)" }

# Docker optional
if (Has-Cmd docker) { Ok "docker present" } else { Warn "Docker missing (optional until Postgres port)" }

# Disk — packaging gate: ≥20 GB free on C: (K2 / 06_SHIP.md)
try {
  $freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
  if ($freeGb -lt 20) { Fail "C: free space ${freeGb}GB (<20GB) — too low for Electron packaging (see docs/setup/06_SHIP.md)" }
  elseif ($freeGb -lt 25) { Warn "C: free space ${freeGb}GB — recommend >=25GB before full NSIS dist" }
  else { Ok "C: free space ${freeGb}GB" }
} catch { Warn "Could not read disk free space" }

# Package manager discipline reminder
if (Has-Cmd yarn) { Warn "yarn is installed globally — do not use it in this repo (pnpm only)" }

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "RESULT: GREEN ($($warnings.Count) warning(s))" -ForegroundColor Green
  exit 0
} else {
  Write-Host "RESULT: RED — $($failures.Count) failure(s), $($warnings.Count) warning(s)" -ForegroundColor Red
  Write-Host "Fix FAIL items before Phase A implementation." -ForegroundColor Red
  exit 1
}
