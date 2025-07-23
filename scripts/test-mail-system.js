/**
 * Test Script: Mail System Verification
 * Tester SMTP konfiguration og mail sending funktionalitet
 * Baseret på vores sikkerhedsrettelser
 */

const nodemailer = require('nodemailer');
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
  
  // Test 1: Tjek miljøvariabler
  log('\n📋 Test 1: Miljøvariabler', 'yellow');
  const requiredVars = [
    'SMTP_SERVER',
    'SMTP_PORT', 
    'EMAIL',
    'APP_PASSWORD',
    'TEST_EMAIL'
  ];
  
  let missingVars = [];
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      log(`❌ Mangler: ${varName}`, 'red');
    } else {
      log(`✅ ${varName} = ${varName.includes('PASSWORD') ? '••••••••' : value}`, 'green');
    }
  });
  
  if (missingVars.length > 0) {
    log(`\n❌ ${missingVars.length} miljøvariabler mangler!`, 'red');
    log('Du skal sætte disse i .env.local filen:', 'yellow');
    missingVars.forEach(varName => {
      log(`   ${varName}=din_værdi_her`, 'yellow');
    });
    return;
  }
  
  // Test 2: Opret SMTP transporter
  log('\n🔧 Test 2: SMTP Transporter', 'yellow');
  
  const transportConfig = {
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for 465 (SSL), false for andre porter
    auth: {
      user: process.env.EMAIL,
      pass: process.env.APP_PASSWORD,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  };
  
  if (process.env.SMTP_PORT === '587') {
    transportConfig.requireTLS = true;
  }
  
  log(`📡 Opretter forbindelse til ${process.env.SMTP_SERVER}:${process.env.SMTP_PORT}...`, 'blue');
  
  try {
    const transporter = nodemailer.createTransport(transportConfig);
    
    // Verificer SMTP forbindelse
    log('🔍 Verificerer SMTP forbindelse...', 'blue');
    await transporter.verify();
    log('✅ SMTP forbindelse verificeret!', 'green');
    
    // Test 3: Send test mail
    log('\n📧 Test 3: Send Test Mail', 'yellow');
    
    const testMailOptions = {
      from: process.env.EMAIL,
      to: process.env.TEST_EMAIL,
      subject: '🧪 Fiskelogistik Mail System Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0268AB;">Fiskelogistik Mail System Test</h2>
          <p>Dette er en test mail for at verificere at mail systemet fungerer korrekt.</p>
          <div style="background: #E6F4FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #024A7D; margin-top: 0;">Test Detaljer:</h3>
            <ul>
              <li><strong>SMTP Server:</strong> ${process.env.SMTP_SERVER}</li>
              <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>Afsender:</strong> ${process.env.EMAIL}</li>
              <li><strong>Modtager:</strong> ${process.env.TEST_EMAIL}</li>
              <li><strong>Tidspunkt:</strong> ${new Date().toLocaleString('da-DK')}</li>
            </ul>
          </div>
          <p style="color: #4C5E6A; font-size: 14px;">
            Hvis du modtager denne mail, betyder det at mail systemet er korrekt konfigureret.
          </p>
        </div>
      `,
      text: `
Fiskelogistik Mail System Test

Dette er en test mail for at verificere at mail systemet fungerer korrekt.

Test Detaljer:
- SMTP Server: ${process.env.SMTP_SERVER}
- SMTP Port: ${process.env.SMTP_PORT}
- Afsender: ${process.env.EMAIL}
- Modtager: ${process.env.TEST_EMAIL}
- Tidspunkt: ${new Date().toLocaleString('da-DK')}

Hvis du modtager denne mail, betyder det at mail systemet er korrekt konfigureret.
      `
    };
    
    log(`📤 Sender test mail til ${process.env.TEST_EMAIL}...`, 'blue');
    const info = await transporter.sendMail(testMailOptions);
    
    log('✅ Test mail sendt succesfuldt!', 'green');
    log(`📨 Message ID: ${info.messageId}`, 'blue');
    log(`📧 Til: ${info.accepted.join(', ')}`, 'blue');
    
    if (info.rejected && info.rejected.length > 0) {
      log(`❌ Afvist: ${info.rejected.join(', ')}`, 'red');
    }
    
  } catch (error) {
    log(`❌ SMTP fejl: ${error.message}`, 'red');
    
    // Detaljeret fejlhåndtering
    if (error.message.includes('Authentication failed')) {
      log('\n🔐 Autentificering fejlede!', 'red');
      log('Mulige årsager:', 'yellow');
      log('1. Forkert email adresse', 'yellow');
      log('2. Forkert app password (ikke normalt password)', 'yellow');
      log('3. 2-faktor autentificering ikke aktiveret', 'yellow');
      log('4. "Mindre sikre apps" ikke aktiveret (hvis relevant)', 'yellow');
    } else if (error.message.includes('connection timeout')) {
      log('\n⏰ Forbindelse timeout!', 'red');
      log('Mulige årsager:', 'yellow');
      log('1. Forkert SMTP server adresse', 'yellow');
      log('2. Forkert SMTP port', 'yellow');
      log('3. Firewall blokerer forbindelsen', 'yellow');
    } else if (error.message.includes('ENOTFOUND')) {
      log('\n🌐 Server ikke fundet!', 'red');
      log('Mulige årsager:', 'yellow');
      log('1. Forkert SMTP server adresse', 'yellow');
      log('2. Internet forbindelse problemer', 'yellow');
    }
    
    return;
  }
  
  // Test 4: Tjek mail logs (hvis database er tilgængelig)
  log('\n📊 Test 4: Mail Logs', 'yellow');
  log('ℹ️  Mail logs gemmes i databasen når mails sendes via applikationen', 'blue');
  
  log('\n✅ Mail System Test Færdig!', 'green');
  log('\n📝 Næste skridt:', 'blue');
  log('1. Tjek din email (også spam mappen)', 'yellow');
  log('2. Hvis du ikke modtager mailen, tjek ovenstående fejlhåndtering', 'yellow');
  log('3. Verificer at TEST_EMAIL er korrekt sat', 'yellow');
}

// Kør test
testMailSystem().catch(error => {
  log(`❌ Uventet fejl: ${error.message}`, 'red');
  process.exit(1);
}); 