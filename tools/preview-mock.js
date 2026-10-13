/* ===========================================================================
 * tools/preview-mock.js
 *
 * A browser-only stand-in for Code.gs so the interface can be reviewed before
 * it is deployed to Google Apps Script. It mirrors the server API
 * (getBootstrap / registerUser / getState / toggleSubstep / completeStep /
 * reopenStep) and keeps everything in localStorage.
 *
 * This file is never pushed to Apps Script and is not part of the web app.
 * ======================================================================== */
(function () {
  'use strict';

  var KEY = 'rlcc.mor.preview.v1';
  var LATENCY = 180;
  var cache = null;

  function blank() { return { registrants: {}, progress: {} }; }

  function load() {
    if (cache) return cache;
    try {
      var raw = window.localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : blank();
    } catch (err) {
      cache = blank();
    }
    return cache;
  }

  function save(db) {
    cache = db;
    try { window.localStorage.setItem(KEY, JSON.stringify(db)); } catch (err) { /* memory only */ }
  }

  function nowText() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function normalizeEmail(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); }
  function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
  function config() { return (window.__BOOTSTRAP__ && window.__BOOTSTRAP__.config) || {}; }

  function pathway() {
    var curriculum = (window.__BOOTSTRAP__ && window.__BOOTSTRAP__.curriculum) || { areas: [] };
    var p = { steps: [], stepById: {}, totalSteps: 0 };
    var order = 0;
    (curriculum.areas || []).forEach(function (area) {
      (area.steps || []).forEach(function (raw) {
        var step = {
          id: raw.id, title: raw.title, areaCode: area.code,
          globalOrder: order++,
          substeps: (raw.substeps || []).map(function (sub) {
            return { id: sub.id, letter: sub.letter };
          })
        };
        p.steps.push(step);
        p.stepById[step.id] = step;
      });
    });
    p.totalSteps = p.steps.length;
    return p;
  }

  function stateOf(progress, stepId) {
    var previousComplete = true;
    var enforce = config().enforceSequence !== false;
    var states = pathway().steps.map(function (step) {
      var record = progress[step.id];
      var complete = !!(record && record.status === 'complete');
      var unlocked = step.globalOrder === 0 || previousComplete || !enforce;
      var state = complete ? 'complete' : (unlocked ? 'open' : 'locked');
      previousComplete = complete;
      return { id: step.id, state: state };
    });
    for (var i = 0; i < states.length; i++) if (states[i].id === stepId) return states[i].state;
    return 'locked';
  }

  function communitiesOf(db) {
    var seen = {}, out = [];
    Object.keys(db.registrants).forEach(function (email) {
      var community = db.registrants[email].community;
      if (community && !seen[community.toLowerCase()]) {
        seen[community.toLowerCase()] = true;
        out.push(community);
      }
    });
    return out.sort();
  }

  function respond(fn) {
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(fn()); }, LATENCY);
    });
  }

  var handlers = {

    getBootstrap: function () {
      return respond(function () {
        var bootstrap = window.__BOOTSTRAP__ || {};
        return {
          ok: true,
          curriculum: bootstrap.curriculum,
          config: bootstrap.config,
          communities: communitiesOf(load())
        };
      });
    },

    registerUser: function (payload) {
      return respond(function () {
        payload = payload || {};
        var name = String(payload.name || '').trim();
        var community = String(payload.community || '').trim();
        var email = normalizeEmail(payload.email);

        if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
        if (community.length < 2) return { ok: false, error: 'Please enter your community.' };
        if (!isEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };

        var db = load();
        var existing = db.registrants[email];
        var user = {
          email: email, name: name, community: community,
          registeredAt: existing ? existing.registeredAt : nowText(),
          isNew: !existing
        };
        db.registrants[email] = user;
        if (!db.progress[email]) db.progress[email] = {};
        save(db);

        return { ok: true, user: user, progress: db.progress[email], communities: communitiesOf(db) };
      });
    },

    getState: function (email) {
      return respond(function () {
        var clean = normalizeEmail(email);
        var db = load();
        var user = db.registrants[clean];
        if (!user) return { ok: false, error: 'not_registered', email: clean };
        return { ok: true, user: user, progress: db.progress[clean] || {} };
      });
    },

    toggleSubstep: function (payload) {
      return respond(function () {
        payload = payload || {};
        var email = normalizeEmail(payload.email);
        var db = load();
        var user = db.registrants[email];
        if (!user) return { ok: false, error: 'not_registered', email: email };

        var step = pathway().stepById[payload.stepId];
        if (!step) return { ok: false, error: 'Unknown step.' };

        var state = stateOf(db.progress[email], payload.stepId);
        if (state === 'complete') return { ok: false, error: 'This step is already complete. Reopen it to make changes.' };
        if (state === 'locked') return { ok: false, error: 'Complete the previous step first.' };

        var progress = db.progress[email];
        if (payload.done) {
          progress[payload.substepId] = { status: 'done', note: '', updatedAt: nowText() };
        } else {
          delete progress[payload.substepId];
        }
        save(db);
        return { ok: true, user: user, progress: progress };
      });
    },

    completeStep: function (payload) {
      return respond(function () {
        payload = payload || {};
        var email = normalizeEmail(payload.email);
        var db = load();
        var user = db.registrants[email];
        if (!user) return { ok: false, error: 'not_registered', email: email };

        var step = pathway().stepById[payload.stepId];
        if (!step) return { ok: false, error: 'Unknown step.' };

        var state = stateOf(db.progress[email], payload.stepId);
        if (state === 'complete') return { ok: false, error: 'This step is already complete.' };
        if (state === 'locked') return { ok: false, error: 'Complete the previous step before this one.' };

        var progress = db.progress[email];
        var missing = step.substeps.filter(function (sub) {
          var record = progress[sub.id];
          return !(record && record.status === 'done');
        }).map(function (sub) { return sub.letter; });

        if (missing.length) {
          return {
            ok: false,
            error: 'Apply every sub-step before completing this step. Still open: ' + missing.join(', ') + '.'
          };
        }

        var note = String(payload.note || '').trim();
        var min = config().requireStepReflection ? (config().minReflectionLength || 0) : 0;
        if (note.length < min) {
          return { ok: false, error: 'Please write your reflection (at least ' + min + ' characters).' };
        }

        progress[payload.stepId] = { status: 'complete', note: note, updatedAt: nowText() };
        save(db);
        return { ok: true, user: user, progress: progress };
      });
    },

    reopenStep: function (payload) {
      return respond(function () {
        payload = payload || {};
        var email = normalizeEmail(payload.email);
        var db = load();
        var user = db.registrants[email];
        if (!user) return { ok: false, error: 'not_registered', email: email };

        var steps = pathway().steps;
        var target = pathway().stepById[payload.stepId];
        if (!target) return { ok: false, error: 'Unknown step.' };

        var progress = db.progress[email];
        var record = progress[payload.stepId];
        if (!record || record.status !== 'complete') {
          return { ok: false, error: 'That step is not complete yet.' };
        }

        for (var i = target.globalOrder; i < steps.length; i++) {
          var later = steps[i];
          var laterRecord = progress[later.id];
          if (laterRecord && laterRecord.status === 'complete') {
            progress[later.id] = { status: 'open', note: laterRecord.note || '', updatedAt: nowText() };
          }
        }
        save(db);
        return { ok: true, user: user, progress: progress };
      });
    },

    setup: function () { return respond(function () { return { ok: true }; }); }
  };

  window.RLCC_PREVIEW = {
    call: function (name, args) {
      var handler = handlers[name];
      if (!handler) {
        return Promise.resolve({ ok: false, error: 'The preview does not implement "' + name + '".' });
      }
      return handler.apply(null, args || []).then(function (result) {
        return result === undefined ? { ok: true } : result;
      });
    }
  };
})();
