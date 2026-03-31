/**
 * Utility function to clean up duplicate delivery requests
 * This can be called from the admin panel or manually
 * Updated: 2026-03-15 - Fixed syntax errors and added purchase_order cleanup
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';

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

    // Type assertion - Supabase types may not match actual schema
    type DeliveryRequest = {
      purchase_order_id: string;
      id: string;
      status: string;
      created_at: string;
    };
    const typedDuplicates = duplicates as unknown as DeliveryRequest[];

    // Group by purchase_order_id
    const groupedByPO = new Map<string, DeliveryRequest[]>();
    typedDuplicates.forEach(dr => {
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
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 0;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 0;
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

    // Type assertion - Supabase types may not match actual schema
    type DeliveryRequestWithReason = {
      purchase_order_id: string;
      id: string;
      status: string;
      created_at: string;
      rejection_reason: string | null;
    };
    const typedRequests = requests as unknown as DeliveryRequestWithReason[];

    // Group by purchase_order_id
    const grouped = new Map<string, Array<{ id: string; status: string; created_at: string; rejection_reason?: string }>>();
    typedRequests?.forEach(dr => {
      const poId = dr.purchase_order_id;
      if (!grouped.has(poId)) {
        grouped.set(poId, []);
      }
      grouped.get(poId)!.push({
        id: dr.id,
        status: dr.status,
        created_at: dr.created_at,
        rejection_reason: dr.rejection_reason || undefined
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

/**
 * CRITICAL: Delete all delivery_requests without valid delivery_address
 * This ensures only delivery requests with actual addresses are shown to providers
 */
export async function deleteDeliveryRequestsWithoutAddress(): Promise<{ success: boolean; deleted: number; error?: string }> {
  const result = { success: false, deleted: 0, error: undefined as string | undefined };
  
  try {
    console.log('🗑️ Starting deletion of delivery_requests without valid delivery_address...');
    
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Get access token
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || SUPABASE_ANON_KEY;
    
    // First, count how many will be deleted
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/delivery_requests?select=id,delivery_address,delivery_location&limit=1000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );
    
    if (!countResponse.ok) {
      throw new Error(`Failed to fetch delivery_requests: ${countResponse.status}`);
    }
    
    const allRequests = await countResponse.json();
    
    // Filter to find requests without valid delivery_address
    const toDelete: string[] = [];
    
    allRequests.forEach((dr: any) => {
      const deliveryAddr = (dr.delivery_address || dr.delivery_location || '').trim().toLowerCase();
      const isValid = deliveryAddr && 
                      deliveryAddr !== '' && 
                      deliveryAddr !== 'to be provided' && 
                      deliveryAddr !== 'tbd' && 
                      deliveryAddr !== 'n/a' && 
                      deliveryAddr !== 'na' && 
                      deliveryAddr !== 'tba' && 
                      deliveryAddr !== 'to be determined';
      
      if (!isValid) {
        toDelete.push(dr.id);
      }
    });
    
    console.log(`🗑️ Found ${toDelete.length} delivery_requests without valid delivery_address to delete`);
    
    if (toDelete.length === 0) {
      result.success = true;
      result.deleted = 0;
      return result;
    }
    
    // Delete them one by one (more reliable than batch)
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const id of toDelete) {
      try {
        const deleteResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          }
        );
        
        if (deleteResponse.ok) {
          deletedCount++;
        } else {
          failedCount++;
          const errorText = await deleteResponse.text();
          console.error(`❌ Failed to delete ${id.slice(0, 8)}: ${deleteResponse.status} - ${errorText}`);
        }
      } catch (cancelError: any) {
        failedCount++;
        console.error(`❌ Error deleting ${id.slice(0, 8)}:`, cancelError.message);
      }
    }
    
    console.log(`✅ Deleted ${deletedCount} delivery_requests, ${failedCount} failed`);
    
    result.success = true;
    result.deleted = deletedCount;
    
    if (failedCount > 0) {
      result.error = `${failedCount} deletions failed`;
    }
    
  } catch (error: any) {
    console.error('❌ Error deleting delivery_requests without address:', error);
    result.error = error.message || 'Unknown error';
  }
  
  return result;
}

/**
 * Delete duplicate delivery requests based on composite key (delivery_address + material_type)
 * Keeps only ONE delivery request per unique combination
 * Prioritizes: accepted > assigned > pending (by creation date)
 */
