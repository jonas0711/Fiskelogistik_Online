/**
 * API Endpoint: /api/admin/mail-config
 * Admin endpoint til at administrere mail konfiguration
 * Håndterer SMTP indstillinger og test emails
 * Kun tilgængelig for admin brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/libs/db';
import { validateAdminToken } from '@/libs/admin';
import { getMailService } from '@/libs/mail-service';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Email validering regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET endpoint til at hente mail konfiguration
 * Returnerer SMTP indstillinger (uden password af sikkerhed)
 */
export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIXES.search} Håndterer GET request til mail config API...`);
  
  try {
    const mailjetConfigured = !!(process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE);

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
    
    // Først: Tjek om miljøvariabler er sat
    const envSmtpServer = process.env.SMTP_SERVER;
    const envSmtpPort = process.env.SMTP_PORT;
    const envEmail = process.env.EMAIL;
    const envPassword = process.env.APP_PASSWORD;
    const envTestEmail = process.env.TEST_EMAIL;
    
    if (envSmtpServer && envSmtpPort && envEmail && envPassword) {
      console.log(`${LOG_PREFIXES.success} Mail konfiguration hentet fra miljøvariabler for: ${envEmail}`);
      
      return NextResponse.json({
        success: true,
        configured: true,
        source: 'environment',
        mailjetConfigured,
        config: {
          smtp_server: envSmtpServer,
          smtp_port: parseInt(envSmtpPort, 10),
          email: envEmail,
          test_email: envTestEmail,
          // Password returneres IKKE af sikkerhed
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }
    
    console.log(`${LOG_PREFIXES.warning} Miljøvariabler ikke komplet sat - tjekker database...`);
    
    // Fallback: Hent mail konfiguration fra database
    const { data: mailConfig, error: configError } = await supabase
      .from('mail_config')
      .select('smtp_server, smtp_port, email, test_email, created_at, updated_at')
      .limit(1)
      .single();
    
    if (configError) {
      if (configError.code === 'PGRST116') { // No rows found
        console.log(`${LOG_PREFIXES.warning} Ingen mail konfiguration fundet i database eller miljøvariabler`);
        return NextResponse.json({
          success: true,
          configured: false,
          mailjetConfigured,
          message: 'Ingen mail konfiguration fundet'
        });
      }
      
      console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af mail config:`, configError);
      return NextResponse.json(
        { error: 'Kunne ikke hente mail konfiguration', mailjetConfigured },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Mail konfiguration hentet fra database for: ${mailConfig.email}`);
    
    return NextResponse.json({
      success: true,
      configured: true,
      source: 'database',
      mailjetConfigured,
      config: {
        smtp_server: mailConfig.smtp_server,
        smtp_port: mailConfig.smtp_port,
        email: mailConfig.email,
        test_email: mailConfig.test_email,
        // Password returneres IKKE af sikkerhed
        created_at: mailConfig.created_at,
        updated_at: mailConfig.updated_at
      }
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
 * POST endpoint til at oprette eller opdatere mail konfiguration
 * Body: { smtp_server, smtp_port, email, password, test_email? }
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.form} Håndterer POST request til mail config API...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan oprette mail konfiguration`);
      return NextResponse.json(
        { error: 'Kun admin kan oprette mail konfiguration' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    const mailjetConfigured = !!(process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE);
    if (mailjetConfigured) {
      return NextResponse.json(
        { error: 'Mailjet er konfigureret, SMTP-indstillinger kan ikke ændres.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { smtp_server, smtp_port, email, password, test_email } = body;
    
    console.log(`${LOG_PREFIXES.info} Opdaterer mail konfiguration for: ${email}`);
    
    // Validér påkrævede felter
    if (!smtp_server || typeof smtp_server !== 'string') {
      return NextResponse.json(
        { error: 'SMTP server påkrævet' },
        { status: 400 }
      );
    }
    
    if (!smtp_port || typeof smtp_port !== 'number' || smtp_port <= 0) {
      return NextResponse.json(
        { error: 'Gyldig SMTP port påkrævet' },
        { status: 400 }
      );
    }
    
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Gyldig email adresse påkrævet' },
        { status: 400 }
      );
    }
    
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password påkrævet (minimum 8 karakterer)' },
        { status: 400 }
      );
    }
    
    // Validér test email hvis angivet
    if (test_email && (!EMAIL_REGEX.test(test_email))) {
      return NextResponse.json(
        { error: 'Ugyldig test email format' },
        { status: 400 }
      );
    }
    
    // Validér almindelige SMTP porte
    const validPorts = [25, 465, 587, 993, 995];
    if (!validPorts.includes(smtp_port)) {
      console.log(`${LOG_PREFIXES.warning} Usædvanlig SMTP port: ${smtp_port}`);
    }
    
    // Upsert mail konfiguration i database (bruger admin klient for at bypasse RLS)
    const configData: Partial<MailConfig> = {
      smtp_server: smtp_server.trim(),
      smtp_port,
      email: email.trim(),
      password, // Gemmes i plaintext - i production bør dette krypteres
      test_email: test_email?.trim() || null,
    };
    
    const { data, error } = await supabaseAdmin
      .from('mail_config')
      .upsert(configData, {
        onConflict: 'id' // Brug unique constraint til at sikre kun én record
      })
      .select('id, smtp_server, smtp_port, email, test_email, created_at, updated_at');
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Database fejl ved opdatering af mail config:`, error);
      return NextResponse.json(
        { error: 'Kunne ikke gemme mail konfiguration' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Mail konfiguration opdateret succesfuldt for: ${email}`);
    
    return NextResponse.json({
      success: true,
      message: 'Mail konfiguration gemt succesfuldt',
      config: data?.[0] // Returnér uden password
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i POST mail config:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint til at teste mail konfiguration
 * Sender test mail til configured test_email
 */
export async function PUT(request: NextRequest) {
  console.log(`${LOG_PREFIXES.test} Håndterer PUT request til test mail config...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan teste mail`);
      return NextResponse.json(
        { error: 'Kun admin kan teste mail' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email} - starter mail test`);
    
    // Hent mail service og test konfiguration
    const mailService = getMailService();
    const testSuccess = await mailService.sendTestMail();
    
    if (testSuccess) {
      console.log(`${LOG_PREFIXES.success} Mail test succesfuldt`);
      return NextResponse.json({
        success: true,
        message: 'Test mail sendt succesfuldt'
      });
    } else {
      console.error(`${LOG_PREFIXES.error} Mail test fejlede`);
      return NextResponse.json({
        success: false,
        message: 'Test mail fejlede - tjek konfiguration og logs'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i mail test:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl under mail test' },
      { status: 500 }
    );
  }
} 