#Requires -Version 5.1
<#
.SYNOPSIS
  Phase 0 world-class gate: docs SSOT, forbidden phrases, links, consistency.
  Exit 0 = GREEN. Run before Phase A approval.
#>
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $Root 'docs\architecture'))) {
  $Root = (Get-Location).Path
}
Set-Location $Root

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$checks = 0

function Ok($msg) { $script:checks++; Write-Host "[OK]   $msg" -ForegroundColor Green }
function Fail($msg) { $script:checks++; Write-Host "[FAIL] $msg" -ForegroundColor Red; $failures.Add($msg) | Out-Null }
function Warn($msg) { $script:checks++; Write-Host "[WARN] $msg" -ForegroundColor Yellow; $warnings.Add($msg) | Out-Null }
function Section($title) { Write-Host "`n--- $title ---" -ForegroundColor Cyan }

Write-Host "`n=== CLIME AI Growth OS - Phase 0 Quality Gate ===" -ForegroundColor Cyan
Write-Host "Root: $Root`n"

# ── 1. Required tree ──────────────────────────────────────────────
Section "1. Required files"

$rfcIds = 1..16 | ForEach-Object { '{0:D2}' -f $_ }
$rfcNames = @{
  '01' = 'PRODUCT'; '02' = 'CONSTITUTION'; '03' = 'ENGINES'; '04' = 'DOMAIN_API'
  '05' = 'WORKFLOW'; '06' = 'GROWTH'; '07' = 'AI'; '08' = 'CONTENT'
  '09' = 'ANALYTICS'; '10' = 'ACCOUNT'; '11' = 'MEMORY_KNOWLEDGE'
  '12' = 'INFRASTRUCTURE'; '13' = 'GOVERNANCE'; '14' = 'DATABASE'
  '15' = 'DESKTOP_AND_ROADMAP'; '16' = 'DESIGN_SYSTEM'
}
foreach ($id in $rfcIds) {
  $name = $rfcNames[$id]
  $path = Join-Path $Root "docs\architecture\${id}_${name}.md"
  if (Test-Path $path) { Ok "RFC $id $name" } else { Fail "Missing RFC: docs/architecture/${id}_${name}.md" }
}

$setupRequired = @(
  'docs\setup\00_TOOLCHAIN.md',
  'docs\setup\01_DEV_RULES.md',
  'docs\setup\02_TOOLCHAIN_AUDIT.md',
  'docs\setup\03_NEXT_ACTIONS.md',
  'docs\setup\04_HOW_TO_OPERATE.md',
  'docs\setup\05_IMPL_APPROVAL.md',
  'README.md',
  '.gitignore',
  '.node-version',
  '.cursor\rules\clime-growth-os.mdc',
  'scripts\check-toolchain.ps1',
  'scripts\check-phase0.ps1'
)
foreach ($rel in $setupRequired) {
  $p = Join-Path $Root $rel
  if (Test-Path $p) { Ok $rel } else { Fail "Missing: $rel" }
}

if (Test-Path (Join-Path $Root 'package.json')) {
  $pkg = Get-Content (Join-Path $Root 'package.json') -Raw
  if ($pkg -match '"lint"' -and $pkg -match '"typecheck"' -and $pkg -match '"test"') {
    Ok "package.json present with lint/typecheck/test scripts (Phase A+)"
  } else {
    Warn "package.json exists but missing lint/typecheck/test scripts"
  }
} else {
  Ok "No package.json yet (Phase 0 docs-only; app lint N/A until Phase A)"
}

# ── 2. Forbidden residual phrases ─────────────────────────────────
Section "2. Forbidden phrases (must be 0)"

# Split so this script file does not self-match the literal lists
$forbidden = @(
  ('Export' + '-first'),
  ('session' + [char]0x2260 + 'publish'),
  ('session' + '!=' + 'publish'),
  ('Export' + ' default'),
  ('fake' + ' universal' + ' auto-post')
)

$scanFiles = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Extension -match '\.(md|mdc|ps1)$' -and
    $_.FullName -notmatch '\\node_modules\\|\\\.git\\|\\agent-transcripts\\|\\terminals\\' -and
    $_.Name -ne 'check-phase0.ps1'
  } | Sort-Object FullName -Unique

foreach ($phrase in $forbidden) {
  $hits = @()
  foreach ($f in $scanFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    if ($text.Contains($phrase)) {
      $hits += $f.FullName.Substring($Root.Length + 1)
    }
  }
  if ($hits.Count -eq 0) { Ok "Forbidden absent: $phrase" }
  else { Fail "Forbidden '$phrase' in: $($hits -join ', ')" }
}

# Prisma: only allowed as intentional negation / zero-count locks (V1 DoD)
Section "2b. Prisma residual (negation-only allowed)"
$prismaBad = @()
foreach ($f in $scanFiles) {
  $lines = [System.IO.File]::ReadAllLines($f.FullName)
  $i = 0
  foreach ($line in $lines) {
    $i++
    if ($line -notlike '*Prisma*') { continue }
    $okNegation =
      ($line -like '*not Prisma*') -or
      ($line -like '*no Prisma*') -or
      ($line -like '*No Prisma*') -or
      ($line -like '*without Prisma*') -or
      ($line -like '*Reintroducing Prisma*') -or
      ($line -like '*Reintroduce Prisma*') -or
      ($line -like '*Prisma 0*') -or
      ($line -like '*Prisma0*') -or
      ($line -like '*Prisma = 0*') -or
      ($line -like '*Prisma/Supabase*') -or
      ($line -like '*Prisma / Supabase*') -or
      ($line -like '*Prisma residual*') -or
      ($line -like '*Prisma client*0*') -or
      ($line -like '*Prisma client count*') -or
      ($line -like '*Prisma·*') -or
      ($line -like '*· Prisma*') -or
      ($line -match '(?i)prisma\s*[=:]?\s*0') -or
      ($line -match '(?i)(forbid|banned|absent|zero|never).{0,40}prisma') -or
      ($line -match '(?i)prisma.{0,40}(forbid|banned|absent|zero|never|0\b|not\b)')
    if (-not $okNegation) {
      $rel = $f.FullName.Substring($Root.Length + 1)
      $prismaBad += "${rel}:${i}"
    }
  }
}
if ($prismaBad.Count -eq 0) { Ok "Prisma only in intentional negation lines" }
else { Fail "Unexpected Prisma mention: $($prismaBad -join ', ')" }

# ── 3. Required decision anchors ──────────────────────────────────
Section "3. Locked-decision anchors"

function Assert-Contains([string]$rel, [string[]]$needles, [string]$label) {
  $p = Join-Path $Root $rel
  if (-not (Test-Path $p)) { Fail "$label - file missing: $rel"; return }
  $text = [System.IO.File]::ReadAllText($p)
  foreach ($needle in $needles) {
    if ($text.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
      Fail "$label - missing '$needle' in $rel"
    } else {
      Ok "$label - has '$needle'"
    }
  }
}

Assert-Contains 'docs\architecture\01_PRODUCT.md' @('auto-publish','Drizzle','HumanGate','challenge') '01_PRODUCT'
Assert-Contains 'docs\architecture\02_CONSTITUTION.md' @('publishMode','riskLevel','Naming Rules','auto-pause','Zod') '02_CONSTITUTION'
Assert-Contains 'docs\architecture\08_CONTENT.md' @('posted_session','backup','earnings') '08_CONTENT'
Assert-Contains 'docs\architecture\10_ACCOUNT.md' @('publishMode','riskLevel','BAE','auto-pause') '10_ACCOUNT'
Assert-Contains 'docs\architecture\12_INFRASTRUCTURE.md' @('Drizzle','GitHub Actions','Backup') '12_INFRASTRUCTURE'
Assert-Contains 'docs\architecture\14_DATABASE.md' @('Drizzle','posted_session','Zod') '14_DATABASE'
Assert-Contains 'docs\architecture\15_DESKTOP_AND_ROADMAP.md' @('auto-publish','electron-builder','electron-updater','challenge') '15_DESKTOP'
Assert-Contains 'docs\architecture\16_DESIGN_SYSTEM.md' @('Pretendard','--clime-','Mission Center','UX Acceptance Gate','Primitives whitelist') '16_DESIGN'
Assert-Contains '.cursor\rules\clime-growth-os.mdc' @('auto-publish','publishMode','Drizzle','HumanGate') 'cursor-rules'
Assert-Contains 'docs\setup\01_DEV_RULES.md' @('auto-publish','Drizzle','Vitest','Turborepo') '01_DEV_RULES'
Assert-Contains 'docs\setup\04_HOW_TO_OPERATE.md' @('Rollback','challenge','HumanGate') '04_HOW_TO_OPERATE'
Assert-Contains 'docs\setup\05_IMPL_APPROVAL.md' @('AWAITING EXPLICIT APPROVAL','Approve Phase A','docs-only') '05_IMPL_APPROVAL'
$approval = [System.IO.File]::ReadAllText((Join-Path $Root 'docs\setup\05_IMPL_APPROVAL.md'))
if ($approval -match '(?m)^Status:\s*APPROVED\s*$') {
  Ok '05_IMPL_APPROVAL Status: APPROVED (Phase A unlocked)'
} elseif ($approval -match '(?m)^Status:\s*AWAITING EXPLICIT APPROVAL\s*$') {
  Ok '05_IMPL_APPROVAL Status: AWAITING EXPLICIT APPROVAL (docs-only hold)'
} else {
  Fail '05_IMPL_APPROVAL Status must be APPROVED or AWAITING EXPLICIT APPROVAL'
}
Assert-Contains '.cursor\rules\clime-growth-os.mdc' @('Phase A implementation gate','05_IMPL_APPROVAL') 'cursor-rules-phase-a-gate'
Assert-Contains 'README.md' @('auto-publish','Drizzle','04_HOW_TO_OPERATE','05_IMPL_APPROVAL') 'README'

# ── 4. .gitignore essentials ──────────────────────────────────────
Section "4. .gitignore"

$gi = [System.IO.File]::ReadAllText((Join-Path $Root '.gitignore'))
foreach ($need in @('.turbo/', 'test-results/', 'playwright-report/', 'node_modules/', '.env', '*.db')) {
  if ($gi.Contains($need)) { Ok ".gitignore has $need" }
  else { Fail ".gitignore missing $need" }
}

# ── 5. .node-version pin ──────────────────────────────────────────
Section "5. Node pin"

$nv = ([System.IO.File]::ReadAllText((Join-Path $Root '.node-version'))).Trim()
if ($nv -match '^22\.') { Ok ".node-version = $nv (Node 22 LTS)" }
else { Fail ".node-version should be 22.x (found '$nv')" }

# ── 6. Internal markdown relative links ───────────────────────────
Section "6. Relative markdown links"

$mdFiles = @(Get-ChildItem -Path (Join-Path $Root 'docs') -Recurse -Filter *.md)
$mdFiles += Get-Item (Join-Path $Root 'README.md')
$linkFail = 0
foreach ($f in $mdFiles) {
  $dir = $f.DirectoryName
  $content = [System.IO.File]::ReadAllText($f.FullName)
  $matches = [regex]::Matches($content, '\[[^\]]*\]\(([^)]+)\)')
  foreach ($m in $matches) {
    $url = $m.Groups[1].Value.Trim()
    if ($url -match '^(https?://|mailto:|#|C:)') { continue }
    $clean = ($url -split '#')[0]
    if ([string]::IsNullOrWhiteSpace($clean)) { continue }
    $target = [System.IO.Path]::GetFullPath((Join-Path $dir ($clean -replace '/', [IO.Path]::DirectorySeparatorChar)))
    if (-not (Test-Path -LiteralPath $target)) {
      $rel = $f.FullName.Substring($Root.Length + 1)
      Fail "Broken link in ${rel}: ($url)"
      $linkFail++
    }
  }
}
if ($linkFail -eq 0) { Ok "All relative markdown links resolve" }

# ── 7. File health ────────────────────────────────────────────────
Section "7. File health"

foreach ($f in $scanFiles) {
  $len = (Get-Item -LiteralPath $f.FullName).Length
  if ($len -lt 40) { Fail "Suspiciously small file ($len bytes): $($f.FullName.Substring($Root.Length+1))" }
}
Ok "No empty/tiny scanned files"

$tw = 0
foreach ($f in $mdFiles) {
  $lines = [System.IO.File]::ReadAllLines($f.FullName)
  $n = 0
  foreach ($line in $lines) {
    $n++
    if ($line -match '[ \t]+$') {
      $tw++
      if ($tw -le 5) { Warn "Trailing whitespace $($f.Name):$n" }
    }
  }
}
if ($tw -eq 0) { Ok "No trailing whitespace in docs markdown" }
elseif ($tw -gt 5) { Warn "Trailing whitespace total lines: $tw (run strip or fix)" }

# ── 8. RFC Acceptance checklists present ──────────────────────────
Section "8. Acceptance sections"

