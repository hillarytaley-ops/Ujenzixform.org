import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Eye, 
  Download, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Lock,
  Users,
  FileText,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataPrivacyService } from '@/services/DataPrivacyService';

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  purpose: string;
  dataTypes: string[];
  required: boolean;
  granted: boolean;
  legal_basis: string;
  retention_period: string;
}

interface PrivacyConsentManagerProps {
  userId: string;
  onConsentChange?: (consents: { [key: string]: boolean }) => void;
}

export const PrivacyConsentManager: React.FC<PrivacyConsentManagerProps> = ({
  userId,
  onConsentChange
}) => {
  const [consents, setConsents] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [showDataReport, setShowDataReport] = useState(false);
  const [dataReport, setDataReport] = useState<any>(null);
  const { toast } = useToast();

  const consentItems: ConsentItem[] = [
    {
      id: 'essential_services',
      title: 'Essential Services',
      description: 'Process your orders, payments, and provide core platform functionality',
      purpose: 'service_provision',
      dataTypes: ['Name', 'Email', 'Phone Number', 'Address'],
      required: true,
      granted: true,
      legal_basis: 'Contract Performance',
      retention_period: '5 years after account closure'
    },
    {
      id: 'payment_processing',
      title: 'Payment Processing',
      description: 'Process M-Pesa, bank transfers, and other payment methods securely',
      purpose: 'payment_processing',
      dataTypes: ['Phone Number', 'Payment Information', 'Transaction History'],
      required: true,
      granted: true,
      legal_basis: 'Contract Performance',
      retention_period: '7 years for financial compliance'
    },
    {
      id: 'communication',
      title: 'Communication & Notifications',
      description: 'Send order updates, delivery notifications, and important account information',
      purpose: 'communication',
      dataTypes: ['Email', 'Phone Number', 'Communication Preferences'],
      required: false,
      granted: consents.communication || false,
      legal_basis: 'Legitimate Interest',
      retention_period: '2 years after last communication'
    },
    {
      id: 'marketing',
      title: 'Marketing & Promotions',
      description: 'Send promotional offers, new product announcements, and marketing materials',
      purpose: 'marketing',
      dataTypes: ['Email', 'Phone Number', 'Usage Patterns', 'Preferences'],
      required: false,
      granted: consents.marketing || false,
      legal_basis: 'Consent',
      retention_period: 'Until consent withdrawn'
    },
    {
      id: 'analytics',
      title: 'Analytics & Improvement',
      description: 'Analyze platform usage to improve services and user experience',
      purpose: 'analytics',
      dataTypes: ['Usage Data', 'Device Information', 'Location Data'],
      required: false,
      granted: consents.analytics || false,
      legal_basis: 'Legitimate Interest',
      retention_period: '2 years for analysis purposes'
    },
    {
      id: 'third_party_sharing',
      title: 'Third-Party Service Providers',
      description: 'Share necessary data with delivery partners, payment processors, and service providers',
      purpose: 'service_provision',
      dataTypes: ['Contact Information', 'Delivery Address', 'Payment Data'],
      required: false,
      granted: consents.third_party_sharing || false,
      legal_basis: 'Legitimate Interest',
      retention_period: 'As per service provider policies'
    }
  ];

  useEffect(() => {
    loadUserConsents();
  }, [userId]);

  const loadUserConsents = async () => {
    try {
      // In production, load from database
      const savedConsents = localStorage.getItem(`consents_${userId}`);
      if (savedConsents) {
        const parsed = JSON.parse(savedConsents);
        setConsents(parsed);
      } else {
        // Default consents
        setConsents({
          essential_services: true,
          payment_processing: true,
          communication: false,
          marketing: false,
          analytics: false,
          third_party_sharing: false
        });
      }
    } catch (error) {
      console.error('Failed to load consents:', error);
    }
  };

  const handleConsentChange = async (consentId: string, granted: boolean) => {
    const updatedConsents = { ...consents, [consentId]: granted };
    setConsents(updatedConsents);

    try {
      // Save to localStorage (in production, save to database)
      localStorage.setItem(`consents_${userId}`, JSON.stringify(updatedConsents));

      // Log the consent change
      await DataPrivacyService.logDataProcessing({
        user_id: userId,
        action: granted ? 'create' : 'delete',
        data_type: 'consent',
        purpose: consentId,
        legal_basis: 'user_consent'
      });

      if (onConsentChange) {
        onConsentChange(updatedConsents);
      }

      toast({
        title: "Consent Updated",
        description: `Your ${granted ? 'consent has been granted' : 'consent has been withdrawn'} for ${consentItems.find(item => item.id === consentId)?.title}`,
      });
    } catch (error) {
      console.error('Failed to save consent:', error);
      toast({
        title: "Error",
        description: "Failed to update consent preferences",
        variant: "destructive"
      });
    }
  };

  const generateDataReport = async () => {
    setLoading(true);
    try {
      const report = DataPrivacyService.generatePrivacyReport(userId);
      setDataReport(report);
      setShowDataReport(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate data report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    setLoading(true);
    try {
      const dataBlob = await DataPrivacyService.exportUserData(userId);
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ujenzipro-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export your data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    if (!confirm('Are you sure you want to request deletion of all your personal data? This action cannot be undone and will close your account.')) {
      return;
    }

    setLoading(true);
    try {
      await DataPrivacyService.logDataProcessing({
        user_id: userId,
        action: 'delete',
        data_type: 'all_personal_data',
        purpose: 'user_deletion_request',
        legal_basis: 'user_consent'
      });

      toast({
        title: "Deletion Request Submitted",
        description: "Your data deletion request has been submitted. We will process it within 30 days.",
      });
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to submit deletion request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderConsentItem = (item: ConsentItem) => (
    <Card key={item.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-base">{item.title}</CardTitle>
              {item.required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              {item.granted && (
                <Badge className="text-xs bg-kenyan-green">Active</Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              {item.description}
            </CardDescription>
          </div>
          <Checkbox
            checked={item.granted}
            disabled={item.required}
            onCheckedChange={(checked) => 
              handleConsentChange(item.id, checked as boolean)
            }
            className="mt-1"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Data Used:</span>
            <div className="mt-1">
              {item.dataTypes.map((type, index) => (
                <Badge key={index} variant="outline" className="mr-1 mb-1 text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Legal Basis:</span>
            <p className="text-xs mt-1">{item.legal_basis}</p>
            <span className="font-medium text-muted-foreground mt-2 block">Retention:</span>
            <p className="text-xs mt-1">{item.retention_period}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDataReport = () => {
    if (!dataReport) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Your Personal Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dataReport.personal_data).map(([key, value]) => (
                <div key={key} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm capitalize">
                    {key.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {value as string}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Processing Purposes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataReport.processing_purposes.map((purpose: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-kenyan-green" />
                  <span className="text-sm">{purpose}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Retention Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dataReport.retention_info).map(([key, date]) => (
                <div key={key} className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-sm text-muted-foreground">
                    Until: {new Date(date as string).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy & Data Management</h1>
        <p className="text-muted-foreground">
          Manage your data privacy preferences and understand how we protect your information
        </p>
      </div>

      <Tabs defaultValue="consents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consents">Consent Preferences</TabsTrigger>
          <TabsTrigger value="data-report">My Data</TabsTrigger>
          <TabsTrigger value="rights">Data Rights</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="consents" className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your privacy is important to us. You can control how we use your data by managing these consent preferences. 
              Required services are necessary for core platform functionality.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {consentItems.map(renderConsentItem)}
          </div>
        </TabsContent>

        <TabsContent value="data-report" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Your Data Report</h3>
              <p className="text-muted-foreground">See what personal data we have about you</p>
            </div>
            <Button onClick={generateDataReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>

          {showDataReport && renderDataReport()}
        </TabsContent>

        <TabsContent value="rights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Data Protection Rights
              </CardTitle>
              <CardDescription>
                Under Kenya's Data Protection Act and international privacy laws, you have the following rights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Right to Access</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get a copy of all personal data we hold about you
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportUserData}
                      disabled={loading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Right to Rectification</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Update or correct your personal information
                    </p>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Profile
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Right to Erasure</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Request deletion of your personal data
                    </p>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={requestDataDeletion}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete My Data
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Right to Object</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Object to certain types of data processing
                    </p>
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      File Objection
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  If you have questions about your data rights or need assistance, contact our Data Protection Officer at 
                  <strong> privacy@ujenzipro.co.ke</strong> or call <strong>+254-700-123-456</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Security Measures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-kenyan-green" />
                    <span className="font-medium">End-to-End Encryption</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All personal data is encrypted using AES-256 encryption
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-kenyan-green" />
                    <span className="font-medium">Secure Data Centers</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Data stored in ISO 27001 certified facilities
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-kenyan-green" />
                    <span className="font-medium">Access Controls</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Role-based access with multi-factor authentication
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-kenyan-green" />
                    <span className="font-medium">Regular Audits</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Third-party security audits and penetration testing
                  </p>
                </div>
              </div>

              <Separator />

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  We are committed to protecting your privacy and comply with Kenya's Data Protection Act 2019, 
                  GDPR, and other applicable privacy regulations. Your data is never sold to third parties.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
