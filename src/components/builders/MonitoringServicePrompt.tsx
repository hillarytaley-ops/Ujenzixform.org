import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { PAYSTACK_NAV_KEY } from '@/components/payment/PaystackCheckout';
import { MapLocationPicker } from '@/components/location/MapLocationPicker';

import {
  Eye,
  Shield,
  CheckCircle,
  Clock,
  Camera,
  FileText,
  AlertTriangle,
  Users,
  Calendar,
  MapPin,
  Phone,
  Loader2,
  X,
  Star,
  Zap,
  Navigation,
  Copy,
  Map as MapIcon,
  CreditCard
} from 'lucide-react';

interface MonitoringServicePromptProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: {
    id: string;
    po_number?: string;
    project_name?: string;
    total_amount?: number;
    delivery_address?: string;
  };
  onServiceRequested?: () => void;
  onDeclined?: () => void;
}

// Professional Builder Packages – includes drone, AI cameras, site visits, and full monitoring services
const PROFESSIONAL_PACKAGES = [
  {
    id: 'pro-starter',
    name: 'Starter',
    priceMonthly: 5000,
    duration: '1 month',
    features: [
      'Monthly site visit reports',
      'Photo documentation',
      'Material quantity checks',
      'GPS location tracking',
      'Progress tracking',
      'Email support'
    ],
    recommended: false,
    icon: '🌱'
  },
  {
    id: 'pro-basic',
    name: 'Basic',
    priceMonthly: 9000,
    duration: '1 month',
    features: [
      'Weekly site visit reports',
      'Photo & video documentation',
      'Material QR code verification',
      'GPS location tracking',
      'Basic quality checks',
      'Email support'
    ],
    recommended: false,
    icon: '📋'
  },
  {
    id: 'pro-standard',
    name: 'Standard',
    priceMonthly: 22000,
    duration: '3 months',
    features: [
      'Bi-weekly site visits',
      'Real-time progress dashboard',
      'Material QR scanning & tracking',
      'GPS coordinates logging',
      '🚁 Monthly drone aerial surveys',
      'Supplier quote management',
      'Delivery tracking integration',
      'Issue alerts & notifications',
      'Monthly summary reports',
      'Phone & email support'
    ],
    recommended: true,
    icon: '⭐'
  },
  {
    id: 'pro-premium',
    name: 'Premium',
    priceMonthly: 39000,
    duration: '6 months',
    features: [
      'Weekly site visits',
      'Real-time progress updates',
      'Full QR code tracking system',
      'GPS & geofencing alerts',
      '🚁 Weekly drone aerial surveys',
      '🤖 AI camera monitoring (24/7)',
      '📹 Live video feed access',
      'Dedicated project manager',
      '24/7 issue reporting',
      'Contractor performance reviews',
      'Multi-supplier coordination',
      'Delivery dispatch monitoring',
      'Final inspection & certification',
      'Priority 24/7 support'
    ],
    recommended: false,
    icon: '👑'
  },
  {
    id: 'pro-enterprise',
    name: 'Enterprise',
    priceMonthly: 72000,
    duration: '12 months',
    features: [
      'Daily site monitoring',
      'Live GPS dashboard',
      'Complete QR ecosystem',
      '🚁 Daily drone surveillance',
      '🤖 AI camera network (multiple sites)',
      '📹 24/7 live video monitoring',
      '🔍 AI progress analysis & reporting',
      'On-site supervisor',
      'Custom reporting dashboard',
      'Multi-site management',
      'Safety violation detection',
      'Unauthorized access alerts',
      'Priority 24/7 support',
      'Dedicated account manager'
    ],
    recommended: false,
    icon: '🏢'
  }
];

