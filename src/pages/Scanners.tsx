import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedSection from "@/components/AnimatedSection";
import { 
  Scan, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  QrCode,
  ArrowRight,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Shield,
  Eye,
  Search,
  Download,
  Upload
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DispatchScanner } from '@/components/qr/DispatchScanner';
import { ReceivingScanner } from '@/components/qr/ReceivingScanner';

interface ScannedMaterial {
  id: string;
  qrCode: string;
  materialType: string;
  quantity: string;
  supplier: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate?: string;
  quality: 'excellent' | 'good' | 'acceptable' | 'rejected';
  location: string;
  scannedBy: string;
  scannedAt: Date;
  status: 'dispatched' | 'in_transit' | 'received' | 'verified';
}

const Scanners = () => {
  const [activeTab, setActiveTab] = useState("dispatchable");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const { toast } = useToast();

  // Sample data for demonstration
  const [dispatchableMaterials] = useState<ScannedMaterial[]>([
    {
      id: "MAT-001",
      qrCode: "QR-CEMENT-001",
      materialType: "Portland Cement",
      quantity: "50 bags",
      supplier: "Bamburi Cement",
      batchNumber: "BC-2024-001",
      manufactureDate: "2024-01-15",
      quality: "excellent",
      location: "Bamburi Cement Store - Warehouse A",
      scannedBy: "John Doe (Supplier Staff)",
      scannedAt: new Date(),
      status: "dispatched"
    },
    {
      id: "MAT-002",
      qrCode: "QR-STEEL-002",
      materialType: "Steel Reinforcement Bars",
      quantity: "2 tons",
      supplier: "Devki Steel Mills",
      batchNumber: "DSM-2024-045",
      manufactureDate: "2024-01-10",
      quality: "excellent",
      location: "Devki Steel Store - Yard B",
      scannedBy: "Mary Smith (Supplier Staff)",
      scannedAt: new Date(Date.now() - 3600000),
      status: "in_transit"
    }
  ]);

  const [receivableMaterials] = useState<ScannedMaterial[]>([
    {
      id: "MAT-003",
      qrCode: "QR-SAND-003",
      materialType: "River Sand",
      quantity: "10 cubic meters",
      supplier: "Machakos Quarry",
      batchNumber: "MQ-2024-078",
      manufactureDate: "2024-01-12",
      quality: "good",
      location: "Westlands Construction Site - Material Bay",
      scannedBy: "Peter Wilson (UjenziPro Staff)",
      scannedAt: new Date(Date.now() - 7200000),
      status: "received"
    },
    {
      id: "MAT-004",
      qrCode: "QR-TILES-004",
      materialType: "Ceramic Floor Tiles",
      quantity: "500 pieces",
      supplier: "KAM Industries",
      batchNumber: "KAM-2024-156",
      manufactureDate: "2024-01-08",
      quality: "excellent",
      location: "Karen Residential Project - Finishing Materials",
      scannedBy: "Sarah Johnson (UjenziPro Staff)",
      scannedAt: new Date(Date.now() - 10800000),
      status: "verified"
    }
  ]);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        setUserRole((roleData?.role as any) || 'guest');
      } else {
        setUserRole('guest');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('guest');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin';

  const handleScanQR = async (qrCode: string) => {
    try {
      // Input validation and sanitization
      if (!qrCode || typeof qrCode !== 'string') {
        toast({
          title: "Invalid QR Code",
          description: "QR code data is invalid",
          variant: "destructive"
        });
        return;
      }

      // Sanitize QR code input
      const sanitizedQrCode = qrCode.trim().replace(/[<>\"'&]/g, '');
      
      if (sanitizedQrCode.length < 10 || sanitizedQrCode.length > 100) {
        toast({
          title: "Invalid QR Code Format",
          description: "QR code format is not recognized",
          variant: "destructive"
        });
        return;
      }

      setLastScannedCode(sanitizedQrCode);
      setIsScanning(false);

      // Enhanced security validation
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_qr_code_server_side', {
          qr_code_param: sanitizedQrCode
        });

      if (validationError) {
        console.error('QR validation error:', validationError);
        toast({
          title: "Validation Error",
          description: "Unable to validate QR code",
          variant: "destructive"
        });
        return;
      }

      const validation = validationResult?.[0];
      
      if (!validation?.is_valid) {
        toast({
          title: "Invalid QR Code",
          description: validation?.error_message || "QR code validation failed",
          variant: "destructive"
        });
        
        // Log security incident
        await supabase.rpc('log_qr_validation_failure', {
          qr_code_param: sanitizedQrCode,
          error_message: validation?.error_message || 'Validation failed'
        });
        return;
      }

      // Check rate limits
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_scan_rate_limit');

      if (rateLimitError || !rateLimitData?.[0]?.rate_limit_ok) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many scan attempts. Please wait before scanning again.",
          variant: "destructive"
        });
        return;
      }

      // Simulate finding material by QR code (with enhanced security)
      const foundMaterial = [...dispatchableMaterials, ...receivableMaterials]
        .find(m => m.qrCode === sanitizedQrCode);
      
      if (foundMaterial) {
        // Log successful scan
        await supabase.rpc('log_qr_validation_success', {
          qr_code_param: sanitizedQrCode,
          material_id_param: foundMaterial.id
        });

        toast({
          title: "Material Scanned Successfully",
          description: `Found: ${foundMaterial.materialType} - ${foundMaterial.quantity}`,
        });
      } else {
        toast({
          title: "Material Not Found",
          description: "QR code not recognized in the system",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: "Scan Error",
        description: "An error occurred while processing the QR code",
        variant: "destructive"
      });
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'acceptable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dispatched': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'received': return 'bg-green-100 text-green-800 border-green-200';
      case 'verified': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'dispatched': return <ArrowRight className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'received': return <ArrowLeft className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-construction flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading scanner system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <AnimatedSection animation="fadeInUp">
        <section 
          className="text-white py-24 relative overflow-hidden"
          role="banner"
          aria-labelledby="scanners-hero-heading"
        >
        {/* QR Scanner Mobile App Interface - Zoomed Out Background */}
        <div 
          className="absolute inset-0"
          style={{
              backgroundImage: `url('/scanners-hero-new.jpg?v=5'), url('/scanners-hero-bg.jpg?v=4'), url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"%3E%3Crect fill="%23e8e8e8" width="1920" height="1080"/%3E%3C/svg%3E')`,
            backgroundSize: 'contain',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundSize: 'contain',
            MozBackgroundSize: 'contain',
            backgroundColor: '#2d3748'
          }}
          role="img"
          aria-label="Professional QR code scanner mobile application interface with scanning frame and controls"
        />
        {/* Light overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-gray-900/40 to-black/50"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex justify-center">
              <Badge className="bg-gradient-to-r from-green-600 to-red-600 text-white px-8 py-3 text-xl font-bold border border-white/30 shadow-lg">
                🇰🇪 Advanced Material Tracking Technology
              </Badge>
            </div>
            
            <h1 id="scanners-hero-heading" className="text-6xl md:text-8xl font-bold mb-8 text-white drop-shadow-2xl flex items-center justify-center gap-4">
              <Scan className="h-16 w-16 md:h-20 md:w-20 text-primary" />
              Material Scanners
            </h1>
            
            <p className="text-2xl md:text-4xl mb-12 text-white/90 font-medium drop-shadow-lg leading-relaxed max-w-4xl mx-auto">
              <strong>Material Authentication System:</strong> Scan QR codes on construction materials to verify authenticity, 
              track materials from supplier warehouse to construction site, check quality certifications, 
              view product details and specifications, generate dispatch and receipt notes, maintain inventory records, 
              prevent counterfeit materials, ensure KEBS compliance, and create complete audit trails for every material delivery.
            </p>
            
            {/* Scanner Technology Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-green-400 mb-2">10K+</div>
                <div className="text-white font-medium">Materials Scanned</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-blue-400 mb-2">99.9%</div>
                <div className="text-white font-medium">Accuracy Rate</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-yellow-400 mb-2">2-Way</div>
                <div className="text-white font-medium">Scanning System</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-4xl font-bold text-red-400 mb-2">Real-Time</div>
                <div className="text-white font-medium">Verification</div>
              </div>
            </div>
            
            {/* Scanner Features Highlight */}
            <div className="flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <QrCode className="h-5 w-5" />
                <span className="font-medium">QR Technology</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Fraud Detection</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Eye className="h-5 w-5" />
                <span className="font-medium">Real-Time Tracking</span>
              </div>
            </div>
          </div>
        </div>
        </section>
      </AnimatedSection>

      <main className="py-20 relative overflow-hidden">
        {/* Clean gradient background for scanner interface */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto mb-12">
            {user ? (
              <div className="space-y-6">
                <div className="flex gap-2 justify-center mb-2">
                  <Button variant="outline" onClick={() => setActiveTab('dispatchable')}>Dispatch Scanner</Button>
                  <Button variant="outline" onClick={() => setActiveTab('receivable')}>Receiving Scanner</Button>
                </div>
                {activeTab === 'receivable' ? <ReceivingScanner /> : <DispatchScanner />}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">Sign in to use the scanner</div>
            )}
          </div>

        {/* Scanner Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="dispatchable" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Dispatchable
            </TabsTrigger>
            <TabsTrigger value="receivable" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Receivable
            </TabsTrigger>
          </TabsList>

          {/* Dispatchable Scanners Tab */}
          <TabsContent value="dispatchable" className="space-y-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading dispatch scanner…</div>}>
                  <DispatchScanner />
                </Suspense>
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Dispatchable Materials</h2>
                  <p className="text-muted-foreground">
                    <strong>For Suppliers:</strong> Scan materials at your store/warehouse before dispatching to construction sites
                  </p>
                </div>
                {isAdmin ? (
                  <Badge variant="outline" className="bg-blue-50">
                    {dispatchableMaterials.length} Items Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Admin Access Required
                  </Badge>
                )}
              </div>

              {isAdmin ? (
                <>
                  <div className="grid gap-4">
                    {dispatchableMaterials.map((material) => (
                      <Card key={material.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Upload className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{material.materialType}</CardTitle>
                                <CardDescription>QR: {material.qrCode} | Batch: {material.batchNumber}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getQualityColor(material.quality)}>
                                {material.quality}
                              </Badge>
                              <Badge className={getStatusColor(material.status)}>
                                {getStatusIcon(material.status)}
                                {material.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <span className="text-muted-foreground text-sm">Quantity:</span>
                              <p className="font-medium">{material.quantity}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Supplier:</span>
                              <p className="font-medium">{material.supplier}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Location:</span>
                              <p className="font-medium">{material.location}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Manufacture Date:</span>
                              <p className="font-medium">{material.manufactureDate}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Scanned by {material.scannedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {material.scannedAt.toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <QrCode className="h-4 w-4 mr-2" />
                                View QR
                              </Button>
                              <Button variant="outline" size="sm">
                                <Truck className="h-4 w-4 mr-2" />
                                Dispatch
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Dispatch Summary */}
                  <Card className="mt-6 border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Upload className="h-5 w-5" />
                        Dispatch Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {dispatchableMaterials.filter(m => m.status === 'dispatched').length}
                          </div>
                          <p className="text-sm text-blue-700">Ready to Dispatch</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {dispatchableMaterials.filter(m => m.status === 'in_transit').length}
                          </div>
                          <p className="text-sm text-yellow-700">In Transit</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {dispatchableMaterials.filter(m => m.quality === 'excellent').length}
                          </div>
                          <p className="text-sm text-green-700">Excellent Quality</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Supplier dispatch data and material statistics are restricted to admin users only.
                  </p>
                  <Alert className="max-w-md mx-auto border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Access Restriction:</strong> This section contains sensitive material dispatch data, 
                      warehouse information, and inventory statistics that require administrative privileges.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Receivable Scanners Tab */}
          <TabsContent value="receivable" className="space-y-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading receiving scanner…</div>}>
                  <ReceivingScanner />
                </Suspense>
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Receivable Materials</h2>
                  <p className="text-muted-foreground">
                    <strong>For UjenziPro Staff:</strong> Scan and verify materials upon arrival at construction sites
                  </p>
                </div>
                {isAdmin ? (
                  <Badge variant="outline" className="bg-green-50">
                    {receivableMaterials.length} Items Received
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Admin Access Required
                  </Badge>
                )}
              </div>

              {isAdmin ? (
                <>
                  <div className="grid gap-4">
                    {receivableMaterials.map((material) => (
                      <Card key={material.id} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-lg">
                                <Download className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{material.materialType}</CardTitle>
                                <CardDescription>QR: {material.qrCode} | Batch: {material.batchNumber}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getQualityColor(material.quality)}>
                                {material.quality}
                              </Badge>
                              <Badge className={getStatusColor(material.status)}>
                                {getStatusIcon(material.status)}
                                {material.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <span className="text-muted-foreground text-sm">Quantity:</span>
                              <p className="font-medium">{material.quantity}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Supplier:</span>
                              <p className="font-medium">{material.supplier}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Site Location:</span>
                              <p className="font-medium">{material.location}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-sm">Received Date:</span>
                              <p className="font-medium">{material.manufactureDate}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Received by {material.scannedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {material.scannedAt.toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <QrCode className="h-4 w-4 mr-2" />
                                View QR
                              </Button>
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify Quality
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Receipt Summary */}
                  <Card className="mt-6 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Download className="h-5 w-5" />
                        Receipt Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {receivableMaterials.filter(m => m.status === 'received').length}
                          </div>
                          <p className="text-sm text-green-700">Materials Received</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {receivableMaterials.filter(m => m.status === 'verified').length}
                          </div>
                          <p className="text-sm text-purple-700">Quality Verified</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {receivableMaterials.filter(m => m.quality === 'excellent').length}
                          </div>
                          <p className="text-sm text-green-700">Excellent Quality</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-muted-foreground mb-4">
                    UjenziPro staff site data and material verification statistics are restricted to admin users only.
                  </p>
                  <Alert className="max-w-md mx-auto border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Access Restriction:</strong> This section contains sensitive material receipt data, 
                      site verification information, and inventory statistics that require administrative privileges.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Scanners;