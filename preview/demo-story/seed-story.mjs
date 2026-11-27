// Seeds one coherent service story on top of website/demo/seed.mjs, for marketing captures.
// LOCAL demo stack only. Everything goes through the real API except one backdated due date.
//
//   API_URL=http://127.0.0.1:3001/api/v1 DATABASE_URL=postgres://crm_user:crm_password_dev@127.0.0.1:5432/crm_db \
//   node seed-story.mjs
//
// Story: Oluchi Afolabi books Bloom & Co. for her wedding (Sat 19 Dec 2026).
// enquiry -> quote (sent, accepted on WhatsApp) -> job with trial, wedding day and monthly facials
// -> 50% deposit invoice issued, transfer recorded and verified -> portal invitation -> help desk ticket
// -> automation run on quote acceptance. Plus a believable week of other jobs so Jobs, Schedule,
// My Day and Action Center are not empty.

import { execFileSync } from 'node:child_process';

const API = process.env.API_URL || 'http://127.0.0.1:3001/api/v1';
const DB = process.env.DATABASE_URL || 'postgres://crm_user:crm_password_dev@127.0.0.1:5432/crm_db';
if (!/127\.0\.0\.1|localhost/.test(API + DB)) throw new Error('refusing to seed a non-local stack');

const sql = (text) => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: text, encoding: 'utf8' });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let TOKEN;
async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 400)}`);
  return json.data;
}
const list = (d) => (Array.isArray(d) ? d : d?.items || d?.data || d?.members || []);
const lagos = (date, hm) => `${date}T${hm}:00+01:00`; // Africa/Lagos is UTC+1 all year
const log = (...a) => console.log('·', ...a);

TOKEN = (await call('POST', '/auth/login', { email: 'amara@bloomandco.demo', password: 'DemoPass2026!' })).tokens.access_token;
const account = await call('GET', '/account');
const A = q(account.id);

// FROM=n resumes at step n after a partial run (steps 1-4 create the quote, job and visits).
const FROM = Number(process.env.FROM || 1);
if (FROM === 1 && list(await call('GET', '/quotes')).length) {
  console.log('Quotes already exist — story already seeded. Set FROM=<step> to resume a partial run.');
  process.exit(0);
}

await call('POST', '/account/onboarding/complete', {}); // demo workspace is past first-run setup
await call('PUT', '/modules/jobs', { enabled: true });
const team = list(await call('GET', '/team'));
const who = (first) => team.find((m) => m.name.startsWith(first)).id;
const AMARA = who('Amara'), KEMI = who('Kemi'), TOBI = who('Tobi');

async function contact(name) {
  const found = list(await call('GET', `/contacts?search=${encodeURIComponent(name)}`)).find((c) => c.name === name);
  if (!found) throw new Error(`contact ${name} missing — run website/demo/seed.mjs first`);
  return found;
}
const oluchi = await contact('Oluchi Afolabi');

let jobId, home, autoId;
const setAuto = (on) => autoId && sql(`UPDATE automations SET is_active=${on} WHERE account_id=${A} AND id=${q(autoId)};`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (FROM <= 4) {
// 1. An automation that runs on quote acceptance using only built-in steps, so its run succeeds here.
const auto = {
  name: 'Quote accepted → tag client & book the trial',
  triggers: [{ type: 'quote_accepted', config: {} }],
  actions: [
    { type: 'add_tag', config: { tag: 'bridal-2026' } },
    { type: 'create_task', config: { title: 'Book the bridal trial for {{first_name}}', priority: 'high' } },
  ],
};
const created = await call('POST', '/automations', auto);
await call('PUT', `/automations/${created.id}`, { ...auto, is_active: true }).catch(() => {});
autoId = created.id;
setAuto(true);
log('automation', auto.name);

// 2. Where the work happens.
home = await call('POST', '/properties', {
  contact_id: oluchi.id, label: 'Afolabi family home', line1: '14 Admiralty Way', line2: 'Lekki Phase 1',
  city: 'Lagos', region: 'Lagos', country: 'NG', timezone: 'Africa/Lagos',
  access_notes: 'Gate code shared on the day. Park inside on the left; setup room is upstairs.',
});

// 3. The quote: sent, then accepted on WhatsApp with a 50% deposit.
const quote = await call('POST', '/quotes', {
  contact_id: oluchi.id, currency: 'USD', property_id: home.id, assigned_to: AMARA,
  notes: 'Wedding on Saturday 19 December. Trial a few weeks before; monthly facials after the honeymoon.',
  line_items: [
    { description: 'Bridal trial session (makeup + hair, 90 min)', quantity: 1, unit_price_minor: 12000 },
    { description: 'Wedding-day bridal glam — bride', quantity: 1, unit_price_minor: 45000 },
    { description: 'Bridesmaid glam', quantity: 5, unit_price_minor: 9000 },
    { description: 'Post-wedding glow facial (monthly)', quantity: 4, unit_price_minor: 6500 },
    { description: 'Touch-up kit for the day', quantity: 1, unit_price_minor: 6000, optional: true },
  ],
});
await call('POST', `/quotes/${quote.id}/send`, {});
const accepted = await call('POST', `/quotes/${quote.id}/accept`, {
  method: 'whatsapp', note: 'Oluchi approved on WhatsApp: "Perfect, let\'s do it 💛"', deposit_percent: 50,
});
jobId = accepted.job_id;
log('quote accepted -> job', jobId);
// The trigger is processed by the job queue. Wait for Oluchi's run, then pause the bridal automation
// while the non-bridal quotes below are accepted, so only her quote gets the bridal tag and task.
for (let i = 0; i < 30; i++) {
  if (list(await call('GET', `/automations/${autoId}/runs`)).length) break;
  await sleep(1000);
}
setAuto(false);

// 4. Visits on Oluchi's job: trial tomorrow, the wedding morning, then four monthly facials.
const visits = (body) => call('POST', `/jobs/${jobId}/visits`, { property_id: home.id, confirm_clashes: true, ...body });
await visits({ starts_at: lagos('2026-11-28', '10:00'), ends_at: lagos('2026-11-28', '11:30'), assigned_to: KEMI,
  visit_instructions: 'Trial look: soft glam, bring two lash options.' });
await visits({ starts_at: lagos('2026-12-19', '06:00'), ends_at: lagos('2026-12-19', '10:30'), assigned_to: KEMI,
  additional_assignees: [TOBI], visit_instructions: 'Bride first, then 5 bridesmaids. Leave by 10:30 for the church.' });
await visits({ starts_at: lagos('2027-01-16', '11:00'), ends_at: lagos('2027-01-16', '12:00'), assigned_to: KEMI,
  repeat: { every: 'month', count: 4 } });
log('visits scheduled');

} else {
  home = list(await call('GET', `/properties?contact_id=${oluchi.id}`))[0];
  jobId = list(await call('GET', '/jobs')).find((j) => j.contact_id === oluchi.id)?.id;
}

// 5. The deposit invoice drafted on acceptance: issue it, record the transfer, verify it.
const invoices = list(await call('GET', '/invoices')).filter((i) => i.contact_id === oluchi.id);
const deposit = invoices[0];
if (deposit && FROM <= 5) {
  if (deposit.status === 'draft') await call('POST', `/invoices/${deposit.id}/send`, { due_date: '2026-12-04' });
  const full = (await call('GET', `/invoices/${deposit.id}`)).invoice;
  const due = full.balance_due_minor;
  const pay = await call('POST', `/invoices/${deposit.id}/payments`, {
    amount_minor: due, currency: 'USD', method: 'bank_transfer', reference: 'GTB-TRF-48213',
    paid_on: '2026-11-26', note: 'Deposit by transfer, receipt on WhatsApp',
  });
  const payId = pay?.payment?.id || pay?.id || (await call('GET', `/invoices/${deposit.id}`)).payments.slice(-1)[0]?.id;
  if (payId) await call('POST', `/invoices/${deposit.id}/payments/${payId}/verify`);
  log('deposit invoice issued, paid and verified');
} else if (FROM <= 5) log('WARN: no deposit invoice was drafted on acceptance');

// 6. A believable week of other work so Jobs, Schedule, My Day and Action Center have content.
async function job(name, lines, visitList, { accept = true, sendOnly = false, validUntil } = {}) {
  const c = await contact(name);
  const qd = await call('POST', '/quotes', { contact_id: c.id, currency: 'USD', line_items: lines });
  await call('POST', `/quotes/${qd.id}/send`, validUntil ? { valid_until: validUntil } : {});
  if (sendOnly) return { contact: c, quote: qd };
  const acc = await call('POST', `/quotes/${qd.id}/accept`, { method: 'phone' });
  for (const v of visitList) await call('POST', `/jobs/${acc.job_id}/visits`, { confirm_clashes: true, ...v });
  return { contact: c, quote: qd, jobId: acc.job_id };
}
if (FROM <= 6) {
await job('Ngozi Lawal', [{ description: 'Knotless braids (mid-back)', quantity: 1, unit_price_minor: 8500 }],
  [{ starts_at: lagos('2026-11-27', '13:00'), ends_at: lagos('2026-11-27', '16:00'), assigned_to: AMARA }]);
await job('Kunle Nwosu', [{ description: 'Signature facial', quantity: 1, unit_price_minor: 7500 }],
  [{ starts_at: lagos('2026-11-27', '16:30'), ends_at: lagos('2026-11-27', '17:30'), assigned_to: AMARA }]);
await job('Adaeze Coker', [{ description: 'Lash fill', quantity: 1, unit_price_minor: 4500 }],
  [{ starts_at: lagos('2026-11-27', '12:00'), ends_at: lagos('2026-11-27', '13:00'), assigned_to: KEMI,
     repeat: { every: '2weeks', count: 6 } }]);
await job('Ronke Nwosu', [{ description: 'Gel manicure + pedicure', quantity: 1, unit_price_minor: 6000 }],
  [{ starts_at: lagos('2026-11-30', '14:00'), ends_at: lagos('2026-11-30', '15:30'), assigned_to: TOBI }]);
await job('Chiamaka Mensah', [{ description: 'Corporate headshot glam (team of 8)', quantity: 8, unit_price_minor: 3500 }], []);
await job('Uche Ibrahim', [{ description: 'Skincare 6-week programme', quantity: 1, unit_price_minor: 42000 }], [],
  { sendOnly: true, validUntil: '2026-11-30' });
log('other jobs and quotes');
await sleep(8000); // let the queue process those acceptances while the bridal automation is paused
setAuto(true);
}

// 7. One overdue invoice for the Action Center (due date backdated in SQL, scoped to this account).
if (FROM <= 7) {
const late = await contact('Temi Bello');
const lateInv = await call('POST', '/invoices', { contact_id: late.id, currency: 'USD',
  line_items: [{ description: 'Bridal party balance', quantity: 1, unit_price_minor: 30000 }] });
await call('POST', `/invoices/${lateInv.id}/send`, { due_date: '2026-12-31' });
sql(`UPDATE business_documents SET due_date = CURRENT_DATE - 6 WHERE account_id=${A} AND id=${q(lateInv.id)};`);
log('overdue invoice');
}

// 8. Help desk: Oluchi's reschedule request and one urgent aftercare question.
if (FROM <= 8) {
await call('POST', '/tickets', { contact_id: oluchi.id, subject: 'Can we move the trial to Saturday morning?', priority: 'normal' });
await call('POST', '/tickets', { contact_id: (await contact('Mercy Bello')).id,
  subject: 'Skin feels tight after Tuesday\'s peel — what should I use?', priority: 'high' });
log('tickets');
}

// 9. Portal invitation for Oluchi. Locally this is refused (no email/WhatsApp provider is connected),
// which is the honest result; staff can still copy her portal link from her contact record.
if (FROM <= 9) try {
  const ep = `/contacts/${oluchi.id}/portal/invitations`;
  const preview = await call('GET', ep);
  await call('POST', ep, { channel: 'email', recipient: oluchi.email, body: preview.body, consent: true });
  log('portal invitation queued');
} catch (e) { log('WARN portal invitation:', e.message.slice(0, 160)); }

// 10. Business Brain: the studio's facts entered by hand (the usual path is a website scan, which
// needs a real site), then approved so the AI can use them.
if (FROM <= 10) {
  const facts = [
    ['services', 'Bridal glam', 'Wedding-day makeup and hair for the bride, at the studio or on location in Lagos. Includes lashes and a touch-up kit option.'],
    ['services', 'Bridal trial', '90-minute trial of the wedding look, booked 2–4 weeks before the day.'],
    ['services', 'Facials', 'Signature facial (60 min) and the post-wedding glow facial, available as a monthly programme.'],
    ['services', 'Braids and lashes', 'Knotless braids, lash sets and fortnightly lash fills.'],
    ['pricing', 'Bridal prices', 'Bridal trial $120. Bride wedding-day glam $450. Bridesmaid glam $90 each. Glow facial $65.'],
    ['pricing', 'Deposits', 'Bridal bookings are confirmed with a 50% deposit; the balance is due on the day.'],
    ['hours', 'Opening hours', 'Tuesday–Saturday 9:00–19:00, Sunday 12:00–17:00, closed Monday. Wedding mornings from 5:00 by arrangement.'],
    ['policies', 'Rescheduling', 'Appointments can be moved free of charge up to 48 hours before. Bridal deposits move with the booking.'],
    ['contact', 'Studio', 'Bloom & Co. Beauty Studio, 12 Admiralty Way, Lekki Phase 1, Lagos. WhatsApp and phone on +234 805 000 1200.'],
    ['voice', 'How we talk', 'Warm, short and personal. Use the client\'s first name, confirm details clearly, never pushy.'],
  ];
  for (const [section, title, content] of facts) {
    const it = await call('POST', '/brain/items', { section, title, content });
    if (it?.id) await call('POST', `/brain/items/${it.id}/approve`).catch(() => {});
  }
  log('business brain facts');
}

console.log('Story seeded.');
