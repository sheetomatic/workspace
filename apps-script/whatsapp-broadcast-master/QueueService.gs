/**
 * Resumable 10,000-recipient queue + batch processor.
 * One Apps Script execution never tries to send the full campaign.
 */

var QueueService = (function () {
  function enqueue(campaign, classified, contacts, draft, template, media) {
    var existing = existingKeys_(campaign['Campaign ID']);
    var rows = [];
    var mapping = draft.mapping || {};
    classified.valid.forEach(function (item) {
      var contact = contacts[item.rowNumber - 2];
      var key = idempotencyKey_(campaign['Campaign ID'], item.e164, item.rowNumber);
      if (existing[key]) return;
      var variables = {};
      (template.variables || []).forEach(function (name) {
        var column = mapping[name];
        variables[name] = column && contact ? contact[column] : '';
      });
      var attachment = '';
      if (media) {
        attachment = media.link;
      } else if (contact && contact.Attachment) {
        attachment = contact.Attachment;
      }
      rows.push({
        'Queue ID': newId_('Q'),
        'Campaign ID': campaign['Campaign ID'],
        'Row Number': item.rowNumber,
        Phone: item.e164,
        Template: template.name,
        Variables: safeJson_(variables),
        Attachment: attachment,
        Status: QUEUE_STATUS.PENDING,
        Attempts: 0,
        'Message ID': '',
        'API Response': '',
        Error: '',
        'Idempotency Key': key,
        'Execution ID': '',
        'Created At': nowPretty_(),
        'Processed At': ''
      });
    });

    var CHUNK = 500;
    for (var i = 0; i < rows.length; i += CHUNK) {
      SheetService.appendObjects(SHEET_NAMES.QUEUE, QUEUE_HEADERS, rows.slice(i, i + CHUNK));
    }
    return rows.length;
  }

  function existingKeys_(campaignId) {
    var map = {};
    SheetService.readObjects(SHEET_NAMES.QUEUE).forEach(function (row) {
      if (String(row['Campaign ID']) === String(campaignId) && row['Idempotency Key']) {
        map[row['Idempotency Key']] = true;
      }
    });
    return map;
  }

  function idempotencyKey_(campaignId, phone, rowNumber) {
    return [campaignId, phone, rowNumber].join(':');
  }

  function stats(campaignId) {
    var rows = SheetService.readObjects(SHEET_NAMES.QUEUE).filter(function (row) {
      return !campaignId || String(row['Campaign ID']) === String(campaignId);
    });
    var out = {
      total: rows.length,
      pending: 0,
      processing: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      retry: 0,
      skipped: 0
    };
    rows.forEach(function (row) {
      var status = String(row.Status || '').toUpperCase();
      if (status === QUEUE_STATUS.PENDING) out.pending++;
      else if (status === QUEUE_STATUS.PROCESSING) out.processing++;
      else if (status === QUEUE_STATUS.SENT) out.sent++;
      else if (status === QUEUE_STATUS.DELIVERED) out.delivered++;
      else if (status === QUEUE_STATUS.FAILED) out.failed++;
      else if (status === QUEUE_STATUS.RETRY) out.retry++;
      else if (status === QUEUE_STATUS.SKIPPED) out.skipped++;
    });
    out.processed = out.sent + out.delivered + out.failed + out.skipped;
    out.remaining = out.pending + out.retry + out.processing;
    return out;
  }

  function processBatch() {
    var started = Date.now();
    var execId = executionId_();
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(DEFAULTS.LOCK_WAIT_MS)) {
      TriggerService.ensureRunning();
      return { ok: true, deferred: true, reason: 'Another send is already running.' };
    }

    try {
      SheetService.ensureWorkbook();
      var campaign = CampaignService.activeCampaign();
      if (!campaign) {
        TriggerService.clearProcessorTriggers();
        return { ok: true, idle: true };
      }
      if (campaign.Status === CAMPAIGN_STATUS.PAUSED) {
        TriggerService.clearProcessorTriggers();
        return { ok: true, paused: true, campaignId: campaign['Campaign ID'] };
      }
      if (campaign.Status !== CAMPAIGN_STATUS.RUNNING && campaign.Status !== CAMPAIGN_STATUS.QUEUED) {
        TriggerService.stopIfIdle();
        return { ok: true, idle: true, status: campaign.Status };
      }

      CampaignService.setStatus(campaign['Campaign ID'], CAMPAIGN_STATUS.RUNNING, { 'Started At': campaign['Started At'] || nowPretty_() });

      recoverStale_(campaign['Campaign ID']);
      var claimed = claim_(campaign['Campaign ID'], execId);
      if (!claimed.length) {
        finalize_(campaign['Campaign ID']);
        return { ok: true, empty: true, campaignId: campaign['Campaign ID'] };
      }
      lock.releaseLock();

      var results = sendClaimed_(campaign, claimed);
      var lock2 = LockService.getScriptLock();
      lock2.waitLock(DEFAULTS.LOCK_WAIT_MS);
      try {
        applyResults_(claimed, results, execId);
        syncContactStatuses_(claimed, results);
        CampaignService.syncFromQueue(campaign['Campaign ID']);
      } finally {
        lock2.releaseLock();
      }

      var snapshot = stats(campaign['Campaign ID']);
      var more = snapshot.remaining > 0;
      if (more) {
        if (Date.now() - started > DEFAULTS.SAFE_RUNTIME_MS) {
          TriggerService.scheduleNext(1000);
          return { ok: true, yielded: true, processed: claimed.length, stats: snapshot };
        }
        TriggerService.scheduleNext(Math.max(getDelayMs_(), 1000));
      } else {
        finalize_(campaign['Campaign ID']);
      }
      return { ok: true, processed: claimed.length, stats: snapshot, more: more, mode: getOperationMode_() };
    } catch (error) {
      AppLogger.error('Batch processor', { error: String(error && error.message ? error.message : error), executionId: execId });
      TriggerService.scheduleNext(5000);
      return { ok: false, error: 'Sending paused briefly because of an unexpected error. It will resume automatically.' };
    } finally {
      try {
        lock.releaseLock();
      } catch (ignore) {}
    }
  }

  function claim_(campaignId, execId) {
    var sheet = SheetService.getSheet(SHEET_NAMES.QUEUE);
    var objects = SheetService.readObjects(SHEET_NAMES.QUEUE);
    var batchSize = getBatchSize_();
    var claimed = [];
    objects.forEach(function (row) {
      if (claimed.length >= batchSize) return;
      if (String(row['Campaign ID']) !== String(campaignId)) return;
      var status = String(row.Status || '');
      if (status !== QUEUE_STATUS.PENDING && status !== QUEUE_STATUS.RETRY) return;
      if (String(row['Message ID'] || '').trim()) return;
      claimed.push(row);
    });
    claimed.forEach(function (row) {
      sheet.getRange(row._row, QUEUE_HEADERS.indexOf('Status') + 1).setValue(QUEUE_STATUS.PROCESSING);
      sheet.getRange(row._row, QUEUE_HEADERS.indexOf('Execution ID') + 1).setValue(execId);
    });
    return claimed;
  }

  function recoverStale_(campaignId) {
    var sheet = SheetService.getSheet(SHEET_NAMES.QUEUE);
    var cutoff = Date.now() - DEFAULTS.STALE_PROCESSING_MS;
    SheetService.readObjects(SHEET_NAMES.QUEUE).forEach(function (row) {
      if (String(row['Campaign ID']) !== String(campaignId)) return;
      if (String(row.Status) !== QUEUE_STATUS.PROCESSING) return;
      var processed = row['Processed At'] ? new Date(row['Processed At']).getTime() : 0;
      var created = row['Created At'] ? new Date(row['Created At']).getTime() : 0;
      var stamp = processed || created || 0;
      if (!stamp || stamp < cutoff) {
        var alreadySent = String(row['Message ID'] || '').trim();
        sheet.getRange(row._row, QUEUE_HEADERS.indexOf('Status') + 1).setValue(
          alreadySent ? QUEUE_STATUS.SENT : QUEUE_STATUS.RETRY
        );
      }
    });
  }

  function sendClaimed_(campaign, claimed) {
    var mapping = parseJson_(campaign['Variable Mapping'], {});
    var templateName = campaign.Template;
    var language = campaign.Language || 'en';
    var detail = TemplateService.detail(templateName, language);
    var template = detail.ok ? detail.detail : { name: templateName, language: language, variables: Object.keys(mapping) };
    var parallel = getParallel_();
    var results = [];
    for (var i = 0; i < claimed.length; i += parallel) {
      var slice = claimed.slice(i, i + parallel);
      var jobs = slice.map(function (row) {
        var variables = parseJson_(row.Variables, {});
        var names = template.variables && template.variables.length ? template.variables : Object.keys(variables);
        var components = [];
        if (names.length) {
          components.push({
            type: 'body',
            parameters: names.map(function (name) {
              return { type: 'text', text: String(variables[name] == null ? '-' : variables[name]).slice(0, 900) || '-' };
            })
          });
        }
        var media = null;
        if (row.Attachment) {
          var inspected = AttachmentService.inspect(row.Attachment);
          if (inspected.ok && inspected.media) media = inspected.media;
        }
        if (media) components.unshift(SheetomaticApi.buildHeaderComponent(media));
        return {
          toPhone: row.Phone,
          templateName: templateName,
          language: language,
          components: components
        };
      });
      var sent = SheetomaticApi.fetchAllSends(jobs);
      results = results.concat(sent);
      if (getDelayMs_() > 0 && i + parallel < claimed.length) {
        Utilities.sleep(Math.min(getDelayMs_(), 1000));
      }
    }
    return results;
  }

  function applyResults_(claimed, results, execId) {
    var sheet = SheetService.getSheet(SHEET_NAMES.QUEUE);
    var maxRetries = getMaxRetries_();
    for (var i = 0; i < claimed.length; i++) {
      var row = claimed[i];
      var result = results[i] || { sent: false, error: 'No response', retryable: true };
      var attempts = Number(row.Attempts || 0) + 1;
      var status = QUEUE_STATUS.FAILED;
      if (result.sent) status = QUEUE_STATUS.SENT;
      else if (result.retryable && attempts < maxRetries) status = QUEUE_STATUS.RETRY;
      var range = sheet.getRange(row._row, 1, 1, QUEUE_HEADERS.length);
      var values = range.getValues()[0];
      values[QUEUE_HEADERS.indexOf('Status')] = status;
      values[QUEUE_HEADERS.indexOf('Attempts')] = attempts;
      values[QUEUE_HEADERS.indexOf('Message ID')] = result.messageId || values[QUEUE_HEADERS.indexOf('Message ID')] || '';
      values[QUEUE_HEADERS.indexOf('API Response')] = clampText_(result.raw || '', 500);
      values[QUEUE_HEADERS.indexOf('Error')] = result.sent ? '' : clampText_(result.error || '', 400);
      values[QUEUE_HEADERS.indexOf('Execution ID')] = execId;
      values[QUEUE_HEADERS.indexOf('Processed At')] = nowPretty_();
      range.setValues([values]);

      AppLogger.append({
        campaignId: row['Campaign ID'],
        recipient: row.Phone,
        action: 'Send template',
        endpoint: DOCUMENTED_ENDPOINTS.SEND,
        httpStatus: result.httpStatus || '',
        messageId: result.messageId || '',
        status: status,
        response: result.raw || '',
        error: result.error || '',
        executionId: execId
      });
    }
  }

  function syncContactStatuses_(claimed, results) {
    var sheet = SheetService.getSheet(SHEET_NAMES.CONTACTS);
    var headers = SheetService.headerMap(sheet);
    var statusCol = headers.index.Status;
    var idCol = headers.index['Message ID'];
    var errorCol = headers.index.Error;
    var processedCol = headers.index['Processed At'];
    if (statusCol == null) return;
    for (var i = 0; i < claimed.length; i++) {
      var rowNumber = Number(claimed[i]['Row Number']);
      if (!rowNumber) continue;
      var result = results[i] || {};
      var status = result.sent ? 'SENT' : 'FAILED';
      sheet.getRange(rowNumber, statusCol + 1).setValue(status);
      if (idCol != null) sheet.getRange(rowNumber, idCol + 1).setValue(result.messageId || '');
      if (errorCol != null) sheet.getRange(rowNumber, errorCol + 1).setValue(result.sent ? '' : clampText_(result.error || '', 400));
      if (processedCol != null) sheet.getRange(rowNumber, processedCol + 1).setValue(nowPretty_());
    }
  }

  function finalize_(campaignId) {
    var snapshot = stats(campaignId);
    var status = CAMPAIGN_STATUS.COMPLETED;
    if (snapshot.failed > 0 && snapshot.sent + snapshot.delivered > 0) status = CAMPAIGN_STATUS.COMPLETED_WITH_ERRORS;
    if (snapshot.sent + snapshot.delivered === 0 && snapshot.failed > 0) status = CAMPAIGN_STATUS.FAILED;
    CampaignService.setStatus(campaignId, status, { 'Completed At': nowPretty_() });
    CampaignService.syncFromQueue(campaignId);
    configSet_(CONFIG_KEYS.ACTIVE_CAMPAIGN_ID, '');
    TriggerService.clearProcessorTriggers();
    DashboardService.render();
    AppLogger.info('Campaign finished', { campaignId: campaignId, status: status, response: safeJson_(snapshot) });
  }

  return {
    enqueue: enqueue,
    stats: stats,
    processBatch: processBatch,
    idempotencyKey: idempotencyKey_
  };
})();

function processCampaignQueue() {
  return QueueService.processBatch();
}
