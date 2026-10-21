/**
 * WhatsApp Broadcast Master — central configuration.
 * Secrets live in PropertiesService. Never hard-code API keys.
 */

var CONFIG_KEYS = {
  API_KEY: 'WABM_API_KEY',
  PHONE_ID: 'WABM_PHONE_ID',
  API_BASE_URL: 'WABM_API_BASE_URL',
  DEFAULT_COUNTRY: 'WABM_DEFAULT_COUNTRY',
  BATCH_SIZE: 'WABM_BATCH_SIZE',
  DELAY_MS: 'WABM_DELAY_MS',
  PARALLEL: 'WABM_PARALLEL',
  MAX_RETRIES: 'WABM_MAX_RETRIES',
  OPERATION_MODE: 'WABM_OPERATION_MODE',
  ACTIVE_CAMPAIGN_ID: 'WABM_ACTIVE_CAMPAIGN_ID',
  ONBOARDED: 'WABM_ONBOARDED',
  LAST_WALLET_BALANCE: 'WABM_LAST_WALLET_BALANCE',
  LAST_WALLET_CURRENCY: 'WABM_LAST_WALLET_CURRENCY',
  LAST_CONNECTION: 'WABM_LAST_CONNECTION'
};

var DEFAULTS = {
  API_BASE_URL: 'https://wa.sheetomatic.com/api/v1',
  PORTAL_URL: 'https://wa.sheetomatic.com',
  DOCS_URL: 'https://wa.sheetomatic.com/Integrations/ApiDocumentation',
  API_KEYS_URL: 'https://wa.sheetomatic.com/Integrations/ListApikey',
  CONNECTED_ACCOUNTS_URL: 'https://wa.sheetomatic.com/ConnectedAccount',
  DEFAULT_COUNTRY: '91',
  BATCH_SIZE: 20,
  DELAY_MS: 250,
  PARALLEL: 8,
  MAX_RETRIES: 3,
  SAFE_RUNTIME_MS: 270000,
  LOCK_WAIT_MS: 30000,
  STALE_PROCESSING_MS: 10 * 60 * 1000,
  MAX_CAMPAIGN_SIZE: 10000,
  TRIGGER_HANDLER: 'processCampaignQueue',
  TRIGGER_AFTER_MS: 15000,
  PRODUCT_NAME: 'WhatsApp Broadcast Master',
  PRODUCT_SUBTITLE: 'Send WhatsApp campaigns directly from Google Sheets'
};

var SHEET_NAMES = {
  DASHBOARD: 'Dashboard',
  SETTINGS: 'Settings',
  CONTACTS: 'Contacts',
  CAMPAIGNS: 'Campaigns',
  QUEUE: 'Message Queue',
  LOGS: 'Logs',
  TEMPLATES: 'Templates',
  HELP: 'Help'
};

var CONTACT_HEADERS = [
  'Phone',
  'Name',
  'Email',
  'Variable 1',
  'Variable 2',
  'Variable 3',
  'Attachment',
  'Status',
  'Message ID',
  'Error',
  'Processed At'
];

var CAMPAIGN_HEADERS = [
  'Campaign ID',
  'Campaign Name',
  'Created At',
  'Started At',
  'Completed At',
  'Template',
  'Language',
  'Phone Column',
  'Variable Mapping',
  'Attachment',
  'Notes',
  'Total Recipients',
  'Valid',
  'Invalid',
  'Duplicates',
  'Sent',
  'Delivered',
  'Failed',
  'Pending',
  'Skipped',
  'Credits Used',
  'Status',
  'Last Error',
  'Mode'
];

var QUEUE_HEADERS = [
  'Queue ID',
  'Campaign ID',
  'Row Number',
  'Phone',
  'Template',
  'Variables',
  'Attachment',
  'Status',
  'Attempts',
  'Message ID',
  'API Response',
  'Error',
  'Idempotency Key',
  'Execution ID',
  'Created At',
  'Processed At'
];

