#!/usr/bin/env node
/**
 * Migration Consolidation Script for MradiPro
 * 
 * This script helps consolidate 650+ migration files into a manageable set.
 * 
 * IMPORTANT: Only run this on a fresh database or after backing up your production data!
 * 
 * Usage:
 *   node scripts/consolidate-migrations.mjs --analyze    # Analyze current migrations
 *   node scripts/consolidate-migrations.mjs --generate   # Generate consolidated migration
 *   node scripts/consolidate-migrations.mjs --archive    # Move old migrations to archive
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const ARCHIVE_DIR = path.join(__dirname, '..', 'supabase', 'migrations_archive');

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || '--analyze';

async function analyzeMigrations() {
  console.log('\n📊 Analyzing migrations...\n');
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Total migration files: ${files.length}`);
  
  // Group by date prefix
  const byDate = {};
  const byCategory = {
    security: [],
    rls: [],
    tables: [],
    functions: [],
    views: [],
    indexes: [],
    data: [],
    other: []
  };
  
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    
    // Extract date prefix
    const dateMatch = file.match(/^(\d{8}|\d{14})/);
    const datePrefix = dateMatch ? dateMatch[1].substring(0, 8) : 'unknown';
    
    if (!byDate[datePrefix]) byDate[datePrefix] = [];
    byDate[datePrefix].push(file);
    
    // Categorize by content keywords
    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
    
    if (content.includes('security') || content.includes('audit') || content.includes('encrypt')) {
      byCategory.security.push(file);
    } else if (content.includes('policy') || content.includes('rls') || content.includes('row level')) {
      byCategory.rls.push(file);
    } else if (content.includes('create table')) {
      byCategory.tables.push(file);
    } else if (content.includes('create function') || content.includes('create or replace function')) {
      byCategory.functions.push(file);
    } else if (content.includes('create view')) {
      byCategory.views.push(file);
    } else if (content.includes('create index')) {
      byCategory.indexes.push(file);
    } else if (content.includes('insert into') || content.includes('update ') || content.includes('seed')) {
      byCategory.data.push(file);
    } else {
      byCategory.other.push(file);
    }
  }
  
  console.log(`\nTotal size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n📅 Migrations by date:');
  const sortedDates = Object.keys(byDate).sort().reverse();
  for (const date of sortedDates.slice(0, 10)) {
    console.log(`  ${date}: ${byDate[date].length} files`);
  }
  if (sortedDates.length > 10) {
    console.log(`  ... and ${sortedDates.length - 10} more dates`);
  }
  
  console.log('\n📁 Migrations by category:');
  for (const [category, categoryFiles] of Object.entries(byCategory)) {
    if (categoryFiles.length > 0) {
      console.log(`  ${category}: ${categoryFiles.length} files`);
    }
  }
  
  console.log('\n💡 Recommendations:');
  if (files.length > 100) {
    console.log('  ⚠️  You have a lot of migrations. Consider consolidating.');
  }
  
  // Find potential duplicates (same content hash)
  const contentHashes = {};
  let duplicates = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8').trim();
    const hash = simpleHash(content);
    if (contentHashes[hash]) {
      duplicates++;
    } else {
      contentHashes[hash] = file;
    }
  }
  
  if (duplicates > 0) {
    console.log(`  ⚠️  Found ${duplicates} potential duplicate migrations`);
  }

  // Same 14-digit timestamp prefix (different suffixes): distinct Supabase versions, but confusing when skimming
  const by14 = {};
  for (const file of files) {
    const m14 = file.match(/^(\d{14})_/);
    if (!m14) continue;
    const p = m14[1];
    if (!by14[p]) by14[p] = [];
    by14[p].push(file);
  }
  const prefixDupes = Object.entries(by14).filter(([, arr]) => arr.length > 1);
  if (prefixDupes.length > 0) {
    console.log(`\n⚠️  Migrations sharing the same 14-digit prefix (${prefixDupes.length} prefixes):`);
    for (const [prefix, arr] of prefixDupes.slice(0, 15)) {
      console.log(`  ${prefix}: ${arr.length} files`);
      for (const n of arr) console.log(`    - ${n}`);
    }
    if (prefixDupes.length > 15) {
      console.log(`  ... and ${prefixDupes.length - 15} more prefixes`);
    }
    console.log('  (Each file is still a unique version; avoid reusing the same full basename.)');
  }
  
  // Find empty migrations
  const emptyMigrations = files.filter(f => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8').trim();
    return content.length < 50 || content.match(/^--.*$/gm)?.join('').length === content.length;
  });
  
  if (emptyMigrations.length > 0) {
    console.log(`  ⚠️  Found ${emptyMigrations.length} empty or comment-only migrations`);
  }
  
  console.log('\n✅ Analysis complete!\n');
  
  return { files, byDate, byCategory, totalSize };
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function generateConsolidated() {
  console.log('\n🔧 Generating consolidated migration...\n');
  
  const analysis = await analyzeMigrations();
  
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const outputFile = path.join(MIGRATIONS_DIR, `${timestamp}_consolidated_schema.sql`);
  
  let consolidated = `-- =========================================
-- MradiPro Consolidated Schema Migration
-- Generated: ${new Date().toISOString()}
-- Original migrations: ${analysis.files.length}
-- =========================================

-- IMPORTANT: This is a consolidated migration for new deployments.
-- Do NOT run this on an existing database with data!

`;
  
  // Add instructions
  consolidated += `
-- How to use this migration:
-- 1. For NEW databases: Run this single file
-- 2. For EXISTING databases: Do NOT run this, use incremental migrations
-- 3. After running, archive old migrations to migrations_archive/

`;

  console.log(`📝 Output would be written to: ${outputFile}`);
  console.log('\n⚠️  IMPORTANT: Consolidation requires manual review!');
  console.log('    1. Export your current schema from Supabase Dashboard');
  console.log('    2. Review and clean up the exported schema');
  console.log('    3. Save as a new consolidated migration');
  console.log('\n💡 Tip: Use Supabase CLI to generate schema:');
  console.log('    supabase db dump --schema public > consolidated_schema.sql\n');
}

async function archiveMigrations() {
  console.log('\n📦 Archiving old migrations...\n');
  
  // Create archive directory
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    console.log(`Created archive directory: ${ARCHIVE_DIR}`);
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  // Keep only recent migrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().replace(/-/g, '').substring(0, 8);
  
  let archived = 0;
  let kept = 0;
  
  for (const file of files) {
    const dateMatch = file.match(/^(\d{8})/);
    const fileDate = dateMatch ? dateMatch[1] : '99999999';
    
    if (fileDate < cutoffDate) {
      // Move to archive
      const src = path.join(MIGRATIONS_DIR, file);
      const dest = path.join(ARCHIVE_DIR, file);
      fs.renameSync(src, dest);
      archived++;
    } else {
      kept++;
    }
  }
  
  console.log(`✅ Archived: ${archived} migrations`);
  console.log(`✅ Kept: ${kept} recent migrations`);
  console.log(`\n📁 Archive location: ${ARCHIVE_DIR}\n`);
}

// Main execution
console.log('🏗️  MradiPro Migration Consolidation Tool\n');

switch (mode) {
  case '--analyze':
    await analyzeMigrations();
    break;
  case '--generate':
    await generateConsolidated();
    break;
  case '--archive':
    console.log('⚠️  WARNING: This will move old migrations to an archive folder!');
    console.log('    Make sure you have a backup before proceeding.\n');
    console.log('    To confirm, run: node scripts/consolidate-migrations.mjs --archive --confirm\n');
    if (args.includes('--confirm')) {
      await archiveMigrations();
    }
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/consolidate-migrations.mjs --analyze    # Analyze migrations');
    console.log('  node scripts/consolidate-migrations.mjs --generate   # Generate consolidated');
    console.log('  node scripts/consolidate-migrations.mjs --archive    # Archive old migrations');
}














