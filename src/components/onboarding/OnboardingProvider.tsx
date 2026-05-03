import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  CheckCircle,
  Package,
  QrCode,
  Truck,
  Shield,
  BarChart3,
  Users
} from 'lucide-react';

// Tour step definition
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string; // Action hint for the user
}

// Role-specific tours
const tours: Record<string, TourStep[]> = {
  supplier: [
    {
      id: 'welcome',
      title: 'Welcome to UjenziPro! 🎉',
      description: 'As a supplier, you can manage your products, handle orders, and track deliveries with QR codes.',
      icon: <Sparkles className="h-8 w-8 text-yellow-500" />,
      position: 'center'
    },
    {
      id: 'products',
      title: 'Manage Your Products',
      description: 'Add and manage your construction materials. Set prices, quantities, and descriptions.',
      icon: <Package className="h-8 w-8 text-blue-500" />,
      action: 'Go to Products tab to add materials'
    },
    {
      id: 'orders',
      title: 'Handle Orders',
      description: 'View incoming orders from builders. Accept, process, and fulfill orders efficiently.',
      icon: <Users className="h-8 w-8 text-green-500" />,
      action: 'Check Orders tab for new requests'
    },
    {
      id: 'qrcodes',
      title: 'QR Code Management',
      description: 'Download QR codes for each material item. Attach them before dispatch for tracking.',
      icon: <QrCode className="h-8 w-8 text-cyan-500" />,
      action: 'Visit QR Codes tab to download labels'
    },
    {
      id: 'dispatch',
      title: 'Dispatch Scanner',
      description: 'Use the scanner to mark items as dispatched. This updates the tracking status in real-time.',
      icon: <Truck className="h-8 w-8 text-purple-500" />,
      action: 'Use Dispatch Scanner when shipping'
    }
  ],
  professional_builder: [
    {
      id: 'welcome',
      title: 'Welcome to UjenziPro! 🏗️',
      description: 'As a CO/contractor, you can order materials, track deliveries, and request monitoring services.',
      icon: <Sparkles className="h-8 w-8 text-yellow-500" />,
      position: 'center'
    },
    {
      id: 'marketplace',
      title: 'Browse Marketplace',
      description: 'Find quality construction materials from verified suppliers at competitive prices.',
      icon: <Package className="h-8 w-8 text-blue-500" />,
      action: 'Visit Suppliers page to browse materials'
    },
    {
      id: 'orders',
      title: 'Track Your Orders',
      description: 'Monitor all your orders in one place. See QR codes for each material item.',
      icon: <QrCode className="h-8 w-8 text-cyan-500" />,
      action: 'Check Orders tab for delivery status'
    },
    {
      id: 'receiving',
      title: 'Receive Materials',
      description: 'Scan QR codes when materials arrive to verify and update delivery status.',
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      action: 'Use Receiving Scanner when materials arrive'
    },
    {
      id: 'monitoring',
      title: 'Monitoring Services',
      description: 'Request professional site monitoring with cameras and drones for your projects.',
      icon: <Shield className="h-8 w-8 text-purple-500" />,
      action: 'Go to Monitoring tab to request services'
    }
  ],
  private_client: [
    {
      id: 'welcome',
      title: 'Welcome to UjenziPro! 🏠',
      description: 'As a private client, you can order materials for your home projects and track deliveries.',
      icon: <Sparkles className="h-8 w-8 text-yellow-500" />,
      position: 'center'
    },
    {
      id: 'browse',
      title: 'Find Materials',
      description: 'Browse our marketplace to find all the materials you need for your project.',
      icon: <Package className="h-8 w-8 text-blue-500" />,
      action: 'Visit Suppliers page to start shopping'
    },
    {
      id: 'orders',
      title: 'Track Deliveries',
      description: 'Monitor your orders and know exactly when materials will arrive.',
      icon: <Truck className="h-8 w-8 text-green-500" />,
      action: 'Check Orders tab for updates'
    },
    {
      id: 'support',
      title: 'Get Help',
      description: 'Use our chat support for any questions or assistance you need.',
      icon: <Users className="h-8 w-8 text-purple-500" />,
      action: 'Click the chat button for support'
    }
  ],
  admin: [
    {
      id: 'welcome',
      title: 'Admin Dashboard 👑',
      description: 'You have full access to manage users, orders, and platform settings.',
      icon: <Shield className="h-8 w-8 text-yellow-500" />,
      position: 'center'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage all users, roles, and permissions across the platform.',
      icon: <Users className="h-8 w-8 text-blue-500" />,
      action: 'Visit Users tab to manage accounts'
    },
    {
      id: 'monitoring',
      title: 'Monitoring Requests',
      description: 'Review and respond to monitoring service requests from builders.',
      icon: <Shield className="h-8 w-8 text-green-500" />,
      action: 'Check Monitoring tab for pending requests'
    },
    {
      id: 'analytics',
      title: 'Platform Analytics',
      description: 'View comprehensive analytics and insights about platform usage.',
      icon: <BarChart3 className="h-8 w-8 text-purple-500" />,
      action: 'Visit Analytics for detailed reports'
    },
    {
      id: 'scans',
      title: 'QR Scan Dashboard',
      description: 'Monitor all QR code scans across the platform in real-time.',
      icon: <QrCode className="h-8 w-8 text-cyan-500" />,
      action: 'Check Scans tab for activity'
    }
  ],
  delivery_provider: [
    {
      id: 'welcome',
      title: 'Welcome, Delivery Partner! 🚚',
      description: 'You can manage deliveries, scan materials, and track your routes.',
      icon: <Truck className="h-8 w-8 text-yellow-500" />,
      position: 'center'
    },
    {
      id: 'deliveries',
      title: 'Manage Deliveries',
      description: 'View assigned deliveries and plan your routes efficiently.',
      icon: <Package className="h-8 w-8 text-blue-500" />,
      action: 'Check Deliveries tab for assignments'
    },
    {
      id: 'scanner',
      title: 'Scan Materials',
      description: 'Use the scanner to verify materials during pickup and delivery.',
      icon: <QrCode className="h-8 w-8 text-cyan-500" />,
      action: 'Use Scanner for material verification'
    }
  ]
};

