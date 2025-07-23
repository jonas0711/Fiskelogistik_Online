/**
 * Test script til at teste login funktionaliteten
 * Tester både eksisterende og ikke-eksisterende brugere
 */

const fetch = require('node-fetch');

/**
 * Test funktion til at verificere login
 */
async function testLogin() {
  console.log('🧪 Tester login funktionalitet...');
  
  const testCases = [
    {
      name: 'Eksisterende bruger med korrekt password',
      email: 'jonas.ingvorsen@gmail.com', // Erstat med en eksisterende bruger
      password: 'test123', // Erstat med korrekt password
      expectedSuccess: true
    },
    {
      name: 'Ikke-eksisterende bruger',
      email: 'test@example.com',
      password: 'test123',
      expectedSuccess: false
    },
    {
      name: 'Ugyldig email format',
      email: 'invalid-email',
      password: 'test123',
      expectedSuccess: false
    },
    {
      name: 'Tom email',
      email: '',
      password: 'test123',
      expectedSuccess: false
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
        }),
      });
      
      const result = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, result);
      
      const success = response.ok && result.success;
      
      if (success === testCase.expectedSuccess) {
        console.log('✅ SUCCESS: Test passed');
      } else {
        console.log('❌ FAIL: Test failed');
      }
      
    } catch (error) {
      console.error('❌ Fejl under test:', error.message);
    }
  }
  
  console.log('\n🎉 Login test gennemført!');
}

// Kør test hvis scriptet køres direkte
if (require.main === module) {
  testLogin();
}

module.exports = { testLogin }; 