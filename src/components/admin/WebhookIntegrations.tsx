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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Webhook,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  MessageSquare,
  Hash,
  Bell,
  AlertTriangle,
  Truck,
  Camera,
  Shield,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WebhookConfig {
  id: string;
  name: string;
  platform: 'slack' | 'teams' | 'discord' | 'custom';
  webhook_url: string;
  is_active: boolean;
  alert_types: string[];
  min_severity: string;
  include_deliveries: boolean;
  include_cameras: boolean;
  last_triggered_at?: string;
  success_count: number;
  failure_count: number;
  created_at: string;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'success' | 'failed';
  response_code?: number;
  error_message?: string;
  created_at: string;
}

const PLATFORMS = [
  { value: 'slack', label: 'Slack', icon: '💬', color: 'bg-[#4A154B]' },
  { value: 'teams', label: 'Microsoft Teams', icon: '💼', color: 'bg-[#6264A7]' },
  { value: 'discord', label: 'Discord', icon: '🎮', color: 'bg-[#5865F2]' },
  { value: 'custom', label: 'Custom Webhook', icon: '🔗', color: 'bg-gray-600' }
];

const ALERT_TYPES = [
  { value: 'camera_offline', label: 'Camera Offline' },
  { value: 'camera_low_battery', label: 'Low Battery' },
  { value: 'intrusion_detected', label: 'Intrusion Detected' },
  { value: 'delivery_delayed', label: 'Delivery Delayed' },
  { value: 'delivery_arrived', label: 'Delivery Arrived' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'system_error', label: 'System Error' },
  { value: 'escalation', label: 'Escalation' }
];

const SEVERITIES = ['info', 'warning', 'critical', 'emergency'];

const defaultConfig = {
  name: '',
  platform: 'slack' as const,
  webhook_url: '',
  is_active: true,
  alert_types: ['camera_offline', 'security_breach', 'escalation'],
  min_severity: 'warning',
  include_deliveries: true,
  include_cameras: true
};

export const WebhookIntegrations: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWebhooks();
    fetchLogs();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.webhook_url) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const webhookData = {
        name: formData.name,
        platform: formData.platform,
        webhook_url: formData.webhook_url,
        is_active: formData.is_active,
        alert_types: formData.alert_types,
        min_severity: formData.min_severity,
        include_deliveries: formData.include_deliveries,
        include_cameras: formData.include_cameras
      };

      if (editingWebhook) {
        const { error } = await supabase
          .from('webhook_integrations')
          .update(webhookData)
          .eq('id', editingWebhook.id);
        if (error) throw error;
        toast.success('Webhook updated');
      } else {
        const { error } = await supabase
          .from('webhook_integrations')
          .insert([{ ...webhookData, success_count: 0, failure_count: 0 }]);
        if (error) throw error;
        toast.success('Webhook created');
      }

      setDialogOpen(false);
      setEditingWebhook(null);
      setFormData(defaultConfig);
      fetchWebhooks();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error('Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (webhook: WebhookConfig) => {
    setTesting(webhook.id);
    try {
      const testPayload = buildPayload(webhook.platform, {
        type: 'test',
        title: '🧪 Test Notification',
        message: 'This is a test message from UjenziXform to verify your webhook integration.',
        severity: 'info',
        timestamp: new Date().toISOString()
      });

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast.success('Test message sent successfully!');
        // Log success
        await supabase.from('webhook_logs').insert([{
          webhook_id: webhook.id,
          event_type: 'test',
          payload: testPayload,
          status: 'success',
          response_code: response.status
        }]);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
      // Log failure
      await supabase.from('webhook_logs').insert([{
        webhook_id: webhook.id,
        event_type: 'test',
        payload: {},
        status: 'failed',
        error_message: error.message
      }]);
    } finally {
      setTesting(null);
      fetchLogs();
    }
  };

  const buildPayload = (platform: string, data: any) => {
    const emoji = data.severity === 'critical' || data.severity === 'emergency' ? '🚨' :
                  data.severity === 'warning' ? '⚠️' : 'ℹ️';

    switch (platform) {
      case 'slack':
        return {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `${emoji} ${data.title}`, emoji: true }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: data.message }
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `*Severity:* ${data.severity}` },
                { type: 'mrkdwn', text: `*Time:* ${format(new Date(data.timestamp), 'MMM dd, HH:mm')}` }
              ]
            }
          ]
        };

      case 'teams':
        return {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: data.severity === 'critical' ? 'FF0000' : data.severity === 'warning' ? 'FFA500' : '0076D7',
          summary: data.title,
          sections: [{
            activityTitle: `${emoji} ${data.title}`,
            facts: [
              { name: 'Message', value: data.message },
              { name: 'Severity', value: data.severity },
              { name: 'Time', value: format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm') }
            ]
          }]
        };

      case 'discord':
        return {
          embeds: [{
            title: `${emoji} ${data.title}`,
            description: data.message,
            color: data.severity === 'critical' ? 0xFF0000 : data.severity === 'warning' ? 0xFFA500 : 0x0099FF,
            fields: [
              { name: 'Severity', value: data.severity, inline: true },
              { name: 'Time', value: format(new Date(data.timestamp), 'MMM dd, HH:mm'), inline: true }
            ],
            footer: { text: 'UjenziXform Monitoring' }
          }]
        };

      default:
        return data;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook integration?')) return;
    try {
      await supabase.from('webhook_integrations').delete().eq('id', id);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleToggle = async (webhook: WebhookConfig) => {
    try {
      await supabase
        .from('webhook_integrations')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);
      toast.success(webhook.is_active ? 'Webhook disabled' : 'Webhook enabled');
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getPlatformInfo = (platform: string) => PLATFORMS.find(p => p.value === platform) || PLATFORMS[3];

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
            <Webhook className="h-6 w-6" />
            Webhook Integrations
          </h3>
          <p className="text-sm text-muted-foreground">
            Send alerts to Slack, Teams, Discord, or custom endpoints
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditingWebhook(null); setFormData(defaultConfig); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Webhook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Add Webhook Integration'}</DialogTitle>
              <DialogDescription>Connect to external notification services</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Integration Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Production Alerts Channel"
                />
              </div>

              <div>
                <Label>Platform</Label>
                <Select value={formData.platform} onValueChange={(v: any) => setFormData({ ...formData, platform: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Webhook URL *</Label>
                <Input
                  type="password"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.platform === 'slack' && 'Get this from Slack App → Incoming Webhooks'}
                  {formData.platform === 'teams' && 'Get this from Teams channel → Connectors → Incoming Webhook'}
                  {formData.platform === 'discord' && 'Get this from Discord channel settings → Integrations → Webhooks'}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="mb-2 block">Alert Types to Send</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALERT_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={formData.alert_types.includes(type.value)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            alert_types: checked
                              ? [...formData.alert_types, type.value]
                              : formData.alert_types.filter(t => t !== type.value)
                          });
                        }}
                      />
                      <Label htmlFor={type.value} className="text-sm cursor-pointer">{type.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Minimum Severity</Label>
                <Select value={formData.min_severity} onValueChange={(v) => setFormData({ ...formData, min_severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Include Delivery Updates</Label>
                  <Switch
                    checked={formData.include_deliveries}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_deliveries: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include Camera Status</Label>
                  <Switch
                    checked={formData.include_cameras}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_cameras: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingWebhook ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Integrations ({webhooks.length})</TabsTrigger>
          <TabsTrigger value="logs">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="font-medium text-lg">No Webhooks Configured</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect Slack, Teams, or Discord to receive alerts
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map(webhook => {
                const platform = getPlatformInfo(webhook.platform);
                return (
                  <Card key={webhook.id} className={!webhook.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${platform.color} text-white text-2xl`}>
                            {platform.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{webhook.name}</h4>
                              <Badge variant="outline">{platform.label}</Badge>
                              {webhook.is_active ? (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Paused</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span className="font-mono text-xs truncate max-w-[200px]">
                                {showUrl[webhook.id] ? webhook.webhook_url : '••••••••••••••••'}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => setShowUrl({ ...showUrl, [webhook.id]: !showUrl[webhook.id] })}
                              >
                                {showUrl[webhook.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(webhook.webhook_url)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {webhook.alert_types.slice(0, 3).map(type => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                              {webhook.alert_types.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{webhook.alert_types.length - 3} more
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {webhook.success_count} sent
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-500" />
                                {webhook.failure_count} failed
                              </span>
                              {webhook.last_triggered_at && (
                                <span>Last: {format(new Date(webhook.last_triggered_at), 'MMM dd, HH:mm')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTest(webhook)}
                            disabled={testing === webhook.id}
                          >
                            {testing === webhook.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(webhook)}>
                            {webhook.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingWebhook(webhook);
                            setFormData({
                              name: webhook.name,
                              platform: webhook.platform,
                              webhook_url: webhook.webhook_url,
                              is_active: webhook.is_active,
                              alert_types: webhook.alert_types,
                              min_severity: webhook.min_severity,
                              include_deliveries: webhook.include_deliveries,
                              include_cameras: webhook.include_cameras
                            });
                            setDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(webhook.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Last 50 webhook deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{log.event_type}</p>
                            {log.error_message && (
                              <p className="text-xs text-red-500">{log.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {log.response_code && <Badge variant="outline">{log.response_code}</Badge>}
                          <p className="mt-1">{format(new Date(log.created_at), 'MMM dd, HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebhookIntegrations;














