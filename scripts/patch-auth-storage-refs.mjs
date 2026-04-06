/**
 * One-off maintenance: replace hardcoded Supabase auth storage key usage with
 * @/utils/supabaseAccessToken helpers. Run: node scripts/patch-auth-storage-refs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

const SKIP = new Set(["supabaseAccessToken.ts"]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

function ensureImports(content, symbols) {
  const uniq = [...new Set(symbols)].filter(Boolean).sort();
  if (uniq.length === 0) return content;

  const re =
    /import\s*\{([^}]*)\}\s*from\s*['"]@\/utils\/supabaseAccessToken['"]\s*;?/;
  const m = content.match(re);
  if (m) {
    const inner = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...inner, ...uniq])].sort();
    return content.replace(re, `import { ${merged.join(", ")} } from '@/utils/supabaseAccessToken';`);
  }

  const lines = content.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      insertAt = i;
      break;
    }
  }
  lines.splice(
    insertAt,
    0,
    `import { ${uniq.join(", ")} } from '@/utils/supabaseAccessToken';`
  );
  return lines.join("\n");
}

function patchFile(fp) {
  let s = fs.readFileSync(fp, "utf8");
  if (!s.includes("sb-wuuyjjpgzgeimiptuuws-auth-token")) return false;

  const symbols = new Set();

  const before = s;

  s = s.replace(
    /localStorage\.getItem\(\s*(?:\r?\n\s*)?['"]sb-wuuyjjpgzgeimiptuuws-auth-token['"]\s*(?:\r?\n\s*)?\)/g,
    () => {
      symbols.add("readPersistedAuthRawStringSync");
      return "readPersistedAuthRawStringSync()";
    }
  );

  s = s.replace(
    /localStorage\.setItem\(\s*['"]sb-wuuyjjpgzgeimiptuuws-auth-token['"]\s*,/g,
    () => {
      symbols.add("LEGACY_SUPABASE_AUTH_STORAGE_KEY");
      return "localStorage.setItem(LEGACY_SUPABASE_AUTH_STORAGE_KEY,";
    }
  );

  s = s.replace(
    /localStorage\.removeItem\(\s*['"]sb-wuuyjjpgzgeimiptuuws-auth-token['"]\s*\)/g,
    () => {
      symbols.add("clearSupabasePersistedSessionSync");
      return "clearSupabasePersistedSessionSync()";
    }
  );

  s = s.replace(/(['"])sb-wuuyjjpgzgeimiptuuws-auth-token\1/g, () => {
    symbols.add("LEGACY_SUPABASE_AUTH_STORAGE_KEY");
    return "LEGACY_SUPABASE_AUTH_STORAGE_KEY";
  });

  if (s === before) return false;

  s = ensureImports(s, [...symbols]);
  fs.writeFileSync(fp, s);
  return true;
}

const files = walk(srcDir).filter((f) => {
  const base = path.basename(f);
  return !SKIP.has(base) && !f.includes(".backup");
});

let n = 0;
for (const f of files) {
  if (patchFile(f)) {
    console.log("patched", path.relative(path.join(__dirname, ".."), f));
    n++;
  }
}
console.log("done,", n, "files");
