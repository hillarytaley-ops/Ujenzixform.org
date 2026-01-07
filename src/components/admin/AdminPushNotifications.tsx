/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔔 ADMIN PUSH NOTIFICATIONS - PROTECTED COMPONENT                                  ║
 * ║                                                                                      ║
 * ║   LAST UPDATED: December 28, 2025                                                    ║
 * ║   PURPOSE: Display admin notifications with links to dashboard tabs                  ║
 * ║                                                                                      ║
 * ║   PROTECTED FEATURES:                                                                ║
 * ║   - Links use /admin-dashboard?tab=X format                                          ║
 * ║   - Notifications for pending registrations, products, etc.                          ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Bell, Users, Package, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'registration' | 'product' | 'alert' | 'success';
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

export const AdminPushNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'builder_registrations' 
      }, () => {
        addNotification({
          type: 'registration',
          title: 'New Builder Registration',
          message: 'A new builder has registered and is pending approval.',
          link: '/admin-dashboard?tab=registrations'
        });
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'supplier_products' 
      }, (payload: any) => {
        if (payload.new?.approval_status === 'pending') {
          addNotification({
            type: 'product',
            title: 'New Product Pending',
            message: 'A supplier has added a new product for approval.',
            link: '/admin-dashboard?tab=pending-products'
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    // Fetch pending counts to generate initial notifications
    try {
      const [registrationsResult, productsResult] = await Promise.all([
        supabase.from('builder_registrations').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('supplier_products').select('id', { count: 'exact' }).eq('approval_status', 'pending')
      ]);

      const initialNotifications: Notification[] = [];

      if (registrationsResult.count && registrationsResult.count > 0) {
        initialNotifications.push({
          id: 'pending-registrations',
          type: 'registration',
          title: 'Pending Registrations',
          message: `${registrationsResult.count} builder registration(s) awaiting approval`,
          link: '/admin-dashboard?tab=registrations',
          read: false,
          created_at: new Date().toISOString()
        });
      }

      if (productsResult.count && productsResult.count > 0) {
        initialNotifications.push({
          id: 'pending-products',
          type: 'product',
          title: 'Pending Products',
          message: `${productsResult.count} product(s) awaiting approval`,
          link: '/admin-dashboard?tab=pending-products',
          read: false,
          created_at: new Date().toISOString()
        });
      }

      setNotifications(initialNotifications);
      setUnreadCount(initialNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'registration':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'product':
        return <Package className="h-4 w-4 text-orange-500" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.link}
                  onClick={() => {
                    markAsRead(notification.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t">
          <Link to="/admin-dashboard?tab=registrations" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View all in Dashboard
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdminPushNotifications;