// Private Builder Packages – same monitoring services (drone, AI cameras, etc.) at lower rates
const PRIVATE_PACKAGES = [
  {
    id: 'pvt-starter',
    name: 'Starter',
    priceMonthly: 2500,
    duration: '1 month',
    features: [
      'Monthly site visit reports',
      'Photo documentation',
      'Material quantity checks',
      'GPS location tracking',
      'Progress tracking',
      'Email support'
    ],
    recommended: false,
    icon: '🌱'
  },
  {
    id: 'pvt-basic',
    name: 'Basic',
    priceMonthly: 4500,
    duration: '1 month',
    features: [
      'Bi-weekly site visit reports',
      'Photo documentation',
      'Material verification',
      'GPS location tracking',
      'Basic quality checks',
      'Email support'
    ],
    recommended: false,
    icon: '📋'
  },
  {
    id: 'pvt-standard',
    name: 'Standard',
    priceMonthly: 11000,
    duration: '3 months',
    features: [
      'Weekly site visits',
      'Photo & video reports',
      'Material QR verification',
      'GPS coordinates logging',
      '🚁 Monthly drone aerial surveys',
      'Progress tracking dashboard',
      'Delivery tracking',
      'Issue alerts',
      'Monthly reports',
      'Phone support'
    ],
    recommended: true,
    icon: '⭐'
  },
  {
    id: 'pvt-premium',
    name: 'Premium',
    priceMonthly: 19500,
    duration: '6 months',
    features: [
      'Weekly site visits',
      'Real-time updates',
      'Full QR tracking',
      'GPS monitoring',
      '🚁 Weekly drone surveys',
      '🤖 AI camera monitoring',
      '📹 Live video feed access',
      'Dedicated monitor',
      '24/7 issue reporting',
      'Quality assurance',
      'Final inspection',
      'Priority support'
    ],
    recommended: false,
    icon: '👑'
  },
  {
    id: 'pvt-enterprise',
    name: 'Enterprise',
    priceMonthly: 36000,
    duration: '12 months',
    features: [
      'Daily site monitoring',
      'Live GPS dashboard',
      'Complete QR ecosystem',
      '🚁 Daily drone surveillance',
      '🤖 AI camera network',
      '📹 24/7 live video monitoring',
      '🔍 AI progress analysis',
      'On-site supervisor',
      'Custom reporting',
      'Safety violation detection',
      'Unauthorized access alerts',
      'Priority 24/7 support'
    ],
    recommended: false,
    icon: '🏢'
  }
];

// Legacy array for backward compatibility
const MONITORING_PACKAGES = PROFESSIONAL_PACKAGES;

const PLACEHOLDER_ADDRESSES = ['to be provided', 'to be confirmed', 'tbd', 'tba', 'n/a', 'na', 'to be determined', 'delivery location', 'address not found'];
function isRealDeliveryAddress(addr: string | undefined): boolean {
  if (!addr || typeof addr !== 'string') return false;
  const t = addr.trim().toLowerCase();
  if (t.length < 5) return false;
  return !PLACEHOLDER_ADDRESSES.some(p => t === p || t.startsWith(p + ' ') || t.endsWith(' ' + p));
}
function getRealDeliveryAddress(addr: string | undefined): string {
  if (!addr || !isRealDeliveryAddress(addr)) return '';
  return addr.trim();
}

