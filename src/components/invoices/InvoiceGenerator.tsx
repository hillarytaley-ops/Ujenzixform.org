/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📄 PDF INVOICE GENERATOR                                                          ║
 * ║                                                                                      ║
 * ║   Created: January 29, 2026                                                          ║
 * ║   Features:                                                                          ║
 * ║   - Generate professional PDF invoices                                              ║
 * ║   - Download/Print invoices                                                         ║
 * ║   - Email invoices                                                                  ║
 * ║   - Invoice templates                                                               ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, Mail, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice_number: string;
  order_id: string;
  date: string;
  due_date?: string;
  status: 'paid' | 'pending' | 'overdue';
  
  // Seller info
  seller: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };
  
  // Buyer info
  buyer: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // Items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;
  tax?: number;
  tax_rate?: number;
  delivery_fee?: number;
  discount?: number;
  total: number;
  
  // Payment
  payment_method?: string;
  payment_status?: string;
  
  // Notes
  notes?: string;
}

interface InvoiceGeneratorProps {
  invoice: InvoiceData;
  onClose?: () => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ invoice, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please allow pop-ups to print the invoice'
      });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              color: #1a1a1a;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 32px; color: #1a1a1a; }
            .invoice-number { color: #6b7280; font-size: 14px; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .party { width: 45%; }
            .party h3 { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
            .party p { margin-bottom: 4px; }
            .party .name { font-weight: bold; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .totals { margin-left: auto; width: 300px; }
            .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals .total { font-size: 18px; font-weight: bold; border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
            .status-paid { color: #10b981; font-weight: bold; }
            .status-pending { color: #f59e0b; font-weight: bold; }
            .status-overdue { color: #ef4444; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    // For now, use print to PDF functionality
    handlePrint();
    toast({
      title: '📄 Invoice Ready',
      description: 'Use "Save as PDF" in the print dialog to download'
    });
  };

  const handleEmail = () => {
    // Construct mailto link
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} - UjenziXform`);
    const body = encodeURIComponent(`
Dear ${invoice.buyer.name},

Please find attached your invoice #${invoice.invoice_number}.

Invoice Details:
- Date: ${new Date(invoice.date).toLocaleDateString()}
- Total Amount: KES ${invoice.total.toLocaleString()}
- Status: ${invoice.status.toUpperCase()}

Thank you for your business!

Best regards,
${invoice.seller.name}
UjenziXform
    `);
    
    window.open(`mailto:${invoice.buyer.email || ''}?subject=${subject}&body=${body}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end gap-2 no-print">
        <Button variant="outline" size="sm" onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Invoice Preview */}
      <Card className="bg-white border shadow-lg">
        <CardContent className="p-8" ref={invoiceRef}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
            <div>
              <h2 className="text-3xl font-bold text-blue-600">UjenziXform</h2>
              <p className="text-gray-500 text-sm mt-1">Construction Materials Marketplace</p>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-gray-500 mt-1">#{invoice.invoice_number}</p>
              <Badge className={`mt-2 ${getStatusColor(invoice.status)}`}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Parties */}
          <div className="flex justify-between mb-8">
            <div className="w-[45%]">
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">From</h3>
              <p className="font-bold text-lg">{invoice.seller.name}</p>
              {invoice.seller.address && <p className="text-gray-600">{invoice.seller.address}</p>}
              {invoice.seller.phone && <p className="text-gray-600">{invoice.seller.phone}</p>}
              {invoice.seller.email && <p className="text-gray-600">{invoice.seller.email}</p>}
            </div>
            <div className="w-[45%]">
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Bill To</h3>
              <p className="font-bold text-lg">{invoice.buyer.name}</p>
              {invoice.buyer.address && <p className="text-gray-600">{invoice.buyer.address}</p>}
              {invoice.buyer.phone && <p className="text-gray-600">{invoice.buyer.phone}</p>}
              {invoice.buyer.email && <p className="text-gray-600">{invoice.buyer.email}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-8 mb-8 text-sm">
            <div>
              <span className="text-gray-500">Invoice Date:</span>
              <span className="ml-2 font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            {invoice.due_date && (
              <div>
                <span className="text-gray-500">Due Date:</span>
                <span className="ml-2 font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Order ID:</span>
              <span className="ml-2 font-medium">{invoice.order_id}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-3 px-4 text-xs uppercase text-gray-600">Item</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-gray-600">Qty</th>
                <th className="text-center py-3 px-4 text-xs uppercase text-gray-600">Unit</th>
                <th className="text-right py-3 px-4 text-xs uppercase text-gray-600">Unit Price</th>
                <th className="text-right py-3 px-4 text-xs uppercase text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{item.unit}</td>
                  <td className="py-3 px-4 text-right">KES {item.unit_price.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium">KES {item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-[300px]">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal</span>
                <span>KES {invoice.subtotal.toLocaleString()}</span>
              </div>
              
              {invoice.tax !== undefined && invoice.tax > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Tax ({invoice.tax_rate || 16}%)</span>
                  <span>KES {invoice.tax.toLocaleString()}</span>
                </div>
              )}
              
              {invoice.delivery_fee !== undefined && invoice.delivery_fee > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>KES {invoice.delivery_fee.toLocaleString()}</span>
                </div>
              )}
              
              {invoice.discount !== undefined && invoice.discount > 0 && (
                <div className="flex justify-between py-2 text-green-600">
                  <span>Discount</span>
                  <span>-KES {invoice.discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-900">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold">KES {invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {invoice.payment_method && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Payment Information</h4>
              <p className="text-sm text-gray-600">Method: {invoice.payment_method}</p>
              {invoice.payment_status && (
                <p className="text-sm text-gray-600">Status: {invoice.payment_status}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-xs">
            <p>Thank you for your business!</p>
            <p className="mt-1">UjenziXform - Kenya's Premier Construction Materials Marketplace</p>
            <p>www.ujenzixform.org | support@ujenzixform.org</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to generate invoice from order data
export const generateInvoiceFromOrder = (order: any, supplier: any, buyer: any): InvoiceData => {
  const items: InvoiceItem[] = (order.items || []).map((item: any) => ({
    name: item.name || item.product_name || 'Product',
    quantity: item.quantity || 1,
    unit: item.unit || 'piece',
    unit_price: item.unit_price || item.price || 0,
    total: (item.quantity || 1) * (item.unit_price || item.price || 0)
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = order.tax || 0;
  const delivery_fee = order.delivery_fee || 0;
  const discount = order.discount || 0;
  const total = subtotal + tax + delivery_fee - discount;

  return {
    invoice_number: `INV-${order.po_number || order.id?.slice(0, 8) || Date.now()}`,
    order_id: order.po_number || order.id || 'N/A',
    date: order.created_at || new Date().toISOString(),
    due_date: order.due_date,
    status: order.payment_status === 'paid' ? 'paid' : 
            order.payment_status === 'overdue' ? 'overdue' : 'pending',
    seller: {
      name: supplier?.company_name || 'UjenziXform Supplier',
      address: supplier?.address || supplier?.location,
      phone: supplier?.phone,
      email: supplier?.email
    },
    buyer: {
      name: buyer?.full_name || buyer?.name || 'Customer',
      address: buyer?.address || order.delivery_address,
      phone: buyer?.phone,
      email: buyer?.email
    },
    items,
    subtotal,
    tax,
    tax_rate: 16,
    delivery_fee,
    discount,
    total: order.total_amount || total,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    notes: order.special_instructions || order.notes
  };
};

export default InvoiceGenerator;

