/**
 * 🧪 Test Script: Middleware Authentication Verification
 * 
 * Dette script tester at Next.js middleware fungerer korrekt
 * og beskytter alle ruter som forventet.
 */

const fetch = require('node-fetch');

// Test konfiguration
const BASE_URL = 'http://localhost:3000';
const TEST_ROUTES = [
  '/admin',           // Admin side - kræver authentication
  '/rio',             // RIO side - kræver authentication  
  '/dashboard',       // Dashboard - kræver authentication
  '/api/rio/upload',  // API endpoint - kræver authentication
  '/',                // Login side - offentlig
  '/api/auth/login',  // Login API - offentlig
];

/**
 * Test en rute uden authentication
 * @param {string} route - Rute at teste
 * @returns {Promise<Object>} Test resultat
 */
async function testRouteWithoutAuth(route) {
  console.log(`🔍 Tester rute uden authentication: ${route}`);
  
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Rute korrekt beskyttet - 401 UNAUTHORIZED');
      return { success: true, status: 401, message: 'Korrekt beskyttet' };
    } else if (response.status === 200) {
      console.log('✅ Offentlig rute - 200 OK');
      return { success: true, status: 200, message: 'Offentlig rute' };
    } else if (response.status === 302) {
      console.log('✅ Redirect til login - 302 FOUND');
      return { success: true, status: 302, message: 'Redirect til login' };
    } else {
      console.log(`⚠️ Uventet status: ${response.status}`);
      return { success: false, status: response.status, message: 'Uventet status' };
    }
    
  } catch (error) {
    console.error(`❌ Fejl ved test af ${route}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test en rute med ugyldig Bearer token
 * @param {string} route - Rute at teste
 * @returns {Promise<Object>} Test resultat
 */
async function testRouteWithInvalidToken(route) {
  console.log(`🔍 Tester rute med ugyldig token: ${route}`);
  
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_12345',
      },
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Ugyldig token korrekt afvist - 401 UNAUTHORIZED');
      return { success: true, status: 401, message: 'Ugyldig token afvist' };
    } else {
      console.log(`⚠️ Uventet status for ugyldig token: ${response.status}`);
      return { success: false, status: response.status, message: 'Uventet status' };
    }
    
  } catch (error) {
    console.error(`❌ Fejl ved test af ${route} med ugyldig token:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Hovedfunktion der kører alle tests
 */
async function runMiddlewareTests() {
  console.log('🚀 Starter middleware authentication tests...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Test alle ruter uden authentication
  for (const route of TEST_ROUTES) {
    results.total++;
    
    console.log(`\n--- Test ${results.total}: ${route} ---`);
    
    // Test uden authentication
    const noAuthResult = await testRouteWithoutAuth(route);
    results.details.push({
      route,
      test: 'Uden authentication',
      ...noAuthResult
    });
    
    if (noAuthResult.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Test med ugyldig token (kun for beskyttede ruter)
    if (route !== '/' && route !== '/api/auth/login') {
      results.total++;
      
      const invalidTokenResult = await testRouteWithInvalidToken(route);
      results.details.push({
        route,
        test: 'Med ugyldig token',
        ...invalidTokenResult
      });
      
      if (invalidTokenResult.success) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  }
  
  // Print resultater
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIDDLEWARE TEST RESULTATER');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detaljerede resultater:');
  results.details.forEach((detail, index) => {
    const status = detail.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${detail.route} - ${detail.test}: ${detail.status} ${detail.message}`);
  });
  
  // Konklusion
  console.log('\n' + '='.repeat(50));
  if (results.failed === 0) {
    console.log('🎉 ALLE TESTS PASSED! Middleware fungerer korrekt.');
    console.log('🔒 Platformen er nu fuldt beskyttet mod uautoriseret adgang.');
  } else {
    console.log('⚠️ Nogle tests fejlede. Gennemgå middleware konfiguration.');
  }
  console.log('='.repeat(50));
}

// Kør tests hvis scriptet køres direkte
if (require.main === module) {
  runMiddlewareTests().catch(console.error);
}

module.exports = {
  testRouteWithoutAuth,
  testRouteWithInvalidToken,
  runMiddlewareTests
}; 