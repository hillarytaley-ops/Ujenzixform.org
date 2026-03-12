// ============================================================
// TEST RPC FUNCTION IN BROWSER CONSOLE
// ============================================================
// Copy and paste this entire script into your browser console
// (Press F12, go to Console tab, paste this, press Enter)
// ============================================================

(async () => {
  console.log('🧪 Testing Unified RPC Function...');
  
  try {
    // Get Supabase client
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    
    // Test 1: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current User:', {
      id: user?.id,
      email: user?.email,
      hasUser: !!user,
      error: userError?.message
    });
    
    if (!user) {
      console.error('❌ No user logged in!');
      return;
    }
    
    // Test 2: Check provider record
    const { data: provider, error: providerError } = await supabase
      .from('delivery_providers')
      .select('id, user_id, email')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('🚚 Provider Record:', {
      found: !!provider,
      provider_id: provider?.id,
      user_id: provider?.user_id,
      matches_auth_uid: provider?.user_id === user.id,
      error: providerError?.message
    });
    
    if (!provider) {
      console.error('❌ No provider record found for user!');
      return;
    }
    
    // Test 3: Call RPC function
    console.log('🔵 Calling RPC function...');
    const startTime = Date.now();
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_deliveries_for_provider_unified');
    
    const duration = Date.now() - startTime;
    
    console.log('🔵 RPC Response:', {
      duration: `${duration}ms`,
      hasError: !!rpcError,
      hasData: !!rpcData,
      dataType: typeof rpcData,
      isArray: Array.isArray(rpcData),
      dataLength: Array.isArray(rpcData) ? rpcData.length : (rpcData ? 'not-array' : 'null/undefined'),
      error: rpcError ? {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      } : null
    });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      return;
    }
    
    if (!rpcData) {
      console.warn('⚠️ RPC returned null/undefined');
      return;
    }
    
    if (!Array.isArray(rpcData)) {
      console.warn('⚠️ RPC returned non-array:', rpcData);
      return;
    }
    
    // Test 4: Analyze results
    const scheduled = rpcData.filter(r => r._categorized_status === 'scheduled' || r._categorized_status === 'in_transit');
    const inTransit = rpcData.filter(r => r._categorized_status === 'in_transit');
    const delivered = rpcData.filter(r => r._categorized_status === 'delivered');
    
    console.log('📊 RPC Results Breakdown:', {
      total: rpcData.length,
      scheduled: scheduled.length,
      inTransit: inTransit.length,
      delivered: delivered.length,
      sampleOrders: rpcData.slice(0, 3).map(r => ({
        order_number: r.order_number,
        status: r._categorized_status,
        po_id: r.purchase_order_id
      }))
    });
    
    // Test 5: Compare with legacy source
    const { data: legacyData, error: legacyError } = await supabase
      .from('delivery_requests')
      .select('id, purchase_order_id, status, provider_id')
      .eq('provider_id', provider.id)
      .in('status', ['accepted', 'assigned', 'picked_up', 'in_transit', 'dispatched', 'out_for_delivery', 'delivery_arrived']);
    
    console.log('📊 Legacy Source Comparison:', {
      legacyCount: legacyData?.length || 0,
      rpcCount: rpcData.length,
      difference: (legacyData?.length || 0) - rpcData.length,
      legacyError: legacyError?.message
    });
    
    if (rpcData.length === 0 && (legacyData?.length || 0) > 0) {
      console.warn('⚠️ RPC returned 0 but legacy has', legacyData?.length, 'orders');
      console.log('💡 This means the RPC function is not finding orders correctly');
    }
    
    console.log('✅ Test Complete!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
})();
