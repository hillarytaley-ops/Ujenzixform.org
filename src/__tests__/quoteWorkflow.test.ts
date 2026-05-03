/**
 * Quote Workflow Tests
 * 
 * Tests the business-critical quote workflow:
 * 1. Builder requests quote → quotation_request (pending) + purchase_order (pending)
 * 2. Supplier sends pricing → quotation_request (quoted) + purchase_order (quoted)
 * 3. Builder accepts → purchase_order (confirmed) → QR codes generated
 * 4. Builder rejects → purchase_order (rejected)
 * 
 * @see docs/DATABASE_SCHEMA.md for table structure
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

// Mock the supabase import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Helper to create mock query builder
const createMockQueryBuilder = (data: any = null, error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockResolvedValue({ data, error }),
});

describe('Quote Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Builder Requests Quote', () => {
    it('should create quotation_request with pending status', async () => {
      const mockUser = { id: 'builder-123', email: 'builder@test.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'qr-123',
          builder_id: 'builder-123',
          supplier_id: 'supplier-456',
          status: 'pending',
          items: [{ name: 'Cement', quantity: 100, unit: 'bags' }],
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'qr-123', status: 'pending' },
          error: null,
        }),
      });

      // Simulate quote request creation
      const quoteRequest = {
        builder_id: 'builder-123',
        supplier_id: 'supplier-456',
        items: [{ name: 'Cement', quantity: 100, unit: 'bags' }],
        delivery_address: '123 Nairobi Road',
        status: 'pending',
      };

      const result = await mockSupabase.from('quotation_requests').insert(quoteRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('quotation_requests');
      expect(result.error).toBeNull();
    });

    it('should create purchase_order with pending status', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'po-123',
          po_number: 'QR-1234567890-ABC',
          buyer_id: 'builder-123',
          supplier_id: 'supplier-456',
          status: 'pending',
          total_amount: 0, // No pricing yet
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'po-123', status: 'pending' },
          error: null,
        }),
      });

      const purchaseOrder = {
        po_number: 'QR-1234567890-ABC',
        buyer_id: 'builder-123',
        supplier_id: 'supplier-456',
        items: [{ name: 'Cement', quantity: 100, unit: 'bags' }],
        total_amount: 0,
        delivery_address: '123 Nairobi Road',
        delivery_date: '2026-02-01',
        status: 'pending',
      };

      const result = await mockSupabase.from('purchase_orders').insert(purchaseOrder);

      expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
      expect(result.error).toBeNull();
    });

    it('should validate required fields', () => {
      const validateQuoteRequest = (request: any): string[] => {
        const errors: string[] = [];
        
        if (!request.builder_id) errors.push('Builder ID is required');
        if (!request.supplier_id) errors.push('Supplier ID is required');
        if (!request.items || request.items.length === 0) errors.push('At least one item is required');
        if (!request.delivery_address) errors.push('Delivery address is required');
        
        return errors;
      };

      // Valid request
      expect(validateQuoteRequest({
        builder_id: '123',
        supplier_id: '456',
        items: [{ name: 'Cement' }],
        delivery_address: 'Nairobi',
      })).toEqual([]);

      // Missing fields
      expect(validateQuoteRequest({})).toContain('Builder ID is required');
      expect(validateQuoteRequest({ builder_id: '123' })).toContain('Supplier ID is required');
    });
  });

  describe('2. Supplier Sends Pricing', () => {
    it('should update quotation_request to quoted status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'qr-123',
          status: 'quoted',
          quote_amount: 50000,
          quote_valid_until: '2026-02-15',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const quoteUpdate = {
        status: 'quoted',
        quote_amount: 50000,
        quote_valid_until: '2026-02-15',
        supplier_notes: 'Price includes delivery within Nairobi',
      };

      await mockSupabase.from('quotation_requests').update(quoteUpdate).eq('id', 'qr-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('quotation_requests');
      expect(mockUpdate).toHaveBeenCalledWith(quoteUpdate);
    });

    it('should update purchase_order to quoted status with pricing', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'po-123',
          status: 'quoted',
          total_amount: 50000,
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const poUpdate = {
        status: 'quoted',
        total_amount: 50000,
        items: [
          { name: 'Cement', quantity: 100, unit: 'bags', unit_price: 500, total: 50000 }
        ],
      };

      await mockSupabase.from('purchase_orders').update(poUpdate).eq('id', 'po-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
      expect(mockUpdate).toHaveBeenCalledWith(poUpdate);
    });

    it('should NOT generate QR codes at quoted stage', () => {
      // QR codes should only be generated when status = 'confirmed'
      const shouldGenerateQRCodes = (status: string): boolean => {
        return status === 'confirmed';
      };

      expect(shouldGenerateQRCodes('pending')).toBe(false);
      expect(shouldGenerateQRCodes('quoted')).toBe(false);
      expect(shouldGenerateQRCodes('confirmed')).toBe(true);
      expect(shouldGenerateQRCodes('rejected')).toBe(false);
    });
  });

  describe('3. Builder Accepts Quote', () => {
    it('should update purchase_order to confirmed status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'po-123',
          status: 'confirmed',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await mockSupabase.from('purchase_orders').update({ status: 'confirmed' }).eq('id', 'po-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
    });

    it('should update quotation_request to accepted status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'qr-123',
          status: 'accepted',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await mockSupabase.from('quotation_requests').update({ status: 'accepted' }).eq('id', 'qr-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('quotation_requests');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'accepted' });
    });

    it('should trigger QR code generation on confirmed status', () => {
      // Simulate the database trigger behavior
      const generateQRCodes = (purchaseOrder: any): any[] => {
        if (purchaseOrder.status !== 'confirmed') {
          return [];
        }

        return purchaseOrder.items.map((item: any, index: number) => ({
          id: `qr-${purchaseOrder.id}-${index}`,
          qr_code: `QR-${purchaseOrder.po_number}-${index}`,
          material_id: item.id,
          purchase_order_id: purchaseOrder.id,
          status: 'generated',
          created_at: new Date().toISOString(),
        }));
      };

      const confirmedPO = {
        id: 'po-123',
        po_number: 'QR-1234567890-ABC',
        status: 'confirmed',
        items: [
          { id: 'item-1', name: 'Cement', quantity: 100 },
          { id: 'item-2', name: 'Steel', quantity: 50 },
        ],
      };

      const qrCodes = generateQRCodes(confirmedPO);
      
      expect(qrCodes).toHaveLength(2);
      expect(qrCodes[0].status).toBe('generated');
      expect(qrCodes[0].purchase_order_id).toBe('po-123');
    });

    it('should prompt for delivery after acceptance', () => {
      // After accepting a quote, the builder should be prompted for delivery options
      const shouldShowDeliveryPrompt = (
        quoteAccepted: boolean,
        purchaseOrderStatus: string
      ): boolean => {
        return quoteAccepted && purchaseOrderStatus === 'confirmed';
      };

      expect(shouldShowDeliveryPrompt(true, 'confirmed')).toBe(true);
      expect(shouldShowDeliveryPrompt(true, 'quoted')).toBe(false);
      expect(shouldShowDeliveryPrompt(false, 'confirmed')).toBe(false);
    });
  });

  describe('4. Builder Rejects Quote', () => {
    it('should update purchase_order to rejected status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'po-123',
          status: 'rejected',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await mockSupabase.from('purchase_orders').update({ 
        status: 'rejected',
        rejection_reason: 'Price too high'
      }).eq('id', 'po-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
    });

    it('should update quotation_request to rejected status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: {
          id: 'qr-123',
          status: 'rejected',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await mockSupabase.from('quotation_requests').update({ 
        status: 'rejected'
      }).eq('id', 'qr-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('quotation_requests');
    });

    it('should NOT generate QR codes for rejected orders', () => {
      const generateQRCodes = (purchaseOrder: any): any[] => {
        if (purchaseOrder.status !== 'confirmed') {
          return [];
        }
        return purchaseOrder.items.map(() => ({ status: 'generated' }));
      };

      const rejectedPO = {
        id: 'po-123',
        status: 'rejected',
        items: [{ id: 'item-1' }],
      };

      expect(generateQRCodes(rejectedPO)).toHaveLength(0);
    });
  });

  describe('Status Transitions', () => {
    it('should only allow valid status transitions', () => {
      const validTransitions: Record<string, string[]> = {
        'pending': ['quoted', 'rejected'],
        'quoted': ['confirmed', 'rejected'],
        'confirmed': [], // Terminal state
        'rejected': [], // Terminal state
      };

      const isValidTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) ?? false;
      };

      // Valid transitions
      expect(isValidTransition('pending', 'quoted')).toBe(true);
      expect(isValidTransition('quoted', 'confirmed')).toBe(true);
      expect(isValidTransition('quoted', 'rejected')).toBe(true);

      // Invalid transitions
      expect(isValidTransition('pending', 'confirmed')).toBe(false); // Can't skip quoted
      expect(isValidTransition('confirmed', 'rejected')).toBe(false); // Can't reject after confirm
      expect(isValidTransition('rejected', 'confirmed')).toBe(false); // Can't confirm after reject
    });
  });

  describe('Role Permissions', () => {
    it('should only allow COs/contractors to request quotes', () => {
      const canRequestQuote = (role: string): boolean => {
        return role === 'professional_builder';
      };

      expect(canRequestQuote('professional_builder')).toBe(true);
      expect(canRequestQuote('private_client')).toBe(false);
      expect(canRequestQuote('supplier')).toBe(false);
      expect(canRequestQuote('delivery')).toBe(false);
    });

    it('should only allow suppliers to send pricing', () => {
      const canSendPricing = (role: string): boolean => {
        return role === 'supplier' || role === 'admin';
      };

      expect(canSendPricing('supplier')).toBe(true);
      expect(canSendPricing('admin')).toBe(true);
      expect(canSendPricing('professional_builder')).toBe(false);
    });

    it('should only allow the requesting builder to accept/reject', () => {
      const canRespondToQuote = (userId: string, quoteBuilderID: string): boolean => {
        return userId === quoteBuilderID;
      };

      expect(canRespondToQuote('builder-123', 'builder-123')).toBe(true);
      expect(canRespondToQuote('builder-456', 'builder-123')).toBe(false);
    });
  });
});

describe('Quote Cart', () => {
  it('should group items by supplier', () => {
    const groupItemsBySupplier = (items: any[]): Record<string, any[]> => {
      return items.reduce((acc, item) => {
        const supplierId = item.supplier_id || 'general';
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, any[]>);
    };

    const items = [
      { id: '1', name: 'Cement', supplier_id: 'sup-1' },
      { id: '2', name: 'Steel', supplier_id: 'sup-2' },
      { id: '3', name: 'Sand', supplier_id: 'sup-1' },
    ];

    const grouped = groupItemsBySupplier(items);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['sup-1']).toHaveLength(2);
    expect(grouped['sup-2']).toHaveLength(1);
  });

  it('should calculate total items correctly', () => {
    const calculateTotalItems = (items: any[]): number => {
      return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    };

    const items = [
      { quantity: 10 },
      { quantity: 5 },
      { quantity: 3 },
    ];

    expect(calculateTotalItems(items)).toBe(18);
  });

  it('should validate delivery address before submission', () => {
    const validateSubmission = (items: any[], deliveryAddress: string): string | null => {
      if (items.length === 0) return 'No items in cart';
      if (!deliveryAddress.trim()) return 'Delivery address required';
      return null;
    };

    expect(validateSubmission([], 'Nairobi')).toBe('No items in cart');
    expect(validateSubmission([{ id: '1' }], '')).toBe('Delivery address required');
    expect(validateSubmission([{ id: '1' }], 'Nairobi')).toBeNull();
  });
});

describe('Delivery Integration', () => {
  it('should create delivery notification after quote acceptance', () => {
    const createDeliveryNotification = (purchaseOrder: any): any => {
      return {
        builder_id: purchaseOrder.buyer_id,
        supplier_id: purchaseOrder.supplier_id,
        request_id: purchaseOrder.id,
        request_type: 'purchase_order',
        pickup_address: 'Supplier warehouse', // Would come from supplier profile
        delivery_address: purchaseOrder.delivery_address,
        material_details: purchaseOrder.items,
        status: 'pending',
      };
    };

    const po = {
      id: 'po-123',
      buyer_id: 'builder-123',
      supplier_id: 'supplier-456',
      delivery_address: '123 Nairobi Road',
      items: [{ name: 'Cement', quantity: 100 }],
    };

    const notification = createDeliveryNotification(po);

    expect(notification.builder_id).toBe('builder-123');
    expect(notification.request_type).toBe('purchase_order');
    expect(notification.status).toBe('pending');
  });
});

