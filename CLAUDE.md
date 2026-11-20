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
- Stable project facts live in ARCHITECTURE.md, not in conversation. Read only the section you need.
- HANDOFF.md (repo root; overwrite each time; Goal, Done, In progress, Decisions, Next steps, Gotchas; under 40 lines): update after each completed step or major decision. If the session gets long, off-topic or cluttered, say so in one line, update HANDOFF.md first, then recommend a fresh session.
- BACKLOG.md: either of us logs bugs and ideas as `- [ ] (who, YYYY-MM-DD) text`. Don't act on entries unasked. Delete an entry when it's done.
- HISTORY.md: append-only record of every change since 2026-11-20. In the same commit as each change, add one line: `echo '- YYYY-MM-DD HH:MM | branch or version | what changed' >> HISTORY.md` (America/Chicago time). Never edit or delete earlier lines (correct with a new line). It is long, so don't read it unless Ricky asks.

## Testing
- After a change, run only the quick targeted check (headless Chromium at 390px, light and dark for UI changes); show failures only. Ask before the full suite, profiling or any broad sweep.
- Sync can only be tested against a mock Supabase server (sandbox can't reach the real one).

## Project
- Static PWA, no build step, plain JS. Netlify builds the same site from `main`; it goes live only when Ricky presses Publish deploy. Saved data belongs to the site's address.
- Never rename localStorage key `life-app-state-v1`. Upgrades in `normalize()` (app.js) must be additive.
- Never assume for Ricky: bills count as paid and income as received only when he confirms.
- Only the publishable Supabase key may go in `config.js`. Never the secret/service_role key.

## Shipping
- Ship only when asked. Release = bump `APP_VERSION` (app.js), `CACHE` (sw.js), tag `vX.Y`; then bump the working copy to the next version.

## Rules maintenance
- After each release (or on request), suggest changes in one short list: rules to add (friction seen), trim (redundant/outdated/something you'd do anyway), and wording to tighten.
