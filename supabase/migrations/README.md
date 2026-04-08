# Migrations folder

PostgreSQL migrations for Supabase live here as `*.sql` files.

- **Naming:** `<version>_<description>.sql`. The full basename (without `.sql`) is the migration version.
- **New changes:** add a new file with a **new** timestamp; do not reuse an existing basename.
- **Diagnostics:** not here — use `supabase/scripts/diagnostics/` (see `docs/MIGRATIONS.md`).

```bash
npm run db:analyze
npm run db:lint-migrations
```
