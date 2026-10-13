<#
.SYNOPSIS
  End-to-end smoke test for the RLCC Ministry Overview and Reviewer.

.DESCRIPTION
  Apps Script code cannot run outside Google, but everything the user actually
  sees and touches lives in Styles.html and Client.html — and those run
  anywhere. This script:

    1. rebuilds preview\index.html (real Styles.html + Client.html, mock backend),
    2. appends a driver script that walks the whole pathway: registration,
       invalid-email handling, locked steps, sub-step gating, completing a step,
       unlocking the next one, and reopening a step,
    3. runs the page in headless Chrome or Edge and prints the PASS/FAIL report.

  Exit code is 1 when any check fails, so it can be wired into CI later.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\browser-smoke-test.ps1
#>
[CmdletBinding()]
param(
  [string]$BrowserPath,
  [int]$VirtualTimeBudgetMs = 30000
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot 'build-preview.ps1')
$previewPath = Join-Path $root 'preview\index.html'
if (-not (Test-Path -LiteralPath $previewPath)) { throw "Preview not found: $previewPath" }

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

$driver = @'
<script>
/* Smoke-test driver — appended to the generated preview, never shipped. */
(function () {
  'use strict';

  var log = [];
  var failures = 0;

  function check(label, condition, extra) {
    if (condition) { log.push('PASS  ' + label); }
    else { failures++; log.push('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); }
  }

  function report() {
    log.push(failures === 0 ? 'RESULT: all checks passed' : 'RESULT: ' + failures + ' check(s) failed');
    var pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = '===SELFTEST===\n' + log.join('\n') + '\n===END===';
    document.body.appendChild(pre);
  }

  function sleep(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }

  function waitFor(fn, label, timeout) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function poll() {
        var value = null;
        try { value = fn(); } catch (err) { value = null; }
        if (value) { resolve(value); return; }
        if (Date.now() - started > (timeout || 5000)) { reject(new Error('timeout waiting for ' + label)); return; }
        window.setTimeout(poll, 40);
      })();
    });
  }

  function setValue(el, value) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function click(el) { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }

  function submitForm() {
    document.getElementById('register-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  function rows() { return document.querySelectorAll('.step-row'); }
  function rowFor(stepId) { return document.querySelector('.step-row[data-id="' + stepId + '"]'); }
  function lockedCount() { return document.querySelectorAll('.chip.locked').length; }
  function completeBtn() { return document.getElementById('complete-btn'); }

  async function tickNextSubstep() {
    var box = document.querySelector('.substep input[type="checkbox"]:not(:checked)');
    check('an unchecked sub-step is available to tick', !!box);
    if (!box) return;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(500);
  }

  async function run() {
    var email = 'smoke.test@example.com';

    /* ---------- registration gate ---------- */
    var form = await waitFor(function () { return document.getElementById('register-form'); }, 'registration form');
    check('registration form is rendered', !!form);
    check('three pathway pillars are shown', document.querySelectorAll('.pillar').length === 3,
      'found ' + document.querySelectorAll('.pillar').length);
    check('name, community and email fields exist',
      !!document.getElementById('field-name') &&
      !!document.getElementById('field-community') &&
      !!document.getElementById('field-email'));

    setValue(document.getElementById('field-name'), 'Smoke Test Leader');
    setValue(document.getElementById('field-community'), 'RLCC Smoke Test');
    setValue(document.getElementById('field-email'), 'not-an-email');
    submitForm();
    await waitFor(function () { return document.querySelector('.banner.error'); }, 'validation banner');
    check('an invalid email address is rejected', true);

    setValue(document.getElementById('field-email'), email);
    submitForm();

    /* ---------- dashboard ---------- */
    await waitFor(function () { return rows().length ? rows() : null; }, 'dashboard step rows');
    check('all ten steps are listed', rows().length === 10, 'found ' + rows().length);
    check('nine steps are locked at the start', lockedCount() === 9, 'found ' + lockedCount());
    check('REACH step 1 is the open step', !!rowFor('reach-1') && rowFor('reach-1').classList.contains('is-open'));
    check('progress strip starts at zero',
      document.querySelector('.progress-strip').textContent.indexOf('0 of 10') !== -1);

    /* ---------- locked step is refused ---------- */
    click(document.querySelector('.step-row[data-id="lead-1"]'));
    await waitFor(function () { return document.querySelector('.locked-panel'); }, 'locked panel');
    check('a locked step shows the locked panel instead of its content', true);
    click(document.querySelector('[data-act="dashboard"]'));
    await waitFor(function () { return rowFor('reach-1'); }, 'dashboard again');

    /* ---------- step detail and gating ---------- */
    click(rowFor('reach-1'));
    await waitFor(function () { return document.querySelectorAll('.substep').length ? document.querySelectorAll('.substep') : null; }, 'sub-steps');
    check('REACH step 1 lists its two sub-steps', document.querySelectorAll('.substep').length === 2,
      'found ' + document.querySelectorAll('.substep').length);
    check('the complete button starts disabled', completeBtn().disabled === true);

    setValue(document.getElementById('note'), 'I prayed for three names on my H.I.T. List this week.');
    await sleep(80);
    check('the reflection alone does not unlock completion', completeBtn().disabled === true);

    await tickNextSubstep();
    check('completing is still blocked with one sub-step left', completeBtn().disabled === true);

    await tickNextSubstep();
    check('the reflection survived the re-render',
      document.getElementById('note').value.indexOf('H.I.T. List') !== -1);
    check('the complete button unlocks once every sub-step is applied', completeBtn().disabled === false);

    click(completeBtn());
    await waitFor(function () { return document.querySelector('.review-block'); }, 'review mode');
    check('a completed step switches into review mode', true);
    check('the applied sub-steps stay ticked', document.querySelectorAll('.substep.is-done').length === 2,
      'found ' + document.querySelectorAll('.substep.is-done').length);
    check('sub-steps are read-only while reviewing', !!document.querySelector('.substep input[disabled]'));
    check('the recorded reflection is shown back',
      document.querySelector('.review-note').textContent.indexOf('H.I.T. List') !== -1);

    /* ---------- the next step unlocks ---------- */
    click(document.querySelector('[data-act="dashboard"]'));
    await waitFor(function () { return rowFor('reach-2'); }, 'dashboard after completion');
    check('REACH step 1 now reads as complete',
      !!rowFor('reach-1') && rowFor('reach-1').classList.contains('is-complete'));
    check('REACH step 2 has unlocked',
      !!rowFor('reach-2') && rowFor('reach-2').classList.contains('is-open'));
    check('eight steps remain locked', lockedCount() === 8, 'found ' + lockedCount());
    check('overall progress moved to 1 of 10',
      document.querySelector('.progress-strip').textContent.indexOf('1 of 10') !== -1);
    check('the area progress figure moved', document.querySelector('.area-progress .pct').textContent === '33%',
      'found ' + document.querySelector('.area-progress .pct').textContent);

    /* ---------- the mock backend refuses out-of-order writes ---------- */
    var blockedComplete = await window.RLCC_PREVIEW.call('completeStep',
      [{ email: email, stepId: 'lead-1', note: 'Trying to skip ahead without applying anything at all.' }]);
    check('a locked step cannot be completed through the API', blockedComplete.ok === false,
      JSON.stringify(blockedComplete));

    var blockedToggle = await window.RLCC_PREVIEW.call('toggleSubstep',
      [{ email: email, stepId: 'core-1', substepId: 'core-1-C', done: true }]);
    check('a sub-step of a locked step cannot be ticked through the API', blockedToggle.ok === false,
      JSON.stringify(blockedToggle));

    var missingSubsteps = await window.RLCC_PREVIEW.call('completeStep',
      [{ email: email, stepId: 'reach-2', note: 'Everything applied, honestly, all five of them.' }]);
    check('a step with unapplied sub-steps cannot be completed', missingSubsteps.ok === false,
      JSON.stringify(missingSubsteps));

    /* ---------- reopening ---------- */
    window.confirm = function () { return true; };
    click(rowFor('reach-1'));
    await waitFor(function () { return document.querySelector('[data-act="reopen"]'); }, 'reopen button');
    click(document.querySelector('[data-act="reopen"]'));
    await waitFor(function () { return completeBtn(); }, 'step back in progress');
    check('a reopened step returns to in-progress mode', !!completeBtn());
    check('the reflection is kept after reopening',
      document.getElementById('note').value.indexOf('H.I.T. List') !== -1);
    check('the applied sub-steps are kept after reopening',
      document.querySelectorAll('.substep.is-done').length === 2,
      'found ' + document.querySelectorAll('.substep.is-done').length);

    click(document.querySelector('[data-act="dashboard"]'));
    await waitFor(function () { return rowFor('reach-2'); }, 'dashboard after reopening');
    check('reopening re-locks the following step',
      !!rowFor('reach-2') && rowFor('reach-2').classList.contains('is-locked'));
    check('overall progress went back to 0 of 10',
      document.querySelector('.progress-strip').textContent.indexOf('0 of 10') !== -1);
  }

  run().then(report).catch(function (err) {
    failures++;
    log.push('FAIL  the run aborted: ' + (err && err.message ? err.message : String(err)));
    report();
  });
})();
</script>
'@

