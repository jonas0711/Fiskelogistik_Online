/**
 * Test Script: Mail System Verification
 * Tester SMTP eller Mailjet konfiguration og mail sending funktionalitet
 */

const Mailjet = require('node-mailjet');
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

async function testMailSystem() {
  log('🚀 Starter Mail System Test...', 'blue');
  await testMailjet();
}

async function testMailjet() {
  log('\n🚀 Kører Mailjet Test...', 'blue');
  const requiredVars = ['MJ_APIKEY_PUBLIC', 'MJ_APIKEY_PRIVATE', 'MJ_SENDER_EMAIL', 'MJ_SENDER_NAME', 'TEST_EMAIL'];
  let missingVars = [];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      log(`❌ Mangler: ${varName}`, 'red');
    } else {
      log(`✅ ${varName} = ${varName.includes('PRIVATE') ? '••••••••' : value}`, 'green');
    }
  });

  if (missingVars.length > 0) {
    log(`\n❌ ${missingVars.length} Mailjet miljøvariabler mangler!`, 'red');
    return;
  }

  const mailjet = new Mailjet({
    apiKey: process.env.MJ_APIKEY_PUBLIC,
    apiSecret: process.env.MJ_APIKEY_PRIVATE
  });

  const request = mailjet
    .post("send", { 'version': 'v3.1' })
    .request({
      "Messages": [
        {
          "From": {
            "Email": process.env.MJ_SENDER_EMAIL,
            "Name": process.env.MJ_SENDER_NAME
          },
          "To": [
            {
              "Email": process.env.TEST_EMAIL,
              "Name": "Test Modtager"
            }
          ],
          "Subject": "🧪 Fiskelogistik Mailjet Test",
          "TextPart": "Dette er en test af Mailjet.",
          "HTMLPart": "<h3>Dette er en test af Mailjet.</h3>"
        }
      ]
    });

  try {
    const result = await request;
    log('✅ Mailjet test mail sendt succesfuldt!', 'green');
    log(JSON.stringify(result.body, null, 2), 'blue');
  } catch (err) {
    log(`❌ Mailjet fejl: ${err.statusCode} ${err.message}`, 'red');
  }
}


// Kør test
testMailSystem().catch(error => {
  log(`❌ Uventet fejl: ${error.message}`, 'red');
  process.exit(1);
}); 