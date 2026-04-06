// ============================================================
// TEST: Run this in browser console to test RPC directly
// Copy and paste this entire script into the browser console
// ============================================================

(async function testRPC() {
  console.log('🧪 Starting RPC test...');
  
  try {
    // Get supabase client
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const supabaseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    function readSupabaseSessionBlobRaw() {
      try {
        const stores = [sessionStorage, localStorage];
        for (const store of stores) {
          for (let i = 0; i < store.length; i++) {
            const k = store.key(i);
            if (k && /^sb-.+-auth-token$/.test(k)) {
              const v = store.getItem(k);
              if (v && v.trim().length > 2) return v;
            }
          }
        }
      } catch (e) {}
      return null;
    }
    const authToken = readSupabaseSessionBlobRaw();
    let accessToken = supabaseKey;
    if (authToken) {
      try {
        const parsed = JSON.parse(authToken);
        accessToken = parsed.access_token || supabaseKey;
      } catch (e) {
        console.log('⚠️ Could not parse auth token, using anon key');
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
    
    // Test 1: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.email, user?.id);
    if (userError) console.error('❌ User error:', userError);
    
    // Test 2: Call RPC with timeout
    console.log('🔵 Calling RPC function...');
    const startTime = Date.now();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RPC timeout after 10 seconds')), 10000);
    });
    
    const rpcPromise = supabase.rpc('get_deliveries_for_provider_unified');
    
    try {
      const result = await Promise.race([rpcPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      console.log('✅ RPC completed in', duration, 'ms');
      console.log('📊 Result:', {
        hasData: !!result?.data,
        hasError: !!result?.error,
        dataLength: Array.isArray(result?.data) ? result.data.length : 'not-array',
        error: result?.error
      });
      
      if (result?.data && Array.isArray(result.data)) {
        console.log('📦 Orders returned:', result.data.length);
        console.log('📋 Sample orders:', result.data.slice(0, 3).map(o => ({
          order_number: o.order_number,
          status: o._categorized_status || o.status
        })));
      }
      
      if (result?.error) {
        console.error('❌ RPC error:', result.error);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ RPC failed after', duration, 'ms:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
