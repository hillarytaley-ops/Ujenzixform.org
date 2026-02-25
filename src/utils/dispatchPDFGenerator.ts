import QRCode from 'qrcode';
import { format } from 'date-fns';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  category?: string;
  qr_code?: string;
}

interface Order {
  id: string;
  po_number: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  delivery_address?: string;
  project_name?: string;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

interface MaterialItem {
  id: string;
  qr_code: string;
  material_name?: string;
  material_type?: string;
  quantity: number;
  unit: string;
  category?: string;
  item_sequence?: number;
}

/**
 * Fetches material items with QR codes for an order
 */
export const fetchOrderMaterialItems = async (orderId: string): Promise<MaterialItem[]> => {
  let accessToken = SUPABASE_ANON_KEY;
  try {
    const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed.access_token || SUPABASE_ANON_KEY;
    }
  } catch (e) {}

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/material_items?purchase_order_id=eq.${orderId}&select=*&order=item_sequence.asc`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch material items');
  }

  return response.json();
};

/**
 * Generates QR codes for order items that don't have them yet
 */
export const generateQRCodesForOrder = async (
  orderId: string, 
  items: OrderItem[], 
  supplierId: string
): Promise<MaterialItem[]> => {
  let accessToken = SUPABASE_ANON_KEY;
  try {
    const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed.access_token || SUPABASE_ANON_KEY;
    }
  } catch (e) {}

  const materialItems: MaterialItem[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Generate unique QR code
    const qrCode = `UJP-${item.category || 'MAT'}-${orderId.slice(-8)}-${i + 1}-${timestamp}-${randomSuffix}`;
    
    // Create material item in database
    const materialItemData = {
      purchase_order_id: orderId,
      supplier_id: supplierId,
      qr_code: qrCode,
      material_name: item.material_name,
      material_type: item.material_name,
      category: item.category || 'General',
      quantity: item.quantity,
      unit: item.unit,
      item_sequence: i + 1,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/material_items`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(materialItemData)
      }
    );

    if (response.ok) {
      const data = await response.json();
      materialItems.push(data[0] || materialItemData);
    } else {
      // If insert fails (maybe already exists), add the generated data anyway
      materialItems.push({
        id: `temp-${i}`,
        qr_code: qrCode,
        material_name: item.material_name,
        material_type: item.material_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        item_sequence: i + 1
      });
    }
  }

  return materialItems;
};

/**
 * Generates a printable PDF with QR codes for dispatch
 */
