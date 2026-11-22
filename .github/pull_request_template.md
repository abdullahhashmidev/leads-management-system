## What changed
<!-- One or two sentences. Why, not only what. -->

## How it was checked
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run doctor:static` (required before commit, enforced by the git hook)

## Checklist
- [ ] No secrets, keys or real lead data in the diff
- [ ] Any renamed or removed file or export: every reference was searched first
- [ ] No new package added without approval
- [ ] Input validated with Zod on every new route or server action
