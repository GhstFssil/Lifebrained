# Handoff

## Goal
Lifebrained: one phone-first place for to dos, money and calendar, synced per person through Supabase accounts. Never assume for Ricky (bills paid / income received only when he confirms).

## Done
- Shipped 0.1 to 0.4 (0.4 = Supabase accounts, sync, cloud backups).
- Repo GhstFssil/Lifebrained created (private); 0.4 imported to `main` (commit e7a2b4c). Tag `v0.4` could not be pushed (403); create it on GitHub as a release or tag.
- CLAUDE.md, ARCHITECTURE.md, BACKLOG.md added.

## In progress
- Branch `edit-entries` (tested at 390px light+dark): edit events, money entries, regular events. Not merged; version still 0.4. Merge to `main` deploys.
- Netlify and Supabase linked; SQL run; keys in config.js; site made public, LB icon serves. Next: iPhone re-add and first sign-in.

## Decisions
- Repo is private. Supabase "Confirm email" is off. Initial import went straight to `main`.
- Ship (bump version, tag) only when Ricky asks.

## Next steps
1. Ricky: link the existing Netlify site to the repo (branch `main`, no build command, publish `/`).
2. Ricky: Supabase project: run `supabase-setup.sql`, set Site URL to the Netlify address, turn off Confirm email, copy Project URL + publishable key.
3. Claude: put the keys in `config.js`, commit.
4. Ricky: iPhone redeploy sequence (backup file, deploy, delete icon, clear Website Data, re-add, create account, restore backup).
5. Debug the first real sync (see BACKLOG.md). Then 0.5 work.

## Gotchas
- Sync has only been tested against a mock server.
- Version is still 0.4 in `app.js`, `sw.js`, README; bump to 0.5 with the first new change.
- iPhone never updates the icon of an app already on the home screen.
- Netlify team protection blocked the icon fetch (iPhone kept the old icon); site is now public. Check Visitor access if assets ever 302 to a Netlify login.
- Password-reset emails open in Safari, not the home-screen app.
