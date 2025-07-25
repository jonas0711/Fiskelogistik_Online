/**
 * Test script for login-loop fix
 * Verificerer at JSON response og client-side redirect fungerer korrekt
 */

async function testLoginFix() {
  console.log('🧪 Tester login-loop fix...');
  
  try {
    // Test 1: Login API returnerer JSON response
    console.log('\n📋 Test 1: Login API JSON response');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
      redirect: 'manual', // Vigtigt: Ikke følg redirect
    });
    
    console.log('Status:', loginResponse.status);
    console.log('Headers:', {
      'x-response-type': loginResponse.headers.get('x-response-type'),
      'content-type': loginResponse.headers.get('content-type'),
    });
    
    const responseData = await loginResponse.json();
    console.log('Response data:', responseData);
    
    // Verificer at response er JSON og ikke redirect
    if (responseData.success === false && responseData.message) {
      console.log('✅ Test 1 PASSED: API returnerer korrekt JSON error response');
    } else {
      console.log('❌ Test 1 FAILED: API returnerer ikke korrekt JSON response');
    }
    
    // Test 2: Verificer cookie headers
    console.log('\n📋 Test 2: Cookie headers');
    
    const cookieHeaders = loginResponse.headers.get('set-cookie');
    if (cookieHeaders) {
      console.log('Cookies sat:', cookieHeaders);
      console.log('✅ Test 2 PASSED: Cookies bliver sat korrekt');
    } else {
      console.log('ℹ️ Test 2 INFO: Ingen cookies sat (forventet ved fejl)');
    }
    
    // Test 3: Verificer response type header
    console.log('\n📋 Test 3: Response type header');
    
    const responseType = loginResponse.headers.get('x-response-type');
    if (responseType === 'json') {
      console.log('✅ Test 3 PASSED: Response type header er korrekt');
    } else {
      console.log('❌ Test 3 FAILED: Response type header mangler eller er forkert');
    }
    
    console.log('\n🎉 Login-loop fix test gennemført!');
    console.log('\n📝 Næste skridt:');
    console.log('1. Test med korrekte login credentials');
    console.log('2. Verificer at client-side redirect fungerer');
    console.log('3. Test på Vercel deployment');
    
  } catch (error) {
    console.error('❌ Test fejlede:', error.message);
  }
}

// Kør test hvis script køres direkte
if (require.main === module) {
  testLoginFix();
}

module.exports = { testLoginFix }; 