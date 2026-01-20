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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { QrCode, Package, Download, DownloadCloud, Maximize2, Truck, Clock, CheckCircle, RefreshCw, User, Mail, Phone, AlertCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  // New fields for client identity
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  item_unit_price?: number;
  item_total_price?: number;
  dispatch_scanned?: boolean;
  dispatch_scanned_at?: string;
  receive_scanned?: boolean;
  receive_scanned_at?: string;
}

interface ClientGroup {
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_items: number;
  pending_items: number;
  dispatched_items: number;
  received_items: number;
  items: MaterialItem[];
}

export const EnhancedQRCodeManager: React.FC = () => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'by-client'>('by-client');
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
    console.log('🔍 EnhancedQRCodeManager: Fetching items for role:', role, 'userId:', userId);
    
    if (role === 'supplier') {
      // Get supplier's record from suppliers table
      // Try by user_id first (direct auth user ID)
      let { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, company_name, user_id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('📦 Supplier lookup by user_id:', supplierData, 'Error:', supplierError);

      // If not found, try looking up by email match
      if (!supplierData) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          console.log('🔍 Trying to find supplier by email:', userData.user.email);
          const { data: supplierByEmail } = await supabase
            .from('suppliers')
            .select('id, company_name, user_id, email')
            .eq('email', userData.user.email)
            .maybeSingle();
          
          console.log('📦 Supplier lookup by email:', supplierByEmail);
          if (supplierByEmail) {
            supplierData = supplierByEmail;
          }
        }
      }

      // Also try via profile lookup
      if (!supplierData) {
        console.log('🔍 Trying to find supplier via profile...');
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileData) {
          console.log('📋 Found profile with id:', profileData.id);
          const { data: supplierByProfile } = await supabase
            .from('suppliers')
            .select('id, company_name, user_id')
            .eq('user_id', profileData.id)
            .maybeSingle();
          
          console.log('📦 Supplier lookup by profile.id:', supplierByProfile);
          if (supplierByProfile) {
            supplierData = supplierByProfile;
          }
        }
      }

      if (supplierData) {
        console.log('✅ Found supplier:', supplierData.company_name, 'ID:', supplierData.id);
        const { data, error } = await supabase
          .from('material_items')
          .select('*')
          .eq('supplier_id', supplierData.id)
          .order('created_at', { ascending: false });

        console.log('🏷️ Material items found:', data?.length || 0, 'Error:', error);
        if (!error) {
          setItems(data || []);
          // Group items by client
          groupItemsByClient(data || []);
        }
      } else {
        console.log('⚠️ No supplier record found for user.');
        // Show all items for debugging
        const { data } = await supabase
          .from('material_items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        console.log('📋 All material items (first 10) for debugging:', data);
      }
    } else if (role === 'admin') {
      // Admin sees all items
      const { data, error } = await supabase
        .from('material_items')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('👑 Admin: Material items found:', data?.length || 0);
      if (!error) {
        setItems(data || []);
        // Group items by client
        groupItemsByClient(data || []);
      }
    }
  };

  // Group items by client/buyer
  const groupItemsByClient = (materialItems: MaterialItem[]) => {
    const groups: Record<string, ClientGroup> = {};
    
    materialItems.forEach(item => {
      const buyerId = item.buyer_id || 'unknown';
      
      if (!groups[buyerId]) {
        groups[buyerId] = {
          buyer_id: buyerId,
          buyer_name: item.buyer_name || 'Unknown Client',
          buyer_email: item.buyer_email || '',
          buyer_phone: item.buyer_phone || '',
          total_items: 0,
          pending_items: 0,
          dispatched_items: 0,
          received_items: 0,
          items: []
        };
      }
      
      groups[buyerId].total_items++;
      groups[buyerId].items.push(item);
      
      if (item.status === 'pending') groups[buyerId].pending_items++;
      else if (item.status === 'dispatched' || item.status === 'in_transit') groups[buyerId].dispatched_items++;
      else if (item.status === 'received' || item.status === 'verified') groups[buyerId].received_items++;
    });
    
    // Sort groups by most recent activity
    const sortedGroups = Object.values(groups).sort((a, b) => b.total_items - a.total_items);
    setClientGroups(sortedGroups);
    console.log('📊 Client groups:', sortedGroups.length);
  };

  const downloadQRCode = async (qrCode: string, materialType: string, itemSeq: number) => {
    try {
      // Large QR code size for easy scanning on any device
      const qrSize = 600;
      const padding = 60;
      const labelHeight = 180;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const totalWidth = qrSize + (padding * 2);
      const totalHeight = qrSize + (padding * 2) + labelHeight;
      
      canvas.width = totalWidth;
      canvas.height = totalHeight;

      if (!ctx) return;

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create temporary canvas for QR code using qrcode library
      const qrCanvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(qrCanvas, qrCode, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Draw QR code onto main canvas
      ctx.drawImage(qrCanvas, padding, padding);

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
      // Truncate if too long
      const displayCode = qrCode.length > 40 ? qrCode.substring(0, 37) + '...' : qrCode;
      ctx.fillText(displayCode, totalWidth / 2, labelY + 120);

      // Add "SCAN ME" indicator at top
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('📱 SCAN ME', totalWidth / 2, 35);

      // Add company branding at bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('UjenziPro Material Tracking', totalWidth / 2, totalHeight - 15);

      const link = document.createElement('a');
      link.download = `QR_${materialType.replace(/\s+/g, '_')}_Item${itemSeq}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: "✅ QR Code Downloaded",
        description: `${materialType} - Item #${itemSeq}`,
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
      {/* Header with Download All and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-7 w-7 text-cyan-500" />
            Material Item QR Codes
          </h2>
          <p className="text-muted-foreground mt-1">
            {items.length} unique QR codes • {clientGroups.length} clients
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <Button 
              variant={viewMode === 'by-client' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('by-client')}
              className={viewMode === 'by-client' ? 'bg-cyan-600' : ''}
            >
              <User className="h-4 w-4 mr-1" />
              By Client
            </Button>
            <Button 
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('all')}
              className={viewMode === 'all' ? 'bg-cyan-600' : ''}
            >
              <QrCode className="h-4 w-4 mr-1" />
              All QR Codes
            </Button>
          </div>
          {items.length > 0 && (
            <Button onClick={downloadAllQRCodes} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
              <DownloadCloud className="h-4 w-4 mr-2" />
              Download All ({items.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-yellow-700">{items.filter(i => i.status === 'pending').length}</p>
              <p className="text-sm text-yellow-600">Pending Dispatch</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Truck className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{items.filter(i => i.status === 'dispatched' || i.status === 'in_transit').length}</p>
              <p className="text-sm text-blue-600">In Transit</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{items.filter(i => i.status === 'received' || i.status === 'verified').length}</p>
              <p className="text-sm text-green-600">Received</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{clientGroups.length}</p>
              <p className="text-sm text-purple-600">Active Clients</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Code Display */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <QrCode className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No QR Codes Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              QR codes are automatically generated when purchase orders are confirmed. 
              Each item gets a unique QR code with client identity embedded.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'by-client' ? (
        /* Client-Grouped View */
        <Accordion type="multiple" className="space-y-4" defaultValue={clientGroups.slice(0, 3).map(g => g.buyer_id)}>
          {clientGroups.map((group) => (
            <AccordionItem key={group.buyer_id} value={group.buyer_id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-lg">{group.buyer_name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {group.buyer_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {group.buyer_email}
                          </span>
                        )}
                        {group.buyer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {group.buyer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {group.pending_items} pending
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {group.dispatched_items} dispatched
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {group.received_items} received
                    </Badge>
                    <Badge className="bg-cyan-600">
                      {group.total_items} items
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.items.map((item) => (
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
                      showClientInfo={false}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        /* All QR Codes View */
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
              showClientInfo={true}
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

// QR Code Card Component with LARGE QR Image and Client Info
const QRCodeCard: React.FC<{
  item: MaterialItem;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  downloadQRCode: (qrCode: string, materialType: string, itemSeq: number) => void;
  onViewFullSize: () => void;
  showClientInfo?: boolean;
}> = ({ item, getStatusColor, getStatusIcon, downloadQRCode, onViewFullSize, showClientInfo = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && item.qr_code) {
      QRCodeLib.toCanvas(canvasRef.current, item.qr_code, {
        width: 200,
        margin: 2,
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
          <div className="flex gap-2">
            {/* Scan Status Indicators */}
            {item.dispatch_scanned !== undefined && (
              <Badge 
                variant="outline" 
                className={item.dispatch_scanned ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500'}
                title={item.dispatch_scanned ? `Dispatched: ${new Date(item.dispatch_scanned_at || '').toLocaleString()}` : 'Not dispatched yet'}
              >
                {item.dispatch_scanned ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldX className="h-3 w-3 mr-1" />}
                Dispatch
              </Badge>
            )}
            {item.receive_scanned !== undefined && (
              <Badge 
                variant="outline" 
                className={item.receive_scanned ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500'}
                title={item.receive_scanned ? `Received: ${new Date(item.receive_scanned_at || '').toLocaleString()}` : 'Not received yet'}
              >
                {item.receive_scanned ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldX className="h-3 w-3 mr-1" />}
                Receive
              </Badge>
            )}
            <Badge className={getStatusColor(item.status)}>
              {getStatusIcon(item.status)}
              <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
            </Badge>
          </div>
        </div>
        <CardDescription>Item #{item.item_sequence} • {item.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Client Info (when showing all QR codes) */}
        {showClientInfo && item.buyer_name && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
            <p className="text-xs text-cyan-600 font-medium mb-1">CLIENT</p>
            <p className="font-semibold text-cyan-800">{item.buyer_name}</p>
            {item.buyer_email && (
              <p className="text-sm text-cyan-600 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {item.buyer_email}
              </p>
            )}
            {item.buyer_phone && (
              <p className="text-sm text-cyan-600 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {item.buyer_phone}
              </p>
            )}
          </div>
        )}

        {/* QR Code and Details Row */}
        <div className="flex gap-4">
          {/* QR Code Image */}
          <div 
            className="p-2 bg-white rounded-lg border-2 border-cyan-200 shadow cursor-pointer hover:scale-[1.02] transition-transform flex-shrink-0"
            onClick={onViewFullSize}
            title="Click to view full size"
          >
            <div className="relative">
              <canvas ref={canvasRef} className="rounded" />
              <div className="absolute -bottom-1 -right-1 bg-cyan-600 text-white p-1 rounded-full shadow">
                <Maximize2 className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded text-center">
                <p className="text-gray-500 text-xs">Quantity</p>
                <p className="font-bold">{item.quantity} {item.unit}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <p className="text-gray-500 text-xs">Category</p>
                <p className="font-bold text-sm">{item.category}</p>
              </div>
            </div>
            {item.item_total_price && item.item_total_price > 0 && (
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-green-600 text-xs">Total Value</p>
                <p className="font-bold text-green-700">KES {item.item_total_price.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Value */}
        <div className="text-center">
          <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded break-all">
            {item.qr_code}
          </p>
        </div>

        {/* One-Time Scan Warning */}
        {(item.dispatch_scanned || item.receive_scanned) && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {item.dispatch_scanned && item.receive_scanned 
                ? 'This QR code has been fully scanned (dispatch + receive)'
                : item.dispatch_scanned 
                  ? 'Dispatch scan completed. Awaiting receive scan.'
                  : 'Receive scan completed.'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={onViewFullSize}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Full Size
          </Button>
          <Button 
            size="sm"
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            onClick={() => downloadQRCode(item.qr_code, item.material_type, item.item_sequence)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Full Size QR Dialog for Scanning with Client Info
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
            Unique QR code for this item. Can only be scanned ONCE per scan type.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Client Info Banner */}
          {item.buyer_name && (
            <div className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl p-4">
              <p className="text-sm opacity-80 mb-1">FOR CLIENT</p>
              <p className="text-xl font-bold">{item.buyer_name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                {item.buyer_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" /> {item.buyer_email}
                  </span>
                )}
                {item.buyer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {item.buyer_phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MASSIVE QR Code */}
          <div className="p-6 bg-white rounded-2xl shadow-2xl border-4 border-cyan-300">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
          
          {/* Scan Status */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl text-center ${item.dispatch_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.dispatch_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.dispatch_scanned ? 'text-green-700' : 'text-gray-500'}`}>Dispatch Scan</p>
              </div>
              {item.dispatch_scanned ? (
                <p className="text-sm text-green-600">✓ Scanned {item.dispatch_scanned_at ? new Date(item.dispatch_scanned_at).toLocaleDateString() : ''}</p>
              ) : (
                <p className="text-sm text-gray-500">Not scanned yet</p>
              )}
            </div>
            <div className={`p-4 rounded-xl text-center ${item.receive_scanned ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100 border-2 border-gray-300'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.receive_scanned ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldX className="h-6 w-6 text-gray-400" />}
                <p className={`font-bold ${item.receive_scanned ? 'text-green-700' : 'text-gray-500'}`}>Receive Scan</p>
              </div>
              {item.receive_scanned ? (
                <p className="text-sm text-green-600">✓ Scanned {item.receive_scanned_at ? new Date(item.receive_scanned_at).toLocaleDateString() : ''}</p>
              ) : (
                <p className="text-sm text-gray-500">Not scanned yet</p>
              )}
            </div>
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
              <p className="font-bold text-xl">{item.category}</p>
            </div>
          </div>

          {/* One-Time Scan Warning */}
          <div className="w-full flex items-center gap-3 text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">One-Time Scan Protection</p>
              <p className="text-sm">Each QR code can only be scanned ONCE for dispatch and ONCE for receiving. This prevents duplicate scans and ensures accurate tracking.</p>
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