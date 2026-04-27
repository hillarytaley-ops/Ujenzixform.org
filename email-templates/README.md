# Supabase Auth email templates (local workflow)

Branded, responsive HTML for **Magic link**, **Confirm signup**, and **Reset password**. Partials (`partials/header.html`, `partials/footer.html`) are stitched at build time; **Go template placeholders** (`{{ .ConfirmationURL }}`, etc.) are preserved in `dist/` for pasting into the Supabase dashboard.

## Commands

| Command | What it does |
|---------|----------------|
| `npm run email:templates` | Composes `pages/*.html` + partials → `email-templates/dist/*.html` (Supabase-ready). |
| `npm run email:templates:preview` | Same compose, replaces placeholders with mocks from `config.json`, writes `email-templates/preview-html/`, serves **http://127.0.0.1:4750/** |

Change preview port: `node scripts/email-templates.mjs preview --port 4760`

**Editor encoding:** Keep `email-templates/**/*.html` and `scripts/email-templates.mjs` saved as **UTF-8** (not UTF-16). UTF-16 on disk breaks Node and prevents `@@INCLUDE@@` resolution.

## Supabase dashboard mapping

Paste **body HTML only** from `dist/` into **Authentication → Email Templates** (subjects you can customize separately):

| File in `dist/` | Supabase template |
|-----------------|-------------------|
| `magic-link.html` | Magic Link |
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset password |

Official variable reference: [Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

This project uses at minimum:

- `{{ .ConfirmationURL }}` — magic link, email confirmation, and recovery links
- `{{ .Email }}` — recipient
- `{{ .SiteURL }}` — configured **Site URL** in Authentication settings

## Site URL and redirects (this app)

- **Magic link / OAuth-style return:** `src/pages/Auth.tsx` builds `redirectTo` as `` `${window.location.origin}/auth` `` (with optional query string). Set **Site URL** to your primary deployed origin (e.g. production). Under **Redirect URLs**, include every origin and path users may return to, e.g. `http://localhost:5173/auth`, `https://your-production-domain/auth`.
- **Password reset:** `src/components/QuickPasswordReset.tsx` uses `` `${window.location.origin}/reset-password` `` for `redirectTo`. Add each environment’s full URL to **Redirect URLs** (e.g. `http://localhost:5173/reset-password`, `https://your-production-domain/reset-password`).

If Supabase rejects a redirect, the email link may still open but the session handoff to your SPA will fail—keep this list updated when you add staging domains.

## Copy / paste workflow

1. Run `npm run email:templates`.
2. Open `email-templates/dist/<template>.html` in an editor.
3. Select all → copy → paste into the matching Supabase email template editor (HTML body).
4. Adjust the **subject line** in the dashboard to match your brand (not stored in this repo by default).

`email-templates/dist/` is ignored by the root `.gitignore` entry `dist/` (matches any `dist` directory). Treat it as a **generated artifact**: run `npm run email:templates` whenever you change sources, then copy the fresh HTML into the dashboard.

## Keeping previews in sync

- Edit **partials** for global header/footer changes.
- Edit **pages** for template-specific copy.
- Run `npm run email:templates:preview` and check all three links on the index page.
- Update `config.json` mock URLs if local ports or paths change.

## Optional future automation

Supabase supports updating templates via the **Management API** / project config (`mailer_templates_*` fields). You can add a CI step that uploads `dist/` contents if your team wants zero manual paste; until then, the build script keeps a single source of truth in git (`pages/` + `partials/`) and a deterministic `dist/` output for operators.
