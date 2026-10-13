/**
 * RLCC Ministry Overview and Reviewer
 * ---------------------------------------------------------------------------
 * Code.gs — Google Apps Script backend.
 *
 * Responsibilities
 *   1. Serve the single-page web app (doGet).
 *   2. Register participants (name, community, email) for accountability.
 *   3. Store and validate progress against the pathway in Curriculum.gs.
 *
 * Everything the browser calls goes through the small API at the bottom of
 * this file. Validation is enforced here as well as in the browser, so a
 * hand-crafted request cannot skip a locked step.
 *
 * First run: open the editor, choose the function `setup`, and run it once.
 * ---------------------------------------------------------------------------
 */

/* ===========================================================================
 * Web app entry point
 * ======================================================================== */

function doGet() {
  var bootstrap = { ok: true };

  try {
    getDataSpreadsheet_();                     // creates sheets on first run
    bootstrap.curriculum = CURRICULUM;
    bootstrap.config = publicConfig_();
    bootstrap.communities = listCommunities_();
  } catch (err) {
    bootstrap.ok = false;
    bootstrap.initError = errorText_(err);
    bootstrap.curriculum = CURRICULUM;
    bootstrap.config = publicConfig_();
    bootstrap.communities = [];
  }

  var template = HtmlService.createTemplateFromFile('Index');
  template.bootstrapJson = jsonForScript_(bootstrap);
  template.appTitle = CONFIG.appTitle;

  return template.evaluate()
    .setTitle(CONFIG.appTitle)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Lets the GitHub Pages shell (docs/index.html) frame the app. Delete this
    // line if you never want the app embedded in another site.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Used by Index.html to inline Styles.html, Bootstrap.html and Client.html. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** One-time (idempotent) setup. Run this once from the Apps Script editor. */
function setup() {
  var ss = getDataSpreadsheet_();
  Logger.log('Data spreadsheet: %s (%s)', ss.getName(), ss.getUrl());
  Logger.log('Sheets ready: %s, %s, %s',
    CONFIG.sheetNames.registrants, CONFIG.sheetNames.progress, CONFIG.sheetNames.activity);
  Logger.log('Pathway: %s steps, %s sub-steps',
    String(curriculumIndex_().steps.length), String(curriculumIndex_().substeps.length));
  return ss.getUrl();
}

/* ===========================================================================
 * Public API (called from the browser via google.script.run)
 * ======================================================================== */

/** Curriculum + settings + community suggestions. */
function getBootstrap() {
  try {
    return {
      ok: true,
      curriculum: CURRICULUM,
      config: publicConfig_(),
      communities: listCommunities_()
    };
  } catch (err) {
    return {
      ok: true,
      curriculum: CURRICULUM,
      config: publicConfig_(),
      communities: [],
      initError: errorText_(err)
    };
  }
}

/** Register a new participant, or return the existing record for this email. */
function registerUser(payload) {
  try {
    payload = payload || {};

    var name = cleanText_(payload.name, 80);
    var community = cleanText_(payload.community, 80);
    var email = normalizeEmail_(payload.email);

    if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
    if (community.length < 2) return { ok: false, error: 'Please enter your community.' };
    if (!isEmail_(email)) return { ok: false, error: 'Please enter a valid email address.' };

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var user, isNew;
    try {
      var ss = getDataSpreadsheet_();
      var sheet = ss.getSheetByName(CONFIG.sheetNames.registrants);
      var found = findRegistrant_(sheet, email);
      var now = nowText_();

      if (found) {
        // Returning participant: refresh their details, keep the original date.
        sheet.getRange(found.row, 2, 1, 3).setValues([[name, community, email]]);
        sheet.getRange(found.row, 5).setValue(now);
        user = {
          email: email,
          name: name,
          community: community,
          registeredAt: toText_(found.record[0]),
          isNew: false
        };
        isNew = false;
      } else {
        sheet.appendRow([now, name, community, email, now, 0, 0, 0, '', 'Not started']);
        user = { email: email, name: name, community: community, registeredAt: now, isNew: true };
        isNew = true;
      }

      var progress = readProgressMap_(email);
      refreshRegistrantSummary_(sheet, email, progress);
      logActivity_(email, name, isNew ? 'register' : 'sign-in', '', '');
    } finally {
      lock.releaseLock();
    }

    return { ok: true, user: user, progress: readProgressMap_(email), communities: listCommunities_() };
  } catch (err) {
    return { ok: false, error: errorText_(err) };
  }
}

/** Full state for an email that has already registered. */
function getState(email) {
  try {
    var clean = normalizeEmail_(email);
    if (!isEmail_(clean)) return { ok: false, error: 'Please enter the email address you registered with.' };

    var ss = getDataSpreadsheet_();
    var sheet = ss.getSheetByName(CONFIG.sheetNames.registrants);
    var found = findRegistrant_(sheet, clean);
    if (!found) {
      return { ok: false, error: 'not_registered', email: clean };
    }

    sheet.getRange(found.row, 5).setValue(nowText_());
    var progress = readProgressMap_(clean);
    var user = {
      email: clean,
      name: toText_(found.record[1]),
      community: toText_(found.record[2]),
      registeredAt: toText_(found.record[0]),
      isNew: false
    };
    logActivity_(clean, user.name, 'sign-in', '', '');
    return { ok: true, user: user, progress: progress };
  } catch (err) {
    return { ok: false, error: errorText_(err) };
  }
}

/** Tick or untick one sub-step. Only allowed on the current, open step. */
function toggleSubstep(payload) {
  try {
    payload = payload || {};
    var email = normalizeEmail_(payload.email);
    var stepId = String(payload.stepId || '');
    var substepId = String(payload.substepId || '');
    var done = payload.done === true || payload.done === 'true';

    var ctx = loadUserContext_(email);
    if (ctx.error) return ctx.error;

    var index = curriculumIndex_();
    var step = index.stepById[stepId];
    var substep = index.substepById[substepId];
    if (!step && !substep) return { ok: false, error: 'Unknown sub-step.' };

    // A sub-step may be addressed by its own id or by its step.
    if (substep && substep.stepId !== stepId) {
      return { ok: false, error: 'That sub-step does not belong to this step.' };
    }
    var targetStepId = substep ? substep.stepId : stepId;
    var itemId = substep ? substepId : stepId;

    var state = stateOfStep_(ctx.progress, targetStepId);
    if (state === 'complete') {
      return { ok: false, error: 'This step is already complete. Reopen it to make changes.' };
    }
    if (state === 'locked') {
      return { ok: false, error: 'Complete the previous step first.' };
    }
    if (!substep) return { ok: false, error: 'Unknown sub-step.' };

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (done) {
        upsertProgress_(email, itemId, 'done', '');
      } else {
        deleteProgress_(email, itemId);
      }
      logActivity_(email, ctx.user.name, done ? 'sub-step done' : 'sub-step cleared', itemId,
        String(step ? step.title : targetStepId));
      refreshRegistrantSummary_(ctx.sheet, email, readProgressMap_(email));
    } finally {
      lock.releaseLock();
    }

    return { ok: true, user: ctx.user, progress: readProgressMap_(email) };
  } catch (err) {
    return { ok: false, error: errorText_(err) };
  }
}

