import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💰 UNIFIED PRICE COMPARISON & QUOTE REQUEST                                        ║
 * ║                                                                                      ║
 * ║   UPDATED: February 21, 2026 - Suppliers as COLUMNS, Materials as ROWS              ║
 * ║   - Better layout for long lists of materials                                       ║
 * ║   - Suppliers displayed horizontally at top                                         ║
 * ║   - Materials listed vertically with totals at bottom                               ║
 * ║   - Professional Builders: Select suppliers → Request Quotes                        ║
 * ║   - Private Clients: Select supplier → Update cart with their prices                ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useCart, CartItem } from '@/contexts/CartContext';
import { catalogMaterialIdFromCartLineId } from '@/utils/cartLineId';
import {
  getCartProjectId,
  getCartProjectName,
  getCartProjectLocation,
} from '@/utils/builderCartProject';
import { readAuthSessionForRest } from '@/utils/supabaseAccessToken';
import { supplierLocationLine } from '@/utils/supplierLocationLine';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, 
  Star,
  ShoppingCart, 
  Trophy,
  Loader2,
  Check,
  X,
  Send,
  Store,
  MapPin,
  CreditCard
} from 'lucide-react';

interface SupplierPrice {
  supplier_id: string;
  supplier_name: string;
  /** Human-readable store location (same idea as column header address line). */
  supplier_location?: string;
  price: number;
  in_stock: boolean;
}

interface ProductComparison {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  quantity: number;
  alternatives: SupplierPrice[];
}

interface SupplierColumn {
  id: string;
  user_id?: string;
  name: string;
  rating?: number;
  /** Always shown under the name (real address or explicit placeholder). */
  addressLine: string;
}

interface CartPriceComparisonAllProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotesSent?: () => void;
  /** After choosing a supplier with Select, buyers can run checkout (PO + Paystack) without hunting the cart footer. */
  onContinueToPayment?: () => void | Promise<void>;
}

