/**
 * DEMO / MOCK MODE — never calls the live WhatsApp API.
 * Used for demos, QA, and 10,000-recipient architecture tests.
 */

var MockApi = (function () {
  var TEMPLATES = [
    {
      id: 'mock-quotation_update',
      name: 'quotation_update',
      language: 'en',
      category: 'UTILITY',
      status: 'APPROVED',
      headerFormat: 'DOCUMENT',
      body: 'Hello {{1}},\n\nYour quotation {{2}} dated {{3}} is ready.',
      variables: ['1', '2', '3'],
      usable: true,
      components: [
        { type: 'HEADER', format: 'DOCUMENT' },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nYour quotation {{2}} dated {{3}} is ready.',
          example: { body_text: [['Rajesh', 'Q-1025', '14 Sep 2026']] }
        },
        { type: 'FOOTER', text: 'Sheetomatic' }
      ]
    },
    {
      id: 'mock-order_ready',
      name: 'order_ready',
      language: 'en',
      category: 'UTILITY',
      status: 'APPROVED',
      headerFormat: 'TEXT',
      body: 'Hi {{1}}, your order {{2}} is ready for dispatch. Amount due: {{3}}.',
      variables: ['1', '2', '3'],
      usable: true,
      components: [
        {
          type: 'BODY',
          text: 'Hi {{1}}, your order {{2}} is ready for dispatch. Amount due: {{3}}.'
        }
      ]
    },
    {
      id: 'mock-appointment_reminder',
      name: 'appointment_reminder',
      language: 'en',
      category: 'UTILITY',
      status: 'APPROVED',
      headerFormat: 'TEXT',
      body: 'Dear {{1}}, reminder: your appointment on {{2}} at {{3}} is confirmed.',
      variables: ['1', '2', '3'],
      usable: true,
      components: [
        {
          type: 'BODY',
          text: 'Dear {{1}}, reminder: your appointment on {{2}} at {{3}} is confirmed.'
        }
      ]
    },
    {
      id: 'mock-pending_template',
      name: 'seasonal_offer',
      language: 'en',
      category: 'MARKETING',
      status: 'PENDING',
      headerFormat: 'IMAGE',
      body: 'Hello {{1}}, enjoy {{2}} off this week.',
      variables: ['1', '2'],
      usable: false,
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'Hello {{1}}, enjoy {{2}} off this week.' }
      ]
    }
  ];

  function handle(method, endpoint, body) {
    var path = String(endpoint || '');
    if (path.indexOf(DOCUMENTED_ENDPOINTS.WALLET) !== -1) {
      return wallet_();
    }
    if (path.indexOf(DOCUMENTED_ENDPOINTS.TEMPLATES_FOR_SEND) !== -1) {
      return {
        ok: true,
        status: 200,
        body: TEMPLATES.filter(function (item) {
          return item.usable;
        }).map(function (item) {
          return { name: item.name, language: item.language, category: item.category };
        }),
        raw: 'mock'
      };
    }
    if (path.indexOf(DOCUMENTED_ENDPOINTS.TEMPLATE_DETAIL) !== -1) {
      return detail_(body);
    }
    if (path.indexOf(DOCUMENTED_ENDPOINTS.TEMPLATES) !== -1) {
      return { ok: true, status: 200, body: { results: TEMPLATES, total: TEMPLATES.length }, raw: 'mock' };
    }
    if (path.indexOf(DOCUMENTED_ENDPOINTS.SEND) !== -1) {
      return send_(body);
    }
    return {
      ok: false,
      status: 404,
      body: {},
      raw: '',
      error: 'Mock Mode does not implement this endpoint: ' + path
    };
  }

  function wallet_() {
    return {
      ok: true,
      status: 200,
      body: {
        balance: 15000,
        pendingBalance: 0,
        currency: 'INR',
        phoneNumberId: 'MOCK-PHONE'
      },
      raw: 'mock-wallet'
    };
  }

  function detail_(body) {
    var name = body && body.name;
    var language = (body && body.language) || 'en';
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].name === name && TEMPLATES[i].language === language) {
        return { ok: true, status: 200, body: TEMPLATES[i], raw: 'mock-detail' };
      }
    }
    return {
      ok: false,
      status: 404,
      body: {},
      raw: '',
      error: 'Template was not found on the connected WhatsApp account.'
    };
  }

  function send_(body) {
    var to = body && body.to;
    var message = body && body.message;
    if (!to) {
      return fail_(400, 'Phone number is missing.', false);
    }
    if (String(to).indexOf('12345') !== -1 || String(to).length < 10) {
      return fail_(400, 'Phone number is not a valid WhatsApp number.', false);
    }
    if (!message || message.type !== 'template' || !message.template || !message.template.name) {
      return fail_(400, 'Broadcasts must use an approved WhatsApp template.', false);
    }
    var templateName = message.template.name;
    var found = null;
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].name === templateName) found = TEMPLATES[i];
    }
    if (!found) {
      return fail_(400, 'Template was not found on the connected WhatsApp account.', false);
    }
    if (!found.usable) {
      return fail_(400, 'This WhatsApp template is not approved.', false);
    }

    var seed = hash_(String(to) + templateName);
    if (seed % 37 === 0) {
      return fail_(429, 'Rate limited by the WhatsApp service.', true);
    }
    if (seed % 29 === 0) {
      return fail_(500, 'Temporary WhatsApp service error.', true);
    }
    if (seed % 23 === 0) {
      return fail_(400, 'Template parameter is invalid for this recipient.', false);
    }

    var id = 'wamid.mock.' + Utilities.getUuid().replace(/-/g, '').slice(0, 18);
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        messages: [{ id: id }],
        status: 'sent'
      },
      raw: '{"success":true,"messages":[{"id":"' + id + '"}]}'
    };
  }

  function fail_(status, error, retryable) {
    return {
      ok: false,
      status: status,
      body: { success: false, message: error, retryable: retryable },
      raw: error,
      error: error
    };
  }

  function hash_(text) {
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      total = (total + text.charCodeAt(i) * (i + 1)) % 997;
    }
    return total;
  }

  function catalog() {
    return TEMPLATES.slice();
  }

  return {
    handle: handle,
    catalog: catalog
  };
})();
