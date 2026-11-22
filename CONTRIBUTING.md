# Contributing

Thanks for looking at this project. It is maintained by one person, so small, focused changes are easiest to review.

## Setup
```bash
npm ci
cp .env.example .env.local   # fill every value; never commit this file
npm run dev
```

## Before you open a pull request
```bash
npm run typecheck
npm run lint
npm run build
npm run doctor:quick         # after any change
npm run doctor:static        # before commit (the git hook enforces it)
```

## Rules for changes
- No hardcoded keys. Secrets come from environment variables only, and `NEXT_PUBLIC_*` never holds a secret.
- Keep real lead data out of the repo. Demo data must be marked `is_dummy = true`.
- Renaming or removing a file or export: search every reference first.
- No new dependency without a reason written in the pull request.
- Validate all input with Zod at every API route and server action.

## Commit messages
Short imperative subject, for example `Fix duplicate lead check`. Add a body when the why is not obvious.
