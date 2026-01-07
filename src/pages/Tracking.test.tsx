import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import Tracking from './Tracking';

// Mock components
vi.mock('@/components/DeliveryManagement', () => ({
  default: () => <div data-testid="delivery-management">Delivery Management</div>,
}));

vi.mock('@/components/DroneMonitor', () => ({
  default: () => <div data-testid="drone-monitor">Drone Monitor</div>,
}));

vi.mock('@/components/SiteMaterialRegister', () => ({
  default: () => <div data-testid="material-register">Material Register</div>,
}));

describe('Tracking Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the tracking page', () => {
    render(<Tracking />);
    expect(screen.getByText(/track/i)).toBeInTheDocument();
  });

  it('displays the hero section', () => {
    render(<Tracking />);
    expect(screen.getByText(/deliveries/i)).toBeInTheDocument();
  });

  it('shows delivery tracking tab by default', () => {
    render(<Tracking />);
    expect(screen.getByText(/delivery tracking/i)).toBeInTheDocument();
  });

  it('renders security notice', () => {
    render(<Tracking />);
    expect(screen.getByText(/secure monitoring/i)).toBeInTheDocument();
  });
});




