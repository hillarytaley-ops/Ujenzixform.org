import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Package, Receipt, Loader2, Eye, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceManagement } from '@/components/invoices/InvoiceManagement';
import { useToast } from '@/hooks/use-toast';

interface SupplierInvoiceHubProps {
  userId: string;
  supplierRecordId: string | null;
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
}

function humanizeStatus(status: string | undefined) {
  if (!status) return '—';
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const SupplierInvoiceHub: React.FC<SupplierInvoiceHubProps> = ({
  userId,
  supplierRecordId,
  isDarkMode,
  textColor,
  mutedText,
  cardBg,
}) => {
  const { toast } = useToast();
  const location = useLocation();
  const viewOrdersHref = `${location.pathname}?tab=view-orders`;
  const [subTab, setSubTab] = useState('invoices');
  const [dnLoading, setDnLoading] = useState(false);
  const [grnLoading, setGrnLoading] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [poById, setPoById] = useState<Record<string, string>>({});
  const [grnUpdatingId, setGrnUpdatingId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<
    { id: string; po_number: string; status: string; updated_at: string | null }[]
  >([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(false);

  const loadRecentOrders = useCallback(async () => {
    if (!supplierRecordId) return;
    setRecentOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, updated_at')
        .eq('supplier_id', supplierRecordId)
        .order('updated_at', { ascending: false })
        .limit(25);

      if (error) throw error;
      setRecentOrders(data || []);
    } catch (e: any) {
      console.error('Supplier recent orders fetch:', e);
      setRecentOrders([]);
    } finally {
      setRecentOrdersLoading(false);
    }
  }, [supplierRecordId]);

  useEffect(() => {
    void loadRecentOrders();
  }, [loadRecentOrders]);

  /** No client filter on supplier_id: RLS returns every DN this login may see (by supplier_id or linked PO). */
  const loadDeliveryNotes = useCallback(async () => {
    setDnLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = rows || [];
      setDeliveryNotes(list);

      const poIds = [...new Set(list.map((r) => r.purchase_order_id).filter(Boolean))];
      if (poIds.length === 0) {
        setPoById({});
        return;
      }
      const { data: pos, error: poErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number')
        .in('id', poIds);
      if (poErr) throw poErr;
      setPoById(Object.fromEntries((pos || []).map((p: any) => [p.id, p.po_number || '—'])));
    } catch (e: any) {
      console.error('Supplier DN fetch:', e);
      toast({
        title: 'Could not load delivery notes',
        description: e?.message || 'Try again later.',
        variant: 'destructive',
      });
      setDeliveryNotes([]);
    } finally {
      setDnLoading(false);
    }
  }, [toast]);

  const loadGrns = useCallback(async () => {
    setGrnLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('goods_received_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrns(rows || []);
    } catch (e: any) {
      console.error('Supplier GRN fetch:', e);
      toast({
        title: 'Could not load GRNs',
        description: e?.message || 'Try again later.',
        variant: 'destructive',
      });
      setGrns([]);
    } finally {
      setGrnLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (subTab === 'delivery-notes') loadDeliveryNotes();
    if (subTab === 'grn') loadGrns();
  }, [subTab, loadDeliveryNotes, loadGrns]);

  // Preload DN + GRN when the hub mounts so sub-tabs show data without an extra click.
  useEffect(() => {
    void loadDeliveryNotes();
    void loadGrns();
  }, [loadDeliveryNotes, loadGrns]);

  const markGrnViewed = async (id: string) => {
    setGrnUpdatingId(id);
    try {
      const { error } = await supabase
        .from('goods_received_notes')
        .update({
          status: 'viewed_by_supplier',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Marked as viewed',
        description: 'GRN status updated. An invoice may be generated for the builder.',
      });
      await loadGrns();
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.message || 'Check permissions or try again.',
        variant: 'destructive',
      });
    } finally {
      setGrnUpdatingId(null);
    }
  };

  if (!supplierRecordId) {
    return (
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textColor}>Invoice & documents</CardTitle>
          <CardDescription className={mutedText}>
            Your supplier profile must be linked before invoices, delivery notes, and GRNs appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cardBg}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${textColor}`}>
          <Receipt className="h-5 w-5 text-orange-500" />
          Invoice
        </CardTitle>
        <CardDescription className={mutedText}>
          Receive and send invoices, review delivery notes forwarded by builders, and acknowledge goods received notes
          (GRN).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-600 bg-slate-900/40' : 'bg-muted/40'}`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
              <ShoppingCart className="h-4 w-4 shrink-0 text-orange-500" />
              Your orders (same as View Orders)
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={viewOrdersHref} replace>
                Open View Orders
              </Link>
            </Button>
          </div>
          <p className={`mb-3 text-xs leading-relaxed ${mutedText}`}>
            The tabs below list <strong>documents</strong> (invoice / delivery note / GRN rows in the database), not
            every purchase order. Those documents usually appear after an order is marked{' '}
            <strong>delivered</strong> and the builder-side workflow runs. If you have many orders but empty tabs,
            it often means no DN/GRN/invoice rows exist yet — not a broken dashboard.
          </p>
          {recentOrdersLoading ? (
            <div className={`flex items-center gap-2 py-4 text-sm ${mutedText}`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recent orders…
            </div>
          ) : recentOrders.length === 0 ? (
            <p className={`text-sm ${mutedText}`}>No purchase orders returned for this supplier account.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className={isDarkMode ? 'border-slate-600' : ''}>
                    <TableHead>PO</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.po_number || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{humanizeStatus(o.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.updated_at ? new Date(o.updated_at).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
          <TabsList
            className={`grid h-auto w-full grid-cols-1 gap-2 p-1 sm:grid-cols-3 ${
              isDarkMode ? 'bg-slate-900' : 'bg-muted'
            }`}
          >
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="delivery-notes" className="gap-2">
              <FileText className="h-4 w-4 shrink-0" />
              Delivery notes
            </TabsTrigger>
            <TabsTrigger value="grn" className="gap-2">
              <Package className="h-4 w-4 shrink-0" />
              GRN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-0 space-y-4">
            <p className={`text-sm ${mutedText}`}>
              Invoices tied to your supplier account: edit and send when marked editable.
            </p>
            <InvoiceManagement userId={userId} userRole="supplier" />
          </TabsContent>

          <TabsContent value="delivery-notes" className="mt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={`text-sm ${mutedText}`}>
                Delivery notes for your orders (e.g. after builder sign-off).
              </p>
              <Button variant="outline" size="sm" onClick={() => loadDeliveryNotes()} disabled={dnLoading}>
                Refresh
              </Button>
            </div>
            {dnLoading ? (
              <div className={`flex items-center justify-center py-12 ${mutedText}`}>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading…
              </div>
            ) : deliveryNotes.length === 0 ? (
              <div className={`space-y-2 rounded-lg border py-10 px-4 text-center text-sm ${mutedText}`}>
                <p>No delivery notes yet.</p>
                <p className="mx-auto max-w-md text-xs leading-relaxed">
                  A delivery note is normally created when the linked purchase order becomes{' '}
                  <strong>delivered</strong> (e.g. after the delivery provider completes the job). Use{' '}
                  <Link className="text-orange-600 underline underline-offset-2" to={viewOrdersHref} replace>
                    View Orders
                  </Link>{' '}
                  to check order status.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className={isDarkMode ? 'border-slate-600' : ''}>
                      <TableHead>DN</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery date</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryNotes.map((dn) => (
                      <TableRow key={dn.id}>
                        <TableCell className="font-mono text-sm">
                          {dn.dn_number || dn.delivery_note_number || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {poById[dn.purchase_order_id] || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{humanizeStatus(dn.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {dn.delivery_date
                            ? new Date(dn.delivery_date).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {dn.updated_at
                            ? new Date(dn.updated_at).toLocaleString()
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="grn" className="mt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={`text-sm ${mutedText}`}>
                Goods received notes after a builder accepts delivery. Mark as viewed to continue the invoice workflow.
              </p>
              <Button variant="outline" size="sm" onClick={() => loadGrns()} disabled={grnLoading}>
                Refresh
              </Button>
            </div>
            {grnLoading ? (
              <div className={`flex items-center justify-center py-12 ${mutedText}`}>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading…
              </div>
            ) : grns.length === 0 ? (
              <div className={`space-y-2 rounded-lg border py-10 px-4 text-center text-sm ${mutedText}`}>
                <p>No GRNs yet.</p>
                <p className="mx-auto max-w-md text-xs leading-relaxed">
                  GRNs are created after the builder accepts delivery against a delivery note. If orders are still in
                  transit or not delivered, this list will stay empty.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className={isDarkMode ? 'border-slate-600' : ''}>
                      <TableHead>GRN #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-sm">{g.grn_number || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{humanizeStatus(g.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {g.received_date
                            ? new Date(g.received_date).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {g.status === 'generated' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={grnUpdatingId === g.id}
                              onClick={() => markGrnViewed(g.id)}
                            >
                              {grnUpdatingId === g.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="mr-1 h-4 w-4" />
                                  Mark viewed
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SupplierInvoiceHub;
