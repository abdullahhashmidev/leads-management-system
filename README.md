# Leads Management System

Lead capture, AI admissions chatbot, lead scoring, follow-up and payments ledger for education businesses.

## What it does
- Campaign landing pages with a lead form and a chatbot.
- Chatbot answers only from the approved knowledge file and captures leads with consent.
- Automatic lead scoring and hot-lead alerts run inside the app.
- Owner console: dashboard, leads (status, notes, follow-up), payments ledger (PKR and USD kept separate, CSV export).

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill every value.
3. Apply `supabase/schema.sql` to a new Supabase project.
4. `npm run dev` (development) or `npm run build && npm start` (production-like).
5. Demo data only: `npm run seed`.

## Checks
- `npm run doctor` runs structure, env, secrets and dependency checks.
- `npm run smoke` runs API smoke tests.

## Security notes
- Admin access needs `SESSION_SECRET` (32+ chars) and `ADMIN_PASSWORD`. Rate limits and the chatbot budget live in the `usage_counters` table (see `supabase/schema.sql`). The chatbot kill switch is `app_settings.chat_enabled`.
- Service role key lives only on the server. Never put it in `NEXT_PUBLIC_*`.
- Lead data is private: no public read endpoint exists.
