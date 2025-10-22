import { useState, useEffect } from 'react';
import { Delivery, DeliveryNotification } from '@/types/delivery';
import { useToast } from '@/hooks/use-toast';

interface OfflineData {
  deliveries: Delivery[];
  notifications: DeliveryNotification[];
  lastSync: string;
  pendingActions: PendingAction[];
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'deliveries' | 'delivery_tracking' | 'delivery_notifications';
  data: any;
  timestamp: string;
}

interface UseOfflineDeliveriesResult {
  isOnline: boolean;
  offlineData: OfflineData | null;
  syncPendingActions: () => Promise<boolean>;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp'>) => void;
  clearOfflineData: () => void;
  getOfflineDeliveries: () => Delivery[];
  getOfflineNotifications: () => DeliveryNotification[];
}

const STORAGE_KEY = 'ujenzipro_offline_deliveries';
const MAX_OFFLINE_DAYS = 7;

export const useOfflineDeliveries = (): UseOfflineDeliveriesResult => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load offline data from localStorage
    loadOfflineData();

    // Set up online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing pending changes...",
      });
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Working offline. Changes will sync when connection is restored.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: OfflineData = JSON.parse(stored);
        
        // Check if data is not too old
        const lastSync = new Date(data.lastSync);
        const maxAge = new Date(Date.now() - MAX_OFFLINE_DAYS * 24 * 60 * 60 * 1000);
        
        if (lastSync > maxAge) {
          setOfflineData(data);
        } else {
          // Clear old offline data
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = (data: OfflineData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
      toast({
        title: "Storage Error",
        description: "Could not save offline data. Storage may be full.",
        variant: "destructive"
      });
    }
  };

  const addPendingAction = (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const newAction: PendingAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    const currentData = offlineData || {
      deliveries: [],
      notifications: [],
      lastSync: new Date().toISOString(),
      pendingActions: []
    };

    const updatedData: OfflineData = {
      ...currentData,
      pendingActions: [...currentData.pendingActions, newAction]
    };

    saveOfflineData(updatedData);

    toast({
      title: "Action Queued",
      description: "Action saved offline and will sync when connection is restored.",
    });
  };

  const syncPendingActions = async (): Promise<boolean> => {
    if (!offlineData || offlineData.pendingActions.length === 0) {
      return true;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      let successCount = 0;
      let errorCount = 0;

      for (const action of offlineData.pendingActions) {
        try {
          switch (action.type) {
            case 'create':
              await supabase.from(action.table).insert(action.data);
              break;
            case 'update':
              await supabase.from(action.table).update(action.data).eq('id', action.data.id);
              break;
            case 'delete':
              await supabase.from(action.table).delete().eq('id', action.data.id);
              break;
          }
          successCount++;
        } catch (actionError) {
          console.error(`Error syncing action ${action.id}:`, actionError);
          errorCount++;
        }
      }

      if (successCount > 0) {
        // Clear successfully synced actions
        const updatedData: OfflineData = {
          ...offlineData,
          pendingActions: offlineData.pendingActions.slice(successCount),
          lastSync: new Date().toISOString()
        };
        saveOfflineData(updatedData);

        toast({
          title: "Sync Complete",
          description: `${successCount} actions synced successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
      }

      return errorCount === 0;

    } catch (error) {
      console.error('Error syncing pending actions:', error);
      toast({
        title: "Sync Failed",
        description: "Could not sync offline changes. Will retry automatically.",
        variant: "destructive"
      });
      return false;
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOfflineData(null);
    toast({
      title: "Offline Data Cleared",
      description: "All offline data has been cleared.",
    });
  };

  const getOfflineDeliveries = (): Delivery[] => {
    return offlineData?.deliveries || [];
  };

  const getOfflineNotifications = (): DeliveryNotification[] => {
    return offlineData?.notifications || [];
  };

  // Cache deliveries for offline use
  const cacheDeliveries = (deliveries: Delivery[]) => {
    if (!isOnline) return; // Don't cache when offline

    const currentData = offlineData || {
      deliveries: [],
      notifications: [],
      lastSync: new Date().toISOString(),
      pendingActions: []
    };

    const updatedData: OfflineData = {
      ...currentData,
      deliveries: deliveries,
      lastSync: new Date().toISOString()
    };

    saveOfflineData(updatedData);
  };

  // Cache notifications for offline use
  const cacheNotifications = (notifications: DeliveryNotification[]) => {
    if (!isOnline) return; // Don't cache when offline

    const currentData = offlineData || {
      deliveries: [],
      notifications: [],
      lastSync: new Date().toISOString(),
      pendingActions: []
    };

    const updatedData: OfflineData = {
      ...currentData,
      notifications: notifications,
      lastSync: new Date().toISOString()
    };

    saveOfflineData(updatedData);
  };

  return {
    isOnline,
    offlineData,
    syncPendingActions,
    addPendingAction,
    clearOfflineData,
    getOfflineDeliveries,
    getOfflineNotifications
  };
};
