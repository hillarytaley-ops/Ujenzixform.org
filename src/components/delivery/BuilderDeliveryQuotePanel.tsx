import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Banknote, ThumbsUp, ThumbsDown } from "lucide-react";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";

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
      const { error } = await supabase
        .from("delivery_requests")
        .update({
          status: "quote_accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "quoted");

      if (error) throw error;
      toast({ title: "Quote accepted", description: "Pay the delivery quote to alert nearby drivers." });
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
    <div className="space-y-4 mb-6">
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5 text-blue-600" />
            Delivery quotes from admin
          </CardTitle>
          <CardDescription>
            Review the amount, accept to pay with Paystack, then drivers near your pickup are notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => {
            const amt = r.estimated_cost != null ? Number(r.estimated_cost) : NaN;
            const canPay =
              r.status === "quote_accepted" &&
              !r.delivery_quote_paid_at &&
              Number.isFinite(amt) &&
              amt >= 1;

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
                      r.status === "quoted"
                        ? "bg-blue-600"
                        : r.status === "quote_accepted"
                          ? "bg-amber-600"
                          : "bg-slate-600"
                    }
                  >
                    {r.status === "quoted"
                      ? "Quote received"
                      : r.status === "quote_accepted"
                        ? "Awaiting payment"
                        : r.status ?? ""}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">{r.material_type}</span> —{" "}
                  {r.pickup_address} → {r.delivery_address}
                </p>
                {Number.isFinite(amt) && (
                  <p className="text-lg font-semibold text-foreground">KES {amt.toLocaleString()}</p>
                )}
                {r.delivery_quote_notes ? (
                  <p className="text-sm border rounded-md p-2 bg-muted/40 whitespace-pre-wrap">{r.delivery_quote_notes}</p>
                ) : null}
                {r.status === "quoted" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busyId === r.id}
                      onClick={() => void accept(r.id)}
                    >
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-1" />}
                      Accept quote
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => void reject(r.id)}>
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
                {canPay && (
                  <PaystackCheckout
                    amount={amt}
                    currency="KES"
                    description={`Delivery quote ${r.id.slice(0, 8)}`}
                    orderId={`drq_${r.id}`}
                    successNavigateTo={paystackSuccessPath}
                    className="max-w-md"
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
