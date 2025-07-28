/**
 * Test Script: Mail System Verification
 * Tester Mailjet konfiguration og mail sending funktionalitet
 * Kun Mailjet implementation efter SMTP migration
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Farver til console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkMailjetConfig() {
  log('\n🚀 Test 1: Mailjet Konfiguration', 'yellow');
  
  const mailjetVars = [
    'MJ_APIKEY_PUBLIC',
    'MJ_APIKEY_PRIVATE',
    'MJ_SENDER_EMAIL',
    'MJ_SENDER_NAME',
    'TEST_EMAIL'
  ];
  
  let missingMailjetVars = [];
  let mailjetConfig = {};
  
  mailjetVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingMailjetVars.push(varName);
      log(`❌ Mangler: ${varName}`, 'red');
    } else {
      log(`✅ ${varName} = ${varName.includes('APIKEY') ? '••••••••' : value}`, 'green');
      mailjetConfig[varName] = value;
    }
  });
  
  if (missingMailjetVars.length === 0) {
    log('✅ Mailjet konfiguration komplet!', 'green');
    return mailjetConfig;
  } else {
    log(`❌ ${missingMailjetVars.length} Mailjet miljøvariabler mangler`, 'red');
    log('Du skal sætte disse i .env.local filen:', 'yellow');
    missingMailjetVars.forEach(varName => {
      log(`   ${varName}=din_værdi_her`, 'yellow');
    });
    return null;
  }
}

async function testMailjetSending(config) {
  log('\n🚀 Test 2: Mailjet Mail Sending', 'yellow');
  
  const payload = {
    Messages: [
      {
        From: {
          Email: config.MJ_SENDER_EMAIL,
          Name: config.MJ_SENDER_NAME
        },
        To: [
          {
            Email: config.TEST_EMAIL
          }
        ],
        Subject: '📧 Fiskelogistik Mailjet Test',
        HTMLPart: `
          <h2 style="color: #0268AB;">Fiskelogistik Mailjet Test</h2>
          <p>Dette er en test mail for at verificere at Mailjet systemet fungerer korrekt.</p>
          
          <h3>Test Information:</h3>
          <ul>
            <li><strong>Mail Provider:</strong> Mailjet</li>
            <li><strong>Sender Email:</strong> ${config.MJ_SENDER_EMAIL}</li>
            <li><strong>Sender Name:</strong> ${config.MJ_SENDER_NAME}</li>
            <li><strong>Test Email:</strong> ${config.TEST_EMAIL}</li>
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString('da-DK')}</li>
          </ul>
          
          <p style="color: #1F7D3A; font-weight: bold;">
            ✅ Hvis du modtager denne mail, betyder det at Mailjet systemet er korrekt konfigureret!
          </p>
          
          <hr>
          <p style="font-size: 12px; color: #666;">
            Dette er en automatisk test mail fra FSK Online platformen.
          </p>
        `,
        TextPart: `
          Fiskelogistik Mailjet Test
          
          Dette er en test mail for at verificere at Mailjet systemet fungerer korrekt.
          
          Test Information:
          - Mail Provider: Mailjet
          - Sender Email: ${config.MJ_SENDER_EMAIL}
          - Sender Name: ${config.MJ_SENDER_NAME}
          - Test Email: ${config.TEST_EMAIL}
          - Timestamp: ${new Date().toLocaleString('da-DK')}
          
          ✅ Hvis du modtager denne mail, betyder det at Mailjet systemet er korrekt konfigureret!
          
          ---
          Dette er en automatisk test mail fra FSK Online platformen.
        `
      }
    ]
  };
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.mailjet.com',
      port: 443,
      path: '/v3.1/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${config.MJ_APIKEY_PUBLIC}:${config.MJ_APIKEY_PRIVATE}`
        ).toString('base64')}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    log(`📤 Sender Mailjet test mail til ${config.TEST_EMAIL}...`, 'blue');
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          const messageResult = result.Messages?.[0];
          
          if (messageResult?.Status === 'success') {
            log('✅ Mailjet test mail sendt succesfuldt!', 'green');
            log(`📧 Message ID: ${messageResult.To?.[0]?.MessageID}`, 'green');
            resolve(true);
          } else {
            log(`❌ Mailjet besked fejlede: ${JSON.stringify(messageResult)}`, 'red');
            reject(new Error('Mailjet besked fejlede'));
          }
        } else {
          log(`❌ HTTP fejl: ${res.statusCode} - ${data}`, 'red');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Mailjet fejl: ${error.message}`, 'red');
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testMailSystem() {
  log('🚀 Starter Fiskelogistik Mail System Test', 'bold');
  log('📍 Tester Mailjet konfiguration og mail sending', 'blue');
  
  try {
    // Test 1: Mailjet konfiguration
    const mailjetConfig = await checkMailjetConfig();
    if (!mailjetConfig) {
      log('\n❌ Mailjet konfiguration mangler!', 'red');
      log('Du skal sætte alle påkrævede Mailjet miljøvariabler i .env.local', 'yellow');
      return;
    }
    
    // Test 2: Mailjet mail sending
    await testMailjetSending(mailjetConfig);
    
    log('\n✅ Mailjet Test Færdig!', 'green');
    log('🎉 Mailjet systemet fungerer korrekt!', 'green');
    
  } catch (error) {
    log(`\n❌ Mailjet test fejlede: ${error.message}`, 'red');
    log('\n🔧 Fejlfinding:', 'yellow');
    log('1. Tjek at alle Mailjet miljøvariabler er sat korrekt', 'yellow');
    log('2. Verificer at MJ_APIKEY_PUBLIC og MJ_APIKEY_PRIVATE er korrekte', 'yellow');
    log('3. Tjek at MJ_SENDER_EMAIL er en verificeret sender i Mailjet', 'yellow');
    log('4. Verificer at TEST_EMAIL er en gyldig email adresse', 'yellow');
    log('5. Tjek Mailjet dashboard for eventuelle fejl', 'yellow');
  }
}

// Kør test hvis scriptet køres direkte
if (require.main === module) {
  testMailSystem().catch(console.error);
}

module.exports = {
  checkMailjetConfig,
  testMailjetSending,
  testMailSystem
}; 