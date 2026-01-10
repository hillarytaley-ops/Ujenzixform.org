import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, Package, Download, DownloadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeWriter, BarcodeFormat, EncodeHintType } from '@zxing/library';

interface MaterialItem {
  id: string;
  qr_code: string;
  item_sequence: number;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
  purchase_order_id: string;
}

export const EnhancedQRCodeManager: React.FC = () => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);

      // Fetch material items based on role
      await fetchMaterialItems(roleData?.role || null, user.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialItems = async (role: string | null, userId: string) => {
    if (role === 'supplier') {
      // Get supplier's items
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (supplierData) {
        const { data, error } = await supabase
          .from('material_items')
          .select('*')
          .eq('supplier_id', supplierData.id)
          .order('created_at', { ascending: false });

        if (!error) setItems(data || []);
      }
    } else if (role === 'admin') {
      // Admin sees all items
      const { data, error } = await supabase
        .from('material_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setItems(data || []);
    }
  };

  const downloadQRCode = async (qrCode: string, materialType: string, itemSeq: number) => {
    try {
      // Large QR code size for easy scanning on any device
      // 800x800 pixels - optimal for printing on A4/Letter paper or stickers
      const qrSize = 800;
      const padding = 60; // White border around QR code
      const labelHeight = 180; // Space for text labels below QR
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const totalWidth = qrSize + (padding * 2);
      const totalHeight = qrSize + (padding * 2) + labelHeight;
      
      canvas.width = totalWidth;
      canvas.height = totalHeight;

      if (!ctx) return;

      const writer = new QRCodeWriter();
      const hints = new Map();
      hints.set(EncodeHintType.MARGIN, 2); // Slightly larger margin for better scanning
      hints.set(EncodeHintType.ERROR_CORRECTION, 2); // High error correction (L=0, M=1, Q=2, H=3)
      
      // Generate QR matrix at a smaller size, then scale up for crisp rendering
      const matrixSize = 200;
      const matrix = writer.encode(qrCode, BarcodeFormat.QR_CODE, matrixSize, matrixSize, hints);

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code scaled up for large, crisp output
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

      // Draw border around QR code area
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(padding - 10, padding - 10, qrSize + 20, qrSize + 20);

      // Add label section with background
      const labelY = padding + qrSize + 20;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(padding - 10, labelY, qrSize + 20, labelHeight - 30);
      ctx.strokeRect(padding - 10, labelY, qrSize + 20, labelHeight - 30);

      // Material type - large and bold
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(materialType.toUpperCase(), totalWidth / 2, labelY + 45);
      
      // Item number
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText(`ITEM #${itemSeq}`, totalWidth / 2, labelY + 85);
      
      // QR code string - monospace for readability
      ctx.fillStyle = '#64748b';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText(qrCode, totalWidth / 2, labelY + 120);

      // Add "SCAN ME" indicator at top
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('📱 SCAN ME', totalWidth / 2, 35);

      // Add company branding at bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('UjenziPro Material Tracking', totalWidth / 2, totalHeight - 15);

      const link = document.createElement('a');
      link.download = `QR_${qrCode}.png`;
      link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
      link.click();

      toast({
        title: "✅ QR Code Downloaded",
        description: `Large format QR (${qrSize}x${qrSize}px) - ${materialType} Item #${itemSeq}`,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadAllQRCodes = async () => {
    toast({
      title: "Downloading QR Codes",
      description: `Generating ${items.length} QR codes...`,
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300); // Stagger downloads
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-500',
      dispatched: 'bg-blue-500',
      in_transit: 'bg-purple-500',
      received: 'bg-orange-500',
      verified: 'bg-green-500',
      damaged: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="p-6">Loading QR codes...</div>;
  }

  if (!['admin', 'supplier'].includes(userRole || '')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Access restricted to suppliers and administrators.
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
                Material Item QR Codes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Unique QR code generated for each item. Attach to items and scan during dispatch/receiving.
              </p>
            </div>
            {items.length > 0 && (
              <Button onClick={downloadAllQRCodes} variant="outline">
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download All ({items.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items with QR codes yet</p>
              <p className="text-sm text-muted-foreground">
                QR codes are auto-generated when purchase orders are confirmed
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item #</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      #{item.item_sequence}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.qr_code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.material_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(item.status)} text-white`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
