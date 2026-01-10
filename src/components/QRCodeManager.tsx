import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Package, Truck, CheckCircle, Plus, Eye, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from "@/types/userProfile";
import { QRCodeWriter, BarcodeFormat, EncodeHintType } from '@zxing/library';

interface MaterialQRCode {
  qr_code: string;
  material_type: string;
  quantity: number;
  unit: string;
  status: string;
  po_number: string;
  created_at: string;
  dispatched_at?: string;
  received_at?: string;
}

const QRCodeManager: React.FC = () => {
  const [qrCodes, setQrCodes] = useState<MaterialQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && userRole) {
      fetchQRCodes();
    }
  }, [user, userRole]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user role and profile
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name, user_type, is_professional, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else {
          // Get user role from user_roles table
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          
          setUserRole((roleData?.role as UserRole) || null);
          setUserProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodes = async () => {
    if (!userProfile?.id) return;
    
    try {
      // Use the new function to get supplier QR codes with purchase order info
      const { data, error } = await supabase.rpc('get_supplier_qr_codes' as any, {
        _supplier_id: userProfile.id
      });

      if (error) {
        console.error('Error fetching QR codes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch QR codes",
          variant: "destructive",
        });
      } else {
        setQrCodes((data || []) as MaterialQRCode[]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const downloadQRCode = (qrCode: string, materialType: string, poNumber: string) => {
    // Large QR code size for easy scanning on any device
    // 800x800 pixels - optimal for printing on A4/Letter paper or stickers
    const qrSize = 800;
    const padding = 60;
    const labelHeight = 200;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const totalWidth = qrSize + (padding * 2);
    const totalHeight = qrSize + (padding * 2) + labelHeight;
    
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    if (!ctx) return;

    const writer = new QRCodeWriter();
    const hints = new Map();
    hints.set(EncodeHintType.MARGIN, 2);
    
    // Generate QR matrix at smaller size, then scale up
    const matrixSize = 200;
    const matrix = writer.encode(qrCode, BarcodeFormat.QR_CODE, matrixSize, matrixSize, hints);

    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code scaled up
    ctx.fillStyle = 'black';
    const scale = qrSize / matrix.getWidth();
    
    for (let x = 0; x < matrix.getWidth(); x++) {
      for (let y = 0; y < matrix.getHeight(); y++) {
        if (matrix.get(x, y)) {
          ctx.fillRect(
            padding + (x * scale), 
            padding + (y * scale), 
            Math.ceil(scale), 
            Math.ceil(scale)
          );
        }
      }
    }

    // Draw border around QR code
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding - 10, padding - 10, qrSize + 20, qrSize + 20);

    // Label section
    const labelY = padding + qrSize + 20;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(padding - 10, labelY, qrSize + 20, labelHeight - 30);
    ctx.strokeRect(padding - 10, labelY, qrSize + 20, labelHeight - 30);

    // "SCAN ME" at top
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📱 SCAN ME', totalWidth / 2, 35);

    // Material type - large and bold
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(materialType.toUpperCase(), totalWidth / 2, labelY + 45);
    
    // PO Number
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(`PO: ${poNumber}`, totalWidth / 2, labelY + 90);
    
    // QR code string
    ctx.fillStyle = '#64748b';
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText(qrCode, totalWidth / 2, labelY + 130);

    // Branding
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('UjenziPro Material Tracking', totalWidth / 2, totalHeight - 15);

    const link = document.createElement('a');
    link.download = `QR_${qrCode}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach((code, index) => {
      setTimeout(() => {
        downloadQRCode(code.qr_code, code.material_type, code.po_number);
      }, index * 100); // Stagger downloads
    });
  };

  const updateQRStatus = async (qrCode: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.rpc('update_qr_status', {
        _qr_code: qrCode,
        _new_status: newStatus
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `QR Code status updated to ${newStatus}`,
      });

      fetchQRCodes();
    } catch (error) {
      console.error('Error updating QR status:', error);
      toast({
        title: "Error",
        description: "Failed to update QR code status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500';
      case 'dispatched':
        return 'bg-blue-500';
      case 'received':
        return 'bg-orange-500';
      case 'verified':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Package;
      case 'dispatched':
        return Truck;
      case 'received':
        return Package;
      case 'verified':
        return CheckCircle;
      default:
        return Package;
    }
  };

  if (loading) {
    return <div className="p-6">Loading QR codes...</div>;
  }

  if (!user || !['admin', 'supplier', 'builder'].includes(userRole || '')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in with appropriate permissions to access QR code management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6" />
                Material QR Code Manager
              </CardTitle>
              <p className="text-muted-foreground">
                QR codes are automatically generated when purchase orders are confirmed. Download and print them for dispatch tracking.
              </p>
            </div>
            {qrCodes.length > 0 && userRole === 'supplier' && (
              <Button onClick={downloadAllQRCodes} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All QR Codes
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {qrCodes.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No QR codes generated yet</p>
              <p className="text-sm text-muted-foreground">
                QR codes will appear here automatically when purchase orders are confirmed
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrCodes.map((qr, index) => {
                  const StatusIcon = getStatusIcon(qr.status);
                  return (
                    <TableRow key={`${qr.qr_code}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        {qr.qr_code}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{qr.material_type}</p>
                      </TableCell>
                      <TableCell>
                        {qr.quantity} {qr.unit}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {qr.po_number}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(qr.status)} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {qr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(qr.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadQRCode(qr.qr_code, qr.material_type, qr.po_number)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {qr.status === 'pending' && userRole === 'supplier' && (
                            <Button
                              size="sm"
                              onClick={() => updateQRStatus(qr.qr_code, 'dispatched')}
                            >
                              Mark Dispatched
                            </Button>
                          )}
                          {qr.status === 'dispatched' && userRole === 'admin' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateQRStatus(qr.qr_code, 'received')}
                            >
                              Mark Received
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-500" />
              <h4 className="font-medium">1. Auto-Generate</h4>
              <p className="text-sm text-muted-foreground">
                QR codes generated when purchase orders are confirmed
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Truck className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h4 className="font-medium">2. Dispatch</h4>
              <p className="text-sm text-muted-foreground">
                Materials are scanned for dispatch
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <h4 className="font-medium">3. Receive</h4>
              <p className="text-sm text-muted-foreground">
                UjenziPro staff scan upon receipt
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h4 className="font-medium">4. Verify</h4>
              <p className="text-sm text-muted-foreground">
                Final verification and quality check
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeManager;