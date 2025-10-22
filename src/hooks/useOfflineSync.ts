import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OfflineData {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<OfflineData[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending operations from localStorage
    loadPendingOperations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingOperations = () => {
    const stored = localStorage.getItem('pendingOperations');
    if (stored) {
      setPendingOperations(JSON.parse(stored));
    }
  };

  const savePendingOperations = (operations: OfflineData[]) => {
    localStorage.setItem('pendingOperations', JSON.stringify(operations));
  };

  const addOfflineOperation = (operation: Omit<OfflineData, 'id' | 'timestamp'>) => {
    const newOperation: OfflineData = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    const updated = [...pendingOperations, newOperation];
    setPendingOperations(updated);
    savePendingOperations(updated);
  };

  const syncPendingOperations = async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    const successful: string[] = [];

    for (const operation of pendingOperations) {
      try {
        switch (operation.operation) {
          case 'insert':
            await (supabase as any).from(operation.table).insert(operation.data);
            break;
          case 'update':
            await (supabase as any).from(operation.table).update(operation.data).eq('id', operation.data.id);
            break;
          case 'delete':
            await (supabase as any).from(operation.table).delete().eq('id', operation.data.id);
            break;
        }
        successful.push(operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
      }
    }

    // Remove successful operations
    const remaining = pendingOperations.filter(op => !successful.includes(op.id));
    setPendingOperations(remaining);
    savePendingOperations(remaining);
  };

  const executeOperation = async (table: string, operation: 'insert' | 'update' | 'delete', data: any) => {
    if (isOnline) {
      try {
        switch (operation) {
          case 'insert':
            return await (supabase as any).from(table).insert(data);
          case 'update':
            return await (supabase as any).from(table).update(data).eq('id', data.id);
          case 'delete':
            return await (supabase as any).from(table).delete().eq('id', data.id);
        }
      } catch (error) {
        console.error('Online operation failed, queuing for offline sync:', error);
        addOfflineOperation({ table, operation, data });
        throw error;
      }
    } else {
      addOfflineOperation({ table, operation, data });
      return { data: null, error: null }; // Simulate success for offline
    }
  };

  return {
    isOnline,
    pendingOperations: pendingOperations.length,
    executeOperation,
    syncPendingOperations
  };
};