# RLCC Ministry Overview and Reviewer

A Google Apps Script web app that walks lay leaders, interns, and pastors
through the RLCC ministry pathway — **REACH · CORE · LEAD** — one step at a
time. Participants register with their **name**, **community**, and **email**,
apply every sub-step of a step before the next one unlocks, and record a short
reflection as evidence. Everything is written to a Google Sheet so leaders can
follow up.

---

## The pathway

| Area | Steps | Sub-steps |
| --- | --- | --- |
| **REACH** — Reaching Everyone and Converting Hearts | 3 (GO · BRING · JOIN) | 11 |
| **CORE** — Creating Ongoing Renewal Environments | 3 (CARE · BUILD · DEPLOY) | 15 |
| **LEAD** — Leadership Empowerment and Development | 4 (SPOT · TRAIN · ASSIGN · SEND) | 19 |
| | **10 steps** | **45 sub-steps** |

All content lives in [Curriculum.gs](Curriculum.gs) — the single source of truth
used by both the app and the server-side validation.

## How the pathway is enforced

1. **Sub-steps gate the step.** A step can only be marked complete when every
   one of its sub-steps is ticked *and* a reflection has been written
   (configurable, minimum length 20 characters by default).
2. **Steps gate the next step.** REACH 1 → REACH 2 → … → LEAD 4. Locked steps
   show *why* they are locked and which step to finish first.
3. **Completed steps become read-only review.** The participant can re-read a
   finished step any time, but cannot change it — tick marks are disabled.
   **Reopen this step** returns it to in-progress mode (with a confirmation),
   and every later step has to be completed again so the order stays honest.
4. **The server enforces the same rules.** Every request is validated in
   [Code.gs](Code.gs), so a hand-crafted request cannot tick a sub-step of a
   locked step or complete a step whose sub-steps are not applied.

## What gets recorded

The app creates (or reuses) one spreadsheet — *“RLCC Ministry Overview and
Reviewer — Data”* — with three tabs:

| Tab | Columns | Purpose |
| --- | --- | --- |
| **Registrants** | Registered At · Name · Community · Email · Last Seen · Steps Completed · Total Steps · Overall % · Current Step · Status | The accountability roster, ready to sort or export. |
| **Progress** | Email · Item ID · Status · Reflection / Evidence · Updated At | One row per applied sub-step and per completed step, with the participant's reflection. |
| **Activity** | Timestamp · Email · Name · Action · Item ID · Detail | Append-only audit trail: register, sign-in, sub-step applied, step completed, step reopened. |

Leaders do not need a separate dashboard to start: open the sheet, sort by
`Overall %`, and follow up with whoever has stalled.

## Repository layout

| File | Role |
| --- | --- |
| [Code.gs](Code.gs) | Server: `doGet`, registration, progress storage, validation, reporting. |
| [Config.gs](Config.gs) | Settings (sequence enforcement, reflection rules, communities, contacts). |
| [Curriculum.gs](Curriculum.gs) | The pathway content: areas, steps, sub-steps, proof, prompts. |
| [Index.html](Index.html) | Page shell; pulls in the three includes below. |
| [Styles.html](Styles.html) | All CSS. |
| [Bootstrap.html](Bootstrap.html) | Injects curriculum + settings into the page at load time. |
| [Client.html](Client.html) | The app: registration, dashboard, step view, gating UI. |
| [appsscript.json](appsscript.json) | Apps Script manifest (timezone, scopes, web app access). |
| [.claspignore](.claspignore) | Keeps repo-only files out of the Apps Script project. |
| [tools/build-preview.ps1](tools/build-preview.ps1) | Builds `preview\index.html` — the real UI with a localStorage backend. |
| [tools/preview-mock.js](tools/preview-mock.js) | The localStorage stand-in for `Code.gs` (preview only). |
| [tools/browser-smoke-test.ps1](tools/browser-smoke-test.ps1) | Drives the whole flow in headless Chrome/Edge (34 checks). |
| [tools/fake-apps-script.js](tools/fake-apps-script.js) | In-memory double for the Apps Script services `Code.gs` uses. |
| [tools/server-logic-test.js](tools/server-logic-test.js) + [.ps1](tools/server-logic-test.ps1) | Runs the real `Code.gs` against that double (51 checks). |
| [tools/run-tests.ps1](tools/run-tests.ps1) | Both suites in one command. |

## Deploying

### Option A — copy and paste (no tooling required)

1. Go to <https://script.google.com> → **New project**.
2. Rename it *RLCC Ministry Overview and Reviewer*.
3. Create these files in the editor ( **+** → *Script* for `.gs`, **+** → *HTML* for `.html`), and paste the matching file from this repo:
   `Config.gs`, `Curriculum.gs`, `Code.gs`, `Index.html`, `Styles.html`, `Bootstrap.html`, `Client.html`.
4. **Project Settings** → check *Show `appsscript.json` manifest file in editor*, then paste [appsscript.json](appsscript.json).
5. In the function dropdown choose **`setup`** and press **Run** once. Approve the permissions prompt (it only needs access to its own spreadsheet).
6. Check **Execution log**: it prints the data spreadsheet link and the pathway counts.
7. **Deploy** → *New deployment* → type **Web app**:
   * **Execute as:** *Me*
   * **Who has access:** *Anyone* (participants do not need a Google account) or *Anyone with a Google account* if you prefer.
