import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Receipt, Download, Eye, Shield, Lock, FileText, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Invoice {
  id: string;
  invoice_number: string;
  issuer_id: string;
  supplier_id: string;
  items: any[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  payment_terms?: string;
  notes?: string;
  custom_invoice_path?: string;
  issuer_name?: string;
}

const SupplierInvoiceViewer: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchInvoices();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Get supplier profile
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) {
        toast({
          title: "Error",
          description: "You need to be registered as a supplier to view invoices.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: "Error",
          description: "Failed to fetch invoices.",
          variant: "destructive",
        });
        return;
      }

      // Fetch issuer names separately for security
      const invoicesWithIssuerNames = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', invoice.issuer_id)
            .single();
          
          return {
            ...invoice,
            items: Array.isArray(invoice.items) ? invoice.items : [],
            issuer_name: profile?.full_name || 'Professional Builder'
          };
        })
      );

      setInvoices(invoicesWithIssuerNames);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    try {
      if (invoice.custom_invoice_path) {
        // Download custom invoice file
        const { data, error } = await supabase.storage
          .from('invoices')
          .download(invoice.custom_invoice_path);

        if (error) {
          console.error('Download error:', error);
          toast({
            title: "Download Error",
            description: "Failed to download invoice file.",
            variant: "destructive",
          });
          return;
        }

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Generate text invoice
        const invoiceContent = `
          INVOICE
          
          Invoice Number: ${invoice.invoice_number}
          Issuer: ${invoice.issuer_name}
          Date: ${new Date(invoice.created_at).toLocaleDateString()}
          Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
          
          ITEMS:
          ${invoice.items.map((item, index) => 
            `${index + 1}. ${item.material_type} - Qty: ${item.quantity} ${item.unit} - Rate: KSh ${item.unit_price} - Total: KSh ${item.total_price}`
          ).join('\n')}
          
          Subtotal: KSh ${invoice.subtotal.toLocaleString()}
          Tax: KSh ${invoice.tax_amount.toLocaleString()}
          TOTAL: KSh ${invoice.total_amount.toLocaleString()}
          
          Payment Terms: ${invoice.payment_terms || 'Net 30 days'}
          ${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}
          
          Generated: ${new Date().toLocaleString()}
        `;

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.invoice_number}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: "Invoice downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted';
      case 'sent':
        return 'bg-secondary';
      case 'paid':
        return 'bg-primary';
      case 'overdue':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return <div className="p-6">Loading invoices...</div>;
  }

  if (!user || userProfile?.role !== 'supplier') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Invoice Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Secure Access Required</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Please log in as a registered supplier to access invoice management.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <h3 className="font-semibold">Information Security Notice</h3>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>SSL encrypted data transmission</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Access logs maintained for security</span>
            </div>
          </div>
          <div className="mt-2 p-2 bg-accent rounded text-xs">
            All invoice data is protected and only accessible to authorized parties.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices Received
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices received yet</p>
              <p className="text-sm text-muted-foreground">
                Invoices from builders will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.issuer_name}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      KSh {invoice.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(invoice.status)} text-white`}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Invoice Details</DialogTitle>
                            </DialogHeader>
                            {selectedInvoice && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="font-medium">Invoice Number:</span> {selectedInvoice.invoice_number}
                                  </div>
                                  <div>
                                    <span className="font-medium">From:</span> {selectedInvoice.issuer_name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Date:</span> {new Date(selectedInvoice.created_at).toLocaleDateString()}
                                  </div>
                                  <div>
                                    <span className="font-medium">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Invoice Items:</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedInvoice.items.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell>{item.description}</TableCell>
                                          <TableCell>{item.quantity} {item.unit}</TableCell>
                                          <TableCell>KSh {item.unit_price?.toLocaleString()}</TableCell>
                                          <TableCell>KSh {item.total_price?.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="border-t pt-4">
                                  <div className="grid grid-cols-2 gap-4 text-right">
                                    <div></div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>KSh {selectedInvoice.subtotal.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>KSh {selectedInvoice.tax_amount.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-lg">
                                        <span>Total:</span>
                                        <span>KSh {selectedInvoice.total_amount.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {selectedInvoice.payment_terms && (
                                  <div className="p-3 bg-muted border border-border rounded">
                                    <div className="flex items-center gap-2 text-foreground mb-1">
                                      <CreditCard className="h-4 w-4" />
                                      <span className="font-medium">Payment Terms</span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">{selectedInvoice.payment_terms}</p>
                                  </div>
                                )}

                                {selectedInvoice.notes && (
                                  <div className="p-3 bg-muted border border-border rounded">
                                    <div className="flex items-center gap-2 text-foreground mb-1">
                                      <FileText className="h-4 w-4" />
                                      <span className="font-medium">Notes</span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">{selectedInvoice.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadInvoice(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierInvoiceViewer;