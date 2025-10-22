import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Cookie, 
  Shield, 
  Settings, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Eye
} from 'lucide-react';
import { DataPrivacyService } from '@/services/DataPrivacyService';

interface PrivacyPolicyBannerProps {
  userId?: string;
  onConsentChange?: (consents: { [key: string]: boolean }) => void;
}

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  cookies: string[];
}

export const PrivacyPolicyBanner: React.FC<PrivacyPolicyBannerProps> = ({
  userId,
  onConsentChange
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState<{ [key: string]: boolean }>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  const cookieCategories: CookieCategory[] = [
    {
      id: 'essential',
      name: 'Essential Cookies',
      description: 'Required for basic site functionality, security, and user authentication',
      required: true,
      enabled: true,
      cookies: ['session_id', 'csrf_token', 'auth_token', 'security_preferences']
    },
    {
      id: 'functional',
      name: 'Functional Cookies',
      description: 'Remember your preferences and settings for a better user experience',
      required: false,
      enabled: cookiePreferences.functional || false,
      cookies: ['language_preference', 'theme_preference', 'notification_settings']
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how you use our platform to improve our services',
      required: false,
      enabled: cookiePreferences.analytics || false,
      cookies: ['google_analytics', 'usage_tracking', 'performance_monitoring']
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to show you relevant advertisements and promotional content',
      required: false,
      enabled: cookiePreferences.marketing || false,
      cookies: ['ad_targeting', 'conversion_tracking', 'social_media_pixels']
    }
  ];

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = () => {
    const consentStatus = localStorage.getItem('ujenzipro_consent_status');
    const lastConsentDate = localStorage.getItem('ujenzipro_consent_date');
    
    if (!consentStatus || !lastConsentDate) {
      setIsVisible(true);
      return;
    }

    // Check if consent is older than 12 months (GDPR requirement)
    const consentDate = new Date(lastConsentDate);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    if (consentDate < twelveMonthsAgo) {
      setIsVisible(true);
      return;
    }

    // Load existing preferences
    const savedPreferences = JSON.parse(consentStatus);
    setCookiePreferences(savedPreferences);
    setHasInteracted(true);
  };

  const handleAcceptAll = async () => {
    const allConsents = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    
    await saveConsents(allConsents);
  };

  const handleRejectOptional = async () => {
    const essentialOnly = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    
    await saveConsents(essentialOnly);
  };

  const handleSavePreferences = async () => {
    await saveConsents(cookiePreferences);
  };

  const saveConsents = async (consents: { [key: string]: boolean }) => {
    setCookiePreferences(consents);
    setHasInteracted(true);
    
    // Save to localStorage
    localStorage.setItem('ujenzipro_consent_status', JSON.stringify(consents));
    localStorage.setItem('ujenzipro_consent_date', new Date().toISOString());
    
    // Log consent for compliance
    if (userId) {
      await DataPrivacyService.logDataProcessing({
        user_id: userId,
        action: 'create',
        data_type: 'consent',
        purpose: 'cookie_consent',
        legal_basis: 'user_consent'
      });
    }
    
    // Notify parent component
    if (onConsentChange) {
      onConsentChange(consents);
    }
    
    // Hide banner
    setIsVisible(false);
    
    // Apply cookie settings
    applyCookieSettings(consents);
  };

  const applyCookieSettings = (consents: { [key: string]: boolean }) => {
    // Remove non-consented cookies
    cookieCategories.forEach(category => {
      if (!consents[category.id] && !category.required) {
        category.cookies.forEach(cookieName => {
          // Remove cookies (in production, you'd actually delete the cookies)
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
      }
    });
    
    // Initialize analytics if consented
    if (consents.analytics) {
      // Initialize Google Analytics or other analytics tools
      console.log('Analytics initialized');
    }
    
    // Initialize marketing tools if consented
    if (consents.marketing) {
      // Initialize marketing pixels, ad tracking, etc.
      console.log('Marketing tools initialized');
    }
  };

  const handleCategoryToggle = (categoryId: string, enabled: boolean) => {
    const category = cookieCategories.find(cat => cat.id === categoryId);
    if (category && category.required) return; // Can't toggle required cookies
    
    setCookiePreferences(prev => ({
      ...prev,
      [categoryId]: enabled
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <Card className="max-w-6xl mx-auto">
        <CardContent className="p-6">
          {!showDetails ? (
            // Simple consent banner
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-kenyan-green/10 rounded-full">
                  <Cookie className="h-6 w-6 text-kenyan-green" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    🇰🇪 We Value Your Privacy
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    UjenziPro uses cookies and similar technologies to provide you with the best experience, 
                    keep our platform secure, and show you relevant content. We comply with Kenya's Data Protection Act 2019 
                    and international privacy standards.
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Shield className="h-4 w-4" />
                    <span>Your data is encrypted and never sold to third parties</span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-kenyan-green hover:bg-kenyan-green/90 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept All
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleRejectOptional}
                  >
                    Essential Only
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setShowDetails(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <Button variant="link" size="sm" className="h-auto p-0">
                    Privacy Policy
                  </Button>
                  <Button variant="link" size="sm" className="h-auto p-0">
                    Cookie Policy
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Detailed cookie preferences
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-xl">Cookie Preferences</h3>
                  <p className="text-muted-foreground">
                    Choose which cookies you want to allow. You can change these settings anytime.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {cookieCategories.map((category) => (
                  <Card key={category.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{category.name}</h4>
                            {category.required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {category.enabled && !category.required && (
                              <Badge className="text-xs bg-kenyan-green">
                                Enabled
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>Cookies: {category.cookies.join(', ')}</span>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={category.enabled}
                              disabled={category.required}
                              onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                              className="rounded border-gray-300 text-kenyan-green focus:ring-kenyan-green disabled:opacity-50"
                            />
                            <span className="text-sm">
                              {category.required ? 'Always Active' : 'Allow'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-kenyan-green hover:bg-kenyan-green/90 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleAcceptAll}
                  >
                    Accept All
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>You can change these settings anytime in Privacy Settings</span>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-kenyan-green mt-0.5" />
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Your Privacy Rights in Kenya</h5>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Right to access your personal data</li>
                      <li>• Right to correct inaccurate information</li>
                      <li>• Right to delete your data</li>
                      <li>• Right to data portability</li>
                      <li>• Right to withdraw consent anytime</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Contact our Data Protection Officer: <strong>privacy@ujenzipro.co.ke</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
