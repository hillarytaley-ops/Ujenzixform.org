import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Input } from './input';

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('accepts and displays value', () => {
    render(<Input value="test value" onChange={() => {}} />);
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('supports different types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="Number" />);
    expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-input');
  });

  it('supports required attribute', () => {
    render(<Input required placeholder="Required" />);
    expect(screen.getByPlaceholderText('Required')).toBeRequired();
  });

  it('supports aria attributes', () => {
    render(
      <Input 
        aria-label="Search input" 
        aria-describedby="search-help"
        placeholder="Search"
      />
    );
    
    const input = screen.getByPlaceholderText('Search');
    expect(input).toHaveAttribute('aria-label', 'Search input');
    expect(input).toHaveAttribute('aria-describedby', 'search-help');
  });
});





