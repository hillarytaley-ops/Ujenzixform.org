import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { DeliveryPromptDialog } from './DeliveryPromptDialog';
import {
  hasUsableDeliveryCoordinates,
  isPlaceholderDeliveryAddress,
} from '@/lib/deliveryAddressPlaceholder';
import { 
  CheckCircle, 
  XCircle,
  Loader2, 
  Star, 
  MapPin, 
  Package, 
  DollarSign,
  Clock,
  FileText,
  Store,
  Calendar,
  AlertCircle,
  Truck,
  QrCode,
  RefreshCw
} from 'lucide-react';

interface SupplierQuoteReviewProps {
  builderId: string;
  isDarkMode?: boolean;
  showOnlyQuoted?: boolean; // When true, only show quotes that suppliers have responded to
}

interface QuotationRequest {
  id: string;
  purchase_order_id: string;
  supplier_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  delivery_address: string;
  preferred_delivery_date: string;
  project_description: string;
  special_requirements: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected';
  quote_amount: number | null;
  quote_valid_until: string | null;
  supplier_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined supplier data
  supplier?: {
    company_name: string;
    address: string;
    rating: number;
  };
  // Joined purchase order data
  purchase_order?: {
    po_number: string;
    project_name: string;
    delivery_address: string;
    delivery_date: string;
    items: any[];
    total_amount: number;
  };
}

export const SupplierQuoteReview: React.FC<SupplierQuoteReviewProps> = ({ 
  builderId,
  isDarkMode = false,
  showOnlyQuoted = false 
}) => {
  const [quotes, setQuotes] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuotationRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [acceptedPurchaseOrder, setAcceptedPurchaseOrder] = useState<any>(null);
  const { toast } = useToast();

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed.access_token) {
          headers['Authorization'] = `Bearer ${parsed.access_token}`;
        }
      }
    } catch (e) {
      console.warn('Could not get auth token');
    }
    return headers;
  };

  // Helper function to transform orders to quote format
  const transformOrders = async (orders: any[], headers: Record<string, string>): Promise<QuotationRequest[]> => {
    // Fetch suppliers
    let suppliersData: any[] = [];
    try {
      const suppliersController = new AbortController();
      const suppliersTimeoutId = setTimeout(() => suppliersController.abort(), 5000);
      
      const suppliersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name,address,location,rating`,
        { headers, signal: suppliersController.signal, cache: 'no-store' }
      );
      clearTimeout(suppliersTimeoutId);
      
      if (suppliersResponse.ok) {
        suppliersData = await suppliersResponse.json();
      }
    } catch (e) {
      console.log('Suppliers fetch timeout in transformOrders');
    }

    // Create maps for both id and user_id lookups
    const suppliersMap = new Map();
    (suppliersData || []).forEach(s => {
      suppliersMap.set(s.id, s);
      if (s.user_id) suppliersMap.set(s.user_id, s);
    });

    return orders.map(po => {
      const supplier = suppliersMap.get(po.supplier_id);
      const firstItem = po.items?.[0] || {};
      
      return {
        id: po.id,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        material_name: firstItem.material_name || po.project_name || 'Quote Request',
        quantity: po.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1,
        unit: firstItem.unit || 'items',
        delivery_address: po.delivery_address || 'To be provided',
        preferred_delivery_date: po.delivery_date,
        project_description: po.project_name,
        special_requirements: null,
        status: po.status === 'confirmed' ? 'accepted' : po.status,
        quote_amount: po.quote_amount ?? ((po.status === 'quoted' || po.status === 'quote_responded' || po.status === 'quote_revised') ? po.total_amount : null),
        quote_valid_until: po.quote_valid_until || null,
        supplier_notes: po.supplier_notes || null,
        created_at: po.created_at,
        updated_at: po.updated_at,
        supplier: supplier ? {
          company_name: supplier.company_name || 'Unknown Supplier',
          address: supplier.address || supplier.location || 'Location not provided',
          rating: supplier.rating || 4.5
        } : undefined,
        purchase_order: {
          po_number: po.po_number,
          project_name: po.project_name,
          delivery_address: po.delivery_address,
          delivery_date: po.delivery_date,
          items: po.items || [],
          total_amount: po.total_amount
        }
      } as QuotationRequest;
    });
  };

  useEffect(() => {
    fetchQuotes();
    
    // Safety timeout
    const safetyTimeout = setTimeout(() => setLoading(false), 15000);
    
    // Set up real-time subscription to purchase_orders changes
    const subscription = supabase
      .channel('builder-quotes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `buyer_id=eq.${builderId}`
        },
        (payload) => {
          console.log('📬 Quote update received:', payload);
          fetchQuotes(); // Refresh when any change happens
        }
      )
      .subscribe();
    
    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [builderId]);

  // Helper to get builder ID reliably
  const getEffectiveBuilderId = (): string => {
    if (builderId) return builderId;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.user?.id || '';
      }
    } catch (e) {
      console.warn('Could not get user ID from localStorage');
    }
    return '';
  };

  const fetchQuotes = async () => {
    const effectiveBuilderId = getEffectiveBuilderId();
    
    if (!effectiveBuilderId) {
      console.log('❌ SupplierQuoteReview: No builderId provided and no fallback available');
      setLoading(false);
      return;
    }
    
    console.log('🔄 SupplierQuoteReview: Fetching quotes for builder:', effectiveBuilderId, '(prop was:', builderId, ')');
    setLoading(true);
    const headers = getAuthHeaders();
    
    try {
      // Fetch purchase orders using native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Query by buyer_id first - filter by status based on showOnlyQuoted prop
      // When showOnlyQuoted is true, only show quotes that suppliers have responded to
      // Include both new status flow and legacy statuses for backward compatibility
      const statusFilter = showOnlyQuoted 
        ? ['quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quoted']
        : ['quote_created', 'quote_received_by_supplier', 'quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quote_accepted', 'quote_rejected', 'pending', 'quoted', 'confirmed', 'rejected'];
      
      // Build query with proper PostgREST syntax for multiple status values (unquoted)
      // Also filter to only show quotes that have a supplier assigned (supplier_id IS NOT NULL)
      const statusParam = statusFilter.join(',');
      const queryUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?buyer_id=eq.${effectiveBuilderId}&status=in.(${statusParam})&supplier_id=not.is.null&order=updated_at.desc`;
      console.log('🔗 SupplierQuoteReview query URL:', queryUrl, '(showOnlyQuoted:', showOnlyQuoted, ')');
      console.log('📊 Status filter:', statusFilter);
      
      const ordersResponse = await fetch(queryUrl, { headers, signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (!ordersResponse.ok) {
        throw new Error(`Orders fetch failed: ${ordersResponse.status}`);
      }
      
      const purchaseOrders = await ordersResponse.json();
      console.log('📋 SupplierQuoteReview: Orders found by buyer_id:', purchaseOrders?.length || 0);
      
      // Also try fetching by builder_id to catch all orders
      let allOrders = [...(purchaseOrders || [])];
      
      try {
        const builderIdController = new AbortController();
        const builderIdTimeout = setTimeout(() => builderIdController.abort(), 5000);
        
          const builderStatusFilter = showOnlyQuoted 
            ? ['quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quoted']
            : ['quote_created', 'quote_received_by_supplier', 'quote_responded', 'quote_revised', 'quote_viewed_by_builder', 'quote_accepted', 'quote_rejected', 'pending', 'quoted', 'confirmed', 'rejected'];
          const builderStatusParam = builderStatusFilter.join(',');
          const builderIdResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?builder_id=eq.${effectiveBuilderId}&status=in.(${builderStatusParam})&supplier_id=not.is.null&order=updated_at.desc`,
          { headers, signal: builderIdController.signal, cache: 'no-store' }
        );
        clearTimeout(builderIdTimeout);
        
        if (builderIdResponse.ok) {
          const builderIdOrders = await builderIdResponse.json();
          console.log('📋 SupplierQuoteReview: Orders found by builder_id:', builderIdOrders?.length || 0);
          
          // Merge orders from both queries, removing duplicates
          if (builderIdOrders && builderIdOrders.length > 0) {
            const existingIds = new Set(allOrders.map(o => o.id));
            const newOrders = builderIdOrders.filter(o => !existingIds.has(o.id));
            allOrders = [...allOrders, ...newOrders];
            console.log('✅ Merged orders from buyer_id and builder_id. Total:', allOrders.length);
          }
        }
      } catch (e) {
        console.log('builder_id query timeout or error:', e);
      }
      
      console.log('📋 Supplier quotes loaded:', allOrders?.length || 0);

      if (!allOrders || allOrders.length === 0) {
        setQuotes([]);
        setLoading(false);
        return;
      }

      // Transform purchase orders to quote format using helper
      const transformedQuotes = await transformOrders(allOrders, headers);

      console.log('📋 Loaded quotes from purchase_orders:', transformedQuotes.length);
      console.log('📊 Quote statuses:', transformedQuotes.map(q => ({ 
        id: q.id.slice(0,8), 
        status: q.status, 
        quote_amount: q.quote_amount,
        total_amount: q.purchase_order?.total_amount 
      })));
      
      // Debug: Show raw purchase order data for quoted items (include new statuses)
      const quotedOrders = allOrders.filter(po => 
        po.status === 'quoted' || 
        po.status === 'quote_responded' || 
        po.status === 'quote_revised' ||
        po.status === 'quote_viewed_by_builder'
      );
      if (quotedOrders.length > 0) {
        console.log('💰 RAW quoted purchase_orders data:', quotedOrders.map(po => ({
          id: po.id.slice(0,8),
          status: po.status,
          quote_amount: po.quote_amount,
          total_amount: po.total_amount,
          supplier_notes: po.supplier_notes,
          buyer_id: po.buyer_id?.slice(0,8),
          builder_id: po.builder_id?.slice(0,8)
        })));
      }
      
      setQuotes(transformedQuotes);
      
      // Mark quotes as viewed by builder when they're displayed
      // Only mark if status is quote_responded or quote_revised
      const quotesToMarkAsViewed = transformedQuotes.filter(
        q => q.status === 'quote_responded' || q.status === 'quote_revised'
      );
      
      if (quotesToMarkAsViewed.length > 0) {
        // Mark as viewed asynchronously (don't wait)
        quotesToMarkAsViewed.forEach(async (quote) => {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_quote_viewed_by_builder`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ po_id: quote.id })
            });
          } catch (e) {
            // Silently fail - not critical
            console.debug('Could not mark quote as viewed:', e);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error loading quotes',
        description: 'Could not load supplier quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quote: QuotationRequest) => {
    setProcessingId(quote.id);
    const headers = getAuthHeaders();
    
    // Safety timeout: Always clear processing state after 30 seconds max
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Accept quote operation timed out, clearing loading state');
      setProcessingId(null);
      toast({
        title: 'Operation Timeout',
        description: 'The operation took too long. Please refresh and try again.',
        variant: 'destructive',
      });
    }, 30000);
    
    // Helper function to clean up duplicate QR codes with timeout
    const cleanupDuplicateQRCodes = async (orderId: string): Promise<void> => {
      const cleanupTimeout = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ Cleanup timeout, continuing anyway');
          resolve();
        }, 5000); // 5 second timeout
      });

      const cleanupTask = async (): Promise<void> => {
        try {
          console.log('🧹 Cleaning up duplicate QR codes for order:', orderId);
          
          // Try RPC first with timeout
          try {
            const cleanupController = new AbortController();
            const cleanupTimeoutId = setTimeout(() => cleanupController.abort(), 3000);
            
            const cleanupResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/rpc/cleanup_duplicate_qr_codes`,
              {
                method: 'POST',
                headers: {
                  ...headers,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_order_id: orderId }),
                signal: cleanupController.signal
              }
            );
            clearTimeout(cleanupTimeoutId);
            
            if (cleanupResponse.ok) {
              console.log('✅ Duplicate QR codes cleaned up via RPC');
              return;
            }
          } catch (rpcError) {
            console.warn('⚠️ RPC cleanup failed, trying direct delete:', rpcError);
          }
          
          // Fallback: Direct delete of duplicates with timeout
          const { data: items, error: selectError } = await Promise.race([
            supabase
              .from('material_items')
              .select('id, purchase_order_id, item_sequence, created_at')
              .eq('purchase_order_id', orderId)
              .order('created_at', { ascending: true }),
            new Promise<{ data: null, error: { message: 'timeout' } }>((resolve) => 
              setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
            )
          ]) as any;
          
          if (selectError && selectError.message === 'timeout') {
            console.warn('⚠️ Cleanup query timeout, continuing');
            return;
          }
          
          if (items && items.length > 0) {
            // Group by item_sequence and keep only the first one
            const seen = new Set<number>();
            const toDelete: string[] = [];
            
            for (const item of items) {
              if (seen.has(item.item_sequence)) {
                toDelete.push(item.id);
              } else {
                seen.add(item.item_sequence);
              }
            }
            
            if (toDelete.length > 0) {
              await Promise.race([
                supabase
                  .from('material_items')
                  .delete()
                  .in('id', toDelete),
                new Promise((resolve) => setTimeout(() => resolve({ error: null }), 3000))
              ]);
              console.log(`✅ Deleted ${toDelete.length} duplicate QR codes`);
            }
          }
          
          // Reset the flag with timeout
          await Promise.race([
            supabase
              .from('purchase_orders')
              .update({ qr_code_generated: false })
              .eq('id', orderId),
            new Promise((resolve) => setTimeout(() => resolve({ error: null }), 2000))
          ]);
        } catch (error) {
          console.warn('⚠️ Error cleaning up duplicates:', error);
          // Continue anyway - the ON CONFLICT should handle it
        }
      };

      // Race between cleanup and timeout
      await Promise.race([cleanupTask(), cleanupTimeout]);
    };
    
    try {
      // First, mark as viewed if not already viewed
      if (quote.status === 'quote_responded' || quote.status === 'quote_revised') {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_quote_viewed_by_builder`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ po_id: quote.id })
          });
        } catch (e) {
          console.warn('Could not mark quote as viewed:', e);
        }
      }
      
      // Check if QR codes already exist and clean them up if needed (with timeout)
      try {
        const checkPromise = supabase
          .from('material_items')
          .select('id, item_sequence')
          .eq('purchase_order_id', quote.id)
          .limit(1);
        
        const timeoutPromise = new Promise<{ data: null, error: null }>((resolve) => 
          setTimeout(() => resolve({ data: null, error: null }), 2000)
        );
        
        const { data: existingItems } = await Promise.race([checkPromise, timeoutPromise]) as any;
        
        if (existingItems && existingItems.length > 0) {
          console.log('⚠️ QR codes already exist, cleaning up before accepting...');
          await cleanupDuplicateQRCodes(quote.id);
        }
      } catch (checkError) {
        console.warn('⚠️ Could not check for existing QR codes, continuing:', checkError);
        // Continue anyway
      }
      
      // Update purchase order to 'quote_accepted' - trigger will convert to order
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const updatePayload = { 
        status: 'quote_accepted', // Will be auto-converted to 'pending' order by trigger
        total_amount: quote.quote_amount || quote.purchase_order?.total_amount,
        delivery_required: true, // Default to delivery, user can change to pickup
        updated_at: new Date().toISOString()
      };
      
      console.log('🔄 Accepting quote:', quote.id, 'with payload:', updatePayload);
      
      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${quote.id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updatePayload),
          signal: controller.signal,
          cache: 'no-store'
        }
      );
      clearTimeout(timeoutId);
      
      // If we get a duplicate key error, clean up and retry once
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        // Check if it's a duplicate QR code error
        if (response.status === 409 && 
            (errorData.message?.includes('duplicate key') || 
             errorData.message?.includes('material_items_purchase_order_id_item_sequence_key'))) {
          console.log('🔄 Duplicate QR code detected, cleaning up and retrying...');
          
          // Clean up duplicates
          await cleanupDuplicateQRCodes(quote.id);
          
          // Wait a moment for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the update
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
          
          response = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${quote.id}`,
            {
              method: 'PATCH',
              headers: {
                ...headers,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(updatePayload),
              signal: retryController.signal,
              cache: 'no-store'
            }
          );
          clearTimeout(retryTimeoutId);
        }
        
        if (!response.ok) {
          const finalErrorText = await response.text();
          console.error('❌ Accept quote failed after retry:', response.status, finalErrorText);
          throw new Error(`Failed to accept quote: ${response.status}`);
        }
      }
      
      const poDataArray = await response.json();
      const poData = poDataArray?.[0];
      console.log('✅ Quote accepted successfully:', poData);

      const deliveryAddress = quote.delivery_address || quote.purchase_order?.delivery_address || '';
      const poCoords =
        (quote as any).delivery_coordinates ||
        (quote.purchase_order as any)?.delivery_coordinates ||
        '';
      const addressReadyForAutoDr =
        !isPlaceholderDeliveryAddress(deliveryAddress) ||
        hasUsableDeliveryCoordinates(poCoords);

      toast({
        title: '✅ Quote Accepted!',
        description: addressReadyForAutoDr
          ? 'Order created and awaiting delivery provider allocation. QR codes will be generated when dispatched.'
          : 'Use the delivery form to enter your full address (or map/GPS) so a driver can be assigned.',
      });

      console.log('📦 Quote accepted, status set to pending. Order will appear in Pending Orders awaiting delivery provider.');

      // Prepare purchase order data for delivery/pickup choice dialog
      const deliveryDate = quote.preferred_delivery_date || quote.purchase_order?.delivery_date || new Date().toISOString().split('T')[0];
      
      const purchaseOrderForDelivery = {
        id: quote.id,
        po_number: quote.purchase_order?.po_number || poData?.po_number || `PO-${quote.id.slice(0, 8)}`,
        supplier_id: quote.supplier_id,
        supplier_name: quote.supplier?.company_name || 'Supplier',
        supplier_address: quote.supplier?.address || '',
        total_amount: quote.quote_amount || 0,
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate,
        items: quote.purchase_order?.items || [{
          material_name: quote.material_name,
          quantity: quote.quantity,
          unit: quote.unit
        }],
        project_name: quote.project_description || quote.purchase_order?.project_name,
        special_instructions: quote.special_requirements || ''
      };

      setAcceptedPurchaseOrder(purchaseOrderForDelivery);
      
      // AUTO-CREATE delivery_request when address/coords are valid (DB rejects literal "To be provided" on INSERT).
      const effectiveBuilderId = getEffectiveBuilderId();
      if (effectiveBuilderId) {
        try {
          const pickupAddr = quote.supplier?.address || quote.supplier?.location || 'Supplier location';
          const fullDeliveryAddr = (deliveryAddress || '').trim();
          const materialType = (quote.purchase_order?.items?.[0]?.material_name || quote.material_name || 'Construction Materials').toString();
          const qty = quote.purchase_order?.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || quote.quantity || 1;

          const canAutoCreateDr =
            !isPlaceholderDeliveryAddress(fullDeliveryAddr) ||
            hasUsableDeliveryCoordinates(poCoords);

          if (!canAutoCreateDr) {
            console.log(
              'ℹ️ Skipping auto delivery_request: no real address yet. Complete the delivery dialog — DB rejects placeholder addresses.'
            );
          } else {
          const drPayload: Record<string, unknown> = {
            builder_id: effectiveBuilderId,
            purchase_order_id: quote.id,
            pickup_address: pickupAddr,
            delivery_address: isPlaceholderDeliveryAddress(fullDeliveryAddr) ? '' : fullDeliveryAddr,
            pickup_date: deliveryDate,
            material_type: materialType,
            quantity: qty,
            status: 'pending'
          };
          if (hasUsableDeliveryCoordinates(poCoords)) {
            drPayload.delivery_coordinates = String(poCoords).trim();
          }
          const drRes = await fetch(`${SUPABASE_URL}/rest/v1/delivery_requests`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(drPayload),
            cache: 'no-store'
          });
          if (drRes.ok) {
            console.log('✅ Auto-created delivery_request — appears on provider dashboard');
            const drData = await drRes.json();
            const drId = Array.isArray(drData) ? drData[0]?.id : drData?.id;
            if (drId) {
              try {
                await fetch(`${SUPABASE_URL}/functions/v1/notify-delivery-providers`, {
                  method: 'POST',
                  headers: { ...headers },
                  body: JSON.stringify({
                    request_type: 'quote_accepted',
                    request_id: drId,
                    builder_id: effectiveBuilderId,
                    pickup_address: pickupAddr,
                    delivery_address: (drPayload.delivery_address as string) || fullDeliveryAddr,
                    material_details: (purchaseOrderForDelivery.items || []).map((i: any) => ({
                      material_type: i.material_name || i.name,
                      quantity: i.quantity,
                      unit: i.unit || 'units'
                    })),
                    priority_level: 'normal',
                    po_number: purchaseOrderForDelivery.po_number
                  })
                });
              } catch (_) {}
            }
          } else {
            console.warn('⚠️ Auto-create delivery_request failed (dialog will allow manual):', await drRes.text());
          }
          }
        } catch (e) {
          console.warn('⚠️ Auto-create delivery_request error (dialog will allow manual):', e);
        }
      }

      // Show delivery/pickup choice dialog (for pickup or to update address if needed)
      setTimeout(() => {
        setShowDeliveryPrompt(true);
      }, 500);

      // Refresh quotes list
      fetchQuotes();

    } catch (error: any) {
      console.error('Error accepting quote:', error);
      toast({
        title: 'Failed to accept quote',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      // Clear safety timeout
      clearTimeout(safetyTimeout);
      // Always clear processing state, even if there was an error
      setTimeout(() => {
        setProcessingId(null);
      }, 100);
    }
  };

  // Handle when user chooses DELIVERY (called from DeliveryPromptDialog after builder submitted form WITH address)
  // CRITICAL: Do NOT create a delivery_request here with PO.delivery_address (often "To be provided").
  // The dialog already created/updated the request with the builder's real address. Creating here would
  // cause "Delivery address missing" on the provider card. Only fetch the request the dialog created and notify.
  const handleDeliveryRequested = async () => {
    if (!acceptedPurchaseOrder) return;
    const headers = getAuthHeaders();
    const effectiveBuilderId = getEffectiveBuilderId();
    
    try {
      let pickupAddress = acceptedPurchaseOrder.supplier_address || 'Supplier location';
      if (acceptedPurchaseOrder.supplier_id) {
        try {
          const supplierController = new AbortController();
          const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?or=(id.eq.${acceptedPurchaseOrder.supplier_id},user_id.eq.${acceptedPurchaseOrder.supplier_id})&select=address,location,company_name&limit=1`,
            { headers, signal: supplierController.signal, cache: 'no-store' }
          );
          clearTimeout(supplierTimeout);
          if (supplierResponse.ok) {
            const suppliersData = await supplierResponse.json();
            const supplierData = suppliersData?.[0];
            if (supplierData) {
              pickupAddress = supplierData.address || supplierData.location || `${supplierData.company_name} - Pickup Location`;
            }
          }
        } catch (e) {
          console.log('Supplier fetch timeout, using default pickup address');
        }
      }

      // Delivery request was created by DeliveryPromptDialog with the builder's address. Fetch it.
      let deliveryRequest = null;
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${acceptedPurchaseOrder.id}&select=id,status,delivery_address&order=created_at.desc&limit=1`,
        { headers, cache: 'no-store' }
      );
      if (checkResponse.ok) {
        const existing = await checkResponse.json();
        if (existing && existing.length > 0) {
          deliveryRequest = existing[0];
        }
      }
      if (!deliveryRequest) {
        await new Promise(r => setTimeout(r, 600));
        const retryResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${acceptedPurchaseOrder.id}&select=id,status,delivery_address&order=created_at.desc&limit=1`,
          { headers, cache: 'no-store' }
        );
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData?.length > 0) deliveryRequest = retryData[0];
        }
      }

      if (deliveryRequest) {
        try {
          const notifyController = new AbortController();
          setTimeout(() => notifyController.abort(), 8000);
          await fetch(`${SUPABASE_URL}/functions/v1/notify-delivery-providers`, {
            method: 'POST',
            headers: { ...headers },
            body: JSON.stringify({
              request_type: 'quote_accepted',
              request_id: deliveryRequest.id,
              builder_id: effectiveBuilderId,
              pickup_address: pickupAddress,
              delivery_address: deliveryRequest.delivery_address ?? acceptedPurchaseOrder.delivery_address,
              material_details: acceptedPurchaseOrder.items?.map((item: any) => ({
                material_type: item.material_name || item.name,
                quantity: item.quantity,
                unit: item.unit || 'units'
              })),
              special_instructions: acceptedPurchaseOrder.special_instructions,
              priority_level: 'normal',
              po_number: acceptedPurchaseOrder.po_number
            }),
            signal: notifyController.signal
          });
          console.log('Delivery providers notified successfully');
        } catch (notifyError) {
          console.error('Error notifying delivery providers:', notifyError);
        }
      }

      toast({
        title: '🚚 Delivery Requested!',
        description: 'QR codes will be generated. Nearby delivery providers have been notified.',
      });
      
    } catch (error: any) {
      console.error('Error requesting delivery:', error);
      toast({
        title: 'Delivery request failed',
        description: error.message || 'Please try again from the Delivery page.',
        variant: 'destructive',
      });
    }
  };

  // Helper function to detect material type
  const detectMaterialType = (materialName: string): string => {
    const name = (materialName || '').toLowerCase();
    const types = ['cement', 'steel', 'timber', 'blocks', 'sand', 'aggregates', 'roofing', 'tiles', 'plumbing', 'electrical'];
    for (const type of types) {
      if (name.includes(type)) return type;
    }
    return 'mixed';
  };

  const handleRejectQuote = async () => {
    if (!selectedQuote) return;
    const headers = getAuthHeaders();
    
    setProcessingId(selectedQuote.id);
    try {
      // Update purchase order status to 'rejected' using native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log('🔄 Rejecting quote:', selectedQuote.id);
      
      // First, mark as viewed if not already viewed
      if (selectedQuote.status === 'quote_responded' || selectedQuote.status === 'quote_revised') {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_quote_viewed_by_builder`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ po_id: selectedQuote.id })
          });
        } catch (e) {
          console.warn('Could not mark quote as viewed:', e);
        }
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${selectedQuote.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ 
            status: 'quote_rejected',
            updated_at: new Date().toISOString()
          }),
          signal: controller.signal,
          cache: 'no-store'
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Reject quote failed:', response.status, errorText);
        throw new Error(`Failed to reject quote: ${response.status}`);
      }
      
      console.log('✅ Quote rejected successfully');

      toast({
        title: 'Quote Rejected',
        description: `You've rejected the quote from ${selectedQuote.supplier?.company_name || 'the supplier'}.`,
      });

      setShowRejectDialog(false);
      setSelectedQuote(null);
      setRejectReason('');
      
      // Refresh quotes list
      fetchQuotes();

    } catch (error: any) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Failed to reject quote',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const humanizeRawStatus = (s: string) =>
    s
      .trim()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'quote_created':
      case 'quote_received_by_supplier':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">⏳ Awaiting Quote</Badge>;
      case 'quoted':
      case 'quote_responded':
      case 'quote_revised':
      case 'quote_viewed_by_builder':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">💰 Quote Received</Badge>;
      case 'accepted':
      case 'quote_accepted':
      case 'order_created':
      case 'awaiting_delivery_request':
        return <Badge className="bg-green-100 text-green-700 border-green-300">✅ Accepted</Badge>;
      case 'rejected':
      case 'quote_rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300">❌ Rejected</Badge>;
      default:
        return (
          <Badge variant="outline" className="whitespace-normal break-words text-left max-w-full">
            {humanizeRawStatus(status)}
          </Badge>
        );
    }
  };

  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Filter quotes by status - include both new status flow and legacy statuses
  const pendingQuotes = quotes.filter(q => 
    q.status === 'pending' || 
    q.status === 'quote_created' || 
    q.status === 'quote_received_by_supplier'
  );
  const quotedQuotes = quotes.filter(q => 
    q.status === 'quoted' || 
    q.status === 'quote_responded' || 
    q.status === 'quote_revised' || 
    q.status === 'quote_viewed_by_builder'
  );
  const acceptedQuotes = quotes.filter(q => 
    q.status === 'accepted' || 
    q.status === 'quote_accepted' ||
    q.status === 'order_created' ||
    q.status === 'awaiting_delivery_request'
  );
  const rejectedQuotes = quotes.filter(q => 
    q.status === 'rejected' || 
    q.status === 'quote_rejected'
  );

  if (loading) {
    return (
      <Card className={cardBg}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className={`text-sm mt-4 ${mutedText}`}>Loading supplier quotes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={cardBg}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <FileText className="h-5 w-5 text-green-500" />
                {showOnlyQuoted ? 'Supplier Responses' : 'All Quote Activity'}
              </CardTitle>
              <CardDescription className={mutedText}>
                {showOnlyQuoted 
                  ? 'Suppliers have responded with pricing - accept or reject below'
                  : 'Review and manage all your quote requests'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!showOnlyQuoted && (
                <>
                  <Badge className="bg-yellow-100 text-yellow-700">{pendingQuotes.length} Pending</Badge>
                  <Badge className="bg-green-100 text-green-700">{acceptedQuotes.length} Accepted</Badge>
                </>
              )}
              <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                {quotedQuotes.length} {showOnlyQuoted ? 'Response(s)' : 'To Review'}
              </Badge>
              <Button variant="outline" size="sm" onClick={fetchQuotes}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quotes Requiring Action - Highlighted */}
      {quotedQuotes.length > 0 && (
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <DollarSign className="h-5 w-5" />
              Quotes Ready for Review ({quotedQuotes.length})
            </CardTitle>
            <CardDescription className="text-blue-600">
              Suppliers have sent pricing - review and accept or reject
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotedQuotes.map((quote) => (
              <Card key={quote.id} className="bg-white border-2 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Quote Details */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          <Store className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {quote.supplier?.company_name || 'Supplier'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {quote.supplier?.rating && quote.supplier.rating > 0 && (
                              <span className="flex items-center gap-1 text-sm text-yellow-600">
                                <Star className="h-3 w-3 fill-yellow-500" />
                                {quote.supplier.rating.toFixed(1)}
                              </span>
                            )}
                            {quote.supplier?.address && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {quote.supplier.address}
                              </span>
                            )}
                          </div>
                          
                          {/* Material Info */}
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-2 text-sm min-w-0">
                              <Package className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="font-medium break-words leading-snug block">{quote.material_name}</span>
                                <span className="text-gray-500 text-xs sm:text-sm mt-0.5 block">
                                  {quote.quantity} {quote.unit}
                                </span>
                              </div>
                            </div>
                            {quote.project_description && (
                              <p className="text-xs text-gray-500 mt-1">
                                Project: {quote.project_description}
                              </p>
                            )}
                          </div>

                          {/* Supplier Notes */}
                          {quote.supplier_notes && (
                            <Alert className="mt-3 bg-amber-50 border-amber-200">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-xs text-amber-800">
                                <strong>Supplier Notes:</strong> {quote.supplier_notes}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex flex-col items-stretch gap-3 w-full lg:w-auto lg:min-w-[200px] lg:items-end">
                      {/* Price Display */}
                      <div className="text-right bg-green-50 p-3 rounded-lg border border-green-200 w-full">
                        <p className="text-xs text-green-600 font-medium">Quoted Price</p>
                        <p className="text-2xl font-bold text-green-700">
                          {quote.quote_amount ? formatCurrency(quote.quote_amount) : 'N/A'}
                        </p>
                        {quote.quote_valid_until && (
                          <p className="text-xs text-green-600 mt-1 flex items-center justify-end gap-1">
                            <Calendar className="h-3 w-3" />
                            Valid until: {new Date(quote.quote_valid_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 w-full">
                        <Button
                          onClick={() => handleAcceptQuote(quote)}
                          disabled={processingId === quote.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {processingId === quote.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowRejectDialog(true);
                          }}
                          disabled={processingId === quote.id}
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Quotes (Awaiting Supplier Response) - Only show when not filtered to quoted only */}
      {!showOnlyQuoted && pendingQuotes.length > 0 && (
        <Card className={cardBg}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm ${textColor}`}>
              <Clock className="h-4 w-4 text-yellow-500" />
              Awaiting Supplier Quotes ({pendingQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingQuotes.map((quote) => (
              <div
                key={quote.id}
                className={`p-3 rounded-lg border flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${
                  isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className={`font-medium block break-words leading-snug ${textColor}`}>{quote.material_name}</span>
                    <span className={`text-xs ${mutedText} block mt-0.5`}>Qty ×{quote.quantity}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-300 text-xs shrink-0 self-start sm:self-center whitespace-normal"
                >
                  ⏳ Awaiting
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Accepted Quotes - Only show when not filtered to quoted only */}
      {!showOnlyQuoted && acceptedQuotes.length > 0 && (
        <Card className={cardBg}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2 text-sm ${textColor}`}>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Accepted Quotes ({acceptedQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {acceptedQuotes.map((quote) => (
              <div
                key={quote.id}
                className={`p-3 rounded-lg border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                  isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <QrCode className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span
                      className={`font-medium block break-words leading-snug ${isDarkMode ? 'text-white' : 'text-green-800'}`}
                    >
                      {quote.material_name}
                    </span>
                    {quote.quote_amount ? (
                      <span className={`text-xs font-semibold block mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-green-700'}`}>
                        {formatCurrency(quote.quote_amount)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                  <Badge className="bg-green-100 text-green-700 text-xs">✓ QR</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setAcceptedPurchaseOrder({
                        id: quote.id,
                        po_number: quote.purchase_order?.po_number,
                        supplier_id: quote.supplier_id,
                        supplier_name: quote.supplier?.company_name,
                        supplier_address: quote.supplier?.address,
                        total_amount: quote.quote_amount,
                        delivery_address: quote.delivery_address,
                        delivery_date: quote.preferred_delivery_date,
                        items: [{
                          material_name: quote.material_name,
                          quantity: quote.quantity,
                          unit: quote.unit
                        }]
                      });
                      setShowDeliveryPrompt(true);
                    }}
                  >
                    <Truck className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Quotes */}
      {quotes.length === 0 && (
        <Card className={cardBg}>
          <CardContent className="py-12 text-center">
            {showOnlyQuoted ? (
              <>
                <CheckCircle className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`font-medium ${textColor}`}>No Supplier Responses Yet</p>
                <p className={`text-sm ${mutedText} mt-2`}>
                  When suppliers respond to your quote requests with pricing, they'll appear here for you to accept or reject.
                </p>
                <p className={`text-xs ${mutedText} mt-3`}>
                  💡 Tip: Suppliers typically respond within 2-24 hours
                </p>
              </>
            ) : (
              <>
                <FileText className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={textColor}>No quote requests yet</p>
                <p className={`text-sm ${mutedText}`}>
                  Request quotes from the Materials page to get started
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject Quote Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Quote
            </DialogTitle>
            <DialogDescription>
              {selectedQuote && (
                <span>
                  Reject quote from <strong>{selectedQuote.supplier?.company_name}</strong> for {selectedQuote.material_name}?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectReason">Reason for rejection (optional)</Label>
            <Textarea
              id="rejectReason"
              placeholder="e.g., Price too high, delivery time too long, found better offer..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectQuote}
              disabled={processingId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery/Pickup Choice Dialog */}
      <DeliveryPromptDialog
        isOpen={showDeliveryPrompt}
        onOpenChange={setShowDeliveryPrompt}
        purchaseOrder={acceptedPurchaseOrder}
        onDeliveryRequested={handleDeliveryRequested}
        onDeclined={() => {
          // User chose pickup - no delivery, no QR codes
          toast({
            title: '📦 Pickup Order Confirmed!',
            description: 'Collect your materials directly from the supplier. No QR code needed.',
          });
        }}
      />
    </div>
  );
};

export default SupplierQuoteReview;

