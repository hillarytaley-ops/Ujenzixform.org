/**
 * Fail if the legacy Supabase storage key string appears outside allowlisted files.
 * Scans the repo (not only src/). Run: npm run check:auth-keys
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FORBIDDEN = "sb-wuuyjjpgzgeimiptuuws-auth-token";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".vercel",
  ".output",
  "android",
  "ios",
  "playwright-report",
]);

/** Relative paths from repo root (posix) that may contain the literal. */
const ALLOWED_RELATIVE = new Set([
  "src/utils/supabaseAccessToken.ts",
  "scripts/patch-auth-storage-refs.mjs",
  "scripts/check-legacy-supabase-auth-key.mjs",
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs|cjs|vue|svelte)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const issues = [];
for (const file of walk(root)) {
  const norm = path.relative(root, file).split(path.sep).join("/");
  if (ALLOWED_RELATIVE.has(norm)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(FORBIDDEN)) issues.push(norm);
}

if (issues.length) {
  console.error(
    `Legacy Supabase auth key string must not appear outside allowlisted files.\nUse @/utils/supabaseAccessToken helpers or import LEGACY_SUPABASE_AUTH_STORAGE_KEY.\nOffenders:\n  ${issues.join("\n  ")}`
  );
  process.exit(1);
}

console.log("check-legacy-supabase-auth-key: OK (repo scan)");
