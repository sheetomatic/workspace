# WhatsApp Broadcast Master

Send WhatsApp campaigns directly from Google Sheets, through the Sheetomatic Official API at [wa.sheetomatic.com](https://wa.sheetomatic.com).

This is a Google Apps Script product. Business users work in the spreadsheet. They do not need to know JavaScript, APIs, or queues.

```text
Google Sheets
    → WhatsApp Broadcast Master
    → Select recipients
    → Select approved template
    → Map {{1}} {{2}} {{3}} to sheet columns
    → Optional attachment
    → Validate + confirm
    → Queue (up to 10,000)
    → Batch processor
    → wa.sheetomatic.com API
    → Per-recipient tracking in the sheet
```

## What this app will not do

- It will not create or approve WhatsApp templates.
- It will not send to invalid, missing, or duplicate numbers.
- It will not start if WhatsApp credits are insufficient.
- It will not send 10,000 messages in one Apps Script run.
- Mock Mode will never call the live API.

## Prerequisites

1. The WhatsApp template is already approved in Meta / Sheetomatic.
2. You have an active Sheetomatic WhatsApp account.
3. The wallet at wa.sheetomatic.com has enough credits.
4. A Cloud WhatsApp phone is connected.
5. Attachment is optional and only works when the template has a media header.

## Install in Google Sheets

1. Create a Google Sheet while signed in as the Workspace account that should own it (for Sheetomatic, `projects@sheetomatic.com`).
2. Extensions → Apps Script.
3. Delete the stub `Code.gs`.
4. Copy every `.gs` and `.html` file from `apps-script/whatsapp-broadcast-master/` into the Apps Script project. Keep the same file names.
5. Save, then reload the Google Sheet.
6. Use the **WhatsApp Broadcast Master** menu → **Open Broadcast Master**.
7. Authorize the script when Google asks (Sheets, external requests, Drive for optional attachments).

### clasp (optional)

```bash
npm i -g @google/clasp
cp apps-script/whatsapp-broadcast-master/.clasp.json.example apps-script/whatsapp-broadcast-master/.clasp.json
cd apps-script/whatsapp-broadcast-master
clasp login
clasp create --type sheets --title "WhatsApp Broadcast Master"
clasp push
```

Then open the created spreadsheet and reload.

## Connect Sheetomatic

1. Open [API Keys](https://wa.sheetomatic.com/Integrations/ListApikey) and copy the key.
2. Open [Connected Accounts](https://wa.sheetomatic.com/ConnectedAccount) and copy the active Cloud Phone ID.
3. In Broadcast Master → Settings, paste both values.
4. Leave API Base URL as `https://wa.sheetomatic.com/api/v1` unless Sheetomatic support tells you otherwise.
5. Click **Test Connection**.

The API key is stored in Script Properties. It is not written into spreadsheet cells or logs.

## Documented API used

Official docs: https://wa.sheetomatic.com/Integrations/ApiDocumentation

| Purpose | Method | Endpoint |
|---|---|---|
| Send template | POST | `/whatsapp/meta/sendMessage` |
| List sendable templates | GET | `/messageTemplate/getTemplatesForSendMessage` |
| Template detail | POST | `/messageTemplate/getTemplateDetail` |
| Wallet / credits | GET | `/whatsapp/waWallet` |
| Fallback template list | POST | `/messageTemplate/getTemplates` |

Auth headers: `x-api-key`, `x-phone-id`.

Send body:

```json
{
  "to": "9198XXXXXXXX",
  "message": {
    "type": "template",
    "template": {
      "name": "quotation_update",
      "language": { "code": "en" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Rajesh" }
          ]
        }
      ]
    }
  }
}
```

If the approved template has an IMAGE / DOCUMENT / VIDEO header, an optional `header` component with a public `link` is added. This app does not invent undocumented upload endpoints.

There is no documented per-message delivery polling API, so **Delivered** stays unused unless the send response already implies it. **Sent** means the Sheetomatic API accepted the message.

## First campaign

1. **Setup Demo Data** (optional, Mock Mode).
2. Refresh templates.
3. Create campaign → choose phone column → map variables → preview a real row.
4. Send one test message.
5. Validate. You should see valid / invalid / duplicate counts and estimated credits.
6. Confirm the recipient count, then start.

For Production Mode the app asks a second time: real WhatsApp messages will be sent.

## 10,000-message architecture

Contacts are validated, then written to **Message Queue** with an idempotency key (`campaign + phone + row`). A time-driven trigger sends a safe batch (default 20, 8 parallel `fetchAll` requests), stores message ids, and schedules the next batch until the queue is empty.

If Apps Script times out, PROCESSING rows older than 10 minutes return to RETRY unless a message id already exists — those stay SENT.

Pause stops new sends. Resume continues from PENDING / RETRY only.

## Local test / demo preview

```bash
node apps-script/whatsapp-broadcast-master/tests/run-tests.js
node apps-script/whatsapp-broadcast-master/tests/preview-server.js
```

Open http://127.0.0.1:8787 — this is Mock Mode only.

## Sheets

| Sheet | Role |
|---|---|
| Dashboard | KPI cards, progress bar, status chart |
| Settings | Non-secret configuration |
| Contacts | Recipients (your column names are allowed) |
| Campaigns | History and counts |
| Message Queue | Restartable send queue |
| Logs | Operator trace without secrets |
| Templates | Cached approved templates |
| Help | How-to copy |

## Menu

WhatsApp Broadcast Master → Open Broadcast Master, Settings, Test Connection, Refresh Templates, Validate Campaign, Start Campaign, Pause Campaign, Resume Campaign, View Campaign Status, View Logs, Help.
