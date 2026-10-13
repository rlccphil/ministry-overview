/* ===========================================================================
 * tools/server-logic-test.js
 *
 * Exercises the real Code.gs against the in-memory Apps Script double in
 * tools/fake-apps-script.js: registration, the sequence gate, sub-step gating,
 * reflection rules, completion, reopening, and the accountability sheets.
 *
 * Run through tools/server-logic-test.ps1.
 * ======================================================================== */
(function () {
  'use strict';

  var log = [];
  var failures = 0;

  function check(label, condition, extra) {
    if (condition) { log.push('PASS  ' + label); }
    else { failures++; log.push('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); }
  }

  function note(label, value) { log.push('      ' + label + ': ' + value); }

  function report() {
    log.push(failures === 0 ? 'RESULT: all checks passed' : 'RESULT: ' + failures + ' check(s) failed');
    var pre = document.createElement('pre');
    pre.id = 'servertest';
    pre.textContent = '===SERVERTEST===\n' + log.join('\n') + '\n===END===';
    document.body.appendChild(pre);
  }

  function sheetValues(name) {
    var ss = __fake.spreadsheet();
    var sheet = ss.getSheetByName(name);
    return sheet ? sheet.getDataRange().getValues() : [];
  }

  function progressRow(email, itemId) {
    var values = sheetValues('Progress');
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === email && values[i][1] === itemId) return values[i];
    }
    return null;
  }

  function activityActions() {
    return sheetValues('Activity').slice(1).map(function (row) { return String(row[3]); });
  }

  function run() {
    var email = 'leader@example.com';
    var goodNote = 'I prayed for three names on my H.I.T. List and served one of them this week.';

    /* ---------------- content ---------------- */
    var index = curriculumIndex_();
    check('curriculum has ten steps', index.steps.length === 10, 'found ' + index.steps.length);
    check('curriculum has forty-five sub-steps', index.substeps.length === 45, 'found ' + index.substeps.length);
    check('every area has steps', CURRICULUM.areas.every(function (area) { return area.steps.length > 0; }));

    /* ---------------- setup ---------------- */
    var url = setup();
    check('setup creates a data spreadsheet', typeof url === 'string' && url.indexOf('https://') === 0, String(url));
    var ss = __fake.spreadsheet();
    check('setup creates the three tabs',
      !!ss.getSheetByName('Registrants') && !!ss.getSheetByName('Progress') && !!ss.getSheetByName('Activity'));

    var headers = sheetValues('Registrants')[0].join('|');
    check('registrant headers are written',
      headers === 'Registered At|Name|Community|Email|Last Seen|Steps Completed|Total Steps|Overall %|Current Step|Status',
      headers);
    check('progress headers are written',
      sheetValues('Progress')[0].join('|') === 'Email|Item ID|Status|Reflection / Evidence|Updated At',
      sheetValues('Progress')[0].join('|'));

    /* ---------------- registration ---------------- */
    var bad = registerUser({ name: 'A', community: '', email: 'nope' });
    check('registration rejects a short name', bad.ok === false, JSON.stringify(bad));
    var badEmail = registerUser({ name: 'Test Leader', community: 'RLCC Test', email: 'nope@' });
    check('registration rejects an invalid email', badEmail.ok === false, JSON.stringify(badEmail));

    var first = registerUser({ name: 'Test Leader', community: 'RLCC Smoke Test', email: ' Leader@Example.com ' });
    check('registration succeeds and normalises the email',
      first.ok === true && first.user.email === email && first.user.isNew === true, JSON.stringify(first));

    var rows = sheetValues('Registrants');
    check('one registrant row exists', rows.length === 2, 'rows: ' + rows.length);
    check('the registrant row carries ten columns', rows[1].length === 10,
      'columns: ' + rows[1].length + ' -> ' + rows[1].join('|'));

    var again = registerUser({ name: 'Test Leader', community: 'RLCC Ortigas', email: email });
    check('registering again does not create a second row',
      again.ok === true && again.user.isNew === false && sheetValues('Registrants').length === 2);
    check('registering again refreshes name and community',
      sheetValues('Registrants')[1][1] === 'Test Leader' && sheetValues('Registrants')[1][2] === 'RLCC Ortigas');
    check('community suggestions include the typed value',
      again.communities.indexOf('RLCC Ortigas') !== -1, JSON.stringify(again.communities));

    var unknown = getState('nobody@example.com');
    check('an unregistered email is reported as not_registered',
      unknown.ok === false && unknown.error === 'not_registered');

    /* ---------------- sequence gate ---------------- */
    var lockedToggle = toggleSubstep({ email: email, stepId: 'core-1', substepId: 'core-1-C', done: true });
    check('a sub-step of a locked step is refused', lockedToggle.ok === false, JSON.stringify(lockedToggle));

    var lockedComplete = completeStep({ email: email, stepId: 'lead-1', note: goodNote });
    check('a locked step cannot be completed', lockedComplete.ok === false, JSON.stringify(lockedComplete));

    var earlyComplete = completeStep({ email: email, stepId: 'reach-1', note: goodNote });
    check('a step with unapplied sub-steps cannot be completed', earlyComplete.ok === false,
      JSON.stringify(earlyComplete));
    check('the refusal names what is still open',
      earlyComplete.error.indexOf('G — Generate connections') !== -1, earlyComplete.error);

    var unknownItem = toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-Z', done: true });
    check('an unknown sub-step id is refused', unknownItem.ok === false, JSON.stringify(unknownItem));

    /* ---------------- applying sub-steps ---------------- */
    var tickOne = toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-G', done: true });
    check('the first sub-step of the open step can be applied', tickOne.ok === true, JSON.stringify(tickOne));
    var tickTwo = toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-O', done: true });
    check('the second sub-step of the open step can be applied', tickTwo.ok === true);

    var shortNote = completeStep({ email: email, stepId: 'reach-1', note: 'too short' });
    check('a reflection below the minimum length is refused', shortNote.ok === false, JSON.stringify(shortNote));

    var cleared = toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-G', done: false });
    check('a sub-step can be un-applied while the step is open', cleared.ok === true);
    check('un-applying removes the progress row', progressRow(email, 'reach-1-G') === null);
    toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-G', done: true });

    var completed = completeStep({ email: email, stepId: 'reach-1', note: goodNote });
    check('the step completes once every sub-step is applied', completed.ok === true, JSON.stringify(completed));
    check('the completed step unlocks the next one', completed.unlocked === 'reach-2', String(completed.unlocked));

    var stored = progressRow(email, 'reach-1');
    check('the reflection is stored with the completed step',
      !!stored && stored[2] === 'complete' && stored[3] === goodNote, stored ? stored.join('|') : 'missing');

    var afterComplete = toggleSubstep({ email: email, stepId: 'reach-1', substepId: 'reach-1-G', done: false });
    check('a completed step refuses sub-step changes', afterComplete.ok === false, JSON.stringify(afterComplete));

    /* ---------------- summary columns ---------------- */
    var registrant = sheetValues('Registrants')[1];
    check('the roster records steps completed', String(registrant[5]) === '1', String(registrant[5]));
    check('the roster records the percentage', String(registrant[7]) === '10', String(registrant[7]));
    check('the roster records the current step',
      String(registrant[8]).indexOf('BRING Seekers to Christ') !== -1, String(registrant[8]));
    check('the roster status reads In progress', String(registrant[9]) === 'In progress', String(registrant[9]));

    /* ---------------- second step ---------------- */
    ['B', 'R', 'I', 'N', 'G'].forEach(function (letter) {
      toggleSubstep({ email: email, stepId: 'reach-2', substepId: 'reach-2-' + letter, done: true });
    });
    var second = completeStep({
      email: email, stepId: 'reach-2',
      note: 'Shared my testimony with Rico and invited him to our Circle.'
    });
    check('the second step completes after all five sub-steps', second.ok === true, JSON.stringify(second));
    check('completing the second step unlocks the third', second.unlocked === 'reach-3', String(second.unlocked));

    /* ---------------- reopening ---------------- */
    var reopened = reopenStep({ email: email, stepId: 'reach-1' });
    check('a completed step can be reopened', reopened.ok === true, JSON.stringify(reopened));
    check('reopening sends the step back to in progress',
      reopened.progress['reach-1'] && reopened.progress['reach-1'].status === 'open',
      JSON.stringify(reopened.progress['reach-1']));
    check('reopening keeps the reflection',
      reopened.progress['reach-1'].note === goodNote, JSON.stringify(reopened.progress['reach-1']));
    check('reopening keeps the applied sub-steps',
      !!reopened.progress['reach-1-G'] && reopened.progress['reach-1-G'].status === 'done');
    check('reopening also re-opens the later step',
      reopened.progress['reach-2'] && reopened.progress['reach-2'].status === 'open',
      JSON.stringify(reopened.progress['reach-2']));
    check('the roster goes back to zero steps', String(sheetValues('Registrants')[1][5]) === '0');
    check('the roster status reads Not started', String(sheetValues('Registrants')[1][9]) === 'Not started',
      String(sheetValues('Registrants')[1][9]));

    var reopenNotComplete = reopenStep({ email: email, stepId: 'core-1' });
    check('an incomplete step cannot be reopened', reopenNotComplete.ok === false, JSON.stringify(reopenNotComplete));

    /* ---------------- audit trail ---------------- */
    var actions = activityActions();
    check('the activity log records registrations', actions.indexOf('register') !== -1, actions.join(', '));
    check('the activity log records applied sub-steps', actions.indexOf('sub-step done') !== -1);
    check('the activity log records completions', actions.indexOf('step complete') !== -1);
    check('the activity log records reopenings', actions.indexOf('step reopened') !== -1);

    /* ---------------- edge cases ---------------- */
    var noEmail = getState('');
    check('an empty email is refused', noEmail.ok === false, JSON.stringify(noEmail));

    var unknownUser = toggleSubstep({
      email: 'ghost@example.com', stepId: 'reach-1', substepId: 'reach-1-G', done: true
    });
    check('an unregistered email cannot write progress', unknownUser.ok === false, JSON.stringify(unknownUser));

    var bootstrap = getBootstrap();
    check('getBootstrap returns the curriculum and settings',
      bootstrap.ok === true && !!bootstrap.curriculum && !!bootstrap.config);

    note('steps in curriculum', index.steps.length);
    note('sub-steps in curriculum', index.substeps.length);
    note('activity entries', actions.length);
  }

  try {
    __fake.reset();
    run();
  } catch (err) {
    failures++;
    log.push('FAIL  the run aborted: ' + (err && err.message ? err.message : String(err)));
    if (err && err.stack) log.push(String(err.stack).split('\n').slice(0, 4).join('\n'));
  }
  report();
})();
