# Deployment and “why you see no change”

Code on GitHub does not update the live site until your host builds and serves a new bundle. Use this checklist when the UI looks unchanged after a push.

## 1. Confirm the host built the latest commit (Vercel or other)

- **Vercel:** Dashboard → Project → **Deployments**. The top deployment should match the latest `main` commit SHA and show **Ready**.
- If nothing new appeared after `git push`: connect the GitHub repo to the Vercel project, or use **Redeploy** on the latest commit.
- If the build **failed**, open logs and fix errors; production keeps serving the **previous** successful build.

This repo includes **GitHub Actions** workflow [`.github/workflows/build-main.yml`](../.github/workflows/build-main.yml), which runs `npm run build` on every push to `main`. A green run means the app compiles; it does not replace Vercel’s deploy unless you add a deploy step with secrets.

## 2. Confirm the browser is loading the new JavaScript (cache)

- Open DevTools → **Network** → reload. Find the main bundle under `assets/` (e.g. `index-*.js`). After a real deploy, the **hash in the filename** should change.
- DevTools → **Application** → **Clear site data**, then reload (or hard refresh with **Disable cache** enabled).
- **Installed PWA / mobile browser:** clear storage for the site or reinstall; PWAs can cache old assets aggressively.

`vercel.json` sets `Cache-Control: no-cache` for HTML routes, but intermediaries or old tabs can still show stale JS until you force refresh.

## 3. Confirm Supabase has provider display RPCs (data, not just UI)

If the footer **Build** line updates but provider rows still show `—`, the database layer may be missing functions.

1. In **Supabase Dashboard** → **SQL Editor**, run [../supabase/verify_20260433_applied.sql](../supabase/verify_20260433_applied.sql).
2. Apply any pending migrations (e.g. `20260431`–`20260433`) via `supabase db push` or by running the SQL files against the **same** project your app’s URL and anon key target.

## 4. Capacitor (Android / iOS app)

Store and sideload builds **do not** update from GitHub automatically.

```bash
npm run build
npx cap sync
```

Then rebuild/open the native project (`npm run mobile:android` / `mobile:ios`) and reinstall or ship an update through the store.

## 5. Compare local vs production

```bash
npm run dev
```

If fixes appear locally but not on the public URL, the problem is **hosting/deploy**, not the React source.

## Build stamp in the UI

The site footer shows a short **Build:** identifier (git SHA prefix or `local`). Compare it to your latest GitHub commit to confirm production is serving the build you expect.
