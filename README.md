# Leads Management System

[![ci](https://github.com/abdullahhashmidev/leads-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/abdullahhashmidev/leads-management-system/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Lead capture, AI admissions chatbot, lead scoring, follow-up and a payments ledger for education businesses.

## Features
- **Campaign landing pages** with a lead form and a chatbot.
- **Grounded chatbot.** Answers only from an approved knowledge file. It captures contact details only after the visitor gives consent in a separate step.
- **Lead scoring.** Each lead gets a 0–100 score and a hot, warm or cold tag. Hot leads trigger a push alert.
- **Owner console.** Dashboard, lead pipeline (status, notes, follow-up) and a payments ledger. PKR and USD are kept separate, with receipt numbers and CSV export.

## Tech stack
TypeScript · Next.js (App Router) · React · Supabase (Postgres, row-level security) · Zod · Tailwind CSS · OpenAI-compatible LLM API

## Security model
- Row-level security is on for every table, with no public policies. Only the server holds the service role key.
- Admin access uses a signed, httpOnly session cookie. The password is compared in constant time.
- Rate limits and the LLM spend cap are kept in Postgres, so they work across every serverless instance.
- The chatbot has a kill switch: `update app_settings set value = 'false' where key = 'chat_enabled';`
- Lead data is private. No public read endpoint exists.

Report a vulnerability through [SECURITY.md](SECURITY.md).

## Getting started
```bash
npm ci
cp .env.example .env.local   # fill every value
```
Apply `supabase/schema.sql` to a new Supabase project, then:
```bash
npm run dev                  # development
npm run build && npm start   # production-like
npm run seed                 # optional demo data (is_dummy = true)
```

## Checks
| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run doctor` | Structure, env, secrets and dependency checks (needs `.env.local`) |
| `npm run doctor:static` | Same checks without network access |
| `npm run smoke` | API smoke tests against a running app |

CI runs typecheck, lint, build, `npm audit` and secret scanning on every push and pull request.

## Project structure
```
src/app/           routes: landing pages, admin console, API routes
src/components/    lead form and chat widget
src/lib/           env validation, guards, rate limits, scoring, Supabase client
src/data/          approved chatbot knowledge file
supabase/          schema and migrations
scripts/           seed, doctor, smoke and e2e scripts
```

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
MIT. See [LICENSE](LICENSE).
