import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthRequired } from "@/components/security/AuthRequired";

/**
 * /monitoring: signed-in users OR guests with ?access_code= (approved monitoring request flow).
 * Without a code, the page requires auth so the route is not broadly public.
 */
export function MonitoringRouteShell({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  if (searchParams.get("access_code")?.trim()) {
    return <>{children}</>;
  }
  return <AuthRequired>{children}</AuthRequired>;
}
