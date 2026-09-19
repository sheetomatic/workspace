/**
 * Campaign lifecycle: draft → validate → queue → run → pause/resume → complete.
 */

var CampaignService = (function () {
  function create(draft, validation) {
    var id = newId_('CMP');
    var row = {
      'Campaign ID': id,
      'Campaign Name': draft.campaignName || 'Untitled campaign',
      'Created At': nowPretty_(),
      'Started At': '',
      'Completed At': '',
      Template: draft.templateName || '',
      Language: draft.language || 'en',
      'Phone Column': draft.phoneColumn || '',
      'Variable Mapping': safeJson_(draft.mapping || {}),
      Attachment: validation.attachment && validation.attachment.present ? validation.attachment.label : '',
      Notes: draft.notes || '',
      'Total Recipients': validation.classified.total,
      Valid: validation.classified.valid.length,
      Invalid: validation.classified.invalid.length + validation.classified.missing.length,
      Duplicates: validation.classified.duplicates.length,
      Sent: 0,
      Delivered: 0,
      Failed: 0,
      Pending: validation.classified.valid.length,
      Skipped: 0,
      'Credits Used': 0,
      Status: CAMPAIGN_STATUS.VALIDATED,
      'Last Error': '',
      Mode: getOperationMode_()
    };
    SheetService.appendObjects(SHEET_NAMES.CAMPAIGNS, CAMPAIGN_HEADERS, [row]);
    return row;
  }

  function find(campaignId) {
    var rows = SheetService.readObjects(SHEET_NAMES.CAMPAIGNS);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i]['Campaign ID']) === String(campaignId)) return rows[i];
    }
    return null;
  }

  function latest() {
    var rows = SheetService.readObjects(SHEET_NAMES.CAMPAIGNS);
    return rows.length ? rows[rows.length - 1] : null;
  }

  function activeCampaign() {
    var id = configGet_(CONFIG_KEYS.ACTIVE_CAMPAIGN_ID, '');
    if (id) {
      var found = find(id);
      if (found) return found;
    }
    var rows = SheetService.readObjects(SHEET_NAMES.CAMPAIGNS);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].Status === CAMPAIGN_STATUS.RUNNING || rows[i].Status === CAMPAIGN_STATUS.QUEUED) {
        return rows[i];
      }
    }
    return null;
  }

  function setStatus(campaignId, status, extra) {
    extra = extra || {};
    var campaign = find(campaignId);
    if (!campaign) return null;
    var sheet = SheetService.getSheet(SHEET_NAMES.CAMPAIGNS);
    campaign.Status = status;
    Object.keys(extra).forEach(function (key) {
      campaign[key] = extra[key];
    });
    var values = CAMPAIGN_HEADERS.map(function (header) {
      return campaign[header] === undefined || campaign[header] === null ? '' : campaign[header];
    });
    sheet.getRange(campaign._row, 1, 1, CAMPAIGN_HEADERS.length).setValues([values]);
    return campaign;
  }

  function syncFromQueue(campaignId) {
    var snapshot = QueueService.stats(campaignId);
    var campaign = find(campaignId);
    if (!campaign) return snapshot;
    setStatus(campaignId, campaign.Status, {
      Sent: snapshot.sent,
      Delivered: snapshot.delivered,
      Failed: snapshot.failed,
      Pending: snapshot.pending + snapshot.retry + snapshot.processing,
      Skipped: snapshot.skipped,
      'Credits Used': snapshot.sent + snapshot.delivered
    });
    DashboardService.render();
    return snapshot;
  }

  function start(draft) {
    SheetService.applySettingsFromSheet();
    var validation = ValidationService.validate(draft);
    if (!validation.ready) {
      return { ok: false, validation: validation, error: firstFailure_(validation) };
    }
    if (!isMockMode_()) {
      var available = validation.availableCredits;
      if (available != null && available < validation.requiredCredits) {
        return {
          ok: false,
          error: 'Insufficient WhatsApp credits. Required: ' + validation.requiredCredits + '. Available: ' + available + '.',
          validation: validation
        };
      }
    }

    var campaign = create(draft, validation);
    var queued = QueueService.enqueue(
      campaign,
      validation.classified,
      validation.contacts,
      draft,
      validation.template,
      validation.attachment && validation.attachment.media
    );
    setStatus(campaign['Campaign ID'], CAMPAIGN_STATUS.QUEUED, {
      Pending: queued,
      Valid: queued
    });
    configSet_(CONFIG_KEYS.ACTIVE_CAMPAIGN_ID, campaign['Campaign ID']);
    AppLogger.info('Start campaign', {
      campaignId: campaign['Campaign ID'],
      status: CAMPAIGN_STATUS.QUEUED,
      response: queued + ' queued'
    });
    TriggerService.scheduleNext(1000);
    QueueService.processBatch();
    return {
      ok: true,
      campaignId: campaign['Campaign ID'],
      queued: queued,
      mode: getOperationMode_(),
      validation: validation
    };
  }

  function pause(campaignId) {
    var campaign = campaignId ? find(campaignId) : activeCampaign() || latest();
    if (!campaign) return { ok: false, error: 'No campaign is running.' };
    if (campaign.Status !== CAMPAIGN_STATUS.RUNNING && campaign.Status !== CAMPAIGN_STATUS.QUEUED) {
      return { ok: false, error: 'Only a running campaign can be paused.' };
    }
    setStatus(campaign['Campaign ID'], CAMPAIGN_STATUS.PAUSED);
    TriggerService.clearProcessorTriggers();
    AppLogger.info('Pause campaign', { campaignId: campaign['Campaign ID'], status: CAMPAIGN_STATUS.PAUSED });
    DashboardService.render();
    return { ok: true, campaignId: campaign['Campaign ID'], status: CAMPAIGN_STATUS.PAUSED };
  }

  function resume(campaignId) {
    var campaign = campaignId ? find(campaignId) : latest();
    if (!campaign) return { ok: false, error: 'No campaign to resume.' };
    if (campaign.Status !== CAMPAIGN_STATUS.PAUSED && campaign.Status !== CAMPAIGN_STATUS.QUEUED) {
      return { ok: false, error: 'Only a paused campaign can be resumed.' };
    }
    setStatus(campaign['Campaign ID'], CAMPAIGN_STATUS.RUNNING);
    configSet_(CONFIG_KEYS.ACTIVE_CAMPAIGN_ID, campaign['Campaign ID']);
    TriggerService.scheduleNext(1000);
    AppLogger.info('Resume campaign', { campaignId: campaign['Campaign ID'], status: CAMPAIGN_STATUS.RUNNING });
    QueueService.processBatch();
    return { ok: true, campaignId: campaign['Campaign ID'], status: CAMPAIGN_STATUS.RUNNING };
  }

  function statusPayload(campaignId) {
    var campaign = campaignId ? find(campaignId) : activeCampaign() || latest();
    if (!campaign) {
      return { ok: true, empty: true, mode: getOperationMode_() };
    }
    var snapshot = QueueService.stats(campaign['Campaign ID']);
    var total = Number(campaign.Valid || snapshot.total || 0);
    var processed = snapshot.processed;
    var percent = total ? Math.round((processed / total) * 100) : 0;
    return {
      ok: true,
      empty: false,
      mode: campaign.Mode || getOperationMode_(),
      campaign: {
        id: campaign['Campaign ID'],
        name: campaign['Campaign Name'],
        status: campaign.Status,
        template: campaign.Template,
        language: campaign.Language,
        attachment: campaign.Attachment,
        total: total,
        valid: Number(campaign.Valid || 0),
        invalid: Number(campaign.Invalid || 0),
        duplicates: Number(campaign.Duplicates || 0),
        sent: snapshot.sent,
        delivered: snapshot.delivered,
        failed: snapshot.failed,
        pending: snapshot.remaining,
        skipped: snapshot.skipped,
        processed: processed,
        remaining: snapshot.remaining,
        percent: percent,
        creditsUsed: Number(campaign['Credits Used'] || snapshot.sent),
        lastError: campaign['Last Error'] || ''
      }
    };
  }

  function firstFailure_(validation) {
    var failed = (validation.checks || []).filter(function (item) { return !item.ok; });
    return failed.length ? failed[0].detail || failed[0].label : 'Campaign is not ready.';
  }

  return {
    create: create,
    find: find,
    latest: latest,
    activeCampaign: activeCampaign,
    setStatus: setStatus,
    syncFromQueue: syncFromQueue,
    start: start,
    pause: pause,
    resume: resume,
    statusPayload: statusPayload
  };
})();
