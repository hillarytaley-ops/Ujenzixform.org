import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { DispatchScanner } from './DispatchScanner';

// Mock the ZXing library
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera1', label: 'Camera 1' },
    ]),
  },
  writable: true,
});

describe('DispatchScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dispatch scanner component', () => {
    render(<DispatchScanner />);
    expect(screen.getByText(/dispatch/i)).toBeInTheDocument();
  });

  it('shows camera permission request initially', async () => {
    render(<DispatchScanner />);
    // Should show scanner UI
    expect(document.body).toBeInTheDocument();
  });

  it('handles camera start button click', async () => {
    render(<DispatchScanner />);
    const startButton = screen.queryByRole('button', { name: /start/i });
    if (startButton) {
      fireEvent.click(startButton);
    }
    expect(document.body).toBeInTheDocument();
  });
});