var LOG_HEADERS = [
  'Timestamp',
  'Campaign ID',
  'Recipient',
  'Action',
  'API Endpoint',
  'HTTP Status',
  'Message ID',
  'Status',
  'Response',
  'Error',
  'Execution ID'
];

var TEMPLATE_HEADERS = [
  'Name',
  'Language',
  'Category',
  'Status',
  'Variables',
  'Header Format',
  'Body',
  'Usable',
  'Refreshed At'
];

var QUEUE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETRY: 'RETRY',
  SKIPPED: 'SKIPPED'
};

var CAMPAIGN_STATUS = {
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ERRORS: 'COMPLETED_WITH_ERRORS',
  FAILED: 'FAILED'
};

var DOCUMENTED_ENDPOINTS = {
  SEND: '/whatsapp/meta/sendMessage',
  TEMPLATES: '/messageTemplate/getTemplates',
  TEMPLATES_FOR_SEND: '/messageTemplate/getTemplatesForSendMessage',
  TEMPLATE_DETAIL: '/messageTemplate/getTemplateDetail',
  WALLET: '/whatsapp/waWallet'
};

function getScriptProps_() {
  return PropertiesService.getScriptProperties();
}

function configGet_(key, fallback) {
  var value = getScriptProps_().getProperty(key);
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function configSet_(key, value) {
  if (value === null || value === undefined) {
    getScriptProps_().deleteProperty(key);
    return;
  }
  getScriptProps_().setProperty(key, String(value));
}

function getApiBaseUrl_() {
  return String(configGet_(CONFIG_KEYS.API_BASE_URL, DEFAULTS.API_BASE_URL)).replace(/\/+$/, '');
}

function getDefaultCountryCode_() {
  return String(configGet_(CONFIG_KEYS.DEFAULT_COUNTRY, DEFAULTS.DEFAULT_COUNTRY)).replace(/\D/g, '') || '91';
}

function getBatchSize_() {
  var n = Number(configGet_(CONFIG_KEYS.BATCH_SIZE, DEFAULTS.BATCH_SIZE));
  if (!isFinite(n) || n < 1) return DEFAULTS.BATCH_SIZE;
  return Math.min(50, Math.floor(n));
}

function getDelayMs_() {
  var n = Number(configGet_(CONFIG_KEYS.DELAY_MS, DEFAULTS.DELAY_MS));
  if (!isFinite(n) || n < 0) return DEFAULTS.DELAY_MS;
  return Math.min(5000, Math.floor(n));
}

function getParallel_() {
  var n = Number(configGet_(CONFIG_KEYS.PARALLEL, DEFAULTS.PARALLEL));
  if (!isFinite(n) || n < 1) return 1;
  return Math.min(20, Math.floor(n));
}

function getMaxRetries_() {
  var n = Number(configGet_(CONFIG_KEYS.MAX_RETRIES, DEFAULTS.MAX_RETRIES));
  if (!isFinite(n) || n < 0) return DEFAULTS.MAX_RETRIES;
  return Math.min(8, Math.floor(n));
}

function getOperationMode_() {
  var mode = String(configGet_(CONFIG_KEYS.OPERATION_MODE, 'MOCK')).toUpperCase();
  return mode === 'PRODUCTION' ? 'PRODUCTION' : 'MOCK';
}

function isMockMode_() {
  return getOperationMode_() !== 'PRODUCTION';
}

function isOnboarded_() {
  return configGet_(CONFIG_KEYS.ONBOARDED, '') === '1';
}

function maskSecret_(value) {
  var text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return '••••••••';
  return text.slice(0, 4) + '••••' + text.slice(-4);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
}

function nowPretty_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'dd MMM yyyy HH:mm:ss');
}

function newId_(prefix) {
  var rand = Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
  return (prefix || 'ID') + '-' + rand;
}

function safeJson_(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function parseJson_(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function clampText_(value, max) {
  var text = value === null || value === undefined ? '' : String(value);
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function executionId_() {
  try {
    return Session.getTemporaryActiveUserKey() + ':' + Date.now();
  } catch (error) {
    return 'exec-' + Date.now();
  }
}