function isPhoneReasonable(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export const MonitoringServicePrompt: React.FC<MonitoringServicePromptProps> = ({
  isOpen,
  onOpenChange,
  purchaseOrder,
  onServiceRequested,
  onDeclined
}) => {
  const [step, setStep] = useState<'intro' | 'packages' | 'details' | 'success'>('intro');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Detect user role for pricing
  const userRole = localStorage.getItem('user_role') || 'private_client';
  const isProfessional = userRole === 'professional_builder' || userRole === 'admin';
  const packages = isProfessional ? PROFESSIONAL_PACKAGES : PRIVATE_PACKAGES;
  const [formData, setFormData] = useState({
    siteAddress: getRealDeliveryAddress(purchaseOrder?.delivery_address) || '',
    projectDescription: '',
    contactPhone: '',
    preferredStartDate: '',
    specialRequirements: '',
    gpsCoordinates: ''
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showSiteMap, setShowSiteMap] = useState(false);
  const { toast } = useToast();

  // Get GPS coordinates
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'GPS Not Supported',
        description: 'Your browser does not support GPS location.',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        setFormData(prev => ({ ...prev, gpsCoordinates: coords }));
        
        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'UjenziXform/1.0' } }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.display_name && !formData.siteAddress) {
              setFormData(prev => ({ 
                ...prev, 
                siteAddress: data.display_name.substring(0, 200)
              }));
            }
          }
        } catch (e) {
          console.log('Reverse geocoding failed (non-critical)');
        }
        
        setGettingLocation(false);
        toast({
          title: '📍 Location Captured',
          description: `GPS: ${coords}`,
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = 'Could not get your location.';
        if (error.code === 1) message = 'Location permission denied.';
        if (error.code === 2) message = 'Location unavailable.';
        if (error.code === 3) message = 'Location request timed out.';
        toast({
          title: 'GPS Error',
          description: message,
          variant: 'destructive'
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Copy coordinates to clipboard
  const copyCoordinates = () => {
    if (formData.gpsCoordinates) {
      navigator.clipboard.writeText(formData.gpsCoordinates);
      toast({ title: 'Copied!', description: 'GPS coordinates copied to clipboard.' });
    }
  };

  // Pre-fill site address from delivery address provided by builder during delivery request (remains editable)
  // 1) Use purchaseOrder.delivery_address if it's a real address (not "To be provided" etc.)
  React.useEffect(() => {
    const addr = getRealDeliveryAddress(purchaseOrder?.delivery_address);
    if (isOpen && addr) {
      setFormData(prev => ({ ...prev, siteAddress: addr }));
    }
  }, [isOpen, purchaseOrder?.delivery_address]);

  // 2) When we have an order id but no real address from props, fetch builder-provided address from delivery_requests
  React.useEffect(() => {
    if (!isOpen || !purchaseOrder?.id) return;
    const fromProps = getRealDeliveryAddress(purchaseOrder?.delivery_address);
    if (fromProps) return; // already have a real address

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?purchase_order_id=eq.${purchaseOrder.id}&select=delivery_address&order=created_at.desc&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        const addr = rows?.[0]?.delivery_address;
        if (cancelled || !addr || typeof addr !== 'string' || !addr.trim()) return;
        if (PLACEHOLDER_ADDRESSES.some(p => addr.trim().toLowerCase().startsWith(p))) return;
        setFormData(prev => ({ ...prev, siteAddress: addr.trim() }));
      } catch (e) {
        console.warn('Could not fetch delivery address for monitoring pre-fill:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, purchaseOrder?.id, purchaseOrder?.delivery_address]);

  // When user reaches Project Details step, ensure site address is set from delivery address if still empty
  React.useEffect(() => {
    const addr = getRealDeliveryAddress(purchaseOrder?.delivery_address);
    if (step === 'details' && addr) {
      setFormData(prev => {
        if (!prev.siteAddress?.trim() || !isRealDeliveryAddress(prev.siteAddress)) {
          return { ...prev, siteAddress: addr };
        }
        return prev;
      });
    }
  }, [step, purchaseOrder?.delivery_address]);

  const postPaystackDashboardPath = (): string => {
    if (isProfessional) return '/professional-builder-dashboard';
    return '/private-client-dashboard';
  };

  /** Creates a `pending_payment` row and redirects to Paystack; webhook/callback sets `approved` when paid. */
  const startMonitoringCheckout = async (opts: { requireFullForm: boolean }) => {
    if (!selectedPackage) {
      toast({
        title: 'Choose a package',
        description: 'Select a monitoring package first.',
        variant: 'destructive',
      });
      return;
    }

    const selectedPkg = packages.find((p) => p.id === selectedPackage);
    if (!selectedPkg) return;

    if (!formData.contactPhone?.trim() || !isPhoneReasonable(formData.contactPhone)) {
      toast({
        title: 'Phone required',
        description: 'Enter a valid contact phone number (used by our team and for Paystack receipts).',
        variant: 'destructive',
      });
      return;
    }

    const siteFromPo = getRealDeliveryAddress(purchaseOrder?.delivery_address);
    const siteLine = opts.requireFullForm
      ? (formData.siteAddress?.trim() || '')
      : (formData.siteAddress?.trim() || siteFromPo || 'To be confirmed with you').trim();

    if (opts.requireFullForm && !siteLine) {
      toast({
        title: 'Site address required',
        description: 'Enter the construction site address before paying.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user?.id) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to pay with Paystack.',
          variant: 'destructive',
        });
        return;
      }

      const userId = session.user.id;
      const userEmail = (session.user.email || '').trim();
      if (!userEmail.includes('@')) {
        toast({
          title: 'Email required',
          description: 'Your account needs an email address for Paystack checkout.',
          variant: 'destructive',
        });
        return;
      }

      const projectName =
        formData.projectDescription?.trim() ||
        purchaseOrder?.project_name?.trim() ||
        `Monitoring — ${selectedPkg.name}`;

      const specParts = [formData.projectDescription?.trim(), formData.specialRequirements?.trim()].filter(
        Boolean
      ) as string[];
      const specialRequirements = specParts.length > 0 ? specParts.join('\n\n') : null;

      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        project_name: projectName,
        project_location: siteLine,
        project_type: selectedPackage,
        project_duration: selectedPkg.duration,
        start_date: formData.preferredStartDate || null,
        contact_name: userEmail.split('@')[0] || 'Customer',
        contact_email: userEmail,
        contact_phone: formData.contactPhone.trim(),
        selected_services: [selectedPackage],
        camera_count: 1,
        special_requirements: specialRequirements,
        estimated_cost: selectedPkg.priceMonthly,
        additional_notes: `Paystack monitoring package: ${selectedPkg.name} (${selectedPkg.duration}). Builder tier: ${isProfessional ? 'professional' : 'private'}.${formData.gpsCoordinates ? ` GPS: ${formData.gpsCoordinates}` : ''}`,
        status: 'pending_payment',
      };

      const { data: row, error: insErr } = await supabase
        .from('monitoring_service_requests')
        .insert(insertPayload as never)
        .select('id')
        .single();

      if (insErr || !row || !(row as { id?: string }).id) {
        console.error('[monitoring pay] insert:', insErr);
        throw new Error(insErr?.message || 'Could not start checkout. Try again or contact support.');
      }

      const msrId = (row as { id: string }).id;
      const orderId = `msr_${msrId}`;
      const origin = window.location.origin;
      const callbackUrl = `${origin}/payment/paystack-callback`;
      const amount = selectedPkg.priceMonthly;
      const description = `Monitoring: ${selectedPkg.name} (${isProfessional ? 'Professional' : 'Private'} builder)`;

      sessionStorage.setItem(
        PAYSTACK_NAV_KEY,
        JSON.stringify({
          successNavigateTo: postPaystackDashboardPath(),
          orderId,
          amount,
          currency: 'KES',
          description,
        })
      );

      const { data: payData, error: payErr } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          amount,
          currency: 'KES',
          email: userEmail,
          orderId,
          description,
          callbackUrl,
        },
      });

      if (payErr) {
        throw new Error(payErr.message || 'Could not start Paystack checkout.');
      }
      if (payData?.error) {
        throw new Error(typeof payData.error === 'string' ? payData.error : 'Could not start Paystack checkout.');
      }

      const url = payData?.authorization_url as string | undefined;
      if (!url) {
        throw new Error('Paystack did not return a checkout URL.');
      }

      window.location.assign(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      toast({ title: 'Payment', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: 'No Problem!',
      description: 'You can request monitoring services anytime from your dashboard.',
    });
    if (onDeclined) onDeclined();
    onOpenChange(false);
    setStep('intro');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setStep('intro');
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'intro' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Eye className="h-6 w-6 text-blue-600" />
                🏗️ Professional Construction Monitoring
              </DialogTitle>
              <DialogDescription>
                Ensure your construction project stays on track with professional monitoring services
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Hero Banner */}
              <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <Shield className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">Protect Your Investment</h3>
                      <p className="text-blue-100 text-sm">
                        Don't leave your construction project to chance. Our professional monitors ensure 
                        quality materials, proper workmanship, and timely completion.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 text-sm">Quality Assurance</p>
                    <p className="text-xs text-green-700">Verify materials & workmanship</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Photo Reports</p>
                    <p className="text-xs text-blue-700">Regular visual documentation</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900 text-sm">Issue Detection</p>
                    <p className="text-xs text-orange-700">Catch problems early</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900 text-sm">Progress Reports</p>
                    <p className="text-xs text-purple-700">Stay informed always</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <Alert className="bg-amber-50 border-amber-200">
                <Zap className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Did you know?</strong> Projects with professional monitoring have 
                  <strong> 40% fewer delays</strong> and <strong>60% fewer quality issues</strong>.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex flex-col gap-2">
              <Button 
                onClick={() => setStep('packages')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                View Monitoring Packages
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="w-full text-gray-500"
              >
                Maybe Later
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'packages' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Choose Your Monitoring Package
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <p className="text-sm text-gray-600">
                  Our monitoring covers all services we offer: site visits, progress tracking, drone aerial surveys, AI cameras, live video, material verification, GPS tracking, and more. Choose a package that fits your project.
                </p>
                {isProfessional ? (
                  <span className="flex items-center gap-1">
                    <Badge className="bg-blue-600">Professional Builder</Badge>
                    Full-featured packages for commercial projects
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Badge className="bg-green-600">Private Builder</Badge>
                    Affordable packages for home construction
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={`cursor-pointer transition-all ${
                    selectedPackage === pkg.id 
                      ? 'border-blue-500 border-2 bg-blue-50' 
                      : 'hover:border-gray-300'
                  } ${pkg.recommended ? 'ring-2 ring-orange-400' : ''}`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{pkg.icon}</span>
                          <h3 className="font-bold text-lg">{pkg.name}</h3>
                          {pkg.recommended && (
                            <Badge className="bg-orange-500 text-white">
                              <Star className="h-3 w-3 mr-1" />
                              Best Value
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(pkg.priceMonthly)}
                          </span>
                          <span className="text-sm text-gray-500">/month</span>
                          <span className="text-xs text-gray-400">• {pkg.duration} commitment</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {pkg.features.slice(0, 6).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span className="truncate">{feature}</span>
                            </div>
                          ))}
                        </div>
                        {pkg.features.length > 6 && (
                          <p className="text-xs text-blue-600 mt-1">+{pkg.features.length - 6} more features</p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedPackage === pkg.id 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedPackage === pkg.id && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pricing Note */}
              <Alert className="bg-gray-50 border-gray-200">
                <AlertDescription className="text-xs text-gray-600">
                  {isProfessional ? (
                    <>💼 Professional Builder packages include drone surveys, AI cameras, site visits, and full monitoring—reduced rates for all tiers.</>
                  ) : (
                    <>🏠 Private Builder packages include the same monitoring services (drone, AI cameras, site visits) at lower rates—perfect for home construction.</>
                  )}
                </AlertDescription>
              </Alert>

              {selectedPackage && (
                <div className="space-y-2 p-3 rounded-lg border border-slate-200 bg-slate-50/80 dark:bg-slate-900/40 dark:border-slate-700">
                  <Label htmlFor="packageContactPhone" className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    Contact phone (required for Paystack){' '}
                  </Label>
                  <Input
                    id="packageContactPhone"
                    placeholder="+254 7XX XXX XXX"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    After payment, your monitoring request is approved automatically. You can add full site details on the
                    next step if you prefer—Pay now is available there too.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col gap-2">
              {selectedPackage && (
                <Button
                  type="button"
                  onClick={() => void startMonitoringCheckout({ requireFullForm: false })}
                  disabled={submitting || !isPhoneReasonable(formData.contactPhone)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Opening Paystack…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay now —{' '}
                      {formatCurrency(packages.find((p) => p.id === selectedPackage)?.priceMonthly || 0)} (Paystack)
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={() => setStep('details')}
                disabled={!selectedPackage}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to site details
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep('intro')}
                className="w-full"
              >
                Back
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Project Details
              </DialogTitle>
              <DialogDescription>
                Provide details about your construction project
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteAddress" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Site Address *
                </Label>
                <Input
                  id="siteAddress"
                  placeholder="Enter construction site address"
                  value={formData.siteAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteAddress: e.target.value }))}
                />
                {purchaseOrder && (
                  <p className="text-xs text-muted-foreground">
                    {formData.siteAddress ? 'Pre-filled from your delivery address. You can edit if needed.' : 'Enter the construction site address (same as your delivery request address if applicable).'}
                  </p>
                )}
              </div>

              {/* GPS Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  GPS Coordinates
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Click 'Get GPS' or 'Search on Map' to capture location"
                    value={formData.gpsCoordinates}
                    onChange={(e) => setFormData(prev => ({ ...prev, gpsCoordinates: e.target.value }))}
                    className="flex-1"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => {
                      console.log('🗺️ Site Map button clicked in MonitoringServicePrompt');
                      setShowSiteMap(true);
                    }}
                    title="Click to open interactive map for location selection"
                    className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-medium px-4 whitespace-nowrap"
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    Search on Map
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={getGPSLocation}
                    disabled={gettingLocation}
                    className="whitespace-nowrap border-green-500 text-green-600 hover:bg-green-50"
                  >
                    {gettingLocation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Navigation className="h-4 w-4 mr-2" />
                        Get GPS
                      </>
                    )}
                  </Button>
                  {formData.gpsCoordinates && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="default"
                      onClick={copyCoordinates}
                      title="Copy coordinates"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <MapIcon className="h-3 w-3" />
                  💡 Use "Search on Map" for interactive location selection or "Get GPS" for current location
                </p>
                {formData.gpsCoordinates && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Location captured: {formData.gpsCoordinates}
                  </p>
                )}
                
                {/* Site Map Picker */}
                {showSiteMap && (
                  <div className="mt-3 border-2 border-blue-500 rounded-lg p-4 bg-white shadow-lg">
                    <MapLocationPicker
                      initialLocation={
                        formData.gpsCoordinates
                          ? (() => {
                              const parts = formData.gpsCoordinates.split(',').map(s => s.trim());
                              if (parts.length === 2) {
                                const lat = parseFloat(parts[0]);
                                const lng = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  return {
                                    latitude: lat,
                                    longitude: lng,
                                    address: formData.siteAddress
                                  };
                                }
                              }
                              return undefined;
                            })()
                          : undefined
                      }
                      onLocationSelect={(location) => {
                        setFormData(prev => ({
                          ...prev,
                          gpsCoordinates: `${location.latitude}, ${location.longitude}`,
                          siteAddress: prev.siteAddress || location.address
                        }));
                        setShowSiteMap(false);
                        toast({
                          title: '📍 Site Location Set!',
                          description: `GPS coordinates saved: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                        });
                      }}
                      onClose={() => setShowSiteMap(false)}
                      title="Select Site Location"
                      description="Search for an address or click on the map to set your construction site location"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Contact Phone *
                </Label>
                <Input
                  id="contactPhone"
                  placeholder="+254 7XX XXX XXX"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">
                  Project Description
                </Label>
                <Textarea
                  id="projectDescription"
                  placeholder="Describe your construction project (e.g., 3-bedroom house, commercial building, etc.)"
                  value={formData.projectDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredStartDate" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Preferred Start Date
                </Label>
                <Input
                  id="preferredStartDate"
                  type="date"
                  value={formData.preferredStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredStartDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequirements">
                  Special Requirements
                </Label>
                <Textarea
                  id="specialRequirements"
                  placeholder="Any specific monitoring requirements or concerns..."
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Selected Package Summary */}
              {selectedPackage && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-blue-900 flex items-center gap-2">
                          <span>{packages.find(p => p.id === selectedPackage)?.icon}</span>
                          {packages.find(p => p.id === selectedPackage)?.name}
                          <Badge variant="outline" className="text-xs">
                            {isProfessional ? 'Professional' : 'Private'}
                          </Badge>
                        </p>
                        <p className="text-sm text-blue-700">
                          {packages.find(p => p.id === selectedPackage)?.duration} commitment
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(packages.find(p => p.id === selectedPackage)?.priceMonthly || 0)}
                        </p>
                        <p className="text-xs text-blue-500">/month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="flex flex-col gap-2">
              <Button 
                type="button"
                onClick={() => void startMonitoringCheckout({ requireFullForm: true })}
                disabled={submitting || !formData.siteAddress || !formData.contactPhone || !isPhoneReasonable(formData.contactPhone)}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening Paystack…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay now with Paystack —{' '}
                    {formatCurrency(packages.find((p) => p.id === selectedPackage)?.priceMonthly || 0)}
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep('packages')}
                className="w-full"
                disabled={submitting}
              >
                Back
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                Request Submitted!
              </DialogTitle>
              <DialogDescription className="sr-only">Monitoring service request submitted successfully</DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Monitoring Service Requested!
              </h3>
              <p className="text-gray-600">
                Our team will contact you within 24 hours to discuss your project 
                monitoring needs and schedule the first site visit.
              </p>
              
              <Alert className="bg-blue-50 border-blue-200 text-left">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>What's Next:</strong>
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>Our team will call you to confirm details</li>
                    <li>A monitoring officer will be assigned</li>
                    <li>First site visit will be scheduled</li>
                    <li>You'll receive login to the monitoring dashboard</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MonitoringServicePrompt;

