<#
.SYNOPSIS
  Validates the GitHub Pages shell in docs\.

.DESCRIPTION
  Checks the things that quietly break a published wrapper:

    * the Apps Script /exec URL is configured and well formed,
    * the shell configuration block is complete,
    * the web app manifest parses and every icon it lists exists on disk,
    * the page actually renders the frame, the shell bar, and the fallback panel
      (verified in headless Chrome/Edge, so the inline JavaScript must run).

  Exit code is 1 when any check fails.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\shell-check.ps1
#>
[CmdletBinding()]
param(
  [string]$BrowserPath,
  [int]$VirtualTimeBudgetMs = 9000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root 'docs'
$indexPath = Join-Path $docs 'index.html'

$script:failures = 0

function Test-Check {
  param([string]$Label, [bool]$Condition, [string]$Detail)
  if ($Condition) {
    Write-Host "PASS  $Label"
  } else {
    $script:failures++
    Write-Host "FAIL  $Label$(if ($Detail) { '   [' + $Detail + ']' })" -ForegroundColor Red
  }
}

Write-Host "Shell: $indexPath"
Test-Check 'docs\index.html exists' (Test-Path -LiteralPath $indexPath)

$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)

# --- configuration ---
$appUrlMatch = [regex]::Match($html, "appUrl:\s*'([^']+)'")
Test-Check 'the configuration declares appUrl' $appUrlMatch.Success
$appUrl = if ($appUrlMatch.Success) { $appUrlMatch.Groups[1].Value } else { '' }

Test-Check 'appUrl is an Apps Script /exec deployment URL' `
  ($appUrl -match '^https://script\.google\.com/macros/s/[A-Za-z0-9_\-]+/exec$') $appUrl
Test-Check 'the configuration declares siteUrl' ($html -match "siteUrl:\s*'[^']+'")
Test-Check 'the configuration declares embedTimeoutMs' ($html -match 'embedTimeoutMs:\s*\d+')
$siteUrlMatch = [regex]::Match($html, "siteUrl:\s*'([^']+)'")
$canonicalMatch = [regex]::Match($html, '<link rel="canonical" href="([^"]+)"')
Test-Check 'a canonical link is declared' $canonicalMatch.Success
if ($siteUrlMatch.Success -and $canonicalMatch.Success) {
  $siteHost = ([System.Uri]$siteUrlMatch.Groups[1].Value).Host
  $canonicalHost = ([System.Uri]$canonicalMatch.Groups[1].Value).Host
  Test-Check 'the canonical link matches the configured siteUrl host' ($siteHost -eq $canonicalHost) "$canonicalHost vs $siteHost"
}

# --- manifest and icons ---
$manifestPath = Join-Path $docs 'manifest.webmanifest'
Test-Check 'docs\manifest.webmanifest exists' (Test-Path -LiteralPath $manifestPath)

$manifest = $null
try { $manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json } catch { }
Test-Check 'the manifest is valid JSON' ($null -ne $manifest)
if ($manifest) {
  Test-Check 'the manifest opens in standalone mode' ($manifest.display -eq 'standalone') ([string]$manifest.display)
  Test-Check 'the manifest carries the RLCC theme colour' ($manifest.theme_color -eq '#365233') ([string]$manifest.theme_color)

  foreach ($icon in $manifest.icons) {
    $iconPath = Join-Path $docs $icon.src
    Test-Check "manifest icon exists: $($icon.src)" (Test-Path -LiteralPath $iconPath)
  }
}

foreach ($asset in @('favicon-32.png', 'apple-touch-icon.png')) {
  Test-Check "shell asset exists: $asset" (Test-Path -LiteralPath (Join-Path $docs $asset))
}

# --- rendered page ---
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

if (-not $BrowserPath) {
  Write-Host 'SKIP  rendered-page checks (no Chrome or Edge found)' -ForegroundColor Yellow
} else {
  $workFile = Join-Path $env:TEMP ('rlcc-shell-' + [guid]::NewGuid().ToString('N') + '.html')
  $profileDirectory = Join-Path $env:TEMP ('rlcc-shell-profile-' + [guid]::NewGuid().ToString('N'))
  try {
    Copy-Item -LiteralPath $indexPath -Destination $workFile -Force
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

    Test-Check 'the shell bar renders' ($dom -match 'class="shell-bar"')
    Test-Check 'the fallback panel renders' ($dom -match 'id="overlay"')
    Test-Check 'the frame points at the configured deployment' `
      ($dom -match 'id="app-frame"' -and $dom -match [regex]::Escape($appUrl))
    Test-Check 'the new-tab link points at the configured deployment' `
      ($dom -match "id=`"open-tab`"[^>]*href=`"$([regex]::Escape($appUrl))`"")
    Test-Check 'the offline/blocked guidance is available to the user' `
      ($dom -match 'Open the app in a new tab')
  } finally {
    if (Test-Path -LiteralPath $workFile) { Remove-Item -LiteralPath $workFile -Force }
    if (Test-Path -LiteralPath $profileDirectory) { Remove-Item -LiteralPath $profileDirectory -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

Write-Host ''
if ($script:failures -gt 0) {
  Write-Host "SHELL CHECK FAILED: $($script:failures) check(s)" -ForegroundColor Red
  exit 1
}
Write-Host 'SHELL CHECK PASSED' -ForegroundColor Green
