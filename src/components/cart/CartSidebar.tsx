/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ PROTECTED FILE - CARTSIDEBAR.TSX - DO NOT MODIFY WITHOUT APPROVAL              ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 27, 2025                                                    ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   1. Slide-out shopping cart sidebar                                                ║
 * ║   2. Quantity controls for each item                                                ║
 * ║   3. Request Quote and Buy Now buttons                                              ║
 * ║   4. Cart summary with totals                                                       ║
 * ║                                                                                      ║
 * ║   ⚠️ WARNING: Any changes to this file require explicit user approval               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart, CartItem } from '@/contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, Package, X, FileText, CreditCard, Scale, Store, Users, Truck, Video, Building2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { readAuthUserIdSync, readAuthSessionForRest } from '@/utils/supabaseAccessToken';
import { CartPriceComparison } from './CartPriceComparison';
import { CartPriceComparisonAll } from './CartPriceComparisonAll';
import { MultiSupplierQuoteDialog } from './MultiSupplierQuoteDialog';
import { DeliveryPromptDialog } from '@/components/builders/DeliveryPromptDialog';
import { MonitoringServicePrompt } from '@/components/builders/MonitoringServicePrompt';
import { PaymentGateway } from '@/components/payment/PaymentGateway';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setCartProjectContext, clearCartProjectContext } from '@/utils/builderCartProject';
import { catalogMaterialIdFromCartLineId } from '@/utils/cartLineId';

// Project interface for project selection
interface BuilderProject {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: string;
}

/** Radix Select forbids SelectItem with value=""; use this for "no project" in the cart project picker. */
const CART_NO_PROJECT_SELECT_VALUE = '__ujenzi_no_project__';

