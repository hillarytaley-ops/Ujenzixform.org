import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  Bell,
  Mail,
  Users,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

interface EscalationRule {
  id: string;
  name: string;
  description: string;
  alert_type: string | null;
  initial_severity: string | null;
  escalate_after_minutes: number;
  escalate_to_severity: string | null;
  notify_role: string | null;
  notify_user_id: string | null;
  send_email: boolean;
  is_active: boolean;
  created_at: string;
}

interface PendingEscalation {
  alertId: string;
  alertTitle: string;
  currentSeverity: string;
  ruleId: string;
  ruleName: string;
  escalateToSeverity: string | null;
  notifyRole: string | null;
  minutesUntilEscalation: number;
  totalWaitMinutes: number;
  createdAt: string;
}

const ALERT_TYPES = [
  { value: '', label: 'Any Type' },
  { value: 'camera_offline', label: 'Camera Offline' },
  { value: 'camera_low_battery', label: 'Low Battery' },
  { value: 'motion_detected', label: 'Motion Detected' },
  { value: 'intrusion_detected', label: 'Intrusion Detected' },
  { value: 'delivery_delayed', label: 'Delivery Delayed' },
  { value: 'system_error', label: 'System Error' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'maintenance_required', label: 'Maintenance Required' }
];

const SEVERITIES = ['info', 'warning', 'critical', 'emergency'];
const ROLES = ['admin', 'builder', 'supplier', 'delivery_provider'];

const defaultRule = {
  name: '',
  description: '',
  alert_type: '',
  initial_severity: '',
  escalate_after_minutes: 30,
  escalate_to_severity: 'critical',
  notify_role: 'admin',
  notify_user_id: '',
  send_email: true,
  is_active: true
};