export const CartPriceComparisonAll: React.FC<CartPriceComparisonAllProps> = ({
  isOpen,
  onClose,
  onQuotesSent,
  onContinueToPayment,
}) => {
  const { items, updateCartItem, clearCart } = useCart();
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<SupplierColumn[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Get user role (only true pros use quote-only flow; admins/private clients use supplier select + payment)
  const userRole = localStorage.getItem('user_role');
  const isProfessionalBuilder = userRole === 'professional_builder';

  useEffect(() => {
    if (isOpen && items.length > 0) {
      fetchAllPrices();
      setSelectedSuppliers(new Set());
      setNotes('');
    } else if (isOpen && items.length === 0) {
      setLoading(false);
      setComparisons([]);
      setAllSuppliers([]);
    }
  }, [isOpen]);

  const fetchAllPrices = async () => {
    setLoading(true);
    try {
      // Suppliers require an authenticated Supabase session — anon REST gets zero rows under RLS.
      let suppliersData: any[] = [];
      try {
        const { data: rows, error: suppliersErr } = await supabase
          .from('suppliers')
          .select('id, user_id, profile_id, company_name, rating, location, address, physical_address, county')
          .order('rating', { ascending: false })
          .limit(500);
        if (suppliersErr) {
          console.warn('Suppliers fetch failed:', suppliersErr.message);
        } else {
          suppliersData = rows ?? [];
        }
      } catch (e) {
        console.warn('Suppliers fetch failed', e);
      }

      const suppliersMap = new Map<string, any>();

      const profileByPk = new Map<string, { id: string; user_id?: string; location?: string | null; company_name?: string | null }>();
      const profileByAuthUser = new Map<string, { id: string; user_id?: string; location?: string | null; company_name?: string | null }>();
      const linkIds = [
        ...new Set(
          [
            ...suppliersData.map((s: any) => s.user_id).filter(Boolean),
            ...suppliersData.map((s: any) => s.profile_id).filter(Boolean),
          ] as string[]
        ),
      ] as string[];
      if (linkIds.length > 0) {
        const { data: profRows, error: profErr } = await supabase
          .from('profiles')
          .select('id, user_id, location, company_name')
          .in('id', linkIds.slice(0, 300));
        if (!profErr && profRows) {
          profRows.forEach((p: any) => {
            profileByPk.set(p.id, p);
            if (p.user_id) profileByAuthUser.set(p.user_id, p);
          });
        }
        const stillMissing = linkIds.filter((id) => !profileByPk.has(id));
        if (stillMissing.length > 0) {
          const { data: profByAuth } = await supabase
            .from('profiles')
            .select('id, user_id, location, company_name')
            .in('user_id', stillMissing.slice(0, 300));
          profByAuth?.forEach((p: any) => {
            profileByPk.set(p.id, p);
            if (p.user_id) profileByAuthUser.set(p.user_id, p);
          });
        }
      }

      const mergeProfileIntoSupplier = (s: any) => {
        if (!s) return s;
        const prof =
          (s.user_id && (profileByPk.get(s.user_id) || profileByAuthUser.get(s.user_id))) ||
          (s.profile_id ? profileByPk.get(s.profile_id) : undefined);
        return {
          ...s,
          company_name:
            (s.company_name && String(s.company_name).trim()) ||
            (prof?.company_name && String(prof.company_name).trim()) ||
            s.company_name,
          location:
            (s.location && String(s.location).trim()) ||
            (prof?.location && String(prof.location).trim()) ||
            s.location,
        };
      };

      suppliersData.forEach((raw: any) => {
        const s = mergeProfileIntoSupplier(raw);
        suppliersMap.set(s.id, s);
        if (s.user_id) suppliersMap.set(s.user_id, s);
        if (s.profile_id) suppliersMap.set(s.profile_id, s);
      });

      // Fetch prices — cart lines use `catalogUuid::v:idx:n` for variants; supplier_product_prices.product_id is catalog UUID only.
      const productIds = [
        ...new Set(items.map((item) => catalogMaterialIdFromCartLineId(item.id))),
      ];
      let pricesData: any[] = [];
      
      try {
        if (productIds.length > 0) {
          const { data: rows, error: pricesErr } = await supabase
            .from('supplier_product_prices')
            .select('product_id, supplier_id, price, in_stock')
            .in('product_id', productIds);
          if (pricesErr) {
            console.warn('Prices fetch failed:', pricesErr.message);
          } else {
            pricesData = rows ?? [];
          }
        }
      } catch (e) {
        console.warn('Prices fetch failed', e);
      }

      // Collect unique suppliers from prices AND all suppliers for quote requests
      const uniqueSupplierIds = new Set<string>();
      pricesData.forEach((p: any) => uniqueSupplierIds.add(p.supplier_id));
      items.forEach(item => {
        if (item.supplier_id) uniqueSupplierIds.add(item.supplier_id);
      });
      
      // For professional builders, also show all suppliers (even without prices)
      if (isProfessionalBuilder) {
        suppliersData.forEach(s => uniqueSupplierIds.add(s.id));
      }

      // RLS on `suppliers` often hides rows from buyers even when those suppliers have public prices.
      // SECURITY DEFINER RPC returns name + address for the exact UUIDs on the price rows.
      const uuidLike = (id: string | undefined) => !!id && id.length === 36 && id !== 'admin-catalog' && id !== 'general';
      const compareRpcIds = [...uniqueSupplierIds].filter(uuidLike).slice(0, 200);
      if (compareRpcIds.length > 0) {
        try {
          const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_suppliers_for_price_compare', {
            p_supplier_ids: compareRpcIds,
          });
          if (rpcErr) {
            console.warn('get_suppliers_for_price_compare:', rpcErr.message);
          } else if (Array.isArray(rpcRows)) {
            for (const row of rpcRows as any[]) {
              const s: any = {
                id: row.id,
                user_id: row.user_id,
                profile_id: row.profile_id,
                company_name: row.company_name,
                rating: row.rating,
                location: row.location || row.profile_location || null,
                address: row.address,
                display_location: row.display_location,
              };
              const merged = mergeProfileIntoSupplier(s);
              suppliersMap.set(merged.id, merged);
              if (merged.user_id) suppliersMap.set(merged.user_id, merged);
              if (merged.profile_id) suppliersMap.set(merged.profile_id, merged);
            }
          }
        } catch (e) {
          console.warn('get_suppliers_for_price_compare failed', e);
        }
      }

      const missingIds = [...uniqueSupplierIds].filter((id) => !suppliersMap.has(id));
      if (missingIds.length > 0) {
        const { data: extraRows } = await supabase
          .from('suppliers')
          .select('id, user_id, profile_id, company_name, rating, location, address, physical_address, county')
          .in('id', missingIds.slice(0, 200));
        extraRows?.forEach((raw: any) => {
          const s = mergeProfileIntoSupplier(raw);
          suppliersMap.set(s.id, s);
          if (s.user_id) suppliersMap.set(s.user_id, s);
          if (s.profile_id) suppliersMap.set(s.profile_id, s);
        });
      }

      const cartSupplierNames = new Map<string, string>();
      items.forEach((it) => {
        const sid = it.supplier_id;
        const nm = it.supplier_name?.trim();
        if (sid && nm) cartSupplierNames.set(sid, nm);
      });

      const resolveSupplierName = (id: string, supplier: any | undefined): string => {
        const fromRow = supplier?.company_name?.trim?.();
        if (fromRow) return fromRow;
        const fromCart = cartSupplierNames.get(id);
        if (fromCart) return fromCart;
        const prof = supplier?.user_id
          ? profileByPk.get(supplier.user_id) || profileByAuthUser.get(supplier.user_id)
          : undefined;
        const fromProf = prof?.company_name?.trim?.();
        if (fromProf) return fromProf;
        return 'Supplier';
      };

      const resolveAddressLine = (supplier: any | undefined): string => {
        const fromRpc = supplier?.display_location && String(supplier.display_location).trim();
        if (fromRpc) return fromRpc.slice(0, 160);
        const line = supplierLocationLine(supplier);
        if (line) return line;
        return 'No address on file — contact supplier for location';
      };

      const supplierColumns: SupplierColumn[] = Array.from(uniqueSupplierIds).map((id) => {
        const supplier = suppliersMap.get(id);
        return {
          id,
          user_id: supplier?.user_id,
          name: resolveSupplierName(id, supplier),
          rating: supplier?.rating,
          addressLine: resolveAddressLine(supplier),
        };
      }).sort((a, b) => (b.rating || 0) - (a.rating || 0));

      setAllSuppliers(supplierColumns);

      // Build comparisons
      const comparisonResults: ProductComparison[] = items.map(item => {
        const catalogProductId = catalogMaterialIdFromCartLineId(item.id);
        const productPrices = pricesData.filter((p: any) => p.product_id === catalogProductId);
        
        const alternatives: SupplierPrice[] = productPrices.map((p: any) => {
          const supplier = suppliersMap.get(p.supplier_id);
          return {
            supplier_id: p.supplier_id,
            supplier_name: resolveSupplierName(p.supplier_id, supplier),
            supplier_location: resolveAddressLine(supplier),
            price: p.price,
            in_stock: p.in_stock ?? true
          };
        });

        return {
          product_id: item.id,
          product_name: item.name,
          category: item.category,
          unit: item.unit || 'unit',
          quantity: item.quantity,
          alternatives
        };
      });

      setComparisons(comparisonResults);
      
    } catch (error: any) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get price for a product from a supplier
  const getPrice = (comp: ProductComparison, supplierId: string): number | null => {
    const alt = comp.alternatives.find(a => a.supplier_id === supplierId);
    return alt?.in_stock ? alt.price : null;
  };

  // Calculate total for a supplier
  const getSupplierTotal = (supplierId: string): { total: number; itemCount: number } => {
    let total = 0;
    let itemCount = 0;
    
    comparisons.forEach(comp => {
      const price = getPrice(comp, supplierId);
      if (price !== null) {
        total += price * comp.quantity;
        itemCount++;
      }
    });
    
    return { total, itemCount };
  };

  // Find cheapest supplier
  const cheapestSupplier = useMemo(() => {
    let cheapest: { id: string; total: number; name: string } | null = null;
    
    allSuppliers.forEach(supplier => {
      const { total, itemCount } = getSupplierTotal(supplier.id);
      if (itemCount === comparisons.length && total > 0) {
        if (!cheapest || total < cheapest.total) {
          cheapest = { id: supplier.id, total, name: supplier.name };
        }
      }
    });
    
    return cheapest;
  }, [allSuppliers, comparisons]);

  // Toggle supplier selection (for quote requests)
  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) {
        next.delete(supplierId);
      } else {
        next.add(supplierId);
      }
      return next;
    });
  };

  // Select all suppliers
  const selectAllSuppliers = () => {
    setSelectedSuppliers(new Set(allSuppliers.map(s => s.id)));
  };

  // Apply selected supplier to cart (for Private Clients)
  const handleSelectSupplier = (supplierId: string) => {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    let updatedCount = 0;
    
    comparisons.forEach(comp => {
      const alt = comp.alternatives.find(a => a.supplier_id === supplierId && a.in_stock);
      if (alt && updateCartItem) {
        updateCartItem(comp.product_id, {
          unit_price: alt.price,
          supplier_name: alt.supplier_name,
          supplier_id: alt.supplier_id,
          supplier_location: alt.supplier_location || supplier.addressLine,
        });
        updatedCount++;
      }
    });

    toast({
      title: '✅ Cart Updated!',
      description: `${updatedCount} item${updatedCount !== 1 ? 's' : ''} now from ${supplier.name} — ${supplier.addressLine}`,
    });

    onClose();
  };

  // Send quote requests (for Professional Builders)
  const handleSendQuotes = async () => {
    if (selectedSuppliers.size === 0) {
      toast({
        title: 'Select Suppliers',
        description: 'Please select at least one supplier to request quotes from.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    let userId: string | null = null;
    let accessToken: string | null = null;
    try {
      const session = await readAuthSessionForRest();
      userId = session.userId;
      accessToken = session.accessToken;
    } catch (e) {
      console.warn('Could not read auth session for quotes', e);
    }

    if (!userId || !accessToken) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to request quotes.',
        variant: 'destructive',
      });
      setSending(false);
      return;
    }

    const cartPid = getCartProjectId();
    if (!cartPid) {
      toast({
        title: 'Select a project first',
        description:
          'Choose a project on the builder dashboard or tap Order Materials on a project card so quotes link to the right site.',
        variant: 'destructive',
      });
      setSending(false);
      return;
    }
    const cartPname = getCartProjectName();
    const cartPloc = getCartProjectLocation();

    let successCount = 0;
    let lastError: string | null = null;

    const parseSupabaseError = (body: string, status: number): string => {
      if (!body?.trim()) return `Server ${status}`;
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        const msg = (parsed.message as string) || (parsed.error_description as string);
        const details = parsed.details;
        const detailsStr = typeof details === 'string' ? details : (Array.isArray(details) && details[0] ? String(details[0]) : null);
        return (msg || detailsStr || body).slice(0, 400);
      } catch {
        return body.slice(0, 400);
      }
    };

    try {
      for (const supplierId of selectedSuppliers) {
        const supplier = allSuppliers.find(s => s.id === supplierId);
        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        const quotePayload = {
          po_number: poNumber,
          buyer_id: userId,
          supplier_id: supplierId,
          total_amount: totalAmount,
          project_id: cartPid,
          delivery_address: cartPname
            ? `${cartPname} - ${cartPloc || 'Site'}`
            : 'To be provided',
          delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          project_name: cartPname
            ? `${cartPname} — Price comparison quote`
            : `Quote Request - ${new Date().toLocaleDateString()}`,
          status: 'pending',
          items: items.map(item => ({
            material_id: catalogMaterialIdFromCartLineId(item.id),
            material_name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            image_url: item.image_url,
            notes: notes || undefined,
          })),
          created_at: new Date().toISOString(),
        };

        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(quotePayload),
          });

          if (response.ok) {
            successCount++;
          } else {
            const bodyText = await response.text();
            lastError = parseSupabaseError(bodyText, response.status);
            if (response.status === 500) {
              lastError += ' — Run supabase/RUN_THIS_IN_SUPABASE_TO_FIX_500.sql in Supabase SQL Editor if you haven’t.';
            }
            console.error('Quote request error:', response.status, bodyText);
          }
        } catch (e) {
          console.error('Quote request failed for supplier:', supplierId, e);
          lastError = e instanceof Error ? e.message : String(e);
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ Quote Requests Sent!',
          description: `Sent to ${successCount} supplier${successCount !== 1 ? 's' : ''}. Check your dashboard for responses.`,
        });
        
        clearCart();
        onQuotesSent?.();
        onClose();
      } else {
        toast({
          title: 'Failed to send quotes',
          description: lastError || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending quotes:', error);
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : 'Failed to send quote requests.') + (lastError ? ` ${lastError}` : ''),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Find lowest price for a material
  const getLowestPrice = (comp: ProductComparison): number => {
    const prices = comp.alternatives.filter(a => a.in_stock).map(a => a.price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  // Get total items in cart
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className={`${isProfessionalBuilder ? 'bg-blue-600' : 'bg-emerald-600'} text-white p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6" />
              <div>
                <DialogTitle className="text-white text-lg font-bold">
                  {isProfessionalBuilder ? 'Compare & Request Quotes' : 'Compare Prices'}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm">
                  {items.length} item{items.length !== 1 ? 's' : ''} ({totalItems} units) · KES {totalValue.toLocaleString()}
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500">Loading prices...</p>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <>
            {/* Instructions */}
            <div className={`px-4 py-3 ${isProfessionalBuilder ? 'bg-blue-50 border-b border-blue-100' : 'bg-green-50 border-b border-green-100'}`}>
              <p className="text-sm">
                {isProfessionalBuilder ? (
                  <>
                    <strong>✓ Select suppliers</strong> you want to request quotes from (each column shows the store location for that supplier), then click <strong>Send Quote Requests</strong>
                  </>
                ) : (
                  <>
                    <strong>✓ Click Select</strong> on a supplier to buy from them at their prices. Compare columns to see <strong>other suppliers and their store locations</strong> in your area.
                  </>
                )}
              </p>
            </div>

            {/* Table - Materials as ROWS, Suppliers as COLUMNS */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                {/* Header Row - Suppliers as columns */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    {/* Material column header */}
                    <th className="text-left p-3 font-semibold text-gray-700 border-b border-r bg-gray-100 min-w-[200px] sticky left-0">
                      Material
                    </th>
                    {/* Qty column */}
                    <th className="text-center p-2 font-semibold text-gray-600 border-b border-r bg-gray-100 w-16">
                      Qty
                    </th>
                    {/* Supplier columns */}
                    {allSuppliers.map((supplier) => {
                      const { total } = getSupplierTotal(supplier.id);
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      const isSelected = selectedSuppliers.has(supplier.id);
                      
                      return (
                        <th 
                          key={supplier.id} 
                          className={`text-center p-2 border-b border-r min-w-[140px] max-w-[180px] ${isCheapest ? 'bg-green-100' : 'bg-gray-50'} ${isSelected ? 'bg-blue-100' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {/* Checkbox for Professional Builders */}
                            {isProfessionalBuilder && (
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleSupplier(supplier.id)}
                                className="mb-1"
                              />
                            )}
                            <div className="flex items-center gap-1">
                              <Store className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="font-medium text-xs text-gray-800 line-clamp-2">
                                {supplier.name}
                              </span>
                            </div>
                            <div className="flex min-h-[2rem] items-start justify-center gap-0.5 text-[10px] text-gray-600 w-full px-0.5">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-500" aria-hidden />
                              <span className="line-clamp-3 text-center leading-snug break-words">{supplier.addressLine}</span>
                            </div>
                            {isCheapest && (
                              <Badge className="bg-green-500 text-[9px] px-1.5 py-0">
                                <Trophy className="h-2 w-2 mr-0.5" />
                                BEST
                              </Badge>
                            )}
                            {supplier.rating != null && !Number.isNaN(Number(supplier.rating)) && (
                              <div className="flex items-center gap-0.5 text-yellow-500 text-[10px]">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                {Number(supplier.rating).toFixed(1)}
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                
                <tbody>
                  {/* Material rows */}
                  {comparisons.map((comp, idx) => (
                    <tr key={comp.product_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {/* Material name */}
                      <td className="p-3 border-b border-r bg-white sticky left-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {comp.product_name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {comp.category} · {comp.unit}
                        </div>
                      </td>
                      {/* Quantity */}
                      <td className="p-2 border-b border-r text-center text-sm font-medium text-gray-600">
                        {comp.quantity}
                      </td>
                      {/* Prices from each supplier */}
                      {allSuppliers.map((supplier) => {
                        const price = getPrice(comp, supplier.id);
                        const lowestPrice = getLowestPrice(comp);
                        const isLowest = price !== null && price === lowestPrice;
                        const isSelected = selectedSuppliers.has(supplier.id);
                        
                        return (
                          <td 
                            key={`${comp.product_id}-${supplier.id}`}
                            className={`p-2 border-b border-r text-center ${isLowest ? 'bg-green-100' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            {price !== null ? (
                              <span className={`font-medium text-sm ${isLowest ? 'text-green-700' : 'text-gray-800'}`}>
                                KES {price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* TOTALS Row */}
                  <tr className="bg-gray-200 font-bold sticky bottom-0">
                    <td className="p-3 border-t-2 border-gray-400 bg-gray-200 sticky left-0 text-gray-800">
                      TOTAL
                    </td>
                    <td className="p-2 border-t-2 border-gray-400 text-center text-gray-600">
                      {comparisons.reduce((sum, c) => sum + c.quantity, 0)}
                    </td>
                    {allSuppliers.map((supplier) => {
                      const { total, itemCount } = getSupplierTotal(supplier.id);
                      const isCheapest = cheapestSupplier?.id === supplier.id;
                      const hasAllItems = itemCount === comparisons.length;
                      const isSelected = selectedSuppliers.has(supplier.id);
                      
                      return (
                        <td 
                          key={`total-${supplier.id}`}
                          className={`p-3 border-t-2 border-gray-400 text-center ${isCheapest ? 'bg-green-200 text-green-800' : 'bg-gray-100'} ${isSelected ? 'bg-blue-100' : ''}`}
                        >
                          {total > 0 ? (
                            <div>
                              <div className="text-sm">KES {total.toLocaleString()}</div>
                              {!hasAllItems && (
                                <div className="text-[10px] font-normal text-orange-600">
                                  ({itemCount}/{comparisons.length} items)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Action Row for Private Clients - Select buttons */}
                  {!isProfessionalBuilder && (
                    <tr className="bg-white">
                      <td className="p-2 border-t bg-white sticky left-0"></td>
                      <td className="p-2 border-t"></td>
                      {allSuppliers.map((supplier) => {
                        const { total } = getSupplierTotal(supplier.id);
                        const isCheapest = cheapestSupplier?.id === supplier.id;
                        
                        return (
                          <td key={`action-${supplier.id}`} className="p-2 border-t text-center">
                            {total > 0 && (
                              <Button
                                size="sm"
                                variant={isCheapest ? "default" : "outline"}
                                className={`text-xs w-full ${isCheapest ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => handleSelectSupplier(supplier.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Select
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              {isProfessionalBuilder ? (
                <div className="space-y-3">
                  {/* Notes for Professional Builders */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Additional Notes (Optional)
                    </label>
                    <Textarea
                      placeholder="Any special requirements or instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-16 text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {selectedSuppliers.size} supplier{selectedSuppliers.size !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendQuotes}
                        disabled={selectedSuppliers.size === 0 || sending}
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
                            Send to {selectedSuppliers.size} Supplier{selectedSuppliers.size !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Tap <strong>Select</strong> on a supplier to lock cart prices, then{' '}
                    <strong>Pay now with Paystack</strong> to complete checkout.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {onContinueToPayment && (
                      <Button
                        type="button"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => void Promise.resolve(onContinueToPayment())}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay now with Paystack
                      </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
