#!/usr/bin/env node
/**
 * Copy a migration .sql file to the clipboard (UTF-16 on Windows) for pasting into
 * Supabase Dashboard → SQL Editor → Run.
 *
 * Usage (from repo root):
 *   npm run db:copy-migration-sql
 *       → copies the default monitoring access migration (see DEFAULT_REL below)
 *
 *   npm run db:copy-migration-sql -- 20260413140000
 *       → copies the single file whose name contains that fragment
 *
 *   npm run db:copy-migration-sql -- supabase/migrations/20260412180000_supabase_linter_security_fixes.sql
 *       → copies that exact path
 *
 * If more than one file matches the fragment, the script lists them; pass the full path.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Default: monitoring camera access alignment (safe to change). */
const DEFAULT_REL = path.join(
  'supabase',
  'migrations',
  '20260413140000_monitoring_camera_access_status_align.sql'
);

function resolveSqlPath(rawArg) {
  if (!rawArg || !String(rawArg).trim()) {
    return path.join(root, DEFAULT_REL);
  }
  const arg = String(rawArg).trim();
  const abs = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return abs;
  }
  const migDir = path.join(root, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) {
    console.error('Migrations folder not found:', migDir);
    process.exit(1);
  }
  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith('.sql') && f.includes(arg));
  if (files.length === 0) {
    console.error(`No migration file in supabase/migrations matching fragment: "${arg}"`);
    process.exit(1);
  }
  if (files.length > 1) {
    console.error(`Several migrations match "${arg}". Pass the full relative path, for example:\n`);
    files.sort().forEach((f) => console.error(`  supabase/migrations/${f}`));
    process.exit(1);
  }
  return path.join(migDir, files[0]);
}

const sqlPath = resolveSqlPath(process.argv[2]);

if (!fs.existsSync(sqlPath)) {
  console.error('File not found:', sqlPath);
  process.exit(1);
}

const text = fs.readFileSync(sqlPath, 'utf8');
const platform = process.platform;

function copyWindows() {
  execFileSync('clip', { input: Buffer.from(text, 'utf16le') });
}

try {
  if (platform === 'win32') {
    copyWindows();
  } else if (platform === 'darwin') {
    execFileSync('pbcopy', { input: text, encoding: 'utf8' });
  } else {
    const x = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8' });
    if (x.status !== 0) {
      const w = spawnSync('wl-copy', [], { input: text, encoding: 'utf8' });
      if (w.status !== 0) {
        console.log(text);
        console.error('\nInstall xclip or wl-clipboard, or copy from the path below.');
        console.error(sqlPath);
        process.exit(0);
      }
    }
  }
  const rel = path.relative(root, sqlPath).replace(/\\/g, '/');
  console.log(
    `Copied ${text.length} characters to clipboard.\n\n` +
      `1. Open Supabase Dashboard → SQL Editor → New query\n` +
      `2. Paste (Ctrl+V / Cmd+V)\n` +
      `3. Run\n\n` +
      `Source: ${rel}`
  );
} catch (e) {
  console.error('Clipboard failed:', e?.message || e);
  console.error('\nCopy manually from:\n', sqlPath);
  process.exit(1);
}