/** Complete a step: requires every sub-step ticked (+ a reflection, if enabled). */
function completeStep(payload) {
  try {
    payload = payload || {};
    var email = normalizeEmail_(payload.email);
    var stepId = String(payload.stepId || '');
    var note = cleanMultiline_(payload.note, 4000);

    var ctx = loadUserContext_(email);
    if (ctx.error) return ctx.error;

    var index = curriculumIndex_();
    var step = index.stepById[stepId];
    if (!step) return { ok: false, error: 'Unknown step.' };

    var state = stateOfStep_(ctx.progress, stepId);
    if (state === 'complete') return { ok: false, error: 'This step is already complete.' };
    if (state === 'locked') {
      return { ok: false, error: 'Complete the previous step before this one.' };
    }

    var missing = [];
    for (var i = 0; i < step.substeps.length; i++) {
      var sub = step.substeps[i];
      var rec = ctx.progress[sub.id];
      if (!rec || rec.status !== 'done') missing.push(sub.letter + ' — ' + sub.label);
    }
    if (missing.length) {
      return {
        ok: false,
        error: 'Apply every sub-step before completing this step. Still open: ' + missing.join('; '),
        missing: missing
      };
    }

    if (CONFIG.requireStepReflection && note.length < CONFIG.minReflectionLength) {
      return {
        ok: false,
        error: 'Please write your reflection (at least ' + CONFIG.minReflectionLength + ' characters).'
      };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      upsertProgress_(email, stepId, 'complete', note);
      logActivity_(email, ctx.user.name, 'step complete', stepId, step.title);
      refreshRegistrantSummary_(ctx.sheet, email, readProgressMap_(email));
    } finally {
      lock.releaseLock();
    }

    var fresh = readProgressMap_(email);
    return { ok: true, user: ctx.user, progress: fresh, unlocked: nextStepId_(stepId, fresh) };
  } catch (err) {
    return { ok: false, error: errorText_(err) };
  }
}

