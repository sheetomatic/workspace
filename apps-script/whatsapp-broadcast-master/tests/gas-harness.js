/**
 * In-memory Google Apps Script runtime for Node tests and the local preview.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

class FakeRange {
  constructor(sheet, r1, c1, r2, c2) {
    this.sheet = sheet;
    this.r1 = r1;
    this.c1 = c1;
    this.r2 = r2;
    this.c2 = c2;
  }
  _cells() {
    const rows = [];
    for (let r = this.r1; r <= this.r2; r++) {
      const row = [];
      for (let c = this.c1; c <= this.c2; c++) {
        if (!this.sheet.data[r]) this.sheet.data[r] = [];
        row.push(this.sheet.data[r][c] == null ? '' : this.sheet.data[r][c]);
      }
      rows.push(row);
    }
    return rows;
  }
  getValues() { return this._cells(); }
  getDisplayValues() {
    return this._cells().map((row) => row.map((v) => String(v)));
  }
  setValues(values) {
    for (let i = 0; i < values.length; i++) {
      const r = this.r1 + i;
      if (!this.sheet.data[r]) this.sheet.data[r] = [];
      for (let j = 0; j < values[i].length; j++) {
        this.sheet.data[r][this.c1 + j] = values[i][j];
      }
    }
    return this;
  }
  setValue(value) { return this.setValues([[value]]); }
  getValue() { return this._cells()[0][0]; }
  clearContent() { return this.setValues(this._cells().map((row) => row.map(() => ''))); }
  merge() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontFamily() { return this; }
  setFontSize() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }
  setHiddenGridlines() { return this; }
  createFilter() { return this; }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.data = [];
    this.charts = [];
    this.maxRows = 5000;
    this.maxCols = 30;
  }
  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      const match = a.match(/([A-Z]+)(\d+)/);
      const col = match[1].charCodeAt(0) - 64;
      const row = Number(match[2]);
      return new FakeRange(this, row, col, row, col);
    }
    const r1 = a;
    const c1 = b;
    const rows = c || 1;
    const cols = d || 1;
    return new FakeRange(this, r1, c1, r1 + rows - 1, c1 + cols - 1);
  }
  getLastRow() {
    let last = 0;
    for (let r = 1; r < this.data.length; r++) {
      if (this.data[r] && this.data[r].some((v) => v !== '' && v != null)) last = r;
    }
    return last;
  }
  getLastColumn() {
    let last = 0;
    for (let r = 1; r < this.data.length; r++) {
      const row = this.data[r] || [];
      last = Math.max(last, row.length - 1);
    }
    return last;
  }
  getMaxColumns() { return this.maxCols; }
  getMaxRows() { return this.maxRows; }
  appendRow(row) {
    const r = Math.max(this.getLastRow() + 1, 2);
    if (!this.data[r]) this.data[r] = [];
    row.forEach((v, i) => { this.data[r][i + 1] = v; });
  }
  clear() { this.data = []; this.charts = []; }
  setFrozenRows() {}
  setRowHeight() {}
  setRowHeights() {}
  setColumnWidth() {}
  setColumnWidths() {}
  setHiddenGridlines() {}
  getConditionalFormatRules() { return []; }
  setConditionalFormatRules() {}
  deleteRows(start, n) {
    this.data.splice(start, n);
  }
  insertSheet() { return this; }
  getCharts() { return this.charts.slice(); }
  removeChart() {}
  newChart() {
    const self = this;
    const builder = {
      setChartType() { return builder; },
      addRange() { return builder; },
      setOption() { return builder; },
      setPosition() { return builder; },
      build() { return { id: 'chart' }; }
    };
    return builder;
  }
  insertChart(chart) { this.charts.push(chart); }
}

class FakeLock {
  constructor() { this.locked = false; }
  tryLock() { this.locked = true; return true; }
  waitLock() { this.locked = true; }
  releaseLock() { this.locked = false; }
}

function createRuntime() {
  const sheets = {};
  const props = {};
  const triggers = [];
  const logs = [];

  const spreadsheet = {
    getSheetByName(name) { return sheets[name] || null; },
    insertSheet(name) {
      sheets[name] = new FakeSheet(name);
      return sheets[name];
    },
    getUi() {
      return {
        createMenu() { return this; },
        addItem() { return this; },
        addSeparator() { return this; },
        addToUi() { return this; },
        alert() { return 'OK'; },
        ButtonSet: { OK: 'OK' },
        showModelessDialog() {},
        showSidebar() {}
      };
    }
  };

  const ctx = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Error,
    parseInt,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty: (k) => (props[k] == null ? null : props[k]),
          setProperty: (k, v) => { props[k] = String(v); },
          deleteProperty: (k) => { delete props[k]; }
        };
      }
    },
    SpreadsheetApp: {
      getActive: () => spreadsheet,
      getUi: () => spreadsheet.getUi(),
      newConditionalFormatRule() {
        const builder = {
          whenTextEqualTo() { return builder; },
          setBackground() { return builder; },
          setFontColor() { return builder; },
          setRanges() { return builder; },
          build() { return {}; }
        };
        return builder;
      }
    },
    Session: {
      getScriptTimeZone: () => 'Asia/Kolkata',
      getTemporaryActiveUserKey: () => 'test-user'
    },
    Utilities: {
      formatDate(date) {
        const d = new Date(date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      },
      getUuid: () => crypto.randomUUID()
    },
    LockService: { getScriptLock: () => new FakeLock() },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => {
        const i = triggers.indexOf(t);
        if (i >= 0) triggers.splice(i, 1);
      },
      newTrigger(handler) {
        return {
          timeBased() { return this; },
          after() { return this; },
          create() { triggers.push({ getHandlerFunction: () => handler }); }
        };
      }
    },
    UrlFetchApp: {
      fetch() { throw new Error('Live HTTP is disabled in tests.'); },
      fetchAll() { throw new Error('Live HTTP is disabled in tests.'); }
    },
    HtmlService: {
      createTemplateFromFile() {
        return { initialPage: 'home', evaluate() { return { setWidth() { return this; }, setHeight() { return this; }, setTitle() { return this; } }; } };
      },
      createHtmlOutputFromFile() { return { getContent: () => '' }; }
    },
    DriveApp: {
      getFileById() { throw new Error('File not found'); }
    },
    Logger: { log: (m) => logs.push(String(m)) },
    Charts: { ChartType: { PIE: 'PIE' } },
    UtilitiesSleepMs: 0
  };

  ctx.Utilities.sleep = () => {};

  const sandbox = vm.createContext(ctx);
  const root = path.join(__dirname, '..');
  const files = [
    'Config.gs',
    'PhoneService.gs',
    'MockApi.gs',
    'SheetomaticApi.gs',
    'HelpService.gs',
    'SheetService.gs',
    'LoggerService.gs',
    'AttachmentService.gs',
    'TemplateService.gs',
    'ValidationService.gs',
    'TriggerService.gs',
    'QueueService.gs',
    'CampaignService.gs',
    'DashboardService.gs',
    'DemoService.gs',
    'UiBridge.gs',
    'Code.gs'
  ];
  for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  vm.runInContext('configSet_(CONFIG_KEYS.OPERATION_MODE, "MOCK"); SheetService.ensureWorkbook();', sandbox);
  sandbox.__props = props;
  sandbox.__sheets = sheets;
  sandbox.__triggers = triggers;
  sandbox.__logs = logs;
  return sandbox;
}

module.exports = { createRuntime };
