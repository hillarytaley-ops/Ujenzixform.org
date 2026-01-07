import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog, useConfirmDialog } from '@/pages/admin/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
  };

  it('renders when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});

describe('useConfirmDialog', () => {
  // Component to test the hook
  const TestComponent = () => {
    const { openDialog, DialogComponent } = useConfirmDialog();

    return (
      <div>
        <button
          onClick={() =>
            openDialog({
              title: 'Test Dialog',
              description: 'Test description',
              onConfirm: () => {},
            })
          }
        >
          Open Dialog
        </button>
        {DialogComponent}
      </div>
    );
  };

  it('opens dialog when openDialog is called', async () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));

    await waitFor(() => {
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });
  });
});


