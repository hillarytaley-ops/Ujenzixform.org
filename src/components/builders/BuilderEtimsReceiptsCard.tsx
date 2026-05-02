import React, { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PoRow = {
  id: string;
  po_number: string;
  etims_verification_url: string | null;
};

/**
 * Lists purchase orders for this buyer where the integrator returned a verification / receipt URL
 * after a successful eTIMS invoice submission (stored on `purchase_orders`).
 */
export const BuilderEtimsReceiptsCard: React.FC<{ buyerUserId: string | null | undefined }> = ({
  buyerUserId,
}) => {
  const [rows, setRows] = useState<PoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const uid = buyerUserId?.trim();
    if (!uid) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, etims_verification_url")
        .eq("buyer_id", uid)
        .not("etims_verification_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(15);
      if (cancelled) return;
      if (error) {
        console.warn("[eTIMS] Builder verification links:", error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as PoRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerUserId]);

  if (!buyerUserId?.trim()) return null;
  if (!loading && rows.length === 0) return null;

  return (
    <Alert className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
      <AlertTitle className="text-foreground">KRA eTIMS receipt (integrator)</AlertTitle>
      <AlertDescription className="space-y-2 text-xs text-muted-foreground">
        <p>
          Tax invoices are sent to your linked <strong className="text-foreground">KRA / VFD integrator</strong> when you
          accept a supplier quote (automatic, best-effort). That is separate from paying the supplier. If the integrator
          returns a receipt link, it appears below.
        </p>
        {loading ? (
          <p className="text-muted-foreground">Loading links…</p>
        ) : (
          <ul className="list-none space-y-1.5 pl-0">
            {rows.map((r) => {
              const url = r.etims_verification_url?.trim();
              if (!url) return null;
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">{r.po_number}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Open verification / receipt
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
};
