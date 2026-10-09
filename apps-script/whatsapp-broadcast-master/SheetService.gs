/**
 * Spreadsheet bootstrap, batch reads/writes, professional formatting.
 */

var SheetService = (function () {
  function ss() {
    var active = SpreadsheetApp.getActive();
    if (active) return active;
    throw new Error('Open this project from a Google Sheet to continue.');
  }

  function ensureWorkbook() {
    ensureSheet(SHEET_NAMES.DASHBOARD, ['WhatsApp Broadcast Master']);
    ensureSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Notes']);
    ensureSheet(SHEET_NAMES.CONTACTS, CONTACT_HEADERS);
    ensureSheet(SHEET_NAMES.CAMPAIGNS, CAMPAIGN_HEADERS);
    ensureSheet(SHEET_NAMES.QUEUE, QUEUE_HEADERS);
    ensureSheet(SHEET_NAMES.LOGS, LOG_HEADERS);
    ensureSheet(SHEET_NAMES.TEMPLATES, TEMPLATE_HEADERS);
    ensureSheet(SHEET_NAMES.HELP, ['Topic', 'Details']);
    formatContacts_();
    formatTab_(SHEET_NAMES.CAMPAIGNS, CAMPAIGN_HEADERS, 22);
    formatTab_(SHEET_NAMES.QUEUE, QUEUE_HEADERS, 16);
    formatTab_(SHEET_NAMES.LOGS, LOG_HEADERS, 14);
    formatTab_(SHEET_NAMES.TEMPLATES, TEMPLATE_HEADERS, 18);
    seedSettings_();
    seedHelp_();
    DashboardService.render();
    return { ok: true };
  }

  function ensureSheet(name, headers) {
    var spreadsheet = ss();
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
    }
    if (headers && headers.length) {
      var lastCol = Math.max(sheet.getLastColumn(), headers.length);
      var existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
      var empty = !existing.join('').trim();
      if (empty) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    return sheet;
  }

  function getSheet(name) {
    return ensureSheet(name);
  }

  function headerMap(sheet) {
    var last = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, last).getDisplayValues()[0];
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var key = String(headers[i] || '').trim();
      if (key) map[key] = i;
    }
    return { headers: headers, index: map };
  }

  function readObjects(name) {
    var sheet = getSheet(name);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = { _row: r + 1 };
      var empty = true;
      for (var c = 0; c < headers.length; c++) {
        var key = String(headers[c] || '').trim();
        if (!key) continue;
        obj[key] = values[r][c];
        if (values[r][c] !== '' && values[r][c] !== null) empty = false;
      }
      if (!empty) rows.push(obj);
    }
    return rows;
  }

  function writeObjects(name, headers, rows, startRow) {
    var sheet = ensureSheet(name, headers);
    if (!rows.length) return;
    var data = rows.map(function (row) {
      return headers.map(function (header) {
        var value = row[header];
        return value === undefined || value === null ? '' : value;
      });
    });
    sheet.getRange(startRow || 2, 1, data.length, headers.length).setValues(data);
  }

  function appendObjects(name, headers, rows) {
    if (!rows.length) return;
    var sheet = ensureSheet(name, headers);
    var start = Math.max(sheet.getLastRow() + 1, 2);
    writeObjects(name, headers, rows, start);
  }

  function clearData(name) {
    var sheet = getSheet(name);
    var last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getMaxColumns()).clearContent();
  }

  function formatHeader_(sheet, columns) {
    var range = sheet.getRange(1, 1, 1, columns);
    range.setFontWeight('bold');
    range.setBackground('#0f172a');
    range.setFontColor('#ffffff');
    range.setFontFamily('Arial');
    range.setVerticalAlignment('middle');
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 32);
    try {
      sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), columns).createFilter();
    } catch (error) {
      // Filter may already exist.
    }
  }

  function formatTab_(name, headers, width) {
    var sheet = ensureSheet(name, headers);
    formatHeader_(sheet, headers.length);
    sheet.setColumnWidths(1, headers.length, width * 7);
    if (name === SHEET_NAMES.QUEUE || name === SHEET_NAMES.CAMPAIGNS) {
      applyStatusFormatting_(sheet, headers.indexOf('Status') + 1);
    }
  }

  function formatContacts_() {
    var sheet = ensureSheet(SHEET_NAMES.CONTACTS, CONTACT_HEADERS);
    formatHeader_(sheet, CONTACT_HEADERS.length);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 140);
    sheet.setColumnWidth(5, 140);
    sheet.setColumnWidth(6, 140);
    sheet.setColumnWidth(7, 180);
    sheet.setColumnWidth(8, 120);
    sheet.setColumnWidth(9, 180);
    sheet.setColumnWidth(10, 260);
    sheet.setColumnWidth(11, 160);
    applyStatusFormatting_(sheet, CONTACT_HEADERS.indexOf('Status') + 1);
  }

  function applyStatusFormatting_(sheet, column) {
    if (column < 1) return;
    var range = sheet.getRange(2, column, sheet.getMaxRows() - 1, 1);
    var rules = sheet.getConditionalFormatRules() || [];
    var kept = rules.filter(function (rule) {
      return true;
    });
    var colors = [
      { text: 'SENT', bg: '#dcfce7', fg: '#166534' },
      { text: 'DELIVERED', bg: '#dbeafe', fg: '#1d4ed8' },
      { text: 'FAILED', bg: '#fee2e2', fg: '#b91c1c' },
      { text: 'PENDING', bg: '#fef3c7', fg: '#92400e' },
      { text: 'RETRY', bg: '#ffedd5', fg: '#9a3412' },
      { text: 'PROCESSING', bg: '#e0e7ff', fg: '#3730a3' },
      { text: 'RUNNING', bg: '#dbeafe', fg: '#1d4ed8' },
      { text: 'PAUSED', bg: '#e2e8f0', fg: '#334155' },
      { text: 'COMPLETED', bg: '#dcfce7', fg: '#166534' },
      { text: 'VALID', bg: '#dcfce7', fg: '#166534' },
      { text: 'INVALID', bg: '#fee2e2', fg: '#b91c1c' },
      { text: 'DUPLICATE', bg: '#fce7f3', fg: '#9d174d' },
      { text: 'SKIPPED', bg: '#f1f5f9', fg: '#475569' }
    ];
    var next = [];
    for (var i = 0; i < colors.length; i++) {
      next.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo(colors[i].text)
          .setBackground(colors[i].bg)
          .setFontColor(colors[i].fg)
          .setRanges([range])
          .build()
      );
    }
    sheet.setConditionalFormatRules(next.concat(kept).slice(0, 20));
  }

  function seedSettings_() {
    var sheet = ensureSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Notes']);
    if (sheet.getLastRow() > 1) {
      refreshSettingsView();
      return;
    }
    var rows = [
      ['API Base URL', DEFAULTS.API_BASE_URL, 'Do not change unless Sheetomatic support asks you to.'],
      ['Phone ID', '', 'Active Cloud Phone ID from wa.sheetomatic.com → Connected Accounts.'],
      ['Default Country Code', DEFAULTS.DEFAULT_COUNTRY, 'Used when a number has no country code. India = 91.'],
      ['Batch Size', String(DEFAULTS.BATCH_SIZE), 'Messages processed per Apps Script run. Keep 10–40.'],
      ['Delay (ms)', String(DEFAULTS.DELAY_MS), 'Pause between batches to respect API limits.'],
      ['Parallel Requests', String(DEFAULTS.PARALLEL), 'How many sends to fire together. Keep 4–10.'],
      ['Max Retries', String(DEFAULTS.MAX_RETRIES), 'Retries for timeouts and rate limits only.'],
      ['Operation Mode', 'MOCK', 'MOCK never sends real WhatsApp messages. PRODUCTION sends live.'],
      ['API Key', 'Set in the app (not stored in this sheet)', 'Secrets are stored in Script Properties, not cells.'],
      ['Last Connection Test', '', 'Updated automatically.'],
      ['Account Status', '', 'Updated automatically.'],
      ['Wallet Balance', '', 'Updated automatically from wa.sheetomatic.com.']
    ];
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    formatHeader_(sheet, 3);
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 360);
    sheet.setColumnWidth(3, 420);
    sheet.getRange('A2:A13').setFontWeight('bold');
  }

  function refreshSettingsView() {
    var sheet = ensureSheet(SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Notes']);
    upsertSetting_(sheet, 'API Base URL', getApiBaseUrl_());
    upsertSetting_(sheet, 'Phone ID', configGet_(CONFIG_KEYS.PHONE_ID, ''));
    upsertSetting_(sheet, 'Default Country Code', getDefaultCountryCode_());
    upsertSetting_(sheet, 'Batch Size', String(getBatchSize_()));
    upsertSetting_(sheet, 'Delay (ms)', String(getDelayMs_()));
    upsertSetting_(sheet, 'Parallel Requests', String(getParallel_()));
    upsertSetting_(sheet, 'Max Retries', String(getMaxRetries_()));
    upsertSetting_(sheet, 'Operation Mode', getOperationMode_());
    upsertSetting_(sheet, 'API Key', SheetomaticApi.isConfigured() ? 'Configured (hidden)' : 'Not configured');
    upsertSetting_(sheet, 'Last Connection Test', configGet_(CONFIG_KEYS.LAST_CONNECTION, ''));
    upsertSetting_(sheet, 'Wallet Balance', configGet_(CONFIG_KEYS.LAST_WALLET_BALANCE, ''));
  }

  function upsertSetting_(sheet, key, value) {
    var last = sheet.getLastRow();
    var keys = last < 2 ? [] : sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
    sheet.appendRow([key, value, '']);
  }

  function readSettingsSheet() {
    refreshSettingsView();
    var rows = readObjects(SHEET_NAMES.SETTINGS);
    var map = {};
    rows.forEach(function (row) {
      map[String(row.Key)] = row.Value;
    });
    return map;
  }

  function applySettingsFromSheet() {
    var map = readSettingsSheet();
    if (map['API Base URL']) configSet_(CONFIG_KEYS.API_BASE_URL, String(map['API Base URL']).trim());
    if (map['Phone ID'] !== undefined) configSet_(CONFIG_KEYS.PHONE_ID, String(map['Phone ID'] || '').trim());
    if (map['Default Country Code']) configSet_(CONFIG_KEYS.DEFAULT_COUNTRY, String(map['Default Country Code']).replace(/\D/g, ''));
    if (map['Batch Size']) configSet_(CONFIG_KEYS.BATCH_SIZE, String(map['Batch Size']));
    if (map['Delay (ms)']) configSet_(CONFIG_KEYS.DELAY_MS, String(map['Delay (ms)']));
    if (map['Parallel Requests']) configSet_(CONFIG_KEYS.PARALLEL, String(map['Parallel Requests']));
    if (map['Max Retries']) configSet_(CONFIG_KEYS.MAX_RETRIES, String(map['Max Retries']));
    if (map['Operation Mode']) {
      var mode = String(map['Operation Mode']).toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'MOCK';
      configSet_(CONFIG_KEYS.OPERATION_MODE, mode);
    }
  }

  function contactColumns() {
    var sheet = ensureSheet(SHEET_NAMES.CONTACTS, CONTACT_HEADERS);
    var meta = headerMap(sheet);
    return meta.headers.filter(function (name) {
      return String(name || '').trim();
    });
  }

  function seedHelp_() {
    var sheet = ensureSheet(SHEET_NAMES.HELP, ['Topic', 'Details']);
    if (sheet.getLastRow() > 1) return;
    var rows = HelpService.sheetRows();
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    formatHeader_(sheet, 2);
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 720);
    sheet.setRowHeights(2, rows.length, 60);
    sheet.getRange(2, 2, rows.length, 1).setWrap(true);
  }

  return {
    ss: ss,
    ensureWorkbook: ensureWorkbook,
    ensureSheet: ensureSheet,
    getSheet: getSheet,
    headerMap: headerMap,
    readObjects: readObjects,
    writeObjects: writeObjects,
    appendObjects: appendObjects,
    clearData: clearData,
    refreshSettingsView: refreshSettingsView,
    readSettingsSheet: readSettingsSheet,
    applySettingsFromSheet: applySettingsFromSheet,
    contactColumns: contactColumns
  };
})();
