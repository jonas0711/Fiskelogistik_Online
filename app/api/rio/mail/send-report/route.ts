/**
 * API Endpoint: /api/rio/mail/send-report
 * Sender rapport emails til chauffører
 * Håndterer både individuelle og bulk mail sending
 * Baseret på Python-applikationens mail sending funktionalitet
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/libs/db';
import { getMailService, ReportEmailData } from '@/libs/mail-service';
import { PDFReportGenerator } from '@/libs/pdf-report-generator';
import { 
  DriverData, 
  calculateMetrics, 
  calculateOverallRanking,
  filterQualifiedDrivers 
} from '@/libs/report-utils';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for send report request
interface SendReportRequest {
  mode: 'individual' | 'bulk';              // Sending mode
  driverIds: string[];                      // Liste af chauffør navne
  month: number;                            // Måned for rapport
  year: number;                             // År for rapport
  minKm?: number;                           // Minimum kilometer filter
  testMode?: boolean;                       // Send til test email i stedet
}

// Interface for response
interface SendReportResponse {
  success: boolean;
  message: string;
  results?: {
    sent: number;
    failed: number;
    details: Array<{
      driverId: string;
      email: string;
      status: 'sent' | 'failed';
      error?: string;
    }>;
  };
}

/**
 * POST endpoint til at sende rapport emails
 * Body: { mode, driverIds, month, year, minKm?, testMode? }
 */
