import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Truck, Package, Calendar, User, Building2 } from "lucide-react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  buyer_id: string;
  items: any[];
  total_amount: number;
  delivery_date: string;
  status: string;
  created_at: string;
  buyer_name?: string;
  delivery_address?: string;
}

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  purchase_order_id: string;
  supplier_id: string;
  dispatch_date: string;
  expected_delivery_date: string;
  notes: string;
  file_path: string;
  created_at: string;
  po_number?: string;
  buyer_name?: string;
}

const DeliveryNoteForm = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    dispatch_date: '',
    expected_delivery_date: '',
    notes: '',
    file: null as File | null
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchPurchaseOrders();
      fetchDeliveryNotes();
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
          .select('id, user_id, full_name, company_name, user_type')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      // Get supplier profile to fetch their purchase orders
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userProfile.id)
        .single();

      if (!supplier) {
        toast({
          title: "Error",
          description: "You need to be registered as a supplier to create delivery notes.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          buyer_id,
          items,
          total_amount,
          delivery_date,
          status,
          created_at,
          delivery_address
        `)
        .eq('supplier_id', supplier.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch purchase orders.",
          variant: "destructive",
        });
        return;
      }

      // Fetch buyer names separately
      const ordersWithBuyerNames = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', order.buyer_id)
            .single();
          
          return {
            ...order,
            items: Array.isArray(order.items) ? order.items : [],
            buyer_name: profile?.full_name || 'Unknown Buyer'
          };
        })
      );

      setPurchaseOrders(ordersWithBuyerNames);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const fetchDeliveryNotes = async () => {
    try {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userProfile.id)
        .single();

      if (!supplier) return;

      const { data, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery notes:', error);
        return;
      }

      // Fetch related data separately
      const notesWithDetails = await Promise.all(
        (data || []).map(async (note) => {
          const { data: po } = await supabase
            .from('purchase_orders')
            .select('po_number, buyer_id')
            .eq('id', note.purchase_order_id)
            .single();

          let buyer_name = 'Unknown Buyer';
          if (po?.buyer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', po.buyer_id)
              .single();
            buyer_name = profile?.full_name || 'Unknown Buyer';
          }

          return {
            ...note,
            po_number: po?.po_number || 'Unknown PO',
            buyer_name
          };
        })
      );

      setDeliveryNotes(notesWithDetails);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
    }
  };

  const generateDeliveryNoteNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DN${dateStr}${randomStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !formData.dispatch_date || !formData.expected_delivery_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userProfile.id)
        .single();

      if (!supplier) {
        toast({
          title: "Error",
          description: "Supplier profile not found.",
          variant: "destructive",
        });
        return;
      }

      const deliveryNoteNumber = generateDeliveryNoteNumber();
      let filePath = '';

      // Upload file if provided
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${deliveryNoteNumber}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('delivery-notes')
          .upload(fileName, formData.file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          toast({
            title: "Upload Error",
            description: "Failed to upload delivery note file.",
            variant: "destructive",
          });
          return;
        }

        filePath = uploadData.path;
      }

      // Create delivery note record
      const { error: insertError } = await supabase
        .from('delivery_notes')
        .insert({
          delivery_note_number: deliveryNoteNumber,
          purchase_order_id: selectedPO,
          supplier_id: supplier.id,
          dispatch_date: formData.dispatch_date,
          expected_delivery_date: formData.expected_delivery_date,
          notes: formData.notes,
          file_path: filePath,
          file_name: formData.file?.name || '',
          content_type: formData.file?.type || '',
          file_size: formData.file?.size || 0
        });

      if (insertError) {
        console.error('Error creating delivery note:', insertError);
        toast({
          title: "Error",
          description: "Failed to create delivery note.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Delivery note created successfully!",
      });

      // Reset form
      setSelectedPO('');
      setFormData({
        dispatch_date: '',
        expected_delivery_date: '',
        notes: '',
        file: null
      });

      // Refresh delivery notes
      fetchDeliveryNotes();

    } catch (error) {
      console.error('Error creating delivery note:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (note: DeliveryNote) => {
    if (!note.file_path) {
      toast({
        title: "No File",
        description: "No file attached to this delivery note.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('delivery-notes')
        .download(note.file_path);

      if (error) {
        console.error('Download error:', error);
        toast({
          title: "Download Error",
          description: "Failed to download delivery note.",
          variant: "destructive",
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DN_${note.delivery_note_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const selectedPODetails = purchaseOrders.find(po => po.id === selectedPO);

  return (
    <div className="space-y-6">
      {/* Create Delivery Note Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Delivery Note
          </CardTitle>
          <CardDescription>
            Create a delivery note for confirmed purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-order">Select Purchase Order *</Label>
                <Select value={selectedPO} onValueChange={setSelectedPO}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.buyer_name} (KSh {po.total_amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatch-date">Dispatch Date *</Label>
                <Input
                  id="dispatch-date"
                  type="date"
                  value={formData.dispatch_date}
                  onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected-delivery">Expected Delivery Date *</Label>
                <Input
                  id="expected-delivery"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Delivery Note Document</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                />
              </div>
            </div>

            {selectedPODetails && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Purchase Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Buyer:</span> {selectedPODetails.buyer_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Delivery Date:</span> {selectedPODetails.delivery_date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Total Amount:</span> KSh {selectedPODetails.total_amount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Items:</span> {selectedPODetails.items.length} items
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes about this delivery..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Delivery Note"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Delivery Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Your Delivery Notes</CardTitle>
          <CardDescription>
            Manage and download your delivery notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No delivery notes created yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DN Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.delivery_note_number}</TableCell>
                    <TableCell>{note.po_number}</TableCell>
                    <TableCell>{note.buyer_name}</TableCell>
                    <TableCell>{new Date(note.dispatch_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(note.expected_delivery_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(note.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {note.file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(note)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
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

export default DeliveryNoteForm;
