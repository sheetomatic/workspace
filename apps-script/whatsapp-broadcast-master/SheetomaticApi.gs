/**
 * Sheetomatic WhatsApp API client.
 *
 * Uses only documented production endpoints from the Sheetomatic platform:
 *   Base:  https://wa.sheetomatic.com/api/v1
 *   Auth:  x-api-key, x-phone-id
 *   Send:  POST /whatsapp/meta/sendMessage
 *   List:  GET  /messageTemplate/getTemplatesForSendMessage
 *   Detail:POST /messageTemplate/getTemplateDetail
 *   Wallet:GET /whatsapp/waWallet
 *   Fallback list: POST /messageTemplate/getTemplates
 *
 * @see https://wa.sheetomatic.com/Integrations/ApiDocumentation
 * @see src/lib/integrations/redlava.ts
 * @see src/lib/integrations/redlava-bulk-send.ts
 */

var SheetomaticApi = (function () {
  function headers_() {
    var apiKey = configGet_(CONFIG_KEYS.API_KEY, '');
    var phoneId = configGet_(CONFIG_KEYS.PHONE_ID, '');
    var map = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    };
    if (phoneId) map['x-phone-id'] = phoneId;
    return map;
  }

  function isConfigured() {
    return Boolean(configGet_(CONFIG_KEYS.API_KEY, ''));
  }

  function request_(method, endpoint, body, options) {
    options = options || {};
    if (isMockMode_() && !options.forceLive) {
      return MockApi.handle(method, endpoint, body);
    }
    if (!isConfigured()) {
      return {
        ok: false,
        status: 0,
        body: {},
        raw: '',
        error: 'API credentials are not configured. Add your Sheetomatic API key in Settings.'
      };
    }

    var url = getApiBaseUrl_() + (endpoint.indexOf('/') === 0 ? endpoint : '/' + endpoint);
    var params = {
      method: String(method || 'get').toLowerCase(),
      headers: headers_(),
      muteHttpExceptions: true,
      followRedirects: true
    };
    if (body !== undefined && params.method !== 'get') {
      params.contentType = 'application/json';
      params.payload = JSON.stringify(body);
    }

    var response;
    try {
      response = UrlFetchApp.fetch(url, params);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        body: {},
        raw: '',
        error: friendlyNetworkError_(error)
      };
    }

    var raw = response.getContentText() || '';
    var status = response.getResponseCode();
    var parsed = parseJson_(raw, { raw: raw });
    if (status < 200 || status >= 300) {
      return {
        ok: false,
        status: status,
        body: parsed,
        raw: raw,
        error: extractError_(parsed, raw, status)
      };
    }
    return { ok: true, status: status, body: parsed, raw: raw };
  }

  function extractError_(parsed, raw, status) {
    if (parsed && typeof parsed === 'object') {
      var nested = parsed.error && typeof parsed.error === 'object' ? parsed.error : parsed;
      var message =
        parsed.detail ||
        parsed.message ||
        parsed.title ||
        nested.message ||
        nested.details;
      if (message) return friendlyApiError_(String(message), status, raw);
    }
    return friendlyApiError_(raw, status, raw);
  }

  function getAccountStatus() {
    var wallet = getCredits();
    if (!wallet.ok) {
      return {
        ok: false,
        connected: false,
        error: wallet.error,
        status: wallet.status,
        accountStatus: 'Disconnected',
        apiStatus: 'Failed',
        credits: null
      };
    }
    configSet_(CONFIG_KEYS.LAST_WALLET_BALANCE, wallet.balance);
    configSet_(CONFIG_KEYS.LAST_WALLET_CURRENCY, wallet.currency || 'INR');
    configSet_(CONFIG_KEYS.LAST_CONNECTION, nowIso_());
    return {
      ok: true,
      connected: true,
      accountStatus: wallet.balance > 0 ? 'Active' : 'Active — wallet empty',
      apiStatus: 'Connected',
      credits: wallet,
      phoneId: configGet_(CONFIG_KEYS.PHONE_ID, ''),
      mode: getOperationMode_()
    };
  }

  function getCredits() {
    var result = request_('get', DOCUMENTED_ENDPOINTS.WALLET);
    if (!result.ok) return result;
    var balance = parseWalletNumber_(result.body && result.body.balance);
    if (balance == null) {
      return {
        ok: false,
        error: 'The WhatsApp wallet response did not include a balance.',
        status: result.status,
        body: result.body
      };
    }
    return {
      ok: true,
      balance: balance,
      pendingBalance: parseWalletNumber_(result.body.pendingBalance) || 0,
      currency: result.body.currency || 'INR',
      phoneNumberId: result.body.phoneNumberId || null,
      status: result.status,
      body: result.body
    };
  }

  function getTemplates() {
    var sendList = request_('get', DOCUMENTED_ENDPOINTS.TEMPLATES_FOR_SEND);
    var paged = request_('post', DOCUMENTED_ENDPOINTS.TEMPLATES, {
      pagination: { current: 1, pageSize: 100 },
      search: []
    });
    if (!sendList.ok && !paged.ok) {
      return { ok: false, error: paged.error || sendList.error, templates: [] };
    }

    var merged = {};
    function add_(list, fromSendEndpoint) {
      (list || []).forEach(function (item) {
        if (!item || !item.name) return;
        if (fromSendEndpoint && !item.status) {
          item.status = 'APPROVED';
          item.usable = true;
        }
        var key = item.name + '::' + (item.language || 'en');
        if (!merged[key] || (item.usable && !merged[key].usable) || (item.body && !merged[key].body)) {
          merged[key] = item;
        }
      });
    }
    if (sendList.ok) add_(normalizeTemplateList_(sendList.body), true);
    if (paged.ok) add_(normalizeTemplateList_(paged.body), false);
    return { ok: true, templates: Object.keys(merged).map(function (key) { return merged[key]; }) };
  }

  function getTemplateDetail(name, language) {
    var result = request_('post', DOCUMENTED_ENDPOINTS.TEMPLATE_DETAIL, {
      name: name,
      language: language || 'en'
    });
    if (!result.ok) return result;
    var detail = result.body && result.body.name ? result.body : result.body.template || result.body;
    return { ok: true, detail: normalizeTemplate_(detail, name, language) };
  }

  function sendTemplateMessage(params) {
    var to = PhoneService.normalize(params.toPhone, params.defaultCountry);
    if (!to.ok) {
      return {
        sent: false,
        retryable: false,
        reason: to.reason === 'MISSING' ? 'invalid_phone' : 'invalid_phone',
        error: to.reason === 'MISSING'
          ? 'Phone number is missing.'
          : 'Phone number is not a valid international WhatsApp number.',
        httpStatus: 0
      };
    }

    var message = {
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language || 'en' },
        components: params.components || []
      }
    };

    var result = request_('post', DOCUMENTED_ENDPOINTS.SEND, {
      to: to.e164,
      message: message
    });

    return parseSendResult_(result, 'template');
  }

  function sendMediaTemplateMessage(params) {
    var components = params.components ? params.components.slice() : [];
    if (params.media) {
      components.unshift(buildHeaderComponent_(params.media));
    }
    return sendTemplateMessage({
      toPhone: params.toPhone,
      templateName: params.templateName,
      language: params.language,
      components: components,
      defaultCountry: params.defaultCountry
    });
  }

  function fetchAllSends(jobs) {
    if (isMockMode_()) {
      return jobs.map(function (job) {
        return sendTemplateMessage(job);
      });
    }
    if (!isConfigured()) {
      return jobs.map(function () {
        return {
          sent: false,
          retryable: false,
          reason: 'not_configured',
          error: 'API credentials are not configured.',
          httpStatus: 0
        };
      });
    }

    var url = getApiBaseUrl_() + DOCUMENTED_ENDPOINTS.SEND;
    var requests = jobs.map(function (job) {
      var to = PhoneService.normalize(job.toPhone, job.defaultCountry);
      var payload = {
        to: to.ok ? to.e164 : String(job.toPhone || ''),
        message: {
          type: 'template',
          template: {
            name: job.templateName,
            language: { code: job.language || 'en' },
            components: job.components || []
          }
        }
      };
      if (job.media) {
        payload.message.template.components = [buildHeaderComponent_(job.media)].concat(
          payload.message.template.components
        );
      }
      return {
        url: url,
        method: 'post',
        contentType: 'application/json',
        headers: headers_(),
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
    });

    var responses;
    try {
      responses = UrlFetchApp.fetchAll(requests);
    } catch (error) {
      return jobs.map(function () {
        return {
          sent: false,
          retryable: true,
          reason: 'network',
          error: friendlyNetworkError_(error),
          httpStatus: 0
        };
      });
    }

    return responses.map(function (response) {
      var raw = response.getContentText() || '';
      var status = response.getResponseCode();
      var parsed = parseJson_(raw, { raw: raw });
      var wrapped = {
        ok: status >= 200 && status < 300,
        status: status,
        body: parsed,
        raw: raw,
        error: status >= 200 && status < 300 ? '' : extractError_(parsed, raw, status)
      };
      return parseSendResult_(wrapped, 'template');
    });
  }

  function buildHeaderComponent_(media) {
    var type = String(media.type || 'document').toLowerCase();
    var param = { type: type };
    param[type] = { link: media.link };
    if (media.filename && (type === 'document' || type === 'video')) {
      param[type].filename = media.filename;
    }
    return { type: 'header', parameters: [param] };
  }

  function parseSendResult_(result, messageType) {
    if (!result.ok) {
      var retryable = isRetryable_(result.status, result.error || result.raw);
      return {
        sent: false,
        retryable: retryable,
        reason: classifyFailReason_(result.status, result.error || result.raw, messageType),
        error: friendlyApiError_(result.error || result.raw, result.status, result.raw),
        httpStatus: result.status || 0,
        raw: AppLogger.redact(result.raw || '')
      };
    }

    var body = result.body || {};
    if (body.success === false || body.error) {
      var detail = extractError_(body, result.raw, result.status);
      return {
        sent: false,
        retryable: isRetryable_(result.status, detail),
        reason: classifyFailReason_(result.status, detail, messageType),
        error: detail,
        httpStatus: result.status,
        raw: AppLogger.redact(result.raw || '')
      };
    }

    var messageId = extractMessageId_(body);
    if (messageId || isImplicitSuccess_(body)) {
      return {
        sent: true,
        messageId: messageId || '',
        httpStatus: result.status,
        raw: AppLogger.redact(clampText_(result.raw || '', 400))
      };
    }

    return {
      sent: false,
      retryable: true,
      reason: 'unknown',
      error: 'The WhatsApp service accepted the request but did not return a message id.',
      httpStatus: result.status,
      raw: AppLogger.redact(result.raw || '')
    };
  }

  function extractMessageId_(body) {
    if (!body || typeof body !== 'object') return '';
    if (Array.isArray(body.messages) && body.messages[0] && body.messages[0].id) {
      return String(body.messages[0].id);
    }
    if (body.data && typeof body.data === 'object') {
      if (Array.isArray(body.data.messages) && body.data.messages[0] && body.data.messages[0].id) {
        return String(body.data.messages[0].id);
      }
      if (body.data.waMessageId) return String(body.data.waMessageId);
      if (body.data.id) return String(body.data.id);
    }
    return String(body.messageId || body.wamid || body.waMessageId || body.id || '');
  }

  function isImplicitSuccess_(body) {
    var status = String((body && body.status) || '').toLowerCase();
    return body && (body.success === true || /^(sent|success|ok|queued|accepted)$/.test(status));
  }

  function isRetryable_(status, detail) {
    var haystack = String(detail || '').toLowerCase();
    if (status === 429 || status === 408 || status >= 500 || status === 0) return true;
    if (/timeout|timed out|rate limit|temporarily|try again|econnreset|socket/.test(haystack)) return true;
    if (/invalid phone|not a valid|template not|does not exist|insufficient|payment_required|unauthorized|forbidden|parameter/.test(haystack)) {
      return false;
    }
    return false;
  }

  function classifyFailReason_(status, detail, messageType) {
    var haystack = String(detail || '').toLowerCase();
    if (status === 401 || status === 403 || /unauthorized|api key/.test(haystack)) return 'auth';
    if (/insufficient|wallet|credit|payment_required/.test(haystack)) return 'credits';
    if (/invalid phone|unspecified_phone/.test(haystack)) return 'invalid_phone';
    if (/template/.test(haystack) && /not|invalid|rejected|paused/.test(haystack)) return 'invalid_template';
    if (/media|attachment|header|document|image/.test(haystack) && /invalid|failed|unsupported/.test(haystack)) {
      return 'invalid_attachment';
    }
    if (status === 429) return 'rate_limit';
    if (status === 0) return 'network';
    if (messageType === 'template' && /variable|parameter/.test(haystack)) return 'invalid_variable';
    return 'api_error';
  }

  function parseWalletNumber_(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      var n = Number(value);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function normalizeTemplateList_(payload) {
    var list = [];
    if (Array.isArray(payload)) list = payload;
    else if (payload && Array.isArray(payload.results)) list = payload.results;
    else if (payload && Array.isArray(payload.data)) list = payload.data;
    else if (payload && Array.isArray(payload.templates)) list = payload.templates;
    else if (payload && Array.isArray(payload.items)) list = payload.items;

    return list
      .map(function (item) {
        return normalizeTemplate_(item);
      })
      .filter(function (item) {
        return item && item.name;
      });
  }

  function normalizeTemplate_(record, fallbackName, fallbackLanguage) {
    if (!record) return null;
    var nested = record.template && typeof record.template === 'object' ? record.template : record;
    var name = nested.name || record.name || fallbackName || '';
    if (!name) return null;
    var status = String(nested.status || record.status || '').toUpperCase();
    if (!status) status = 'APPROVED';
    var components = nested.components || record.components || [];
    var body = '';
    var headerFormat = 'TEXT';
    var variables = [];
    for (var i = 0; i < components.length; i++) {
      var component = components[i] || {};
      var type = String(component.type || '').toUpperCase();
      if (type === 'BODY') {
        body = component.text || '';
        variables = extractPlaceholders_(body);
        if ((!variables.length) && component.example && component.example.body_text && component.example.body_text[0]) {
          variables = component.example.body_text[0].map(function (_, index) {
            return String(index + 1);
          });
        }
      }
      if (type === 'HEADER') {
        headerFormat = String(component.format || (component.text ? 'TEXT' : 'NONE')).toUpperCase();
      }
    }
    var usable = isUsableStatus_(status);
    return {
      id: nested.id || record.id || name,
      name: name,
      language: nested.language || record.language || fallbackLanguage || 'en',
      category: nested.category || record.category || '',
      status: status,
      rejectionReason: nested.rejected_reason || nested.rejectionReason || '',
      components: components,
      body: body,
      headerFormat: headerFormat,
      variables: variables,
      usable: usable
    };
  }

  function extractPlaceholders_(text) {
    var matches = String(text || '').match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    var seen = {};
    var out = [];
    for (var i = 0; i < matches.length; i++) {
      var name = matches[i].replace(/\{\{|\}\}/g, '').trim();
      if (!seen[name]) {
        seen[name] = true;
        out.push(name);
      }
    }
    return out;
  }

  function isUsableStatus_(status) {
    return /APPROVED|ACTIVE|ENABLED|OK/.test(String(status || '').toUpperCase());
  }

  return {
    isConfigured: isConfigured,
    request: request_,
    getAccountStatus: getAccountStatus,
    getCredits: getCredits,
    getTemplates: getTemplates,
    getTemplateDetail: getTemplateDetail,
    sendTemplateMessage: sendTemplateMessage,
    sendMediaTemplateMessage: sendMediaTemplateMessage,
    fetchAllSends: fetchAllSends,
    extractPlaceholders: extractPlaceholders_,
    isUsableStatus: isUsableStatus_,
    buildHeaderComponent: buildHeaderComponent_,
    normalizeTemplate: normalizeTemplate_
  };
})();

function friendlyNetworkError_(error) {
  var message = String(error && error.message ? error.message : error);
  if (/address unavailable|dns|unknown host/i.test(message)) {
    return 'Unable to reach wa.sheetomatic.com. Check your internet connection and try again.';
  }
  if (/timeout|timed out/i.test(message)) {
    return 'The WhatsApp service took too long to respond. Please try again in a moment.';
  }
  return 'Unable to connect to the WhatsApp service. Please verify your API credentials and try again.';
}

function friendlyApiError_(detail, status, raw) {
  var haystack = String(detail || raw || '').toLowerCase();
  if (status === 401 || status === 403 || /unauthorized|invalid api/i.test(haystack)) {
    return 'The WhatsApp service rejected the API key. Open Settings and paste the key from wa.sheetomatic.com → Integrations → API Keys.';
  }
  if (/unspecified_phone_number|x-phone-id|phone id/i.test(haystack)) {
    return 'Phone ID is missing or incorrect. Copy the active Cloud Phone ID from wa.sheetomatic.com → Connected Accounts.';
  }
  if (/payment_required|insufficient|wallet/i.test(haystack)) {
    return 'WhatsApp wallet balance is too low. Top up credits at wa.sheetomatic.com and try again.';
  }
  if (/template/i.test(haystack) && /not exist|not found|rejected|paused|pending/i.test(haystack)) {
    return 'This WhatsApp template is not approved or is not available on the connected account.';
  }
  if (/24 hour|re-engagement|131047/i.test(haystack)) {
    return 'Free-text messages need an active 24-hour chat window. Broadcasts must use an approved template.';
  }
  if (status === 429) {
    return 'The WhatsApp service is rate-limiting requests. The campaign will retry automatically.';
  }
  if (status >= 500) {
    return 'The WhatsApp service had a temporary problem. This recipient will be retried.';
  }
  var cleaned = String(detail || '').replace(/<[^>]+>/g, '').trim();
  if (cleaned && cleaned.length < 280 && !/typeerror|undefined|exception:/i.test(cleaned)) {
    return cleaned;
  }
  return 'The WhatsApp service could not send this message. See Logs for technical details.';
}
