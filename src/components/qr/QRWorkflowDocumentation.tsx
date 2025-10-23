import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  QrCode, 
  Truck, 
  CheckCircle, 
  BarChart3,
  Download,
  Camera,
  Scan,
  AlertTriangle,
  Clock,
  Shield,
  BookOpen,
  Play
} from 'lucide-react';
import { TooltipGuide } from '@/components/ui/tooltip-guide';
import { qrSystemGuide } from '@/data/userGuides';

interface QRWorkflowDocumentationProps {
  embedded?: boolean;
  showFullGuide?: boolean;
}

export const QRWorkflowDocumentation: React.FC<QRWorkflowDocumentationProps> = ({ 
  embedded = false,
  showFullGuide = true 
}) => {
  const WorkflowOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <QrCode className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">Auto</div>
            <p className="text-xs text-muted-foreground">QR Generation</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <Truck className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">Dispatch</div>
            <p className="text-xs text-muted-foreground">Tracking</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">Receive</div>
            <p className="text-xs text-muted-foreground">Verification</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">Analytics</div>
            <p className="text-xs text-muted-foreground">Insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Process Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR System Process Flow
          </CardTitle>
          <CardDescription>
            Complete material tracking from purchase order to site delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step 1: Auto Generation */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800">Automatic QR Generation</h4>
                <p className="text-sm text-blue-700 mb-2">
                  When purchase order is confirmed, unique QR codes are automatically generated for each material item.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Instant
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Format: UJP-CATEGORY-PO-ITEM-DATE-RAND
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 2: Supplier Download */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-orange-50">
              <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800">Supplier Downloads QR Codes</h4>
                <p className="text-sm text-orange-700 mb-2">
                  Suppliers access Enhanced QR Code Manager to download and print QR codes for physical attachment.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    PNG Format
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Individual or Bulk Download
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 3: Dispatch Scanning */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-yellow-50">
              <div className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800">Dispatch Scanning</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  Suppliers scan QR codes when materials leave their facility, updating status to "dispatched".
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Camera className="h-3 w-3 mr-1" />
                    Camera Scan
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Scan className="h-3 w-3 mr-1" />
                    Physical Scanner
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 4: Receiving */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800">Site Receiving & Verification</h4>
                <p className="text-sm text-green-700 mb-2">
                  UjenziPro staff scan materials upon arrival, verify condition, and update status to "received".
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Quality Check
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Condition Recording
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 5: Analytics */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-purple-50">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-800">Admin Analytics & Monitoring</h4>
                <p className="text-sm text-purple-700 mb-2">
                  Comprehensive dashboard for tracking performance, transit times, and audit trails.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin Only
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Real-time Data
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const QuickReference = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scanner Types Supported</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Camera className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h4 className="font-medium">Mobile Camera</h4>
              <p className="text-xs text-muted-foreground">Phone/tablet camera scanning</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Scan className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h4 className="font-medium">Physical Scanner</h4>
              <p className="text-xs text-muted-foreground">USB/Bluetooth barcode scanners</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <QrCode className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h4 className="font-medium">Web Scanner</h4>
              <p className="text-xs text-muted-foreground">Browser-based scanning</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-gray-100 text-gray-800">pending</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="bg-orange-100 text-orange-800">dispatched</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="bg-green-100 text-green-800">received</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="bg-blue-100 text-blue-800">verified</Badge>
            </div>
            <div className="text-center">
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                damaged (can occur at any stage)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security & Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium">Suppliers</span>
              <span className="text-xs text-muted-foreground">View own items only</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-sm font-medium">Builders</span>
              <span className="text-xs text-muted-foreground">View items from their POs</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
              <span className="text-sm font-medium">Admins</span>
              <span className="text-xs text-muted-foreground">Full system access & analytics</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR System Workflow
              </CardTitle>
              <CardDescription>
                Complete material tracking system documentation
              </CardDescription>
            </div>
            {showFullGuide && (
              <TooltipGuide 
                guide={qrSystemGuide}
                trigger={
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Interactive Guide
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <WorkflowOverview />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <QrCode className="h-8 w-8" />
            QR System Workflow Documentation
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive guide to the material tracking and QR code system
          </p>
        </div>
        {showFullGuide && (
          <TooltipGuide 
            guide={qrSystemGuide}
            trigger={
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Start Interactive Guide
              </Button>
            }
          />
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Workflow Overview</TabsTrigger>
          <TabsTrigger value="reference">Quick Reference</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <WorkflowOverview />
        </TabsContent>
        
        <TabsContent value="reference" className="space-y-4">
          <QuickReference />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QRWorkflowDocumentation;

















