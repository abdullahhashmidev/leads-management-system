# Security policy

## Reporting a vulnerability
Please do not open a public issue for a security problem.

Email **abdullahhashmi541@gmail.com** with:
- a short description of the issue and its impact,
- steps to reproduce (a minimal request or page is enough),
- whether any personal data (lead names, phone numbers, payment records) could be exposed.

You will get an acknowledgement within 3 working days. Fixes for confirmed issues are released as soon as they are verified, and the reporter is credited if they want that.

## Scope
In scope: the code in this repository, its API routes, the admin console, and the database policies in `supabase/`.

Out of scope: denial-of-service through volume testing against a live deployment, and social engineering.

## Secrets
Never commit `.env.local`. If a key was committed by accident, rotate it first, then remove it from history.
