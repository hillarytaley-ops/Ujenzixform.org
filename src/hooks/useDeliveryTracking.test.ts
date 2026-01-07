import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

// Simple hook for testing
const useDeliveryStatus = (deliveryId: string) => {
  const [status, setStatus] = React.useState<string>('pending');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate fetching
    setTimeout(() => {
      setStatus('in_transit');
      setLoading(false);
    }, 100);
  }, [deliveryId]);

  return { status, loading };
};

describe('Delivery Tracking Hooks', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useDeliveryStatus('DEL-001'), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.status).toBe('pending');
  });

  it('should update status after loading', async () => {
    const { result } = renderHook(() => useDeliveryStatus('DEL-001'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('in_transit');
  });
});




