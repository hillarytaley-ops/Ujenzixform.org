-- Run in Supabase SQL Editor if 20260624200000 is not applied via CLI yet.
-- Fixes delivery_provider_registrations insert (auth_user_id) + provider self-read for hiring gate.

\i ../migrations/20260624200000_fix_delivery_hiring_gate_rls.sql