export async function deleteDuplicateDeliveryRequestsByCompositeKey(): Promise<{ success: boolean; deleted: number; error?: string }> {
  const result = { success: false, deleted: 0, error: undefined as string | undefined };
  
  try {
    console.log('🗑️ Starting deletion of duplicate delivery_requests by composite key...');
    
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || SUPABASE_ANON_KEY;
    
    // Fetch all pending/assigned/accepted delivery requests
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/delivery_requests?status=in.(pending,assigned,accepted)&select=id,delivery_address,material_type,status,created_at,purchase_order_id&limit=1000&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, cache: 'no-store' }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch delivery_requests: ${response.status}`);
    }
    
    const allRequests = await response.json();
    console.log(`📦 Fetched ${allRequests.length} delivery requests to check for duplicates`);
    
    // Normalize material type (same as in DeliveryNotifications.tsx)
    const normalizeMaterialType = (mt: string | undefined | null): string => {
      if (!mt) return 'unknown';
      const normalized = String(mt).trim().toLowerCase();
      // Normalize common variations
      if (normalized.includes('steel') || normalized.includes('metal')) return 'construction_materials';
      if (normalized.includes('construction') || normalized.includes('building')) return 'construction_materials';
      if (normalized.includes('cement') || normalized.includes('concrete')) return 'construction_materials';
      return normalized.replace(/\s+/g, '_');
    };
    
    // Group by composite key
    const compositeKeyMap = new Map<string, any[]>();
    
    allRequests.forEach((dr: any) => {
      const deliveryAddr = (dr.delivery_address || '').trim().toLowerCase();
      const materialType = normalizeMaterialType(dr.material_type);
      
      // Skip if address is invalid/placeholder
      if (!deliveryAddr || 
          deliveryAddr === '' || 
          deliveryAddr === 'to be provided' || 
          deliveryAddr === 'tbd' || 
          deliveryAddr === 'n/a' || 
          deliveryAddr === 'na' || 
          deliveryAddr === 'tba' || 
          deliveryAddr === 'to be determined') {
        return; // Skip invalid addresses
      }
      
      const compositeKey = `${deliveryAddr}|${materialType}`;
      
      if (!compositeKeyMap.has(compositeKey)) {
        compositeKeyMap.set(compositeKey, []);
      }
      compositeKeyMap.get(compositeKey)!.push(dr);
    });
    
    // Find duplicates (groups with more than 1 request)
    const duplicatesToDelete: string[] = [];
    
    compositeKeyMap.forEach((requests, compositeKey) => {
      if (requests.length > 1) {
        console.log(`🔍 Found ${requests.length} duplicates for composite key: ${compositeKey}`);
        
        // Sort by priority: accepted > assigned > pending, then by creation date (newest first)
        requests.sort((a, b) => {
          const statusPriority = { 'accepted': 3, 'assigned': 2, 'pending': 1 };
          const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 0;
          const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          
          // Same priority, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        // Keep the first one (highest priority/newest), delete the rest
        const toKeep = requests[0];
        const toDelete = requests.slice(1);
        
        console.log(`✅ Keeping: ${toKeep.id.slice(0, 8)} (status: ${toKeep.status}, created: ${toKeep.created_at})`);
        toDelete.forEach((dr: any) => {
          console.log(`🗑️ Marking for deletion: ${dr.id.slice(0, 8)} (status: ${dr.status}, created: ${dr.created_at})`);
          duplicatesToDelete.push(dr.id);
        });
      }
    });
    
    console.log(`🗑️ Found ${duplicatesToDelete.length} duplicate delivery_requests to delete`);
    
    if (duplicatesToDelete.length === 0) {
      result.success = true;
      result.deleted = 0;
      return result;
    }
    
    // Delete duplicates one by one
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const id of duplicatesToDelete) {
      try {
        const deleteResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_requests?id=eq.${id}`,
          {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            cache: 'no-store'
          }
        );
        
        if (deleteResponse.ok) {
          deletedCount++;
          console.log(`✅ Deleted duplicate: ${id.slice(0, 8)}`);
        } else {
          failedCount++;
          const errorText = await deleteResponse.text();
          console.error(`❌ Failed to delete ${id.slice(0, 8)}: ${deleteResponse.status} - ${errorText}`);
        }
      } catch (deleteError: any) {
        failedCount++;
        console.error(`❌ Error deleting ${id.slice(0, 8)}:`, deleteError.message);
      }
    }
    
    console.log(`✅ Deleted ${deletedCount} duplicate delivery_requests, ${failedCount} failed`);
    
    result.success = true;
    result.deleted = deletedCount;
    
    if (failedCount > 0) {
      result.error = `${failedCount} deletions failed`;
    }
    
  } catch (error: any) {
    console.error('❌ Error deleting duplicate delivery_requests:', error);
    result.error = error.message || 'Unknown error';
  }
  
  return result;
}