8. Copy the `/exec` URL and share it with your leaders.

### Option B — clasp (if you use the command line)

```bash
npm install -g @google/clasp
clasp login
clasp create --type webapp --title "RLCC Ministry Overview and Reviewer"
clasp push          # .claspignore keeps README/tools/preview out of the project
clasp deploy --description "v1"
```

Run `setup` once from the Apps Script editor, then open the deployment URL.

> Both options end up with the same project. Re-deploy after edits
> (*Deploy → Manage deployments → edit → New version*) so the live URL picks up
> the changes.

## After deploying

* **Test it yourself first:** register with your own email, complete REACH 1, and
  confirm the row appears in the **Registrants** and **Progress** tabs.
* **Share the link** in your Community/Circle chats, together with one sentence
  on *why* you are asking for it (this is a discipleship tool, not a form).
* **Walk with people through it.** The reflections in the *Progress* tab are the
  natural starting point for a mentoring conversation.
* **Want the sheet emailed to you weekly?** Add a time-driven trigger on a
  small reporting function — see *Ideas for later* below.

## Configuration (`Config.gs`)

| Setting | Default | What it does |
| --- | --- | --- |
| `spreadsheetId` | `''` | Empty = the app creates its own spreadsheet and remembers the id. Set an id to use a sheet you own. |
| `enforceSequence` | `true` | `false` opens every step at once (a reading mode), while still requiring sub-steps + reflection to complete a step. |
| `requireStepReflection` | `true` | Set `false` to let a step be completed without a written reflection. |
| `minReflectionLength` | `20` | Minimum characters for the reflection. |
| `communities` | `[]` | Empty = suggestions are built from what other participants typed. Fill it with your official community list to standardise the answers. |
| `leaderContact` | `''` | Email or name shown in the footer, e.g. `discipleship@rlcc.ph`. |
| `appTitle`, `orgName`, `shortName`, `version`, `brandColor` | — | Branding text. |

## Editing the curriculum

Open [Curriculum.gs](Curriculum.gs) and edit the text — summaries, sub-step
labels, the `apply` guidance, `proof`, and `reflectionPrompt`. The app and the
server validation both read this file, so nothing else needs to change.

**Keep the `id` values stable.** Progress is stored against ids such as
`reach-1-G`, so renaming an id after people have started orphans their progress
for that item. Add new items with new ids instead of renaming old ones.

## Local preview and smoke test

Apps Script only runs on Google's servers, so the repo ships a preview build that
uses the **same** `Styles.html` and `Client.html` with a localStorage backend:

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-preview.ps1
# then open preview\index.html in a browser
```

Because the preview needs no login, it is also the fastest way to review wording
or layout changes before deploying.

```powershell
powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1
```

Two suites run, both in headless Chrome/Edge (no Node required) and both exiting
non-zero on failure so they can be wired into CI later:

* **Interface (34 checks)** — [tools/browser-smoke-test.ps1](tools/browser-smoke-test.ps1)
drives the real `Styles.html` + `Client.html`: registration, invalid email,
locked-step refusal, sub-step gating, completion, unlocking the next step,
review mode, and reopening.
* **Backend (51 checks)** — [tools/server-logic-test.ps1](tools/server-logic-test.ps1)
loads the real `Config.gs` + `Curriculum.gs` + `Code.gs` with an in-memory Apps
Script double and checks the same rules plus the roster summary columns and the
audit trail. This is how the backend is verified without deploying.

Run the suites before you push — the interface suite catches wording and layout
regressions, and the backend suite catches rule regressions. The `preview`
folder is generated and git-ignored.

## Security and privacy

* The web app is served as *Execute as: Me*, so participants never see the
  spreadsheet and need no Google account.
* Access is by email address only — it keeps honest people honest and gives you a
  roster, but it is **not authentication**. Someone who knows another
  participant's email could load that person's progress. If your context needs
  more, the two cheap upgrades are:
  1. switch the deployment to *Anyone with a Google account* and read
     `Session.getActiveUser().getEmail()` server-side, or
  2. add a shared access code (Script Properties) that participants type on the
     registration screen.
* Reflections are candid by nature (names of people being reached, struggles).
  Share the sheet only with leaders who should see it, and say plainly on the
  registration screen that a mentor will read it.

## Ideas for later

* **Leader view** — a read-only progress table inside the app (it can reuse
  `Registrants`/`Progress`) for `leadership@` accounts.
* **Weekly digest** — a time-driven trigger that emails `Overall %` per
  community to the pastoral team.
* **Certificates / badges** — issue a PDF or email when LEAD 4 is completed.
* **Multiplier tracking** — when a leader is *sent* (LEAD 4), open a new row in
  a `Multiplication` tab so the new work is visible.
* **Tagalog / Cebuano** — the curriculum object can hold parallel fields, or a
  second curriculum file can be selected per deployment.
* **Attendance tie-in** — reconcile the roster with Planning Center to spot
  people who registered but never started.

## License

Internal RLCC resource. Adapt freely for your own churches and communities.
