/**
 * RLCC Ministry Overview and Reviewer
 * ---------------------------------------------------------------------------
 * Config.gs — the settings you will most likely want to change.
 *
 * This file contains no Google Apps Script service calls, so it is safe to
 * load in any JavaScript environment (the local preview uses it too).
 * ---------------------------------------------------------------------------
 */

var CONFIG = {

  /* ------- Identity ------- */
  appTitle: 'RLCC Ministry Overview and Reviewer',
  orgName: 'Real Life Christian Communities',
  shortName: 'RLCC',
  version: '1.0.0',

  /* ------- Data storage -------
   * Leave spreadsheetId empty to let the app create (or reuse) its own
   * spreadsheet automatically. The id is remembered in Script Properties,
   * so you only have to set it by hand if you want to point the app at a
   * spreadsheet you already own.
   */
  spreadsheetId: '',

  sheetNames: {
    registrants: 'Registrants',
    progress: 'Progress',
    activity: 'Activity'
  },

  /* ------- Pathway rules ------- */
  // true  = steps unlock in order (REACH 1..3, CORE 1..3, LEAD 1..4)
  // false = every step is open at any time
  enforceSequence: true,

  // Must every step carry a written reflection before it can be completed?
  requireStepReflection: true,
  minReflectionLength: 20,

  /* ------- Registration fields -------
   * Optional shortlist for the "Community" dropdown. Leave the list empty to
   * let the app build the suggestion list from what other people already
   * typed in (free text is always allowed).
   */
  communities: [],

  /* ------- Support / accountability ------- */
  leaderContact: '',           // e.g. 'discipleship@rlcc.ph'
  brandColor: '#365233'
};
