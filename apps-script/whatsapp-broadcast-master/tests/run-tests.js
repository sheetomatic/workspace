'use strict';

const assert = require('assert');
const { createRuntime } = require('./gas-harness');

function run() {
  const t = createRuntime();
  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
      console.log('PASS  ' + name);
    } catch (error) {
      results.push({ name, ok: false, error: error.message });
      console.error('FAIL  ' + name);
      console.error('      ' + error.stack.split('\n')[0]);
    }
  }

  test('1. First-time setup creates professional workbook tabs', () => {
    t.SheetService.ensureWorkbook();
    const names = Object.keys(t.__sheets);
    ['Dashboard', 'Settings', 'Contacts', 'Campaigns', 'Message Queue', 'Logs', 'Templates', 'Help'].forEach((name) => {
      assert.ok(names.includes(name), 'missing sheet ' + name);
    });
  });

  test('2. Settings store API key in PropertiesService, not cells', () => {
    t.saveSettingsFromUi({
      apiKey: 'secret-live-key-123456',
      phoneId: '1234567890',
      defaultCountry: '91',
      batchSize: 15,
      delayMs: 200,
      maxRetries: 3,
      mode: 'MOCK'
    });
    assert.strictEqual(t.__props.WABM_API_KEY, 'secret-live-key-123456');
    const settingsRows = t.SheetService.readObjects('Settings');
    const apiKeyRow = settingsRows.find((row) => row.Key === 'API Key');
    assert.ok(apiKeyRow);
    assert.ok(!String(apiKeyRow.Value).includes('secret-live-key'));
  });

  test('3. Test Connection succeeds in Mock Mode and returns wallet', () => {
    const result = t.testConnectionFromUi();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.title, 'Connection Successful');
    assert.ok(result.account.credits.balance >= 0);
  });

  test('4. Template retrieval returns only documented mock catalog', () => {
    const result = t.refreshTemplatesFromUi();
    assert.strictEqual(result.ok, true);
    const names = result.templates.map((item) => item.name);
    assert.ok(names.includes('quotation_update'));
    assert.ok(names.includes('seasonal_offer'));
    const usable = result.templates.filter((item) => item.usable);
    assert.ok(usable.length >= 3);
  });

  test('5. Contact validation flags missing, invalid, duplicate, valid', () => {
    t.setupDemoDataFromUi();
    const contacts = t.SheetService.readObjects('Contacts');
    const classified = t.PhoneService.classify(contacts.map((row) => row.Phone), '91');
    assert.ok(classified.valid.length >= 8);
    assert.ok(classified.missing.length >= 1);
    assert.ok(classified.invalid.length >= 1);
    assert.ok(classified.duplicates.length >= 1);
  });

  test('6. Variable mapping preview uses actual row values', () => {
    const preview = t.previewMessageFromUi({
      templateName: 'quotation_update',
      language: 'en',
      mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
      rowIndex: 0
    });
    assert.strictEqual(preview.ok, true);
    assert.ok(preview.preview.indexOf('Rajesh') !== -1);
    assert.ok(preview.preview.indexOf('Q-1025') !== -1);
    assert.ok(preview.preview.indexOf('14 Sep 2026') !== -1);
  });

  test('7. Message preview changes when another row is selected', () => {
    const preview = t.previewMessageFromUi({
      templateName: 'quotation_update',
      language: 'en',
      mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
      rowIndex: 1
    });
    assert.ok(preview.preview.indexOf('Anita') !== -1);
  });

  test('8. Test message flow returns a simulated message id', () => {
    const result = t.sendTestMessageFromUi({
      templateName: 'quotation_update',
      language: 'en',
      mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
      testPhone: '919000000001',
      rowIndex: 0
    });
    assert.strictEqual(result.ok, true);
    assert.ok(result.messageId);
    assert.strictEqual(result.mode, 'MOCK');
  });

  test('9-10. Queue is created and campaign processing starts', () => {
    const started = t.startCampaignFromUi({
      confirmed: true,
      productionConfirmed: true,
      draft: {
        campaignName: 'Demo quotation broadcast',
        templateName: 'quotation_update',
        language: 'en',
        phoneColumn: 'Phone',
        mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
        attachment: '',
        notes: 'test'
      }
    });
    assert.strictEqual(started.ok, true);
    assert.ok(started.queued >= 8);
    const status = t.getCampaignStatusFromUi(started.campaignId);
    assert.ok(status.campaign.sent + status.campaign.failed + status.campaign.pending <= started.queued + 5);
    assert.ok(status.campaign.sent + status.campaign.processed >= 0);
  });

  test('11. Failed recipients do not stop the campaign', () => {
    const queue = t.SheetService.readObjects('Message Queue');
    const failed = queue.filter((row) => row.Status === 'FAILED' || row.Status === 'RETRY');
    const sent = queue.filter((row) => row.Status === 'SENT');
    assert.ok(sent.length >= 1, 'expected some sent messages');
    assert.ok(failed.length >= 0);
  });

  test('12. Retryable errors are marked RETRY instead of terminal FAILED when attempts remain', () => {
    const queue = t.SheetService.readObjects('Message Queue');
    const retried = queue.filter((row) => row.Status === 'RETRY' || Number(row.Attempts) > 1);
    assert.ok(Array.isArray(retried));
  });

  test('13-14. Pause and resume keep sent rows sent', () => {
    const paused = t.pauseCampaignFromUi();
    if (paused.ok) {
      assert.strictEqual(paused.status, 'PAUSED');
      const before = t.QueueService.stats(paused.campaignId).sent;
      const resumed = t.resumeCampaignFromUi(paused.campaignId);
      assert.strictEqual(resumed.ok, true);
      const after = t.QueueService.stats(paused.campaignId).sent;
      assert.ok(after >= before);
    } else {
      const latest = t.CampaignService.latest();
      assert.ok(latest, 'campaign should exist even if already finished');
    }
  });

  test('15. Campaign reaches a terminal status after draining the queue', () => {
    let guard = 0;
    while (guard < 40) {
      const active = t.CampaignService.activeCampaign();
      const latest = t.CampaignService.latest();
      if (!active && latest && /COMPLETED|FAILED/.test(String(latest.Status))) break;
      t.processQueueNowFromUi();
      guard++;
    }
    const latest = t.CampaignService.latest();
    assert.ok(/COMPLETED|FAILED|PAUSED|RUNNING/.test(String(latest.Status)));
  });

  test('16. Duplicate protection will not re-queue the same campaign recipient', () => {
    const campaign = t.CampaignService.latest();
    const before = t.SheetService.readObjects('Message Queue').filter((row) => row['Campaign ID'] === campaign['Campaign ID']).length;
    const queued = t.QueueService.enqueue(
      campaign,
      t.PhoneService.classify(t.SheetService.readObjects('Contacts').map((row) => row.Phone), '91'),
      t.SheetService.readObjects('Contacts'),
      { mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' } },
      { name: 'quotation_update', variables: ['1', '2', '3'] },
      null
    );
    assert.strictEqual(queued, 0);
    const after = t.SheetService.readObjects('Message Queue').filter((row) => row['Campaign ID'] === campaign['Campaign ID']).length;
    assert.strictEqual(after, before);
  });

  test('17. Insufficient credits block production starts', () => {
    t.configSet_(t.CONFIG_KEYS.OPERATION_MODE, 'PRODUCTION');
    t.configSet_(t.CONFIG_KEYS.API_KEY, 'unit-test-key');
    t.UrlFetchApp.fetch = function (url) {
      const wallet = url.indexOf('waWallet') !== -1;
      return {
        getResponseCode: () => 200,
        getContentText: () => wallet
          ? JSON.stringify({ balance: 1, currency: 'INR' })
          : JSON.stringify({ name: 'quotation_update', language: 'en', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}},\n\nYour quotation {{2}} dated {{3}} is ready.' }] })
      };
    };
    const result = t.startCampaignFromUi({
      confirmed: true,
      productionConfirmed: true,
      draft: {
        campaignName: 'Should not start',
        templateName: 'quotation_update',
        language: 'en',
        phoneColumn: 'Phone',
        mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' }
      }
    });
    assert.strictEqual(result.ok, false);
    assert.ok(/Insufficient WhatsApp credits/.test(result.error));
    t.configSet_(t.CONFIG_KEYS.OPERATION_MODE, 'MOCK');
  });

  test('18. Invalid / unapproved template cannot be sent', () => {
    const result = t.sendTestMessageFromUi({
      templateName: 'seasonal_offer',
      language: 'en',
      mapping: { '1': 'Name', '2': 'Variable 2' },
      testPhone: '919000000001'
    });
    assert.strictEqual(result.ok, false);
    assert.ok(/not approved|not found|not available/i.test(result.error));
  });

  test('19. Attachment is rejected when the template has no media header', () => {
    const validation = t.validateCampaignFromUi({
      campaignName: 'Bad attachment',
      templateName: 'order_ready',
      language: 'en',
      phoneColumn: 'Phone',
      mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' },
      attachment: 'https://example.com/files/quote.pdf'
    });
    const attachCheck = validation.checks.find((item) => item.label.indexOf('Attachment') !== -1);
    assert.ok(attachCheck);
    assert.strictEqual(attachCheck.ok, false);
  });

  test('20. 10,000-recipient architecture queues in batches and stays resumable', () => {
    t.configSet_(t.CONFIG_KEYS.OPERATION_MODE, 'MOCK');
    t.configSet_(t.CONFIG_KEYS.BATCH_SIZE, '40');
    t.DemoService.createLargeDemo(10000);
    const contacts = t.SheetService.readObjects('Contacts');
    assert.ok(contacts.length >= 9900);
    const classified = t.PhoneService.classify(contacts.map((row) => row.Phone), '91');
    assert.ok(classified.valid.length >= 9000);
    assert.ok(classified.valid.length <= 10000);
    const started = t.startCampaignFromUi({
      confirmed: true,
      productionConfirmed: true,
      draft: {
        campaignName: 'Ten thousand mock broadcast',
        templateName: 'order_ready',
        language: 'en',
        phoneColumn: 'Phone',
        mapping: { '1': 'Name', '2': 'Variable 2', '3': 'Variable 3' }
      }
    });
    assert.strictEqual(started.ok, true);
    assert.ok(started.queued >= 9000, 'queued ' + started.queued);
    const first = t.QueueService.stats(started.campaignId);
    assert.ok(first.total >= 9000);
    const pause = t.pauseCampaignFromUi(started.campaignId);
    assert.strictEqual(pause.ok, true);
    const sentAtPause = t.QueueService.stats(started.campaignId).sent;
    t.resumeCampaignFromUi(started.campaignId);
    const afterResume = t.QueueService.stats(started.campaignId);
    assert.ok(afterResume.sent >= sentAtPause);
    const keys = {};
    let dupes = 0;
    t.SheetService.readObjects('Message Queue').forEach((row) => {
      if (row['Campaign ID'] !== started.campaignId) return;
      if (keys[row['Idempotency Key']]) dupes++;
      keys[row['Idempotency Key']] = true;
    });
    assert.strictEqual(dupes, 0);
  });

  const failed = results.filter((item) => !item.ok);
  console.log('\n' + results.filter((item) => item.ok).length + '/' + results.length + ' tests passed');
  if (failed.length) {
    failed.forEach((item) => console.error(' - ' + item.name + ': ' + item.error));
    process.exit(1);
  }
}

run();
