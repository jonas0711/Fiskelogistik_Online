/**
 * API Endpoint: /api/rio/drivers/emails
 * Håndterer email administration for chauffører
 * Inkluderer hentning, opdatering og validering af chauffør email adresser
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/libs/db';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Email validering regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET endpoint til at hente chauffør emails
 * Returnerer alle chauffører med deres email status
 */
export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIXES.list} Håndterer GET request til driver emails API...`);
  
  try {
    // Tjek authentication via Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback til cookie-baseret auth for browser requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    } else {
      // Validér Bearer token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error(`${LOG_PREFIXES.error} Ugyldig token:`, userError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    }
    
    // Hent alle unikke chauffører fra driver_data
    console.log(`${LOG_PREFIXES.search} Henter unikke chauffører fra driver_data...`);
    
    const { data: driversData, error: driversError } = await supabase
      .from('driver_data')
      .select('driver_name')
      .not('driver_name', 'ilike', 'Bemærk venligst%')
      .order('driver_name');
    
    if (driversError) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af chauffører:`, driversError);
      return NextResponse.json(
        { error: 'Kunne ikke hente chauffører' },
        { status: 500 }
      );
    }
    
    // Få unikke chauffør navne
    const uniqueDrivers = [...new Set(driversData?.map((d: any) => String(d.driver_name).trim()) || [])] as string[];
    console.log(`${LOG_PREFIXES.info} Fandt ${uniqueDrivers.length} unikke chauffører`);
    
    // Hent eksisterende emails fra driver_emails tabel (bruger admin klient for at bypasse RLS)
    console.log(`${LOG_PREFIXES.search} Henter eksisterende emails...`);
    
    const { data: emailsData, error: emailsError } = await supabaseAdmin
      .from('driver_emails')
      .select('*')
      .order('driver_name');
    
    if (emailsError) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af emails:`, emailsError);
      return NextResponse.json(
        { error: 'Kunne ikke hente emails' },
        { status: 500 }
      );
    }
    
    // Opret email mapping
    const emailMap = new Map();
    emailsData?.forEach(record => {
      emailMap.set(record.driver_name.trim(), {
        email: record.email,
        lastReportSent: record.last_report_sent,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      });
    });
    
    console.log(`${LOG_PREFIXES.info} Email mapping oprettet:`, {
      totalEmailsInTable: emailsData?.length || 0,
      emailMapSize: emailMap.size,
      sampleEmails: Array.from(emailMap.entries()).slice(0, 3)
    });
    
    // Type definition for driver with email
    interface DriverWithEmail {
      name: string;
      email: string;
      hasEmail: boolean;
      isValidEmail: boolean;
      lastReportSent: string | null;
      createdAt: string | null;
      updatedAt: string | null;
      isOrphaned?: boolean;
    }
    
    // Kombiner chauffører med email status
    const driversWithEmails: DriverWithEmail[] = uniqueDrivers.map(driverName => {
      const emailInfo = emailMap.get(driverName);
      const result = {
        name: driverName,
        email: emailInfo?.email || '',
        hasEmail: !!emailInfo?.email,
        isValidEmail: emailInfo?.email ? EMAIL_REGEX.test(emailInfo.email) : false,
        lastReportSent: emailInfo?.lastReportSent || null,
        createdAt: emailInfo?.createdAt || null,
        updatedAt: emailInfo?.updatedAt || null
      };
      
      // Log første par chauffører for debugging
      if (uniqueDrivers.indexOf(driverName) < 3) {
        console.log(`${LOG_PREFIXES.info} Chauffør mapping:`, {
          driverName,
          emailFound: !!emailInfo,
          email: emailInfo?.email || 'TOM',
          resultEmail: result.email
        });
      }
      
      return result;
    });
    
    // Tilføj eventuelle emails der ikke har matchende chauffører (orphaned emails)
    emailsData?.forEach(record => {
      const driverName = record.driver_name.trim();
      if (!uniqueDrivers.includes(driverName)) {
        console.log(`${LOG_PREFIXES.warning} Orphaned email fundet for: ${driverName}`);
        driversWithEmails.push({
          name: driverName,
          email: record.email,
          hasEmail: true,
          isValidEmail: EMAIL_REGEX.test(record.email),
          lastReportSent: record.last_report_sent,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
          isOrphaned: true
        });
      }
    });
    
    // Sortér alfabetisk
    driversWithEmails.sort((a, b) => a.name.localeCompare(b.name, 'da-DK'));
    
    console.log(`${LOG_PREFIXES.success} Returnerer ${driversWithEmails.length} chauffører med email status`);
    
    // Log sample data for debugging
    const sampleDrivers = driversWithEmails.slice(0, 3);
    console.log(`${LOG_PREFIXES.info} Sample chauffører:`, sampleDrivers);
    
    const response = {
      drivers: driversWithEmails,
      total: driversWithEmails.length,
      summary: {
        withEmails: driversWithEmails.filter(d => d.hasEmail).length,
        validEmails: driversWithEmails.filter(d => d.isValidEmail).length,
        orphanedEmails: driversWithEmails.filter(d => d.isOrphaned).length
      }
    };
    
    console.log(`${LOG_PREFIXES.info} Response summary:`, response.summary);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i driver emails API:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint til at oprette eller opdatere chauffør emails
 * Body: { driverName: string, email: string }
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.form} Håndterer POST request til driver emails API...`);
  
  try {
    // Tjek authentication via Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback til cookie-baseret auth for browser requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    } else {
      // Validér Bearer token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error(`${LOG_PREFIXES.error} Ugyldig token:`, userError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    }
    
    const body = await request.json();
    const { driverName, email } = body;
    
    console.log(`${LOG_PREFIXES.info} Opdaterer email for chauffør: ${driverName}`);
    
    // Validér input
    if (!driverName || typeof driverName !== 'string') {
      return NextResponse.json(
        { error: 'Ugyldigt chaufførnavn' },
        { status: 400 }
      );
    }
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email adresse påkrævet' },
        { status: 400 }
      );
    }
    
    // Validér email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Ugyldig email format' },
        { status: 400 }
      );
    }
    
    // Opdater eller indsæt email i database (bruger admin klient for at bypasse RLS)
    const { data, error } = await supabaseAdmin
      .from('driver_emails')
      .upsert({
        driver_name: driverName.trim(),
        email: email.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'driver_name'
      })
      .select();
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Database fejl ved opdatering af email:`, error);
      return NextResponse.json(
        { error: 'Kunne ikke gemme email' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Email opdateret succesfuldt for: ${driverName}`);
    
    return NextResponse.json({
      success: true,
      driver: driverName,
      email: email.trim(),
      data: data?.[0]
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i POST driver emails:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint til batch opdatering af multiple emails
 * Body: { emails: Array<{ driverName: string, email: string }> }
 */
export async function PUT(request: NextRequest) {
  console.log(`${LOG_PREFIXES.form} Håndterer PUT request til batch email opdatering...`);
  
  try {
    // Tjek authentication via Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback til cookie-baseret auth for browser requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    } else {
      // Validér Bearer token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error(`${LOG_PREFIXES.error} Ugyldig token:`, userError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    }
    
    const body = await request.json();
    const { emails } = body;
    
    if (!Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Emails skal være et array' },
        { status: 400 }
      );
    }
    
    console.log(`${LOG_PREFIXES.info} Batch opdatering af ${emails.length} emails...`);
    
    // Validér alle emails først
    const validationErrors: string[] = [];
    const validEmails: Array<{ driver_name: string; email: string; updated_at: string }> = [];
    
    emails.forEach((emailData, index) => {
      const { driverName, email } = emailData;
      
      if (!driverName || typeof driverName !== 'string') {
        validationErrors.push(`Index ${index}: Ugyldigt chaufførnavn`);
        return;
      }
      
      if (!email || typeof email !== 'string') {
        // Tillad tom email for at slette
        if (email === '') {
          return; // Skip denne record - vi håndterer sletning separat
        }
        validationErrors.push(`Index ${index}: Email påkrævet`);
        return;
      }
      
      if (!EMAIL_REGEX.test(email.trim())) {
        validationErrors.push(`Index ${index}: Ugyldig email format for ${driverName}`);
        return;
      }
      
      validEmails.push({
        driver_name: driverName.trim(),
        email: email.trim(),
        updated_at: new Date().toISOString()
      });
    });
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validering fejlede',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    // Udfør batch opdatering (bruger admin klient for at bypasse RLS)
    if (validEmails.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('driver_emails')
        .upsert(validEmails, {
          onConflict: 'driver_name'
        })
        .select();
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Database fejl ved batch opdatering:`, error);
        return NextResponse.json(
          { error: 'Kunne ikke gemme emails' },
          { status: 500 }
        );
      }
      
      console.log(`${LOG_PREFIXES.success} Batch opdatering succesfuld for ${validEmails.length} emails`);
      
      return NextResponse.json({
        success: true,
        updated: validEmails.length,
        data: data
      });
    }
    
    return NextResponse.json({
      success: true,
      updated: 0,
      message: 'Ingen emails at opdatere'
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i PUT driver emails:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint til at slette en chauffør email
 * Query parameter: driver (chaufførnavn)
 */
export async function DELETE(request: NextRequest) {
  console.log(`${LOG_PREFIXES.delete} Håndterer DELETE request til driver emails API...`);
  
  try {
    // Tjek authentication via Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback til cookie-baseret auth for browser requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    } else {
      // Validér Bearer token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error(`${LOG_PREFIXES.error} Ugyldig token:`, userError?.message);
        return NextResponse.json(
          { error: 'Ikke autoriseret' },
          { status: 401 }
        );
      }
    }
    
    const { searchParams } = new URL(request.url);
    const driverName = searchParams.get('driver');
    
    if (!driverName) {
      return NextResponse.json(
        { error: 'Chaufførnavn påkrævet' },
        { status: 400 }
      );
    }
    
    console.log(`${LOG_PREFIXES.info} Sletter email for chauffør: ${driverName}`);
    
    // Slet email fra database (bruger admin klient for konsistens)
    const { error } = await supabaseAdmin
      .from('driver_emails')
      .delete()
      .eq('driver_name', driverName.trim());
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Database fejl ved sletning af email:`, error);
      return NextResponse.json(
        { error: 'Kunne ikke slette email' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Email slettet succesfuldt for: ${driverName}`);
    
    return NextResponse.json({
      success: true,
      driver: driverName,
      message: 'Email slettet'
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i DELETE driver emails:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
} 