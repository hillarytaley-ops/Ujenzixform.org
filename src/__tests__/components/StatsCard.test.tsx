import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/pages/admin/components/StatsCard';

describe('StatsCard', () => {
  it('renders title and value correctly', () => {
    render(
      <StatsCard
        title="Total Users"
        value={150}
        icon={Users}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <StatsCard
        title="Active Users"
        value={50}
        subtitle="Last 24 hours"
        icon={Users}
      />
    );

    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(
      <StatsCard
        title="Revenue"
        value="$10,000"
        icon={Users}
        trend={{ value: 15, isPositive: true }}
      />
    );

    expect(screen.getByText(/15% from last period/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <StatsCard
        title="Clickable Card"
        value={100}
        icon={Users}
        onClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText('Clickable Card').closest('.bg-slate-900\\/50')!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('StatsGrid', () => {
  it('renders children in a grid', () => {
    render(
      <StatsGrid columns={3}>
        <StatsCard title="Card 1" value={1} icon={Users} />
        <StatsCard title="Card 2" value={2} icon={Users} />
        <StatsCard title="Card 3" value={3} icon={Users} />
      </StatsGrid>
    );

    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Card 3')).toBeInTheDocument();
  });
});


