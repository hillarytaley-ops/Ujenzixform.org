#!/usr/bin/env node

/**
 * Security Headers Testing Script for UjenziPro2
 * Tests HTTP security headers implementation
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';
const TIMEOUT = 10000; // 10 seconds

// Required security headers
const REQUIRED_HEADERS = {
  'x-frame-options': {
    name: 'X-Frame-Options',
    expected: ['DENY', 'SAMEORIGIN'],
    severity: 'HIGH',
    description: 'Prevents clickjacking attacks'
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    expected: ['nosniff'],
    severity: 'MEDIUM',
    description: 'Prevents MIME type sniffing'
  },
  'x-xss-protection': {
    name: 'X-XSS-Protection',
    expected: ['1; mode=block', '0'],
    severity: 'MEDIUM',
    description: 'XSS protection (deprecated but still useful)'
  },
  'strict-transport-security': {
    name: 'Strict-Transport-Security',
    expected: null, // Any value with max-age
    severity: 'HIGH',
    description: 'Enforces HTTPS connections'
  },
  'content-security-policy': {
    name: 'Content-Security-Policy',
    expected: null, // Any CSP policy
    severity: 'HIGH',
    description: 'Prevents XSS and injection attacks'
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    expected: ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer'],
    severity: 'MEDIUM',
    description: 'Controls referrer information'
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    expected: null, // Any permissions policy
    severity: 'MEDIUM',
    description: 'Controls browser feature access'
  }
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path || '/',
      method: 'HEAD',
      timeout: TIMEOUT,
      rejectUnauthorized: false // For self-signed certificates in testing
    };

    const req = client.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function validateHeader(headerName, headerValue, config) {
  if (!headerValue) {
    return {
      status: 'MISSING',
      message: `${config.name} header is missing`,
      severity: config.severity
    };
  }

  if (!config.expected) {
    // Any value is acceptable
    return {
      status: 'PRESENT',
      message: `${config.name}: ${headerValue}`,
      severity: 'INFO'
    };
  }

  const isValid = config.expected.some(expected => 
    headerValue.toLowerCase().includes(expected.toLowerCase())
  );

  if (isValid) {
    return {
      status: 'VALID',
      message: `${config.name}: ${headerValue}`,
      severity: 'INFO'
    };
  } else {
    return {
      status: 'INVALID',
      message: `${config.name} has unexpected value: ${headerValue}. Expected: ${config.expected.join(' or ')}`,
      severity: config.severity
    };
  }
}

function generateReport(results) {
  const timestamp = new Date().toISOString();
  
  console.log(colorize('\n🛡️  UjenziPro2 Security Headers Test Report', 'bold'));
  console.log(colorize('='.repeat(50), 'blue'));
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Test Date: ${timestamp}`);
  console.log(`Status Code: ${results.statusCode}\n`);

  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let passedTests = 0;

  // Test each required header
  Object.entries(REQUIRED_HEADERS).forEach(([key, config]) => {
    const headerValue = results.headers[key];
    const validation = validateHeader(key, headerValue, config);
    
    let icon, color;
    switch (validation.status) {
      case 'VALID':
      case 'PRESENT':
        icon = '✅';
        color = 'green';
        passedTests++;
        break;
      case 'MISSING':
        icon = '❌';
        color = 'red';
        if (validation.severity === 'HIGH') highIssues++;
        else if (validation.severity === 'MEDIUM') mediumIssues++;
        break;
      case 'INVALID':
        icon = '⚠️ ';
        color = 'yellow';
        if (validation.severity === 'HIGH') highIssues++;
        else if (validation.severity === 'MEDIUM') mediumIssues++;
        break;
    }

    console.log(`${icon} ${colorize(validation.message, color)}`);
    if (config.description) {
      console.log(`   ${colorize(config.description, 'blue')}`);
    }
    console.log();
  });

  // Additional security checks
  console.log(colorize('🔍 Additional Security Checks', 'bold'));
  console.log(colorize('-'.repeat(30), 'blue'));

  // Check for server information disclosure
  const serverHeader = results.headers.server;
  if (serverHeader) {
    console.log(`⚠️  ${colorize('Server header present:', 'yellow')} ${serverHeader}`);
    console.log(`   ${colorize('Consider hiding server information', 'blue')}\n`);
    mediumIssues++;
  } else {
    console.log(`✅ ${colorize('Server header not disclosed', 'green')}\n`);
    passedTests++;
  }

  // Check for X-Powered-By header
  const poweredByHeader = results.headers['x-powered-by'];
  if (poweredByHeader) {
    console.log(`⚠️  ${colorize('X-Powered-By header present:', 'yellow')} ${poweredByHeader}`);
    console.log(`   ${colorize('Consider removing technology disclosure', 'blue')}\n`);
    mediumIssues++;
  } else {
    console.log(`✅ ${colorize('X-Powered-By header not disclosed', 'green')}\n`);
    passedTests++;
  }

  // Summary
  console.log(colorize('📊 Test Summary', 'bold'));
  console.log(colorize('='.repeat(20), 'blue'));
  console.log(`✅ Passed: ${colorize(passedTests.toString(), 'green')}`);
  console.log(`⚠️  Medium Issues: ${colorize(mediumIssues.toString(), 'yellow')}`);
  console.log(`❌ High Issues: ${colorize(highIssues.toString(), 'red')}`);
  console.log(`🔥 Critical Issues: ${colorize(criticalIssues.toString(), 'red')}`);

  // Overall security score
  const totalTests = Object.keys(REQUIRED_HEADERS).length + 2; // +2 for additional checks
  const securityScore = Math.round((passedTests / totalTests) * 100);
  
  console.log(`\n🏆 Security Score: ${colorize(`${securityScore}%`, securityScore > 80 ? 'green' : securityScore > 60 ? 'yellow' : 'red')}`);

  // Recommendations
  if (highIssues > 0 || mediumIssues > 0) {
    console.log(colorize('\n💡 Recommendations', 'bold'));
    console.log(colorize('-'.repeat(20), 'blue'));
    
    if (highIssues > 0) {
      console.log(`${colorize('HIGH PRIORITY:', 'red')} Address missing critical security headers immediately`);
    }
    
    if (mediumIssues > 0) {
      console.log(`${colorize('MEDIUM PRIORITY:', 'yellow')} Implement additional security headers for defense in depth`);
    }
    
    console.log(`\n${colorize('Resources:', 'blue')}`);
    console.log('- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/');
    console.log('- Mozilla Observatory: https://observatory.mozilla.org/');
    console.log('- Security Headers Analyzer: https://securityheaders.com/');
  }

  return {
    score: securityScore,
    passed: passedTests,
    medium: mediumIssues,
    high: highIssues,
    critical: criticalIssues
  };
}

async function main() {
  try {
    console.log(colorize('🔍 Testing security headers...', 'blue'));
    console.log(`Target: ${TARGET_URL}\n`);

    const results = await makeRequest(TARGET_URL);
    const summary = generateReport(results);

    // Exit with appropriate code
    if (summary.critical > 0 || summary.high > 0) {
      console.log(colorize('\n❌ Security test failed due to critical/high issues', 'red'));
      process.exit(1);
    } else if (summary.medium > 0) {
      console.log(colorize('\n⚠️  Security test passed with warnings', 'yellow'));
      process.exit(0);
    } else {
      console.log(colorize('\n✅ All security header tests passed!', 'green'));
      process.exit(0);
    }

  } catch (error) {
    console.error(colorize(`\n❌ Error testing security headers: ${error.message}`, 'red'));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(colorize('\n💡 Make sure the application is running on the target URL', 'yellow'));
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { makeRequest, validateHeader, generateReport };
