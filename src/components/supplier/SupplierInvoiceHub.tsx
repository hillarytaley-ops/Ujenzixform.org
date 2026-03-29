import React, { useState, useEffect, useCallback } from 'react';
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
import { FileText, Package, Receipt, Loader2, Eye } from 'lucide-react';
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
  const [subTab, setSubTab] = useState('invoices');
  const [dnLoading, setDnLoading] = useState(false);
  const [grnLoading, setGrnLoading] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [poById, setPoById] = useState<Record<string, string>>({});
  const [grnUpdatingId, setGrnUpdatingId] = useState<string | null>(null);

  /** Prefer SECURITY DEFINER RPC (migration 20260329330000) so lists are not empty when RLS + nested PO checks fail. */
  const loadDeliveryNotes = useCallback(async () => {
    setDnLoading(true);
    try {
      const rpc = await supabase.rpc('list_delivery_notes_for_supplier');
      let list: any[] = [];
      if (!rpc.error && Array.isArray(rpc.data)) {
        list = rpc.data;
      } else {
        if (rpc.error) {
          console.warn('list_delivery_notes_for_supplier RPC unavailable, using direct select:', rpc.error.message);
        }
        const { data: rows, error } = await supabase
          .from('delivery_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        list = rows || [];
      }
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
      const rpc = await supabase.rpc('list_goods_received_notes_for_supplier');
      let rows: any[] = [];
      if (!rpc.error && Array.isArray(rpc.data)) {
        rows = rpc.data;
      } else {
        if (rpc.error) {
          console.warn('list_goods_received_notes_for_supplier RPC unavailable, using direct select:', rpc.error.message);
        }
        const { data, error } = await supabase
          .from('goods_received_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = data || [];
      }
      setGrns(rows);
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
      <CardContent>
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
              <div className={`rounded-lg border py-10 text-center text-sm ${mutedText}`}>
                No delivery notes yet.
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
              <div className={`rounded-lg border py-10 text-center text-sm ${mutedText}`}>
                No GRNs yet.
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