export const AlertEscalationManager: React.FC = () => {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [pendingEscalations, setPendingEscalations] = useState<PendingEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState(defaultRule);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchPendingEscalations();
    
    // Set up interval to check escalations every minute
    const interval = setInterval(fetchPendingEscalations, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_escalation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEscalations = async () => {
    try {
      // Fetch active, unresolved alerts
      const { data: alerts } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .in('status', ['pending', 'acknowledged'])
        .order('created_at', { ascending: true });

      // Fetch active rules
      const { data: activeRules } = await supabase
        .from('alert_escalation_rules')
        .select('*')
        .eq('is_active', true);

      if (!alerts || !activeRules) return;

      const pending: PendingEscalation[] = [];
      const now = new Date();

      alerts.forEach(alert => {
        activeRules.forEach(rule => {
          // Check if rule applies to this alert
          const typeMatches = !rule.alert_type || rule.alert_type === alert.alert_type;
          const severityMatches = !rule.initial_severity || rule.initial_severity === alert.severity;

          if (typeMatches && severityMatches) {
            const minutesSinceCreated = differenceInMinutes(now, new Date(alert.created_at));
            const minutesUntilEscalation = rule.escalate_after_minutes - minutesSinceCreated;

            if (minutesUntilEscalation > -60) { // Show escalations due within the last hour
              pending.push({
                alertId: alert.id,
                alertTitle: alert.title || `Alert #${alert.id.slice(0, 8)}`,
                currentSeverity: alert.severity,
                ruleId: rule.id,
                ruleName: rule.name,
                escalateToSeverity: rule.escalate_to_severity,
                notifyRole: rule.notify_role,
                minutesUntilEscalation,
                totalWaitMinutes: rule.escalate_after_minutes,
                createdAt: alert.created_at
              });
            }
          }
        });
      });

      // Sort by most urgent first
      pending.sort((a, b) => a.minutesUntilEscalation - b.minutesUntilEscalation);
      setPendingEscalations(pending);
    } catch (error) {
      console.error('Error fetching pending escalations:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a rule name');
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        name: formData.name,
        description: formData.description || null,
        alert_type: formData.alert_type || null,
        initial_severity: formData.initial_severity || null,
        escalate_after_minutes: formData.escalate_after_minutes,
        escalate_to_severity: formData.escalate_to_severity || null,
        notify_role: formData.notify_role || null,
        notify_user_id: formData.notify_user_id || null,
        send_email: formData.send_email,
        is_active: formData.is_active
      };

      if (editingRule) {
        const { error } = await supabase
          .from('alert_escalation_rules')
          .update(ruleData)
          .eq('id', editingRule.id);
        if (error) throw error;
        toast.success('Rule updated successfully');
      } else {
        const { error } = await supabase
          .from('alert_escalation_rules')
          .insert([ruleData]);
        if (error) throw error;
        toast.success('Rule created successfully');
      }

      setDialogOpen(false);
      setEditingRule(null);
      setFormData(defaultRule);
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      alert_type: rule.alert_type || '',
      initial_severity: rule.initial_severity || '',
      escalate_after_minutes: rule.escalate_after_minutes,
      escalate_to_severity: rule.escalate_to_severity || '',
      notify_role: rule.notify_role || '',
      notify_user_id: rule.notify_user_id || '',
      send_email: rule.send_email,
      is_active: rule.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('alert_escalation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (rule: EscalationRule) => {
    try {
      const { error } = await supabase
        .from('alert_escalation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);
      if (error) throw error;
      toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const processEscalation = async (escalation: PendingEscalation) => {
    setProcessing(true);
    try {
      // Update alert severity if escalation specifies it
      const updates: any = {};
      if (escalation.escalateToSeverity) {
        updates.severity = escalation.escalateToSeverity;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('monitoring_alerts')
          .update(updates)
          .eq('id', escalation.alertId);
        if (error) throw error;
      }

      // Create a new alert for the escalation notification
      await supabase.from('monitoring_alerts').insert([{
        alert_type: 'escalation',
        severity: escalation.escalateToSeverity || 'warning',
        title: `Escalation: ${escalation.alertTitle}`,
        message: `Alert has been escalated per rule "${escalation.ruleName}"`,
        target_role: escalation.notifyRole,
        status: 'pending'
      }]);

      toast.success('Alert escalated successfully');
      fetchPendingEscalations();
    } catch (error) {
      console.error('Error processing escalation:', error);
      toast.error('Failed to process escalation');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-900 text-white';
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      default: return 'bg-blue-500 text-white';
    }
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
            <ArrowUpCircle className="h-6 w-6" />
            Alert Escalation
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically escalate alerts based on time and severity rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchRules(); fetchPendingEscalations(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingRule(null);
              setFormData(defaultRule);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Escalation Rule'}</DialogTitle>
                <DialogDescription>
                  Define when and how alerts should be escalated
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>Rule Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Critical alerts after 30 min"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Escalate unresolved critical alerts"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Alert Type</Label>
                    <Select 
                      value={formData.alert_type} 
                      onValueChange={(v) => setFormData({ ...formData, alert_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Initial Severity</Label>
                    <Select 
                      value={formData.initial_severity} 
                      onValueChange={(v) => setFormData({ ...formData, initial_severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any Severity</SelectItem>
                        {SEVERITIES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Escalate After (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.escalate_after_minutes}
                    onChange={(e) => setFormData({ ...formData, escalate_after_minutes: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Escalate To Severity</Label>
                    <Select 
                      value={formData.escalate_to_severity} 
                      onValueChange={(v) => setFormData({ ...formData, escalate_to_severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No change" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No change</SelectItem>
                        {SEVERITIES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notify Role</Label>
                    <Select 
                      value={formData.notify_role} 
                      onValueChange={(v) => setFormData({ ...formData, notify_role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label>Send Email Notification</Label>
                  </div>
                  <Switch
                    checked={formData.send_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Enable this rule</p>
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
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRule ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Escalations */}
      {pendingEscalations.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Escalations
              <Badge variant="secondary">{pendingEscalations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {pendingEscalations.slice(0, 10).map((esc, idx) => (
                  <div 
                    key={`${esc.alertId}-${esc.ruleId}`}
                    className={`p-4 rounded-lg border ${esc.minutesUntilEscalation <= 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{esc.alertTitle}</p>
                        <p className="text-sm text-muted-foreground">Rule: {esc.ruleName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(esc.currentSeverity)}>
                          {esc.currentSeverity}
                        </Badge>
                        {esc.escalateToSeverity && (
                          <>
                            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                            <Badge className={getSeverityColor(esc.escalateToSeverity)}>
                              {esc.escalateToSeverity}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {esc.minutesUntilEscalation <= 0 
                            ? <span className="text-red-500 font-medium">Due now!</span>
                            : `Escalates in ${esc.minutesUntilEscalation} min`
                          }
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(esc.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <Progress 
                        value={Math.max(0, ((esc.totalWaitMinutes - esc.minutesUntilEscalation) / esc.totalWaitMinutes) * 100)} 
                        className="h-1"
                      />
                    </div>
                    {esc.minutesUntilEscalation <= 0 && (
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => processEscalation(esc)}
                        disabled={processing}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Escalate Now
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escalation Rules</CardTitle>
          <CardDescription>
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No escalation rules configured</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-lg border ${!rule.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{rule.name}</p>
                        {rule.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          After {rule.escalate_after_minutes} min
                        </Badge>
                        {rule.alert_type && (
                          <Badge variant="secondary">
                            Type: {rule.alert_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {rule.initial_severity && (
                          <Badge variant="secondary">
                            From: {rule.initial_severity}
                          </Badge>
                        )}
                        {rule.escalate_to_severity && (
                          <Badge variant="secondary">
                            To: {rule.escalate_to_severity}
                          </Badge>
                        )}
                        {rule.notify_role && (
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            Notify: {rule.notify_role}
                          </Badge>
                        )}
                        {rule.send_email && (
                          <Badge variant="secondary">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleActive(rule)}
                      >
                        {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(rule.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertEscalationManager;














