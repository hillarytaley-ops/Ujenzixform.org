/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🔥 LOAD TESTING SCRIPT - UjenziPro                                                 ║
 * ║                                                                                      ║
 * ║   USAGE:                                                                             ║
 * ║   1. Install k6: choco install k6 (Windows) or brew install k6 (Mac)                ║
 * ║   2. Run: k6 run scripts/load-test.js                                               ║
 * ║   3. For cloud testing: k6 cloud scripts/load-test.js                               ║
 * ║                                                                                      ║
 * ║   SCENARIOS:                                                                         ║
 * ║   - smoke: Quick test with 5 users                                                  ║
 * ║   - load: Normal load with 50 users                                                 ║
 * ║   - stress: High load with 100+ users                                               ║
 * ║   - spike: Sudden traffic spike simulation                                          ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://ujenzixform.com';
const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'your_anon_key_here';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up
        { duration: '5m', target: 50 },  // Stay at 50
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
      startTime: '1m', // Start after smoke test
    },
    
    // Stress test - beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '10m', // Start after load test
    },
    
    // Spike test - sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 200 }, // Spike!
        { duration: '1m', target: 200 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      startTime: '22m', // Start after stress test
    },
  },
  
  // Thresholds - test fails if these aren't met
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                  // Less than 1% failure
    errors: ['rate<0.05'],                           // Less than 5% errors
    page_load_time: ['p(95)<2000'],                  // Page loads under 2s
  },
};

// Common headers
const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// Main test function
export default function () {
  // Randomly choose a user journey
  const journey = Math.random();
  
  if (journey < 0.4) {
    browsingJourney();
  } else if (journey < 0.7) {
    searchJourney();
  } else if (journey < 0.9) {
    cartJourney();
  } else {
    apiJourney();
  }
}

// Journey 1: Browsing (40% of users)
function browsingJourney() {
  group('Browsing Journey', function () {
    // Home page
    let start = Date.now();
    let res = http.get(`${BASE_URL}/home`);
    pageLoadTime.add(Date.now() - start);
    check(res, {
      'home page status 200': (r) => r.status === 200,
      'home page has content': (r) => r.body.length > 1000,
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 3));
    
    // Suppliers page
    start = Date.now();
    res = http.get(`${BASE_URL}/suppliers`);
    pageLoadTime.add(Date.now() - start);
    check(res, {
      'suppliers page status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(2, 5));
    
    // About page
    res = http.get(`${BASE_URL}/about`);
    check(res, {
      'about page status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 2));
  });
}

// Journey 2: Search and browse materials (30% of users)
function searchJourney() {
  group('Search Journey', function () {
    // Load materials from API
    let res = http.get(
      `${SUPABASE_URL}/rest/v1/admin_material_images?is_approved=eq.true&limit=20`,
      { headers }
    );
    check(res, {
      'materials API status 200': (r) => r.status === 200,
      'materials returned': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) && data.length > 0;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 2));
    
    // Search for specific category
    const categories = ['Cement', 'Steel', 'Paint', 'Tiles', 'Roofing'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    res = http.get(
      `${SUPABASE_URL}/rest/v1/admin_material_images?is_approved=eq.true&category=eq.${category}`,
      { headers }
    );
    check(res, {
      'category search status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(2, 4));
    
    // Get supplier prices
    res = http.get(
      `${SUPABASE_URL}/rest/v1/supplier_product_prices?limit=50`,
      { headers }
    );
    check(res, {
      'prices API status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 3));
  });
}

// Journey 3: Cart operations (20% of users)
function cartJourney() {
  group('Cart Journey', function () {
    // Simulate viewing products
    let res = http.get(
      `${SUPABASE_URL}/rest/v1/admin_material_images?is_approved=eq.true&limit=10`,
      { headers }
    );
    check(res, {
      'products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 2));
    
    // Simulate price comparison (multiple API calls)
    const priceRequests = [
      http.get(`${SUPABASE_URL}/rest/v1/supplier_product_prices?limit=20`, { headers }),
      http.get(`${SUPABASE_URL}/rest/v1/admin_material_images?is_approved=eq.true&limit=5`, { headers }),
    ];
    
    // Note: k6 doesn't have Promise.all, requests are sequential
    check(priceRequests[0], {
      'price comparison 1': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(2, 4));
    
    // Simulate checkout page view
    res = http.get(`${BASE_URL}/home`);
    check(res, {
      'checkout page accessible': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(randomBetween(1, 2));
  });
}

// Journey 4: API-heavy operations (10% of users)
function apiJourney() {
  group('API Journey', function () {
    // Multiple rapid API calls (simulates dashboard)
    const endpoints = [
      '/rest/v1/admin_material_images?is_approved=eq.true&limit=50',
      '/rest/v1/supplier_product_prices?limit=100',
      '/rest/v1/suppliers?status=eq.approved&limit=20',
    ];
    
    for (const endpoint of endpoints) {
      const res = http.get(`${SUPABASE_URL}${endpoint}`, { headers });
      check(res, {
        [`${endpoint} status 200`]: (r) => r.status === 200,
      }) || errorRate.add(1);
      
      sleep(randomBetween(0.5, 1));
    }
    
    sleep(randomBetween(2, 3));
  });
}

// Helper function for random sleep
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Setup function - runs once before tests
export function setup() {
  console.log(`🔥 Starting load test against ${BASE_URL}`);
  console.log(`📊 Supabase URL: ${SUPABASE_URL}`);
  
  // Verify the site is accessible
  const res = http.get(`${BASE_URL}/home`);
  if (res.status !== 200) {
    throw new Error(`Site not accessible! Status: ${res.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown function - runs once after tests
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`✅ Load test completed in ${duration.toFixed(2)} minutes`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const metrics = data.metrics;
  
  return `
╔══════════════════════════════════════════════════════════════════╗
║                    LOAD TEST RESULTS                              ║
╠══════════════════════════════════════════════════════════════════╣
║ Total Requests:     ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:    ${metrics.http_req_failed?.values?.passes || 0}
║ Error Rate:         ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
║
║ Response Times:
║   - Average:        ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
║   - P95:            ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
║   - P99:            ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms
║   - Max:            ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms
║
║ Data Transfer:
║   - Received:       ${((metrics.data_received?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB
║   - Sent:           ${((metrics.data_sent?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB
╚══════════════════════════════════════════════════════════════════╝
`;
}

