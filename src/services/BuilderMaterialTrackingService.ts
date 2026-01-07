/**
 * BuilderMaterialTrackingService
 * 
 * Real-time tracking service for builders to monitor their purchased materials
 * as they are scanned during dispatch, transit, and receiving.
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface MaterialScanEvent {
  id: string;
  qr_code: string;
  scan_type: 'dispatch' | 'receiving' | 'verification';
  scanner_type: string;
  material_condition: string;
  scanned_at: string;
  notes: string | null;
  scanned_by?: string;
  scan_location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface MaterialItem {
  id: string;
  qr_code: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'received' | 'verified' | 'damaged';
  supplier_id: string;
  supplier_name?: string;
  purchase_order_id: string;
  purchase_order_number?: string;
  dispatch_scan_id?: string;
  receiving_scan_id?: string;
  verification_scan_id?: string;
  dispatched_at?: string;
  received_at?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderMaterialStats {
  totalItems: number;
  pendingItems: number;
  dispatchedItems: number;
  inTransitItems: number;
  receivedItems: number;
  verifiedItems: number;
  damagedItems: number;
}

type ScanEventCallback = (event: MaterialScanEvent, material?: MaterialItem) => void;
type StatsUpdateCallback = (stats: BuilderMaterialStats) => void;

class BuilderMaterialTrackingService {
  private scanChannel: RealtimeChannel | null = null;
  private materialChannel: RealtimeChannel | null = null;
  private builderId: string | null = null;
  private scanCallbacks: ScanEventCallback[] = [];
  private statsCallbacks: StatsUpdateCallback[] = [];

  /**
   * Start real-time tracking for a builder's materials
   */
  async startTracking(builderId: string): Promise<boolean> {
    try {
      this.builderId = builderId;
      
      // Subscribe to scan events on materials belonging to this builder's orders
      this.scanChannel = supabase
        .channel(`builder-scans-${builderId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'qr_scan_events'
          },
          async (payload) => {
            const scanEvent = payload.new as MaterialScanEvent;
            
            // Check if this scan is for a material belonging to the builder
            const material = await this.getMaterialByQRCode(scanEvent.qr_code);
            
            if (material) {
              console.log('🔔 Builder scan event:', scanEvent.scan_type, scanEvent.qr_code);
              this.notifyScanCallbacks(scanEvent, material);
              
              // Update stats after scan
              const stats = await this.getBuilderMaterialStats();
              if (stats) {
                this.notifyStatsCallbacks(stats);
              }
            }
          }
        )
        .subscribe();

      // Subscribe to material item updates
      this.materialChannel = supabase
        .channel(`builder-materials-${builderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'material_items'
          },
          async (payload) => {
            const material = payload.new as MaterialItem;
            console.log('📦 Material updated:', material.status, material.qr_code);
            
            // Update stats
            const stats = await this.getBuilderMaterialStats();
            if (stats) {
              this.notifyStatsCallbacks(stats);
            }
          }
        )
        .subscribe();

      console.log('✅ Builder material tracking started for:', builderId);
      return true;
    } catch (error) {
      console.error('Error starting builder tracking:', error);
      return false;
    }
  }

  /**
   * Stop real-time tracking
   */
  stopTracking(): void {
    if (this.scanChannel) {
      supabase.removeChannel(this.scanChannel);
      this.scanChannel = null;
    }
    if (this.materialChannel) {
      supabase.removeChannel(this.materialChannel);
      this.materialChannel = null;
    }
    this.builderId = null;
    console.log('🛑 Builder material tracking stopped');
  }

  /**
   * Register callback for scan events
   */
  onScanEvent(callback: ScanEventCallback): () => void {
    this.scanCallbacks.push(callback);
    return () => {
      this.scanCallbacks = this.scanCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register callback for stats updates
   */
  onStatsUpdate(callback: StatsUpdateCallback): () => void {
    this.statsCallbacks.push(callback);
    return () => {
      this.statsCallbacks = this.statsCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyScanCallbacks(event: MaterialScanEvent, material?: MaterialItem): void {
    this.scanCallbacks.forEach(cb => cb(event, material));
  }

  private notifyStatsCallbacks(stats: BuilderMaterialStats): void {
    this.statsCallbacks.forEach(cb => cb(stats));
  }

  /**
   * Get material item by QR code (checks if it belongs to builder's orders)
   */
  async getMaterialByQRCode(qrCode: string): Promise<MaterialItem | null> {
    try {
      if (!this.builderId) return null;

      const { data, error } = await supabase
        .from('material_items')
        .select(`
          *,
          purchase_orders!inner (
            buyer_id,
            po_number
          )
        `)
        .eq('qr_code', qrCode)
        .eq('purchase_orders.buyer_id', this.builderId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching material:', error);
        return null;
      }

      return data ? {
        ...data,
        purchase_order_number: data.purchase_orders?.po_number
      } : null;
    } catch (error) {
      console.error('Error in getMaterialByQRCode:', error);
      return null;
    }
  }

  /**
   * Get all materials for the current builder
   */
  async getBuilderMaterials(): Promise<MaterialItem[]> {
    try {
      if (!this.builderId) return [];

      const { data, error } = await supabase
        .from('material_items')
        .select(`
          *,
          purchase_orders!inner (
            buyer_id,
            po_number
          )
        `)
        .eq('purchase_orders.buyer_id', this.builderId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching builder materials:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        purchase_order_number: item.purchase_orders?.po_number
      }));
    } catch (error) {
      console.error('Error in getBuilderMaterials:', error);
      return [];
    }
  }

  /**
   * Get material statistics for the builder
   */
  async getBuilderMaterialStats(): Promise<BuilderMaterialStats | null> {
    try {
      if (!this.builderId) return null;

      const materials = await this.getBuilderMaterials();

      return {
        totalItems: materials.length,
        pendingItems: materials.filter(m => m.status === 'pending').length,
        dispatchedItems: materials.filter(m => m.status === 'dispatched').length,
        inTransitItems: materials.filter(m => m.status === 'in_transit').length,
        receivedItems: materials.filter(m => m.status === 'received').length,
        verifiedItems: materials.filter(m => m.status === 'verified').length,
        damagedItems: materials.filter(m => m.status === 'damaged').length,
      };
    } catch (error) {
      console.error('Error getting builder stats:', error);
      return null;
    }
  }

  /**
   * Get recent scan events for builder's materials
   */
  async getRecentScans(limit: number = 20): Promise<MaterialScanEvent[]> {
    try {
      if (!this.builderId) return [];

      // Get builder's material QR codes
      const materials = await this.getBuilderMaterials();
      const qrCodes = materials.map(m => m.qr_code);

      if (qrCodes.length === 0) return [];

      const { data, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .in('qr_code', qrCodes)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent scans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentScans:', error);
      return [];
    }
  }

  /**
   * Get scan history for a specific material
   */
  async getMaterialScanHistory(qrCode: string): Promise<MaterialScanEvent[]> {
    try {
      const { data, error } = await supabase
        .from('qr_scan_events')
        .select('*')
        .eq('qr_code', qrCode)
        .order('scanned_at', { ascending: true });

      if (error) {
        console.error('Error fetching scan history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMaterialScanHistory:', error);
      return [];
    }
  }
}

// Singleton instance
export const builderMaterialTrackingService = new BuilderMaterialTrackingService();





















