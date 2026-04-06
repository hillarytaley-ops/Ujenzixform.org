/**
 * Fail if the legacy Supabase storage key string appears outside allowlisted files.
 * Run: node scripts/check-legacy-supabase-auth-key.mjs
 * (npm run check:auth-keys)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FORBIDDEN = "sb-wuuyjjpgzgeimiptuuws-auth-token";

/** Basenames only — one canonical definition + tooling that must reference the literal. */
const ALLOWED_BASENAMES = new Set([
  "supabaseAccessToken.ts",
  "patch-auth-storage-refs.mjs",
  "check-legacy-supabase-auth-key.mjs",
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs|cjs|vue|svelte)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const issues = [];
for (const file of walk(path.join(root, "src"))) {
  if (ALLOWED_BASENAMES.has(path.basename(file))) continue;
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(FORBIDDEN)) issues.push(path.relative(root, file));
}

if (issues.length) {
  console.error(
    `Legacy Supabase auth key string must not appear outside @/utils/supabaseAccessToken (use helpers / LEGACY_SUPABASE_AUTH_STORAGE_KEY import).\nOffenders:\n  ${issues.join("\n  ")}`
  );
  process.exit(1);
}

console.log("check-legacy-supabase-auth-key: OK");
