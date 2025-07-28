/**
 * Test Script: Komplet Mail Flow Test
 * Tester hele processen: Browserless PDF generation + Mailjet mail sending
 * Simulerer flere mails til test adresse: jonas.ingvorsen@gmail.com
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

// Farver til console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test data for simulerede chauffører
const testDrivers = [
  {
    name: 'Jensen, Lars',
    month: 'November',
    year: '2024',
    metrics: {
      tomgangsprocent: 3.2,
      fartpilot_andel: 72.5,
      motorbremse_andel: 65.8,
      paalobsdrift_andel: 8.4,
      total_distance: 2845
    }
  },
  {
    name: 'Nielsen, Maria',
    month: 'November', 
    year: '2024',
    metrics: {
      tomgangsprocent: 6.1,
      fartpilot_andel: 58.3,
      motorbremse_andel: 42.7,
      paalobsdrift_andel: 5.2,
      total_distance: 3120
    }
  },
  {
    name: 'Andersen, Peter',
    month: 'November',
    year: '2024', 
    metrics: {
      tomgangsprocent: 2.8,
      fartpilot_andel: 78.9,
      motorbremse_andel: 71.2,
      paalobsdrift_andel: 9.8,
      total_distance: 2675
    }
  }
];

/**
 * Genererer HTML til PDF rapport
 */
