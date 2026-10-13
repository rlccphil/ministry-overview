<#
.SYNOPSIS
  Runs every test suite for the RLCC Ministry Overview and Reviewer.

.DESCRIPTION
    1. browser-smoke-test.ps1  — the real UI (Styles.html + Client.html) driven in
                                 headless Chrome/Edge against the mock backend.
    2. server-logic-test.ps1   — the real Code.gs backend against an in-memory
                                 Apps Script double.
    3. shell-check.ps1         — the GitHub Pages shell in docs\ (configuration,
                                 manifest, icons, and the rendered page).

  Exits 1 if any suite fails, so this is the command to run before pushing.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host '=== Interface (Styles.html + Client.html) ===' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'browser-smoke-test.ps1')
$uiExit = $LASTEXITCODE

Write-Host ''
Write-Host '=== Backend (Code.gs) ===' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'server-logic-test.ps1')
$serverExit = $LASTEXITCODE

Write-Host ''
Write-Host '=== Shell (docs\index.html) ===' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'shell-check.ps1')
$shellExit = $LASTEXITCODE

Write-Host ''
if ($uiExit -ne 0 -or $serverExit -ne 0 -or $shellExit -ne 0) {
  Write-Host "TESTS FAILED (interface: $uiExit, backend: $serverExit, shell: $shellExit)" -ForegroundColor Red
  exit 1
}

Write-Host 'ALL SUITES PASSED' -ForegroundColor Green
