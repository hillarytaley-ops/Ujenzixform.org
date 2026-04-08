# Database migrations (Supabase / PostgreSQL)

## Source of truth

- **Applied order:** lexicographic sort of filenames under `supabase/migrations/*.sql`.
- **Version identity:** Supabase records the **full migration filename** (without `.sql`) as the version. Two files must not share the same name; different files that share only the same 14-digit timestamp prefix are still distinct versions.
- **Live schema:** After changes, regenerate app types (e.g. `supabase gen types`) so `src/integrations/supabase/types.ts` matches the linked project.

Do **not** edit migration files that are already applied to shared environments unless you intend to use [migration repair](https://supabase.com/docs/guides/cli/managing-environments#migration-repair) and coordinate with the team. Changing a file that is already recorded in `supabase_migrations.schema_migrations` can cause local/CI drift until repaired.

This repo occasionally **revises** very old migration bodies for safety (e.g. turning a diagnostic file into a no-op). After pulling such a change, run `supabase migration list` / repair if your tooling reports a checksum mismatch.

## Operational complexity

This repository has a long chain of incremental migrations. That is normal for a production app that has shipped many RLS and hotfix iterations. For onboarding:

1. Read this document and `supabase/migrations/README.md`.
2. Use `npm run db:analyze` for counts and categories.
3. Use `npm run db:lint-migrations` for `SECURITY DEFINER` / `search_path` heuristics (see below).
4. Prefer **new** forward migrations for changes; avoid squashing history on databases that already applied the chain.

Optional consolidation for **brand-new** databases only is a separate, manual process (export schema from Supabase, review, single baseline). The script `npm run db:consolidate` prints guidance only.

### One file for manual execution (advanced)

To produce a single SQL file containing **every** migration in order (for empty DBs / `psql` only):

```bash
npm run db:combine-migrations
```

Output: `supabase/combined_migrations_manual_run.sql` (large, gitignored). Prefer the Supabase CLI on real projects so migration history stays accurate.

## Diagnostics vs migrations

Ad hoc `SELECT` batches, one-off backfills, and account-specific troubleshooting must **not** live in `supabase/migrations/`. Use `supabase/scripts/diagnostics/` and run them manually in the SQL Editor when needed.

## SECURITY DEFINER

Functions with `SECURITY DEFINER` should pin `search_path` (typically `SET search_path = public`) so object resolution cannot be hijacked. Many older migrations predate strict pinning; the linter reports heuristic debt without failing CI by default.

```bash
npm run db:lint-migrations
npm run db:lint-migrations -- --strict   # fail if any finding
```

## Personal data in SQL

Avoid committing real emails, phone numbers, or production UUIDs in migrations. Some **historical** data/seed migrations still contain project-specific identifiers; treat them as legacy debt and prefer placeholders (`@example.test`) and local `seed.sql` for new work.

## Related docs

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — conceptual schema overview.
