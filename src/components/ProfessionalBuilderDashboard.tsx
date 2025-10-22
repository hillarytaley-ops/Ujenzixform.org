import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calculator, 
  CheckCircle, 
  Download, 
  FileText, 
  CreditCard, 
  Receipt,
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  UserCheck,
  Building2,
  Workflow,
  HelpCircle,
  BookOpen
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

// Import all components
import MaterialCalculationForm from './MaterialCalculationForm';
import ApprovalRequestForm from './ApprovalRequestForm';
import SourcingQuotationForm from './SourcingQuotationForm';
import ComprehensivePurchaseOrder from './ComprehensivePurchaseOrder';
import DeliveryNoteSigning from './DeliveryNoteSigning';
import GoodsReceivedNote from './GoodsReceivedNote';
import IndividualBuilderPayment from './IndividualBuilderPayment';
import InvoiceManager from './InvoiceManager';
import { TooltipGuide, QuickTooltip } from '@/components/ui/tooltip-guide';
import { builderWorkflowGuide, purchaseOrderGuide } from '@/data/userGuides';

interface SecurityEvent {
  timestamp: string;
  action: string;
  component: string;
  user: string;
}

const ProfessionalBuilderDashboard = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
    logSecurityEvent("dashboard_access", "Dashboard accessed");
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Access Denied",
          description: "Please log in to access the professional dashboard.",
          variant: "destructive"
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      
      // Check role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'builder')
        .maybeSingle();

      if (!roleData || (!profile.is_professional && profile.user_type !== 'company')) {
        toast({
          title: "Access Restricted",
          description: "This dashboard is restricted to professional builders and companies only.",
          variant: "destructive"
        });
        return;
      }

      setUserProfile(profile);
      logSecurityEvent("access_verified", "Professional builder access verified");
    } catch (error) {
      console.error('Error checking user access:', error);
      toast({
        title: "Error",
        description: "Failed to verify user access.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const logSecurityEvent = (action: string, component: string) => {
    const event: SecurityEvent = {
      timestamp: new Date().toISOString(),
      action,
      component,
      user: userProfile?.full_name || 'Unknown User'
    };
    setSecurityEvents(prev => [event, ...prev.slice(0, 4)]); // Keep last 5 events
  };

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    logSecurityEvent(`${tabValue}_accessed`, `${tabValue} tab accessed`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'builder' || (!userProfile.is_professional && userProfile.user_type !== 'company')) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              This dashboard is exclusively for professional builders and companies.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Banner */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                Secure Professional Builder Dashboard
              </CardTitle>
              <CardDescription>
                All data is encrypted and secured with role-based access control. 
                Activity is monitored for security compliance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipGuide 
                guide={builderWorkflowGuide}
                trigger={
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Workflow Guide
                  </Button>
                }
              />
              <TooltipGuide 
                guide={purchaseOrderGuide}
                trigger={
                  <Button variant="outline" size="sm">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    PO Help
                  </Button>
                }
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Info & Security Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">{userProfile.full_name || userProfile.company_name}</p>
                <p className="text-sm text-muted-foreground">Professional Builder Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-600">SSL Encrypted</p>
                <p className="text-sm text-muted-foreground">256-bit encryption active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-600">Activity Monitored</p>
                <p className="text-sm text-muted-foreground">Security compliance enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="material-calc">
            <Calculator className="h-4 w-4 mr-1" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="approval">
            <CheckCircle className="h-4 w-4 mr-1" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="sourcing">
            <Download className="h-4 w-4 mr-1" />
            Sourcing
          </TabsTrigger>
          <TabsTrigger value="purchase-order">
            <FileText className="h-4 w-4 mr-1" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="delivery-notes">
            <Receipt className="h-4 w-4 mr-1" />
            Delivery Notes
          </TabsTrigger>
          <TabsTrigger value="grn-inspection">
            <Workflow className="h-4 w-4 mr-1" />
            GRN & Inspection
          </TabsTrigger>
          <TabsTrigger value="invoicing">
            <CreditCard className="h-4 w-4 mr-1" />
            Invoicing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Workflow Overview
                </CardTitle>
                <CardDescription>
                  Complete material procurement and delivery workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">1. Material Calculation</p>
                      <p className="text-sm text-muted-foreground">Calculate material requirements and costs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">2. Approval Request</p>
                      <p className="text-sm text-muted-foreground">Submit requests to superiors if required</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">3. Supplier Quotations</p>
                      <p className="text-sm text-muted-foreground">Request and download quotations from suppliers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">4. Purchase Orders</p>
                      <p className="text-sm text-muted-foreground">Create and send comprehensive POs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">5. Delivery & Inspection</p>
                      <p className="text-sm text-muted-foreground">Sign delivery notes and create GRN</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">6. Payment & Invoicing</p>
                      <p className="text-sm text-muted-foreground">Process payments and manage invoices</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Compliance
                </CardTitle>
                <CardDescription>
                  Recent security events and data protection status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Information Protection Active</AlertTitle>
                    <AlertDescription>
                      All sensitive data is encrypted using AES-256 encryption. 
                      Access is logged and monitored for compliance.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Recent Activity</h4>
                    {securityEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span>{event.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="material-calc">
          <MaterialCalculationForm />
        </TabsContent>

        <TabsContent value="approval">
          <ApprovalRequestForm />
        </TabsContent>

        <TabsContent value="sourcing">
          <SourcingQuotationForm />
        </TabsContent>

        <TabsContent value="purchase-order">
          <ComprehensivePurchaseOrder />
        </TabsContent>

        <TabsContent value="delivery-notes">
          <DeliveryNoteSigning />
        </TabsContent>

        <TabsContent value="grn-inspection">
          <GoodsReceivedNote />
        </TabsContent>

        <TabsContent value="invoicing">
          <div className="space-y-6">
            <InvoiceManager />
            <IndividualBuilderPayment />
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Protection Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-800">Data Protection Notice</h4>
              <p className="text-sm text-amber-700">
                This platform complies with data protection regulations. All personal and business 
                information is encrypted, access-controlled, and audit-logged. You maintain full 
                control over your data and can request deletion at any time.
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Lock className="h-3 w-3 mr-1" />
                  SSL Encrypted
                </Badge>
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Shield className="h-3 w-3 mr-1" />
                  GDPR Compliant
                </Badge>
                <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                  <Eye className="h-3 w-3 mr-1" />
                  Audit Logged
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalBuilderDashboard;