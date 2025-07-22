/**
 * API Endpoint: Generer RIO Rapporter
 * Baseret på Python-applikationens rapportgenereringslogik
 * Håndterer generering af samlet, gruppe og individuelle rapporter
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../libs/db';
import { LOG_PREFIXES } from '../../../../../components/ui/icons/icon-config';
import { 
  calculateMetrics, 
  calculateOverallRanking, 
  filterQualifiedDrivers,
  generateReportFilename,
  validateReportConfig,
  type DriverData,
  type ReportConfig
} from '../../../../../libs/report-utils';
import { WordReportGenerator } from '../../../../../libs/word-report-generator';
import { PDFReportGenerator } from '../../../../../libs/pdf-report-generator';

// Interface for API request
interface GenerateReportRequest {
  reportType: 'samlet' | 'gruppe' | 'individuel';
  minKm: number;
  month?: number;
  year?: number;
  selectedGroup?: string;
  selectedDriver?: string;
  format: 'word' | 'pdf';
}

// Interface for API response
interface GenerateReportResponse {
  success: boolean;
  message: string;
  data?: {
    filename: string;
    reportType: string;
    driverCount: number;
    period: string;
  };
  error?: string;
}

/**
 * Validerer authorization header og returnerer bruger hvis gyldig
 */