export async function POST(request: NextRequest): Promise<NextResponse<SendReportResponse>> {
  console.log(`${LOG_PREFIXES.form} Håndterer POST request til send rapport mail API...`);
  
  try {
    // Tjek autentificering via Authorization header (alle autentificerede brugere kan sende mails)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`${LOG_PREFIXES.error} Manglende eller ugyldig Authorization header`);
      return NextResponse.json(
        { 
          success: false,
          message: 'Du skal være logget ind for at sende mails' 
        },
        { status: 401 }
      );
    }
    
    // Valider token og få bruger info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error(`${LOG_PREFIXES.error} Ugyldig token:`, error?.message);
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig session - log venligst ind igen' 
        },
        { status: 401 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Bruger verificeret: ${user.email}`);
    
    // Parse request body
    const body: SendReportRequest = await request.json();
    const { mode, driverIds, month, year, minKm = 100, testMode = false } = body;
    
    console.log(`${LOG_PREFIXES.info} Sender rapport mails - Mode: ${mode}, Chauffører: ${driverIds.length}, Period: ${month}/${year}`);
    
    // Validér input
    if (!mode || !['individual', 'bulk'].includes(mode)) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig sending mode - skal være "individual" eller "bulk"' 
        },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(driverIds) || driverIds.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Mindst én chauffør skal vælges' 
        },
        { status: 400 }
      );
    }
    
    if (!month || !year || month < 1 || month > 12 || year < 2020 || year > 2030) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig måned eller år' 
        },
        { status: 400 }
      );
    }
    
    // Hent mail service
    const mailService = getMailService();
    
    // Hent chaufførdata for den valgte periode
    console.log(`${LOG_PREFIXES.search} Henter chaufførdata for ${month}/${year}...`);
    
    // Hent ALLE chaufførdata for perioden (ikke kun den enkeltes chauffør)
    const { data: allDriversData, error: dataError } = await supabaseAdmin
      .from('driver_data')
      .select(`
        id, driver_name, month, year, driving_distance, total_consumption,
        avg_consumption_per_100km, avg_range_per_consumption, avg_consumption_driving,
        avg_total_weight, active_coasting_km, coasting_distance, kickdown_km,
        cruise_distance_over_50, distance_over_50_without_cruise, consumption_with_cruise,
        consumption_without_cruise, service_brake_km, engine_brake_distance,
        overspeed_km_without_coasting, engine_runtime, driving_time, idle_standstill_time,
        electric_total_avg_consumption, electric_energy_efficiency, electric_recreation_kwh,
        electric_recovery_assessment, electric_anticipatory_driving, electric_accelerator_capacity,
        electric_cruise_usage_assessment, electric_overspeed_classification
      `)
      .eq('month', month)
      .eq('year', year);
    
    if (dataError) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af chaufførdata:`, dataError);
      return NextResponse.json({
        success: false,
        message: 'Kunne ikke hente chaufførdata',
        error: dataError.message
      }, { status: 500 });
    }
    
    if (!allDriversData || allDriversData.length === 0) {
      console.log(`${LOG_PREFIXES.warning} Ingen chaufførdata fundet for ${month}/${year}`);
      return NextResponse.json({
        success: false,
        message: `Ingen chaufførdata fundet for ${month}/${year}`,
        error: 'NO_DATA'
      }, { status: 404 });
    }
    
    console.log(`${LOG_PREFIXES.success} ${allDriversData.length} chaufførrecords hentet`);
    
    // Filtrer kvalificerede chauffører fra alle data
    const qualifiedDrivers = filterQualifiedDrivers(allDriversData as DriverData[], minKm);
    
    if (qualifiedDrivers.length === 0) {
      console.log(`${LOG_PREFIXES.warning} Ingen chauffører kvalificeret med minimum ${minKm} km`);
      return NextResponse.json({
        success: false,
        message: `Ingen chauffører kvalificeret med minimum ${minKm} km`,
        error: 'NO_QUALIFIED_DRIVERS'
      }, { status: 404 });
    }
    
    console.log(`${LOG_PREFIXES.success} ${qualifiedDrivers.length} chauffører kvalificeret for mail sending`);
    
    // Filtrer kun de chauffører der skal sendes mails til
    const driversToSendMails = mode === 'individual' 
      ? qualifiedDrivers.filter(d => driverIds.includes(d.driver_name))
      : qualifiedDrivers;
    
    // Hent tidligere data for chaufførerne til sammenligning
    console.log(`${LOG_PREFIXES.search} Henter tidligere data for chauffører til sammenligning...`);
    const previousDriversData: DriverData[] = [];
    
    // Funktion til at finde seneste data for en specifik chauffør
    const findLatestDriverData = async (driverName: string): Promise<DriverData | null> => {
      let searchMonth = month - 1;
      let searchYear = year;
      
      // Håndter år-overgang
      if (searchMonth === 0) {
        searchMonth = 12;
        searchYear--;
      }
      
      // Søg bagud i maksimalt 24 måneder (2 år)
      for (let attempts = 0; attempts < 24; attempts++) {
        console.log(`${LOG_PREFIXES.search} Søger efter ${driverName} i ${searchMonth}/${searchYear} (forsøg ${attempts + 1})`);
        
        const { data, error } = await supabaseAdmin
          .from('driver_data')
          .select('*')
          .eq('driver_name', driverName)
          .eq('month', searchMonth)
          .eq('year', searchYear)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`${LOG_PREFIXES.found} Fundet tidligere data for ${driverName} i ${searchMonth}/${searchYear}`);
          return data[0] as DriverData;
        }
        
        // Gå en måned tilbage
        searchMonth--;
        if (searchMonth === 0) {
          searchMonth = 12;
          searchYear--;
        }
        
        // Stop hvis vi går for langt tilbage i tid
        if (searchYear < 2020) {
          console.log(`${LOG_PREFIXES.limit} Stopper søgning for ${driverName} - nået 2020`);
          break;
        }
      }
      
      console.log(`${LOG_PREFIXES.newdriver} Ingen historiske data fundet for ${driverName} (sandsynligvis ny chauffør)`);
      return null;
    };
    
    // Find tidligere data for hver kvalificeret chauffør
    for (const driver of qualifiedDrivers) {
      const previousData = await findLatestDriverData(driver.driver_name);
      if (previousData) {
        previousDriversData.push(previousData);
      }
    }
    
    console.log(`${LOG_PREFIXES.success} Fundet tidligere data for ${previousDriversData.length}/${qualifiedDrivers.length} chauffører`);
    
    // Hent email adresser for chaufførerne
    console.log(`${LOG_PREFIXES.search} Henter email adresser for chauffører...`);
    
    const { data: emailData, error: emailError } = await supabaseAdmin
      .from('driver_emails')
      .select('driver_name, email')
      .in('driver_name', qualifiedDrivers.map(d => d.driver_name));
    
    if (emailError) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af email adresser:`, emailError);
      return NextResponse.json(
        { 
          success: false,
          message: 'Kunne ikke hente email adresser' 
        },
        { status: 500 }
      );
    }
    
    // Opret email mapping
    const emailMap = new Map<string, string>();
    emailData?.forEach(record => {
      emailMap.set(record.driver_name, record.email);
    });
    
    console.log(`${LOG_PREFIXES.info} ${emailMap.size} email adresser fundet`);
    
    // Beregn samlet rangering for kontekst
    const overallRanking = calculateOverallRanking(qualifiedDrivers);
    
    // Forbered måned navn
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    const periodText = `${monthNames[month - 1]} ${year}`;
    
    // Send emails til hver kvalificeret chauffør
    const results = {
      sent: 0,
      failed: 0,
      details: [] as Array<{
        driverId: string;
        email: string;
        status: 'sent' | 'failed';
        error?: string;
      }>
    };
    
    console.log(`${LOG_PREFIXES.form} Starter mail sending til ${driversToSendMails.length} chauffører...`);
    
    for (const driver of driversToSendMails) {
      try {
        console.log(`${LOG_PREFIXES.info} Behandler ${driver.driver_name}...`);
        
        // Tjek om chauffør har email adresse
        const driverEmail = emailMap.get(driver.driver_name);
        if (!driverEmail) {
          console.log(`${LOG_PREFIXES.warning} Ingen email fundet for ${driver.driver_name}`);
          results.failed++;
          results.details.push({
            driverId: driver.driver_name,
            email: '',
            status: 'failed',
            error: 'Ingen email adresse fundet'
          });
          continue;
        }
        
        // Beregn chauffør metrics - identisk med Python beregninger
        const metrics = calculateMetrics(driver);
        
                 // Opret rapport data struktur
         const reportData: ReportEmailData = {
           statistik: {
             name: driver.driver_name,
             date: periodText,
             total_distance: driver.driving_distance || 0,
             // Kritiske nøgletal - identisk med Python beregninger
             tomgangsprocent: metrics.Tomgangsprocent,
             fartpilot_andel: metrics['Fartpilot Andel'],
             motorbremse_andel: metrics['Motorbremse Andel'],
             paalobsdrift_andel: metrics['Påløbsdrift Andel']
           }
         };
        
        // Generer PDF rapport som vedhæftning
        console.log(`${LOG_PREFIXES.form} Genererer PDF rapport for ${driver.driver_name}...`);
        
        try {
          // Find tidligere data for denne specifikke chauffør
          const previousDriverData = previousDriversData.find(pd => pd.driver_name === driver.driver_name);
          
          console.log(`${LOG_PREFIXES.info} PDF generering for ${driver.driver_name}:`, {
            hasPreviousData: !!previousDriverData,
            previousMonth: previousDriverData?.month,
            previousYear: previousDriverData?.year,
            currentMonth: driver.month,
            currentYear: driver.year
          });
          
          const pdfGenerator = new PDFReportGenerator({
            reportType: 'individuel',
            month,
            year,
            selectedDriver: driver.driver_name,
            period: periodText,
            totalDrivers: qualifiedDrivers.length, // Alle chauffører for rangeringer
            drivers: qualifiedDrivers, // Alle chauffører for rangeringer
            previousDrivers: previousDriversData, // Alle tidligere data
            overallRanking,
            generatedAt: new Date().toISOString()
          });
          
          const pdfBuffer = await pdfGenerator.generateReport();
          reportData.rapport = pdfBuffer;
          
          console.log(`${LOG_PREFIXES.success} PDF genereret for ${driver.driver_name}: ${pdfBuffer.length} bytes`);
          
        } catch (pdfError) {
          console.error(`${LOG_PREFIXES.error} PDF generering fejlede for ${driver.driver_name}:`, pdfError);
          // Fortsæt uden PDF vedhæftning
        }
        
                 // Bestem modtager email (test mode eller normal)
         const recipientEmail = testMode ? undefined : driverEmail; // undefined = brug test_email fra config
        
        // Send rapport email
        console.log(`${LOG_PREFIXES.form} Sender rapport email til ${driverEmail} for ${driver.driver_name}...`);
        
        const sendSuccess = await mailService.sendReport(
          driver.driver_name,
          reportData,
          recipientEmail
        );
        
        if (sendSuccess) {
          console.log(`${LOG_PREFIXES.success} Rapport sendt succesfuldt til ${driver.driver_name} (${driverEmail})`);
          results.sent++;
          results.details.push({
            driverId: driver.driver_name,
            email: driverEmail,
            status: 'sent'
          });
        } else {
          console.error(`${LOG_PREFIXES.error} Rapport sending fejlede for ${driver.driver_name}`);
          results.failed++;
          results.details.push({
            driverId: driver.driver_name,
            email: driverEmail,
            status: 'failed',
            error: 'Mail sending fejlede'
          });
        }
        
        // Rate limiting - pause mellem mails for at undgå SMTP rate limits
        if (mode === 'bulk' && qualifiedDrivers.indexOf(driver) < qualifiedDrivers.length - 1) {
          console.log(`${LOG_PREFIXES.info} Venter 2 sekunder før næste mail (rate limiting)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl ved behandling af ${driver.driver_name}:`, error);
        results.failed++;
        results.details.push({
          driverId: driver.driver_name,
          email: emailMap.get(driver.driver_name) || '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Ukendt fejl'
        });
      }
    }
    
    console.log(`${LOG_PREFIXES.success} Mail sending afsluttet - Sent: ${results.sent}, Fejlede: ${results.failed}`);
    
    const successMessage = mode === 'individual' 
      ? `Rapport sendt til ${results.sent} chauffør${results.sent !== 1 ? 'er' : ''}`
      : `Bulk sending afsluttet - ${results.sent} sendt, ${results.failed} fejlede`;
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      results
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i send rapport mail API:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Intern server fejl under mail sending' 
      },
      { status: 500 }
    );
  }
} 