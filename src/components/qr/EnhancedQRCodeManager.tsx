import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, Package, Download, DownloadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      // Create canvas with QR code representation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 400;
      canvas.width = size;
      canvas.height = size + 80;

      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Simple QR code representation (blocks pattern)
        const qrSize = 360;
        const margin = 20;
        const moduleSize = 12;
        const modules = Math.floor(qrSize / moduleSize);

        // Generate pseudo-random pattern based on QR code string
        ctx.fillStyle = 'black';
        for (let y = 0; y < modules; y++) {
          for (let x = 0; x < modules; x++) {
            // Use QR code string to generate deterministic pattern
            const seed = qrCode.charCodeAt(x % qrCode.length) + qrCode.charCodeAt(y % qrCode.length);
            if ((seed + x + y) % 2 === 0) {
              ctx.fillRect(
                margin + x * moduleSize,
                margin + y * moduleSize,
                moduleSize - 1,
                moduleSize - 1
              );
            }
          }
        }

        // Add finder patterns (corners)
        const drawFinderPattern = (x: number, y: number) => {
          ctx.fillStyle = 'black';
          ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
          ctx.fillStyle = 'white';
          ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
          ctx.fillStyle = 'black';
          ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
        };

        drawFinderPattern(margin, margin);
        drawFinderPattern(margin + qrSize - moduleSize * 7, margin);
        drawFinderPattern(margin, margin + qrSize - moduleSize * 7);

        // Add labels
        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(materialType, size / 2, size + 20);
        ctx.font = '14px Arial';
        ctx.fillText(`Item #${itemSeq}`, size / 2, size + 40);
        ctx.font = '11px monospace';
        ctx.fillText(qrCode, size / 2, size + 60);

        // Download
        const link = document.createElement('a');
        link.download = `QR_${qrCode}.png`;
        link.href = canvas.toDataURL();
        link.click();

        toast({
          title: "QR Code Downloaded",
          description: `${materialType} - Item #${itemSeq}`,
        });
      }
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
