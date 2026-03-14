/**
 * Utility function to clean up duplicate delivery requests
 * This can be called from the admin panel or manually
 */

import { supabase } from '@/integrations/supabase/client';

export interface CleanupResult {
  success: boolean;
  duplicatesFound: number;
  duplicatesCancelled: number;
  errors: string[];
}

/**
 * Clean up duplicate delivery requests for the same purchase_order_id
 * Keeps the most recent/active one and cancels the rest
 */
export async function cleanupDuplicateDeliveryRequests(): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    duplicatesFound: 0,
    duplicatesCancelled: 0,
    errors: []
  };

  try {
    console.log('🔍 Starting duplicate delivery request cleanup...');

    // Step 1: Find all purchase_orders with multiple active delivery_requests
    const { data: duplicates, error: findError } = await supabase
      .from('delivery_requests')
      .select('purchase_order_id, id, status, created_at')
      .not('purchase_order_id', 'is', null)
      .in('status', ['pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled']);

    if (findError) {
      throw new Error(`Failed to find duplicates: ${findError.message}`);
    }

    if (!duplicates || duplicates.length === 0) {
      console.log('✅ No active delivery requests found');
      result.success = true;
      return result;
    }

    // Group by purchase_order_id
    const groupedByPO = new Map<string, typeof duplicates>();
    duplicates.forEach(dr => {
      const poId = dr.purchase_order_id;
      if (!groupedByPO.has(poId)) {
        groupedByPO.set(poId, []);
      }
      groupedByPO.get(poId)!.push(dr);
    });

    // Find purchase_orders with duplicates
    const poWithDuplicates: string[] = [];
    groupedByPO.forEach((requests, poId) => {
      if (requests.length > 1) {
        poWithDuplicates.push(poId);
        result.duplicatesFound += requests.length - 1; // Number of duplicates (total - 1)
      }
    });

    console.log(`📊 Found ${poWithDuplicates.length} purchase orders with duplicate delivery requests`);
    console.log(`📊 Total duplicates to clean: ${result.duplicatesFound}`);

    if (poWithDuplicates.length === 0) {
      console.log('✅ No duplicates found!');
      result.success = true;
      return result;
    }

    // Step 2: For each purchase_order with duplicates, keep the best one and cancel the rest
    const statusPriority: Record<string, number> = {
      'accepted': 5,
      'assigned': 4,
      'in_transit': 3,
      'picked_up': 2,
      'out_for_delivery': 2,
      'scheduled': 1,
      'pending': 1
    };

    for (const poId of poWithDuplicates) {
      const requests = groupedByPO.get(poId)!;
      
      // Sort to find the best one to keep
      requests.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 0;
        const priorityB = statusPriority[b.status] || 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA; // Higher priority first
        }
        // If same priority, keep most recent
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const keepId = requests[0].id;
      const cancelIds = requests.slice(1).map(r => r.id);

      console.log(`🔄 PO ${poId}: Keeping ${keepId}, cancelling ${cancelIds.length} duplicates`);

      // Cancel all duplicates
      const { error: cancelError } = await supabase
        .from('delivery_requests')
        .update({
          status: 'cancelled',
          rejection_reason: `Duplicate delivery request - cleaned up automatically. Kept request: ${keepId}`,
          updated_at: new Date().toISOString()
        })
        .in('id', cancelIds);

      if (cancelError) {
        console.error(`❌ Error cancelling duplicates for PO ${poId}:`, cancelError);
        result.errors.push(`Failed to cancel duplicates for PO ${poId}: ${cancelError.message}`);
      } else {
        result.duplicatesCancelled += cancelIds.length;
        console.log(`✅ Cancelled ${cancelIds.length} duplicates for PO ${poId}`);
      }
    }

    result.success = result.errors.length === 0;
    console.log(`✅ Cleanup complete! Cancelled ${result.duplicatesCancelled} duplicate delivery requests`);

    return result;
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    result.errors.push(error.message || 'Unknown error');
    result.success = false;
    return result;
  }
}

/**
 * Check for duplicate delivery requests without cleaning them
 */
export async function checkForDuplicateDeliveryRequests(): Promise<{
  hasDuplicates: boolean;
  duplicateCount: number;
  details: Array<{ purchase_order_id: string; count: number; request_ids: string[] }>;
}> {
  try {
    const { data: requests, error } = await supabase
      .from('delivery_requests')
      .select('purchase_order_id, id, status')
      .not('purchase_order_id', 'is', null)
      .in('status', ['pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled']);

    if (error) throw error;

    // Group by purchase_order_id
    const grouped = new Map<string, string[]>();
    requests?.forEach(dr => {
      const poId = dr.purchase_order_id;
      if (!grouped.has(poId)) {
        grouped.set(poId, []);
      }
      grouped.get(poId)!.push(dr.id);
    });

    // Find duplicates
    const duplicates: Array<{ purchase_order_id: string; count: number; request_ids: string[] }> = [];
    grouped.forEach((ids, poId) => {
      if (ids.length > 1) {
        duplicates.push({
          purchase_order_id: poId,
          count: ids.length,
          request_ids: ids
        });
      }
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.reduce((sum, d) => sum + (d.count - 1), 0),
      details: duplicates
    };
  } catch (error: any) {
    console.error('Error checking for duplicates:', error);
    throw error;
  }
}