/**
 * Reopen a completed step. Everything after it in the pathway is cleared as
 * well, because later steps were only reachable through this one.
 */
function reopenStep(payload) {
  try {
    payload = payload || {};
    var email = normalizeEmail_(payload.email);
    var stepId = String(payload.stepId || '');

    var ctx = loadUserContext_(email);
    if (ctx.error) return ctx.error;

    var index = curriculumIndex_();
    var step = index.stepById[stepId];
    if (!step) return { ok: false, error: 'Unknown step.' };

    if (stateOfStep_(ctx.progress, stepId) !== 'complete') {
      return { ok: false, error: 'That step is not complete yet.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var reopened = [];
    try {
      // This step and every step after it go back to "in progress". Reflections
      // and applied sub-steps are kept, so re-completing them is only a click
      // each — but the order has to be walked again.
      for (var j = step.globalOrder; j < index.steps.length; j++) {
        var later = index.steps[j];
        var record = ctx.progress[later.id];
        if (record && record.status === 'complete') {
          upsertProgress_(email, later.id, 'open', record.note || '');
          reopened.push(later.title);
        }
      }

      logActivity_(email, ctx.user.name, 'step reopened', stepId,
        step.title + (reopened.length > 1
          ? ' (+' + (reopened.length - 1) + ' later step(s) set back to in progress)'
          : ''));
      refreshRegistrantSummary_(ctx.sheet, email, readProgressMap_(email));
    } finally {
      lock.releaseLock();
    }

    var fresh = readProgressMap_(email);
    return { ok: true, user: ctx.user, progress: fresh, reopened: reopened };
  } catch (err) {
    return { ok: false, error: errorText_(err) };
  }
}

/* ===========================================================================
 * Pathway helpers
 * ======================================================================== */

/** Flattened view of CURRICULUM, built fresh on each execution (cheap). */
function curriculumIndex_() {
  var index = {
    steps: [],
    substeps: [],
    stepById: {},
    substepById: {},
    areaByStepId: {}
  };

  var globalOrder = 0;
  for (var a = 0; a < CURRICULUM.areas.length; a++) {
    var area = CURRICULUM.areas[a];
    for (var s = 0; s < area.steps.length; s++) {
      var raw = area.steps[s];
      var step = {
        id: raw.id,
        areaId: area.id,
        areaCode: area.code,
        areaName: area.name,
        action: raw.action || '',
        title: raw.title,
        orderInArea: raw.order || (s + 1),
        stepsInArea: area.steps.length,
        globalOrder: globalOrder++,
        substeps: []
      };

      for (var t = 0; t < raw.substeps.length; t++) {
        var rawSub = raw.substeps[t];
        var substep = {
          id: rawSub.id,
          stepId: step.id,
          letter: rawSub.letter,
          label: rawSub.label,
          orderInStep: t + 1
        };
        step.substeps.push(substep);
        index.substeps.push(substep);
        index.substepById[substep.id] = substep;
      }

      index.steps.push(step);
      index.stepById[step.id] = step;
      index.areaByStepId[step.id] = area;
    }
  }

  index.totalSteps = index.steps.length;
  index.totalSubsteps = index.substeps.length;
  return index;
}

/** 'complete' | 'open' | 'locked' for one step, given a progress map. */
function stateOfStep_(progress, stepId) {
  var states = stepStates_(progress);
  for (var i = 0; i < states.length; i++) {
    if (states[i].step.id === stepId) return states[i].state;
  }
  return 'locked';
}

/** Ordered states for the whole pathway. */
function stepStates_(progress) {
  var index = curriculumIndex_();
  var states = [];
  var previousComplete = true;

  for (var i = 0; i < index.steps.length; i++) {
    var step = index.steps[i];
    var record = progress[step.id];
    var complete = !!(record && record.status === 'complete');
    var unlocked = i === 0 || previousComplete || !CONFIG.enforceSequence;
    states.push({
      step: step,
      state: complete ? 'complete' : (unlocked ? 'open' : 'locked')
    });
    previousComplete = complete;
  }
  return states;
}

function nextStepId_(stepId, progress) {
  var states = stepStates_(progress);
  for (var i = 0; i < states.length; i++) {
    if (states[i].step.id === stepId) {
      return i + 1 < states.length ? states[i + 1].step.id : '';
    }
  }
  return '';
}

/** Steps completed / total / current step / overall percentage. */
function summarise_(progress) {
  var states = stepStates_(progress);
  var completed = 0;
  var current = null;
  for (var i = 0; i < states.length; i++) {
    if (states[i].state === 'complete') {
      completed++;
    } else if (!current && states[i].state === 'open') {
      current = states[i].step;
    }
  }
  var total = states.length;
  return {
    stepsCompleted: completed,
    totalSteps: total,
    currentStepId: current ? current.id : '',
    currentStepLabel: current ? current.areaCode + ' · Step ' + current.orderInArea + ' — ' + current.title : '',
    percent: total ? Math.round((completed / total) * 100) : 0,
    finished: completed === total
  };
}

/* ===========================================================================
 * Spreadsheet layer
 * ======================================================================== */

function getDataSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = CONFIG.spreadsheetId || props.getProperty('DATA_SPREADSHEET_ID');
  var ss = null;

  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create(CONFIG.appTitle + ' — Data');
      props.setProperty('DATA_SPREADSHEET_ID', ss.getId());
    }
  }

  ensureSheets_(ss);
  return ss;
}

