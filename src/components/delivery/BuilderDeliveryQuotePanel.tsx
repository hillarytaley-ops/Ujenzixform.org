import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Banknote, ThumbsUp, ThumbsDown, Lock } from "lucide-react";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import {
  deliveryQuoteStatusLabel,
  isDeliveryQuotePaid,
  needsDeliveryQuotePayment,
  normalizeDeliveryQuoteStatus,
  parseDeliveryQuoteAmount,
} from "@/utils/deliveryQuotePayment";

type DrRow = {
  id: string;
  status: string | null;
  estimated_cost: number | null;
  delivery_quote_notes: string | null;
  delivery_quote_sent_at: string | null;
  delivery_quote_paid_at: string | null;
  pickup_address: string;
  delivery_address: string;
  material_type: string;
  pickup_date: string | null;
};

export type BuilderDeliveryQuotePanelProps = {
  /** profiles.id — delivery_requests.builder_id */
  profileId: string | null | undefined;
  /** auth.users id — legacy rows may use this as builder_id */
  authUserId: string | null | undefined;
  /** Post-login return path, e.g. /professional-builder-dashboard?tab=deliveries */
  paystackSuccessPath: string;
};

export function BuilderDeliveryQuotePanel({
  profileId,
  authUserId,
  paystackSuccessPath,
}: BuilderDeliveryQuotePanelProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DrRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const pid = profileId?.trim();
    const aid = authUserId?.trim();
    if (!pid && !aid) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      let q = supabase
        .from("delivery_requests")
        .select(
          "id,status,estimated_cost,delivery_quote_notes,delivery_quote_sent_at,delivery_quote_paid_at,pickup_address,delivery_address,material_type,pickup_date"
        )
        .in("status", ["quoted", "quote_accepted"])
        .order("created_at", { ascending: false });

      if (pid && aid && pid !== aid) {
        q = q.or(`builder_id.eq.${pid},builder_id.eq.${aid}`);
      } else {
        q = q.eq("builder_id", (pid || aid) as string);
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows((data as DrRow[]) || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load delivery quotes.";
      toast({ title: "Delivery quote", description: msg, variant: "destructive" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authUserId, profileId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const bid = profileId?.trim() || authUserId?.trim();
    if (!bid) return;

    const ch = supabase
      .channel(`builder-delivery-quotes-${bid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_requests",
          filter: `builder_id=eq.${bid}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [authUserId, load, profileId]);

  const accept = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase
        .from("delivery_requests")
        .update({
          status: "quote_accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "quoted")
        .select("id,status")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        await load();
        const refreshed = rows.find((r) => r.id === id);
        if (refreshed && normalizeDeliveryQuoteStatus(refreshed.status) === "quote_accepted") {
          toast({
            title: "Quote already accepted",
            description: "Scroll down on this card to pay with Paystack.",
          });
          return;
        }
        throw new Error("Could not accept quote. Refresh the page and try again.");
      }
      toast({
        title: "Quote accepted",
        description: "Complete Paystack payment below to alert nearby drivers.",
      });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not accept quote.";
      toast({ title: "Accept quote", description: msg, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("delivery_requests")
        .update({
          status: "quote_rejected",
          rejection_reason: "Builder declined the admin delivery quote.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "quoted");

      if (error) throw error;
      toast({ title: "Quote declined", description: "You can contact support if you need a revised quote." });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not decline quote.";
      toast({ title: "Decline quote", description: msg, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (!profileId && !authUserId) return null;

  if (loading && rows.length === 0) {
    return (
      <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading delivery quotes…
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div id="delivery-quotes-from-admin" className="mb-6">
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5 text-blue-600" />
            Delivery quotes from admin
          </CardTitle>
          <CardDescription>
            Accept the quote, then pay with Paystack. Drivers are notified only after payment succeeds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => {
            const st = normalizeDeliveryQuoteStatus(r.status);
            const amt = parseDeliveryQuoteAmount(r.estimated_cost);
            const showPay = needsDeliveryQuotePayment(r);
            const paid = isDeliveryQuotePaid(r);
            const showAccept = st === "quoted";

            return (
              <div
                key={r.id}
                className="rounded-lg border border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-slate-900/60 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {r.id.slice(0, 8)}…
                  </Badge>
                  <Badge
                    className={
                      st === "quoted"
                        ? "bg-blue-600"
                        : showPay
                          ? "bg-amber-600"
                          : paid
                            ? "bg-teal-600"
                            : "bg-slate-600"
                    }
                  >
                    {deliveryQuoteStatusLabel(r.status, r)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">{r.material_type}</span> —{" "}
                  {r.pickup_address} → {r.delivery_address}
                </p>
                {amt != null && (
                  <p className="text-lg font-semibold text-foreground">KES {amt.toLocaleString()}</p>
                )}
                {r.delivery_quote_notes ? (
                  <p className="text-sm border rounded-md p-2 bg-muted/40 whitespace-pre-wrap">
                    {r.delivery_quote_notes}
                  </p>
                ) : null}

                {showAccept && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busyId === r.id}
                      onClick={() => void accept(r.id)}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-1" />
                      )}
                      Accept quote
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => void reject(r.id)}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}

                {showPay && (
                  <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-100">
                          Pay delivery quote (required)
                        </p>
                        <p className="text-sm text-amber-900/90 dark:text-amber-100/90 mt-1">
                          Enter your email and tap the green button to open Paystack (M-Pesa, card, etc.). Nearby
                          drivers are alerted only after payment succeeds.
                        </p>
                      </div>
                    </div>
                    {amt != null ? (
                      <PaystackCheckout
                        amount={amt}
                        currency="KES"
                        description={`Delivery quote ${r.id.slice(0, 8)}`}
                        orderId={`drq_${r.id}`}
                        successNavigateTo={paystackSuccessPath}
                        variant="compact"
                      />
                    ) : (
                      <Alert variant="destructive">
                        <AlertDescription className="text-sm">
                          Quote amount is missing. Ask admin to resend the delivery quote with a valid KES amount.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {st === "quote_accepted" && paid && (
                  <Alert className="border-teal-200 bg-teal-50">
                    <AlertDescription className="text-sm text-teal-900">
                      Payment recorded. If drivers were not notified, refresh this page or contact support with quote ID{" "}
                      {r.id.slice(0, 8)}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
