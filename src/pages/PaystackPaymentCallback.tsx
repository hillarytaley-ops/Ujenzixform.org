import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { PAYSTACK_NAV_KEY } from "@/components/payment/PaystackCheckout";

/**
 * Paystack redirects here with ?reference=…&trxref=… after the customer attempts payment.
 */
export default function PaystackPaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "ok" | "fail">("working");
  const [message, setMessage] = useState("Verifying payment…");

  useEffect(() => {
    let alive = true;

    (async () => {
      const reference =
        searchParams.get("reference")?.trim() ||
        searchParams.get("trxref")?.trim() ||
        "";

      if (!reference) {
        if (!alive) return;
        setState("fail");
        setMessage("Missing payment reference. Try again from checkout.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!alive) return;
        setState("fail");
        setMessage("Your session expired. Sign in again, then return to checkout if needed.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (!alive) return;

      if (error) {
        setState("fail");
        setMessage(error.message || "Verification failed.");
        return;
      }

      if (data?.error && !data?.ok) {
        setState("fail");
        setMessage(typeof data.error === "string" ? data.error : "Payment was not completed.");
        return;
      }

      if (data?.ok === true) {
        setState("ok");
        setMessage("Payment verified. Redirecting…");
        let navTo = "/home";
        try {
          const raw = sessionStorage.getItem(PAYSTACK_NAV_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { successNavigateTo?: string };
            if (typeof parsed.successNavigateTo === "string" && parsed.successNavigateTo.startsWith("/")) {
              navTo = parsed.successNavigateTo;
            }
          }
        } catch {
          /* ignore */
        }
        sessionStorage.removeItem(PAYSTACK_NAV_KEY);
        sessionStorage.setItem(
          "ujenzi_paystack_last_success",
          JSON.stringify({
            reference: data.reference,
            amount: data.amount,
            currency: data.currency,
            channel: data.channel,
            metadata: data.metadata,
            paid_at: data.paid_at,
          }),
        );
        setTimeout(() => navigate(navTo, { replace: true, state: { paystackVerified: true, reference: data.reference } }), 800);
        return;
      }

      setState("fail");
      setMessage("This payment is not successful yet or was declined.");
    })();

    return () => {
      alive = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === "working" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {state === "ok" && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            {state === "fail" && <XCircle className="h-6 w-6 text-destructive" />}
            Paystack
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state === "fail" && (
            <Button className="w-full" onClick={() => navigate("/home", { replace: true })}>
              Back to home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