function ensureSheets_(ss) {
  ensureSheet_(ss, CONFIG.sheetNames.registrants,
    ['Registered At', 'Name', 'Community', 'Email', 'Last Seen', 'Steps Completed',
     'Total Steps', 'Overall %', 'Current Step', 'Status']);

  ensureSheet_(ss, CONFIG.sheetNames.progress,
    ['Email', 'Item ID', 'Status', 'Reflection / Evidence', 'Updated At']);

  ensureSheet_(ss, CONFIG.sheetNames.activity,
    ['Timestamp', 'Email', 'Name', 'Action', 'Item ID', 'Detail']);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    writeHeader_(sheet, headers);
    return sheet;
  }

  var width = Math.max(headers.length, sheet.getLastColumn(), 1);
  var firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (toText_(firstRow[i]) !== headers[i]) {
      writeHeader_(sheet, headers);
      break;
    }
  }
  return sheet;
}

function writeHeader_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function findRegistrant_(sheet, email) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (normalizeEmail_(values[i][3]) === email) {
      return { row: i + 1, record: values[i] };
    }
  }
  return null;
}

function readProgressMap_(email) {
  var ss = getDataSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.sheetNames.progress);
  var map = {};
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (normalizeEmail_(values[i][0]) !== email) continue;
    var itemId = toText_(values[i][1]);
    if (!itemId) continue;
    map[itemId] = {
      status: toText_(values[i][2]),
      note: toText_(values[i][3]),
      updatedAt: toText_(values[i][4])
    };
  }
  return map;
}

function upsertProgress_(email, itemId, status, note) {
  var ss = getDataSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.sheetNames.progress);
  var values = sheet.getDataRange().getValues();
  var now = nowText_();

  for (var i = 1; i < values.length; i++) {
    if (normalizeEmail_(values[i][0]) === email && toText_(values[i][1]) === itemId) {
      sheet.getRange(i + 1, 3, 1, 3).setValues([[status, note || '', now]]);
      return;
    }
  }
  sheet.appendRow([email, itemId, status, note || '', now]);
}

