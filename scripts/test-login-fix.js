/**
 * Test Script: Login Fix Verification
 * 
 * Dette script tester login flow på Vercel deployment
 * for at verificere at login loop problemet er løst
 * 
 * Kør: node scripts/test-login-fix.js
 */

const https = require('https');
const http = require('http');

// Konfiguration
const TEST_CONFIG = {
  // Vercel production URL
  productionUrl: 'https://fiskelogistik-online.vercel.app',
  // Test credentials (skal være gyldige)
  testEmail: process.env.TEST_EMAIL || 'test@example.com',
  testPassword: process.env.TEST_PASSWORD || 'testpassword',
  // Timeout for requests
  timeout: 10000,
};

/**
 * Logger med timestamp
 */
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

/**
 * Udfører HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FSK-Login-Test/1.0',
      },
      timeout: TEST_CONFIG.timeout,
      ...options,
    };
    
    log(`🌐 Making request to: ${url}`);
    log(`📋 Request options:`, JSON.stringify(requestOptions, null, 2));
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        log(`📥 Response status: ${res.statusCode}`);
        log(`📋 Response headers:`, JSON.stringify(res.headers, null, 2));
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: res.url || url,
        });
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Request error: ${error.message}`, 'ERROR');
      reject(error);
    });
    
    req.on('timeout', () => {
      log(`⏰ Request timeout after ${TEST_CONFIG.timeout}ms`, 'ERROR');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    // Send request body hvis det findes
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Test 1: Login API endpoint
 */
async function testLoginAPI() {
  log('🧪 Test 1: Testing Login API endpoint');
  
  try {
    const loginUrl = `${TEST_CONFIG.productionUrl}/api/auth/login`;
    const requestBody = JSON.stringify({
      email: TEST_CONFIG.testEmail,
      password: TEST_CONFIG.testPassword,
    });
    
    const response = await makeRequest(loginUrl, {
      body: requestBody,
    });
    
    log(`📊 Login API Response:`, JSON.stringify({
      statusCode: response.statusCode,
      redirected: response.url !== loginUrl,
      finalUrl: response.url,
      hasLoginSuccessHeader: !!response.headers['x-login-success'],
      hasUserEmailHeader: !!response.headers['x-user-email'],
      hasCookieDomainHeader: !!response.headers['x-cookie-domain'],
      dataLength: response.data.length,
    }, null, 2));
    
    // Analyser response
    if (response.statusCode === 302) {
      log('✅ Login API returned 302 redirect (expected)');
      
      if (response.url && response.url.includes('/rio')) {
        log('✅ Redirect URL contains /rio (expected)');
      } else {
        log('⚠️ Redirect URL does not contain /rio', 'WARNING');
      }
      
      if (response.headers['x-login-success']) {
        log('✅ Login success header present');
      } else {
        log('⚠️ Login success header missing', 'WARNING');
      }
      
    } else if (response.statusCode === 401) {
      log('❌ Login failed with 401 (invalid credentials)');
      log('📝 Response data:', response.data);
      
    } else {
      log(`⚠️ Unexpected status code: ${response.statusCode}`, 'WARNING');
      log('📝 Response data:', response.data);
    }
    
  } catch (error) {
    log(`❌ Login API test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 2: Cookie handling verification
 */
async function testCookieHandling() {
  log('🧪 Test 2: Testing Cookie Handling');
  
  try {
    // Først lav en login request
    const loginUrl = `${TEST_CONFIG.productionUrl}/api/auth/login`;
    const requestBody = JSON.stringify({
      email: TEST_CONFIG.testEmail,
      password: TEST_CONFIG.testPassword,
    });
    
    const loginResponse = await makeRequest(loginUrl, {
      body: requestBody,
    });
    
    // Tjek om cookies blev sat
    const setCookieHeaders = loginResponse.headers['set-cookie'];
    
    if (setCookieHeaders) {
      log('✅ Set-Cookie headers found:');
      setCookieHeaders.forEach((cookie, index) => {
        log(`🍪 Cookie ${index + 1}: ${cookie.substring(0, 100)}...`);
        
        // Analyser cookie attributer
        if (cookie.includes('sb-access-token')) {
          log('✅ Access token cookie found');
        }
        if (cookie.includes('sb-refresh-token')) {
          log('✅ Refresh token cookie found');
        }
        if (cookie.includes('HttpOnly')) {
          log('✅ HttpOnly flag present');
        }
        if (cookie.includes('Secure')) {
          log('✅ Secure flag present');
        }
        if (cookie.includes('SameSite=Lax')) {
          log('✅ SameSite=Lax flag present');
        }
      });
    } else {
      log('⚠️ No Set-Cookie headers found', 'WARNING');
    }
    
  } catch (error) {
    log(`❌ Cookie handling test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 3: Middleware protection
 */
async function testMiddlewareProtection() {
  log('🧪 Test 3: Testing Middleware Protection');
  
  try {
    // Test beskyttet rute uden authentication
    const protectedUrl = `${TEST_CONFIG.productionUrl}/rio`;
    
    const response = await makeRequest(protectedUrl, {
      method: 'GET',
    });
    
    log(`📊 Protected route response:`, JSON.stringify({
      statusCode: response.statusCode,
      redirected: response.url !== protectedUrl,
      finalUrl: response.url,
    }, null, 2));
    
    if (response.statusCode === 302 && response.url.includes('/')) {
      log('✅ Middleware correctly redirected to login');
    } else if (response.statusCode === 401) {
      log('✅ Middleware correctly returned 401');
    } else {
      log(`⚠️ Unexpected middleware behavior: ${response.statusCode}`, 'WARNING');
    }
    
  } catch (error) {
    log(`❌ Middleware protection test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 4: Environment detection
 */
async function testEnvironmentDetection() {
  log('🧪 Test 4: Testing Environment Detection');
  
  try {
    // Test public route for at se environment info
    const publicUrl = `${TEST_CONFIG.productionUrl}/`;
    
    const response = await makeRequest(publicUrl, {
      method: 'GET',
    });
    
    log(`📊 Environment test response:`, JSON.stringify({
      statusCode: response.statusCode,
      server: response.headers['server'],
      poweredBy: response.headers['x-powered-by'],
      vercelId: response.headers['x-vercel-id'],
    }, null, 2));
    
    if (response.headers['x-vercel-id']) {
      log('✅ Vercel environment detected');
    } else {
      log('⚠️ Vercel headers not found', 'WARNING');
    }
    
  } catch (error) {
    log(`❌ Environment detection test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Hovedfunktion der kører alle tests
 */
async function runAllTests() {
  log('🚀 Starting Login Fix Verification Tests');
  log(`🌐 Testing URL: ${TEST_CONFIG.productionUrl}`);
  log(`📧 Test email: ${TEST_CONFIG.testEmail}`);
  
  console.log('\n' + '='.repeat(60));
  
  await testLoginAPI();
  console.log('\n' + '-'.repeat(40));
  
  await testCookieHandling();
  console.log('\n' + '-'.repeat(40));
  
  await testMiddlewareProtection();
  console.log('\n' + '-'.repeat(40));
  
  await testEnvironmentDetection();
  console.log('\n' + '='.repeat(60));
  
  log('✅ All tests completed');
  log('📋 Check the output above for any issues');
}

// Kør tests hvis scriptet køres direkte
if (require.main === module) {
  runAllTests().catch((error) => {
    log(`❌ Test suite failed: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  testLoginAPI,
  testCookieHandling,
  testMiddlewareProtection,
  testEnvironmentDetection,
  runAllTests,
}; 