<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Guardrails (doctor)
- Never rename/move/delete a file or export without grepping every reference first.
- Never rename n8n nodes or credentials, and never edit the workflow by hand: change it only via a script that takes a backup and rolls back on failure.
- After any change run `npm run doctor:quick`; before commit `npm run doctor:static` (git hook enforces it); before demo/deploy `npm run doctor`.
- No hardcoded keys; no real data mixed with is_dummy data; no unapproved new packages.
