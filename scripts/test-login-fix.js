/**
 * Test Script: Login Loop Fix Verification
 * 
 * Dette script tester at login flow'et nu virker korrekt uden loop
 * efter implementering af server-side redirect løsningen
 */

// Node.js har indbygget fetch i nyere versioner
// Ingen import nødvendig

// Test konfiguration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testEmail: 'jonas.ingvorsen@gmail.com', // Test email der oprettes
  testPassword: 'Vzx22nhe!',
  adminEmail: 'jonas.ingvorsen@gmail.com', // Admin email fra env.template
  adminPassword: 'Vzx22nhe!', // Admin password (skal være korrekt)
  timeout: 10000,
};

/**
 * Test funktion der opretter en test bruger
 */
async function createTestUser() {
  console.log('\n👤 Test 0: Opretter test bruger...');
  
  try {
    // Først login som admin for at få token
    console.log('🔐 Logger ind som admin...');
    
    const adminLoginResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CONFIG.adminEmail,
        password: TEST_CONFIG.adminPassword,
      }),
      redirect: 'manual',
    });
    
    if (adminLoginResponse.status !== 302) {
      console.log('❌ Admin login fejlede, status:', adminLoginResponse.status);
      const errorData = await adminLoginResponse.json();
      console.log('❌ Admin login fejl:', errorData);
      return false;
    }
    
    // Hent admin token fra cookies
    const adminCookies = adminLoginResponse.headers.get('set-cookie');
    if (!adminCookies) {
      console.log('❌ Ingen admin cookies modtaget');
      return false;
    }
    
    console.log('✅ Admin login succesfuldt');
    
    // Opret test bruger med admin token
    console.log('👤 Opretter test bruger...');
    
    const createUserResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/admin/create-test-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminCookies}`, // Dette virker måske ikke, men lad os prøve
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testEmail,
        password: TEST_CONFIG.testPassword,
        full_name: 'Test User',
        role: 'user',
      }),
    });
    
    console.log('📊 Create user response status:', createUserResponse.status);
    
    if (createUserResponse.ok) {
      const data = await createUserResponse.json();
      console.log('✅ Test bruger oprettet:', data);
      return true;
    } else {
      const errorData = await createUserResponse.json();
      console.log('❌ Kunne ikke oprette test bruger:', errorData);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test fejlede:', error.message);
    return false;
  }
}

/**
 * Test funktion der simulerer login flow
 */
async function testLoginFlow() {
  console.log('🧪 Starter login flow test...');
  
  try {
    // Test 1: Login med korrekte credentials
    console.log('\n📝 Test 1: Login med korrekte credentials');
    
    const loginResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testEmail,
        password: TEST_CONFIG.testPassword,
      }),
      redirect: 'manual', // Lad os håndtere redirect manuelt for at se hvad der sker
    });
    
    console.log('📊 Login response status:', loginResponse.status);
    console.log('📊 Login response headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    // Tjek om response er en redirect
    if (loginResponse.status >= 300 && loginResponse.status < 400) {
      const location = loginResponse.headers.get('location');
      console.log('✅ Server-side redirect detekteret til:', location);
      
      // Tjek om cookies er sat
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      if (setCookieHeaders) {
        console.log('✅ Cookies sat på redirect response:', setCookieHeaders);
      } else {
        console.log('⚠️ Ingen cookies fundet på redirect response');
      }
      
      return true;
    } else {
      // Hvis ikke redirect, så er det en fejl
      const errorData = await loginResponse.json();
      console.log('❌ Login fejlede:', errorData);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test fejlede:', error.message);
    return false;
  }
}

/**
 * Test funktion der simulerer beskyttet rute adgang
 */
async function testProtectedRouteAccess() {
  console.log('\n🔒 Test 2: Beskyttet rute adgang');
  
  try {
    // Test adgang til /rio uden authentication
    const rioResponse = await fetch(`${TEST_CONFIG.baseUrl}/rio`, {
      redirect: 'manual',
    });
    
    console.log('📊 RIO response status:', rioResponse.status);
    
    if (rioResponse.status === 302) {
      const location = rioResponse.headers.get('location');
      console.log('✅ Middleware redirect til login:', location);
      return true;
    } else {
      console.log('❌ Uventet response fra beskyttet rute');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test fejlede:', error.message);
    return false;
  }
}

/**
 * Hovedfunktion der kører alle tests
 */
async function runTests() {
  console.log('🚀 Starter Login Loop Fix Tests...\n');
  
  const test0Result = await createTestUser();
  if (!test0Result) {
    console.log('\n⚠️ Test 0 (Opret bruger) fejlede. Kan ikke fortsætte.');
    return;
  }

  const test1Result = await testLoginFlow();
  const test2Result = await testProtectedRouteAccess();
  
  console.log('\n📋 Test Resultater:');
  console.log('Test 0 (Opret Bruger):', test0Result ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 1 (Login Flow):', test1Result ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 2 (Protected Route):', test2Result ? '✅ PASSED' : '❌ FAILED');
  
  if (test0Result && test1Result && test2Result) {
    console.log('\n🎉 Alle tests passed! Login loop fix virker korrekt.');
  } else {
    console.log('\n⚠️ Nogle tests fejlede. Tjek implementation.');
  }
}

// Kør tests hvis script køres direkte
runTests().catch(console.error); 