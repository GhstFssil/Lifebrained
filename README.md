# Lifebrained

To dos with timers, repeats, categories, projects and a day plan; money across accounts with bills, planned expenses, expected income, debts and goals; and a calendar with regular and multi-day events. A static, installable PWA: no build step, no backend.

## Deploy (Netlify)
Drag this folder's contents (or the zip) onto Netlify's deploy area. Nothing else to configure.

## Data
Everything is saved in the browser's localStorage on the device you use, so each device or browser keeps its own copy. Without an account, data stays on that device only; Settings › Backup file saves and restores a backup file. With an account (below), data syncs to Supabase and a copy is saved there every day. First launch shows example entries; "Clear them" removes them.

## Accounts and sync (Supabase)
Each person signs in with their own email and password and sees only their own data. Changes save on the device first and sync in the background, so the app keeps working offline. If two devices both changed things before syncing, the app asks which version to keep and saves the other as a cloud backup.

## Supabase setup (one time)
1. Create a free project at supabase.com.
2. SQL Editor › New query: paste all of `supabase-setup.sql` and press Run (safe to run again).
3. Authentication › URL Configuration: set Site URL to your Netlify address, so confirmation and password-reset emails link back to the app.
4. Optional: Authentication › Sign In / Providers › Email: turn off "Confirm email" to skip the confirmation email at sign-up. Supabase's built-in email service only sends a few emails per hour; for more, add your own SMTP under Authentication › Emails › SMTP Settings.
5. Project Settings › API Keys (or API): copy the Project URL and the publishable key into `config.js` before deploying, so nobody has to type them. They can also be entered in the app under Settings › Account › Set up accounts.

Only the publishable key may go in `config.js` (it is public by design). Never use the secret or service_role key in the app.

On iPhone, emails that confirm an account or reset a password open in Safari, not in the home-screen app. Finish there, then sign in from the home-screen app.

Free Supabase projects can be paused after a stretch of no use. The app keeps working offline from the device either way; restore the project from the Supabase dashboard if that happens.

The Supabase JavaScript library (MIT license) is included in `vendor/` so the app works offline.

## Updating
Version: 0.5 (`APP_VERSION` in `app.js`). Cache: `lifebrained-v0.5` (`CACHE` in `sw.js`). Bump both whenever you ship changes, or installed copies may keep showing the old files. Deploy to the same Netlify site each time: saved data belongs to the site's address.

## Files
See `ARCHITECTURE.md` for what each file does. The `lb-icon-*` icons have new file names since 0.3 so iPhone picks up the LB icon when the app is added to the home screen again; iPhone never updates the icon of an app that is already on the home screen.
