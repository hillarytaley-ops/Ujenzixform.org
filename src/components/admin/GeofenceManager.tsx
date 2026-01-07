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
import { Slider } from '@/components/ui/slider';
import { 
  MapPin,
  Circle,
  Hexagon,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Bell,
  ArrowRightCircle,
  ArrowLeftCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Truck,
  Clock,
  Target,
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Geofence {
  id: string;
  name: string;
  description: string;
  fence_type: 'circle' | 'polygon';
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  alert_severity: string;
  notify_roles: string[];
  created_at: string;
}

interface GeofenceEvent {
  id: string;
  geofence_id: string;
  geofence_name?: string;
  delivery_route_id: string;
  event_type: 'enter' | 'exit' | 'dwell';
  latitude: number;
  longitude: number;
  triggered_at: string;
  alert_sent: boolean;
}

const SEVERITIES = ['info', 'warning', 'critical', 'emergency'];
const ROLES = ['admin', 'builder', 'supplier', 'delivery_provider'];

const defaultGeofence = {
  name: '',
  description: '',
  fence_type: 'circle' as const,
  center_lat: -1.2921,
  center_lng: 36.8219,
  radius_meters: 500,
  is_active: true,
  alert_on_enter: true,
  alert_on_exit: true,
  alert_severity: 'info',
  notify_roles: ['admin']
};

export const GeofenceManager: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [formData, setFormData] = useState(defaultGeofence);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGeofences();
    fetchEvents();

    // Set up real-time subscription for events
    const channel = supabase
      .channel('geofence-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'geofence_events' }, (payload) => {
        const event = payload.new as GeofenceEvent;
        toast.info(`Geofence ${event.event_type}: Vehicle crossed zone boundary`, {
          icon: event.event_type === 'enter' ? '📍' : '🚪'
        });
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGeofences = async () => {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGeofences(data || []);
    } catch (error) {
      console.error('Error fetching geofences:', error);
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from('geofence_events')
        .select(`
          *,
          geofences(name)
        `)
        .order('triggered_at', { ascending: false })
        .limit(50);

      setEvents((data || []).map(e => ({
        ...e,
        geofence_name: e.geofences?.name
      })));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a zone name');
      return;
    }

    setSaving(true);
    try {
      const geoData = {
        name: formData.name,
        description: formData.description || null,
        fence_type: formData.fence_type,
        center_lat: formData.center_lat,
        center_lng: formData.center_lng,
        radius_meters: formData.radius_meters,
        is_active: formData.is_active,
        alert_on_enter: formData.alert_on_enter,
        alert_on_exit: formData.alert_on_exit,
        alert_severity: formData.alert_severity,
        notify_roles: formData.notify_roles
      };

      if (editingGeofence) {
        const { error } = await supabase
          .from('geofences')
          .update(geoData)
          .eq('id', editingGeofence.id);
        if (error) throw error;
        toast.success('Geofence updated');
      } else {
        const { error } = await supabase
          .from('geofences')
          .insert([geoData]);
        if (error) throw error;
        toast.success('Geofence created');
      }

      setDialogOpen(false);
      setEditingGeofence(null);
      setFormData(defaultGeofence);
      fetchGeofences();
    } catch (error) {
      console.error('Error saving geofence:', error);
      toast.error('Failed to save geofence');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this geofence zone?')) return;
    try {
      await supabase.from('geofences').delete().eq('id', id);
      toast.success('Geofence deleted');
      fetchGeofences();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleToggle = async (geofence: Geofence) => {
    try {
      await supabase
        .from('geofences')
        .update({ is_active: !geofence.is_active })
        .eq('id', geofence.id);
      toast.success(geofence.is_active ? 'Geofence disabled' : 'Geofence enabled');
      fetchGeofences();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const simulateEvent = async (geofence: Geofence, eventType: 'enter' | 'exit') => {
    try {
      await supabase.rpc('trigger_geofence_alert', {
        p_geofence_id: geofence.id,
        p_delivery_route_id: null,
        p_event_type: eventType,
        p_lat: geofence.center_lat,
        p_lng: geofence.center_lng
      });
      toast.success(`Simulated ${eventType} event`);
      fetchEvents();
    } catch (error) {
      console.error('Error simulating event:', error);
      toast.error('Failed to simulate event');
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
            <Target className="h-6 w-6" />
            Geofencing Alerts
          </h3>
          <p className="text-sm text-muted-foreground">
            Set up geographic zones to track delivery vehicles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchGeofences(); fetchEvents(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingGeofence(null); setFormData(defaultGeofence); }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Zone</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingGeofence ? 'Edit Geofence' : 'Create Geofence Zone'}</DialogTitle>
                <DialogDescription>Define a geographic area to monitor for delivery vehicles</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>Zone Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Construction Site Alpha"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Main delivery drop-off point"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Center Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.center_lat}
                      onChange={(e) => setFormData({ ...formData, center_lat: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Center Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.center_lng}
                      onChange={(e) => setFormData({ ...formData, center_lng: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Radius: {formData.radius_meters} meters</Label>
                  <Slider
                    value={[formData.radius_meters]}
                    onValueChange={(v) => setFormData({ ...formData, radius_meters: v[0] })}
                    min={50}
                    max={5000}
                    step={50}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>50m</span>
                    <span>5km</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="h-4 w-4 text-green-500" />
                      <Label>Alert on Entry</Label>
                    </div>
                    <Switch
                      checked={formData.alert_on_enter}
                      onCheckedChange={(checked) => setFormData({ ...formData, alert_on_enter: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowLeftCircle className="h-4 w-4 text-red-500" />
                      <Label>Alert on Exit</Label>
                    </div>
                    <Switch
                      checked={formData.alert_on_exit}
                      onCheckedChange={(checked) => setFormData({ ...formData, alert_on_exit: checked })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Alert Severity</Label>
                  <Select value={formData.alert_severity} onValueChange={(v) => setFormData({ ...formData, alert_severity: v })}>
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

                <div>
                  <Label className="mb-2 block">Notify Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(role => (
                      <Badge
                        key={role}
                        variant={formData.notify_roles.includes(role) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            notify_roles: formData.notify_roles.includes(role)
                              ? formData.notify_roles.filter(r => r !== role)
                              : [...formData.notify_roles, role]
                          });
                        }}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
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
                  {editingGeofence ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones">Geofence Zones ({geofences.length})</TabsTrigger>
          <TabsTrigger value="events">Event Log ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          {geofences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="font-medium text-lg">No Geofence Zones</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create zones to receive alerts when vehicles enter or exit areas
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Zone
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {geofences.map(geofence => (
                <Card key={geofence.id} className={!geofence.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${geofence.is_active ? 'bg-green-500/10' : 'bg-slate-500/10'}`}>
                          <Circle className={`h-6 w-6 ${geofence.is_active ? 'text-green-500' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {geofence.name}
                            {geofence.is_active ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </h4>
                          {geofence.description && (
                            <p className="text-sm text-muted-foreground">{geofence.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggle(geofence)}>
                          {geofence.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingGeofence(geofence);
                          setFormData({
                            name: geofence.name,
                            description: geofence.description || '',
                            fence_type: geofence.fence_type,
                            center_lat: geofence.center_lat,
                            center_lng: geofence.center_lng,
                            radius_meters: geofence.radius_meters,
                            is_active: geofence.is_active,
                            alert_on_enter: geofence.alert_on_enter,
                            alert_on_exit: geofence.alert_on_exit,
                            alert_severity: geofence.alert_severity,
                            notify_roles: geofence.notify_roles
                          });
                          setDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(geofence.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span>{geofence.center_lat.toFixed(4)}, {geofence.center_lng.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span>{geofence.radius_meters}m radius</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {geofence.alert_on_enter && (
                        <Badge variant="secondary" className="text-xs">
                          <ArrowRightCircle className="h-3 w-3 mr-1 text-green-500" />
                          Entry Alert
                        </Badge>
                      )}
                      {geofence.alert_on_exit && (
                        <Badge variant="secondary" className="text-xs">
                          <ArrowLeftCircle className="h-3 w-3 mr-1 text-red-500" />
                          Exit Alert
                        </Badge>
                      )}
                      <Badge className={getSeverityColor(geofence.alert_severity)}>
                        {geofence.alert_severity}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => simulateEvent(geofence, 'enter')}
                      >
                        <ArrowRightCircle className="h-4 w-4 mr-1 text-green-500" />
                        Simulate Entry
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => simulateEvent(geofence, 'exit')}
                      >
                        <ArrowLeftCircle className="h-4 w-4 mr-1 text-red-500" />
                        Simulate Exit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Geofence Events</CardTitle>
              <CardDescription>Real-time tracking of zone entries and exits</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No events recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {events.map(event => (
                      <div key={event.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {event.event_type === 'enter' ? (
                            <div className="p-2 rounded-full bg-green-500/10">
                              <ArrowRightCircle className="h-5 w-5 text-green-500" />
                            </div>
                          ) : event.event_type === 'exit' ? (
                            <div className="p-2 rounded-full bg-red-500/10">
                              <ArrowLeftCircle className="h-5 w-5 text-red-500" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-blue-500/10">
                              <Clock className="h-5 w-5 text-blue-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {event.event_type === 'enter' ? 'Entered' : event.event_type === 'exit' ? 'Exited' : 'Dwelling in'} {event.geofence_name || 'Zone'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {event.alert_sent && (
                              <Badge variant="outline" className="text-green-500 border-green-500/30">
                                <Bell className="h-3 w-3 mr-1" />
                                Alerted
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.triggered_at), 'MMM dd, HH:mm:ss')}
                          </p>
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

export default GeofenceManager;














