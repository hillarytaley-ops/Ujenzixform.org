import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Package, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  grnPoItemsArray,
  openGrnPrintWindow,
  resolveGrnLineLabel,
  resolveGrnLineQty,
} from '@/utils/grnDocument';
import { sortSupplyChainDocsNewestFirst } from '@/utils/sortSupplyChainDocs';
import {
  builderHubListFetchWithTimeout,
  fetchBuilderHubGrns,
  patchHubGrns,
  peekHubGrns,
  subscribeBuilderHubCache,
} from '@/lib/builderInvoicesHubCache';

interface GRN {
  id: string;
  grn_number: string;
  delivery_note_id: string;
  purchase_order_id: string;
  items: any[];
  total_quantity: number;
  received_date: string;
  status: string;
  purchase_order?: {
    po_number?: string;
    items?: unknown[];
  };
}

interface GRNViewProps {
  userId: string;
  userRole: 'builder' | 'supplier' | 'admin';
  /** Aligns hub cache key with DN / invoices (profiles.id when used as buyer). */
  hubCacheProfileId?: string | null;
}

export const GRNView: React.FC<GRNViewProps> = ({ userId, userRole, hubCacheProfileId }) => {
  const [grns, setGRNs] = useState<GRN[]>(() => {
    if (userRole !== 'builder') return [];
    const raw = peekHubGrns(userId, hubCacheProfileId ?? undefined);
    return (raw as GRN[]) ?? [];
  });
  const [listReady, setListReady] = useState(() => {
    if (userRole !== 'builder') return false;
    return peekHubGrns(userId, hubCacheProfileId ?? undefined) !== null;
  });
  const [supplierLoading, setSupplierLoading] = useState(() => userRole !== 'builder');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchGRNs = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const isBuilder = userRole === 'builder';
    try {
      if (isBuilder && silent) setRefreshing(true);
      if (!silent && isBuilder) {
        const hit = peekHubGrns(userId, hubCacheProfileId ?? undefined);
        if (hit !== null) {
          setGRNs(hit as GRN[]);
          setListReady(true);
          return;
        }
      }
      if (!silent && !isBuilder) setSupplierLoading(true);

      if (isBuilder) {
        const sorted = (await builderHubListFetchWithTimeout(
          fetchBuilderHubGrns(userId, hubCacheProfileId ?? undefined),
          'grn_fetch_timeout'
        )) as GRN[];
        setGRNs(sorted);
        patchHubGrns(userId, hubCacheProfileId ?? undefined, sorted);
        return;
      }

      let query = supabase
        .from('goods_received_notes')
        .select(`
          *,
          purchase_order:purchase_orders(po_number, items)
        `)
        .order('created_at', { ascending: false })
        .limit(400);

      if (userRole === 'supplier') {
        // Get supplier ID from user_id
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (supplier) {
          query = query.eq('supplier_id', supplier.id);
        }
      }
      // Admin can see all

      const { data, error } = await query;
      if (error) throw error;
      const sorted = sortSupplyChainDocsNewestFirst(
        (data || []) as unknown as Record<string, unknown>[]
      ) as GRN[];
      setGRNs(sorted);
    } catch (error: any) {
      if (error?.name === 'AbortError' || /aborted/i.test(String(error?.message || ''))) {
        return;
      }
      const msg = String(error?.message || '');
      if (msg.includes('grn_fetch_timeout')) {
        toast({
          title: 'GRNs are taking too long',
          description: 'Try Refresh. If this keeps happening, ask your admin to check GRN / purchase_orders performance on Supabase.',
          variant: 'destructive',
        });
        setGRNs([]);
        return;
      }
      console.error('Error fetching GRNs:', error);
      toast({
        title: "Error",
        description: "Failed to load GRNs",
        variant: "destructive",
      });
    } finally {
      if (isBuilder) {
        if (silent) setRefreshing(false);
        setListReady(true);
      } else {
        setSupplierLoading(false);
        setListReady(true);
      }
    }
  };

  useLayoutEffect(() => {
    if (userRole !== 'builder') return;
    const hit = peekHubGrns(userId, hubCacheProfileId ?? undefined);
    if (hit !== null) {
      setGRNs(hit as GRN[]);
      setListReady(true);
    }
  }, [userId, userRole, hubCacheProfileId]);

  useEffect(() => {
    if (userRole !== 'builder') return;
    return subscribeBuilderHubCache(() => {
      const raw = peekHubGrns(userId, hubCacheProfileId ?? undefined);
      if (raw === null) return;
      setGRNs((raw as GRN[]) ?? []);
      setListReady(true);
    });
  }, [userId, userRole, hubCacheProfileId]);

  useEffect(() => {
    if (userId) {
      void fetchGRNs();

      // Mark as viewed by supplier when they view it
      if (userRole === 'supplier') {
        const markAsViewed = async () => {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (supplier) {
            await supabase
              .from('goods_received_notes')
              .update({ status: 'viewed_by_supplier' })
              .eq('supplier_id', supplier.id)
              .eq('status', 'generated');
          }
        };
        markAsViewed();
      }
    }
  }, [userId, userRole, hubCacheProfileId]);

  const handleDownloadGRN = (grn: GRN) => {
    const ok = openGrnPrintWindow(grn, {
      onPopUpBlocked: () =>
        toast({
          title: 'Pop-up blocked',
          description: 'Allow pop-ups for this site to print or save as PDF.',
          variant: 'destructive',
        }),
    });
    if (ok) {
      toast({
        title: 'GRN ready',
        description: 'Use your browser print dialog to save as PDF or print.',
      });
    }
  };

  const supplierBlocking = userRole !== 'builder' && supplierLoading && grns.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Goods Received Notes (GRN)</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={
            userRole === 'builder' ? refreshing && grns.length > 0 : supplierLoading
          }
          onClick={() => void fetchGRNs({ silent: true })}
        >
          {userRole === 'builder' ? (
            refreshing && grns.length > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )
          ) : supplierLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {supplierBlocking && (
        <div
          className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground"
          aria-busy="true"
          aria-label="Loading GRNs"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Loading GRNs…</span>
        </div>
      )}

      {userRole === 'builder' && !listReady && (
        <div
          className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-8 text-sm text-muted-foreground"
          aria-busy="true"
          aria-label="Loading GRNs"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          <span>Loading GRNs…</span>
        </div>
      )}

      {listReady && grns.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No GRNs available</p>
          </CardContent>
        </Card>
      )}

      {grns.length > 0 &&
        grns.map((grn) => (
        <Card key={grn.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{grn.grn_number}</CardTitle>
              <Badge variant={grn.status === 'viewed_by_supplier' ? 'default' : 'secondary'}>
                {grn.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">PO Number</p>
                  <p className="font-medium">{grn.purchase_order?.po_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Received Date</p>
                  <p className="font-medium">{new Date(grn.received_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Quantity</p>
                  <p className="font-medium">{grn.total_quantity} items</p>
                </div>
              </div>

              {(() => {
                const poLines = grnPoItemsArray(grn);
                const rows =
                  Array.isArray(grn.items) && grn.items.length > 0 ? grn.items : poLines;
                if (!rows.length) return null;
                return (
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Materials received
                    </p>
                    <ul className="space-y-2 text-sm">
                      {rows.map((raw, i) => {
                        const row = raw as Record<string, unknown>;
                        const label = resolveGrnLineLabel(row, poLines[i]);
                        const qty = resolveGrnLineQty(row, poLines[i]);
                        return (
                          <li
                            key={i}
                            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0 border-b border-dashed border-border/80 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="font-medium text-foreground min-w-0">{label}</span>
                            <span className="text-muted-foreground shrink-0 tabular-nums">Qty {qty}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleDownloadGRN(grn)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download GRN
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
