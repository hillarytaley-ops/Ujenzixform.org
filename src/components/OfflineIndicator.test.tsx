import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineIndicator, useOnlineStatus, useOfflineStorage } from './OfflineIndicator';
import { renderHook, act } from '@testing-library/react';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('OfflineIndicator', () => {
  let originalNavigator: typeof navigator;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = window.navigator;
    
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when online and no banner', () => {
    const { container } = render(<OfflineIndicator />);
    
    // Should not show the floating indicator when online
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('should show offline indicator when offline', () => {
    // Set offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    render(<OfflineIndicator />);
    
    // Should show the offline indicator
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show banner when going offline', async () => {
    render(<OfflineIndicator />);
    
    // Simulate going offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    // Dispatch offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    await waitFor(() => {
      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    });
  });

  it('should show success banner when coming back online', async () => {
    // Start offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    render(<OfflineIndicator />);
    
    // Simulate going online
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    
    // Dispatch online event
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Back online/i)).toBeInTheDocument();
    });
  });

  it('should dismiss banner when close button is clicked', async () => {
    // Start offline to show banner
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    render(<OfflineIndicator />);
    
    // Find and click dismiss button
    const dismissButton = screen.getByText('✕');
    fireEvent.click(dismissButton);
    
    // Banner should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
    });
  });
});

describe('useOnlineStatus', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('should return true when online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(false);
  });

  it('should update when network status changes', async () => {
    const { result } = renderHook(() => useOnlineStatus());
    
    expect(result.current).toBe(true);
    
    // Simulate going offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useOfflineStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', async () => {
    const { result } = renderHook(() => useOfflineStorage());
    
    await act(async () => {
      await result.current.saveForOffline('testKey', { foo: 'bar' });
    });
    
    const stored = localStorage.getItem('offline_testKey');
    expect(stored).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('should retrieve data from localStorage', async () => {
    localStorage.setItem('offline_testKey', JSON.stringify({ foo: 'bar' }));
    
    const { result } = renderHook(() => useOfflineStorage());
    
    let data: any;
    await act(async () => {
      data = await result.current.getOfflineData('testKey');
    });
    
    expect(data).toEqual({ foo: 'bar' });
  });

  it('should clear data from localStorage', () => {
    localStorage.setItem('offline_testKey', JSON.stringify({ foo: 'bar' }));
    
    const { result } = renderHook(() => useOfflineStorage());
    
    act(() => {
      result.current.clearOfflineData('testKey');
    });
    
    expect(localStorage.getItem('offline_testKey')).toBeNull();
  });

  it('should return null for non-existent key', async () => {
    const { result } = renderHook(() => useOfflineStorage());
    
    let data: any;
    await act(async () => {
      data = await result.current.getOfflineData('nonExistent');
    });
    
    expect(data).toBeNull();
  });
});

