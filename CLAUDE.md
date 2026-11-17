# Lifebrained: working rules
Don't edit this file without Ricky's approval. Keep it under ~25 lines of rules.

## Session economy
- Search before reading. Never read a large file whole; read only the relevant range. Don't re-read unchanged files.
- Before a big read or wide change, say which files/sections. For multi-step work, propose a short plan and wait for go-ahead before large edits.
- Prefer small, targeted edits over rewrites.
- Filter command output: show failures and the last ~30 lines, not full logs.
- After two failed attempts at the same fix, stop, summarize what was tried, recommend reverting or starting fresh.
- Replies short: outcome first, no recaps, don't paste back code visible in the file.
- Ambiguous requirements: ask one focused question (only if the choice is costly to redo and unclear).
- When a task is done, say so and suggest continuing here or starting fresh.

## Docs
- Stable project facts live in ARCHITECTURE.md, not in conversation.
- Keep HANDOFF.md (repo root; Goal, Done, In progress, Decisions, Next steps, Gotchas; under 40 lines) updated after each completed step or major decision. If the session gets long, off-topic or cluttered, say so in one line, update HANDOFF.md first, then recommend a fresh session.
- BACKLOG.md: either of us logs bugs and ideas there. Don't act on entries unasked.

## Testing
- After a change, run only the quick targeted check (headless Chromium at 390px, light and dark for UI changes); show failures only. Ask before the full suite, profiling or any broad sweep; those belong to the nightly agents.
- Sync can only be tested against a mock Supabase server (sandbox can't reach the real one).

## Project
- Static PWA, no build step, plain JS. Netlify deploys the same site from `main`; saved data belongs to the site's address.
- Never rename localStorage key `life-app-state-v1`. Upgrades in `normalize()` (app.js) must be additive.
- Never assume for Ricky: bills count as paid and income as received only when he confirms.
- Ship only when asked. Release = bump `APP_VERSION` (app.js), `CACHE` (sw.js), version line in README.md, tag `vX.Y`; then bump the working copy to the next version.
- Only the publishable Supabase key may go in `config.js`. Never the secret/service_role key.

## Rules maintenance
- After each release (or on request), suggest changes in one short list: rules to add (friction seen), trim (redundant/outdated/something you'd do anyway), and wording to tighten.
