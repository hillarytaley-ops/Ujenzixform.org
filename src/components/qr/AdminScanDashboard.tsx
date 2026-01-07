import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SectionLoader } from '@/components/ui/DashboardLoader';
import { BarChart, Package, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScanStatistics {
  total_items: number;
  pending_items: number;
  dispatched_items: number;
  received_items: number;
  verified_items: number;
  damaged_items: number;
  total_scans: number;
  dispatch_scans: number;
  receiving_scans: number;
  verification_scans: number;
  avg_dispatch_to_receive_hours: number;
}

interface ScanEvent {
  id: string;
  qr_code: string;
  scan_type: string;
  scanner_type: string;
  material_condition: string;
  scanned_at: string;
  notes: string | null;
}

export const AdminScanDashboard: React.FC = () => {
  const [stats, setStats] = useState<ScanStatistics | null>(null);
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
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

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);

      if (roleData?.role === 'admin') {
        await fetchStatistics();
        await fetchRecentScans();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_scan_statistics', {
        _start_date: null,
        _end_date: null,
        _supplier_id: null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats(data[0] as ScanStatistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: "Error",
        description: "Failed to load scan statistics",
        variant: "destructive",
      });
    }
  };

  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentScans(data || []);
    } catch (error) {
      console.error('Error fetching scans:', error);
    }
  };

  if (loading) {
    return <SectionLoader message="Loading scan dashboard..." className="p-6 h-48" />;
  }

  if (userRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Access restricted to administrators only.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_items || 0}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-gray-500">{stats?.pending_items || 0} Pending</Badge>
              <Badge className="bg-blue-500">{stats?.dispatched_items || 0} Dispatched</Badge>
              <Badge className="bg-green-500">{stats?.received_items || 0} Received</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_scans || 0}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{stats?.dispatch_scans || 0} Dispatch</Badge>
              <Badge variant="outline">{stats?.receiving_scans || 0} Receiving</Badge>
              <Badge variant="outline">{stats?.verification_scans || 0} Verified</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Transit Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.avg_dispatch_to_receive_hours?.toFixed(1) || '0'}<span className="text-xl">h</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Dispatch to receiving
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.pending_items || 0}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.dispatched_items || 0}</div>
              <p className="text-sm text-muted-foreground">Dispatched</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.received_items || 0}</div>
              <p className="text-sm text-muted-foreground">Received</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats?.verified_items || 0}</div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.damaged_items || 0}</div>
              <p className="text-sm text-muted-foreground">Damaged</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats ? Math.round(((stats.verified_items + stats.received_items) / stats.total_items) * 100) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Completion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Scan Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Recent Scan Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Code</TableHead>
                <TableHead>Scan Type</TableHead>
                <TableHead>Scanner</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentScans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="font-mono text-xs">
                    {scan.qr_code}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        scan.scan_type === 'dispatch'
                          ? 'bg-blue-500'
                          : scan.scan_type === 'receiving'
                          ? 'bg-green-500'
                          : 'bg-purple-500'
                      }
                    >
                      {scan.scan_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{scan.scanner_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {scan.material_condition === 'damaged' ? (
                      <Badge className="bg-red-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {scan.material_condition}
                      </Badge>
                    ) : (
                      <span className="text-sm">{scan.material_condition}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(scan.scanned_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {scan.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
