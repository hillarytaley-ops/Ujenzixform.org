/**
 * Notification Settings Component
 * User preferences for SMS, WhatsApp, and Push notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Mail, Smartphone, Moon, Save, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager';

interface NotificationPreferences {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  order_updates: boolean;
  delivery_alerts: boolean;
  quote_responses: boolean;
  promotions: boolean;
  system_alerts: boolean;
  phone_number: string;
  whatsapp_number: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPreferences: NotificationPreferences = {
  sms_enabled: true,
  whatsapp_enabled: false,
  email_enabled: true,
  push_enabled: true,
  order_updates: true,
  delivery_alerts: true,
  quote_responses: true,
  promotions: false,
  system_alerts: true,
  phone_number: '',
  whatsapp_number: '',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00'
};

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          ...defaultPreferences,
          ...data
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: '✅ Settings Saved',
        description: 'Your notification preferences have been updated.'
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label className="text-base">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive text messages</p>
              </div>
            </div>
            <Switch
              checked={preferences.sms_enabled}
              onCheckedChange={(v) => handleChange('sms_enabled', v)}
            />
          </div>

          {preferences.sms_enabled && (
            <div className="ml-12">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={preferences.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                className="mt-1 max-w-xs"
              />
            </div>
          )}

          <Separator />

          {/* WhatsApp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <Label className="text-base">WhatsApp Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive WhatsApp messages</p>
              </div>
            </div>
            <Switch
              checked={preferences.whatsapp_enabled}
              onCheckedChange={(v) => handleChange('whatsapp_enabled', v)}
            />
          </div>

          {preferences.whatsapp_enabled && (
            <div className="ml-12">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={preferences.whatsapp_number}
                onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                className="mt-1 max-w-xs"
              />
            </div>
          )}

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates</p>
              </div>
            </div>
            <Switch
              checked={preferences.email_enabled}
              onCheckedChange={(v) => handleChange('email_enabled', v)}
            />
          </div>

          <Separator />

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Smartphone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <Label className="text-base">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser/app notifications</p>
              </div>
            </div>
            <Switch
              checked={preferences.push_enabled}
              onCheckedChange={(v) => handleChange('push_enabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Order Updates</Label>
              <p className="text-sm text-muted-foreground">Status changes for your orders</p>
            </div>
            <Switch
              checked={preferences.order_updates}
              onCheckedChange={(v) => handleChange('order_updates', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Delivery Alerts</Label>
              <p className="text-sm text-muted-foreground">Real-time delivery tracking updates</p>
            </div>
            <Switch
              checked={preferences.delivery_alerts}
              onCheckedChange={(v) => handleChange('delivery_alerts', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Quote Responses</Label>
              <p className="text-sm text-muted-foreground">When suppliers respond to your quotes</p>
            </div>
            <Switch
              checked={preferences.quote_responses}
              onCheckedChange={(v) => handleChange('quote_responses', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Promotions & Offers</Label>
              <p className="text-sm text-muted-foreground">Special deals and discounts</p>
            </div>
            <Switch
              checked={preferences.promotions}
              onCheckedChange={(v) => handleChange('promotions', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>System Alerts</Label>
              <p className="text-sm text-muted-foreground">Important system notifications</p>
            </div>
            <Switch
              checked={preferences.system_alerts}
              onCheckedChange={(v) => handleChange('system_alerts', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">No notifications during set times</p>
            </div>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(v) => handleChange('quiet_hours_enabled', v)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="flex gap-4">
              <div>
                <Label htmlFor="quiet_start">Start Time</Label>
                <Input
                  id="quiet_start"
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                  className="mt-1 w-32"
                />
              </div>
              <div>
                <Label htmlFor="quiet_end">End Time</Label>
                <Input
                  id="quiet_end"
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                  className="mt-1 w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notification Manager */}
      {preferences.push_enabled && <PushNotificationManager />}

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={savePreferences} disabled={isSaving} size="lg" className="shadow-lg">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
