import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { OnboardingProvider, useOnboarding, useAutoOnboarding } from './OnboardingProvider';

// Test component that uses the onboarding context
const TestConsumer = () => {
  const { 
    isOnboarding, 
    currentStep, 
    totalSteps, 
    startOnboarding, 
    hasCompletedOnboarding,
    resetOnboarding 
  } = useOnboarding();

  return (
    <div>
      <div data-testid="is-onboarding">{isOnboarding ? 'true' : 'false'}</div>
      <div data-testid="current-step">{currentStep}</div>
      <div data-testid="total-steps">{totalSteps}</div>
      <div data-testid="completed-supplier">
        {hasCompletedOnboarding('supplier') ? 'true' : 'false'}
      </div>
      <button onClick={() => startOnboarding('supplier')}>Start Supplier Tour</button>
      <button onClick={() => startOnboarding('professional_builder')}>Start Builder Tour</button>
      <button onClick={() => resetOnboarding('supplier')}>Reset Supplier</button>
    </div>
  );
};

// Test component for auto-onboarding
const AutoOnboardingConsumer = ({ role }: { role: string | null }) => {
  useAutoOnboarding(role);
  return <div>Auto onboarding test</div>;
};

describe('OnboardingProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides onboarding context to children', () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    expect(screen.getByTestId('is-onboarding')).toHaveTextContent('false');
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
  });

  it('starts onboarding when startOnboarding is called', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      expect(screen.getByTestId('is-onboarding')).toHaveTextContent('true');
    });
  });

  it('shows correct total steps for supplier role', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      // Supplier tour has 5 steps
      expect(screen.getByTestId('total-steps')).toHaveTextContent('5');
    });
  });

  it('shows correct total steps for builder role', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Builder Tour'));

    await waitFor(() => {
      // CO/Contractor tour has 5 steps
      expect(screen.getByTestId('total-steps')).toHaveTextContent('5');
    });
  });

  it('displays onboarding dialog with step content', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      expect(screen.getByText(/Welcome to UjenziPro/)).toBeInTheDocument();
    });
  });

  it('navigates to next step when Next is clicked', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      expect(screen.getByText(/Welcome to UjenziPro/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Manage Your Products')).toBeInTheDocument();
    });
  });

  it('closes dialog when Skip Tour is clicked', async () => {
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      expect(screen.getByText(/Welcome to UjenziPro/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip Tour'));

    await waitFor(() => {
      expect(screen.getByTestId('is-onboarding')).toHaveTextContent('false');
    });
  });

  it('marks onboarding as completed in localStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Start Supplier Tour'));

    await waitFor(() => {
      expect(screen.getByText(/Welcome to UjenziPro/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip Tour'));

    expect(setItemSpy).toHaveBeenCalledWith('ujenzi_onboarding_supplier', 'skipped');
  });

  it('resets onboarding when resetOnboarding is called', async () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    
    render(
      <OnboardingProvider>
        <TestConsumer />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Reset Supplier'));

    expect(removeItemSpy).toHaveBeenCalledWith('ujenzi_onboarding_supplier');
  });
});

describe('useAutoOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-starts onboarding for new users after delay', async () => {
    render(
      <OnboardingProvider>
        <AutoOnboardingConsumer role="supplier" />
      </OnboardingProvider>
    );

    // Initially no dialog
    expect(screen.queryByText(/Welcome to UjenziPro/)).not.toBeInTheDocument();

    // Fast-forward past the delay
    vi.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to UjenziPro/)).toBeInTheDocument();
    });
  });

  it('does not auto-start for users who completed onboarding', async () => {
    // Mark as completed
    localStorage.setItem('ujenzi_onboarding_supplier', 'completed');
    
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'ujenzi_onboarding_supplier') return 'completed';
      return null;
    });

    render(
      <OnboardingProvider>
        <AutoOnboardingConsumer role="supplier" />
      </OnboardingProvider>
    );

    vi.advanceTimersByTime(1500);

    // Dialog should not appear
    expect(screen.queryByText(/Welcome to UjenziPro/)).not.toBeInTheDocument();
  });
});

