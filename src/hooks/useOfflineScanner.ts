import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineScan {
  id: string;
  qr_code: string;
  material_type: string;
  scan_type: 'dispatch' | 'receiving' | 'verification';
  material_condition: string;
  scan_notes: string;
  location_lat?: number;
  location_lng?: number;
  scanned_at: string;
  synced: boolean;
}

interface OfflineData {
  scans: OfflineScan[];
  materials: any[];
  lastSync: string;
  syncQueue: OfflineScan[];
}

interface UseOfflineScannerResult {
  isOnline: boolean;
  offlineScans: OfflineScan[];
  pendingSyncCount: number;
  addOfflineScan: (scanData: Omit<OfflineScan, 'id' | 'scanned_at' | 'synced'>) => void;
  syncOfflineData: () => Promise<boolean>;
  clearOfflineData: () => void;
  getOfflineMaterials: () => any[];
  cacheCurrentData: (materials: any[], scans: any[]) => void;
}

const STORAGE_KEY = 'ujenzipro_offline_scanner';
const MAX_OFFLINE_SCANS = 1000;
const MAX_OFFLINE_DAYS = 30;

export const useOfflineScanner = (): UseOfflineScannerResult => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    scans: [],
    materials: [],
    lastSync: new Date().toISOString(),
    syncQueue: []
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load offline data from localStorage
    loadOfflineData();

    // Set up online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Scanner connection restored. Syncing offline scans...",
      });
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Scanner working offline. Scans will sync when connection returns.",
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
          toast({
            title: "Offline Data Expired",
            description: "Old offline scanner data has been cleared",
          });
        }
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const saveOfflineData = (data: OfflineData) => {
    try {
      // Limit the number of offline scans to prevent storage overflow
      if (data.scans.length > MAX_OFFLINE_SCANS) {
        data.scans = data.scans.slice(0, MAX_OFFLINE_SCANS);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
      toast({
        title: "Storage Error",
        description: "Could not save offline scan data. Storage may be full.",
        variant: "destructive"
      });
    }
  };

  const addOfflineScan = (scanData: Omit<OfflineScan, 'id' | 'scanned_at' | 'synced'>) => {
    const offlineScan: OfflineScan = {
      ...scanData,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scanned_at: new Date().toISOString(),
      synced: false
    };

    const updatedData: OfflineData = {
      ...offlineData,
      scans: [offlineScan, ...offlineData.scans],
      syncQueue: [...offlineData.syncQueue, offlineScan]
    };

    saveOfflineData(updatedData);

    toast({
      title: "Scan Saved Offline",
      description: `${scanData.material_type} scan saved. Will sync when online.`,
    });
  };

  const syncOfflineData = async (): Promise<boolean> => {
    if (!isOnline || offlineData.syncQueue.length === 0) {
      return true;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      let successCount = 0;
      let errorCount = 0;

      // Sync pending scans
      for (const scan of offlineData.syncQueue) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          // Use the secure scan logging function
          const { error } = await supabase.rpc('log_secure_scan', {
            qr_code_param: scan.qr_code,
            scan_type_param: scan.scan_type,
            scanner_type_param: 'offline_sync',
            material_condition_param: scan.material_condition,
            scan_notes_param: `Offline scan synced: ${scan.scan_notes}`,
            scan_location_lat_param: scan.location_lat,
            scan_location_lng_param: scan.location_lng
          });

          if (error) {
            console.error(`Error syncing scan ${scan.id}:`, error);
            errorCount++;
          } else {
            successCount++;
            
            // Mark as synced
            scan.synced = true;
          }
        } catch (scanError) {
          console.error(`Error processing scan ${scan.id}:`, scanError);
          errorCount++;
        }
      }

      // Update offline data
      const updatedData: OfflineData = {
        ...offlineData,
        syncQueue: offlineData.syncQueue.filter(scan => !scan.synced),
        lastSync: new Date().toISOString()
      };

      saveOfflineData(updatedData);

      if (successCount > 0) {
        toast({
          title: "Sync Complete",
          description: `${successCount} offline scans synced${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
      }

      return errorCount === 0;

    } catch (error) {
      console.error('Error syncing offline data:', error);
      toast({
        title: "Sync Failed",
        description: "Could not sync offline scans. Will retry automatically.",
        variant: "destructive"
      });
      return false;
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOfflineData({
      scans: [],
      materials: [],
      lastSync: new Date().toISOString(),
      syncQueue: []
    });
    
    toast({
      title: "Offline Data Cleared",
      description: "All offline scanner data has been cleared",
    });
  };

  const getOfflineMaterials = (): any[] => {
    return offlineData.materials;
  };

  const cacheCurrentData = (materials: any[], scans: any[]) => {
    if (!isOnline) return; // Don't cache when offline

    const updatedData: OfflineData = {
      ...offlineData,
      materials: materials.slice(0, 500), // Limit cached materials
      lastSync: new Date().toISOString()
    };

    saveOfflineData(updatedData);
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineData.syncQueue.length > 0) {
      const autoSyncTimer = setTimeout(() => {
        syncOfflineData();
      }, 2000); // Wait 2 seconds after coming online

      return () => clearTimeout(autoSyncTimer);
    }
  }, [isOnline, offlineData.syncQueue.length]);

  // Periodic sync attempt when online
  useEffect(() => {
    if (!isOnline) return;

    const syncInterval = setInterval(() => {
      if (offlineData.syncQueue.length > 0) {
        syncOfflineData();
      }
    }, 30000); // Try to sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [isOnline, offlineData.syncQueue.length]);

  return {
    isOnline,
    offlineScans: offlineData.scans,
    pendingSyncCount: offlineData.syncQueue.length,
    addOfflineScan,
    syncOfflineData,
    clearOfflineData,
    getOfflineMaterials,
    cacheCurrentData
  };
};
