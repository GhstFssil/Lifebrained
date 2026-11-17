# Lifebrained

To dos with timers, repeats, categories, projects and a day plan; money across accounts with bills, planned expenses, expected income, debts and goals; and a calendar with regular and multi-day events. A static, installable PWA: no build step, no backend.

## Deploy (Netlify)
Drag this folder's contents (or the zip) onto Netlify's deploy area. Nothing else to configure.

## Data
Everything is saved in the browser's localStorage on the device you use, so each device or browser keeps its own copy. Without an account, data stays on that device only; Settings › Backup file saves and restores a backup file. With an account (below), data syncs to Supabase and a copy is saved there every day. First launch shows example entries; "Clear them" removes them.

## Updating
Version: 0.4 (`APP_VERSION` in `app.js`). Bump `CACHE` in `sw.js` (currently `lifebrained-v0.4`) whenever you ship changes, or installed copies may keep showing the old files. Deploy to the same Netlify site each time: saved data belongs to the site's address.

## Files
`index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, and the `lb-icon-*` icons. The icons have new file names in 0.3 so iPhone picks up the LB icon when the app is added to the home screen again; iPhone never updates the icon of an app that is already on the home screen.
The text font loads from Google Fonts when online and falls back to the system font offline.

## Accounts and sync (Supabase)
Each person signs in with their own email and password and sees only their own data. Changes save on the device first and sync in the background, so the app keeps working offline. If two devices both changed things before syncing, the app asks which version to keep and saves the other as a cloud backup.

One-time setup:
1. Create a free project at supabase.com.
2. Open SQL Editor, paste all of `supabase-setup.sql`, and press Run.
3. Authentication › URL Configuration: set Site URL to your Netlify address, so confirmation and password-reset emails link back to the app.
4. Optional: Authentication › Sign In / Providers › Email: turn off "Confirm email" to skip the confirmation email when someone signs up. Supabase's built-in email service only sends a few emails per hour.
5. Project Settings › API Keys (or API): copy the Project URL and the publishable (anon) key. Put them in `config.js` before deploying (recommended, so nobody has to type them), or enter them in the app under Settings › Account › Set up accounts.

Never use the secret or service_role key in the app.

On iPhone, emails that confirm an account or reset a password open in Safari, not in the home-screen app. Finish there, then sign in from the home-screen app.

Free Supabase projects can be paused after a stretch of no use. The app keeps working offline from the device either way; restore the project from the Supabase dashboard if that happens.

The Supabase JavaScript library (MIT license) is included in `vendor/` so the app works offline.
