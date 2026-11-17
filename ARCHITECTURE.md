# Architecture (stable facts)

**What:** Lifebrained, a personal to-dos + money + calendar app. Static installable PWA, no build step, no framework. Phone-first (iPhone home screen).

## Files
- `index.html`: shell; loads `vendor/supabase.js`, `config.js`, `app.js`; registers `sw.js`.
- `app.js`: all logic, plain JS (~2,100 lines). Sections are marked `/* ---------- name ---------- */`; search for those markers instead of reading the file whole. Order: helpers, state (`normalize()`), account & sync (Supabase), categories/projects/accounts, money & bills, expected income, overdue questions, schedule, to dos (supertasks), timers, filters, view pieces, Today, To do, Money, Calendar, render, drag-reorder, sheet (all forms), toast/undo, events, boot.
- `style.css`: theme colors as CSS variables, light and dark.
- `sw.js`: network-first service worker for the app's own files; `CACHE` name changes each version.
- `config.js`: `window.LB_CONFIG` with Supabase URL and publishable key.
- `supabase-setup.sql`: tables, row-level security, grants (safe to re-run).
- `vendor/supabase.js`: supabase-js 2.45.4 browser build (MIT). `vendor/591.supabase.js` is an unreferenced `ws` stub.
- `lb-icon-*`: pink "LB" on deep teal. Names changed in 0.3 so iPhone picks up the icon on re-add.

## Data
- All data is one JSON `state` object in localStorage key `life-app-state-v1`. Never rename it. `normalize()` upgrades older data; upgrades must be additive.
- Other keys: `life-app-tab`, `lifebrained-ui`, `lifebrained-sync` (sync meta), `lifebrained-supabase` (URL/key entered in-app), `lifebrained-auth` (Supabase session).
- Saved data belongs to the site's address, so always deploy to the same Netlify site.

## Sync (Supabase)
- Email + password accounts; each person sees only their own rows (row-level security).
- `lifebrained_state`: one row per user (`data` jsonb, `rev`). Saves are `update ... where rev = <known rev>`, so a stale device is detected; the user then chooses which version to keep and the loser goes to `lifebrained_backups`.
- `lifebrained_backups`: daily automatic copies, last 40 kept, restorable in Settings.
- Local save first, sync in the background; offline changes sync later.
- Only the publishable key belongs in the repo.

## Deploy
Netlify serves the repo root from `main` (no build command). Release steps are in CLAUDE.md.
