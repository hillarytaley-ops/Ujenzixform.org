#!/usr/bin/env node
/**
 * Writes supabase/combined_migrations_manual_run.sql — all supabase/migrations/*.sql
 * in lexicographic order (same order Supabase CLI uses).
 *
 * Usage: node scripts/combine-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const OUT = path.join(ROOT, 'supabase', 'combined_migrations_manual_run.sql');

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

const header = `-- =============================================================================
-- COMBINED MIGRATIONS (all files under supabase/migrations/, sorted by filename)
-- Generated: ${new Date().toISOString()}
--
-- WARNING: Only use on a truly empty / disposable database.
-- On an existing Supabase project, use: supabase db push  or  supabase migration up
-- so only pending migrations run and history stays correct.
-- This file is large; Supabase SQL Editor may time out — prefer psql or the CLI.
-- Regenerate: npm run db:combine-migrations
-- Files included: ${files.length}
-- =============================================================================

`;

const parts = [header];
for (const name of files) {
  const body = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
  parts.push(`\n-- >>> BEGIN: ${name}\n\n${body}\n\n-- <<< END: ${name}\n`);
}

fs.writeFileSync(OUT, parts.join(''), 'utf8');
const mb = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(2);
console.log(`Wrote ${OUT} (${mb} MiB, ${files.length} migrations).`);
