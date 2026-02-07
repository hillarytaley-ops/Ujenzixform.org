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
import { QrCode, Package, Download, DownloadCloud, Maximize2, Truck, Clock, CheckCircle, RefreshCw, User, Mail, Phone, AlertCircle, ShieldCheck, ShieldX, Printer, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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

interface EnhancedQRCodeManagerProps {
  supplierId?: string; // Optional: pass supplier ID directly to skip lookup
}

export const EnhancedQRCodeManager: React.FC<EnhancedQRCodeManagerProps> = ({ supplierId: propSupplierId }) => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MaterialItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'by-client'>('all'); // Default to 'all' - sorted by date, newest first
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(propSupplierId || null);
  const { toast } = useToast();

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all items for a client
  const selectAllClientItems = (clientGroup: ClientGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      clientGroup.items.forEach(item => newSet.add(item.id));
      return newSet;
    });
  };

  // Deselect all items for a client
  const deselectAllClientItems = (clientGroup: ClientGroup) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      clientGroup.items.forEach(item => newSet.delete(item.id));
      return newSet;
    });
  };

  // Check if all client items are selected
  const areAllClientItemsSelected = (clientGroup: ClientGroup) => {
    return clientGroup.items.every(item => selectedItems.has(item.id));
  };

  // Get selected items count for a client
  const getSelectedCountForClient = (clientGroup: ClientGroup) => {
    return clientGroup.items.filter(item => selectedItems.has(item.id)).length;
  };

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
    console.log('🔍 EnhancedQRCodeManager: Fetching items for role:', role, 'userId (auth.uid):', userId);
    console.log('🔍 Prop supplierId:', propSupplierId);
    
    if (role === 'supplier') {
      let supplierData: any = null;
      let finalSupplierId: string | null = propSupplierId || null;

      // If supplierId was passed as prop, use it directly
      if (propSupplierId) {
        console.log('✅ Using prop supplierId directly:', propSupplierId);
        const { data: supplierById } = await supabase
          .from('suppliers')
          .select('id, company_name, user_id, email')
          .eq('id', propSupplierId)
          .maybeSingle();
        
        if (supplierById) {
          supplierData = supplierById;
          finalSupplierId = supplierById.id;
        }
      }

      // If no prop, look up via profile chain
      if (!supplierData) {
        // Step 1: Get profile.id for this auth user (suppliers.user_id references profiles.id)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('user_id', userId)
          .maybeSingle();
        
        console.log('📋 Profile lookup by auth.uid:', profileData);

        if (profileData) {
          // Step 2: Find supplier by profile.id (this is what suppliers.user_id references)
          const { data: supplierByProfile, error: profileError } = await supabase
            .from('suppliers')
            .select('id, company_name, user_id, email')
            .eq('user_id', profileData.id)
            .maybeSingle();
          
          console.log('📦 Supplier lookup by profile.id:', supplierByProfile, 'Error:', profileError);
          if (supplierByProfile) {
            supplierData = supplierByProfile;
            finalSupplierId = supplierByProfile.id;
          }
        }
      }

      // Fallback: Try direct user_id match (in case some suppliers use auth.uid directly)
      if (!supplierData) {
        const { data: supplierByUserId, error: userIdError } = await supabase
          .from('suppliers')
          .select('id, company_name, user_id, email')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('📦 Supplier lookup by auth.uid directly:', supplierByUserId, 'Error:', userIdError);
        if (supplierByUserId) {
          supplierData = supplierByUserId;
          finalSupplierId = supplierByUserId.id;
        }
      }

      // Fallback: Try by email match
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
            finalSupplierId = supplierByEmail.id;
          }
        }
      }
      
      // Store the resolved supplier ID
      if (finalSupplierId) {
        setResolvedSupplierId(finalSupplierId);
      }

      if (supplierData) {
        console.log('✅ Found supplier:', supplierData.company_name, 'ID:', supplierData.id);
        
        // Fetch ALL material items for this supplier - no limit, newest first
        const { data, error } = await supabase
          .from('material_items')
          .select('*')
          .eq('supplier_id', supplierData.id)
          .order('created_at', { ascending: false })
          .limit(1000); // Ensure we get all recent items
        
        console.log('🏷️ Material items query for supplier_id:', supplierData.id);
        console.log('🏷️ First item created_at:', data?.[0]?.created_at);
        console.log('🏷️ Last item created_at:', data?.[data?.length - 1]?.created_at);

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

  // Group items by client/buyer - sorted by most recent first
  const groupItemsByClient = (materialItems: MaterialItem[]) => {
    const groups: Record<string, ClientGroup & { latestDate: string }> = {};
    
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
          items: [],
          latestDate: item.created_at || ''
        };
      }
      
      groups[buyerId].total_items++;
      groups[buyerId].items.push(item);
      
      // Track the most recent item date for this client
      if (item.created_at && item.created_at > groups[buyerId].latestDate) {
        groups[buyerId].latestDate = item.created_at;
      }
      
      if (item.status === 'pending') groups[buyerId].pending_items++;
      else if (item.status === 'dispatched' || item.status === 'in_transit') groups[buyerId].dispatched_items++;
      else if (item.status === 'received' || item.status === 'verified') groups[buyerId].received_items++;
    });
    
    // Sort groups by most recent activity (newest first), not by total items
    const sortedGroups = Object.values(groups).sort((a, b) => {
      // Sort by latest date descending (newest first)
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });
    
    // Also sort items within each group by date (newest first)
    sortedGroups.forEach(group => {
      group.items.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    
    setClientGroups(sortedGroups);
    console.log('📊 Client groups:', sortedGroups.length, '- sorted by most recent activity');
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

  // Download selected QR codes only
  const downloadSelectedQRCodes = async () => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    if (selectedItemsList.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select QR codes to download",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Downloading Selected QR Codes",
      description: `Generating ${selectedItemsList.length} QR codes...`,
    });

    for (let i = 0; i < selectedItemsList.length; i++) {
      const item = selectedItemsList[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300);
    }
  };

  // Download all QR codes for a specific client
  const downloadClientQRCodes = async (clientGroup: ClientGroup, selectedOnly: boolean = false) => {
    const itemsToDownload = selectedOnly 
      ? clientGroup.items.filter(item => selectedItems.has(item.id))
      : clientGroup.items;

    if (itemsToDownload.length === 0) {
      toast({
        title: "No items to download",
        description: selectedOnly ? "Please select QR codes to download" : "No items found",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Downloading Client QR Codes",
      description: `Generating ${itemsToDownload.length} QR codes for ${clientGroup.buyer_name}...`,
    });

    for (let i = 0; i < itemsToDownload.length; i++) {
      const item = itemsToDownload[i];
      setTimeout(() => {
        downloadQRCode(item.qr_code, item.material_type, item.item_sequence);
      }, i * 300); // Stagger downloads
    }
  };

  // Print selected QR codes only
  const printSelectedQRCodes = async () => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    if (selectedItemsList.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select QR codes to print",
        variant: "destructive",
      });
      return;
    }

    await printItemsList(selectedItemsList, "Selected QR Codes", `${selectedItemsList.length} selected items`);
  };

  // Print QR codes for a specific client
  const printClientQRCodes = async (clientGroup: ClientGroup, selectedOnly: boolean = false) => {
    const itemsToPrint = selectedOnly 
      ? clientGroup.items.filter(item => selectedItems.has(item.id))
      : clientGroup.items;

    if (itemsToPrint.length === 0) {
      toast({
        title: "No items to print",
        description: selectedOnly ? "Please select QR codes to print" : "No items found",
        variant: "destructive",
      });
      return;
    }

    await printItemsList(
      itemsToPrint, 
      `QR Codes for ${clientGroup.buyer_name}`,
      `${clientGroup.buyer_email || ''} ${clientGroup.buyer_phone ? '• ' + clientGroup.buyer_phone : ''}`
    );
  };

  // Generic print function for a list of items
  const printItemsList = async (itemsToPrint: MaterialItem[], title: string, subtitle: string) => {
    toast({
      title: "Preparing Print",
      description: `Generating ${itemsToPrint.length} QR codes for printing...`,
    });

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print QR codes",
        variant: "destructive",
      });
      return;
    }

    // Generate QR codes as data URLs
    const qrPromises = itemsToPrint.map(async (item) => {
      const qrDataUrl = await QRCodeLib.toDataURL(item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      return { item, qrDataUrl };
    });

    const qrResults = await Promise.all(qrPromises);

    // Build print HTML with status indicators
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 3px solid #0891b2; 
            padding-bottom: 15px; 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 10px;
            padding: 20px;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; color: #0891b2; }
          .header p { color: #666; }
          .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
          .qr-item { 
            border: 2px solid #ddd; 
            padding: 15px; 
            text-align: center; 
            page-break-inside: avoid; 
            border-radius: 8px;
            background: #fff;
          }
          .qr-item.completed { 
            border-color: #22c55e; 
            background: #f0fdf4; 
            opacity: 0.7;
          }
          .qr-item.invalidated { 
            border-color: #ef4444; 
            background: #fef2f2; 
            opacity: 0.5;
          }
          .qr-item img { width: 150px; height: 150px; }
          .qr-item h3 { font-size: 12px; margin-top: 10px; word-wrap: break-word; font-weight: bold; }
          .qr-item p { font-size: 10px; color: #666; margin-top: 5px; }
          .qr-code-text { font-family: monospace; font-size: 8px; color: #999; margin-top: 5px; word-break: break-all; }
          .status-badge { 
            display: inline-block; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: bold; 
            margin-top: 8px; 
          }
          .completed-badge { background: #22c55e; color: white; }
          .pending-badge { background: #eab308; color: white; }
          .dispatched-badge { background: #3b82f6; color: white; }
          @media print {
            .qr-grid { grid-template-columns: repeat(3, 1fr); }
            .qr-item { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 ${title}</h1>
          <p>${subtitle}</p>
          <p>Total Items: ${itemsToPrint.length} | Generated: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="qr-grid">
          ${qrResults.map(({ item, qrDataUrl }) => {
            const isCompleted = item.dispatch_scanned && item.receive_scanned;
            const isDispatched = item.dispatch_scanned && !item.receive_scanned;
            return `
              <div class="qr-item ${isCompleted ? 'completed' : ''}">
                <img src="${qrDataUrl}" alt="QR Code" />
                <h3>${item.material_type}</h3>
                <p>Unit ${item.item_sequence} • ${item.unit}</p>
                <p class="qr-code-text">${item.qr_code}</p>
                ${isCompleted 
                  ? '<p class="status-badge completed-badge">✅ COMPLETED</p>' 
                  : isDispatched 
                    ? '<p class="status-badge dispatched-badge">🚚 DISPATCHED</p>'
                    : '<p class="status-badge pending-badge">⏳ PENDING</p>'
                }
              </div>
            `;
          }).join('')}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  // Print all QR codes - grouped by client with page breaks
  const printAllQRCodes = async () => {
    toast({
      title: "Preparing Print",
      description: `Generating ${items.length} QR codes for printing (grouped by client)...`,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print QR codes",
        variant: "destructive",
      });
      return;
    }

    // Generate QR codes as data URLs for all items
    const qrPromises = items.map(async (item) => {
      const qrDataUrl = await QRCodeLib.toDataURL(item.qr_code, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      return { item, qrDataUrl };
    });

    const qrResults = await Promise.all(qrPromises);

    // Group results by client
    const qrByClient: Record<string, { item: MaterialItem; qrDataUrl: string }[]> = {};
    qrResults.forEach(({ item, qrDataUrl }) => {
      const clientKey = item.buyer_id || 'unknown';
      if (!qrByClient[clientKey]) {
        qrByClient[clientKey] = [];
      }
      qrByClient[clientKey].push({ item, qrDataUrl });
    });

    // Build HTML with page breaks between clients
    const clientSections = clientGroups.map((group, groupIndex) => {
      const clientQRs = qrByClient[group.buyer_id] || [];
      if (clientQRs.length === 0) return '';
      
      return `
        <div class="client-section ${groupIndex > 0 ? 'page-break' : ''}">
          <div class="client-header">
            <h2>📦 ${group.buyer_name}</h2>
            <p class="client-contact">
              ${group.buyer_email ? '✉️ ' + group.buyer_email : ''} 
              ${group.buyer_phone ? ' | 📞 ' + group.buyer_phone : ''}
            </p>
            <p class="client-stats">${clientQRs.length} items | Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="qr-grid">
            ${clientQRs.map(({ item, qrDataUrl }) => `
              <div class="qr-item ${item.dispatch_scanned && item.receive_scanned ? 'completed' : ''}">
                <img src="${qrDataUrl}" alt="QR Code" />
                <h3>${item.material_type}</h3>
                <p>Unit ${item.item_sequence} • ${item.unit}</p>
                <p class="qr-code-text">${item.qr_code}</p>
                ${item.dispatch_scanned && item.receive_scanned ? '<p class="status-badge completed-badge">✅ COMPLETED</p>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>All QR Codes - UjenziXform</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .main-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0891b2; padding-bottom: 15px; }
          .main-header h1 { font-size: 28px; margin-bottom: 5px; color: #0891b2; }
          .main-header p { color: #666; }
          
          /* Client Section Styling */
          .client-section { margin-bottom: 40px; padding-top: 20px; }
          .client-header { 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border: 2px solid #0891b2; 
            border-radius: 10px; 
            padding: 15px 20px; 
            margin-bottom: 20px; 
          }
          .client-header h2 { font-size: 20px; color: #0891b2; margin-bottom: 5px; }
          .client-contact { font-size: 12px; color: #666; }
          .client-stats { font-size: 11px; color: #888; margin-top: 5px; }
          
          /* QR Grid */
          .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-item { 
            border: 2px solid #ddd; 
            padding: 15px; 
            text-align: center; 
            page-break-inside: avoid; 
            border-radius: 8px;
            background: #fff;
          }
          .qr-item.completed { 
            border-color: #22c55e; 
            background: #f0fdf4; 
          }
          .qr-item img { width: 150px; height: 150px; }
          .qr-item h3 { font-size: 12px; margin-top: 10px; word-wrap: break-word; font-weight: bold; }
          .qr-item p { font-size: 10px; color: #666; margin-top: 5px; }
          .qr-code-text { font-family: monospace; font-size: 8px; color: #999; margin-top: 5px; word-break: break-all; }
          .status-badge { 
            display: inline-block; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: bold; 
            margin-top: 8px; 
          }
          .completed-badge { background: #22c55e; color: white; }
          
          /* Print-specific styles */
          @media print {
            .page-break { page-break-before: always; }
            .qr-grid { grid-template-columns: repeat(3, 1fr); }
            .qr-item { border: 2px solid #000; }
            .client-section { margin-bottom: 0; }
          }
        </style>
      </head>
      <body>
        <div class="main-header">
          <h1>📱 Material QR Codes</h1>
          <p>UjenziXform - Construction Material Tracking</p>
          <p>Total: ${items.length} items across ${clientGroups.length} clients</p>
        </div>
        ${clientSections}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
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
        <div className="flex gap-2 flex-wrap items-center">
          {/* Selection Mode Toggle */}
          <Button 
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedItems(new Set());
            }}
            className={selectionMode ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            {selectionMode ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
            {selectionMode ? `Selected (${selectedItems.size})` : 'Select'}
          </Button>

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

          {/* Selection Actions */}
          {selectionMode && selectedItems.size > 0 && (
            <>
              <Button onClick={printSelectedQRCodes} size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Printer className="h-4 w-4 mr-2" />
                Print Selected ({selectedItems.size})
              </Button>
              <Button onClick={downloadSelectedQRCodes} size="sm" className="bg-green-600 hover:bg-green-700">
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download Selected ({selectedItems.size})
              </Button>
            </>
          )}

          {/* All Actions */}
          {items.length > 0 && !selectionMode && (
            <>
              <Button onClick={printAllQRCodes} size="sm" variant="outline" className="border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                <Printer className="h-4 w-4 mr-2" />
                Print All ({items.length})
              </Button>
              <Button onClick={downloadAllQRCodes} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download All ({items.length})
              </Button>
            </>
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
        /* Client-Grouped View - Added extra spacing between clients */
        <Accordion type="multiple" className="space-y-8" defaultValue={clientGroups.slice(0, 3).map(g => g.buyer_id)}>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectionMode && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (areAllClientItemsSelected(group)) {
                            deselectAllClientItems(group);
                          } else {
                            selectAllClientItems(group);
                          }
                        }}
                      >
                        {areAllClientItemsSelected(group) ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All ({group.total_items})</>
                        )}
                      </Button>
                    )}
                    {selectionMode && getSelectedCountForClient(group) > 0 && (
                      <Badge className="bg-orange-500">
                        {getSelectedCountForClient(group)} selected
                      </Badge>
                    )}
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
                    {selectionMode && getSelectedCountForClient(group) > 0 ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            printClientQRCodes(group, true);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print Selected
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadClientQRCodes(group, true);
                          }}
                        >
                          <DownloadCloud className="h-4 w-4 mr-1" />
                          Download Selected
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            printClientQRCodes(group);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print All
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadClientQRCodes(group);
                          }}
                        >
                          <DownloadCloud className="h-4 w-4 mr-1" />
                          Download All
                        </Button>
                      </>
                    )}
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
                      selectionMode={selectionMode}
                      isSelected={selectedItems.has(item.id)}
                      onToggleSelect={() => toggleItemSelection(item.id)}
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
              selectionMode={selectionMode}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleItemSelection(item.id)}
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
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}> = ({ item, getStatusColor, getStatusIcon, downloadQRCode, onViewFullSize, showClientInfo = true, selectionMode = false, isSelected = false, onToggleSelect }) => {
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
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectionMode && (
              <Checkbox 
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className="h-5 w-5"
              />
            )}
            <CardTitle className="text-lg">{item.material_type}</CardTitle>
          </div>
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