import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { EnhancedErrorBoundary, AsyncBoundary } from './enhanced-error-boundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws a network error
const ThrowNetworkError = () => {
  throw new Error('Failed to fetch data from network');
};

// Component that throws an auth error
const ThrowAuthError = () => {
  throw new Error('Unauthorized: JWT token expired');
};

describe('EnhancedErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <EnhancedErrorBoundary>
        <div>Test content</div>
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child throws an error', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('shows network error message for network errors', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowNetworkError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
  });

  it('shows auth error message for authentication errors', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowAuthError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/session may have expired/)).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <EnhancedErrorBoundary onError={onError}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('renders custom fallback when provided', () => {
    render(
      <EnhancedErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });

  it('has Try Again button for recoverable errors', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('has navigation buttons', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
  });

  it('shows technical details when expanded', () => {
    render(
      <EnhancedErrorBoundary showDetails={true}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    // Find and click the details summary
    const details = screen.getByText('Technical Details');
    fireEvent.click(details);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});

describe('AsyncBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <AsyncBoundary>
        <div>Async content</div>
      </AsyncBoundary>
    );

    expect(screen.getByText('Async content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    render(
      <AsyncBoundary errorFallback={<div>Async error</div>}>
        <ThrowError />
      </AsyncBoundary>
    );

    expect(screen.getByText('Async error')).toBeInTheDocument();
  });
});

