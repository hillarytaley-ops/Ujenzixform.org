#!/usr/bin/env node
/**
 * Heuristic scan of supabase/migrations for SECURITY DEFINER without a nearby
 * SET search_path (mitigates search_path hijacking in Postgres).
 *
 * Default: print report, exit 0 (legacy migrations have known debt).
 *   --strict   exit 1 if any finding
 *   --json     machine-readable output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

const WINDOW_LINES = 50;
const DEFINER_RE = /\bSECURITY\s+DEFINER\b/i;
const SEARCH_PATH_RE = /SET\s+search_path\s*=/i;

function stripLineComment(line) {
  const idx = line.indexOf('--');
  return idx === -1 ? line : line.slice(0, idx);
}

function windowAround(lines, centerIdx) {
  const lo = Math.max(0, centerIdx - WINDOW_LINES);
  const hi = Math.min(lines.length, centerIdx + WINDOW_LINES);
  let s = '';
  for (let j = lo; j < hi; j++) {
    s += stripLineComment(lines[j]) + '\n';
  }
  return s;
}

function findingsInFile(filePath, basename) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = stripLineComment(line);
    if (!DEFINER_RE.test(code)) continue;

    const w = windowAround(lines, i);
    if (SEARCH_PATH_RE.test(w)) continue;

    out.push({ file: basename, line: i + 1, snippet: line.trim().slice(0, 120) });
  }
  return out;
}

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const asJson = args.includes('--json');

const sqlFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const all = [];
for (const f of sqlFiles) {
  const fp = path.join(MIGRATIONS_DIR, f);
  all.push(...findingsInFile(fp, f));
}

const byFile = new Map();
for (const x of all) {
  if (!byFile.has(x.file)) byFile.set(x.file, []);
  byFile.get(x.file).push(x);
}

if (asJson) {
  console.log(JSON.stringify({ findings: all.length, files: byFile.size, items: all }, null, 2));
} else {
  console.log('\n🔒 Migration SECURITY DEFINER / search_path scan\n');
  console.log(`Files scanned: ${sqlFiles.length}`);
  console.log(`Findings (SECURITY DEFINER without SET search_path within ±${WINDOW_LINES} lines): ${all.length}`);
  console.log(`Affected migration files: ${byFile.size}`);
  if (all.length) {
    console.log('\nFirst 40 findings:');
    for (const x of all.slice(0, 40)) {
      console.log(`  ${x.file}:${x.line}  ${x.snippet}`);
    }
    if (all.length > 40) console.log(`  ... and ${all.length - 40} more`);
    console.log('\nNew migrations should pin search_path, e.g.:');
    console.log('  SECURITY DEFINER');
    console.log('  SET search_path = public');
    console.log('  AS $$ ... $$;');
    console.log('\nRun with --strict to fail CI when debt remains.');
  } else {
    console.log('\n✅ No heuristic findings.');
  }
  console.log('');
}

if (strict && all.length > 0) {
  process.exit(1);
}
