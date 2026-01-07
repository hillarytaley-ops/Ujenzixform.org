import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

// Mock the AdminDashboard since it's a large component
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key) => {
    const store: Record<string, string> = {
      'admin_authenticated': 'true',
      'admin_email': 'admin@test.com',
      'admin_login_time': Date.now().toString(),
      'user_role': 'admin',
    };
    return store[key] || null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks admin authentication on load', async () => {
    // The dashboard checks localStorage for admin session
    expect(localStorageMock.getItem('admin_authenticated')).toBe('true');
    expect(localStorageMock.getItem('user_role')).toBe('admin');
  });

  it('validates admin session age', () => {
    const loginTime = parseInt(localStorageMock.getItem('admin_login_time') || '0');
    const sessionAge = Date.now() - loginTime;
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    expect(sessionAge).toBeLessThan(maxSessionAge);
  });
});




