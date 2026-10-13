/* ===========================================================================
 * tools/fake-apps-script.js
 *
 * A minimal in-memory stand-in for the Apps Script services used by Code.gs
 * (SpreadsheetApp, PropertiesService, LockService, Utilities, Session, Logger).
 * It lets tools/server-logic-test.js run the real backend code in a browser so
 * the validation rules can be tested without deploying.
 *
 * Only the surface Code.gs touches is implemented — this is a test double, not
 * a Spreadsheet emulator.
 * ======================================================================== */
(function (global) {
  'use strict';

  function pad2(value) { return (value < 10 ? '0' : '') + value; }

  function Sheet(name) {
    this.name = name;
    this.grid = [];
    this.frozen = 0;
  }

  Sheet.prototype.getName = function () { return this.name; };

  Sheet.prototype.width = function () {
    var width = 0;
    for (var i = 0; i < this.grid.length; i++) {
      if (this.grid[i].length > width) width = this.grid[i].length;
    }
    return width;
  };

  Sheet.prototype.grow = function (row, col) {
    while (this.grid.length < row) this.grid.push([]);
    for (var r = 0; r < row; r++) {
      var line = this.grid[r];
      while (line.length < col) line.push('');
    }
  };

  Sheet.prototype.getRange = function (row, col, numRows, numCols) {
    return new Range(this, row, col, numRows || 1, numCols || 1);
  };

  Sheet.prototype.getDataRange = function () {
    return this.getRange(1, 1, Math.max(this.grid.length, 1), Math.max(this.width(), 1));
  };

  Sheet.prototype.getLastColumn = function () { return this.width(); };

  Sheet.prototype.appendRow = function (values) { this.grid.push(values.slice()); };

  Sheet.prototype.deleteRow = function (rowIndex) { this.grid.splice(rowIndex - 1, 1); };

  Sheet.prototype.setFrozenRows = function (count) { this.frozen = count; };

  function Range(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  Range.prototype.getValues = function () {
    this.sheet.grow(this.row + this.numRows - 1, this.col + this.numCols - 1);
    var out = [];
    for (var r = 0; r < this.numRows; r++) {
      var line = [];
      for (var c = 0; c < this.numCols; c++) {
        var value = this.sheet.grid[this.row - 1 + r][this.col - 1 + c];
        line.push(value === undefined ? '' : value);
      }
      out.push(line);
    }
    return out;
  };

  Range.prototype.setValues = function (matrix) {
    this.sheet.grow(this.row + matrix.length - 1, this.col + matrix[0].length - 1);
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[r].length; c++) {
        this.sheet.grid[this.row - 1 + r][this.col - 1 + c] = matrix[r][c];
      }
    }
    return this;
  };

  Range.prototype.getValue = function () { return this.getValues()[0][0]; };

  Range.prototype.setValue = function (value) { return this.setValues([[value]]); };

  Range.prototype.setFontWeight = function () { return this; };

  function Spreadsheet(id, name) {
    this.id = id;
    this.name = name;
    this.sheets = [];
  }

  Spreadsheet.prototype.getId = function () { return this.id; };

  Spreadsheet.prototype.getName = function () { return this.name; };

  Spreadsheet.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/' + this.id + '/edit'; };

  Spreadsheet.prototype.getSheetByName = function (name) {
    for (var i = 0; i < this.sheets.length; i++) {
      if (this.sheets[i].getName() === name) return this.sheets[i];
    }
    return null;
  };

  Spreadsheet.prototype.insertSheet = function (name) {
    var sheet = new Sheet(name);
    this.sheets.push(sheet);
    return sheet;
  };

  var created = [];
  var byId = {};
  var scriptProperties = {};

  global.SpreadsheetApp = {
    create: function (name) {
      var ss = new Spreadsheet('fake-spreadsheet-' + (created.length + 1), name);
      created.push(ss);
      byId[ss.getId()] = ss;
      global.__createdSpreadsheets = created;
      return ss;
    },
    openById: function (id) {
      if (!byId[id]) throw new Error('Spreadsheet not found: ' + id);
      return byId[id];
    },
    getActiveSpreadsheet: function () { return null; }
  };

  global.PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (key) {
          return Object.prototype.hasOwnProperty.call(scriptProperties, key) ? scriptProperties[key] : null;
        },
        setProperty: function (key, value) { scriptProperties[key] = String(value); },
        deleteProperty: function (key) { delete scriptProperties[key]; }
      };
    }
  };

  global.LockService = {
    getScriptLock: function () {
      return { waitLock: function () { return true; }, releaseLock: function () { return true; } };
    }
  };

  global.Utilities = {
    formatDate: function (date, timeZone, format) {
      var text = String(format);
      text = text.replace('yyyy', String(date.getFullYear()));
      text = text.replace('MM', pad2(date.getMonth() + 1));
      text = text.replace('dd', pad2(date.getDate()));
      text = text.replace('HH', pad2(date.getHours()));
      text = text.replace('mm', pad2(date.getMinutes()));
      return text;
    }
  };

  global.Session = {
    getScriptTimeZone: function () { return 'Asia/Manila'; }
  };

  global.Logger = {
    log: function () {
      global.__log = global.__log || [];
      global.__log.push(Array.prototype.slice.call(arguments).join(' '));
    }
  };

  /* Handy for the tests. */
  global.__fake = {
    reset: function () {
      created.length = 0;
      Object.keys(byId).forEach(function (key) { delete byId[key]; });
      Object.keys(scriptProperties).forEach(function (key) { delete scriptProperties[key]; });
      global.__log = [];
    },
    spreadsheet: function () { return created[created.length - 1]; },
    scriptProperties: scriptProperties
  };
})(typeof window !== 'undefined' ? window : this);
