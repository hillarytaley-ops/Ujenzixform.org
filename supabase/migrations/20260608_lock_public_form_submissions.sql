-- Close direct anon bypass for public forms once submit-public-form Edge Function is deployed.
-- Deploy function first: supabase functions deploy submit-public-form
-- Secrets: TURNSTILE_SECRET_KEY and/or RECAPTCHA_SECRET_KEY
--
-- Safe to run even if submit_contact_form was never created (skips REVOKE in that case).

DO $$
DECLARE
  func_sig regprocedure;
BEGIN
  FOR func_sig IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'submit_contact_form'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', func_sig);
    RAISE NOTICE 'Revoked anon EXECUTE on %', func_sig;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "feedback_insert_anon" ON public.feedback;
REVOKE INSERT ON public.feedback FROM anon;
