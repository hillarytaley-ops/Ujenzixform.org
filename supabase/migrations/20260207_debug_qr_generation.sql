-- Migration slot kept for history. Previous revisions ran interactive-style diagnostics
-- (including a DO block that called generate_individual_qr_codes_for_order), which is
-- inappropriate to execute automatically on every fresh migrate.
--
-- Use instead: supabase/scripts/diagnostics/debug-qr-generation.sql (manual / SQL Editor).
SELECT 1;
