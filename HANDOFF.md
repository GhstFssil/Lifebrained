# Handoff

## Goal
Lifebrained: one phone-first place for to dos, money and calendar, synced per person through Supabase accounts. Never assume for Ricky (bills paid / income received only when he confirms).

## Done
- Shipped 0.1 to 0.4 (0.4 = Supabase accounts, sync, cloud backups).
- Repo GhstFssil/Lifebrained created (private); 0.4 imported to `main` (commit e7a2b4c). Tag `v0.4` could not be pushed (403); create it on GitHub as a release or tag.
- CLAUDE.md, ARCHITECTURE.md, BACKLOG.md added.

## In progress
- Connecting Netlify to the repo; setting up Supabase.

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
- Password-reset emails open in Safari, not the home-screen app.
