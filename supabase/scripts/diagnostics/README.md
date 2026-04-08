# SQL diagnostics (not migrations)

Scripts here are **manual runbooks** for the Supabase SQL Editor or `psql`. They are **not** applied by `supabase db push` or migration runners.

Historical copies of ad hoc diagnostics once lived under `supabase/migrations/`; those migration slots are now no-ops so fresh databases do not execute exploratory `SELECT` batches or one-off data fixes automatically.

When adding a new diagnostic:

- Use placeholders (e.g. `user@example.test`) for emails and UUIDs.
- Do not commit production credentials or real personal data.