function deleteProgress_(email, itemId) {
  deleteProgressRows_(email, [itemId]);
}

function deleteProgressRows_(email, itemIds) {
  var ss = getDataSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.sheetNames.progress);
  var values = sheet.getDataRange().getValues();
  var lookup = {};
  for (var k = 0; k < itemIds.length; k++) lookup[itemIds[k]] = true;

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (normalizeEmail_(values[i][0]) !== email) continue;
    if (lookup[toText_(values[i][1])]) rows.push(i + 1);
  }
  for (var r = rows.length - 1; r >= 0; r--) {
    sheet.deleteRow(rows[r]);
  }
}

function refreshRegistrantSummary_(sheet, email, progress) {
  var found = findRegistrant_(sheet, email);
  if (!found) return;

  var summary = summarise_(progress);
  sheet.getRange(found.row, 5).setValue(nowText_());
  sheet.getRange(found.row, 6, 1, 5).setValues([[
    summary.stepsCompleted,
    summary.totalSteps,
    summary.percent,
    summary.currentStepLabel || 'All steps complete',
    summary.finished ? 'Completed' : (summary.stepsCompleted ? 'In progress' : 'Not started')
  ]]);
}

function logActivity_(email, name, action, itemId, detail) {
  try {
    var ss = getDataSpreadsheet_();
    var sheet = ss.getSheetByName(CONFIG.sheetNames.activity);
    sheet.appendRow([nowText_(), email, name || '', action || '', itemId || '', detail || '']);
  } catch (err) {
    // Logging must never break the user's action.
    console.warn('Activity log failed: ' + errorText_(err));
  }
}

function listCommunities_() {
  if (CONFIG.communities && CONFIG.communities.length) return CONFIG.communities;

  var ss = getDataSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.sheetNames.registrants);
  var values = sheet.getDataRange().getValues();
  var seen = {};
  var list = [];

  for (var i = 1; i < values.length; i++) {
    var community = toText_(values[i][2]);
    var key = community.toLowerCase();
    if (community && !seen[key]) {
      seen[key] = true;
      list.push(community);
    }
  }
  list.sort();
  return list;
}

function loadUserContext_(email) {
  if (!isEmail_(email)) {
    return { error: { ok: false, error: 'Please register with a valid email address first.' } };
  }
  var ss = getDataSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.sheetNames.registrants);
  var found = findRegistrant_(sheet, email);
  if (!found) {
    return { error: { ok: false, error: 'not_registered', email: email } };
  }
  return {
    sheet: sheet,
    user: {
      email: email,
      name: toText_(found.record[1]),
      community: toText_(found.record[2]),
      registeredAt: toText_(found.record[0]),
      isNew: false
    },
    progress: readProgressMap_(email)
  };
}

/* ===========================================================================
 * Small utilities
 * ======================================================================== */

function publicConfig_() {
  return {
    appTitle: CONFIG.appTitle,
    orgName: CONFIG.orgName,
    shortName: CONFIG.shortName,
    version: CONFIG.version,
    brandColor: CONFIG.brandColor,
    enforceSequence: CONFIG.enforceSequence,
    requireStepReflection: CONFIG.requireStepReflection,
    minReflectionLength: CONFIG.minReflectionLength,
    communities: CONFIG.communities,
    leaderContact: CONFIG.leaderContact
  };
}

function jsonForScript_(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function cleanText_(value, maxLength) {
  var text = toText_(value).replace(/\s+/g, ' ').trim();
  return text.substring(0, maxLength || 200);
}

function cleanMultiline_(value, maxLength) {
  var text = toText_(value).replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  return text.substring(0, maxLength || 2000);
}

function normalizeEmail_(value) {
  return toText_(value).replace(/\s+/g, '').toLowerCase();
}

function toText_(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return nowTextFor_(value);
  return String(value);
}

function isEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function nowText_() {
  return nowTextFor_(new Date());
}

function nowTextFor_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function errorText_(err) {
  if (!err) return 'Something went wrong.';
  var message = err.message ? String(err.message) : String(err);
  return message.replace(/^Exception:\s*/, '');
}