function generateTestReportHTML(driver) {
  const fornavn = driver.name.includes(',') 
    ? driver.name.split(',')[1].trim().split(' ')[0]
    : driver.name.split(' ')[0];

  const goals = {
    'Tomgang': {
      value: driver.metrics.tomgangsprocent,
      target: 5.0,
      success: driver.metrics.tomgangsprocent <= 5.0,
      text: 'Mål: Under 5%'
    },
    'Fartpilot anvendelse': {
      value: driver.metrics.fartpilot_andel,
      target: 66.5,
      success: driver.metrics.fartpilot_andel >= 66.5,
      text: 'Mål: Over 66,5%'
    },
    'Brug af motorbremse': {
      value: driver.metrics.motorbremse_andel,
      target: 50.0,
      success: driver.metrics.motorbremse_andel >= 50.0,
      text: 'Mål: Over 50%'
    },
    'Påløbsdrift': {
      value: driver.metrics.paalobsdrift_andel,
      target: 7.0,
      success: driver.metrics.paalobsdrift_andel >= 7.0,
      text: 'Mål: Over 7%'
    }
  };

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            line-height: 1.6; 
            color: #1A2228; 
            background-color: #F5F8F9;
        }
        .header { 
            background: linear-gradient(135deg, #024A7D 0%, #0268AB 50%, #1FB1B1 100%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .driver-info {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(2, 104, 171, 0.1);
        }
        .goals-container { 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin: 25px 0;
            box-shadow: 0 4px 12px rgba(2, 104, 171, 0.1);
            border-left: 5px solid #0268AB;
        }
        .goals-container h3 {
            margin-top: 0;
            color: #024A7D;
            font-size: 20px;
            font-weight: 600;
        }
        .goal-item { 
            margin: 20px 0; 
            padding: 20px; 
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .goal-name {
            font-weight: 600;
            color: #1A2228;
            font-size: 16px;
        }
        .goal-value { 
            font-weight: bold; 
            font-size: 24px;
        }
        .goal-target { 
            color: #4C5E6A; 
            font-size: 14px; 
        }
        .success { 
            color: #1F7D3A;
            background: linear-gradient(135deg, #DFF5E7 0%, #E8F5E8 100%);
        }
        .warning { 
            color: #A3242A;
            background: linear-gradient(135deg, #F9DADA 0%, #FDE8E8 100%);
        }
        .summary {
            background: #E6F4FA;
            padding: 25px;
            border-radius: 10px;
            margin: 25px 0;
        }
        .footer { 
            margin-top: 40px; 
            padding: 25px; 
            background: white;
            border-radius: 10px;
            color: #4C5E6A; 
            font-size: 14px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Fiskelogistik Chaufførrapport</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">TEST RAPPORT</p>
    </div>
    
    <div class="driver-info">
        <h2 style="color: #024A7D; margin-top: 0;">Kære ${fornavn},</h2>
        <p>Hermed din månedlige kørselsrapport for <strong>${driver.month} ${driver.year}</strong>.</p>
        <p><strong>Total kørte kilometer:</strong> ${driver.metrics.total_distance.toLocaleString('da-DK')} km</p>
    </div>
    
    <div class="goals-container">
        <h3>🎯 Din performance på de 4 målsætninger:</h3>`;

  // Tilføj hver målsætning med farve-kodning
  Object.entries(goals).forEach(([name, goal]) => {
    const statusClass = goal.success ? 'success' : 'warning';
    const icon = goal.success ? '✅' : '⚠️';
    htmlContent += `
        <div class="goal-item ${statusClass}">
            <div>
                <div class="goal-name">${icon} ${name}</div>
                <div class="goal-target">${goal.text}</div>
            </div>
            <div class="goal-value">${goal.value.toFixed(1)}%</div>
        </div>`;
  });

  // Beregn samlet score
  const successCount = Object.values(goals).filter(g => g.success).length;
  const totalGoals = Object.keys(goals).length;
  const scorePercent = (successCount / totalGoals * 100).toFixed(0);

  htmlContent += `
    </div>
    
    <div class="summary">
        <h3 style="color: #024A7D; margin-top: 0;">📈 Samlet Resultat</h3>
        <p><strong>${successCount} ud af ${totalGoals} målsætninger opfyldt (${scorePercent}%)</strong></p>
        ${successCount === totalGoals 
          ? '<p style="color: #1F7D3A; font-weight: bold;">🎉 Fantastisk kørsel - alle mål nået!</p>'
          : '<p style="color: #B25B00;">💪 Der er plads til forbedring på nogle områder.</p>'
        }
    </div>
    
    <div class="footer">
        <p><strong>Har du spørgsmål til rapporten?</strong></p>
        <p>Kontakt venligst Susan eller Rasmus</p>
        
        <hr style="margin: 20px 0; border: 1px solid #E6F4FA;">
        
        <p><strong>Med venlig hilsen</strong><br>
        Fiskelogistik Gruppen A/S</p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #95A5AE;">
            📧 Dette er en TEST rapport genereret via Browserless.io<br>
            🕒 Genereret: ${new Date().toLocaleString('da-DK')}
        </p>
    </div>
</body>
</html>`;

  return htmlContent;
}

/**
 * Genererer PDF via Browserless API
 */
async function generatePDFViaBrowserless(htmlContent, driverName) {
  log(`\n🚀 Test 1: PDF Generering via Browserless for ${driverName}`, 'yellow');
  
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  const PUPPETEER_SERVICE_PROVIDER = process.env.PUPPETEER_SERVICE_PROVIDER || 'https://chrome.browserless.io';
  
  if (!BROWSERLESS_TOKEN) {
    throw new Error('BROWSERLESS_TOKEN mangler i .env.local');
  }
  
  const endpoint = `${PUPPETEER_SERVICE_PROVIDER}/pdf?token=${BROWSERLESS_TOKEN}`;
  
  const payload = {
    html: htmlContent,
    options: {
      format: 'A4',
      margin: {
        top: '1.5cm',
        bottom: '1.5cm', 
        left: '1.5cm',
        right: '1.5cm',
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1.0,
      width: '210mm',
      height: '297mm',
    }
  };
  
  try {
    log(`📤 Sender request til Browserless.io...`, 'blue');
    const startTime = Date.now();
    
    const response = await axios.post(endpoint, payload, {
      responseType: 'arraybuffer',
      timeout: 45000
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    const pdfBuffer = Buffer.from(response.data);
    log(`✅ PDF genereret succesfuldt!`, 'green');
    log(`   📊 Størrelse: ${(pdfBuffer.length / 1024).toFixed(1)} KB`, 'green');
    log(`   ⏱️  Tid: ${duration} sekunder`, 'green');
    
    return pdfBuffer;
    
  } catch (error) {
    if (error.response?.status === 429) {
      log(`❌ Rate limit nået (429) - Browserless units opbrugt`, 'red');
      throw new Error('Browserless rate limit nået');
    } else if (error.response) {
      log(`❌ Browserless API fejl: ${error.response.status}`, 'red');
      throw new Error(`Browserless fejl: ${error.response.status}`);
    } else {
      log(`❌ Netværksfejl: ${error.message}`, 'red');
      throw error;
    }
  }
}

/**
 * Sender mail via Mailjet
 */
async function sendMailViaMailjet(driverName, htmlContent, pdfBuffer) {
  log(`\n📧 Test 2: Mail Sending via Mailjet for ${driverName}`, 'yellow');
  
  const mailjetVars = ['MJ_APIKEY_PUBLIC', 'MJ_APIKEY_PRIVATE', 'MJ_SENDER_EMAIL', 'MJ_SENDER_NAME'];
  const missingVars = mailjetVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Manglende Mailjet miljøvariabler: ${missingVars.join(', ')}`);
  }
  
  const testEmail = 'jonas.ingvorsen@gmail.com';
  const subject = `🚗 Test Chaufførrapport - ${driverName}`;
  
  const payload = {
    Messages: [
      {
        From: {
          Email: process.env.MJ_SENDER_EMAIL,
          Name: process.env.MJ_SENDER_NAME
        },
        To: [
          {
            Email: testEmail
          }
        ],
        Subject: subject,
        HTMLPart: htmlContent,
        Attachments: [
          {
            ContentType: 'application/pdf',
            Filename: `Test_Rapport_${driverName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            Base64Content: pdfBuffer.toString('base64')
          }
        ]
      }
    ]
  };
  
  try {
    log(`📤 Sender mail til ${testEmail}...`, 'blue');
    const startTime = Date.now();
    
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
        ).toString('base64')}`
      },
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Mailjet API fejl: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    const messageResult = result.Messages?.[0];
    
    if (messageResult?.Status === 'success') {
      log(`✅ Mail sendt succesfuldt!`, 'green');
      log(`   📧 Til: ${testEmail}`, 'green');
      log(`   📎 PDF vedlagt: ${(pdfBuffer.length / 1024).toFixed(1)} KB`, 'green');
      log(`   🆔 Message ID: ${messageResult.To?.[0]?.MessageID}`, 'green');
      log(`   ⏱️  Tid: ${duration} sekunder`, 'green');
      return true;
    } else {
      log(`❌ Mailjet besked fejlede: ${JSON.stringify(messageResult)}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Mail sending fejlede: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Delay funktion
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hovedtest funktion
 */
async function runFullMailFlowTest() {
  log('🚀 Starter Komplet Mail Flow Test', 'bold');
  log('═'.repeat(60), 'cyan');
  log('📋 Tester:', 'blue');
  log('   • Browserless PDF generering', 'blue');
  log('   • Mailjet mail sending', 'blue');
  log('   • PDF vedhæftning', 'blue');
  log(`   • ${testDrivers.length} test chauffører`, 'blue');
  log('═'.repeat(60), 'cyan');
  
  const results = {
    totalTests: testDrivers.length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  try {
    for (let i = 0; i < testDrivers.length; i++) {
      const driver = testDrivers[i];
      
      log(`\n${'█'.repeat(20)} CHAUFFØR ${i + 1}/${testDrivers.length} ${'█'.repeat(20)}`, 'magenta');
      log(`👤 Tester: ${driver.name}`, 'cyan');
      
      try {
        // 1. Generer HTML indhold
        log(`\n📝 Genererer HTML rapport indhold...`, 'blue');
        const htmlContent = generateTestReportHTML(driver);
        log(`✅ HTML genereret (${(htmlContent.length / 1024).toFixed(1)} KB)`, 'green');
        
        // 2. Generer PDF via Browserless
        const pdfBuffer = await generatePDFViaBrowserless(htmlContent, driver.name);
        
        // 3. Send mail via Mailjet
        await sendMailViaMailjet(driver.name, htmlContent, pdfBuffer);
        
        results.successful++;
        log(`\n🎉 SUCCESS: ${driver.name} afsluttet succesfuldt!`, 'green');
        
        // Delay mellem chauffører for at respektere rate limits
        if (i < testDrivers.length - 1) {
          const delay = 8000; // 8 sekunder delay
          log(`\n⏳ Venter ${delay/1000} sekunder før næste chauffør...`, 'yellow');
          await sleep(delay);
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          driver: driver.name,
          error: error.message
        });
        log(`\n💥 FEJL for ${driver.name}: ${error.message}`, 'red');
      }
    }
    
    // Samlet resultat
    log('\n' + '═'.repeat(60), 'cyan');
    log('📊 TEST RESULTAT OVERSIGT', 'bold');
    log('═'.repeat(60), 'cyan');
    log(`✅ Succesfulde: ${results.successful}/${results.totalTests}`, 'green');
    log(`❌ Fejlede: ${results.failed}/${results.totalTests}`, results.failed > 0 ? 'red' : 'green');
    
    if (results.errors.length > 0) {
      log('\n🚨 FEJL DETALJER:', 'red');
      results.errors.forEach(err => {
        log(`   • ${err.driver}: ${err.error}`, 'red');
      });
    }
    
    if (results.successful === results.totalTests) {
      log('\n🎉 ALLE TESTS BESTÅET! Mail flow fungerer perfekt!', 'green');
      log('📧 Tjek jonas.ingvorsen@gmail.com for test mails', 'green');
    } else {
      log('\n⚠️  Nogle tests fejlede. Tjek fejl beskeder ovenfor.', 'yellow');
    }
    
  } catch (error) {
    log(`\n💥 Kritisk fejl: ${error.message}`, 'red');
    console.error(error);
  }
}

// Kør test hvis scriptet køres direkte
if (require.main === module) {
  runFullMailFlowTest().catch(console.error);
}

module.exports = {
  runFullMailFlowTest,
  generateTestReportHTML,
  generatePDFViaBrowserless,
  sendMailViaMailjet
};