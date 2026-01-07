import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Settings,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useMonitoringAlerts } from '@/hooks/useMonitoringAlerts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { 
    alerts, 
    unreadCount, 
    loading, 
    acknowledgeAlert, 
    dismissAlert,
    requestNotificationPermission 
  } = useMonitoringAlerts();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'emergency':
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 animate-pulse text-yellow-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={requestNotificationPermission}
                title="Enable push notifications"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </CardHeader>
        <Separator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All caught up!</p>
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={cn(
                    "p-4 hover:bg-accent/50 transition-colors",
                    alert.status === 'active' && getSeverityBg(alert.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">
                          {alert.alert_type?.replace('_', ' ')}
                        </Badge>
                        {alert.status === 'active' && (
                          <div className="flex gap-1 ml-auto">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Ack
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-red-500 hover:text-red-600"
                              onClick={() => dismissAlert(alert.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full justify-center text-sm"
            onClick={() => {
              setOpen(false);
              window.location.href = '/admin?tab=monitoring-requests';
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;














