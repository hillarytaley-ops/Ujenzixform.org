import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { PAYSTACK_NAV_KEY } from "@/components/payment/PaystackCheckout";
import { deliveryProviderNotificationService } from "@/services/DeliveryProviderNotificationService";

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

        const meta = data?.metadata as Record<string, unknown> | undefined;
        const orderId = typeof meta?.order_id === "string" ? meta.order_id.trim() : "";
        if (orderId.startsWith("drq_")) {
          const drId = orderId.slice(4);
          const stamp = new Date().toISOString();
          const ref = typeof data.reference === "string" ? data.reference.trim() : "";

          const { data: updated, error: upErr } = await supabase
            .from("delivery_requests")
            .update({
              status: "delivery_quote_paid",
              delivery_quote_paid_at: stamp,
              delivery_quote_paystack_reference: ref || null,
              updated_at: stamp,
            })
            .eq("id", drId)
            .eq("status", "quote_accepted")
            .select(
              "id,pickup_address,delivery_address,pickup_date,material_type,special_instructions,pickup_latitude,pickup_longitude,delivery_latitude,delivery_longitude"
            )
            .maybeSingle();

          if (upErr) {
            console.warn("[paystack-callback] delivery quote update:", upErr.message);
          } else if (updated) {
            const row = updated as {
              id: string;
              pickup_address: string;
              delivery_address: string;
              pickup_date: string | null;
              material_type: string | null;
              special_instructions: string | null;
              pickup_latitude: number | null;
              pickup_longitude: number | null;
              delivery_latitude: number | null;
              delivery_longitude: number | null;
            };
            try {
              await deliveryProviderNotificationService.notifyNearbyProviders(
                {
                  id: row.id,
                  pickup_address: row.pickup_address || "",
                  delivery_address: row.delivery_address || "",
                  pickup_date: (row.pickup_date || new Date().toISOString().slice(0, 10)) as string,
                  material_type: row.material_type || undefined,
                  special_instructions: row.special_instructions || undefined,
                  pickup_latitude: row.pickup_latitude,
                  pickup_longitude: row.pickup_longitude,
                  delivery_latitude: row.delivery_latitude,
                  delivery_longitude: row.delivery_longitude,
                },
                { radiusKm: 75 }
              );
            } catch (e: unknown) {
              console.warn("[paystack-callback] notifyNearbyProviders:", e);
            }
          }
        }

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
