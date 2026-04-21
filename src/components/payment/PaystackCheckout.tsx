import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Shield, Loader2, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TermsFeeSummary } from "@/components/legal/TermsFeeSummary";

const PAYSTACK_NAV_KEY = "ujenzi_paystack_after";

/** Set `VITE_PAYSTACK_TEST_MODE=true` in Vercel (or `.env.local`) while using `sk_test_…` in Supabase so all roles see a clear sandbox banner. Builder invoices: also allows **Pay now** on draft rows for Paystack sandbox testing (do not enable on production). */
export const isPaystackTestModeBanner = (): boolean => {
  const raw = import.meta.env.VITE_PAYSTACK_TEST_MODE;
  if (raw === undefined || raw === null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
};

export type PaystackCheckoutProps = {
  amount: number;
  currency?: string;
  description: string;
  /** Business reference for the order or cart (stored in Paystack metadata). */
  orderId: string;
  /** Where to send the user after Paystack return + server verification (default /home). */
  successNavigateTo?: string;
  onCancel?: () => void;
  className?: string;
};

export function PaystackCheckout({
  amount,
  currency = "KES",
  description,
  orderId,
  successNavigateTo = "/home",
  onCancel,
  className,
}: PaystackCheckoutProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const e = session?.user?.email?.trim();
      if (!cancelled && e) setEmail(e);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = async () => {
    if (!email.includes("@")) {
      toast({
        title: "Email required",
        description: "Enter the email Paystack will use for your receipt.",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to pay with Paystack.",
        variant: "destructive",
      });
      return;
    }

    const origin = window.location.origin;
    const callbackUrl = `${origin}/payment/paystack-callback`;

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          amount,
          currency,
          email: email.trim(),
          orderId,
          description,
          callbackUrl,
        },
      });

      const edgeMessage = async (): Promise<string | null> => {
        if (data && typeof data === "object" && "error" in data && typeof (data as { error: string }).error === "string") {
          return (data as { error: string }).error;
        }
        if (error && typeof error === "object" && error !== null && "context" in error) {
          const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              const body = (await ctx.json()) as { error?: string };
              if (body?.error && typeof body.error === "string") return body.error;
            } catch {
              /* ignore */
            }
          }
        }
        return null;
      };

      if (error) {
        const parsed = await edgeMessage();
        throw new Error(parsed || error.message || "Could not start checkout");
      }

      if (data?.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start checkout");
      }

      const url = data?.authorization_url as string | undefined;
      const reference = data?.reference as string | undefined;
      if (!url || !reference) {
        throw new Error("Paystack did not return a checkout URL.");
      }

      sessionStorage.setItem(
        PAYSTACK_NAV_KEY,
        JSON.stringify({
          successNavigateTo,
          orderId,
          amount,
          currency,
          description,
          reference,
        }),
      );

      window.location.assign(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast({ title: "Paystack", description: msg, variant: "destructive" });
      setBusy(false);
    }
  };

  const showTestBanner = isPaystackTestModeBanner();

  return (
    <div className={className}>
      {showTestBanner && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <FlaskConical className="h-4 w-4 text-amber-800 dark:text-amber-200" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Paystack test mode</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90 text-sm space-y-2">
            <p>
              No real money is charged. Use this for you, suppliers, and delivery partners to rehearse checkout. Your
              Supabase secret should be <code className="rounded bg-amber-100/80 dark:bg-amber-900/50 px-1">sk_test_…</code>
              , and the Paystack dashboard should be in <strong>Test</strong> mode for webhooks.
            </p>
            <p>
              Test cards and channels are documented in{" "}
              <a
                href="https://paystack.com/docs/payments/test-payments/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                Paystack test payments
              </a>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-4 border-emerald-200 bg-emerald-50/80">
        <Shield className="h-4 w-4 text-emerald-700" />
        <AlertTitle>Pay with Paystack</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Cards, M-Pesa, and other channels your Paystack business has enabled appear on Paystack&apos;s secure
          checkout page — you are not entering card details in UjenziXform.
        </AlertDescription>
      </Alert>

      <TermsFeeSummary variant="checkout" className="mb-4" />

      <div className="space-y-2 mb-4">
        <Label htmlFor="paystack-email">Email for receipt</Label>
        <Input
          id="paystack-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={busy}
        />
      </div>

      <Button
        type="button"
        className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700"
        onClick={startCheckout}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Opening Paystack…
          </>
        ) : (
          <>
            <Lock className="mr-2 h-5 w-5" />
            Pay {currency} {amount.toLocaleString()} with Paystack
          </>
        )}
      </Button>

      {onCancel && (
        <Button type="button" variant="ghost" className="w-full mt-3" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      )}
    </div>
  );
}

export { PAYSTACK_NAV_KEY };
