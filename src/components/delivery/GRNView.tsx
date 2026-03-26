import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Package, Download, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GRN {
  id: string;
  grn_number: string;
  delivery_note_id: string;
  purchase_order_id: string;
  items: any[];
  total_quantity: number;
  received_date: string;
  status: string;
  purchase_order?: {
    po_number?: string;
  };
}

interface GRNViewProps {
  userId: string;
  userRole: 'builder' | 'supplier' | 'admin';
}

export const GRNView: React.FC<GRNViewProps> = ({ userId, userRole }) => {
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('goods_received_notes')
        .select(`
          *,
          purchase_order:purchase_orders(po_number)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'builder') {
        query = query.eq('builder_id', userId);
      } else if (userRole === 'supplier') {
        // Get supplier ID from user_id
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (supplier) {
          query = query.eq('supplier_id', supplier.id);
        }
      }
      // Admin can see all

      const { data, error } = await query;
      if (error) throw error;
      setGRNs(data || []);
    } catch (error: any) {
      console.error('Error fetching GRNs:', error);
      toast({
        title: "Error",
        description: "Failed to load GRNs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchGRNs();
      
      // Mark as viewed by supplier when they view it
      if (userRole === 'supplier') {
        const markAsViewed = async () => {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (supplier) {
            await supabase
              .from('goods_received_notes')
              .update({ status: 'viewed_by_supplier' })
              .eq('supplier_id', supplier.id)
              .eq('status', 'generated');
          }
        };
        markAsViewed();
      }
    }
  }, [userId, userRole]);

  const handleDownloadGRN = (grn: GRN) => {
    const itemsHtml = (Array.isArray(grn.items) ? grn.items : [])
      .map(
        (row: Record<string, unknown>, i: number) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(String(row.description ?? row.name ?? row.material ?? 'Item'))}</td><td>${escapeHtml(String(row.quantity ?? row.qty ?? '—'))}</td></tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(grn.grn_number)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:1.25rem;margin:0 0 8px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f4f4f5}
        .meta{color:#555;font-size:13px;margin-bottom:4px}
      </style></head><body>
      <h1>Goods Received Note</h1>
      <p class="meta"><strong>GRN:</strong> ${escapeHtml(grn.grn_number)}</p>
      <p class="meta"><strong>PO:</strong> ${escapeHtml(grn.purchase_order?.po_number || 'N/A')}</p>
      <p class="meta"><strong>Received:</strong> ${escapeHtml(new Date(grn.received_date).toLocaleString())}</p>
      <p class="meta"><strong>Total quantity:</strong> ${grn.total_quantity}</p>
      <p class="meta"><strong>Status:</strong> ${escapeHtml(grn.status)}</p>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="3">No line items</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      toast({
        title: 'Pop-up blocked',
        description: 'Allow pop-ups for this site to print or save as PDF.',
        variant: 'destructive',
      });
      return;
    }
    w.document.write(html);
    w.document.close();
    toast({
      title: 'GRN ready',
      description: 'Use your browser print dialog to save as PDF or print.',
    });
  };

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading GRNs...</p>
        </CardContent>
      </Card>
    );
  }

  if (grns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No GRNs available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Goods Received Notes (GRN)</h3>
        <Button variant="outline" size="sm" onClick={fetchGRNs}>
          Refresh
        </Button>
      </div>

      {grns.map((grn) => (
        <Card key={grn.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{grn.grn_number}</CardTitle>
              <Badge variant={grn.status === 'viewed_by_supplier' ? 'default' : 'secondary'}>
                {grn.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">PO Number</p>
                  <p className="font-medium">{grn.purchase_order?.po_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Received Date</p>
                  <p className="font-medium">{new Date(grn.received_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Quantity</p>
                  <p className="font-medium">{grn.total_quantity} items</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleDownloadGRN(grn)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download GRN
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
