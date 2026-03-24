import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { 
  FileText, 
  Trash2, 
  Send, 
  Loader2, 
  Plus, 
  Minus, 
  MapPin,
  Calendar,
  Package,
  X,
  Building2,
  FolderPlus
} from 'lucide-react';
import { catalogMaterialIdFromCartLineId } from '@/utils/cartLineId';

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
}

export interface QuoteCartItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  supplier_id?: string;
  supplier_name?: string;
}

interface QuoteCartProps {
  items: QuoteCartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  isOpen,
  onOpenChange
}: QuoteCartProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  // Note: We don't show estimated prices to Professional Builders - they get pricing via supplier quotes

  // Fetch user's projects when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let accessToken = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || '';
      } catch {}

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_projects?builder_id=eq.${user.id}&select=id,name,location,status&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const raw = await response.json();
        const data = (Array.isArray(raw) ? raw : []).filter(
          (p: { status?: string }) => !p.status || p.status === 'active' || p.status === 'in_progress'
        );
        setProjects(data);
        console.log('📁 Loaded', data.length, 'projects for quote cart');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmitQuoteRequest = async () => {
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECURITY: ONLY Professional Builders can request quotes
    // Private Clients must use Buy Now instead
    // ═══════════════════════════════════════════════════════════════════════════════
    const currentRole = localStorage.getItem('user_role');
    
    if (currentRole === 'private_client') {
      toast({
        title: '🛒 Use Buy Now Instead',
        description: 'As a Private Client, you can purchase directly. Please use the main cart to complete your purchase.',
        variant: 'destructive',
      });
      return;
    }
    
    if (currentRole !== 'professional_builder' && currentRole !== 'admin') {
      toast({
        title: '⚠️ Professional Builder Required',
        description: 'Only Professional Builders can request quotes. Please register as a Professional Builder or Private Client.',
        variant: 'destructive',
      });
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: '📋 No Items Selected',
        description: 'Please add items to your quote cart first.',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: '📍 Delivery Address Required',
        description: 'Please enter a delivery address for your quote request.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: '🔐 Sign In Required',
          description: 'Please sign in to submit quote requests.',
          variant: 'destructive',
        });
        return;
      }

      // Group items by supplier
      const itemsBySupplier = items.reduce((acc, item) => {
        const supplierId = item.supplier_id || 'general';
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, QuoteCartItem[]>);

      // Create a quote request for each supplier
      const supplierIds = Object.keys(itemsBySupplier);
      let successCount = 0;

      for (const supplierId of supplierIds) {
        const supplierItems = itemsBySupplier[supplierId];
        const supplierTotal = supplierItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        
        // Validate supplier ID exists in suppliers table
        let validSupplierId: string | null = null;
        
        if (supplierId && supplierId !== 'general' && supplierId !== 'admin-catalog') {
          // Verify this supplier_id actually exists in suppliers table
          const { data: supplierCheck } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', supplierId)
            .maybeSingle();
          
          if (supplierCheck?.id) {
            validSupplierId = supplierCheck.id;
            console.log('📦 Validated supplier_id:', validSupplierId);
          }
        }
        
        // If not valid, get first available supplier
        if (!validSupplierId) {
          const { data: fallbackSupplier } = await supabase
            .from('suppliers')
            .select('id, company_name')
            .limit(1)
            .single();
          
          if (fallbackSupplier?.id) {
            validSupplierId = fallbackSupplier.id;
            console.log('📦 Using fallback supplier:', validSupplierId, fallbackSupplier.company_name);
          } else {
            console.error('❌ No valid supplier found for quote request');
            continue; // Skip this supplier group
          }
        }

        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Get project name from selected project or use manual input
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        const finalProjectName = selectedProject?.name || projectName || 'Quote Request';
        
        const orderPayload: any = {
          po_number: poNumber,
          buyer_id: user.id,
          supplier_id: validSupplierId,
          total_amount: supplierTotal,
          delivery_address: deliveryAddress,
          delivery_date: deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          project_name: finalProjectName,
          special_instructions: notes,
          items: supplierItems.map(item => ({
            material_id: catalogMaterialIdFromCartLineId(item.id),
            material_name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price
          }))
        };
        
        // Link to project if selected
        if (selectedProjectId) {
          orderPayload.project_id = selectedProjectId;
        }
        
        console.log('📤 Submitting quote request:', orderPayload);
        
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(orderPayload)
          .select();

        if (!error && data) {
          successCount++;
          console.log('✅ Quote request created successfully:', data[0]?.id, data[0]?.po_number);
        } else {
          console.error('❌ Quote request error:', error?.message, error?.details, error?.hint);
          toast({
            title: '❌ Quote Request Failed',
            description: error?.message || 'Failed to submit quote request',
            variant: 'destructive',
          });
        }
      }

      if (successCount > 0) {
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        toast({
          title: '📋 Quote Requests Sent!',
          description: selectedProject 
            ? `${successCount} quote request(s) sent for project "${selectedProject.name}". Suppliers will respond with pricing.`
            : `${successCount} quote request(s) sent to ${successCount} supplier(s). They will respond with pricing.`,
        });
        
        // Clear the cart and form
        onClearCart();
        setDeliveryAddress('');
        setDeliveryDate('');
        setProjectName('');
        setSelectedProjectId('');
        setNotes('');
        onOpenChange(false);
      } else {
        throw new Error('Failed to create any quote requests');
      }

    } catch (error) {
      console.error('Failed to submit quote requests:', error);
      toast({
        title: 'Failed to Submit',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Quote Cart
            {items.length > 0 && (
              <Badge className="bg-blue-600">{totalItems} items</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review your selected items and submit a quote request
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Your Quote Cart is Empty</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add items by clicking "Add to Quote" on products you're interested in.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Browse Materials
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          {/* Note: Price shown here is catalog reference - actual pricing comes from supplier quote */}
                          <p className="text-xs text-gray-500 italic">
                            {item.unit} • Pricing via quote
                          </p>
                          {item.supplier_name && (
                            <p className="text-xs text-gray-500">{item.supplier_name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-blue-600 font-medium">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Quote Details Form */}
              <div className="space-y-4 pb-4">
                {/* Project Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Link to Project
                  </Label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading projects...
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                        value={selectedProjectId}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          // Auto-fill project name if project selected
                          const project = projects.find(p => p.id === e.target.value);
                          if (project) {
                            setProjectName(project.name);
                          }
                        }}
                      >
                        <option value="">-- Select a project (optional) --</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} - {project.location}
                          </option>
                        ))}
                      </select>
                      {selectedProjectId && (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          <Building2 className="h-3 w-3" />
                          Order will be linked to this project for tracking
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800 mb-2">
                        No active projects found. Create a project to track your materials and spending.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-300 hover:bg-amber-100"
                        onClick={() => {
                          onOpenChange(false);
                          // Navigate to dashboard projects tab
                          window.location.href = '/professional-builder-dashboard?tab=projects';
                        }}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Create a Project
                      </Button>
                    </div>
                  )}
                </div>

                {/* Manual Project Name (if no project selected) */}
                {!selectedProjectId && (
                  <div>
                    <Label htmlFor="projectName">Or Enter Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g., Residential Building Project"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="deliveryAddress" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery Address *
                  </Label>
                  <Input
                    id="deliveryAddress"
                    placeholder="Enter delivery location"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryDate" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Preferred Delivery Date
                  </Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-3">
              {/* Summary - No price shown for Professional Builders */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700 font-medium">Total Items:</span>
                  <span className="font-bold text-lg text-blue-800">{totalItems} items</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  📋 Suppliers will provide competitive pricing in their quotes
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClearCart}
                >
                  Clear All
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmitQuoteRequest}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Request Quotes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Floating Quote Cart Button - Always visible for Professional Builders
export function QuoteCartButton({ 
  itemCount, 
  onClick 
}: { 
  itemCount: number; 
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-24 right-6 h-14 px-5 shadow-xl rounded-full z-40 ${
        itemCount > 0 
          ? 'bg-blue-600 hover:bg-blue-700 animate-bounce' 
          : 'bg-gray-600 hover:bg-gray-700'
      }`}
    >
      <FileText className="h-5 w-5 mr-2" />
      Quote Cart
      {itemCount > 0 ? (
        <Badge className="ml-2 bg-white text-blue-600 font-bold">{itemCount}</Badge>
      ) : (
        <Badge className="ml-2 bg-gray-400 text-white">0</Badge>
      )}
    </Button>
  );
}

