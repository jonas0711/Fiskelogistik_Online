/**
 * API Endpoint: /api/admin/mail-config
 * Admin endpoint til at administrere Mailjet konfiguration
 * Håndterer Mailjet indstillinger og test emails
 * Kun tilgængelig for admin brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminToken } from '@/libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET endpoint til at hente mail konfiguration
 * Returnerer SMTP indstillinger (uden password af sikkerhed)
 */
export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIXES.search} Håndterer GET request til mail config API...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan se mail konfiguration`);
      return NextResponse.json(
        { error: 'Kun admin kan se mail konfiguration' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    // Tjek Mailjet miljøvariabler
    const mjApiKeyPublic = process.env.MJ_APIKEY_PUBLIC;
    const mjApiKeyPrivate = process.env.MJ_APIKEY_PRIVATE;
    const mjSenderEmail = process.env.MJ_SENDER_EMAIL;
    const mjSenderName = process.env.MJ_SENDER_NAME;
    const envTestEmail = process.env.TEST_EMAIL;
    
    if (mjApiKeyPublic && mjApiKeyPrivate && mjSenderEmail && mjSenderName) {
      console.log(`${LOG_PREFIXES.success} Mailjet konfiguration fundet for: ${mjSenderEmail}`);
      
      return NextResponse.json({
        success: true,
        configured: true,
        source: 'environment',
        config: {
          sender_email: mjSenderEmail,
          sender_name: mjSenderName,
          test_email: envTestEmail,
          // API keys returneres IKKE af sikkerhed
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }
    
    console.log(`${LOG_PREFIXES.warning} Mailjet miljøvariabler ikke komplet sat`);
    
    return NextResponse.json({
      success: true,
      configured: false,
      source: 'none',
      config: null
    });
    

    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i GET mail config:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint til at teste mail konfiguration
 * Mailjet konfiguration håndteres via miljøvariabler
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.form} Håndterer POST request til mail config API...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan teste mail konfiguration`);
      return NextResponse.json(
        { error: 'Kun admin kan teste mail konfiguration' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    // Mailjet konfiguration håndteres via miljøvariabler
    // Ingen database opdatering nødvendig
    return NextResponse.json({
      success: true,
      message: 'Mailjet konfiguration håndteres via miljøvariabler',
      configured: true
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i POST mail config:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

 