/**
 * In-sheet KPI dashboard for operators watching a large campaign.
 */

var DashboardService = (function () {
  function render() {
    var sheet = SheetService.ensureSheet(SHEET_NAMES.DASHBOARD, ['WhatsApp Broadcast Master']);
    sheet.clear();
    sheet.setHiddenGridlines(true);
    sheet.setColumnWidth(1, 28);
    sheet.setColumnWidths(2, 4, 170);
    sheet.setColumnWidth(6, 28);
    sheet.setColumnWidths(7, 4, 160);

    var mode = getOperationMode_();
    var status = CampaignService.statusPayload();
    var contacts = SheetService.readObjects(SHEET_NAMES.CONTACTS);
    var classified = PhoneService.classify(contacts.map(function (row) {
      var phoneCol = firstPhoneColumn_(row);
      return phoneCol ? row[phoneCol] : row.Phone;
    }), getDefaultCountryCode_());
    var campaign = status.campaign;
    var wallet = configGet_(CONFIG_KEYS.LAST_WALLET_BALANCE, '');

    sheet.getRange('B2:E2').merge().setValue(DEFAULTS.PRODUCT_NAME).setFontFamily('Arial').setFontSize(22).setFontWeight('bold').setFontColor('#0f172a');
    sheet.getRange('B3:E3').merge().setValue(DEFAULTS.PRODUCT_SUBTITLE).setFontColor('#64748b').setFontSize(11);

    var banner = mode === 'MOCK'
      ? 'DEMO / MOCK MODE — no real WhatsApp messages are sent.'
      : 'PRODUCTION MODE — approved templates are sent through wa.sheetomatic.com.';
    sheet.getRange('B4:E4').merge().setValue(banner);
    sheet.getRange('B4').setFontWeight('bold').setFontColor(mode === 'MOCK' ? '#9a3412' : '#166534');
    sheet.getRange('B4:E4').setBackground(mode === 'MOCK' ? '#ffedd5' : '#dcfce7');

    var kpis = [
      ['Total Contacts', classified.total, '#eff6ff'],
      ['Valid Contacts', classified.valid.length, '#dcfce7'],
      ['Invalid Contacts', classified.invalid.length + classified.missing.length, '#fee2e2'],
      ['Duplicates', classified.duplicates.length, '#fce7f3'],
      ['Messages Queued', campaign ? campaign.total : 0, '#eef2ff'],
      ['Messages Sent', campaign ? campaign.sent : 0, '#dcfce7'],
      ['Messages Failed', campaign ? campaign.failed : 0, '#fee2e2'],
      ['Messages Pending', campaign ? campaign.pending : 0, '#fef3c7']
    ];
    for (var i = 0; i < kpis.length; i++) {
      var col = 2 + (i % 4);
      var row = i < 4 ? 6 : 9;
      paintKpi_(sheet, row, col, kpis[i][0], kpis[i][1], kpis[i][2]);
    }

    sheet.getRange('B12').setValue('Campaign Progress').setFontWeight('bold').setFontSize(13);
    var percent = campaign ? campaign.percent : 0;
    var processed = campaign ? campaign.processed : 0;
    var total = campaign ? campaign.total : 0;
    var filled = Math.round(percent / 5);
    var bar = repeat_('█', filled) + repeat_('░', 20 - filled) + '  ' + percent + '%';
    sheet.getRange('B13:E13').merge().setValue(bar).setFontFamily('Consolas').setFontSize(14).setBackground('#f8fafc');
    sheet.getRange('B14:E14').merge().setValue(
      (processed || 0).toLocaleString() + ' / ' + (total || 0).toLocaleString() + ' processed    Sent: ' +
      (campaign ? campaign.sent : 0) + '    Failed: ' + (campaign ? campaign.failed : 0) + '    Pending: ' + (campaign ? campaign.pending : 0)
    ).setFontColor('#334155');

    sheet.getRange('B16').setValue('Active campaign').setFontWeight('bold');
    sheet.getRange('B17').setValue('Name');
    sheet.getRange('C17').setValue(campaign ? campaign.name : '—');
    sheet.getRange('B18').setValue('Status');
    sheet.getRange('C18').setValue(campaign ? campaign.status : 'IDLE');
    sheet.getRange('B19').setValue('Template');
    sheet.getRange('C19').setValue(campaign ? campaign.template : '—');
    sheet.getRange('B20').setValue('Credits used');
    sheet.getRange('C20').setValue(campaign ? campaign.creditsUsed : 0);
    sheet.getRange('B21').setValue('Wallet (last check)');
    sheet.getRange('C21').setValue(wallet === '' ? 'Not checked yet' : wallet);
    sheet.getRange('B22').setValue('Last activity');
    sheet.getRange('C22').setValue(nowPretty_());

    sheet.getRange('B24').setValue('How to use').setFontWeight('bold');
    sheet.getRange('B25:E28').merge().setWrap(true).setVerticalAlignment('top').setValue(
      '1. Open Broadcast Master from the menu.\n' +
      '2. Connect your Sheetomatic WhatsApp account and run Test Connection.\n' +
      '3. Load approved templates, map variables, optionally attach a file.\n' +
      '4. Send a test message, then launch. Large campaigns continue automatically in batches.'
    );

    try {
      var charts = sheet.getCharts();
      charts.forEach(function (chart) {
        sheet.removeChart(chart);
      });
      sheet.getRange('G6').setValue('Status').setFontWeight('bold');
      sheet.getRange('H6').setValue('Count').setFontWeight('bold');
      sheet.getRange('G7:H10').setValues([
        ['Sent', campaign ? campaign.sent : 0],
        ['Failed', campaign ? campaign.failed : 0],
        ['Pending', campaign ? campaign.pending : 0],
        ['Skipped', campaign ? campaign.skipped : 0]
      ]);
      var chart = sheet.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(sheet.getRange('G6:H10'))
        .setOption('title', 'Message status')
        .setOption('legend.textStyle.fontSize', 10)
        .setPosition(6, 7, 0, 0)
        .build();
      sheet.insertChart(chart);
    } catch (error) {
      // Charts are optional on a fresh sheet.
    }

    return { ok: true };
  }

  function paintKpi_(sheet, row, col, label, value, bg) {
    var cell = sheet.getRange(row, col);
    cell.setValue(label + '\n' + value);
    cell.setBackground(bg);
    cell.setFontWeight('bold');
    cell.setWrap(true);
    cell.setVerticalAlignment('middle');
    sheet.setRowHeight(row, 64);
  }

  function repeat_(ch, count) {
    var out = '';
    for (var i = 0; i < count; i++) out += ch;
    return out;
  }

  function firstPhoneColumn_(row) {
    var keys = Object.keys(row || {});
    for (var i = 0; i < keys.length; i++) {
      if (/phone|mobile|whatsapp/i.test(keys[i])) return keys[i];
    }
    return 'Phone';
  }

  return { render: render };
})();
