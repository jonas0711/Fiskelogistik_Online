/**
 * API Endpoint: /api/admin/setup-mail-config
 * Admin endpoint til at tjekke Mailjet konfiguration status
 * Mailjet konfiguration håndteres via miljøvariabler
 * Kun tilgængelig for admin brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminToken } from '@/libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * POST endpoint til at tjekke Mailjet konfiguration
 * Verificerer at alle nødvendige miljøvariabler er sat
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.config} Håndterer POST request til tjek Mailjet konfiguration...`);
  
  try {
    // Tjek admin rettigheder via Authorization header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan tjekke mail konfiguration`);
      return NextResponse.json(
        { error: 'Kun admin kan tjekke mail konfiguration' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email} - tjekker Mailjet konfiguration...`);
    
    // Tjek Mailjet miljøvariabler
    const mjApiKeyPublic = process.env.MJ_APIKEY_PUBLIC;
    const mjApiKeyPrivate = process.env.MJ_APIKEY_PRIVATE;
    const mjSenderEmail = process.env.MJ_SENDER_EMAIL;
    const mjSenderName = process.env.MJ_SENDER_NAME;
    const envTestEmail = process.env.TEST_EMAIL;
    
    const missingVars = [];
    if (!mjApiKeyPublic) missingVars.push('MJ_APIKEY_PUBLIC');
    if (!mjApiKeyPrivate) missingVars.push('MJ_APIKEY_PRIVATE');
    if (!mjSenderEmail) missingVars.push('MJ_SENDER_EMAIL');
    if (!mjSenderName) missingVars.push('MJ_SENDER_NAME');
    
    if (missingVars.length > 0) {
      console.log(`${LOG_PREFIXES.warning} Manglende Mailjet miljøvariabler: ${missingVars.join(', ')}`);
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'Mailjet konfiguration ikke komplet',
        missing: missingVars,
        instructions: [
          'Tilføj følgende miljøvariabler til .env.local og Vercel:',
          'MJ_APIKEY_PUBLIC=din_public_key',
          'MJ_APIKEY_PRIVATE=din_private_key',
          'MJ_SENDER_EMAIL=rapport@fiskelogistik.dk',
          'MJ_SENDER_NAME=Fiskelogistik Gruppen A/S',
          'TEST_EMAIL=test@example.com'
        ]
      });
    }
    
    console.log(`${LOG_PREFIXES.success} Mailjet konfiguration komplet for: ${mjSenderEmail}`);
    
    return NextResponse.json({
      success: true,
      configured: true,
      message: 'Mailjet konfiguration er komplet',
      config: {
        sender_email: mjSenderEmail,
        sender_name: mjSenderName,
        test_email: envTestEmail,
        // API keys returneres IKKE af sikkerhed
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i Mailjet konfiguration tjek:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
} 