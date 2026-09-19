/**
 * Time-driven continuation. Never accumulate duplicate processors.
 */

var TriggerService = (function () {
  function listProcessorTriggers_() {
    return ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === DEFAULTS.TRIGGER_HANDLER;
    });
  }

  function clearProcessorTriggers() {
    var triggers = listProcessorTriggers_();
    triggers.forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });
    return triggers.length;
  }

  function scheduleNext(afterMs) {
    clearProcessorTriggers();
    ScriptApp.newTrigger(DEFAULTS.TRIGGER_HANDLER)
      .timeBased()
      .after(Math.max(1000, afterMs || DEFAULTS.TRIGGER_AFTER_MS))
      .create();
  }

  function ensureRunning() {
    var existing = listProcessorTriggers_();
    if (existing.length > 1) {
      clearProcessorTriggers();
      scheduleNext(DEFAULTS.TRIGGER_AFTER_MS);
      return;
    }
    if (existing.length === 1) return;
    scheduleNext(DEFAULTS.TRIGGER_AFTER_MS);
  }

  function stopIfIdle() {
    var campaigns = SheetService.readObjects(SHEET_NAMES.CAMPAIGNS);
    var running = campaigns.some(function (row) {
      return row.Status === CAMPAIGN_STATUS.RUNNING || row.Status === CAMPAIGN_STATUS.QUEUED;
    });
    if (!running) clearProcessorTriggers();
  }

  return {
    scheduleNext: scheduleNext,
    ensureRunning: ensureRunning,
    clearProcessorTriggers: clearProcessorTriggers,
    stopIfIdle: stopIfIdle
  };
})();
