/**
 * In-app help for business users. Templates are not auto-approved.
 */

var HelpService = (function () {
  var TOPICS = [
    {
      title: 'Connect your account',
      body: 'Open Settings and paste the API key from wa.sheetomatic.com → Integrations → API Keys. Also copy the active Cloud Phone ID from Connected Accounts. The key is stored in Script Properties, not in the spreadsheet cells.'
    },
    {
      title: 'Prepare the Contacts sheet',
      body: 'Phone is mandatory. You may keep your own column names. Extra columns are allowed and can be mapped to template variables. Invalid and duplicate numbers are skipped, never sent.'
    },
    {
      title: 'How templates work',
      body: 'WhatsApp only delivers approved templates for broadcasts. This app does not create or approve templates. Approve them in Meta / the Sheetomatic portal first, then click Refresh Templates.'
    },
    {
      title: 'Variable mapping',
      body: 'If a template says Hello {{1}}, Your quotation {{2}} dated {{3}} is ready — map {{1}} to Name, {{2}} to the quotation column, {{3}} to the date column. Preview uses a real Contacts row.'
    },
    {
      title: 'Optional attachments',
      body: 'Attach a file only when the selected template has an IMAGE, DOCUMENT, or VIDEO header. Provide a public https URL or a Google Drive file ID. If you skip attachment, the template is sent normally.'
    },
    {
      title: 'Test before launch',
      body: 'Use Test Mode to send one message to a number you control. Confirm the WhatsApp preview, variables, and attachment before a large campaign.'
    },
    {
      title: 'Launch a campaign',
      body: 'Validate, confirm the recipient count, then Start. For 10,000 recipients the app queues every message and sends in batches automatically until finished. You do not press Start repeatedly.'
    },
    {
      title: 'Credits',
      body: 'Credits come from your Sheetomatic WhatsApp wallet at wa.sheetomatic.com. If required credits are greater than available balance, the campaign will not start.'
    },
    {
      title: 'Pause and resume',
      body: 'Pause stops new sends. Already sent messages stay sent. Resume continues from PENDING / RETRY queue rows and will not resend SENT recipients.'
    },
    {
      title: 'Troubleshoot failures',
      body: 'Open Logs for HTTP status and error text (credentials are redacted). Common issues: empty wallet, wrong Phone ID, unapproved template, invalid number, or a template that does not accept the attachment type.'
    },
    {
      title: 'Mock vs Production',
      body: 'Mock Mode simulates sends so you can rehearse a 10,000-recipient campaign safely. Production Mode uses your live Sheetomatic API and requires an extra confirmation.'
    }
  ];

  function html() {
    return TOPICS;
  }

  function sheetRows() {
    return TOPICS.map(function (topic) {
      return [topic.title, topic.body];
    });
  }

  return { html: html, sheetRows: sheetRows };
})();