export const generateDispatchPDF = async (
  order: Order,
  materialItems: MaterialItem[],
  supplierName: string = 'Supplier'
): Promise<void> => {
  // Open print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to generate the dispatch PDF');
  }

  // Generate QR codes as data URLs
  const qrPromises = materialItems.map(async (item) => {
    const qrDataUrl = await QRCode.toDataURL(item.qr_code, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
    return { item, qrDataUrl };
  });

  const qrResults = await Promise.all(qrPromises);

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dispatch QR Codes - ${order.po_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 20px;
          color: #1f2937;
        }
        
        /* Header */
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding-bottom: 20px;
          border-bottom: 3px solid #16a34a;
        }
        .header .logo { 
          font-size: 28px; 
          font-weight: bold; 
          color: #16a34a; 
          margin-bottom: 5px; 
        }
        .header .title { 
          font-size: 22px; 
          color: #1f2937; 
          margin-bottom: 10px; 
        }
        .header .subtitle { color: #6b7280; font-size: 14px; }
        
        /* Order Info Box */
        .order-info {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #16a34a;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .order-info .info-group { }
        .order-info .label { 
          font-size: 11px; 
          color: #6b7280; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .order-info .value { 
          font-size: 14px; 
          font-weight: 600; 
          color: #1f2937; 
        }
        .order-info .highlight {
          background: #16a34a;
          color: white;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          display: inline-block;
        }
        
        /* Instructions */
        .instructions {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 30px;
        }
        .instructions h3 {
          color: #b45309;
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .instructions ul {
          list-style: none;
          font-size: 12px;
          color: #92400e;
        }
        .instructions li {
          margin-bottom: 5px;
          padding-left: 20px;
          position: relative;
        }
        .instructions li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #16a34a;
          font-weight: bold;
        }
        
        /* QR Grid */
        .qr-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 20px; 
        }
        .qr-item { 
          border: 2px solid #e5e7eb; 
          padding: 15px; 
          text-align: center; 
          page-break-inside: avoid; 
          border-radius: 10px;
          background: #fff;
          transition: all 0.2s;
        }
        .qr-item:hover {
          border-color: #16a34a;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15);
        }
        .qr-item img { 
          width: 150px; 
          height: 150px; 
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 5px;
          background: white;
        }
        .qr-item .item-number {
          background: #16a34a;
          color: white;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 10px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 10px;
        }
        .qr-item h3 { 
          font-size: 13px; 
          margin-top: 10px; 
          word-wrap: break-word; 
          font-weight: 600;
          color: #1f2937;
        }
        .qr-item .details { 
          font-size: 11px; 
          color: #6b7280; 
          margin-top: 5px; 
        }
        .qr-item .qr-code-text { 
          font-family: 'Courier New', monospace; 
          font-size: 8px; 
          color: #9ca3af; 
          margin-top: 8px; 
          word-break: break-all;
          background: #f3f4f6;
          padding: 5px;
          border-radius: 4px;
        }
        .qr-item .scan-instruction {
          font-size: 10px;
          color: #16a34a;
          margin-top: 8px;
          font-weight: 500;
        }
        
        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }
        .footer .company { font-weight: 600; color: #16a34a; }
        
        /* Print Styles */
        @media print {
          body { padding: 10px; }
          .qr-grid { grid-template-columns: repeat(3, 1fr); }
          .qr-item { border: 2px solid #000; }
          .instructions { background: #fff; border: 2px dashed #f59e0b; }
          .order-info { background: #fff; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏗️ UjenziXform</div>
        <div class="title">Dispatch QR Codes</div>
        <div class="subtitle">Scan these codes during dispatch to track materials</div>
      </div>
      
      <div class="order-info">
        <div class="info-group">
          <div class="label">Order Number</div>
          <div class="value">${order.po_number}</div>
        </div>
        <div class="info-group">
          <div class="label">Customer</div>
          <div class="value">${order.buyer_name || 'N/A'}</div>
        </div>
        <div class="info-group">
          <div class="label">Delivery Address</div>
          <div class="value">${order.delivery_address || 'To be provided'}</div>
        </div>
        <div class="info-group">
          <div class="label">Total Items</div>
          <div class="value"><span class="highlight">${materialItems.length} items</span></div>
        </div>
        <div class="info-group">
          <div class="label">Order Date</div>
          <div class="value">${format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</div>
        </div>
        <div class="info-group">
          <div class="label">Supplier</div>
          <div class="value">${supplierName}</div>
        </div>
      </div>
      
      <div class="instructions">
        <h3>⚠️ Dispatch Instructions</h3>
        <ul>
          <li>Attach each QR code sticker to its corresponding material package</li>
          <li>Scan each QR code before loading onto the delivery vehicle</li>
          <li>Ensure all ${materialItems.length} items are scanned before dispatch</li>
          <li>Keep a copy of this document for your records</li>
        </ul>
      </div>
      
      <div class="qr-grid">
        ${qrResults.map(({ item, qrDataUrl }, index) => `
          <div class="qr-item">
            <div class="item-number">Item #${item.item_sequence || index + 1}</div>
            <img src="${qrDataUrl}" alt="QR Code" />
            <h3>${item.material_name || item.material_type || 'Material'}</h3>
            <div class="details">${item.quantity} ${item.unit} • ${item.category || 'General'}</div>
            <div class="qr-code-text">${item.qr_code}</div>
            <div class="scan-instruction">📱 Scan during dispatch</div>
          </div>
        `).join('')}
      </div>
      
      <div class="footer">
        <p class="company">UjenziXform Construction Materials Platform</p>
        <p>Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm:ss')}</p>
        <p>For support, contact support@ujenzixform.com</p>
      </div>
      
      <script>
        window.onload = function() { 
          setTimeout(function() { window.print(); }, 500);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printHTML);
  printWindow.document.close();
};

/**
 * Main function to generate dispatch PDF for an order
 * This will:
 * 1. Check if material items with QR codes exist for the order
 * 2. If not, generate them
 * 3. Generate and open the PDF
 */
export const generateDispatchPDFForOrder = async (
  order: Order,
  supplierId: string,
  supplierName: string = 'Supplier'
): Promise<{ success: boolean; itemCount: number; error?: string }> => {
  try {
    // First, try to fetch existing material items
    let materialItems = await fetchOrderMaterialItems(order.id);
    
    // If no material items exist, generate them from order items
    if (materialItems.length === 0 && order.items && order.items.length > 0) {
      console.log('📦 No material items found, generating QR codes...');
      materialItems = await generateQRCodesForOrder(order.id, order.items, supplierId);
    }
    
    if (materialItems.length === 0) {
      return {
        success: false,
        itemCount: 0,
        error: 'No items found for this order. Please add items to the order first.'
      };
    }
    
    // Generate the PDF
    await generateDispatchPDF(order, materialItems, supplierName);
    
    return {
      success: true,
      itemCount: materialItems.length
    };
  } catch (error: any) {
    console.error('Error generating dispatch PDF:', error);
    return {
      success: false,
      itemCount: 0,
      error: error.message || 'Failed to generate dispatch PDF'
    };
  }
};
