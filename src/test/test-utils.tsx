import React, { ReactElement, createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Mock Auth Context for testing
interface MockAuthContextType {
  user: any;
  session: any;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType>({
  user: null,
  session: null,
  loading: false,
  userRole: null,
  signOut: async () => {},
  refreshSession: async () => {},
  refreshUserRole: async () => {},
});

// Mock AuthProvider for tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const value: MockAuthContextType = {
    user: null,
    session: null,
    loading: false,
    userRole: null,
    signOut: async () => {},
    refreshSession: async () => {},
    refreshUserRole: async () => {},
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};

interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>
        <BrowserRouter>
          {children}
          <Toaster />
        </BrowserRouter>
      </MockAuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to create mock user
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { role: 'supplier' },
  ...overrides,
});

// Helper to create mock session
export const createMockSession = (user = createMockUser()) => ({
  user,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
});

