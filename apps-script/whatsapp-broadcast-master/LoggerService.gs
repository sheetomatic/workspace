/**
 * Campaign / API logger. Credentials are never written.
 */

var AppLogger = (function () {
  function redact_(text) {
    var value = String(text == null ? '' : text);
    value = value.replace(/x-api-key["'\s:]*[A-Za-z0-9_\-]{8,}/gi, 'x-api-key: [redacted]');
    value = value.replace(/("apiKey"\s*:\s*")[^"]+/gi, '$1[redacted]');
    value = value.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [redacted]');
    return clampText_(value, 1500);
  }

  function append(entry) {
    try {
      var sheet = SheetService.ensureSheet(SHEET_NAMES.LOGS, LOG_HEADERS);
      sheet.appendRow([
        nowPretty_(),
        entry.campaignId || '',
        entry.recipient || '',
        entry.action || '',
        entry.endpoint || '',
        entry.httpStatus || '',
        entry.messageId || '',
        entry.status || '',
        redact_(entry.response || ''),
        redact_(entry.error || ''),
        entry.executionId || ''
      ]);
      trim_(sheet, 5000);
    } catch (error) {
      Logger.log('AppLogger.append failed: ' + error);
    }
  }

  function trim_(sheet, keep) {
    var last = sheet.getLastRow();
    if (last > keep + 1) {
      sheet.deleteRows(2, last - keep - 1);
    }
  }

  function recent(limit) {
    var sheet = SheetService.ensureSheet(SHEET_NAMES.LOGS, LOG_HEADERS);
    var last = sheet.getLastRow();
    if (last < 2) return [];
    var take = Math.min(limit || 50, last - 1);
    var start = last - take + 1;
    var values = sheet.getRange(start, 1, take, LOG_HEADERS.length).getDisplayValues();
    return values.reverse().map(function (row) {
      var item = {};
      for (var i = 0; i < LOG_HEADERS.length; i++) {
        item[LOG_HEADERS[i]] = row[i];
      }
      return item;
    });
  }

  function info(action, extra) {
    extra = extra || {};
    extra.action = action;
    extra.status = extra.status || 'INFO';
    append(extra);
  }

  function error(action, extra) {
    extra = extra || {};
    extra.action = action;
    extra.status = extra.status || 'ERROR';
    append(extra);
  }

  return {
    append: append,
    recent: recent,
    info: info,
    error: error,
    redact: redact_
  };
})();
