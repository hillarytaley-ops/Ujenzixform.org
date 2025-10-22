import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Calendar, Package, Truck, User } from "lucide-react";

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
  supplier_name?: string;
  total_amount?: number;
}

const BuilderDeliveryNotes = () => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDeliveryNotes();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // SECURITY: Explicit column selection - exclude phone_number, email, etc.
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name, user_type, is_professional, avatar_url, created_at, updated_at')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);

      // First fetch purchase orders for this builder
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, total_amount, supplier_id')
        .eq('buyer_id', userProfile.id);

      if (poError) {
        console.error('Error fetching purchase orders:', poError);
        toast({
          title: "Error",
          description: "Failed to fetch purchase orders.",
          variant: "destructive",
        });
        return;
      }

      if (!purchaseOrders || purchaseOrders.length === 0) {
        setDeliveryNotes([]);
        return;
      }

      const poIds = purchaseOrders.map(po => po.id);

      // Fetch delivery notes for these purchase orders
      const { data: deliveryNotesData, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .in('purchase_order_id', poIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery notes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch delivery notes.",
          variant: "destructive",
        });
        return;
      }

      // Enhance delivery notes with PO and supplier data
      const notesWithDetails = await Promise.all(
        (deliveryNotesData || []).map(async (note) => {
          const po = purchaseOrders.find(p => p.id === note.purchase_order_id);
          
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('company_name')
            .eq('id', po?.supplier_id)
            .single();

          return {
            ...note,
            po_number: po?.po_number || 'Unknown PO',
            total_amount: po?.total_amount || 0,
            supplier_name: supplier?.company_name || 'Unknown Supplier'
          };
        })
      );

      setDeliveryNotes(notesWithDetails);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
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

      toast({
        title: "Success",
        description: "Delivery note downloaded successfully!",
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (dispatchDate: string, expectedDeliveryDate: string) => {
    const dispatch = new Date(dispatchDate);
    const expected = new Date(expectedDeliveryDate);
    const today = new Date();

    if (today < dispatch) {
      return <Badge variant="secondary">Scheduled</Badge>;
    } else if (today >= dispatch && today <= expected) {
      return <Badge variant="default">In Transit</Badge>;
    } else {
      return <Badge variant="outline">Delivered Expected</Badge>;
    }
  };

  if (!userProfile || userProfile.role !== 'builder') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access restricted to builders only.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Delivery Notes
          </CardTitle>
          <CardDescription>
            View delivery notes from suppliers for your purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading delivery notes...</p>
            </div>
          ) : deliveryNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No delivery notes available yet.</p>
              <p className="text-sm mt-2">Delivery notes will appear here when suppliers dispatch your orders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {deliveryNotes.map((note) => (
                  <Card key={note.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{note.delivery_note_number}</CardTitle>
                          {getStatusBadge(note.dispatch_date, note.expected_delivery_date)}
                        </div>
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
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">PO:</span> {note.po_number}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Supplier:</span> {note.supplier_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Dispatched:</span> {formatDate(note.dispatch_date)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Expected:</span> {formatDate(note.expected_delivery_date)}
                        </div>
                      </div>
                      
                      {note.total_amount && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Order Value:</span> 
                          <span className="text-lg font-semibold text-primary">KSh {note.total_amount.toLocaleString()}</span>
                        </div>
                      )}

                      {note.notes && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Delivery Notes:</p>
                          <p className="text-sm text-muted-foreground">{note.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuilderDeliveryNotes;