# Bloom & Co. demo story — seed and captures

One coherent customer story in the **current** LydiaCRM app, for the homepage and the narrated tour.
Runs against a LOCAL stack only (both scripts refuse non-local URLs).

## Story

Oluchi Afolabi books Bloom & Co. for her wedding on Saturday 19 December 2026:

1. Enquiry and conversation in the shared inbox (from `website/demo/seed.mjs`).
2. Quote Q-0001 ($1,280) sent, then approved on WhatsApp with a 50% deposit.
3. Job J-0001 created from the quote, at her home address with access notes:
   trial (Kemi, tomorrow), wedding morning (Kemi + Tobi), four monthly facials.
4. Deposit invoice INV-0001 ($640) issued, bank transfer recorded and verified.
5. Automation "Quote accepted → tag client & book the trial" runs once for her (visible in Executions).
6. Help desk ticket: "Can we move the trial to Saturday morning?"
7. Business Brain: services, prices, hours, policies and voice, entered and approved.

Around it: six jobs (today's visits, a fortnightly lash series, one unscheduled job), an expiring quote,
an overdue invoice and an aftercare ticket, so Jobs, Schedule, My Day and Action Center have real content.

## Run

```
# app: Postgres + backend-go (FRONTEND_URL/PUBLIC_URL set to the public app address, so no localhost
# links appear on screen) + frontend dev server on :3000
API_URL=http://127.0.0.1:3001/api/v1 DATABASE_URL=postgres://crm_user:crm_password_dev@127.0.0.1:5432/crm_db \
  node website/demo/seed.mjs            # base demo workspace (CRM repo)
API_URL=... DATABASE_URL=... node seed-story.mjs
node capture-story.cjs <output-dir>     # desktop 1440x900@2x and phone 390x844@3x, plus scan-report.json
```

`FROM=<step>` resumes `seed-story.mjs` after a partial run.

## Known limits (honest states, not hidden)

- Portal invitation is refused locally: no email/WhatsApp provider is connected. Staff can still copy the portal link.
- The inbox composer shows "No email provider connected" — crop it; do not fake a connected provider.
- Executions shows the run ID (`Run 584c…`) — crop it in marketing use.
- AI Work's top card reads "Nothing needs you today" (AI suggestions need an AI provider); use the Business Brain screen instead.
- Settings shows "Renewal date unavailable" (no billing provider) — not used.

These scripts belong in the CRM repo's `website/demo/` and `website/capture/` once approved.
