<#
.SYNOPSIS
  Builds a single-file offline preview of the RLCC Ministry Overview and
  Reviewer web app (preview\index.html).

.DESCRIPTION
  Google Apps Script is only executed on Google's servers, so this script
  stitches the real project files together in the same order Apps Script does
  (Styles, settings + curriculum, client) and adds tools\preview-mock.js —
  a localStorage stand-in for Code.gs. The preview uses the exact same
  Styles.html and Client.html that get deployed, so what you review locally is
  what the app looks like.

  The preview is for review only: registrations and progress are stored in
  your browser, not in the accountability spreadsheet.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\build-preview.ps1
#>
[CmdletBinding()]
param(
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
if (-not $OutputPath) { $OutputPath = Join-Path $root 'preview\index.html' }
$appTitle = 'RLCC Ministry Overview and Reviewer'

function Read-Text([string]$relativePath) {
  $path = Join-Path $root $relativePath
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $relativePath" }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

$index        = Read-Text 'Index.html'
$styles       = Read-Text 'Styles.html'
$client       = Read-Text 'Client.html'
$configJs     = Read-Text 'Config.gs'
$curriculumJs = Read-Text 'Curriculum.gs'
$mockJs       = Read-Text 'tools\preview-mock.js'

$bootstrapSnippet = @'
<script>
/* Preview only: settings and curriculum taken straight from Config.gs / Curriculum.gs. */
(function () {
  var settings = {};
  for (var key in CONFIG) {
    if (key !== 'spreadsheetId') { settings[key] = CONFIG[key]; }
  }
  window.__BOOTSTRAP__ = { ok: true, curriculum: CURRICULUM, config: settings, communities: [] };
})();
</script>
'@

$backend = @(
  '<script>'
  $configJs
  '</script>'
  '<script>'
  $curriculumJs
  '</script>'
  $bootstrapSnippet
  '<script>'
  $mockJs
  '</script>'
) -join "`r`n"

$preview = $index
$preview = $preview.Replace('<?= appTitle ?>', "$appTitle (preview)")
$preview = $preview.Replace('<style><?!= include(''Styles''); ?></style>', "<style>`r`n$styles`r`n</style>")
$preview = $preview.Replace('<?!= include(''Bootstrap''); ?>', $backend)
$preview = $preview.Replace('<?!= include(''Client''); ?>', $client)

if ($preview.Contains('<?')) {
  throw 'Some Apps Script template placeholders were not replaced. Check Index.html.'
}

$directory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $directory)) {
  New-Item -ItemType Directory -Path $directory | Out-Null
}
[System.IO.File]::WriteAllText($OutputPath, $preview, (New-Object System.Text.UTF8Encoding($false)))

$sizeKb = [math]::Round((Get-Item -LiteralPath $OutputPath).Length / 1KB, 1)
Write-Host "Preview written: $OutputPath ($sizeKb KB)"
Write-Host 'Open it in a browser. Data is stored in your browser only (localStorage); clear it to start over.'
