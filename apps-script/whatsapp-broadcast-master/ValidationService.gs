/**
 * Pre-flight campaign validation for business users.
 */

var ValidationService = (function () {
  function validate(draft, options) {
    options = options || {};
    SheetService.ensureWorkbook();
    var checks = [];
    var mode = getOperationMode_();

    checks.push(check_('WhatsApp account connected', mode === 'MOCK' || SheetomaticApi.isConfigured(), mode === 'MOCK' ? 'Mock Mode is using a simulated account.' : 'Add your API key from wa.sheetomatic.com.'));
    checks.push(check_('API credentials valid', true, 'Run Test Connection to confirm live credentials.'));

    var credits = SheetomaticApi.getCredits();
    var creditOk = credits.ok;
    checks.push(check_('API configuration valid', creditOk || mode === 'MOCK', credits.error || 'Wallet reachable.'));

    var templateOk = Boolean(draft && draft.templateName);
    checks.push(check_('Template selected', templateOk, 'Choose an approved WhatsApp template.'));

    var template = null;
    if (templateOk) {
      var detail = TemplateService.detail(draft.templateName, draft.language || 'en');
      if (detail.ok) template = detail.detail;
      var usable = template && (template.usable || SheetomaticApi.isUsableStatus(template.status));
      checks.push(check_('Template approved / usable', Boolean(usable), usable ? template.status : (detail.error || 'Template is not approved.')));
    } else {
      checks.push(check_('Template approved / usable', false, 'Select a template first.'));
    }

    var phoneColumn = draft && draft.phoneColumn;
    checks.push(check_('Phone column selected', Boolean(phoneColumn), 'Tell us which column contains WhatsApp numbers.'));

    var contacts = SheetService.readObjects(SHEET_NAMES.CONTACTS);
    checks.push(check_('Recipients available', contacts.length > 0, contacts.length ? contacts.length + ' rows in Contacts.' : 'Add contacts to the Contacts sheet.'));

    var classified = { total: 0, valid: [], invalid: [], missing: [], duplicates: [] };
    if (phoneColumn && contacts.length) {
      classified = PhoneService.classify(
        contacts.map(function (row) {
          return row[phoneColumn];
        }),
        getDefaultCountryCode_()
      );
    }
    checks.push(check_('Valid phone numbers', classified.valid.length > 0, classified.valid.length + ' valid, ' + (classified.invalid.length + classified.missing.length) + ' invalid, ' + classified.duplicates.length + ' duplicates.'));

    var mapping = (draft && draft.mapping) || {};
    var requiredVars = (template && template.variables) || [];
    var mappingMissing = requiredVars.filter(function (name) {
      return !mapping[name];
    });
    checks.push(check_('Required variables mapped', mappingMissing.length === 0, mappingMissing.length ? 'Map ' + mappingMissing.map(function (name) { return '{{' + name + '}}'; }).join(', ') : 'All template variables are mapped.'));

    var attachment = AttachmentService.inspect(draft && draft.attachment);
    var attachmentOk = attachment.ok;
    if (attachment.ok && attachment.present && template) {
      var compatible = AttachmentService.compatibleWithTemplate(attachment.media, template);
      attachmentOk = compatible.ok;
      if (!compatible.ok) attachment.error = compatible.error;
    }
    checks.push(check_('Attachment valid if selected', attachmentOk, attachment.present ? (attachment.error || attachment.label) : 'No attachment (optional).'));

    var sizeOk = classified.valid.length <= DEFAULTS.MAX_CAMPAIGN_SIZE;
    checks.push(check_('Campaign size within allowed limits', sizeOk, classified.valid.length + ' / ' + DEFAULTS.MAX_CAMPAIGN_SIZE + ' maximum per campaign.'));

    var requiredCredits = classified.valid.length;
    var available = credits.ok ? credits.balance : Number(configGet_(CONFIG_KEYS.LAST_WALLET_BALANCE, 0));
    var creditsOk = mode === 'MOCK' ? true : (credits.ok && available >= requiredCredits);
    checks.push(check_(
      'Sufficient credits',
      creditsOk,
      creditsOk
        ? 'Required: ' + requiredCredits + '. Available: ' + (credits.ok ? available : 'unknown') + '.'
        : 'Insufficient WhatsApp credits. Required: ' + requiredCredits + '. Available: ' + (credits.ok ? available : 0) + '.'
    ));

    var failed = checks.filter(function (item) { return !item.ok; });
    return {
      ok: failed.length === 0,
      ready: failed.length === 0 && classified.valid.length > 0,
      checks: checks,
      mode: mode,
      template: template,
      attachment: attachment,
      classified: classified,
      contacts: contacts,
      requiredCredits: requiredCredits,
      availableCredits: credits.ok ? credits.balance : null,
      currency: credits.ok ? credits.currency : '',
      creditsError: credits.ok ? '' : credits.error,
      campaignName: (draft && draft.campaignName) || 'Untitled campaign'
    };
  }

  function check_(label, ok, detail) {
    return { label: label, ok: Boolean(ok), detail: detail || '' };
  }

  return { validate: validate };
})();
