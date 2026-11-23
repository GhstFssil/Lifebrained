# History
Append-only record of every change to this repo since 2026-11-20. Never edit or delete a line; correct a mistake with a new line. Sessions don't read this file unless Ricky asks. Times are America/Chicago.
Format: `- YYYY-MM-DD HH:MM | branch or version | what changed (and why, briefly)`
Add a line with `echo '- ...' >> HISTORY.md`.

- 2026-11-20 17:08 | main | Added HISTORY.md (append-only change record) and .gitattributes (union merge so parallel branches keep every line)
- 2026-11-20 17:08 | main | CLAUDE.md reorganised into the common sections (Session economy, Docs, Testing, Project, Shipping, Rules maintenance); added HISTORY and overwrite-only HANDOFF rules; removed the reference to nightly agents; Netlify wording now matches HANDOFF (auto publishing is off)
- 2026-11-20 17:08 | main | HANDOFF.md is overwrite-only with a Last updated line; BACKLOG.md drops its Done section (finished items are deleted and logged here)
- 2026-11-20 17:08 | main | ARCHITECTURE.md: Sync section renamed Backend (Supabase), added Run and test and Docs sections; README.md: unified Supabase setup, Updating and Files wording (same layout as BSH-Companion)
- 2026-11-20 17:46 | main | README: removed the version and cache values (they live in app.js and sw.js); CLAUDE.md and HANDOFF no longer point at README version lines
- 2026-11-20 17:59 | main | Version rules: by default every push to main that isn't docs-only bumps APP_VERSION and CACHE to the next version (0.5 -> 0.6), docs-only pushes never change the version unless Ricky says so (CLAUDE.md, README, HANDOFF); the old 'bump the working copy to the next version after release' step is gone
- 2026-11-20 18:02 | main | Version rule: Lifebrained now uses whole numbers, starting at 1 on the next non-docs push to main (0.5 -> 1, cache lifebrained-v0.5 -> lifebrained-v1); tags are vN (CLAUDE.md, HANDOFF)
- 2026-11-20 20:41 | main | v1: collapsible User guide in Settings (guideHTML in app.js, styles in style.css); APP_VERSION 0.5 -> 1, CACHE lifebrained-v1
- 2026-11-20 21:39 | main | Docs: shipping means pushing to main as the next version; never give zips or artifacts unless asked
- 2026-11-20 21:48 | main | Added .github/workflows/release.yml: every non-docs push to main publishes a vN GitHub release (app zip plus SQL script); docs updated
- 2026-11-20 22:06 | main | Docs: all work goes on next; publish merges main into next, bumps the version if not docs-only, then pushes next to main
- 2026-11-23 17:26 | main (docs only) | BACKLOG: idea to show expected income in the Look ahead window
