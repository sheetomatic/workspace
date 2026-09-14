/**
 * Demo contacts and demo campaign. Never sends real WhatsApp messages.
 */

var DemoService = (function () {
  function setupDemoData() {
    SheetService.ensureWorkbook();
    configSet_(CONFIG_KEYS.OPERATION_MODE, 'MOCK');
    var contacts = [
      ['919000000001', 'Rajesh Iyer', 'rajesh.demo@example.com', 'Rajesh', 'Q-1025', '14 Sep 2026', '', '', '', '', ''],
      ['919000000002', 'Anita Sharma', 'anita.demo@example.com', 'Anita', 'Q-1026', '14 Sep 2026', '', '', '', '', ''],
      ['919000000003', 'Mohammed Farhan', 'farhan.demo@example.com', 'Farhan', 'Q-1102', '15 Sep 2026', '', '', '', '', ''],
      ['919000000004', 'Priya Nair', 'priya.demo@example.com', 'Priya', 'INV-8891', '16 Sep 2026', '', '', '', '', ''],
      ['+91 90000 00005', 'Vikram Patel', 'vikram.demo@example.com', 'Vikram', 'Q-2044', '16 Sep 2026', '', '', '', '', ''],
      ['9000000006', 'Sonal Mehta', 'sonal.demo@example.com', 'Sonal', 'Q-2045', '17 Sep 2026', '', '', '', '', ''],
      ['', 'Missing Phone', 'missing.demo@example.com', 'Missing', 'Q-0000', '17 Sep 2026', '', '', '', '', ''],
      ['12345', 'Invalid Short', 'short.demo@example.com', 'Short', 'Q-0001', '17 Sep 2026', '', '', '', '', ''],
      ['919000000002', 'Duplicate Anita', 'dup.demo@example.com', 'Anita', 'Q-9999', '17 Sep 2026', '', '', '', '', ''],
      ['919000000010', 'Clinic Demo', 'clinic.demo@example.com', 'Dr Mehta', 'APT-18', '18 Sep 2026', '', '', '', '', ''],
      ['919000000011', 'Furniture Demo', 'furniture.demo@example.com', 'Karan', 'SO-441', '₹18,500', '', '', '', '', ''],
      ['919000000012', 'Jewellery Demo', 'jewel.demo@example.com', 'Neha', 'ORD-77', '18 Sep 2026', '', '', '', '', '']
    ];
    var sheet = SheetService.getSheet(SHEET_NAMES.CONTACTS);
    var last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, CONTACT_HEADERS.length).clearContent();
    sheet.getRange(2, 1, contacts.length, CONTACT_HEADERS.length).setValues(contacts);
    TemplateService.refresh();
    DashboardService.render();
    configSet_(CONFIG_KEYS.ONBOARDED, '1');
    return { ok: true, contacts: contacts.length, mode: 'MOCK' };
  }

  function createLargeDemo(count) {
    count = Math.min(DEFAULTS.MAX_CAMPAIGN_SIZE, Math.max(1, Number(count) || 10000));
    SheetService.ensureWorkbook();
    configSet_(CONFIG_KEYS.OPERATION_MODE, 'MOCK');
    var sheet = SheetService.getSheet(SHEET_NAMES.CONTACTS);
    var last = sheet.getLastRow();
    if (last > 1) sheet.deleteRows(2, last - 1);
    var CHUNK = 500;
    var written = 0;
    while (written < count) {
      var size = Math.min(CHUNK, count - written);
      var rows = [];
      for (var i = 0; i < size; i++) {
        var n = written + i + 1;
        var phone = '91' + ('9000000000' + n).slice(-10);
        if (n % 250 === 0) phone = '12345';
        if (n % 300 === 0) phone = '';
        rows.push([
          phone,
          'Demo Person ' + n,
          'demo' + n + '@example.com',
          'Guest ' + n,
          'Q-' + (1000 + n),
          '14 Sep 2026',
          '',
          '',
          '',
          '',
          ''
        ]);
      }
      sheet.getRange(written + 2, 1, rows.length, CONTACT_HEADERS.length).setValues(rows);
      written += size;
    }
    DashboardService.render();
    return { ok: true, contacts: count, mode: 'MOCK' };
  }

  function createDemoCampaign() {
    setupDemoData();
    var draft = {
      campaignName: 'Demo quotation broadcast',
      templateName: 'quotation_update',
      language: 'en',
      phoneColumn: 'Phone',
      mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
      attachment: '',
      notes: 'Created by Setup Demo Campaign. Mock Mode only.'
    };
    return { ok: true, draft: draft };
  }

  return {
    setupDemoData: setupDemoData,
    createLargeDemo: createLargeDemo,
    createDemoCampaign: createDemoCampaign
  };
})();
