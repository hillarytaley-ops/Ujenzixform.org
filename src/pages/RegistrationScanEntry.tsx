import { useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { REGISTRATION_SCAN_KIND_TO_PATH } from "@/utils/authRegistrationNext";

/**
 * QR landing: signed-out users → /auth?next=… ; signed-in visitors → role registration form.
 */
const RegistrationScanEntry = () => {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const target = kind ? REGISTRATION_SCAN_KIND_TO_PATH[kind] : undefined;
    if (!target) {
      navigate("/auth", { replace: true });
      return;
    }

    let cancelled = false;

    void (async () => {
      // Prefer local session first so signed-in visitors skip /auth (no network wait for getUser).
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        navigate(target, { replace: true });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        navigate(target, { replace: true });
        return;
      }

      const qs = new URLSearchParams({ next: target, tab: "signin" });
      navigate(`/auth?${qs.toString()}`, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background text-muted-foreground text-sm">
      Taking you to the right place…
    </div>
  );
};

export default RegistrationScanEntry;
