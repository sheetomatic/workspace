'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('./gas-harness');

const root = path.join(__dirname, '..');
const runtime = createRuntime();
runtime.setupDemoDataFromUi();
runtime.refreshTemplatesFromUi();

function inlineApp() {
  const styles = fs.readFileSync(path.join(root, 'Styles.html'), 'utf8');
  const scripts = fs.readFileSync(path.join(root, 'Scripts.html'), 'utf8');
  let app = fs.readFileSync(path.join(root, 'App.html'), 'utf8');
  app = app.replace('<?!= include(\'Styles\'); ?>', styles);
  app = app.replace('<?!= include(\'Scripts\'); ?>', scripts);
  app = app.replace('<?!= initialPage || \'home\' ?>', 'home');
  const bridge = `<script>
    window.PREVIEW_API = {
      async getAppState() { return fetchRpc('getAppState'); },
      async saveSettingsFromUi(p) { return fetchRpc('saveSettingsFromUi', p); },
      async testConnectionFromUi(p) { return fetchRpc('testConnectionFromUi', p); },
      async refreshTemplatesFromUi(p) { return fetchRpc('refreshTemplatesFromUi', p); },
      async validateCampaignFromUi(p) { return fetchRpc('validateCampaignFromUi', p); },
      async previewMessageFromUi(p) { return fetchRpc('previewMessageFromUi', p); },
      async sendTestMessageFromUi(p) { return fetchRpc('sendTestMessageFromUi', p); },
      async startCampaignFromUi(p) { return fetchRpc('startCampaignFromUi', p); },
      async pauseCampaignFromUi(p) { return fetchRpc('pauseCampaignFromUi', p); },
      async resumeCampaignFromUi(p) { return fetchRpc('resumeCampaignFromUi', p); },
      async getCampaignStatusFromUi(p) { return fetchRpc('getCampaignStatusFromUi', p); },
      async getLogsFromUi(p) { return fetchRpc('getLogsFromUi', p); },
      async setupDemoDataFromUi(p) { return fetchRpc('setupDemoDataFromUi', p); },
      async createDemoCampaignFromUi(p) { return fetchRpc('createDemoCampaignFromUi', p); },
      async createLargeDemoFromUi(p) { return fetchRpc('createLargeDemoFromUi', p); },
      async processQueueNowFromUi(p) { return fetchRpc('processQueueNowFromUi', p); }
    };
    async function fetchRpc(name, payload) {
      const res = await fetch('/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, payload: payload })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Preview RPC failed');
      return body.result;
    }
  </script>`;
  return app.replace('<script>window.INITIAL_PAGE', bridge + '\n<script>window.INITIAL_PAGE');
}

const html = inlineApp();
const port = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  if (req.url === '/rpc' && req.method === 'POST') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        const fn = runtime[body.name];
        if (typeof fn !== 'function') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown function ' + body.name }));
          return;
        }
        const result = fn(body.payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, '127.0.0.1', () => {
  console.log('WhatsApp Broadcast Master preview: http://127.0.0.1:' + port);
});
