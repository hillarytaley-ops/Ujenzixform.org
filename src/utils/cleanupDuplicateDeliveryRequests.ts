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
/**
 * Clean up duplicate purchase_orders with same po_number
 * Keeps the most recent one, cancels the rest
 */
export async function cleanupDuplicatePurchaseOrders(): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    duplicatesFound: 0,
    duplicatesCancelled: 0,
    errors: []
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push('User not authenticated');
      return result;
    }

    // Find all po_numbers with multiple purchase_orders
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, created_at')
      .not('po_number', 'is', null)
      .neq('po_number', '')
      .not('status', 'in', '(cancelled,rejected,completed)');

    if (poError) {
      result.errors.push(`Failed to fetch purchase_orders: ${poError.message}`);
      return result;
    }

    // Group by normalized po_number
    const poNumberMap = new Map<string, typeof purchaseOrders>();
    purchaseOrders?.forEach(po => {
      const normalized = String(po.po_number).trim().toLowerCase();
      if (!poNumberMap.has(normalized)) {
        poNumberMap.set(normalized, []);
      }
      poNumberMap.get(normalized)!.push(po);
    });

    // Find duplicates
    for (const [normalizedPO, pos] of poNumberMap.entries()) {
      if (pos.length > 1) {
        result.duplicatesFound += pos.length - 1;

        // Sort to find the "best" one to keep (most recent)
        pos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const keptId = pos[0].id;
        const toCancelIds = pos.slice(1).map(po => po.id);

        if (toCancelIds.length > 0) {
          const { error: updateError } = await supabase
            .from('purchase_orders')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .in('id', toCancelIds);

          if (updateError) {
            result.errors.push(`Failed to cancel duplicate purchase_orders for po_number ${normalizedPO}: ${updateError.message}`);
          } else {
            result.duplicatesCancelled += toCancelIds.length;
            console.log(`✅ Cancelled ${toCancelIds.length} duplicate purchase_orders for po_number ${normalizedPO}, kept: ${keptId}`);
          }
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    return result;
  }
}

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

      // Cancel all duplicates - use native fetch for better reliability
      try {
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        let accessToken = '';
        if (stored) {
          const parsed = JSON.parse(stored);
          accessToken = parsed.access_token || '';
        }
        
        const headers: Record<string, string> = {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        // Cancel duplicates using PATCH with multiple IDs
        for (const cancelId of cancelIds) {
          const cancelResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${cancelId}`,
            {
              method: 'PATCH',
              headers: {
                ...headers,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                status: 'cancelled',
                rejection_reason: `Duplicate delivery request - cleaned up automatically. Kept request: ${keepId}`,
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (!cancelResponse.ok) {
            const errorText = await cancelResponse.text();
            console.error(`❌ Failed to cancel duplicate ${cancelId}:`, errorText);
            result.errors.push(`Failed to cancel ${cancelId}: ${errorText}`);
          } else {
            result.duplicatesCancelled++;
          }
        }
      } catch (cancelError: any) {
        console.error(`❌ Error cancelling duplicates for PO ${poId}:`, cancelError);
        result.errors.push(`Failed to cancel duplicates for PO ${poId}: ${cancelError.message}`);
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
  details: Array<{ purchase_order_id: string; count: number; request_ids: string[]; statuses: string[] }>;
}> {
  try {
    const { data: requests, error } = await supabase
      .from('delivery_requests')
      .select('purchase_order_id, id, status, created_at, rejection_reason')
      .not('purchase_order_id', 'is', null)
      .in('status', ['pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'out_for_delivery', 'scheduled']);

    if (error) throw error;

    // Group by purchase_order_id
    const grouped = new Map<string, Array<{ id: string; status: string; created_at: string; rejection_reason?: string }>>();
    requests?.forEach(dr => {
      const poId = dr.purchase_order_id;
      if (!grouped.has(poId)) {
        grouped.set(poId, []);
      }
      grouped.get(poId)!.push({
        id: dr.id,
        status: dr.status,
        created_at: dr.created_at,
        rejection_reason: dr.rejection_reason
      });
    });

    // Find duplicates
    const duplicates: Array<{ purchase_order_id: string; count: number; request_ids: string[]; statuses: string[] }> = [];
    grouped.forEach((items, poId) => {
      if (items.length > 1) {
        duplicates.push({
          purchase_order_id: poId,
          count: items.length,
          request_ids: items.map(i => i.id),
          statuses: items.map(i => i.status)
        });
        console.error(`🚨 DUPLICATE FOUND: PO ${poId} has ${items.length} delivery_requests:`, items);
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
