import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Camera, Search } from 'lucide-react';
import { EmptyState, ErrorState, NoResultsState } from '@/pages/admin/components/EmptyState';

describe('EmptyState', () => {
  it('renders icon, title and description', () => {
    render(
      <EmptyState
        icon={Camera}
        title="No Cameras"
        description="Add your first camera to get started"
      />
    );

    expect(screen.getByText('No Cameras')).toBeInTheDocument();
    expect(screen.getByText('Add your first camera to get started')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon={Camera}
        title="No Cameras"
        description="Add your first camera"
        action={{
          label: 'Add Camera',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /add camera/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action when provided', () => {
    const handleSecondary = vi.fn();
    render(
      <EmptyState
        icon={Camera}
        title="No Cameras"
        description="Add your first camera"
        secondaryAction={{
          label: 'Refresh',
          onClick: handleSecondary,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(button);
    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('renders default error message', () => {
    render(<ErrorState />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data. Please try again.')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(
      <ErrorState
        title="Connection Failed"
        description="Unable to connect to the server"
      />
    );

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe('NoResultsState', () => {
  it('renders no results message', () => {
    render(<NoResultsState />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('shows search term in message when provided', () => {
    render(<NoResultsState searchTerm="test query" />);

    expect(screen.getByText(/No items match "test query"/)).toBeInTheDocument();
  });

  it('renders clear filters button when onClear is provided', () => {
    const handleClear = vi.fn();
    render(<NoResultsState onClear={handleClear} />);

    const button = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(button);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});