async function validateAuthHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Token validering fejlede:', error?.message);
      return null;
    }
    
    console.log('✅ Token valideret for bruger:', user.email);
    return user;
  } catch (error) {
    console.error('❌ Uventet fejl ved token validering:', error);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateReportResponse>> {
  console.log('📋 API: Modtager rapportgenereringsanmodning...');
  
  try {
    // Hent authorization header fra request
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    // Valider authorization header hvis tilgængelig
    let user = null;
    if (authHeader) {
      user = await validateAuthHeader(authHeader);
    }
    
    // Hvis ingen gyldig auth header, tjek session
    if (!user) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Ingen gyldig session for rapportgenerering');
        return NextResponse.json({
          success: false,
          message: 'Ingen gyldig session',
          error: 'UNAUTHORIZED'
        }, { status: 401 });
      }
      
      console.log('✅ Session fundet for rapportgenerering:', session.user?.email);
      user = session.user;
    }
    
    // Alle autentificerede brugere kan generere rapporter
    console.log('✅ Bruger godkendt til rapport generering:', user.email);
    
    // Parse request body
    const body: GenerateReportRequest = await request.json();
    console.log('📊 Rapport konfiguration modtaget:', body);
    
    // Valider konfiguration
    const config: ReportConfig = {
      minKm: body.minKm,
      reportType: body.reportType,
      selectedGroup: body.selectedGroup,
      selectedDriver: body.selectedDriver,
      month: body.month,
      year: body.year
    };
    
    const validation = validateReportConfig(config);
    if (!validation.isValid) {
      console.error('❌ Ugyldig rapport konfiguration:', validation.errors);
      return NextResponse.json({
        success: false,
        message: 'Ugyldig rapport konfiguration',
        error: validation.errors.join(', ')
      }, { status: 400 });
    }
    
    // Hent chaufførdata fra database - alle felter
    console.log('📊 Henter chaufførdata fra database...');
    let query = supabase
      .from('driver_data')
      .select(`
        id,
        month,
        year,
        created_at,
        updated_at,
        driver_name,
        vehicles,
        anticipatory_driving_assessment,
        anticipatory_driving_without_cruise,
        from_date,
        to_date,
        avg_consumption_per_100km,
        avg_consumption_driving,
        avg_consumption_idling,
        avg_range_per_consumption,
        total_consumption,
        avg_total_weight,
        driving_distance,
        efficiency_l_per_t_per_100km,
        engine_runtime,
        driving_time,
        idle_standstill_time,
        avg_speed,
        co2_emission,
        coasting_assessment,
        active_coasting_km,
        active_coasting_duration,
        active_pushing_count,
        coasting_distance,
        coasting_duration_with_cruise,
        coasting_phases_count,
        accelerator_assessment,
        kickdown_km,
        kickdown_duration,
        kickdown_count,
        accelerator_with_cruise_km,
        accelerator_with_cruise_duration,
        accelerator_activations_with_cruise,
        consumption_without_cruise,
        consumption_with_cruise,
        brake_behavior_assessment,
        service_brake_km,
        service_brake_duration,
        service_brake_count,
        engine_brake_distance,
        engine_brake_duration,
        engine_brake_count,
        retarder_distance,
        retarder_duration,
        retarder_count,
        emergency_brake_assist_count,
        cruise_control_assessment,
        cruise_distance_over_50,
        cruise_duration_over_50,
        distance_over_50_without_cruise,
        duration_over_50_without_cruise,
        avg_cruise_distance_over_50,
        overspeed_assessment,
        overspeed_km_without_coasting,
        total_usage,
        duty_days,
        electric_consumption_kwh,
        electric_avg_consumption_driving,
        electric_avg_standstill_consumption,
        electric_avg_range,
        electric_total_avg_consumption,
        electric_energy_efficiency,
        electric_recreation_kwh,
        electric_recovery_assessment,
        electric_anticipatory_driving,
        electric_accelerator_capacity,
        electric_cruise_usage_assessment,
        electric_overspeed_classification
      `);
    
    // Tilføj filtre baseret på konfiguration
    if (config.month && config.month > 0) {
      query = query.eq('month', config.month);
    }
    
    if (config.year && config.year > 0) {
      query = query.eq('year', config.year);
    }
    
    if (config.reportType === 'individuel' && config.selectedDriver) {
      query = query.eq('driver_name', config.selectedDriver);
    }
    
    const { data: driversData, error: dataError } = await query;
    
    if (dataError) {
      console.error('❌ Fejl ved hentning af chaufførdata:', dataError);
      return NextResponse.json({
        success: false,
        message: 'Kunne ikke hente chaufførdata',
        error: dataError.message
      }, { status: 500 });
    }
    
    if (!driversData || driversData.length === 0) {
      console.log('⚠️ Ingen chaufførdata fundet for de valgte kriterier');
      return NextResponse.json({
        success: false,
        message: 'Ingen chaufførdata fundet for de valgte kriterier',
        error: 'NO_DATA'
      }, { status: 404 });
    }
    
    console.log(`✅ ${driversData.length} chaufførrecords hentet`);
    
    // Filtrer kvalificerede chauffører
    const qualifiedDrivers = filterQualifiedDrivers(driversData as DriverData[], config.minKm);
    
    if (qualifiedDrivers.length === 0) {
      console.log('⚠️ Ingen chauffører kvalificeret med minimum kilometer krav');
      return NextResponse.json({
        success: false,
        message: `Ingen chauffører kvalificeret med minimum ${config.minKm} km`,
        error: 'NO_QUALIFIED_DRIVERS'
      }, { status: 404 });
    }
    
    console.log(`✅ ${qualifiedDrivers.length} chauffører kvalificeret`);
    
    // Find den seneste tilgængelige data for hver chauffør til sammenligning
    const previousDriversData: DriverData[] = [];
    if (config.month && config.year) {
      console.log('📊 Finder seneste tilgængelige data for hver chauffør til sammenligning...');
      
      // Funktion til at finde seneste data for en specifik chauffør
      const findLatestDriverData = async (driverName: string): Promise<DriverData | null> => {
        let searchMonth = config.month! - 1;
        let searchYear = config.year!;
        
        // Håndter år-overgang
        if (searchMonth === 0) {
          searchMonth = 12;
          searchYear--;
        }
        
        // Søg bagud i maksimalt 24 måneder (2 år)
        for (let attempts = 0; attempts < 24; attempts++) {
          console.log(`${LOG_PREFIXES.search} Søger efter ${driverName} i ${searchMonth}/${searchYear} (forsøg ${attempts + 1})`);
          
          const { data, error } = await supabase
            .from('driver_data')
            .select('*')
            .eq('driver_name', driverName)
            .eq('month', searchMonth)
            .eq('year', searchYear)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            console.log(`${LOG_PREFIXES.found} Fundet data for ${driverName} i ${searchMonth}/${searchYear}`);
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
      
      // Find seneste data for hver kvalificeret chauffør
      for (const driver of qualifiedDrivers) {
        const latestData = await findLatestDriverData(driver.driver_name);
        if (latestData) {
          previousDriversData.push(latestData);
        }
      }
      
      console.log(`✅ Fundet historiske data for ${previousDriversData.length}/${qualifiedDrivers.length} chauffører`);
    }
    
    // Generer rapport baseret på type
    let reportData: Record<string, unknown> = {};
    let filename = '';
    let period = '';
    
    // Bestem periode
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    
    if (config.month && config.year) {
      const monthName = monthNames[config.month - 1] || 'Ukendt';
      period = `${monthName} ${config.year}`;
    } else if (config.year) {
      period = `År ${config.year}`;
    } else {
      period = 'Alle perioder';
    }
    
    switch (config.reportType) {
      case 'samlet':
        console.log('📊 Genererer samlet rapport...');
        
        // Beregn samlet rangering
        const overallRanking = calculateOverallRanking(qualifiedDrivers);
        
        // Beregn statistikker for hver chauffør
        const driversWithMetrics = qualifiedDrivers.map((driver: DriverData) => ({
          ...driver,
          metrics: calculateMetrics(driver)
        }));
        
        reportData = {
          type: 'samlet',
          period,
          totalDrivers: qualifiedDrivers.length,
          overallRanking,
          drivers: driversWithMetrics,
          generatedAt: new Date().toISOString()
        };
        
        filename = generateReportFilename('samlet', config.month || 1, config.year || new Date().getFullYear());
        break;
        
      case 'gruppe':
        console.log('📊 Genererer gruppe rapport...');
        
        if (!config.selectedGroup) {
          return NextResponse.json({
            success: false,
            message: 'Gruppe skal vælges for gruppe rapport',
            error: 'MISSING_GROUP'
          }, { status: 400 });
        }
        
        // For nu bruger vi alle kvalificerede chauffører som gruppe
        // I en rigtig implementering ville vi hente gruppemedlemmer fra database
        const groupRanking = calculateOverallRanking(qualifiedDrivers);
        const groupDriversWithMetrics = qualifiedDrivers.map((driver: DriverData) => ({
          ...driver,
          metrics: calculateMetrics(driver)
        }));
        
        reportData = {
          type: 'gruppe',
          groupName: config.selectedGroup,
          period,
          totalDrivers: qualifiedDrivers.length,
          overallRanking: groupRanking,
          drivers: groupDriversWithMetrics,
          generatedAt: new Date().toISOString()
        };
        
        filename = generateReportFilename('gruppe', config.month || 1, config.year || new Date().getFullYear());
        break;
        
      case 'individuel':
        console.log('📊 Genererer individuel rapport...');
        
        if (!config.selectedDriver) {
          return NextResponse.json({
            success: false,
            message: 'Chauffør skal vælges for individuel rapport',
            error: 'MISSING_DRIVER'
          }, { status: 400 });
        }
        
        // Find den specifikke chauffør
        const selectedDriverData = qualifiedDrivers.find((d: DriverData) => d.driver_name === config.selectedDriver);
        
        if (!selectedDriverData) {
          return NextResponse.json({
            success: false,
            message: `Chauffør "${config.selectedDriver}" ikke fundet eller ikke kvalificeret`,
            error: 'DRIVER_NOT_FOUND'
          }, { status: 404 });
        }
        
        // Beregn rangering med alle kvalificerede chauffører for sammenligning
        const individualRanking = calculateOverallRanking(qualifiedDrivers);
        const driverMetrics = calculateMetrics(selectedDriverData);
        
        reportData = {
          type: 'individuel',
          driver: selectedDriverData,
          metrics: driverMetrics,
          period,
          totalDrivers: qualifiedDrivers.length,
          overallRanking: individualRanking,
          generatedAt: new Date().toISOString()
        };
        
        filename = generateReportFilename('individuel', config.month || 1, config.year || new Date().getFullYear(), config.selectedDriver);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Ugyldig rapport type',
          error: 'INVALID_REPORT_TYPE'
        }, { status: 400 });
    }
    
    // Beregn samlet rangering for Word rapport
    const overallRanking = calculateOverallRanking(qualifiedDrivers);
    
    // Generer Word eller PDF fil til download - identisk med Python fil generering
    if (body.format === 'word' || body.format === 'pdf') {
      console.log(`📄 Genererer ${body.format.toUpperCase()} dokument til download...`);
      
      try {
        if (body.format === 'word') {
          // Opret Word rapport generator - identisk med Python WordReportGenerator
          const wordGenerator = new WordReportGenerator({
            reportType: config.reportType,
            month: config.month,
            year: config.year,
            selectedGroup: config.selectedGroup,
            selectedDriver: config.selectedDriver,
            period,
            totalDrivers: qualifiedDrivers.length,
            drivers: qualifiedDrivers,
            previousDrivers: previousDriversData,
            overallRanking,
            generatedAt: new Date().toISOString()
          });
          
          // Generer Word dokument buffer
          const wordBuffer = await wordGenerator.generateReport();
          const wordFilename = wordGenerator.generateFilename();
          
          console.log('✅ Word dokument genereret succesfuldt:', wordFilename, `${wordBuffer.length} bytes`);
          
          // Returner Word fil som download - optimeret til online platform
          return new NextResponse(wordBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(wordFilename)}"`,
              'Content-Length': wordBuffer.length.toString(),
              'Cache-Control': 'no-cache',
              'Access-Control-Expose-Headers': 'Content-Disposition'
            }
          });
          
        } else if (body.format === 'pdf') {
          // Opret PDF rapport generator - identisk med Python PDFReportGenerator
          const pdfGenerator = new PDFReportGenerator({
            reportType: config.reportType,
            month: config.month,
            year: config.year,
            selectedGroup: config.selectedGroup,
            selectedDriver: config.selectedDriver,
            period,
            totalDrivers: qualifiedDrivers.length,
            drivers: qualifiedDrivers,
            previousDrivers: previousDriversData,
            overallRanking,
            generatedAt: new Date().toISOString()
          });
          
          // Generer PDF dokument buffer
          const pdfBuffer = await pdfGenerator.generateReport();
          const pdfFilename = pdfGenerator.generateFilename();
          
          console.log('✅ PDF dokument genereret succesfuldt:', pdfFilename, `${pdfBuffer.length} bytes`);
          
          // Returner PDF fil som download - optimeret til online platform
          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(pdfFilename)}"`,
              'Content-Length': pdfBuffer.length.toString(),
              'Cache-Control': 'no-cache',
              'Access-Control-Expose-Headers': 'Content-Disposition'
            }
          });
        }
        
      } catch (error) {
        console.error(`❌ Fejl ved ${body.format.toUpperCase()} dokument generering:`, error);
        return NextResponse.json({
          success: false,
          message: `Kunne ikke generere ${body.format.toUpperCase()} dokument`,
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
        }, { status: 500 });
      }
    }
    
    // For nu returnerer vi rapportdata som JSON (for PDF og preview)
    console.log('✅ Rapportdata genereret succesfuldt');
    
    return NextResponse.json({
      success: true,
      message: `${config.reportType} rapport genereret succesfuldt`,
      data: {
        filename,
        reportType: config.reportType,
        driverCount: qualifiedDrivers.length,
        period,
        reportData // Inkluderer alle rapportdata for frontend
      }
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl under rapportgenerering:', error);
    return NextResponse.json({
      success: false,
      message: 'Der opstod en uventet fejl under rapportgenerering',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

/**
 * GET endpoint til at hente tilgængelige rapport muligheder
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📋 API: Henter tilgængelige rapport muligheder...');
  
  try {
    // Hent authorization header fra request
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    // Valider authorization header hvis tilgængelig
    let user = null;
    if (authHeader) {
      user = await validateAuthHeader(authHeader);
    }
    
    // Hvis ingen gyldig auth header, tjek session
    if (!user) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Ingen gyldig session for rapport muligheder');
        return NextResponse.json({
          success: false,
          message: 'Ingen gyldig session',
          error: 'UNAUTHORIZED'
        }, { status: 401 });
      }
      
      console.log('✅ Session fundet for rapport muligheder:', session.user?.email);
      user = session.user;
    }
    
    // Alle autentificerede brugere kan se rapport muligheder
    console.log('✅ Bruger godkendt til at se rapport muligheder:', user.email);
    
    // Hent unikke måneder og år fra database
    const { data: monthYearData, error: dataError } = await supabase
      .from('driver_data')
      .select('month, year')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (dataError) {
      console.error('❌ Fejl ved hentning af måned/år data:', dataError);
      return NextResponse.json({
        success: false,
        message: 'Kunne ikke hente tilgængelige perioder',
        error: dataError.message
      }, { status: 500 });
    }
    
    // Hent unikke chaufførnavne
    const { data: driverNames, error: driverError } = await supabase
      .from('driver_data')
      .select('driver_name')
      .order('driver_name');
    
    if (driverError) {
      console.error('❌ Fejl ved hentning af chaufførnavne:', driverError);
      return NextResponse.json({
        success: false,
        message: 'Kunne ikke hente chaufførnavne',
        error: driverError.message
      }, { status: 500 });
    }
    
    // Behandl data
    const uniquePeriods = monthYearData ? 
      Array.from(new Set(monthYearData.map((item: { year: number; month: number }) => `${item.year}-${item.month}`)))
        .map((period: string) => {
          const [year, month] = period.split('-');
          return { year: parseInt(year), month: parseInt(month) };
        })
        .sort((a, b) => b.year - a.year || b.month - a.month) : [];
    
    const uniqueDrivers = driverNames ? 
      Array.from(new Set(driverNames.map((item: { driver_name: string }) => item.driver_name)))
        .filter((name: string) => name && name.trim() !== '')
        .sort() : [];
    
    console.log('✅ Rapport muligheder hentet:', {
      periods: uniquePeriods.length,
      drivers: uniqueDrivers.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        periods: uniquePeriods,
        drivers: uniqueDrivers,
        reportTypes: [
          { value: 'samlet', label: 'Samlet Rapport', description: 'Generer samlet rapport over alle kvalificerede chauffører' },
          { value: 'gruppe', label: 'Gruppe Rapport', description: 'Generer rapport for specifik chauffør gruppe' },
          { value: 'individuel', label: 'Individuel Rapport', description: 'Generer rapport for enkelt chauffør' }
        ],
        formats: [
          { value: 'word', label: 'Word Dokument (.docx)' },
          { value: 'pdf', label: 'PDF Dokument (.pdf)' }
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl ved hentning af rapport muligheder:', error);
    return NextResponse.json({
      success: false,
      message: 'Der opstod en uventet fejl',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 