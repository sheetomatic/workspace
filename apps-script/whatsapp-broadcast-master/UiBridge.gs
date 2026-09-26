/**
 * HTML ↔ Apps Script bridge. These functions are called from the UI.
 * Keep payloads business-friendly. Never return API keys.
 */

function getAppState() {
  SheetService.ensureWorkbook();
  var settings = currentSettingsPublic_();
  var templates = [];
  try {
    templates = TemplateService.listCached();
  } catch (error) {
    templates = [];
  }
  return {
    product: DEFAULTS.PRODUCT_NAME,
    subtitle: DEFAULTS.PRODUCT_SUBTITLE,
    onboarded: isOnboarded_(),
    mode: getOperationMode_(),
    mock: isMockMode_(),
    configured: SheetomaticApi.isConfigured(),
    settings: settings,
    columns: SheetService.contactColumns(),
    templates: templates,
    help: HelpService.html(),
    campaign: CampaignService.statusPayload(),
    docsUrl: DEFAULTS.DOCS_URL,
    portalUrl: DEFAULTS.PORTAL_URL,
    apiKeysUrl: DEFAULTS.API_KEYS_URL,
    connectedAccountsUrl: DEFAULTS.CONNECTED_ACCOUNTS_URL
  };
}

function saveSettingsFromUi(payload) {
  payload = payload || {};
  if (payload.apiKey && String(payload.apiKey).indexOf('•') === -1) {
    configSet_(CONFIG_KEYS.API_KEY, String(payload.apiKey).trim());
  }
  if (payload.clearApiKey) {
    configSet_(CONFIG_KEYS.API_KEY, '');
  }
  if (payload.phoneId !== undefined) configSet_(CONFIG_KEYS.PHONE_ID, String(payload.phoneId || '').trim());
  if (payload.apiBaseUrl) configSet_(CONFIG_KEYS.API_BASE_URL, String(payload.apiBaseUrl).trim().replace(/\/+$/, ''));
  if (payload.defaultCountry) configSet_(CONFIG_KEYS.DEFAULT_COUNTRY, String(payload.defaultCountry).replace(/\D/g, ''));
  if (payload.batchSize) configSet_(CONFIG_KEYS.BATCH_SIZE, String(payload.batchSize));
  if (payload.delayMs !== undefined) configSet_(CONFIG_KEYS.DELAY_MS, String(payload.delayMs));
  if (payload.parallel) configSet_(CONFIG_KEYS.PARALLEL, String(payload.parallel));
  if (payload.maxRetries !== undefined) configSet_(CONFIG_KEYS.MAX_RETRIES, String(payload.maxRetries));
  if (payload.mode) {
    configSet_(CONFIG_KEYS.OPERATION_MODE, String(payload.mode).toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'MOCK');
  }
  SheetService.refreshSettingsView();
  configSet_(CONFIG_KEYS.ONBOARDED, '1');
  return { ok: true, settings: currentSettingsPublic_() };
}

function testConnectionFromUi() {
  SheetService.applySettingsFromSheet();
  var account = SheetomaticApi.getAccountStatus();
  SheetService.refreshSettingsView();
  DashboardService.render();
  AppLogger.info('Test connection', {
    status: account.ok ? 'OK' : 'ERROR',
    endpoint: DOCUMENTED_ENDPOINTS.WALLET,
    error: account.error || '',
    response: account.ok ? 'balance=' + (account.credits && account.credits.balance) : ''
  });
  if (!account.ok) {
    return {
      ok: false,
      title: 'Connection Failed',
      message: account.error || 'Unable to connect to the WhatsApp service. Please verify your API credentials and try again.',
      account: account
    };
  }
  return {
    ok: true,
    title: 'Connection Successful',
    message: isMockMode_()
      ? 'Mock Mode is connected to the simulator. Wallet balance is simulated.'
      : 'Connected to Sheetomatic WhatsApp.',
    account: account
  };
}

function refreshTemplatesFromUi() {
  var result = TemplateService.refresh();
  if (!result.ok) {
    return { ok: false, error: result.error || 'Could not load templates from Sheetomatic.' };
  }
  return { ok: true, templates: result.templates, usable: TemplateService.usableOnly(result.templates).length };
}

function validateCampaignFromUi(draft) {
  return ValidationService.validate(draft || {});
}

function previewMessageFromUi(payload) {
  payload = payload || {};
  var contacts = SheetService.readObjects(SHEET_NAMES.CONTACTS);
  if (!contacts.length) {
    return { ok: false, error: 'Add at least one contact to preview a message.' };
  }
  var index = Math.max(0, Math.min(contacts.length - 1, Number(payload.rowIndex || 0)));
  var detail = TemplateService.detail(payload.templateName, payload.language || 'en');
  if (!detail.ok) return { ok: false, error: detail.error || 'Could not load that template.' };
  var text = TemplateService.preview(detail.detail, payload.mapping || {}, contacts[index]);
  return {
    ok: true,
    index: index,
    total: contacts.length,
    row: contacts[index],
    preview: text,
    template: detail.detail
  };
}

function sendTestMessageFromUi(payload) {
  payload = payload || {};
  var phone = payload.testPhone || payload.toPhone;
  if (!phone) return { ok: false, error: 'Enter a test recipient number first.' };
  var parsed = PhoneService.normalize(phone);
  if (!parsed.ok) return { ok: false, error: 'That test number is not a valid international WhatsApp number.' };
  var detail = TemplateService.detail(payload.templateName, payload.language || 'en');
  if (!detail.ok) return { ok: false, error: detail.error || 'Select an approved template first.' };
  var contacts = SheetService.readObjects(SHEET_NAMES.CONTACTS);
  var row = contacts[Math.max(0, Number(payload.rowIndex || 0))] || contacts[0] || {};
  var attachment = AttachmentService.inspect(payload.attachment);
  if (!attachment.ok) return { ok: false, error: attachment.error };
  if (attachment.present) {
    var compatible = AttachmentService.compatibleWithTemplate(attachment.media, detail.detail);
    if (!compatible.ok) return { ok: false, error: compatible.error };
  }
  var components = TemplateService.buildComponents(detail.detail, payload.mapping || {}, row, attachment.media);
  var result = SheetomaticApi.sendTemplateMessage({
    toPhone: parsed.e164,
    templateName: detail.detail.name,
    language: detail.detail.language,
    components: components
  });
  AppLogger.append({
    action: 'Test message',
    recipient: parsed.e164,
    endpoint: DOCUMENTED_ENDPOINTS.SEND,
    status: result.sent ? 'SENT' : 'FAILED',
    messageId: result.messageId || '',
    error: result.error || '',
    httpStatus: result.httpStatus || ''
  });
  if (!result.sent) {
    return { ok: false, error: result.error || 'The test message could not be sent.' };
  }
  return {
    ok: true,
    messageId: result.messageId || '',
    phone: PhoneService.display(parsed.e164),
    mode: getOperationMode_(),
    preview: TemplateService.preview(detail.detail, payload.mapping || {}, row)
  };
}

function startCampaignFromUi(payload) {
  payload = payload || {};
  if (!payload.confirmed) {
    return { ok: false, error: 'Please confirm the recipient count before starting.' };
  }
  if (payload.mode === 'PRODUCTION') {
    configSet_(CONFIG_KEYS.OPERATION_MODE, 'PRODUCTION');
  }
  if (!isMockMode_() && !payload.productionConfirmed) {
    return { ok: false, needProductionConfirm: true, error: 'Production Mode sends real WhatsApp messages. Confirm to continue.' };
  }
  return CampaignService.start(payload.draft || payload);
}

function pauseCampaignFromUi(campaignId) {
  return CampaignService.pause(campaignId);
}

function resumeCampaignFromUi(campaignId) {
  return CampaignService.resume(campaignId);
}

function getCampaignStatusFromUi(campaignId) {
  DashboardService.render();
  return CampaignService.statusPayload(campaignId);
}

function getLogsFromUi(limit) {
  return { ok: true, logs: AppLogger.recent(limit || 40) };
}

function setupDemoDataFromUi() {
  return DemoService.setupDemoData();
}

function createDemoCampaignFromUi() {
  return DemoService.createDemoCampaign();
}

function createLargeDemoFromUi(count) {
  return DemoService.createLargeDemo(count || 10000);
}

function processQueueNowFromUi() {
  return QueueService.processBatch();
}

function currentSettingsPublic_() {
  return {
    apiBaseUrl: getApiBaseUrl_(),
    phoneId: configGet_(CONFIG_KEYS.PHONE_ID, ''),
    defaultCountry: getDefaultCountryCode_(),
    batchSize: getBatchSize_(),
    delayMs: getDelayMs_(),
    parallel: getParallel_(),
    maxRetries: getMaxRetries_(),
    mode: getOperationMode_(),
    apiKeyConfigured: SheetomaticApi.isConfigured(),
    apiKeyMasked: SheetomaticApi.isConfigured() ? '•••• configured' : '',
    lastConnection: configGet_(CONFIG_KEYS.LAST_CONNECTION, ''),
    walletBalance: configGet_(CONFIG_KEYS.LAST_WALLET_BALANCE, ''),
    walletCurrency: configGet_(CONFIG_KEYS.LAST_WALLET_CURRENCY, 'INR')
  };
}