$workFile = Join-Path $env:TEMP ('rlcc-smoke-' + [guid]::NewGuid().ToString('N') + '.html')
$profileDirectory = Join-Path $env:TEMP ('rlcc-smoke-profile-' + [guid]::NewGuid().ToString('N'))

try {
  $preview = [System.IO.File]::ReadAllText($previewPath, [System.Text.Encoding]::UTF8)
  $preview = $preview.Replace('</body>', $driver + "`r`n</body>")
  [System.IO.File]::WriteAllText($workFile, $preview, (New-Object System.Text.UTF8Encoding($false)))

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

  if ($dom -notmatch '===SELFTEST===') {
    $excerpt = $dom.Substring(0, [Math]::Min(2000, $dom.Length))
    throw "The page never produced a self-test report. DOM excerpt:`n$excerpt"
  }

  # The driver script text itself is part of the DOM, so take the last marker block.
  $matches = [regex]::Matches($dom, '(?s)===SELFTEST===(.*?)===END===')
  $block = $matches[$matches.Count - 1].Groups[1].Value.Trim()
  Write-Host ''
  Write-Host $block
  Write-Host ''

  if ($block -match 'FAIL' -or $block -notmatch 'RESULT: all checks passed') {
    exit 1
  }
} finally {
  if (Test-Path -LiteralPath $workFile) { Remove-Item -LiteralPath $workFile -Force }
  if (Test-Path -LiteralPath $profileDirectory) { Remove-Item -LiteralPath $profileDirectory -Recurse -Force -ErrorAction SilentlyContinue }
}
