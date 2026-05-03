import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Eye, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GoodsReceivedNote {
  id: string;
  grn_number: string;
  builder_id: string;
  supplier_name: string;
  received_date: string;
  items: any[];
  overall_condition: string;
  status: string;
  created_at: string;
  delivery_note_reference?: string;
  discrepancies?: string;
  additional_notes?: string;
  builder_name?: string;
}

const GoodsReceivedNoteViewer: React.FC = () => {
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceivedNote | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchGRNs();
    }
  }, [userProfile]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // SECURITY: Explicit column selection - exclude sensitive data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      // Get supplier profile
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .eq('user_id', userProfile.id)
        .single();

      if (!supplier) {
        toast({
          title: "Error",
          description: "You need to be registered as a supplier to view GRNs.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('goods_received_notes')
        .select('*')
        .eq('supplier_name', supplier.company_name)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching GRNs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch Goods Received Notes.",
          variant: "destructive",
        });
        return;
      }

      // Fetch builder names separately for security
      const grnsWithBuilderNames = await Promise.all(
        (data || []).map(async (grn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', grn.builder_id)
            .single();
          
          return {
            ...grn,
            items: Array.isArray(grn.items) ? grn.items : [],
            builder_name: profile?.full_name || 'CO/Contractor'
          };
        })
      );

      setGrns(grnsWithBuilderNames);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    }
  };

  const downloadGRN = async (grn: GoodsReceivedNote) => {
    try {
      // Generate PDF content
      const grnContent = `
        GOODS RECEIVED NOTE
        
        GRN Number: ${grn.grn_number}
        Supplier: ${grn.supplier_name}
        Builder: ${grn.builder_name}
        Received Date: ${new Date(grn.received_date).toLocaleDateString()}
        Overall Condition: ${grn.overall_condition}
        Status: ${grn.status}
        
        ITEMS RECEIVED:
        ${grn.items.map((item, index) => 
          `${index + 1}. ${item.material_type} - Qty: ${item.quantity_received} ${item.unit} - Condition: ${item.condition}`
        ).join('\n')}
        
        ${grn.discrepancies ? `\nDiscrepancies: ${grn.discrepancies}` : ''}
        ${grn.additional_notes ? `\nAdditional Notes: ${grn.additional_notes}` : ''}
        
        Generated: ${new Date().toLocaleString()}
      `;

      const blob = new Blob([grnContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GRN_${grn.grn_number}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "GRN downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading GRN:', error);
      toast({
        title: "Error",
        description: "Failed to download GRN.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted';
      case 'submitted':
        return 'bg-secondary';
      case 'approved':
        return 'bg-primary';
      case 'disputed':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'good':
        return 'text-primary';
      case 'damaged':
        return 'text-destructive';
      case 'partial':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  if (loading) {
    return <div className="p-6">Loading Goods Received Notes...</div>;
  }

  if (!user || userProfile?.role !== 'supplier') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Goods Received Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Secure Access Required</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Please log in as a registered supplier to access Goods Received Notes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <h3 className="font-semibold">Information Security Notice</h3>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>SSL encrypted data transmission</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Access logs maintained for security</span>
            </div>
          </div>
          <div className="mt-2 p-2 bg-accent rounded text-xs">
            All GRN data is protected and only accessible to authorized suppliers.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Goods Received Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grns.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No Goods Received Notes available</p>
              <p className="text-sm text-muted-foreground">
                GRNs from builders will appear here when materials are received
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Builder</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-mono text-sm">
                      {grn.grn_number}
                    </TableCell>
                    <TableCell>
                      {grn.builder_name}
                    </TableCell>
                    <TableCell>
                      {new Date(grn.received_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getConditionColor(grn.overall_condition)}`}>
                        {grn.overall_condition}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(grn.status)} text-white`}>
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedGRN(grn)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Goods Received Note Details</DialogTitle>
                            </DialogHeader>
                            {selectedGRN && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="font-medium">GRN Number:</span> {selectedGRN.grn_number}
                                  </div>
                                  <div>
                                    <span className="font-medium">Builder:</span> {selectedGRN.builder_name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Received Date:</span> {new Date(selectedGRN.received_date).toLocaleDateString()}
                                  </div>
                                  <div>
                                    <span className="font-medium">Overall Condition:</span> 
                                    <span className={`ml-2 font-medium ${getConditionColor(selectedGRN.overall_condition)}`}>
                                      {selectedGRN.overall_condition}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Items Received:</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Ordered</TableHead>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Notes</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedGRN.items.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell>{item.material_type}</TableCell>
                                          <TableCell>{item.quantity_ordered} {item.unit}</TableCell>
                                          <TableCell>{item.quantity_received} {item.unit}</TableCell>
                                          <TableCell>
                                            <span className={`font-medium ${getConditionColor(item.condition)}`}>
                                              {item.condition}
                                            </span>
                                          </TableCell>
                                          <TableCell>{item.notes || '-'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                {selectedGRN.discrepancies && (
                                  <div className="p-3 bg-accent border border-border rounded">
                                    <div className="flex items-center gap-2 text-foreground mb-1">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="font-medium">Discrepancies</span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">{selectedGRN.discrepancies}</p>
                                  </div>
                                )}

                                {selectedGRN.additional_notes && (
                                  <div className="p-3 bg-muted border border-border rounded">
                                    <div className="flex items-center gap-2 text-foreground mb-1">
                                      <FileText className="h-4 w-4" />
                                      <span className="font-medium">Additional Notes</span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">{selectedGRN.additional_notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadGRN(grn)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
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

export default GoodsReceivedNoteViewer;