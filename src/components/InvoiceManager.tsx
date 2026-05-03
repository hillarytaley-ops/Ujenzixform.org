import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Download, Shield, Plus, Trash2, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
  supplier_name?: string;
  custom_invoice_path?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Supplier {
  id: string;
  company_name: string;
  email: string;
}

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Invoice form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [customInvoiceFile, setCustomInvoiceFile] = useState<File | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchInvoices();
      fetchSuppliers();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name, user_type, is_professional')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('issuer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enhance with supplier details
      const invoicesWithDetails = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('company_name')
            .eq('id', invoice.supplier_id)
            .single();

          return {
            ...invoice,
            supplier_name: supplier?.company_name || 'Unknown Supplier'
          };
        })
      );

      setInvoices(invoicesWithDetails);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Check if user is admin for suppliers directory access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, suppliers directory access denied');
        setSuppliers([]);
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        console.log('Suppliers directory access restricted to admin users only');
        setSuppliers([]);
        return;
      }

      // Admin users can access suppliers directory directly
      const { data, error } = await supabase
        .from('suppliers_directory_safe')
        .select('id, company_name');
      
      if (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
        return;
      }
      
      // Transform data to match expected Supplier interface
      const transformedSuppliers = (data || []).map((supplier: any) => ({
        id: supplier.id,
        company_name: supplier.company_name,
        email: 'Contact via secure platform' // Email protected by admin-only access
      }));
      
      setSuppliers(transformedSuppliers);

      if (error) throw error;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV${dateStr}${randomNum}`;
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16; // 16% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCustomInvoiceUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error('Error uploading custom invoice:', error);
      throw error;
    }
  };

  const createInvoice = async () => {
    if (!selectedSupplier || items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier and add invoice items.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      let customInvoicePath = null;
      if (customInvoiceFile) {
        customInvoicePath = await handleCustomInvoiceUpload(customInvoiceFile);
      }

      const { subtotal, tax, total } = calculateTotals();

      const { error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: generateInvoiceNumber(),
          issuer_id: userProfile.id,
          supplier_id: selectedSupplier,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          })),
          subtotal: subtotal,
          tax_amount: tax,
          total_amount: total,
          payment_terms: paymentTerms,
          due_date: dueDate,
          notes: notes,
          custom_invoice_path: customInvoicePath,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully.",
      });

      // Reset form
      setSelectedSupplier('');
      setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }]);
      setPaymentTerms('');
      setDueDate('');
      setNotes('');
      setCustomInvoiceFile(null);

      // Refresh invoices
      fetchInvoices();

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const sendInvoiceToSupplier = async (invoiceId: string) => {
    try {
      // Update invoice status to sent
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

      if (error) throw error;

      // Send notification to supplier via edge function
      await supabase.functions.invoke('send-invoice-notification', {
        body: { invoice_id: invoiceId }
      });

      toast({
        title: "Success",
        description: "Invoice sent to supplier successfully. Payment processing is now available.",
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice.",
        variant: "destructive",
      });
    }
  };

  const processInvoicePayment = async (invoiceId: string, paymentMethod: string, paymentReference: string, amount: number) => {
    try {
      // Process payment via edge function
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: { 
          invoice_id: invoiceId,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          amount: amount
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment processed successfully! Invoice marked as paid.`,
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
      cancelled: { color: 'bg-gray-100 text-gray-600', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (!userProfile || userProfile.role !== 'builder' || (!userProfile.is_professional && userProfile.user_type !== 'company')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to COs/contractors and companies only.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            Secure Invoice Management
          </CardTitle>
          <CardDescription>
            Create professional invoices and upload custom invoices. All invoice data is encrypted and protected.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
          <TabsTrigger value="manage">Manage Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Create New Invoice
              </CardTitle>
              <CardDescription>
                Generate professional invoices or upload your custom invoice documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Select Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Invoice Upload */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      <Label>Upload Custom Invoice (Optional)</Label>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => setCustomInvoiceFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload your own invoice document (PDF, DOC, or image format)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Invoice Items</Label>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price (KES)</Label>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        value={item.total.toFixed(2)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {items.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <div className="text-right space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>KES {calculateTotals().subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (16%):</span>
                      <span>KES {calculateTotals().tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>KES {calculateTotals().total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Terms & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_7">Net 7 Days</SelectItem>
                      <SelectItem value="net_15">Net 15 Days</SelectItem>
                      <SelectItem value="net_30">Net 30 Days</SelectItem>
                      <SelectItem value="net_60">Net 60 Days</SelectItem>
                      <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or terms..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={createInvoice}
                disabled={creating}
                className="w-full"
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create Invoice"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Management
              </CardTitle>
              <CardDescription>
                View and manage your created invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices created yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{invoice.invoice_number}</h4>
                            <p className="text-sm text-muted-foreground">
                              Supplier: {invoice.supplier_name}
                            </p>
                            <p className="text-sm font-medium text-primary">
                              KES {invoice.total_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(invoice.created_at).toLocaleDateString()}
                              {invoice.due_date && ` • Due: ${new Date(invoice.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(invoice.status)}
                            {invoice.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => sendInvoiceToSupplier(invoice.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </Button>
                            )}
                            {invoice.custom_invoice_path && (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceManager;