// Captures the seeded Bloom & Co story from the LOCAL app, desktop and phone, and scans each
// screen's visible text for leaks (localhost, test names, tokens) and weak states (errors, "not configured").
const { chromium } = require('/home/user/crm/website/node_modules/@playwright/test');
const fs = require('fs');
const OUT = process.argv[2];
const APP = 'http://localhost:3000', API = 'http://127.0.0.1:3001/api/v1';
fs.mkdirSync(OUT + '/desktop', { recursive: true }); fs.mkdirSync(OUT + '/phone', { recursive: true });

const LEAK = [/localhost/i, /127\.0\.0\.1/, /\bE2E\b/, /example\.test/i, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, /eyJ[A-Za-z0-9_-]{10,}/, /DemoPass/i];
const WEAK = [/not configured/i, /isn't connected/i, /unavailable/i, /something went wrong/i, /\bfailed\b/i, /\berror\b/i, /no .* yet/i, /nothing needs you/i, /give lydia the basics/i, /skip setup/i];

async function api(path, token) {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token } });
  const d = (await r.json()).data; return Array.isArray(d) ? d : (d?.items || d);
}
async function settle(p, ms = 1600) { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(ms); }
async function hideChrome(p) {
  await p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const s = getComputedStyle(el);
    const r = el.getBoundingClientRect(); if (s.position === 'fixed' && parseFloat(s.bottom) >= 0 && parseFloat(s.bottom) < 140 && r.height < 90 && r.width < 120) el.style.visibility = 'hidden'; } });
}
async function login(p) {
  await p.goto(APP + '/login', { waitUntil: 'networkidle' });
  await p.fill('#email', 'amara@bloomandco.demo'); await p.fill('#password', 'DemoPass2026!');
  await p.getByRole('button', { name: /sign in/i }).click(); await p.waitForURL(/\/$/).catch(() => {}); await settle(p);
}

(async () => {
  const tok = (await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'amara@bloomandco.demo', password: 'DemoPass2026!' }) })).json()).data.tokens.access_token;
  const oluchi = (await api('/contacts?search=Oluchi%20Afolabi', tok))[0];
  const quote = (await api('/quotes', tok)).find((x) => x.number === 'Q-0001');
  const job = (await api('/jobs', tok)).find((x) => x.number === 'J-0001');
  const inv = (await api('/invoices', tok)).find((x) => x.number === 'INV-0001');
  const tickets = await api('/tickets', tok);
  const ticket = tickets.find((t) => /trial/i.test(t.subject)) || tickets[0];
  const auto = (await api('/automations', tok)).find((a) => a.name.startsWith('Quote accepted'));

  const DESK = [
    ['01-dashboard', '/'], ['02-action-center', '/action-center'],
    ['03-inbox-oluchi', '/conversations', async (p) => { await p.getByText('Oluchi Afolabi').first().click(); }],
    ['04-contact-oluchi', `/contacts/${oluchi.id}`], ['05-pipeline', '/pipeline'],
    ['06-quote-q0001', `/quotes/${quote.id}`], ['07-quotes', '/quotes'], ['08-jobs', '/jobs'],
    ['09-job-j0001', `/jobs/${job.id}`], ['10-schedule', '/schedule'], ['11-my-day', '/my-day'],
    ['12-invoices', '/invoices'], ['13-invoice-inv0001', `/invoices/${inv.id}`],
    ['14-help-desk', '/tickets'], ['15-ticket', `/tickets/${ticket.id}`],
    ['16-automation', `/automations/${auto.id}`],
    ['17-automation-executions', `/automations/${auto.id}`, async (p) => { await p.getByRole('button', { name: /^Executions$/ }).first().click().catch(() => p.getByText('Executions').first().click()); }],
    ['18-ai-work', '/ai-work'], ['19-brain', '/brain'], ['20-campaigns', '/campaigns'], ['21-analytics', '/analytics'],
    ['22-contacts', '/contacts'], ['23-agency', '/agency'], ['24-settings', '/settings'],
  ];
  const PHONE = [['01-dashboard', '/'], ['03-inbox-oluchi', '/conversations', DESK[2][2]], ['09-job-j0001', `/jobs/${job.id}`],
    ['11-my-day', '/my-day'], ['13-invoice-inv0001', `/invoices/${inv.id}`], ['10-schedule', '/schedule'], ['02-action-center', '/action-center']];

  const report = [];
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [dev, set, vp] of [['desktop', DESK, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
    ['phone', PHONE, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(vp); const p = await ctx.newPage(); await login(p);
    for (const [name, route, act] of set) {
      try {
        await p.goto(APP + route); await settle(p);
        if (act) { await act(p); await settle(p, 1200); }
        await hideChrome(p);
        await p.screenshot({ path: `${OUT}/${dev}/${name}.png` });
        const text = await p.evaluate(() => document.body.innerText);
        const leaks = LEAK.map((r) => (text.match(r) || [])[0]).filter(Boolean);
        const weak = WEAK.map((r) => (text.match(new RegExp('.{0,40}' + r.source + '.{0,40}', r.flags)) || [])[0]).filter(Boolean);
        report.push({ dev, name, url: p.url().replace(APP, ''), leaks, weak });
        console.log(dev, name, leaks.length ? 'LEAK ' + JSON.stringify(leaks) : '', weak.length ? 'WEAK ' + JSON.stringify(weak).slice(0, 200) : '');
      } catch (e) { report.push({ dev, name, error: e.message.slice(0, 120) }); console.log(dev, name, 'FAILED', e.message.slice(0, 120)); }
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
  console.log('done', report.length);
})();
