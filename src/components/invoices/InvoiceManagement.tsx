import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Edit, CheckCircle2, CreditCard, Loader2, Send, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  purchase_order_id: string;
  grn_id?: string;
  supplier_id: string;
  builder_id: string;
  items: any[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  invoice_date: string;
  due_date: string;
  status: string;
  payment_status: string;
  is_editable: boolean;
  acknowledged_at?: string;
  purchase_order?: {
    po_number?: string;
  };
  supplier?: {
    company_name?: string;
  };
}

interface InvoiceManagementProps {
  userId: string;
  userRole: 'builder' | 'supplier' | 'admin';
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ userId, userRole }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const { toast } = useToast();

  // Form state for editing
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedSubtotal, setEditedSubtotal] = useState(0);
  const [editedTax, setEditedTax] = useState(0);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editedTotal, setEditedTotal] = useState(0);
  const [editedNotes, setEditedNotes] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Supplier: RLS restricts rows; avoid .eq(supplier_id) so invoices still show when supplier_id/auth/PO linkage varies.
      if (userRole === 'supplier') {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setInvoices(data || []);
        return;
      }

      let query = supabase
        .from('invoices')
        .select(`
          *,
          purchase_order:purchase_orders(po_number),
          supplier:suppliers(company_name)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'builder') {
        query = query.eq('builder_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
  }, [userId, userRole]);

  const handleEditInvoice = (invoice: Invoice) => {
    if (!invoice.is_editable) {
      toast({
        title: "Cannot Edit",
        description: "This invoice is no longer editable",
        variant: "destructive",
      });
      return;
    }

    setEditingInvoice(invoice);
    setEditedItems(Array.isArray(invoice.items) ? [...invoice.items] : []);
    setEditedSubtotal(invoice.subtotal);
    setEditedTax(invoice.tax_amount);
    setEditedDiscount(invoice.discount_amount);
    setEditedTotal(invoice.total_amount);
    setEditedNotes(invoice.notes || '');
    setShowEditDialog(true);
  };

  const calculateTotal = () => {
    const total = editedSubtotal + editedTax - editedDiscount;
    setEditedTotal(total);
  };

  useEffect(() => {
    calculateTotal();
  }, [editedSubtotal, editedTax, editedDiscount]);

  const handleSaveInvoice = async () => {
    if (!editingInvoice) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('invoices')
        .update({
          items: editedItems,
          subtotal: editedSubtotal,
          tax_amount: editedTax,
          discount_amount: editedDiscount,
          total_amount: editedTotal,
          notes: editedNotes,
          last_edited_at: new Date().toISOString(),
          last_edited_by: userId,
          status: 'sent', // Mark as sent when supplier edits
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;

      toast({
        title: "Invoice Updated",
        description: "Invoice has been updated and sent to builder",
      });

      setShowEditDialog(false);
      fetchInvoices();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledgeInvoice = async (invoice: Invoice) => {
    try {
      setAcknowledging(true);

      const { error } = await supabase
        .from('invoices')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
          status: 'acknowledged',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: "Invoice Acknowledged",
        description: "You can now proceed with payment",
      });

      fetchInvoices();
    } catch (error: any) {
      console.error('Error acknowledging invoice:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge invoice",
        variant: "destructive",
      });
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return <Badge variant="default" className="bg-green-500">Paid</Badge>;
    }
    if (status === 'acknowledged') {
      return <Badge variant="default" className="bg-blue-500">Acknowledged</Badge>;
    }
    if (status === 'sent') {
      return <Badge variant="secondary">Sent</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invoices...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <Button variant="outline" size="sm" onClick={fetchInvoices}>
          Refresh
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No invoices yet.
          </CardContent>
        </Card>
      ) : null}

      {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{invoice.invoice_number}</CardTitle>
                <p className="text-sm text-gray-500">
                  PO: {invoice.purchase_order?.po_number || 'N/A'} • 
                  {invoice.supplier?.company_name || 'Supplier'}
                </p>
              </div>
              {getStatusBadge(invoice.status, invoice.payment_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Invoice Date</p>
                  <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium">KES {Number(invoice.subtotal).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">KES {Number(invoice.total_amount).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {userRole === 'supplier' && invoice.is_editable && (
                  <Button
                    variant="outline"
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
                
                {userRole === 'builder' && invoice.status === 'sent' && !invoice.acknowledged_at && (
                  <Button
                    onClick={() => handleAcknowledgeInvoice(invoice)}
                    disabled={acknowledging}
                    className="flex-1"
                  >
                    {acknowledging ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Acknowledging...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Acknowledge Invoice
                      </>
                    )}
                  </Button>
                )}

                {invoice.status === 'acknowledged' && invoice.payment_status !== 'paid' && (
                  <Button className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                )}

                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Invoice Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details. Changes will be sent to the builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subtotal (KES)</Label>
              <Input
                type="number"
                value={editedSubtotal}
                onChange={(e) => setEditedSubtotal(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Tax Amount (KES)</Label>
              <Input
                type="number"
                value={editedTax}
                onChange={(e) => setEditedTax(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Discount Amount (KES)</Label>
              <Input
                type="number"
                value={editedDiscount}
                onChange={(e) => setEditedDiscount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Total Amount (KES)</Label>
              <Input
                type="number"
                value={editedTotal}
                disabled
                className="font-bold"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInvoice}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Save & Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
