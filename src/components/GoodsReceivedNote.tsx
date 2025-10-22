import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, FileText, CheckCircle, AlertCircle, Send, Clock, Truck, Building } from "lucide-react";

const grnSchema = z.object({
  grnNumber: z.string().min(1, "GRN number is required"),
  supplierName: z.string().min(1, "Supplier name is required"),
  receivedBy: z.string().min(1, "Received by field is required"),
  receivedDate: z.string().min(1, "Received date is required"),
  deliveryNoteReference: z.string().optional(),
  overallCondition: z.enum(["good", "damaged", "partial"]),
  items: z.array(z.object({
    description: z.string().min(1, "Item description is required"),
    orderedQuantity: z.number().min(1, "Ordered quantity must be positive"),
    receivedQuantity: z.number().min(0, "Received quantity cannot be negative"),
    unit: z.string().min(1, "Unit is required"),
    condition: z.enum(["good", "damaged", "missing"]),
    remarks: z.string().optional()
  })).min(1, "At least one item is required"),
  discrepancies: z.string().optional(),
  additionalNotes: z.string().optional()
});

type GRNFormData = z.infer<typeof grnSchema>;

const GoodsReceivedNote = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<GRNFormData>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      grnNumber: `GRN${Date.now()}`,
      receivedDate: new Date().toISOString().split('T')[0],
      overallCondition: "good",
      items: []
    }
  });

  useEffect(() => {
    fetchDeliveredItems();
    fetchSuppliers();
  }, []);

  const fetchDeliveredItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      
      // Check role from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'builder')
        .maybeSingle();
      
      if (!roleData || (!profile.is_professional && profile.user_type !== 'company')) {
        return;
      }

      // Fetch delivered items from delivery_notes and purchase_orders
      const { data: deliveredItems } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          purchase_orders!inner(
            id,
            po_number,
            status,
            total_amount,
            delivery_address,
            created_at,
            profiles!purchase_orders_buyer_id_fkey(id, full_name, company_name)
          ),
          suppliers!inner(
            id,
            company_name,
            is_verified,
            rating,
            profiles!suppliers_user_id_fkey(id, full_name, company_name)
          )
        `)
        .eq('purchase_orders.buyer_id', profile.id)
        .order('created_at', { ascending: false });

      setDeliveries(deliveredItems || []);
    } catch (error) {
      console.error('Error fetching delivered items:', error);
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
        console.error('Error fetching suppliers directory:', error);
        setSuppliers([]);
        return;
      }
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const handleDeliverySelect = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (delivery) {
      setSelectedDelivery(delivery);
      
      // Auto-populate form with delivery data
      form.setValue('supplierName', delivery.suppliers.profiles.company_name || delivery.suppliers.profiles.full_name);
      form.setValue('deliveryNoteReference', delivery.delivery_note_number);
      
      // Convert purchase order items to GRN items format
      const purchaseOrderItems = delivery.purchase_orders.items || [];
      const grnItems = purchaseOrderItems.map((item: any) => ({
        description: item.material_type || item.description || '',
        orderedQuantity: item.quantity || 1,
        receivedQuantity: item.quantity || 1, // Default to ordered quantity
        unit: item.unit || 'pieces',
        condition: 'good',
        remarks: ''
      }));
      
      form.setValue('items', grnItems);
    }
  };

  const onSubmit = async (data: GRNFormData) => {
    setIsSubmitting(true);
    try {
      // Check if user is a professional builder or company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      // Check role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .eq('role', 'builder')
        .maybeSingle();

      if (!roleData || (!profile.is_professional && profile.user_type !== 'company')) {
        toast({
          title: "Access Denied",
          description: "Only professional builders and companies can create GRNs.",
          variant: "destructive"
        });
        return;
      }

      // Create GRN record
      const { data: grnData, error } = await supabase
        .from('goods_received_notes')
        .insert({
          grn_number: data.grnNumber,
          supplier_name: data.supplierName,
          received_by: data.receivedBy,
          received_date: data.receivedDate,
          delivery_note_reference: data.deliveryNoteReference,
          overall_condition: data.overallCondition,
          items: data.items,
          discrepancies: data.discrepancies,
          additional_notes: data.additionalNotes,
          builder_id: profile.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Send GRN notification to supplier automatically
      if (selectedDelivery) {
        const supplierProfile = selectedDelivery.suppliers.profiles;
        const supplierEmail = await getSupplierEmail(supplierProfile.user_id);
        
        if (supplierEmail) {
          await sendGRNNotification({
            grnId: grnData.id,
            supplierEmail,
            builderName: profile.company_name || profile.full_name || 'Builder',
            grnNumber: data.grnNumber,
            items: data.items,
            overallCondition: data.overallCondition,
            receivedDate: data.receivedDate,
            discrepancies: data.discrepancies,
            additionalNotes: data.additionalNotes
          });
        }
      }

      toast({
        title: "GRN Created & Sent Successfully",
        description: "The Goods Received Note has been created and automatically sent to the supplier.",
      });

      form.reset();
      setSelectedDelivery(null);
    } catch (error: any) {
      toast({
        title: "Error Creating GRN",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSupplierEmail = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      return user?.email;
    } catch (error) {
      console.error('Error fetching supplier email:', error);
      return null;
    }
  };

  const sendGRNNotification = async (grnData: any) => {
    try {
      const { error } = await supabase.functions.invoke('send-grn-notification', {
        body: grnData
      });

      if (error) {
        console.error('Error sending GRN notification:', error);
        toast({
          title: "GRN Created",
          description: "GRN was created but email notification failed. Please contact the supplier manually.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error invoking GRN notification function:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p>Loading delivered items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Delivered Items Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Select Delivered Items</CardTitle>
              <CardDescription>
                Choose from recently delivered items to auto-populate the GRN
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No delivered items found</p>
              <p className="text-sm text-muted-foreground">Items will appear here after suppliers confirm delivery</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {deliveries.map((delivery) => (
                  <Card 
                    key={delivery.id} 
                    className={`cursor-pointer transition-all ${
                      selectedDelivery?.id === delivery.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => handleDeliverySelect(delivery.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <h4 className="font-semibold">
                              {delivery.suppliers.profiles.company_name || delivery.suppliers.profiles.full_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              DN: {delivery.delivery_note_number} • Delivered: {new Date(delivery.dispatch_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {delivery.purchase_orders.items?.length || 0} items
                          </Badge>
                          {selectedDelivery?.id === delivery.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRN Form */}
      {selectedDelivery && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Goods Received Note (GRN)</CardTitle>
                <CardDescription>
                  Automatically filled from delivery: {selectedDelivery.delivery_note_number}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grnNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GRN Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="GRN number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter supplier name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receivedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received By</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name of person who received" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receivedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryNoteReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Note Reference</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="DN reference number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overallCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select overall condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Items Display Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Items to Acknowledge
                  </h3>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Description</TableHead>
                          <TableHead>Ordered Qty</TableHead>
                          <TableHead>Received Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.watch("items").map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{item.orderedQuantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.receivedQuantity}
                                onChange={(e) => {
                                  const items = form.getValues("items");
                                  items[index].receivedQuantity = Number(e.target.value);
                                  form.setValue("items", items);
                                }}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>
                              <Select
                                value={item.condition}
                                onValueChange={(value) => {
                                  const items = form.getValues("items");
                                  items[index].condition = value as any;
                                  form.setValue("items", items);
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="good">Good</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="missing">Missing</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.remarks}
                                onChange={(e) => {
                                  const items = form.getValues("items");
                                  items[index].remarks = e.target.value;
                                  form.setValue("items", items);
                                }}
                                placeholder="Remarks"
                                className="w-32"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Additional Information */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discrepancies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discrepancies</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe any discrepancies between ordered and received items"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Any additional comments or observations"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => {
                    form.reset();
                    setSelectedDelivery(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Creating & Sending GRN...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Create & Send GRN to Supplier
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoodsReceivedNote;