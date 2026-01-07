import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Send,
  FileText,
  BarChart3,
  Bell,
  Truck,
  Camera,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  recipients: string[];
  include_alerts: boolean;
  include_deliveries: boolean;
  include_cameras: boolean;
  include_analytics: boolean;
  is_active: boolean;
  last_sent_at?: string;
  next_run_at?: string;
  created_at: string;
}

interface ReportFormData {
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number;
  day_of_month: number;
  time: string;
  recipients: string;
  include_alerts: boolean;
  include_deliveries: boolean;
  include_cameras: boolean;
  include_analytics: boolean;
  is_active: boolean;
}

const defaultFormData: ReportFormData = {
  name: '',
  description: '',
  frequency: 'daily',
  day_of_week: 1,
  day_of_month: 1,
  time: '08:00',
  recipients: '',
  include_alerts: true,
  include_deliveries: true,
  include_cameras: true,
  include_analytics: true,
  is_active: true
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduledReportsManager: React.FC = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // If table doesn't exist, set empty array
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRun = (frequency: string, dayOfWeek: number, dayOfMonth: number, time: string): Date => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      switch (frequency) {
        case 'daily':
          nextRun = addDays(nextRun, 1);
          break;
        case 'weekly':
          nextRun = addWeeks(nextRun, 1);
          while (nextRun.getDay() !== dayOfWeek) {
            nextRun = addDays(nextRun, 1);
          }
          break;
        case 'monthly':
          nextRun = addMonths(nextRun, 1);
          nextRun.setDate(Math.min(dayOfMonth, new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate()));
          break;
      }
    }
    
    return nextRun;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.recipients) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const recipientList = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);
      const nextRun = calculateNextRun(formData.frequency, formData.day_of_week, formData.day_of_month, formData.time);

      const reportData = {
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency,
        day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : null,
        day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : null,
        time: formData.time,
        recipients: recipientList,
        include_alerts: formData.include_alerts,
        include_deliveries: formData.include_deliveries,
        include_cameras: formData.include_cameras,
        include_analytics: formData.include_analytics,
        is_active: formData.is_active,
        next_run_at: nextRun.toISOString()
      };

      if (editingReport) {
        const { error } = await supabase
          .from('scheduled_reports')
          .update(reportData)
          .eq('id', editingReport.id);
        
        if (error) throw error;
        toast.success('Report updated successfully');
      } else {
        const { error } = await supabase
          .from('scheduled_reports')
          .insert([reportData]);
        
        if (error) throw error;
        toast.success('Report created successfully');
      }

      setDialogOpen(false);
      setEditingReport(null);
      setFormData(defaultFormData);
      fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      description: report.description || '',
      frequency: report.frequency,
      day_of_week: report.day_of_week || 1,
      day_of_month: report.day_of_month || 1,
      time: report.time,
      recipients: report.recipients.join(', '),
      include_alerts: report.include_alerts,
      include_deliveries: report.include_deliveries,
      include_cameras: report.include_cameras,
      include_analytics: report.include_analytics,
      is_active: report.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Report deleted');
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleToggleActive = async (report: ScheduledReport) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !report.is_active })
        .eq('id', report.id);
      
      if (error) throw error;
      toast.success(report.is_active ? 'Report paused' : 'Report activated');
      fetchReports();
    } catch (error) {
      console.error('Error toggling report:', error);
      toast.error('Failed to update report');
    }
  };

  const handleSendTest = async (report: ScheduledReport) => {
    setSendingTest(report.id);
    try {
      // Call Edge Function to send test email
      const response = await supabase.functions.invoke('send-scheduled-report', {
        body: { reportId: report.id, isTest: true }
      });

      if (response.error) throw response.error;
      toast.success('Test report sent successfully!');
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Failed to send test report');
    } finally {
      setSendingTest(null);
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      daily: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      weekly: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      monthly: 'bg-green-500/20 text-green-500 border-green-500/30'
    };
    return colors[frequency as keyof typeof colors] || colors.daily;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Scheduled Reports
          </h3>
          <p className="text-sm text-muted-foreground">
            Automate email reports on a daily, weekly, or monthly basis
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingReport(null);
            setFormData(defaultFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReport ? 'Edit Report' : 'Create Scheduled Report'}</DialogTitle>
              <DialogDescription>
                Configure an automated email report to be sent on a schedule
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Report Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Daily Monitoring Summary"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Overview of monitoring activity"
                  />
                </div>
                <div>
                  <Label htmlFor="recipients">Recipients * (comma-separated emails)</Label>
                  <Input
                    id="recipients"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    placeholder="admin@example.com, manager@example.com"
                  />
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setFormData({ ...formData, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label>Day of Week</Label>
                    <Select 
                      value={String(formData.day_of_week)} 
                      onValueChange={(v) => setFormData({ ...formData, day_of_week: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <Label>Day of Month</Label>
                    <Select 
                      value={String(formData.day_of_month)} 
                      onValueChange={(v) => setFormData({ ...formData, day_of_month: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Content */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Report Content
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="alerts"
                      checked={formData.include_alerts}
                      onCheckedChange={(checked) => setFormData({ ...formData, include_alerts: !!checked })}
                    />
                    <Label htmlFor="alerts" className="flex items-center gap-2 cursor-pointer">
                      <Bell className="h-4 w-4 text-red-500" />
                      Alerts Summary
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="deliveries"
                      checked={formData.include_deliveries}
                      onCheckedChange={(checked) => setFormData({ ...formData, include_deliveries: !!checked })}
                    />
                    <Label htmlFor="deliveries" className="flex items-center gap-2 cursor-pointer">
                      <Truck className="h-4 w-4 text-blue-500" />
                      Deliveries Summary
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="cameras"
                      checked={formData.include_cameras}
                      onCheckedChange={(checked) => setFormData({ ...formData, include_cameras: !!checked })}
                    />
                    <Label htmlFor="cameras" className="flex items-center gap-2 cursor-pointer">
                      <Camera className="h-4 w-4 text-purple-500" />
                      Camera Status
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="analytics"
                      checked={formData.include_analytics}
                      onCheckedChange={(checked) => setFormData({ ...formData, include_analytics: !!checked })}
                    />
                    <Label htmlFor="analytics" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                      Analytics Data
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this report</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingReport ? 'Update Report' : 'Create Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium text-lg">No Scheduled Reports</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create automated reports to receive regular updates via email
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className={!report.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{report.name}</h4>
                      <Badge variant="outline" className={getFrequencyBadge(report.frequency)}>
                        {report.frequency}
                      </Badge>
                      {report.is_active ? (
                        <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-500/20 text-slate-500 border-slate-500/30">
                          <Pause className="h-3 w-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {report.time}
                        {report.frequency === 'weekly' && report.day_of_week !== null && (
                          <span> on {DAYS_OF_WEEK[report.day_of_week]}</span>
                        )}
                        {report.frequency === 'monthly' && report.day_of_month && (
                          <span> on day {report.day_of_month}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                      </div>
                      {report.next_run_at && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Next: {format(new Date(report.next_run_at), 'MMM dd, HH:mm')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {report.include_alerts && (
                        <Badge variant="secondary" className="text-xs">
                          <Bell className="h-3 w-3 mr-1" />
                          Alerts
                        </Badge>
                      )}
                      {report.include_deliveries && (
                        <Badge variant="secondary" className="text-xs">
                          <Truck className="h-3 w-3 mr-1" />
                          Deliveries
                        </Badge>
                      )}
                      {report.include_cameras && (
                        <Badge variant="secondary" className="text-xs">
                          <Camera className="h-3 w-3 mr-1" />
                          Cameras
                        </Badge>
                      )}
                      {report.include_analytics && (
                        <Badge variant="secondary" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Analytics
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleSendTest(report)}
                      disabled={sendingTest === report.id}
                      title="Send test email"
                    >
                      {sendingTest === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleActive(report)}
                      title={report.is_active ? 'Pause' : 'Activate'}
                    >
                      {report.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(report)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(report.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduledReportsManager;