// Context
interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  startOnboarding: (role: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  hasCompletedOnboarding: (role: string) => boolean;
  resetOnboarding: (role: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

// Provider Component
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [currentTour, setCurrentTour] = useState<TourStep[]>([]);

  const getStorageKey = (role: string) => `ujenzi_onboarding_${role}`;

  const hasCompletedOnboarding = useCallback((role: string) => {
    return localStorage.getItem(getStorageKey(role)) === 'completed';
  }, []);

  const startOnboarding = useCallback((role: string) => {
    const tour = tours[role] || tours.private_client;
    setCurrentRole(role);
    setCurrentTour(tour);
    setCurrentStep(0);
    setIsOnboarding(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < currentTour.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStep, currentTour.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(getStorageKey(currentRole), 'skipped');
    setIsOnboarding(false);
    setCurrentStep(0);
  }, [currentRole]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(getStorageKey(currentRole), 'completed');
    setIsOnboarding(false);
    setCurrentStep(0);
  }, [currentRole]);

  const resetOnboarding = useCallback((role: string) => {
    localStorage.removeItem(getStorageKey(role));
  }, []);

  const value: OnboardingContextType = {
    isOnboarding,
    currentStep,
    totalSteps: currentTour.length,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    hasCompletedOnboarding,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      
      {/* Onboarding Dialog */}
      <Dialog open={isOnboarding} onOpenChange={(open) => !open && skipOnboarding()}>
        <DialogContent className="sm:max-w-lg">
          {currentTour[currentStep] && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="mb-2">
                    Step {currentStep + 1} of {currentTour.length}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={skipOnboarding}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center py-4">
                  {currentTour[currentStep].icon}
                </div>
                <DialogTitle className="text-center text-xl">
                  {currentTour[currentStep].title}
                </DialogTitle>
                <DialogDescription className="text-center text-base pt-2">
                  {currentTour[currentStep].description}
                </DialogDescription>
              </DialogHeader>
              
              {currentTour[currentStep].action && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 my-4">
                  <p className="text-sm text-center font-medium text-primary">
                    👉 {currentTour[currentStep].action}
                  </p>
                </div>
              )}
              
              {/* Progress */}
              <Progress 
                value={((currentStep + 1) / currentTour.length) * 100} 
                className="h-2 my-4" 
              />
              
              <DialogFooter className="flex justify-between sm:justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={skipOnboarding}>
                    Skip Tour
                  </Button>
                  <Button onClick={nextStep}>
                    {currentStep === currentTour.length - 1 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
};

// Hook to auto-start onboarding for new users
export const useAutoOnboarding = (role: string | null) => {
  const { hasCompletedOnboarding, startOnboarding } = useOnboarding();
  
  useEffect(() => {
    if (role && !hasCompletedOnboarding(role)) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startOnboarding(role);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [role, hasCompletedOnboarding, startOnboarding]);
};

export default OnboardingProvider;

