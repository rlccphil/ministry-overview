# tools

Local development and test harness for the RLCC Ministry Overview and Reviewer.
Nothing here is uploaded to Google — `.claspignore` keeps this folder out of the
Apps Script project, and the app itself never calls it.

## Run everything

```powershell
powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1
```

Three suites, all in headless Chrome or Edge (no Node required), all exiting
non-zero on failure:

| Suite | Checks | What it proves |
| --- | --- | --- |
| [browser-smoke-test.ps1](browser-smoke-test.ps1) | 34 | The real `Styles.html` + `Client.html`: registration, invalid email, locked steps, sub-step gating, completion, unlocking, review mode, reopening. |
| [server-logic-test.ps1](server-logic-test.ps1) | 51 | The real `Code.gs` against an in-memory Apps Script double: registration, the sequence gate, the reflection rule, the roster summary columns, the audit trail. |
| [shell-check.ps1](shell-check.ps1) | 20 | The GitHub Pages shell: configuration, manifest, icons, and the rendered page. |

## Individual pieces

| File | Role |
| --- | --- |
| [run-tests.ps1](run-tests.ps1) | Runs all three suites. |
| [browser-smoke-test.ps1](browser-smoke-test.ps1) | Builds the preview, then drives the UI in a headless browser. |
| [server-logic-test.ps1](server-logic-test.ps1) | Loads `Config.gs` + `Curriculum.gs` + `Code.gs` with the double below and asserts the backend rules. |
| [server-logic-test.js](server-logic-test.js) | The assertions themselves. |
| [fake-apps-script.js](fake-apps-script.js) | In-memory `SpreadsheetApp` / `PropertiesService` / `LockService` / `Utilities` / `Session` / `Logger`. |
| [build-preview.ps1](build-preview.ps1) | Writes `preview\index.html` — the real UI with a localStorage backend, for reviewing the app without deploying. |
| [preview-mock.js](preview-mock.js) | The localStorage stand-in for `Code.gs` used by that preview. |
| [shell-check.ps1](shell-check.ps1) | Validates `docs\` before you publish. |

## Notes

* `preview\` is generated; it is git-ignored and safe to delete.
* Run the suites before pushing. They catch wording, layout, and rule
  regressions — and packaging mistakes that would only show up as a blank page
  on the live site.
