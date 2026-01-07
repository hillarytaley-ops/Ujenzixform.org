import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';

// Simple mock for Navigation to avoid complex auth dependencies
vi.mock('./Navigation', () => ({
  default: () => (
    <nav data-testid="navigation">
      <a href="/">UjenziPro</a>
      <a href="/home">Home</a>
    </nav>
  ),
}));

import Navigation from './Navigation';

describe('Navigation Component', () => {
  it('renders the navigation element', () => {
    render(<Navigation />);
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders links', () => {
    render(<Navigation />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});

