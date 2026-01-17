import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  Printer,
  Download,
  FileText,
  BarChart3,
  Bell,
  Truck,
  Camera,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

interface ReportData {
  generatedAt: string;
  dateRange: string;
  alerts: {
    total: number;
    critical: number;
    warning: number;
    resolved: number;
    pending: number;
    avgResolutionMinutes: number;
    byType: { type: string; count: number }[];
  };
  deliveries: {
    total: number;
    completed: number;
    inProgress: number;
    cancelled: number;
    avgDeliveryMinutes: number;
  };
  cameras: {
    total: number;
    online: number;
    offline: number;
    uptimePercent: number;
  };
  accessRequests: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

type ReportTemplate = 'executive' | 'detailed' | 'alerts' | 'deliveries' | 'operations';

const TEMPLATES: { value: ReportTemplate; label: string; description: string }[] = [
  { value: 'executive', label: 'Executive Summary', description: 'High-level overview for management' },
  { value: 'detailed', label: 'Detailed Report', description: 'Comprehensive data with all metrics' },
  { value: 'alerts', label: 'Alerts Report', description: 'Focus on monitoring alerts and incidents' },
  { value: 'deliveries', label: 'Deliveries Report', description: 'Delivery operations summary' },
  { value: 'operations', label: 'Operations Report', description: 'Day-to-day operational metrics' }
];

export const PrintableReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<ReportTemplate>('executive');
  const [timeRange, setTimeRange] = useState('7days');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      let startDate: Date;
      let rangeLabel: string;

      switch (timeRange) {
        case '24hours':
          startDate = subDays(endDate, 1);
          rangeLabel = 'Last 24 Hours';
          break;
        case '7days':
          startDate = subDays(endDate, 7);
          rangeLabel = 'Last 7 Days';
          break;
        case '30days':
          startDate = subDays(endDate, 30);
          rangeLabel = 'Last 30 Days';
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          rangeLabel = 'Last 3 Months';
          break;
        default:
          startDate = subDays(endDate, 7);
          rangeLabel = 'Last 7 Days';
      }

      const [alertsRes, deliveriesRes, camerasRes, requestsRes] = await Promise.all([
        supabase
          .from('monitoring_alerts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('delivery_routes')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('cameras').select('*'),
        supabase
          .from('camera_access_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const alerts = alertsRes.data || [];
      const deliveries = deliveriesRes.data || [];
      const cameras = camerasRes.data || [];
      const requests = requestsRes.data || [];

      // Calculate alert metrics
      const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
      let avgResolution = 0;
      if (resolvedAlerts.length > 0) {
        const totalMinutes = resolvedAlerts.reduce((sum, a) => {
          if (a.resolved_at && a.created_at) {
            return sum + (new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime()) / 60000;
          }
          return sum;
        }, 0);
        avgResolution = Math.round(totalMinutes / resolvedAlerts.length);
      }

      // Alert by type
      const typeCount: Record<string, number> = {};
      alerts.forEach(a => {
        const type = a.alert_type || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      // Calculate delivery metrics
      const completedDeliveries = deliveries.filter(d => d.status === 'completed' || d.status === 'arrived');
      let avgDelivery = 0;
      if (completedDeliveries.length > 0) {
        const totalMinutes = completedDeliveries.reduce((sum, d) => {
          if (d.completed_at && d.started_at) {
            return sum + (new Date(d.completed_at).getTime() - new Date(d.started_at).getTime()) / 60000;
          }
          return sum;
        }, 0);
        avgDelivery = Math.round(totalMinutes / completedDeliveries.length);
      }

      // Camera metrics
      const onlineCameras = cameras.filter(c => c.status === 'online').length;

      setReportData({
        generatedAt: format(new Date(), 'MMMM dd, yyyy HH:mm'),
        dateRange: rangeLabel,
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          resolved: resolvedAlerts.length,
          pending: alerts.filter(a => a.status === 'pending').length,
          avgResolutionMinutes: avgResolution,
          byType: Object.entries(typeCount).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
        },
        deliveries: {
          total: deliveries.length,
          completed: completedDeliveries.length,
          inProgress: deliveries.filter(d => d.status === 'in_transit').length,
          cancelled: deliveries.filter(d => d.status === 'cancelled').length,
          avgDeliveryMinutes: avgDelivery
        },
        cameras: {
          total: cameras.length,
          online: onlineCameras,
          offline: cameras.length - onlineCameras,
          uptimePercent: cameras.length > 0 ? Math.round((onlineCameras / cameras.length) * 100) : 100
        },
        accessRequests: {
          total: requests.length,
          approved: requests.filter(r => r.status === 'approved').length,
          rejected: requests.filter(r => r.status === 'rejected').length,
          pending: requests.filter(r => r.status === 'pending').length
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UjenziXform Report - ${format(new Date(), 'yyyy-MM-dd')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
            .subtitle { font-size: 16px; color: #6b7280; margin-top: 8px; }
            .meta { font-size: 12px; color: #9ca3af; margin-top: 10px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .metric-card { padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
            .metric-value { font-size: 32px; font-weight: bold; color: #1f2937; }
            .metric-value.critical { color: #dc2626; }
            .metric-value.success { color: #16a34a; }
            .metric-value.warning { color: #f59e0b; }
            .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
            .badge-success { background: #dcfce7; color: #16a34a; }
            .badge-warning { background: #fef3c7; color: #d97706; }
            .badge-danger { background: #fee2e2; color: #dc2626; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
              .metrics-grid { grid-template-columns: repeat(4, 1fr); }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 300);
      };
    }
  };

  const generatePreview = () => {
    fetchReportData();
  };

  const renderExecutiveReport = (data: ReportData) => (
    <>
      <div className="section">
        <div className="section-title">📊 Key Performance Indicators</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.alerts.total}</div>
            <div className="metric-label">Total Alerts</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.alerts.resolved}</div>
            <div className="metric-label">Resolved</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.deliveries.completed}</div>
            <div className="metric-label">Deliveries</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.cameras.uptimePercent}%</div>
            <div className="metric-label">Uptime</div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-title">⚡ System Health</div>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Camera System</td>
              <td>{data.cameras.online}/{data.cameras.total} online</td>
              <td><span className={`badge ${data.cameras.uptimePercent >= 90 ? 'badge-success' : 'badge-warning'}`}>{data.cameras.uptimePercent >= 90 ? 'Healthy' : 'Attention'}</span></td>
            </tr>
            <tr>
              <td>Alert Resolution</td>
              <td>{data.alerts.avgResolutionMinutes} min avg</td>
              <td><span className={`badge ${data.alerts.avgResolutionMinutes <= 30 ? 'badge-success' : 'badge-warning'}`}>{data.alerts.avgResolutionMinutes <= 30 ? 'Good' : 'Review'}</span></td>
            </tr>
            <tr>
              <td>Delivery Performance</td>
              <td>{data.deliveries.total > 0 ? Math.round((data.deliveries.completed / data.deliveries.total) * 100) : 100}% success</td>
              <td><span className="badge badge-success">On Track</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  const renderDetailedReport = (data: ReportData) => (
    <>
      {renderExecutiveReport(data)}
      <div className="section">
        <div className="section-title">🔔 Alerts Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Alert Type</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.byType.slice(0, 10).map((item, idx) => (
              <tr key={idx}>
                <td style={{ textTransform: 'capitalize' }}>{item.type.replace(/_/g, ' ')}</td>
                <td>{item.count}</td>
                <td>{data.alerts.total > 0 ? ((item.count / data.alerts.total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">📋 Access Requests Summary</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.accessRequests.total}</div>
            <div className="metric-label">Total Requests</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.accessRequests.approved}</div>
            <div className="metric-label">Approved</div>
          </div>
          <div className="metric-card">
            <div className="metric-value warning">{data.accessRequests.pending}</div>
            <div className="metric-label">Pending</div>
          </div>
          <div className="metric-card">
            <div className="metric-value critical">{data.accessRequests.rejected}</div>
            <div className="metric-label">Rejected</div>
          </div>
        </div>
      </div>
    </>
  );

  const renderAlertsReport = (data: ReportData) => (
    <>
      <div className="section">
        <div className="section-title">🔔 Alerts Overview</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.alerts.total}</div>
            <div className="metric-label">Total Alerts</div>
          </div>
          <div className="metric-card">
            <div className="metric-value critical">{data.alerts.critical}</div>
            <div className="metric-label">Critical</div>
          </div>
          <div className="metric-card">
            <div className="metric-value warning">{data.alerts.warning}</div>
            <div className="metric-label">Warning</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.alerts.resolved}</div>
            <div className="metric-label">Resolved</div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-title">📈 Resolution Metrics</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.alerts.avgResolutionMinutes}</div>
            <div className="metric-label">Avg Resolution (min)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.alerts.pending}</div>
            <div className="metric-label">Pending</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.alerts.total > 0 ? Math.round((data.alerts.resolved / data.alerts.total) * 100) : 100}%</div>
            <div className="metric-label">Resolution Rate</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.alerts.byType.length}</div>
            <div className="metric-label">Alert Types</div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-title">📋 Alerts by Type</div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Count</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.byType.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textTransform: 'capitalize' }}>{item.type.replace(/_/g, ' ')}</td>
                <td>{item.count}</td>
                <td>{((item.count / data.alerts.total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderDeliveriesReport = (data: ReportData) => (
    <>
      <div className="section">
        <div className="section-title">🚚 Deliveries Overview</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.deliveries.total}</div>
            <div className="metric-label">Total</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.deliveries.completed}</div>
            <div className="metric-label">Completed</div>
          </div>
          <div className="metric-card">
            <div className="metric-value warning">{data.deliveries.inProgress}</div>
            <div className="metric-label">In Progress</div>
          </div>
          <div className="metric-card">
            <div className="metric-value critical">{data.deliveries.cancelled}</div>
            <div className="metric-label">Cancelled</div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-title">⏱️ Performance Metrics</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.deliveries.avgDeliveryMinutes}</div>
            <div className="metric-label">Avg Delivery (min)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.deliveries.total > 0 ? Math.round((data.deliveries.completed / data.deliveries.total) * 100) : 100}%</div>
            <div className="metric-label">Success Rate</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.deliveries.total > 0 ? Math.round((data.deliveries.cancelled / data.deliveries.total) * 100) : 0}%</div>
            <div className="metric-label">Cancellation Rate</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{Math.round(data.deliveries.total / 7)}</div>
            <div className="metric-label">Daily Average</div>
          </div>
        </div>
      </div>
    </>
  );

  const renderOperationsReport = (data: ReportData) => (
    <>
      <div className="section">
        <div className="section-title">📹 Camera Operations</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{data.cameras.total}</div>
            <div className="metric-label">Total Cameras</div>
          </div>
          <div className="metric-card">
            <div className="metric-value success">{data.cameras.online}</div>
            <div className="metric-label">Online</div>
          </div>
          <div className="metric-card">
            <div className="metric-value critical">{data.cameras.offline}</div>
            <div className="metric-label">Offline</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data.cameras.uptimePercent}%</div>
            <div className="metric-label">Uptime</div>
          </div>
        </div>
      </div>
      {renderDeliveriesReport(data)}
      <div className="section">
        <div className="section-title">🔐 Access Management</div>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Approved</td>
              <td>{data.accessRequests.approved}</td>
              <td>{data.accessRequests.total > 0 ? Math.round((data.accessRequests.approved / data.accessRequests.total) * 100) : 0}%</td>
            </tr>
            <tr>
              <td>Pending</td>
              <td>{data.accessRequests.pending}</td>
              <td>{data.accessRequests.total > 0 ? Math.round((data.accessRequests.pending / data.accessRequests.total) * 100) : 0}%</td>
            </tr>
            <tr>
              <td>Rejected</td>
              <td>{data.accessRequests.rejected}</td>
              <td>{data.accessRequests.total > 0 ? Math.round((data.accessRequests.rejected / data.accessRequests.total) * 100) : 0}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  const renderReport = () => {
    if (!reportData) return null;
    
    switch (template) {
      case 'executive': return renderExecutiveReport(reportData);
      case 'detailed': return renderDetailedReport(reportData);
      case 'alerts': return renderAlertsReport(reportData);
      case 'deliveries': return renderDeliveriesReport(reportData);
      case 'operations': return renderOperationsReport(reportData);
      default: return renderExecutiveReport(reportData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Printer className="h-6 w-6" />
            Printable Reports
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate professional reports for offline use or printing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configure Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Template</label>
              <Select value={template} onValueChange={(v: ReportTemplate) => setTemplate(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={generatePreview} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Preview'}
            </Button>
            {reportData && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {reportData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Preview</CardTitle>
              <Badge variant="outline">
                {TEMPLATES.find(t => t.value === template)?.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={printRef} 
              className="bg-white text-black p-8 rounded-lg border"
              style={{ minHeight: '500px' }}
            >
              <div className="header">
                <div className="logo">📊 UjenziXform</div>
                <div className="subtitle">{TEMPLATES.find(t => t.value === template)?.label}</div>
                <div className="meta">
                  Period: {reportData.dateRange} | Generated: {reportData.generatedAt}
                </div>
              </div>
              
              <div style={{ marginTop: '30px' }}>
                {renderReport()}
              </div>

              <div className="footer">
                <p>UjenziXform Construction Monitoring System</p>
                <p>Confidential - For internal use only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintableReport;














