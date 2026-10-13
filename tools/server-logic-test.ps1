<#
.SYNOPSIS
  Runs the real Code.gs backend against an in-memory Apps Script double.

.DESCRIPTION
  Code.gs cannot run outside Google, but it only talks to Apps Script through a
  handful of services. tools\fake-apps-script.js implements exactly those
  (SpreadsheetApp, PropertiesService, LockService, Utilities, Session, Logger),
  so this script can load Config.gs + Curriculum.gs + Code.gs into a browser and
  exercise registration, the sequence gate, sub-step gating, the reflection
  rule, completion, reopening, the roster summary columns, and the audit trail.

  Exit code is 1 when any check fails.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\server-logic-test.ps1
#>
[CmdletBinding()]
param(
  [string]$BrowserPath,
  [int]$VirtualTimeBudgetMs = 15000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Read-Text([string]$relativePath) {
  $path = Join-Path $root $relativePath
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $relativePath" }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

if (-not $BrowserPath) {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { $BrowserPath = $candidate; break }
  }
}
if (-not $BrowserPath) { throw 'Could not find Chrome or Edge. Pass -BrowserPath explicitly.' }
Write-Host "Browser: $BrowserPath"

$parts = @(
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>RLCC server logic test</title></head><body><pre id="out"></pre>'
  '<script>'
  (Read-Text 'Config.gs')
  '</script>'
  '<script>'
  (Read-Text 'Curriculum.gs')
  '</script>'
  '<script>'
  (Read-Text 'Code.gs')
  '</script>'
  '<script>'
  (Read-Text 'tools\fake-apps-script.js')
  '</script>'
  '<script>'
  (Read-Text 'tools\server-logic-test.js')
  '</script>'
  '</body></html>'
) -join "`r`n"

$workFile = Join-Path $env:TEMP ('rlcc-server-test-' + [guid]::NewGuid().ToString('N') + '.html')
$profileDirectory = Join-Path $env:TEMP ('rlcc-server-profile-' + [guid]::NewGuid().ToString('N'))

try {
  [System.IO.File]::WriteAllText($workFile, $parts, (New-Object System.Text.UTF8Encoding($false)))

  $uri = ([System.Uri]$workFile).AbsoluteUri

  # Chrome writes unrelated warnings to stderr; with ErrorActionPreference = Stop
  # PowerShell 5.1 turns those into a terminating error, so relax it here.
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $dom = & $BrowserPath '--headless=new' '--disable-gpu' '--no-sandbox' '--no-first-run' `
      "--virtual-time-budget=$VirtualTimeBudgetMs" "--user-data-dir=$profileDirectory" `
      '--dump-dom' $uri 2>$null | Out-String
  } finally {
    $ErrorActionPreference = $previousPreference
  }

  if ($dom -notmatch '===SERVERTEST===') {
    $excerpt = $dom.Substring(0, [Math]::Min(2000, $dom.Length))
    throw "The backend test never reported. DOM excerpt:`n$excerpt"
  }

  # The test script's own source is part of the DOM; take the last marker block.
  $matches = [regex]::Matches($dom, '(?s)===SERVERTEST===(.*?)===END===')
  $block = $matches[$matches.Count - 1].Groups[1].Value.Trim()

  Write-Host ''
  Write-Host $block
  Write-Host ''

  if ($block -match 'FAIL' -or $block -notmatch 'RESULT: all checks passed') { exit 1 }
} finally {
  if (Test-Path -LiteralPath $workFile) { Remove-Item -LiteralPath $workFile -Force }
  if (Test-Path -LiteralPath $profileDirectory) { Remove-Item -LiteralPath $profileDirectory -Recurse -Force -ErrorAction SilentlyContinue }
}