// Parse Supabase/PostgREST error response so we can show the real server error (e.g. trigger/DB message)
const parseSupabaseError = (body: string, status: number): string => {
  if (!body || !body.trim()) return `Server ${status}`;
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

// Helper for fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

export const CartSidebar: React.FC = () => {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    getTotalPrice, 
    getTotalItems,
    isCartOpen,
    setIsCartOpen 
  } = useCart();
  const { toast } = useToast();
  const [comparisonItem, setComparisonItem] = useState<CartItem | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showCompareAll, setShowCompareAll] = useState(false);
  const [showMultiSupplierQuote, setShowMultiSupplierQuote] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [showMonitoringPrompt, setShowMonitoringPrompt] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);
  const [lastOrderItems, setLastOrderItems] = useState<Array<{ material_name?: string; name?: string; quantity: number; unit?: string; unit_price?: number }>>([]);
  const [lastOrderStatus, setLastOrderStatus] = useState<string | null>(null);
  const [lastOrderFulfillmentChoice, setLastOrderFulfillmentChoice] = useState<string | null>(null);
  const [lastOrderPoNumber, setLastOrderPoNumber] = useState<string>('');
  const [lastDeliveryAddress, setLastDeliveryAddress] = useState<string>('');
  /** After Buy Now, offer Paystack before the delivery prompt (buyer total only; fee logic stays server-side later). */
  const [showPaystackAfterOrder, setShowPaystackAfterOrder] = useState(false);
  const [paystackSuccessPath, setPaystackSuccessPath] = useState<string>('/home');
  
  // Project selection for linking orders to projects
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load user's projects for order association
  const loadProjects = async () => {
    const currentRole = userRole || localStorage.getItem('user_role');
    // Only load projects for builders
    if (currentRole !== 'professional_builder' && currentRole !== 'private_client') {
      return;
    }

    setLoadingProjects(true);
    try {
      const userId = readAuthUserIdSync();
      if (!userId) return;

      const { data: raw, error } = await supabase
        .from('builder_projects')
        .select('id,name,location,status')
        .eq('builder_id', userId)
        .order('created_at', { ascending: false });

      if (!error && raw) {
        const projectsData = (Array.isArray(raw) ? raw : []).filter(
          (p: { status?: string }) => !p.status || p.status === 'active' || p.status === 'in_progress'
        );
        console.log('📁 Cart: Loaded projects for order association:', projectsData.length);
        setProjects(projectsData || []);

        const storedProjectId = localStorage.getItem('cart_project_id');
        if (storedProjectId && projectsData.some((p: BuilderProject) => p.id === storedProjectId)) {
          console.log('📁 Cart: Pre-selecting project from localStorage:', storedProjectId);
          setSelectedProjectId(storedProjectId);
          const match = projectsData.find((p: BuilderProject) => p.id === storedProjectId);
          if (match?.name)
            setCartProjectContext(storedProjectId, match.name, match.location ?? null);
        }
      } else if (error) {
        console.warn('Cart: builder_projects load failed:', error.message);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Check user role on mount and when cart opens - use localStorage FIRST for instant access
  useEffect(() => {
    // INSTANT: Check localStorage first (this is always available immediately)
    const cachedRole = localStorage.getItem('user_role');
    if (cachedRole) {
      console.log('🔐 Cart: Using cached role (instant):', cachedRole);
      setUserRole(cachedRole);
    }
    
    // ASYNC: Verify from database in background (but don't wait for it)
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const dbRole = roleData?.role || null;
          if (dbRole) {
            console.log('🔐 Cart: Database role verified:', dbRole);
            setUserRole(dbRole);
            // Update localStorage if different
            if (dbRole !== cachedRole) {
              localStorage.setItem('user_role', dbRole);
            }
          }
        }
      } catch (err) {
        console.log('🔐 Cart: Role check error, using cached role');
      }
    };
    
    // Only run async check if cart is open (to avoid unnecessary calls)
    if (isCartOpen) {
      checkUserRole();
      // Load projects for order association
      loadProjects();
      
      // Check if project_id is in localStorage (from URL parameter)
      const storedProjectId = localStorage.getItem('cart_project_id');
      if (storedProjectId && !selectedProjectId) {
        console.log('📁 Cart: Pre-selecting project from URL:', storedProjectId);
        setSelectedProjectId(storedProjectId);
      }
    }
  }, [isCartOpen]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleRequestQuote = async () => {
    console.log('📝 RequestQuote: Starting quote request...');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECURITY: ONLY Professional Builders can request quotes
    // Private Clients must use Buy Now instead
    // ═══════════════════════════════════════════════════════════════════════════════
    const currentRole = userRole || localStorage.getItem('user_role');
    
    if (currentRole === 'private_client') {
      console.log('🚫 Private Client attempted quote request - blocked');
      toast({
        title: '🛒 Use Buy Now Instead',
        description: 'As a Private Client, you can purchase directly. Use the "Buy Now" button to complete your purchase.',
        variant: 'destructive'
      });
      return;
    }
    
    if (currentRole !== 'professional_builder' && currentRole !== 'admin') {
      console.log('🚫 Non-builder attempted quote request - blocked');
      toast({
        title: '⚠️ Professional Builder Required',
        description: 'Only Professional Builders can request quotes. Please register as a Professional Builder or Private Client to purchase.',
        variant: 'destructive'
      });
      return;
    }

    if (
      (currentRole === 'professional_builder' || currentRole === 'admin') &&
      projects.length > 0 &&
      !selectedProjectId
    ) {
      toast({
        title: 'Select a project',
        description:
          'Pick the project this quote is for (above) so costs show on the correct project card.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { userId, accessToken } = await readAuthSessionForRest();
      if (!userId || !accessToken) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to request a quote for your cart items.',
          variant: 'destructive'
        });
        window.location.href = '/private-client-auth';
        return;
      }

      // Fetch suppliers using native fetch
      let suppliersMap: Record<string, string> = {};
      let defaultSupplierId: string | null = null;
      
      try {
        const suppliersResponse = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/suppliers?select=id,user_id,company_name&limit=50`,
          { headers: { 'apikey': SUPABASE_ANON_KEY } },
          8000
        );
        
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          if (suppliersData && suppliersData.length > 0) {
            suppliersData.forEach((s: any) => {
              suppliersMap[s.id] = s.company_name;
              if (s.user_id) suppliersMap[s.user_id] = s.company_name;
            });
            defaultSupplierId = suppliersData[0].user_id || suppliersData[0].id;
          }
        }
      } catch (e) {
        console.warn('Suppliers fetch failed');
      }

      // Group items by supplier
      const itemsBySupplier: Record<string, CartItem[]> = {};
      for (const item of items) {
        let supplierId = item.supplier_id;
        
        if (!supplierId || supplierId === 'general' || supplierId === 'admin-catalog') {
          supplierId = defaultSupplierId || userId;
        }
        
        if (!itemsBySupplier[supplierId]) {
          itemsBySupplier[supplierId] = [];
        }
        itemsBySupplier[supplierId].push(item);
      }

      // Create quote requests using Supabase client (avoids 500 from raw fetch and surfaces real errors)
      let successCount = 0;
      const supplierNames: string[] = [];
      let lastInsertError: string | null = null;

      for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
        const supplierTotal = supplierItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const poNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const supplierName = suppliersMap[supplierId] || supplierItems[0]?.supplier_name || 'General Catalog';
        
        // Get selected project details for delivery address
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        const deliveryAddress = selectedProject 
          ? `${selectedProject.name} - ${selectedProject.location}${selectedProject.address ? ` (${selectedProject.address})` : ''}`
          : 'To be provided';
        const projectName = selectedProject?.name 
          ? `${selectedProject.name} - Quote from ${supplierName}`
          : `Quote Request - ${supplierName}`;

        const quotePayload: Record<string, any> = {
          po_number: poNumber,
          buyer_id: userId,
          supplier_id: supplierId,
          total_amount: supplierTotal,
          delivery_address: deliveryAddress,
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          project_name: projectName,
          status: 'pending',
          delivery_required: false,
          builder_fulfillment_choice: 'pending',
          items: supplierItems.map(item => ({
            material_id: catalogMaterialIdFromCartLineId(item.id),
            material_name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            supplier_name: item.supplier_name
          }))
        };

        // Link quote to project if selected
        if (selectedProjectId) {
          quotePayload.project_id = selectedProjectId;
          console.log('📁 Linking quote to project:', selectedProjectId);
        }

        try {
          const res = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/purchase_orders`,
            {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify(quotePayload),
            },
            15000
          );
          const body = await res.text();
          if (res.ok) {
            successCount++;
            if (!supplierNames.includes(supplierName)) {
              supplierNames.push(supplierName);
            }
          } else {
            const errMsg = parseSupabaseError(body, res.status);
            lastInsertError = res.status === 500
              ? `${errMsg} — Run supabase/RUN_THIS_IN_SUPABASE_TO_FIX_500.sql in Supabase SQL Editor if you haven’t.`
              : errMsg;
            console.error('Quote request error:', res.status, body);
          }
        } catch (e) {
          lastInsertError = e instanceof Error ? e.message : String(e);
          console.error('Quote request error for supplier:', supplierId, e);
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ Quote Requested!',
          description: `Quote sent to ${supplierNames.length} supplier(s): ${supplierNames.join(', ')}. They will respond shortly.`,
        });
        clearCart();
        setIsCartOpen(false);
      } else {
        throw new Error(lastInsertError || 'Failed to create any quote requests');
      }
    } catch (error: any) {
      console.error('Error requesting quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit quote request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleBuyNow = async () => {
    if (isProcessing) return;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECURITY: ONLY Private Clients can buy directly
    // Professional Builders must use Request Quote instead
    // Other users (visitors, suppliers, delivery) cannot purchase
    // ═══════════════════════════════════════════════════════════════════════════════
    const currentRole = userRole || localStorage.getItem('user_role');
    
    if (currentRole === 'professional_builder') {
      console.log('🚫 Professional Builder attempted direct purchase - blocked');
      toast({
        title: '📋 Request a Quote Instead',
        description: 'As a Professional Builder, you need to request quotes from suppliers. Use the "Request Quotes from Multiple Suppliers" button above.',
        variant: 'destructive'
      });
      return;
    }
    
    if (currentRole !== 'private_client' && currentRole !== 'admin') {
      console.log('🚫 Non-private-client attempted direct purchase - blocked');
      toast({
        title: '⚠️ Private Client Required',
        description: 'Only Private Clients can purchase directly. Please register as a Private Client or Professional Builder to request quotes.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    console.log('🛒 BuyNow: Starting purchase process...');
    
    try {
      const { userId, accessToken } = await readAuthSessionForRest();
      if (!userId || !accessToken) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to purchase your cart items.',
          variant: 'destructive'
        });
        setIsProcessing(false);
        window.location.href = '/private-client-auth';
        return;
      }

      console.log('🛒 BuyNow: User ID:', userId);

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Get a valid supplier - use native fetch with timeout
      let validatedSupplierId: string | null = null;
      let supplierName: string | null = null;
      
      // Collect product IDs from cart
      const productIds = items
        .map((item) => catalogMaterialIdFromCartLineId(item.id))
        .filter(Boolean);
      console.log('🛒 Cart product IDs:', productIds);
      
      // STEP 1: Check if any item already has a valid supplier_id from user selection
      const itemWithSupplier = items.find(item => 
        item.supplier_id && 
        item.supplier_id !== 'admin-catalog' && 
        item.supplier_id !== 'general' &&
        item.supplier_id.length === 36
      );
      
      if (itemWithSupplier?.supplier_id) {
        validatedSupplierId = itemWithSupplier.supplier_id;
        supplierName = itemWithSupplier.supplier_name || 'Selected Supplier';
        console.log('📦 Using supplier from cart item:', validatedSupplierId);
      }
      
      const restHeaders: Record<string, string> = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      };

      // STEP 2: If no supplier from cart, find supplier who has PRICED these products
      if (!validatedSupplierId && productIds.length > 0) {
        console.log('🔍 Finding supplier who priced these products...');
        try {
          // Supabase REST API in.() filter expects comma-separated values WITHOUT quotes for UUIDs
          const productIdsParam = productIds.join(',');
          const pricesResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/supplier_product_prices?product_id=in.(${productIdsParam})&select=supplier_id&limit=1`,
            { headers: restHeaders },
            5000
          );
          
          if (pricesResponse.ok) {
            const prices = await pricesResponse.json();
            if (prices && prices.length > 0) {
              validatedSupplierId = prices[0].supplier_id;
              console.log('📦 Using supplier who priced products:', validatedSupplierId);
              
              // Get supplier name
              try {
                const nameResponse = await fetchWithTimeout(
                  `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${validatedSupplierId}&select=company_name`,
                  { headers: restHeaders },
                  3000
                );
                if (nameResponse.ok) {
                  const nameData = await nameResponse.json();
                  supplierName = nameData?.[0]?.company_name || 'Supplier';
                }
              } catch (e) {
                console.warn('Could not fetch supplier name');
              }
            }
          }
        } catch (e) {
          console.warn('Product prices lookup failed');
        }
      }
      
      // STEP 3: If still no supplier, get first available supplier
      if (!validatedSupplierId) {
        console.log('🔍 Finding any available supplier...');
        try {
          const supplierResponse = await fetchWithTimeout(
            `${SUPABASE_URL}/rest/v1/suppliers?select=id,company_name&limit=1`,
            { headers: restHeaders },
            5000
          );
          
          if (supplierResponse.ok) {
            const suppliers = await supplierResponse.json();
            if (suppliers && suppliers.length > 0) {
              validatedSupplierId = suppliers[0].id;
              supplierName = suppliers[0].company_name;
              console.log('📦 Using first available supplier:', validatedSupplierId, supplierName);
            }
          }
        } catch (e) {
          console.warn('Supplier fetch failed');
        }
      }
      
      if (
        !validatedSupplierId ||
        validatedSupplierId === userId ||
        validatedSupplierId === 'admin-catalog' ||
        validatedSupplierId === 'general'
      ) {
        toast({
          title: 'Choose a supplier first',
          description:
            'Open “Compare Prices Across Suppliers” in your cart, tap Select on the supplier you want, then use Buy Now. That locks your order to the right supplier.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      console.log('✅ Final supplier for order:', validatedSupplierId, supplierName);
      
      // Get selected project details for delivery address
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const deliveryAddress = selectedProject 
        ? `${selectedProject.name} - ${selectedProject.location}${selectedProject.address ? ` (${selectedProject.address})` : ''}`
        : 'To be provided';
      const projectName = selectedProject?.name || 'Direct Purchase - ' + new Date().toLocaleDateString();

      // Create purchase order using native fetch
      const orderPayload: Record<string, any> = {
        po_number: poNumber,
        buyer_id: userId,
        supplier_id: validatedSupplierId,
        total_amount: getTotalPrice(),
        delivery_address: deliveryAddress,
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        project_name: projectName,
        status: 'confirmed',
        delivery_required: false,
        builder_fulfillment_choice: 'pending',
        items: items.map(item => ({
          material_id: catalogMaterialIdFromCartLineId(item.id),
          material_name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price
        }))
      };

      // Link order to project if selected (for tracking spending)
      if (selectedProjectId) {
        orderPayload.project_id = selectedProjectId;
        console.log('📁 Linking order to project:', selectedProjectId, projectName);
      }

      console.log('🛒 Creating purchase order via fetch API...');

      const orderResponse = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/purchase_orders`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(orderPayload)
        },
        15000
      );

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Purchase order creation failed:', orderResponse.status, errorText);
        const errMsg = parseSupabaseError(errorText, orderResponse.status);
        throw new Error(orderResponse.status === 500
          ? `${errMsg} — Run supabase/RUN_THIS_IN_SUPABASE_TO_FIX_500.sql in Supabase SQL Editor if you haven’t.`
          : errMsg);
      }

      const orderDataArray = await orderResponse.json();
      const orderData = Array.isArray(orderDataArray) ? orderDataArray[0] : orderDataArray;
      
      console.log('✅ Purchase order created:', orderData);

      // Success! Store order info for delivery/monitoring prompts (snapshot items before clearing cart)
      const orderTotal = getTotalPrice();
      const orderItemCount = getTotalItems();
      const orderItemsSnapshot = items.map(item => ({
        material_name: item.name,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price
      }));

      setLastOrderId(orderData.id);
      setLastOrderTotal(orderTotal);
      setLastOrderItems(orderItemsSnapshot);
      setLastOrderStatus(orderData.status ?? 'confirmed');
      setLastOrderFulfillmentChoice(orderData.builder_fulfillment_choice ?? 'pending');
      setLastOrderPoNumber(poNumber);

      clearCart();
      setIsCartOpen(false);
      
      toast({
        title: '🎉 Order placed',
        description:
          orderTotal >= 1
            ? `Order #${poNumber} (${orderItemCount} items, KES ${orderTotal.toLocaleString()}). Complete payment in the next step, or skip and arrange delivery.`
            : `Your order #${poNumber} for ${orderItemCount} items (KES ${orderTotal.toLocaleString()}) has been confirmed.`,
        duration: 5000,
      });

      const payAfterPath =
        userRole === 'private_client'
          ? '/private-client-dashboard'
          : userRole === 'professional_builder'
            ? '/professional-builder-dashboard'
            : '/home';
      setPaystackSuccessPath(payAfterPath);

      // Offer Paystack when amount meets hosted-checkout minimum (1 KES); otherwise go straight to delivery prompt.
      if (orderTotal >= 1) {
        setShowPaystackAfterOrder(true);
      } else if (userRole === 'private_client' || userRole === 'professional_builder' || !userRole) {
        setTimeout(() => setShowDeliveryPrompt(true), 500);
      }

    } catch (error: any) {
      console.error('❌ Error placing order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="space-y-2 pb-4 border-b">
          <SheetDescription className="sr-only">View and manage cart items, request quotes or buy now</SheetDescription>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Shopping Cart
              {getTotalItems() > 0 && (
                <Badge className="bg-green-600">{getTotalItems()}</Badge>
              )}
            </SheetTitle>
          </div>
          {items.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCart}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-fit"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-4">
              Browse our materials and add items to your cart
            </p>
            <Button onClick={() => setIsCartOpen(false)} className="bg-green-600 hover:bg-green-700">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {/* Group items by supplier for display */}
                {(() => {
                  const groupedItems: Record<string, CartItem[]> = {};
                  items.forEach(item => {
                    const supplierKey = item.supplier_name || 'UjenziXform Catalog';
                    if (!groupedItems[supplierKey]) {
                      groupedItems[supplierKey] = [];
                    }
                    groupedItems[supplierKey].push(item);
                  });
                  
                  return Object.entries(groupedItems).map(([supplierName, supplierItems]) => (
                    <div key={supplierName} className="space-y-2">
                      {/* Supplier Header */}
                      <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                        <Store className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">{supplierName}</span>
                        <Badge className="bg-blue-600 ml-auto">{supplierItems.length} item(s)</Badge>
                      </div>
                      
                      {/* Items from this supplier */}
                      {supplierItems.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-3 space-y-3 ml-2 border-l-2 border-blue-200">
                          <div className="flex gap-3">
                            {/* Item Image */}
                            <div className="w-14 h-14 bg-white rounded-md overflow-hidden flex-shrink-0 border">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                                {item.name}
                              </h4>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                                {item.category}
                              </Badge>
                              <p className="text-sm font-semibold text-blue-600 mt-1">
                                KES {item.unit_price.toLocaleString()}/{item.unit}
                              </p>
                            </div>
                            
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between bg-white rounded-md p-2">
                      <span className="text-xs text-gray-600">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-center text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-right">
                        KES {(item.unit_price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </ScrollArea>

            <Separator className="my-2" />

            {/* Project Selection for Builders */}
            {(userRole === 'professional_builder' || userRole === 'private_client') && projects.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Link Order to Project
                </div>
                <Select
                  value={selectedProjectId ?? CART_NO_PROJECT_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value === CART_NO_PROJECT_SELECT_VALUE) {
                      setSelectedProjectId(null);
                      clearCartProjectContext();
                      return;
                    }
                    setSelectedProjectId(value);
                    const p = projects.find((x) => x.id === value);
                    setCartProjectContext(value, p?.name ?? null, p?.location ?? null);
                  }}
                >
                  <SelectTrigger className="w-full bg-white border-blue-200">
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CART_NO_PROJECT_SELECT_VALUE}>
                      No project (general purchase)
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-blue-600" />
                          <span>{project.name}</span>
                          <span className="text-xs text-gray-500">({project.location})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProjectId && (
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Materials will be delivered to: {projects.find(p => p.id === selectedProjectId)?.location}
                  </div>
                )}
                <p className="text-[10px] text-blue-500">
                  Linking orders to projects helps track spending and ensures accurate delivery
                </p>
              </div>
            )}

            {/* Cart Summary */}
            <div className="space-y-3 pt-2">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items ({getTotalItems()})</span>
                  <span className="font-medium">KES {getTotalPrice().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className="text-green-600 font-medium">To be quoted</span>
                </div>
                {selectedProjectId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Project
                    </span>
                    <span className="text-blue-600 font-medium truncate max-w-[150px]">
                      {projects.find(p => p.id === selectedProjectId)?.name}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Estimated Total</span>
                  <span className="text-green-600">KES {getTotalPrice().toLocaleString()}</span>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════════════════
                  ACTION BUTTONS - STRICT ROLE ENFORCEMENT
                  - Professional Builder: ONLY Request Quote (no Buy Now)
                  - Private Client: ONLY Buy Now (no Request Quote)
                  - Other roles: Show message to register
                  ═══════════════════════════════════════════════════════════════════════════════ */}
              {(() => {
                const effectiveRole = userRole || localStorage.getItem('user_role');
                
                // PROFESSIONAL BUILDER: Compare & Request Quote (unified)
                if (effectiveRole === 'professional_builder') {
                  return (
                    <>
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-14 flex items-center justify-center gap-3"
                        onClick={() => setShowCompareAll(true)}
                      >
                        <Scale className="h-5 w-5" />
                        <div className="text-left">
                          <span className="text-sm font-semibold">Compare Prices & Request Quotes</span>
                          <p className="text-[10px] opacity-80">Select suppliers to send quote requests</p>
                        </div>
                      </Button>
                      <p className="text-[10px] text-center text-blue-600 font-medium">
                        🏗️ Professional Builder: Compare prices, select suppliers, and request quotes!
                      </p>
                    </>
                  );
                }
                
                // PRIVATE CLIENT: Compare Prices + Buy Now
                if (effectiveRole === 'private_client') {
                  return (
                    <>
                      <Button 
                        variant="outline"
                        className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-10 mb-2"
                        onClick={() => setShowCompareAll(true)}
                      >
                        <Scale className="h-4 w-4 mr-2" />
                        Compare Prices Across Suppliers
                      </Button>
                      <Button 
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-14 flex items-center justify-center gap-3"
                        onClick={handleBuyNow}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold">Processing Order...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            <div className="text-left">
                              <span className="text-sm font-semibold">Buy Now - KES {getTotalPrice().toLocaleString()}</span>
                              <p className="text-[10px] opacity-80">Complete your purchase instantly</p>
                            </div>
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-center text-green-600 font-medium">
                        🏠 Private Client: Compare prices or buy directly!
                      </p>
                    </>
                  );
                }
                
                // ADMIN: Both options
                if (effectiveRole === 'admin') {
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 h-12 flex flex-col items-center justify-center"
                          onClick={() => setShowMultiSupplierQuote(true)}
                        >
                          <FileText className="h-4 w-4 mb-0.5" />
                          <span className="text-xs">Request Quote</span>
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 h-12 flex flex-col items-center justify-center"
                          onClick={handleBuyNow}
                          disabled={isProcessing}
                        >
                          <CreditCard className="h-4 w-4 mb-0.5" />
                          <span className="text-xs">Buy Now</span>
                        </Button>
                      </div>
                      <p className="text-[10px] text-center text-purple-600 font-medium">
                        👑 Admin: Full access to both quote requests and direct purchases
                      </p>
                    </>
                  );
                }
                
                // NOT LOGGED IN OR OTHER ROLES: Show registration message
                return (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                      <p className="text-amber-800 font-medium text-sm">⚠️ Registration Required</p>
                      <p className="text-amber-700 text-xs mt-1">
                        Please register as a <strong>Professional Builder</strong> (for quotes) or <strong>Private Client</strong> (for direct purchase) to continue.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 h-10"
                        onClick={() => window.location.href = '/professional-builder-auth'}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        <span className="text-xs">Register as Pro</span>
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 h-10"
                        onClick={() => window.location.href = '/private-client-auth'}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        <span className="text-xs">Register as Private</span>
                      </Button>
                    </div>
                  </>
                );
              })()}
              
              <p className="text-[10px] text-center text-gray-500">
                💡 Professional Builders request quotes • Private Clients buy directly
              </p>
            </div>
          </>
        )}

        {/* Price Comparison Modal */}
        <CartPriceComparison
          isOpen={showComparison}
          onClose={() => {
            setShowComparison(false);
            setComparisonItem(null);
          }}
          cartItem={comparisonItem}
        />

        {/* Multi-Supplier Quote Dialog (for Professional Builders) */}
        <MultiSupplierQuoteDialog
          isOpen={showMultiSupplierQuote}
          onClose={() => setShowMultiSupplierQuote(false)}
          cartItems={items}
          onQuotesSent={() => {
            clearCart();
            setIsCartOpen(false);
          }}
        />

        {/* Unified Compare & Quote Dialog */}
        <CartPriceComparisonAll
          isOpen={showCompareAll}
          onClose={() => setShowCompareAll(false)}
          onQuotesSent={() => {
            setIsCartOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>

    {/* Delivery Prompt Dialog (for Private Clients after purchase) - OUTSIDE Sheet so it persists */}
    {lastOrderId && (
      <DeliveryPromptDialog
        isOpen={showDeliveryPrompt}
        onOpenChange={(open) => {
          setShowDeliveryPrompt(open);
          // Monitoring prompt is opened only from onDeliveryRequested (when builder submits delivery address) so Site Address can be pre-filled
        }}
        purchaseOrder={{
          id: lastOrderId,
          po_number: lastOrderPoNumber || `PO-${lastOrderId.slice(0, 8)}`,
          supplier_id: '',
          total_amount: lastOrderTotal,
          delivery_address: 'To be provided',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: lastOrderItems,
          project_name: 'Direct Purchase',
          status: lastOrderStatus ?? undefined,
          builder_fulfillment_choice: lastOrderFulfillmentChoice ?? undefined,
        }}
        onDeliveryRequested={(opts) => {
          if (opts?.deliveryAddress) setLastDeliveryAddress(opts.deliveryAddress);
          setShowDeliveryPrompt(false);
          // Open monitoring prompt after a short delay so Site Address can be pre-filled from delivery address
          if (opts?.deliveryAddress?.trim()) {
            setTimeout(() => setShowMonitoringPrompt(true), 300);
          }
          toast({
            title: '🚚 Delivery Requested!',
            description: 'A delivery provider will be assigned to your order soon.',
          });
        }}
        onDeclined={() => {
          setShowDeliveryPrompt(false);
        }}
      />
    )}

    {/* Monitoring Service Prompt (after delivery decision) - OUTSIDE Sheet so it persists */}
    <MonitoringServicePrompt
      isOpen={showMonitoringPrompt}
      onOpenChange={(open) => {
        setShowMonitoringPrompt(open);
        if (!open) {
          setLastOrderId(null);
          setLastOrderTotal(0);
          setLastOrderItems([]);
          setLastOrderStatus(null);
          setLastOrderFulfillmentChoice(null);
          setLastOrderPoNumber('');
          setLastDeliveryAddress('');
        }
      }}
      purchaseOrder={lastOrderId ? {
        id: lastOrderId,
        po_number: lastOrderPoNumber || `PO-${lastOrderId.slice(0, 8)}`,
        total_amount: lastOrderTotal,
        project_name: 'Direct Purchase',
        delivery_address: lastDeliveryAddress || undefined
      } : undefined}
      onServiceRequested={() => {
        setShowMonitoringPrompt(false);
        setLastOrderId(null);
        setLastOrderTotal(0);
        setLastOrderItems([]);
        setLastOrderStatus(null);
        setLastOrderFulfillmentChoice(null);
        setLastOrderPoNumber('');
        setLastDeliveryAddress('');
      }}
      onDeclined={() => {
        setShowMonitoringPrompt(false);
        setLastOrderId(null);
        setLastOrderTotal(0);
        setLastOrderItems([]);
        setLastOrderStatus(null);
        setLastOrderFulfillmentChoice(null);
        setLastOrderPoNumber('');
        setLastDeliveryAddress('');
      }}
    />

        {/* Paystack after Buy Now (order already created; payment is optional from buyer perspective until you enforce it) */}
    <Dialog
      open={showPaystackAfterOrder}
      onOpenChange={(open) => {
        if (!open) {
          setShowPaystackAfterOrder(false);
          if (userRole === 'private_client' || userRole === 'professional_builder' || !userRole) {
            setTimeout(() => setShowDeliveryPrompt(true), 300);
          }
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay for your order</DialogTitle>
          <DialogDescription>
            Pay securely with Paystack (card, M-Pesa, etc.). You can close this window to skip payment for now; your order
            is already recorded.
          </DialogDescription>
        </DialogHeader>
        {lastOrderId && lastOrderTotal >= 1 ? (
          <PaymentGateway
            amount={lastOrderTotal}
            currency="KES"
            description={`Order ${lastOrderPoNumber || lastOrderId.slice(0, 8)} — ${lastOrderItems.length} line(s)`}
            orderId={lastOrderId}
            successNavigateTo={paystackSuccessPath}
            onSuccess={() => {}}
            onCancel={() => {
              setShowPaystackAfterOrder(false);
              if (userRole === 'private_client' || userRole === 'professional_builder' || !userRole) {
                setTimeout(() => setShowDeliveryPrompt(true), 300);
              }
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>

    </>
  );
};

