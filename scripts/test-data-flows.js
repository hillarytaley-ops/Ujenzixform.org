/**
 * UjenziPro Data Flow Testing Script
 * 
 * Run this in the browser console while logged into the app.
 * Copy and paste individual test functions or run testAllFlows() for comprehensive testing.
 * 
 * IMPORTANT: You must be logged in to test most flows.
 */

// Helper function to format results
const formatResult = (testName, success, details) => {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  if (details) console.log(`   └─ ${details}`);
  return { testName, success, details };
};

// Get Supabase client (assumes it's available in window)
const getSupabase = () => {
  // Try to get from window or import
  if (window.supabase) return window.supabase;
  console.error('⚠️ Supabase client not found. Make sure you are on the app page.');
  return null;
};

// ═══════════════════════════════════════════════════════════════
// TEST 1: User Authentication Flow
// ═══════════════════════════════════════════════════════════════
async function testAuthFlow() {
  console.log('\n🔐 Testing Authentication Flow...\n');
  const results = [];
  
  try {
    // This test requires manual Supabase access
    const supabaseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    // Check if user is logged in via localStorage
    const session = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (session) {
      const parsed = JSON.parse(session);
      results.push(formatResult('Session exists', true, `User: ${parsed.user?.email || 'Unknown'}`));
    } else {
      results.push(formatResult('Session exists', false, 'No active session found'));
    }
    
    // Check user role in localStorage
    const userRole = localStorage.getItem('userRole');
    results.push(formatResult('User role cached', !!userRole, `Role: ${userRole || 'Not set'}`));
    
  } catch (error) {
    results.push(formatResult('Auth Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 2: Profile Data Flow
// ═══════════════════════════════════════════════════════════════
async function testProfileFlow() {
  console.log('\n👤 Testing Profile Data Flow...\n');
  const results = [];
  
  try {
    const response = await fetch('https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/profiles?select=*&limit=5', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('Profiles table accessible', true, `Found ${data.length} profiles`));
    } else {
      results.push(formatResult('Profiles table accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('Profile Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 3: User Roles Data Flow
// ═══════════════════════════════════════════════════════════════
async function testUserRolesFlow() {
  console.log('\n🎭 Testing User Roles Data Flow...\n');
  const results = [];
  
  try {
    const response = await fetch('https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1/user_roles?select=*&limit=10', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const roleCounts = data.reduce((acc, item) => {
        acc[item.role] = (acc[item.role] || 0) + 1;
        return acc;
      }, {});
      results.push(formatResult('User roles table accessible', true, `Roles: ${JSON.stringify(roleCounts)}`));
    } else {
      results.push(formatResult('User roles table accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('User Roles Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 4: Registration Tables Flow
// ═══════════════════════════════════════════════════════════════
async function testRegistrationFlows() {
  console.log('\n📝 Testing Registration Data Flows...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  const tables = [
    'builder_registrations',
    'supplier_registrations', 
    'delivery_provider_registrations'
  ];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${baseUrl}/${table}?select=count`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      });
      
      const count = response.headers.get('content-range')?.split('/')[1] || '0';
      results.push(formatResult(`${table}`, response.ok, `Records: ${count}`));
    } catch (error) {
      results.push(formatResult(`${table}`, false, error.message));
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 5: Delivery System Flow
// ═══════════════════════════════════════════════════════════════
async function testDeliveryFlow() {
  console.log('\n🚚 Testing Delivery System Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  try {
    // Test delivery_requests
    const response = await fetch(`${baseUrl}/delivery_requests?select=*&limit=5&order=created_at.desc`, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('Delivery requests accessible', true, `Recent requests: ${data.length}`));
      
      if (data.length > 0) {
        const statuses = [...new Set(data.map(d => d.status))];
        results.push(formatResult('Request statuses found', true, `Statuses: ${statuses.join(', ')}`));
      }
    } else {
      results.push(formatResult('Delivery requests accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('Delivery Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 6: Financial Documents Flow
// ═══════════════════════════════════════════════════════════════
async function testFinancialFlow() {
  console.log('\n💰 Testing Financial Documents Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  const tables = ['invoices', 'payments', 'purchase_orders', 'purchase_receipts'];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${baseUrl}/${table}?select=count`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      });
      
      const count = response.headers.get('content-range')?.split('/')[1] || '0';
      results.push(formatResult(`${table}`, response.ok, `Records: ${count}`));
    } catch (error) {
      results.push(formatResult(`${table}`, false, error.message));
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 7: QR Scanning Flow
// ═══════════════════════════════════════════════════════════════
async function testQRScanningFlow() {
  console.log('\n📱 Testing QR Scanning Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  try {
    const response = await fetch(`${baseUrl}/qr_scan_events?select=*&limit=5&order=scanned_at.desc`, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('QR scan events accessible', true, `Recent scans: ${data.length}`));
      
      if (data.length > 0) {
        const types = [...new Set(data.map(d => d.scan_type))];
        results.push(formatResult('Scan types found', true, `Types: ${types.join(', ') || 'Various'}`));
      }
    } else {
      results.push(formatResult('QR scan events accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('QR Scanning Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 8: Admin Staff Flow
// ═══════════════════════════════════════════════════════════════
async function testAdminStaffFlow() {
  console.log('\n👔 Testing Admin Staff Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  try {
    const response = await fetch(`${baseUrl}/admin_staff?select=email,full_name,is_active,role&limit=10`, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('Admin staff table accessible', true, `Staff members: ${data.length}`));
      
      const activeCount = data.filter(s => s.is_active).length;
      results.push(formatResult('Active staff check', true, `Active: ${activeCount}, Inactive: ${data.length - activeCount}`));
    } else {
      results.push(formatResult('Admin staff table accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('Admin Staff Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 9: Feedback Flow
// ═══════════════════════════════════════════════════════════════
async function testFeedbackFlow() {
  console.log('\n📣 Testing Feedback Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  try {
    const response = await fetch(`${baseUrl}/feedback?select=*&limit=5&order=created_at.desc`, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('Feedback table accessible', true, `Recent feedback: ${data.length}`));
    } else {
      results.push(formatResult('Feedback table accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('Feedback Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TEST 10: Activity Logs Flow
// ═══════════════════════════════════════════════════════════════
async function testActivityLogsFlow() {
  console.log('\n📋 Testing Activity Logs Data Flow...\n');
  const results = [];
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  try {
    const response = await fetch(`${baseUrl}/activity_logs?select=*&limit=5&order=created_at.desc`, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push(formatResult('Activity logs accessible', true, `Recent logs: ${data.length}`));
      
      if (data.length > 0) {
        const actions = [...new Set(data.map(d => d.action))];
        results.push(formatResult('Action types found', true, `Actions: ${actions.join(', ')}`));
      }
    } else {
      results.push(formatResult('Activity logs accessible', false, `Status: ${response.status}`));
    }
  } catch (error) {
    results.push(formatResult('Activity Logs Flow', false, error.message));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// MASTER TEST: Run All Tests
// ═══════════════════════════════════════════════════════════════
async function testAllFlows() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        UjenziPro Data Flow Test Suite                      ║');
  console.log('║        Testing all database connections...                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const allResults = [];
  
  allResults.push(...await testAuthFlow());
  allResults.push(...await testProfileFlow());
  allResults.push(...await testUserRolesFlow());
  allResults.push(...await testRegistrationFlows());
  allResults.push(...await testDeliveryFlow());
  allResults.push(...await testFinancialFlow());
  allResults.push(...await testQRScanningFlow());
  allResults.push(...await testAdminStaffFlow());
  allResults.push(...await testFeedbackFlow());
  allResults.push(...await testActivityLogsFlow());
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const passed = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${allResults.length}`);
  console.log(`📈 Score:  ${Math.round((passed / allResults.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️ Failed Tests:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.testName}: ${r.details}`);
    });
  }
  
  return allResults;
}

// ═══════════════════════════════════════════════════════════════
// INTERACTIVE TEST: Create Test Data
// ═══════════════════════════════════════════════════════════════
async function createTestDeliveryRequest() {
  console.log('\n🧪 Creating Test Delivery Request...\n');
  
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
  const baseUrl = 'https://wuuyjjpgzgeimiptuuws.supabase.co/rest/v1';
  
  const testData = {
    pickup_location: 'Test Warehouse, Nairobi',
    delivery_location: 'Test Site, Mombasa',
    material_type: 'Test Materials',
    weight_kg: 100,
    status: 'pending',
    notes: `Test request created at ${new Date().toISOString()}`
  };
  
  try {
    const response = await fetch(`${baseUrl}/delivery_requests`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test delivery request created successfully!');
      console.log('   ID:', data[0]?.id);
      return data[0];
    } else {
      const error = await response.text();
      console.log('❌ Failed to create test request:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Instructions
console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║              UjenziPro Data Flow Testing Script Loaded!                ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  Available Commands:                                                   ║
║  ─────────────────────────────────────────────────────────────────────║
║  testAllFlows()           - Run all tests (recommended)                ║
║  testAuthFlow()           - Test authentication data                   ║
║  testProfileFlow()        - Test profiles table                        ║
║  testUserRolesFlow()      - Test user_roles table                      ║
║  testRegistrationFlows()  - Test all registration tables               ║
║  testDeliveryFlow()       - Test delivery_requests table               ║
║  testFinancialFlow()      - Test financial tables                      ║
║  testQRScanningFlow()     - Test qr_scan_events table                  ║
║  testAdminStaffFlow()     - Test admin_staff table                     ║
║  testFeedbackFlow()       - Test feedback table                        ║
║  testActivityLogsFlow()   - Test activity_logs table                   ║
║  createTestDeliveryRequest() - Create a test delivery request          ║
║                                                                        ║
║  Run: testAllFlows()  to start comprehensive testing                   ║
╚════════════════════════════════════════════════════════════════════════╝
`);




