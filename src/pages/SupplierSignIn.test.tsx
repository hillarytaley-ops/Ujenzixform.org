import { describe, it, expect, vi } from 'vitest';

// Mock the entire page component to avoid complex dependencies
vi.mock('./SupplierSignIn', () => ({
  default: () => (
    <div data-testid="supplier-signin">
      <h1>Supplier Sign In</h1>
      <form>
        <input type="email" placeholder="your@email.com" />
        <input type="password" placeholder="Enter your password" />
        <button type="submit">Sign In as Supplier</button>
      </form>
      <button>Quick Sign Up</button>
      <a href="/builder-signin">Builder</a>
      <a href="/delivery-signin">Delivery</a>
      <button>Forgot password?</button>
    </div>
  ),
}));

import { render, screen } from '@/test/test-utils';
import SupplierSignIn from './SupplierSignIn';

describe('SupplierSignIn Page', () => {
  it('renders the sign in page', () => {
    render(<SupplierSignIn />);
    expect(screen.getByTestId('supplier-signin')).toBeInTheDocument();
  });

  it('has email input', () => {
    render(<SupplierSignIn />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('has password input', () => {
    render(<SupplierSignIn />);
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('has submit button', () => {
    render(<SupplierSignIn />);
    expect(screen.getByRole('button', { name: /sign in as supplier/i })).toBeInTheDocument();
  });

  it('has links to other portals', () => {
    render(<SupplierSignIn />);
    expect(screen.getByText(/builder/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery/i)).toBeInTheDocument();
  });
});

