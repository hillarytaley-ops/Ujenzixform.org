/**
 * MultiSupplierQuoteDialog - Allows Professional Builders to request quotes from multiple suppliers
 * 
 * Flow:
 * 1. Builder selects products in cart
 * 2. Opens this dialog to select which suppliers to request quotes from
 * 3. Quote requests are sent to all selected suppliers
 * 4. Builder receives quotes and compares them in their dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Store, 
  Star, 
  MapPin, 
  Send, 
  Loader2, 
  CheckCircle, 
  Users,
  FileText,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/contexts/CartContext';

interface Supplier {
  id: string;
  user_id: string;
  company_name: string;
  location?: string;
  rating?: number;
  product_count?: number;
}

interface MultiSupplierQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onQuotesSent: () => void;
}

export const MultiSupplierQuoteDialog: React.FC<MultiSupplierQuoteDialogProps> = ({
  isOpen,
  onClose,
  cartItems,
  onQuotesSent,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      // Fetch all active suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, user_id, company_name, location, rating')
        .order('rating', { ascending: false });

      if (suppliersError) throw suppliersError;

      // Get product counts for each supplier
      const { data: pricesData } = await supabase
        .from('supplier_product_prices')
        .select('supplier_id')
        .gt('price', 0);

      const productCounts: Record<string, number> = {};
      pricesData?.forEach(p => {
        productCounts[p.supplier_id] = (productCounts[p.supplier_id] || 0) + 1;
      });

      const suppliersWithCounts = (suppliersData || []).map(s => ({
        ...s,
        product_count: productCounts[s.id] || productCounts[s.user_id] || 0,
      }));

      // Sort by product count (suppliers with more products first)
      suppliersWithCounts.sort((a, b) => (b.product_count || 0) - (a.product_count || 0));

      setSuppliers(suppliersWithCounts);
      
      // Pre-select suppliers that have products (top 3 by default)
      const topSuppliers = suppliersWithCounts
        .filter(s => s.product_count && s.product_count > 0)
        .slice(0, 3)
        .map(s => s.id);
      setSelectedSuppliers(topSuppliers);

    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const selectAll = () => {
    setSelectedSuppliers(suppliers.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedSuppliers([]);
  };

  const handleSendQuotes = async () => {
    if (selectedSuppliers.length === 0) {
      toast({
        title: 'No Suppliers Selected',
        description: 'Please select at least one supplier to request a quote from.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to request quotes.',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      const failedSuppliers: string[] = [];

      // Create quote request for each selected supplier
      for (const supplierId of selectedSuppliers) {
        const supplier = suppliers.find(s => s.id === supplierId);
        const supplierName = supplier?.company_name || 'Supplier';

        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        const { error } = await supabase
          .from('purchase_orders')
          .insert({
            po_number: poNumber,
            buyer_id: user.id,
            supplier_id: supplierId,
            total_amount: totalAmount,
            delivery_address: 'To be provided',
            delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
            project_name: `Multi-Quote Request - ${new Date().toLocaleDateString()}`,
            status: 'pending',
            items: cartItems.map(item => ({
              material_id: item.id,
              material_name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price, // Reference price (not final)
              image_url: item.image_url,
              notes: additionalNotes || undefined,
            })),
            created_at: new Date().toISOString(),
          });

        if (!error) {
          successCount++;
        } else {
          console.error(`Failed to send quote to ${supplierName}:`, error);
          failedSuppliers.push(supplierName);
        }
      }

      if (successCount > 0) {
        toast({
          title: '🎉 Quote Requests Sent!',
          description: `Sent to ${successCount} supplier(s). You'll receive their quotes in your dashboard.`,
        });
        onQuotesSent();
        onClose();
      }

      if (failedSuppliers.length > 0) {
        toast({
          title: '⚠️ Some Requests Failed',
          description: `Failed to send to: ${failedSuppliers.join(', ')}`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Error sending quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to send quote requests. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Request Quotes from Multiple Suppliers
          </DialogTitle>
          <DialogDescription>
            Select suppliers to receive competitive quotes for your {totalItems} item(s).
            Compare their responses to get the best deal!
          </DialogDescription>
        </DialogHeader>

        {/* Cart Summary */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-800">Your Quote Request</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">Items: <span className="font-medium text-gray-800">{cartItems.length} products</span></div>
            <div className="text-gray-600">Qty: <span className="font-medium text-gray-800">{totalItems} units</span></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {cartItems.slice(0, 3).map(item => (
              <Badge key={item.id} variant="outline" className="text-[10px] bg-white">
                {item.name.substring(0, 20)}...
              </Badge>
            ))}
            {cartItems.length > 3 && (
              <Badge variant="outline" className="text-[10px] bg-white">
                +{cartItems.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Supplier Selection */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">
              Select Suppliers ({selectedSuppliers.length} selected)
            </Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7">
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[250px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading suppliers...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Store className="h-8 w-8 mb-2 opacity-50" />
                <p>No suppliers available</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {suppliers.map((supplier) => {
                  const isSelected = selectedSuppliers.includes(supplier.id);
                  return (
                    <div
                      key={supplier.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-green-50 border-green-300 shadow-sm'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => toggleSupplier(supplier.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSupplier(supplier.id)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{supplier.company_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {supplier.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {supplier.location}
                            </span>
                          )}
                          {supplier.rating && (
                            <span className="flex items-center gap-0.5 text-yellow-600">
                              <Star className="h-3 w-3 fill-current" />
                              {supplier.rating.toFixed(1)}
                            </span>
                          )}
                          {supplier.product_count !== undefined && supplier.product_count > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {supplier.product_count} products
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-semibold">
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="E.g., Need delivery to Nairobi CBD, urgent order, prefer local suppliers..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            className="h-20 resize-none"
          />
        </div>

        <Separator />

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="text-amber-800">
            💡 <strong>Pro Tip:</strong> Request quotes from multiple suppliers to compare prices and get the best deal. 
            Suppliers will respond with their pricing in your <strong>Builder Dashboard → Quotes</strong> tab.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSendQuotes}
            disabled={sending || selectedSuppliers.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedSuppliers.length} Supplier(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSupplierQuoteDialog;