foreach ($id in $rfcIds) {
  $name = $rfcNames[$id]
  $path = Join-Path $Root "docs\architecture\${id}_${name}.md"
  $text = [System.IO.File]::ReadAllText($path)
  if ($text -like '*Acceptance*') { Ok "Acceptance present: $id" }
  else { Fail "No Acceptance section: $id" }
  if ($text -like '*Phase 0*') { Ok "Phase 0 marker: $id" }
  else { Warn "Missing Phase 0 marker: $id" }
}

# ── 9. Cross-doc consistency samples ──────────────────────────────
Section "9. Cross-doc consistency"

$p01 = [System.IO.File]::ReadAllText((Join-Path $Root 'docs\architecture\01_PRODUCT.md'))
$p02 = [System.IO.File]::ReadAllText((Join-Path $Root 'docs\architecture\02_CONSTITUTION.md'))
$p10 = [System.IO.File]::ReadAllText((Join-Path $Root 'docs\architecture\10_ACCOUNT.md'))
$rules = [System.IO.File]::ReadAllText((Join-Path $Root '.cursor\rules\clime-growth-os.mdc'))

if ($p01.Contains('P0') -and $p02.Contains('P0') -and $p10.Contains('P0')) {
  Ok "Auth ladder P0 present in 01/02/10"
} else { Fail "Auth ladder P0 missing in one of 01/02/10" }

if ($p02.Contains('canPublish') -and $p10.Contains('canPublish') -and $rules.Contains('canPublish')) {
  Ok "canPublish aligned across 02/10/rules"
} else { Fail "canPublish missing in 02/10/rules" }

if ($p01.Contains('Tailwind') -and $p01.Contains('Pretendard') -and $p01.Contains('Vitest')) {
  Ok "Locked UI/test stack mentioned in 01"
} else { Fail "01 missing Tailwind/Pretendard/Vitest lock" }

$exp01 = ([regex]::Matches($p01, '\|\s*\d+\s*\|\s*\*\*')).Count
if ($exp01 -ge 15) { Ok "Expansion Map detail in 01 ($exp01 rows)" }
else { Warn "01 Expansion Map rows look thin ($exp01)" }

# ── 10. Secrets hygiene ───────────────────────────────────────────
Section "10. Secrets hygiene"

$secretPatterns = @(
  'sk-[A-Za-z0-9]{20,}',
  'OPENAI_API_KEY\s*=\s*\S+',
  '-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----',
  'ghp_[A-Za-z0-9]{20,}',
  'xox[baprs]-[A-Za-z0-9-]{10,}'
)
$secretHits = @()
$allText = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch '\\\.git\\|\\node_modules\\|\\agent-transcripts\\|\\terminals\\|\\\.turbo\\|\\dist\\|\\release\\' -and
    $_.Name -notmatch '\.(test|spec)\.(ts|tsx|js|jsx)$' -and
    $_.Extension -match '\.(md|mdc|ps1|json|yml|yaml|txt|env|ts|tsx|js)$'
  }
foreach ($f in $allText) {
  $raw = [System.IO.File]::ReadAllText($f.FullName)
  foreach ($pat in $secretPatterns) {
    if ([regex]::IsMatch($raw, $pat)) {
      $secretHits += "$($f.FullName.Substring($Root.Length+1))"
      break
    }
  }
}
if ($secretHits.Count -eq 0) { Ok "No obvious secret material in tracked-like files" }
else { Fail "Possible secrets: $($secretHits -join ', ')" }

# ── 11. Toolchain script sanity ───────────────────────────────────
Section "11. Toolchain script sanity"

$tc = [System.IO.File]::ReadAllText((Join-Path $Root 'scripts\check-toolchain.ps1'))
if ($tc.Contains('Prisma')) { Fail "check-toolchain.ps1 still mentions Prisma" }
else { Ok "check-toolchain.ps1 has no Prisma residue" }
if ($tc -match 'Node >= 22') { Ok "Toolchain enforces Node >= 22" }
else { Warn "Toolchain Node major check not found" }

# ── Result ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Checks executed: $checks" -ForegroundColor Cyan
if ($failures.Count -eq 0) {
  Write-Host "RESULT: GREEN ($($warnings.Count) warning(s), 0 failure(s))" -ForegroundColor Green
  Write-Host "Phase 0 docs/SSOT gate passed. App ESLint/Vitest/Playwright start in Phase A." -ForegroundColor Green
  exit 0
} else {
  Write-Host "RESULT: RED - $($failures.Count) failure(s), $($warnings.Count) warning(s)" -ForegroundColor Red
  Write-Host "`nFailures:" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
