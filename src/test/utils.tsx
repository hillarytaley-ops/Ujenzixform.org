import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

// Create a custom render function that includes providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface WrapperProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: WrapperProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock Supabase responses
export const createMockSupabaseResponse = <T,>(data: T, error: null | Error = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Error' : 'OK',
});

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'professional_builder',
};

// Mock material item data
export const mockMaterialItems = [
  {
    id: '1',
    qr_code: 'UJP-CEMENT-001',
    material_type: 'Portland Cement 50kg',
    category: 'cement',
    quantity: 100,
    unit: 'bags',
    status: 'pending',
    item_sequence: 1,
    purchase_order_id: 'po-1',
    supplier_id: 'supplier-1',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    qr_code: 'UJP-STEEL-002',
    material_type: 'Steel Bars 12mm',
    category: 'steel',
    quantity: 50,
    unit: 'pieces',
    status: 'dispatched',
    item_sequence: 2,
    purchase_order_id: 'po-1',
    supplier_id: 'supplier-1',
    created_at: new Date().toISOString(),
  },
];

// Mock purchase order data
export const mockPurchaseOrders = [
  {
    id: 'po-1',
    po_number: 'PO-20260119-001',
    buyer_id: 'test-user-id',
    supplier_id: 'supplier-1',
    total_amount: 125000,
    delivery_address: 'Nairobi, Kenya',
    delivery_date: new Date().toISOString(),
    status: 'confirmed',
    items: [
      { name: 'Portland Cement 50kg', quantity: 100, unit: 'bags', unit_price: 750 },
      { name: 'Steel Bars 12mm', quantity: 50, unit: 'pieces', unit_price: 1000 },
    ],
    created_at: new Date().toISOString(),
    suppliers: {
      company_name: 'Test Supplier Co.',
    },
  },
];

// Mock scan events
export const mockScanEvents = [
  {
    id: 'scan-1',
    material_item_id: '1',
    event_type: 'dispatched',
    scanned_by: 'supplier-1',
    location: 'Nairobi Warehouse',
    created_at: new Date().toISOString(),
  },
];

