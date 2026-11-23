# Handoff
Last updated 2026-11-23 (evening). Overwrite each time; keep under 40 lines. Change record: HISTORY.md (don't read unless asked).

## Goal
Lifebrained: one phone-first place for to dos, money and calendar, synced per person through Supabase accounts. Never assume for Ricky (bills paid / income received only when he confirms).

## Done
- Shipped 0.1 to 0.5 (0.4 = Supabase accounts, sync, cloud backups; 0.5 = edit events, money entries, regular events).
- Repo GhstFssil/Lifebrained created (private); 0.4 imported to `main` (commit e7a2b4c). Tag `v0.4` could not be pushed (403); create it on GitHub as a release or tag.
- 2026-11-20: docs aligned with the other Ricky repos (common CLAUDE.md sections, HISTORY.md started, unified Supabase setup wording in README).
- 2026-11-20: User guide added to Settings (collapsible sections, `guideHTML()` in app.js); version 1 pushed to `main` (not tagged, not published). Guide wording is a first draft; Ricky will send edits.

- 2026-11-23: on `next` (not pushed to `main`, no version bump yet): Plans Look ahead shows "Expected income in window" (from today to window end, unconfirmed only, never in the planned total); the schedule shows each supertask's back-to-back subtasks as one block, subtasks listed when tapped (an event splits it). BACKLOG cleared, watch items removed at Ricky's request.

## In progress
- Nothing.

## Decisions
- Repo is private. Supabase "Confirm email" is off. Initial import went straight to `main`.
- Ship (tag, Publish deploy) only when Ricky asks. Every push to `main` except a docs-only one bumps `APP_VERSION` and `CACHE` (CLAUDE.md, Shipping).
- Netlify auto publishing is stopped: pushes to `main` build but go live only when Ricky presses Publish deploy. May move to a `release` production branch later.

## Next steps
1. Ricky: open the app once online so the 0.5 service worker installs; check the LB icon and an edit on each of events, money, regular events.
2. Review the two changes on `next`; say when to publish (merge `main` into `next`, bump to 2, push to `main`).
3. New requests go in BACKLOG.md; ship only when asked.

## Gotchas
- Version is now 1; the next non-docs push to `main` makes it 2.
- Real Supabase sign-in, sync and backup restore verified; the two-device conflict prompt is untested (no longer tracked in BACKLOG).
- iPhone never updates the icon of an app already on the home screen.
- Netlify team protection blocked the icon fetch (iPhone kept the old icon); site is now public. Check Visitor access if assets ever 302 to a Netlify login.
- Password-reset emails open in Safari, not the home-screen app.
- `vendor/591.supabase.js` is a lazy chunk loaded by `supabase.js`, not dead code: keep it.
