// Read-only LOCAL browser audit. Does not submit forms, follow contact links, or call providers.
import { chromium } from "playwright";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = new URL(process.env.CONTACT_AUDIT_URL || "http://127.0.0.1:3140");
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.protocol !== 'http:') {
  throw new Error('Contact audit is restricted to a local HTTP server.');
}
const output = await mkdtemp(join(tmpdir(), 'sheetomatic-contact-audit-'));
const services = await readFile('src/app/services-content.ts', 'utf8');
const hr = await readFile('src/app/hr-module-content.ts', 'utf8');
const paths = [...new Set([
  '/', '/about', '/contact', '/pricing', '/templates', '/courses', '/services', '/products',
  '/addons', '/packages', '/app-builder', '/career', '/training', '/digital-products',
  '/whatsapp-api', '/whatsapp-ai', '/whatsapp-crm', '/whatsapp-plans', '/terms',
  '/terms/services', '/terms/whatsapp-api', '/ai', '/ai/pricing', '/ai/crm', '/ai/chatbot', '/login',
  ...[...services.matchAll(/slug: "([a-z-]+)"/g)].map(match => `/services/${match[1]}`),
  ...[...hr.matchAll(/marketingHref: "([^"]+)"/g)].map(match => match[1]),
])];
const browser = await chromium.launch({ headless: true,
  ...(process.env.CONTACT_AUDIT_BROWSER ? { executablePath: process.env.CONTACT_AUDIT_BROWSER } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
const results = [];
let next = 0;
function destination(href) {
  if (href.startsWith('tel:')) return decodeURIComponent(href.slice(4)).replace(/\D/g, '');
  const url = new URL(href);
  return (url.hostname === 'wa.me' ? url.pathname : url.searchParams.get('phone') || '').replace(/\D/g, '');
}
async function worker() {
  const page = await context.newPage();
  while (next < paths.length) {
    const path = paths[next++];
    try {
      const response = await page.goto(new URL(path, base).href, { waitUntil: 'networkidle', timeout: 90000 });
      const data = await page.evaluate(() => ({
        links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
          .filter(s => /^(tel:|https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com))/.test(s)),
        text: document.body.innerText,
      }));
      // This UPI identity must not be rewritten as if it were a sales phone number.
      const text = data.text.replaceAll('9329103106@ybl', '[payment identity]').replace(/[\s().+-]/g, '');
      const result = { path, status: response.status(), contactLinks: data.links.length,
        wrongDestinations: data.links.filter(href => destination(href) !== '919755733107'),
        oldPublicText: /(?:9329103106|9685788980)/.test(text) };
      results.push(result); console.log(JSON.stringify(result));
      if (path === '/contact') await page.screenshot({ path: join(output, 'contact-desktop.png'), fullPage: true });
    } catch (error) {
      const result = { path, error: String(error) }; results.push(result); console.log(JSON.stringify(result));
    }
  }
  await page.close();
}
try {
  await Promise.all([worker(), worker()]);
  const mobile = await context.newPage(); await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(new URL('/contact', base).href, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: join(output, 'contact-mobile.png'), fullPage: true });
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`Evidence: ${output}`);
  if (results.some(r => r.error || r.status >= 400 || r.oldPublicText || r.wrongDestinations.length)) process.exitCode = 1;
} finally { await browser.close(); }
