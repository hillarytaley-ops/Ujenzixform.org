import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { QrCode, Package, Download, DownloadCloud, Maximize2, Truck, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeWriter, BarcodeFormat, EncodeHintType } from '@zxing/library';
import QRCodeLib from 'qrcode';

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
      pending: 'bg-yellow-100 text-yellow-800',
      dispatched: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      received: 'bg-orange-100 text-orange-800',
      verified: 'bg-green-100 text-green-800',
      damaged: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'dispatched': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'received': 
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="ml-2 text-muted-foreground">Loading QR codes...</span>
      </div>
    );
  }

  // State for QR dialog
  const [selectedItem, setSelectedItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);

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
      {/* Header with Download All */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-7 w-7 text-cyan-500" />
            Material Item QR Codes
          </h2>
          <p className="text-muted-foreground mt-1">
            {items.length} QR codes ready for dispatch. Print and attach to materials.
          </p>
        </div>
        {items.length > 0 && (
          <Button onClick={downloadAllQRCodes} size="lg" className="bg-cyan-600 hover:bg-cyan-700">
            <DownloadCloud className="h-5 w-5 mr-2" />
            Download All ({items.length})
          </Button>
        )}
      </div>

      {/* QR Code Cards */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <QrCode className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No QR Codes Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              QR codes are automatically generated when purchase orders are confirmed. 
              Once a builder accepts your quote, QR codes will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((item) => (
            <QRCodeCard 
              key={item.id}
              item={item}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              downloadQRCode={downloadQRCode}
              onViewFullSize={() => {
                setSelectedItem(item);
                setShowQRDialog(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Full Size QR Dialog */}
      <QRCodeFullDialog 
        isOpen={showQRDialog}
        onClose={() => {
          setShowQRDialog(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        downloadQRCode={downloadQRCode}
      />
    </div>
  );
};

// QR Code Card Component with LARGE QR Image
const QRCodeCard: React.FC<{
  item: MaterialItem;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
  onViewFullSize: () => void;
}> = ({ item, getStatusColor, getStatusIcon, downloadQRCode, onViewFullSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item.qr_code) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 250,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item.qr_code]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{item.material_type}</CardTitle>
          <Badge className={getStatusColor(item.status)}>
            {getStatusIcon(item.status)}
            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
          </Badge>
        </div>
        <CardDescription>Item #{item.item_sequence} • {item.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LARGE QR Code Image */}
        <div className="flex justify-center">
          <div 
            className="p-4 bg-white rounded-xl border-4 border-cyan-200 shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={onViewFullSize}
            title="Click to view full size"
          >
            <div className="relative">
              <canvas ref={canvasRef} className="rounded-lg" />
              <div className="absolute -bottom-2 -right-2 bg-cyan-600 text-white p-1.5 rounded-full shadow-lg">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Value */}
        <div className="text-center">
          <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded-lg break-all">
            {item.qr_code}
          </p>
        </div>

        {/* Item Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-gray-500 text-xs">Quantity</p>
            <p className="font-bold text-lg">{item.quantity} {item.unit}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-gray-500 text-xs">Category</p>
            <p className="font-bold text-lg">{item.category}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onViewFullSize}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            View Full Size
          </Button>
          <Button 
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Full Size QR Dialog for Scanning
const QRCodeFullDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
}> = ({ isOpen, onClose, item, downloadQRCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item?.qr_code && isOpen) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 400,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR Code generation error:', err));
    }
  }, [item?.qr_code, isOpen]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QrCode className="h-7 w-7 text-cyan-600" />
            {item.material_type}
          </DialogTitle>
          <DialogDescription className="text-base">
            Print this QR code and attach it to the material before dispatch
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* MASSIVE QR Code */}
          <div className="p-6 bg-white rounded-2xl shadow-2xl border-4 border-cyan-300">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
          
          {/* QR Code Value */}
          <div className="w-full text-center">
            <p className="font-mono text-base bg-gray-100 px-4 py-3 rounded-lg break-all">
              {item.qr_code}
            </p>
          </div>
          
          {/* Item Details */}
          <div className="w-full grid grid-cols-3 gap-4">
            <div className="bg-cyan-50 p-4 rounded-xl text-center">
              <p className="text-cyan-600 text-sm font-medium">Item #</p>
              <p className="font-bold text-2xl">{item.item_sequence}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-blue-600 text-sm font-medium">Quantity</p>
              <p className="font-bold text-2xl">{item.quantity} {item.unit}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-green-600 text-sm font-medium">Category</p>
              <p className="font-bold text-2xl">{item.category}</p>
            </div>
          </div>
          
          {/* Download Button */}
          <Button 
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)} 
            className="w-full text-lg py-6 bg-cyan-600 hover:bg-cyan-700" 
            size="lg"
          >
            <Download className="h-6 w-6 mr-3" />
            Download High-Resolution QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
