/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 ORDER SERVICE - Complete Order Management System                               ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Create orders from cart items                                           │   ║
 * ║   │  ✅ Order status management (pending → confirmed → shipped → delivered)     │   ║
 * ║   │  ✅ Quote request handling                                                   │   ║
 * ║   │  ✅ Direct purchase processing                                               │   ║
 * ║   │  ✅ Order tracking and history                                               │   ║
 * ║   │  ✅ Integration with delivery providers                                      │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '@/integrations/supabase/client';

// Order types
export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  supplier_name?: string;
  image_url?: string;
}

export interface Order {
  id?: string;
  order_number?: string;
  builder_id: string;
  builder_name?: string;
  builder_email?: string;
  builder_phone?: string;
  order_type: 'quote_request' | 'direct_purchase';
  status: 'pending' | 'quoted' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  delivery_fee?: number;
  total_amount: number;
  delivery_address?: string;
  delivery_notes?: string;
  delivery_provider_id?: string;
  payment_method?: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_reference?: string;
  created_at?: string;
  updated_at?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
}

export interface QuoteResponse {
  order_id: string;
  supplier_id: string;
  supplier_name: string;
  quoted_items: {
    item_id: string;
    quoted_price: number;
    availability: 'in_stock' | 'out_of_stock' | 'limited';
    delivery_days: number;
  }[];
  total_quoted: number;
  valid_until: string;
  notes?: string;
}

// Generate unique order number
const generateOrderNumber = (): string => {
  const prefix = 'MRP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export class OrderService {
  /**
   * Create a new order from cart items
   */
  static async createOrder(
    builderId: string,
    items: OrderItem[],
    orderType: 'quote_request' | 'direct_purchase',
    deliveryInfo?: {
      address: string;
      notes?: string;
      preferredDate?: string;
    }
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      // Get builder info
      const { data: builderData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', builderId)
        .single();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const deliveryFee = deliveryInfo?.address ? 500 : 0; // Base delivery fee
      const totalAmount = subtotal + deliveryFee;

      const orderNumber = generateOrderNumber();

      // Create order in database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          builder_id: builderId,
          builder_name: builderData?.full_name || 'Unknown',
          builder_email: builderData?.email,
          builder_phone: builderData?.phone,
          order_type: orderType,
          status: orderType === 'quote_request' ? 'pending' : 'confirmed',
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          delivery_address: deliveryInfo?.address,
          delivery_notes: deliveryInfo?.notes,
          payment_status: 'pending',
          created_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        // Fallback: create order in purchase_orders table
        const { data: fallbackOrder, error: fallbackError } = await supabase
          .from('purchase_orders')
          .insert({
            builder_id: builderId,
            project_name: `${orderType === 'quote_request' ? 'Quote Request' : 'Direct Purchase'} - ${orderNumber}`,
            status: orderType === 'quote_request' ? 'pending' : 'confirmed',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (fallbackError) throw fallbackError;

        // Insert order items
        const orderItems = items.map(item => ({
          order_id: fallbackOrder.id,
          material_name: item.product_name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          notes: `Unit price: KES ${item.unit_price}, Total: KES ${item.total_price}`
        }));

        await supabase.from('order_items').insert(orderItems);

        return {
          success: true,
          order: {
            id: fallbackOrder.id,
            order_number: orderNumber,
            builder_id: builderId,
            order_type: orderType,
            status: orderType === 'quote_request' ? 'pending' : 'confirmed',
            items,
            subtotal,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            created_at: fallbackOrder.created_at
          }
        };
      }

      // Insert order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name
      }));

      await supabase.from('order_items').insert(orderItems as any);

      const order: Order = {
        ...orderData,
        items,
        order_type: orderType,
        status: orderType === 'quote_request' ? 'pending' : 'confirmed'
      };

      return { success: true, order };
    } catch (error: any) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get orders for a builder
   */
  static async getBuilderOrders(builderId: string): Promise<Order[]> {
    try {
      // Try orders table first
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      if (!error && orders) {
        return orders as any;
      }

      // Fallback to purchase_orders
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('*, order_items(*)')
        .eq('builder_id', builderId)
        .order('created_at', { ascending: false });

      return (purchaseOrders || []).map((po: any) => ({
        id: po.id,
        order_number: `MRP-${po.id.substring(0, 8).toUpperCase()}`,
        builder_id: po.builder_id,
        order_type: po.project_name?.includes('Quote') ? 'quote_request' : 'direct_purchase',
        status: po.status,
        items: po.order_items || [],
        subtotal: 0,
        total_amount: 0,
        created_at: po.created_at
      })) as Order[];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  /**
   * Get orders for a supplier
   */
  static async getSupplierOrders(supplierId: string): Promise<Order[]> {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items!inner(*)')
        .eq('order_items.supplier_id', supplierId)
        .order('created_at', { ascending: false });

      return (orders || []) as any;
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      return [];
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      if (error) {
        // Try purchase_orders
        await supabase
          .from('purchase_orders')
          .update({ status })
          .eq('id', orderId);
      }

      // Log status change
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status,
        notes,
        created_at: new Date().toISOString()
      } as any);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit quote response from supplier
   */
  static async submitQuoteResponse(
    quoteResponse: QuoteResponse
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('quote_responses')
        .insert({
          order_id: quoteResponse.order_id,
          supplier_id: quoteResponse.supplier_id,
          supplier_name: quoteResponse.supplier_name,
          quoted_items: quoteResponse.quoted_items,
          total_quoted: quoteResponse.total_quoted,
          valid_until: quoteResponse.valid_until,
          notes: quoteResponse.notes,
          created_at: new Date().toISOString()
        } as any);

      if (error) throw error;

      // Update order status
      await this.updateOrderStatus(quoteResponse.order_id, 'quoted');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a quote and convert to order
   */
  static async acceptQuote(
    orderId: string,
    quoteResponseId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update quote response status
      await supabase
        .from('quote_responses')
        .update({ accepted: true } as any)
        .eq('id', quoteResponseId);

      // Update order status
      await this.updateOrderStatus(orderId, 'confirmed');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign delivery provider to order
   */
  static async assignDeliveryProvider(
    orderId: string,
    providerId: string,
    estimatedDelivery: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_provider_id: providerId,
          estimated_delivery: estimatedDelivery,
          status: 'shipped',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      if (error) throw error;

      // Create delivery assignment
      await supabase.from('delivery_assignments').insert({
        order_id: orderId,
        provider_id: providerId,
        status: 'assigned',
        estimated_delivery: estimatedDelivery,
        created_at: new Date().toISOString()
      } as any);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark order as delivered
   */
  static async markDelivered(
    orderId: string,
    deliveryNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          actual_delivery: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      await this.updateOrderStatus(orderId, 'delivered', deliveryNotes);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel order
   */
  static async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      await this.updateOrderStatus(orderId, 'cancelled', reason);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment for order
   */
  static async processPayment(
    orderId: string,
    paymentMethod: string,
    paymentReference: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('orders')
        .update({
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      // Log payment
      await supabase.from('payments').insert({
        order_id: orderId,
        amount,
        method: paymentMethod,
        reference: paymentReference,
        status: 'completed',
        created_at: new Date().toISOString()
      } as any);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export default OrderService;








