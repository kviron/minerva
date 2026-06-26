# Tesserae Refresh Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace error-prone direct Tesserae refresh calls with one safe Windows PowerShell wrapper.

**Architecture:** A repository-local script owns UTF-8 setup, exact generated-target cleanup, working-directory control, and exit-code propagation. Project instructions call this wrapper exclusively.

**Tech Stack:** PowerShell, Tesserae 0.10.1, Git

---

### Task 1: Add the safe refresh wrapper

**Files:**
- Create: `scripts/refresh-tesserae.ps1`

- [ ] **Step 1: Verify the wrapper is absent**

```powershell
if (-not (Test-Path -LiteralPath 'scripts/refresh-tesserae.ps1')) {
  throw 'Tesserae refresh wrapper is missing'
}
```

Expected: FAIL with `Tesserae refresh wrapper is missing`.

- [ ] **Step 2: Create the wrapper**

```powershell
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Get-Command tesserae -ErrorAction Stop | Out-Null

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tesseraeDirectory = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot '.tesserae'))
$generatedTargets = @(
    (Join-Path $tesseraeDirectory 'graph.json'),
    (Join-Path $tesseraeDirectory 'code-graph.json')
)

foreach ($target in $generatedTargets) {
    $fullTarget = [System.IO.Path]::GetFullPath($target)
    $targetDirectory = [System.IO.Path]::GetDirectoryName($fullTarget)

    if ($targetDirectory -ne $tesseraeDirectory) {
        throw "Refusing to remove a path outside the Tesserae directory: $fullTarget"
    }

    Remove-Item -LiteralPath $fullTarget -Force -ErrorAction SilentlyContinue
}

$previousPythonUtf8 = [Environment]::GetEnvironmentVariable('PYTHONUTF8', 'Process')
$previousPythonIoEncoding = [Environment]::GetEnvironmentVariable('PYTHONIOENCODING', 'Process')

try {
    [Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'Process')
    [Environment]::SetEnvironmentVariable('PYTHONIOENCODING', 'utf-8', 'Process')

    Push-Location -LiteralPath $repositoryRoot
    try {
        & tesserae refresh
        $refreshExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
finally {
    [Environment]::SetEnvironmentVariable('PYTHONUTF8', $previousPythonUtf8, 'Process')
    [Environment]::SetEnvironmentVariable('PYTHONIOENCODING', $previousPythonIoEncoding, 'Process')
}

if ($refreshExitCode -ne 0) {
    throw "Tesserae refresh failed with exit code $refreshExitCode"
}
```

- [ ] **Step 3: Verify the wrapper exists**

```powershell
if (-not (Test-Path -LiteralPath 'scripts/refresh-tesserae.ps1')) {
  throw 'Tesserae refresh wrapper is missing'
}
```

Expected: PASS with exit code 0.

### Task 2: Make the wrapper the documented command

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/operations/tesserae.md`
- Modify: `docs/progress.md`

- [ ] **Step 1: Update the required workflow**

Replace the generic refresh instruction in `AGENTS.md` with:

```markdown
- Refresh Tesserae after canonical documentation or implementation changes by running `./scripts/refresh-tesserae.ps1`; do not call `tesserae refresh` directly on Windows.
```

- [ ] **Step 2: Update the operations guide**

Document `./scripts/refresh-tesserae.ps1` as the standard command and retain a concise explanation of its UTF-8 setup and exact generated-file cleanup.

- [ ] **Step 3: Record completion**

Add this bullet to `docs/progress.md`:

```markdown
- Added a safe Tesserae refresh wrapper that prevents the recurring Windows `WinError 183` workflow failure.
```

### Task 3: Verify and commit

**Files:**
- Verify: `scripts/refresh-tesserae.ps1`
- Verify: `AGENTS.md`
- Verify: `docs/operations/tesserae.md`

- [ ] **Step 1: Run the wrapper**

```powershell
./scripts/refresh-tesserae.ps1
```

Expected: exit code 0 with `sessions-import`, `compile`, and `obsidian-sync` reporting `ok`.

- [ ] **Step 2: Check direct refresh references**

```powershell
rg -n "tesserae refresh" AGENTS.md docs scripts
```

Expected: no executable direct-refresh instruction remains outside historical Superpowers plans or the wrapper's implementation command.

- [ ] **Step 3: Commit only tooling and documentation**

```powershell
git add -- AGENTS.md scripts/refresh-tesserae.ps1 docs/operations/tesserae.md docs/progress.md docs/superpowers/specs/2026-06-27-tesserae-refresh-wrapper-design.md docs/superpowers/plans/2026-06-27-tesserae-refresh-wrapper.md
git commit -m "tooling: add safe Tesserae refresh wrapper"
```

Do not stage `.tesserae` or unrelated application changes.
