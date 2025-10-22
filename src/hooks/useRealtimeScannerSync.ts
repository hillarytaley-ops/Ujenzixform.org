import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScanEvent {
  id: string;
  qr_code: string;
  material_type: string;
  scan_type: 'dispatch' | 'receiving' | 'verification';
  scanner_user: string;
  location: string;
  timestamp: string;
  status: string;
}

interface SyncStatus {
  isConnected: boolean;
  lastSync: string;
  pendingUpdates: number;
  syncErrors: number;
}

interface UseRealtimeScannerSyncResult {
  scanEvents: ScanEvent[];
  syncStatus: SyncStatus;
  broadcastScan: (scanData: Partial<ScanEvent>) => Promise<boolean>;
  subscribeTo: (channels: string[]) => void;
  unsubscribeAll: () => void;
  forcSync: () => Promise<boolean>;
  isConnected: boolean;
}

export const useRealtimeScannerSync = (): UseRealtimeScannerSyncResult => {
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: new Date().toISOString(),
    pendingUpdates: 0,
    syncErrors: 0
  });
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const { toast } = useToast();

  // Initialize real-time connection
  useEffect(() => {
    initializeRealtimeConnection();
    
    return () => {
      unsubscribeAll();
    };
  }, []);

  const initializeRealtimeConnection = async () => {
    try {
      // Subscribe to scanner events
      const scannerChannel = supabase
        .channel('scanner_events')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'scanner_audit_log' },
          (payload) => {
            handleNewScanEvent(payload.new);
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'material_items' },
          (payload) => {
            handleMaterialUpdate(payload.new);
          }
        )
        .subscribe((status) => {
          setSyncStatus(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED'
          }));
          
          if (status === 'SUBSCRIBED') {
            toast({
              title: "Real-time Sync Active",
              description: "Connected to live scanner updates",
            });
          } else if (status === 'CHANNEL_ERROR') {
            toast({
              title: "Sync Error",
              description: "Real-time connection failed",
              variant: "destructive"
            });
          }
        });

      setSubscriptions(prev => [...prev, scannerChannel]);

    } catch (error) {
      console.error('Error initializing real-time connection:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: prev.syncErrors + 1
      }));
    }
  };

  const handleNewScanEvent = (scanData: any) => {
    const scanEvent: ScanEvent = {
      id: scanData.id,
      qr_code: scanData.qr_code,
      material_type: scanData.material_type || 'Unknown',
      scan_type: scanData.scan_type,
      scanner_user: scanData.user_id,
      location: scanData.scan_location_description || 'Unknown',
      timestamp: scanData.created_at,
      status: scanData.scan_success ? 'success' : 'failed'
    };

    setScanEvents(prev => [scanEvent, ...prev.slice(0, 99)]);
    
    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));

    // Show notification for important events
    if (scanEvent.scan_type === 'verification' || scanEvent.status === 'failed') {
      toast({
        title: "Live Scan Update",
        description: `${scanEvent.material_type} ${scanEvent.scan_type} - ${scanEvent.status}`,
        variant: scanEvent.status === 'failed' ? 'destructive' : 'default'
      });
    }
  };

  const handleMaterialUpdate = (materialData: any) => {
    // Update local state when materials are updated
    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));
  };

  const broadcastScan = useCallback(async (scanData: Partial<ScanEvent>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Create scan event
      const scanEvent: ScanEvent = {
        id: `scan-${Date.now()}`,
        qr_code: scanData.qr_code || '',
        material_type: scanData.material_type || 'Unknown',
        scan_type: scanData.scan_type || 'verification',
        scanner_user: user.id,
        location: scanData.location || 'Unknown',
        timestamp: new Date().toISOString(),
        status: scanData.status || 'success'
      };

      // Broadcast to all connected clients via database insert
      // The real-time subscription will pick this up
      const { error } = await supabase
        .from('scanner_audit_log')
        .insert({
          user_id: user.id,
          qr_code: scanEvent.qr_code,
          scan_type: scanEvent.scan_type,
          scanner_type: 'realtime_broadcast',
          scan_location_description: scanEvent.location,
          scan_success: scanEvent.status === 'success'
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error broadcasting scan:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: prev.syncErrors + 1
      }));
      return false;
    }
  }, []);

  const subscribeTo = (channels: string[]) => {
    channels.forEach(channelName => {
      const channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'scan_update' }, (payload) => {
          handleNewScanEvent(payload);
        })
        .subscribe();
      
      setSubscriptions(prev => [...prev, channel]);
    });
  };

  const unsubscribeAll = () => {
    subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    setSubscriptions([]);
    setSyncStatus(prev => ({
      ...prev,
      isConnected: false
    }));
  };

  const forceSync = async (): Promise<boolean> => {
    try {
      // Force synchronization by fetching latest scan events
      const { data, error } = await supabase
        .from('scanner_audit_log')
        .select(`
          id,
          qr_code,
          scan_type,
          user_id,
          scan_location_description,
          scan_success,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Convert to scan events
      const events: ScanEvent[] = (data || []).map(item => ({
        id: item.id,
        qr_code: item.qr_code,
        material_type: 'Unknown', // Would need to join with material_items
        scan_type: item.scan_type,
        scanner_user: item.user_id,
        location: item.scan_location_description || 'Unknown',
        timestamp: item.created_at,
        status: item.scan_success ? 'success' : 'failed'
      }));

      setScanEvents(events);
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        pendingUpdates: 0
      }));

      toast({
        title: "Sync Complete",
        description: `Synchronized ${events.length} scan events`,
      });

      return true;
    } catch (error) {
      console.error('Error in force sync:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: prev.syncErrors + 1
      }));
      return false;
    }
  };

  // Monitor connection status
  useEffect(() => {
    const connectionMonitor = setInterval(() => {
      // Check if we're still receiving updates
      const lastSyncTime = new Date(syncStatus.lastSync).getTime();
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTime;
      
      // If no sync for more than 2 minutes, consider disconnected
      if (timeSinceLastSync > 2 * 60 * 1000 && syncStatus.isConnected) {
        setSyncStatus(prev => ({
          ...prev,
          isConnected: false
        }));
        
        toast({
          title: "Connection Lost",
          description: "Real-time sync connection lost. Attempting to reconnect...",
          variant: "destructive"
        });
        
        // Attempt to reconnect
        initializeRealtimeConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(connectionMonitor);
  }, [syncStatus]);

  return {
    scanEvents,
    syncStatus,
    broadcastScan,
    subscribeTo,
    unsubscribeAll,
    forcSync: forceSync,
    isConnected: syncStatus.isConnected
  };
};
