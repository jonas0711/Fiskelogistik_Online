/**
 * Test script til at verificere RIO rute beskyttelse
 * Tester at alle RIO ruter nu kræver authentication
 */

const fetch = require('node-fetch');

/**
 * Test funktion til at verificere RIO beskyttelse
 */
async function testRIOProtection() {
  console.log('🧪 Tester RIO rute beskyttelse...');
  
  // Liste over RIO ruter der skal testes
  const rioRoutes = [
    '/rio',
    '/rio/upload',
    '/rio/drivers',
    '/rio/kpi',
    '/rio/reports',
    '/rio/mail',
    '/rio/settings'
  ];
  
  try {
    // Test 1: Uautoriseret adgang til alle RIO ruter
    console.log('\n📋 Test 1: Uautoriseret adgang til RIO ruter');
    
    for (const route of rioRoutes) {
      console.log(`\n🔍 Tester: ${route}`);
      
      const response = await fetch(`http://localhost:3001${route}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
        redirect: 'manual', // Følg ikke redirects automatisk
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Location header: ${response.headers.get('location')}`);
      
      if (response.status === 302 && response.headers.get('location')?.includes('/')) {
        console.log('✅ SUCCESS: Rute redirecter til login side ved uautoriseret adgang');
      } else {
        console.log('❌ FAIL: Rute tillader uautoriseret adgang');
      }
    }
    
    // Test 2: Tjek at login side stadig er tilgængelig
    console.log('\n📋 Test 2: Login side tilgængelig');
    
    const loginResponse = await fetch('http://localhost:3001/', {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
      },
    });
    
    console.log(`Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      console.log('✅ SUCCESS: Login side er tilgængelig');
    } else {
      console.log('❌ FAIL: Login side er ikke tilgængelig');
    }
    
    // Test 3: Tjek at API ruter også er beskyttet
    console.log('\n📋 Test 3: API ruter beskyttelse');
    
    const apiRoutes = [
      '/api/rio/upload',
      '/api/rio/drivers',
      '/api/rio/kpi',
      '/api/rio/reports'
    ];
    
    for (const route of apiRoutes) {
      console.log(`\n🔍 Tester API: ${route}`);
      
      const response = await fetch(`http://localhost:3001${route}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('✅ SUCCESS: API rute returnerer 401 ved uautoriseret adgang');
      } else {
        console.log('❌ FAIL: API rute tillader uautoriseret adgang');
      }
    }
    
    console.log('\n🎉 RIO beskyttelse test gennemført!');
    
  } catch (error) {
    console.error('❌ Fejl under test:', error.message);
  }
}

// Kør test hvis scriptet køres direkte
if (require.main === module) {
  testRIOProtection();
}

module.exports = { testRIOProtection }; 