/**
 * RIO Upload API Endpoint
 * Håndterer upload af Excel-filer med chaufførdata
 * Konverterer Excel-data til Supabase database
 */

import { NextRequest, NextResponse } from 'next/server'; // Next.js request/response typer
import { supabase } from '../../../../libs/db'; // Vores Supabase klient
import * as XLSX from 'xlsx'; // Excel parsing bibliotek

export async function POST(request: NextRequest) {
  console.log('📤 RIO Upload API kaldt...');
  
  try {
    // Tjek bruger session direkte med Supabase klient
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Ingen gyldig session for upload');
      return NextResponse.json({
        success: false,
        message: 'Ingen gyldig session',
        error: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    console.log('✅ Session fundet for upload:', session.user?.email);
    
    // Tjek admin status
    const { isAdmin } = await import('../../../../libs/admin');
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      console.error('❌ Bruger er ikke admin');
      return NextResponse.json({
        success: false,
        message: 'Kun administratorer kan uploade data',
        error: 'FORBIDDEN'
      }, { status: 403 });
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const month = parseInt(formData.get('month') as string);
    const year = parseInt(formData.get('year') as string);
    
    console.log('📊 Modtaget data:', {
      fileName: file?.name,
      fileSize: file?.size,
      month,
      year
    });
    
    // Valider input
    if (!file) {
      console.error('❌ Ingen fil modtaget');
      return NextResponse.json({
        success: false,
        message: 'Ingen fil modtaget',
        error: 'NO_FILE'
      }, { status: 400 });
    }
    
    if (!month || !year) {
      console.error('❌ Manglende måned eller år');
      return NextResponse.json({
        success: false,
        message: 'Manglende måned eller år',
        error: 'INVALID_PERIOD'
      }, { status: 400 });
    }
    
    // Tjek filtype
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (!validTypes.includes(file.type)) {
      console.error('❌ Ugyldig filtype:', file.type);
      return NextResponse.json({
        success: false,
        message: 'Kun Excel-filer (.xlsx, .xls) er tilladt',
        error: 'INVALID_FILE_TYPE'
      }, { status: 400 });
    }
    
    // Konverter fil til buffer
    const buffer = await file.arrayBuffer();
    console.log('📄 Fil konverteret til buffer, størrelse:', buffer.byteLength);
    
    // Parse Excel fil
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Første sheet
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('📋 Excel fil parsed, sheet:', sheetName);
    
    // Konverter til JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('🔄 Excel konverteret til JSON, rækker:', jsonData.length);
    
    // Hent headers (første række)
    const headers = jsonData[0] as string[];
    console.log('📝 Headers fundet:', headers.length);
    
    // Valider headers
    const requiredHeaders = [
      'Chauffør', 'Køretøjer', 'Forudseende kørsel (vurdering) [%]',
      'Forudseende kørsel uden kørehastighedsregulering [%]', 'Fra', 'Til',
      'Ø Forbrug [l/100km]', 'Kørestrækning [km]', 'CO₂-emission [kg]'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      console.error('❌ Manglende headers:', missingHeaders);
      return NextResponse.json({
        success: false,
        message: `Manglende kolonner: ${missingHeaders.join(', ')}`,
        error: 'MISSING_HEADERS'
      }, { status: 400 });
    }
    
    // Map Excel kolonner til database felter
    const columnMapping: { [key: string]: string } = {
      'Chauffør': 'driver_name',
      'Køretøjer': 'vehicles',
      'Forudseende kørsel (vurdering) [%]': 'anticipatory_driving_assessment',
      'Forudseende kørsel uden kørehastighedsregulering [%]': 'anticipatory_driving_without_cruise',
      'Fra': 'from_date',
      'Til': 'to_date',
      'Ø Forbrug [l/100km]': 'avg_consumption_per_100km',
      'Ø Forbrug ved kørsel [l/100km]': 'avg_consumption_driving',
      'Ø Forbrug ved tomgang [l/t]': 'avg_consumption_idling',
      'Ø Rækkevidde ved forbrug [km/l]': 'avg_range_per_consumption',
      'Forbrug [l]': 'total_consumption',
      'Ø totalvægt [t]': 'avg_total_weight',
      'Kørestrækning [km]': 'driving_distance',
      'Effektivitet [l/t/100km]': 'efficiency_l_per_t_per_100km',
      'Motordriftstid [hh:mm:ss]': 'engine_runtime',
      'Køretid [hh:mm:ss]': 'driving_time',
      'Tomgang / stilstandstid [hh:mm:ss]': 'idle_standstill_time',
      'Ø-hastighed [km/h]': 'avg_speed',
      'CO₂-emission [kg]': 'co2_emission',
      'Vurdering af påløbsdrift [%]': 'coasting_assessment',
      'Aktiv påløbsdrift (km) [km]': 'active_coasting_km',
      'Varigheden af aktiv påløbsdrift [hh:mm:ss]': 'active_coasting_duration',
      'Aktivt skubbedrev (stk.)': 'active_pushing_count',
      'Afstand i påløbsdrift [km]': 'coasting_distance',
      'Varighed af påløbsdrift med kørehastighedsregulering [hh:mm:ss]': 'coasting_duration_with_cruise',
      'Antal faser i påløbsdrift': 'coasting_phases_count',
      'Gaspedal-vurdering [%]': 'accelerator_assessment',
      'Kickdown (km) [km]': 'kickdown_km',
      'Varighed af brugen af kickdown [hh:mm:ss]': 'kickdown_duration',
      'Kickdown (stk.)': 'kickdown_count',
      'Tilbagelagt afstand ved aktivering af gaspedal og tilkoblet kørehastighedsregulering [km]': 'accelerator_with_cruise_km',
      'Varigheden af aktivering af gaspedal og tilkoblet kørehastighedsregulering [hh:mm:ss]': 'accelerator_with_cruise_duration',
      'Antal aktiveringer af gaspedal ved kørehastighedsregulering': 'accelerator_activations_with_cruise',
      'Forbrug uden kørehastighedsregulering [l/100km]': 'consumption_without_cruise',
      'Forbrug med kørehastighedsregulering [l/100km]': 'consumption_with_cruise',
      'Vurdering af bremseadfærd [%]': 'brake_behavior_assessment',
      'Driftsbremse (km) [km]': 'service_brake_km',
      'Varighed driftsbremse [hh:mm:ss]': 'service_brake_duration',
      'Driftsbremse (stk.)': 'service_brake_count',
      'Afstand motorbremse [km]': 'engine_brake_distance',
      'Varighed af motorbremse [hh:mm:ss]': 'engine_brake_duration',
      'Motorbremse (tæller)': 'engine_brake_count',
      'Afstand retarder [km]': 'retarder_distance',
      'Varighed retarder [hh:mm:ss]': 'retarder_duration',
      'Retarder (stk.)': 'retarder_count',
      'Nødbremseassistent (tæller)': 'emergency_brake_assist_count',
      'Vurdering af brugen af kørehastighedsregulering [%]': 'cruise_control_assessment',
      'Afstand med kørehastighedsregulering (> 50 km/h) [km]': 'cruise_distance_over_50',
      'Varighed af kørehastighedsregulering (> 50 km/h) [hh:mm:ss]': 'cruise_duration_over_50',
      'Afstand > 50 km/h uden kørehastighedsregulering [km]': 'distance_over_50_without_cruise',
      'Varighed uden kørehastighedsregulering > 50 km/h [hh:mm:ss]': 'duration_over_50_without_cruise',
      'Gryde. afstand med fartpilot (> 50 km/h) [km]': 'avg_cruise_distance_over_50',
      'Vurdering overspeed': 'overspeed_assessment',
      'Overspeed (km uden påløbsdrift) [km]': 'overspeed_km_without_coasting',
      'Samlet anvendelse': 'total_usage',
      'Indsatsdage': 'duty_days',
      'Forbrug [kWh]': 'electric_consumption_kwh',
      'Ø Forbrug ved kørsel [kWh/km]': 'electric_avg_consumption_driving',
      'Gns. stilstandsforbrug [kWh/km]': 'electric_avg_standstill_consumption',
      'Ø Rækkevidde ved forbrug [km/kWh]': 'electric_avg_range',
      'Ø Forbrug [kWh/km]': 'electric_total_avg_consumption',
      'Energieffektivitet [kWh/t/km]': 'electric_energy_efficiency',
      'Elektrisk rekreation [kWh]': 'electric_recreation_kwh',
      'Elektrisk genvindingsvurdering [%]': 'electric_recovery_assessment',
      'Elektrisk fremsynet kørsel (vurdering) [%]': 'electric_anticipatory_driving',
      'Elektrisk gaspedals kapacitet [%]': 'electric_accelerator_capacity',
      'Brugsvurdering af elektrisk fartpilot [%]': 'electric_cruise_usage_assessment',
      'Elektrisk overhastighedsklassificering [%]': 'electric_overspeed_classification'
    };
    
    // Konverter data rækker til database format
    const recordsToInsert: Record<string, unknown>[] = [];
    
    // Disclaimer tekst der skal filtreres væk
    const disclaimerText = "Bemærk venligst, at en præstationsanalyse kun kan tage hensyn til delvise aspekter vedrørende driftsmåden (f.eks. friløb) og de påvirkningsfaktorer (f.eks. typen af indsættelse). Af denne grund er denne rapport kun en generel hjælp og bør aftales mellem chaufføren og køretræneren/flådechefen. Alvorligheden af brugen bestemt i Service MAN Perform og underklassificeringerne/den samlede vurdering er en MAN-specifik løsning og kan derfor ikke sammenlignes med ratings eller ydeevneindikatorer fra andre producenter.";
    
    /**
     * Validerer om en række indeholder gyldig chaufførdata
     */
    const isValidDriverRow = (row: unknown[], rowIndex: number): boolean => {
      // Tjek om rækken indeholder disclaimer tekst
      const rowContainsDisclaimer = row.some(cell => 
        typeof cell === 'string' && cell.includes(disclaimerText.substring(0, 50))
      );
      
      if (rowContainsDisclaimer) {
        console.log('🚫 Filtrerer væk række med disclaimer tekst (række', rowIndex + 1, ')');
        return false;
      }
      
      // Tjek om rækken indeholder for meget tekst (sandsynligvis ikke chaufførdata)
      const textCells = row.filter(cell => typeof cell === 'string' && cell.length > 100);
      if (textCells.length > 2) {
        console.log('🚫 Filtrerer væk række med for meget tekst (række', rowIndex + 1, ')');
        return false;
      }
      
      // Tjek om rækken har chaufførnavn i første kolonne
      const driverNameCell = row[0];
      if (!driverNameCell || typeof driverNameCell !== 'string' || driverNameCell.trim().length < 2) {
        console.log('🚫 Filtrerer væk række uden gyldigt chaufførnavn (række', rowIndex + 1, ')');
        return false;
      }
      
      // Tjek om chaufførnavnet ikke er en generisk tekst
      const invalidNames = ['chauffør', 'driver', 'navn', 'name', 'total', 'sum', 'gennemsnit', 'average'];
      const driverName = driverNameCell.toLowerCase().trim();
      if (invalidNames.some(invalid => driverName.includes(invalid))) {
        console.log('🚫 Filtrerer væk række med ugyldigt chaufførnavn:', driverNameCell, '(række', rowIndex + 1, ')');
        return false;
      }
      
      return true;
    };
    
    console.log('🔍 Starter konvertering af data rækker...');
    
    for (let i = 1; i < jsonData.length; i++) { // Start fra række 1 (skip headers)
      const row = jsonData[i] as unknown[];
      if (!row || row.length === 0) continue; // Skip tomme rækker
      
      // Valider om rækken indeholder gyldig chaufførdata
      if (!isValidDriverRow(row, i)) {
        continue; // Skip denne række
      }
      
      const record: Record<string, unknown> = {
        month,
        year
      };
      
      // Map hver kolonne til database felt
      headers.forEach((header, index) => {
        const dbField = columnMapping[header];
        if (dbField && row[index] !== undefined && row[index] !== null && row[index] !== '') {
          // Konverter værdier baseret på datatype
          let value = row[index];
          
          // Håndter numeriske værdier
          if (typeof value === 'string' && !isNaN(Number(value))) {
            value = Number(value);
          }
          
          // Kun tilføj værdi hvis den ikke er tom
          if (value !== '') {
            record[dbField] = value;
          }
        }
      });
      
      // Tilføj record hvis det har gyldig chaufførnavn
      if (record.driver_name && typeof record.driver_name === 'string' && record.driver_name.trim() !== '') {
        console.log('✅ Tilføjer chauffør record:', record.driver_name);
        recordsToInsert.push(record);
      }
    }
    
    console.log('📊 Konverteret data:', recordsToInsert.length, 'chauffører');
    
    if (recordsToInsert.length === 0) {
      console.error('❌ Ingen gyldige data fundet');
      return NextResponse.json({
        success: false,
        message: 'Ingen gyldige chaufførdata fundet i filen',
        error: 'NO_VALID_DATA'
      }, { status: 400 });
    }
    
    // Indsæt data i database
    console.log('💾 Indsætter data i database...');
    const { error } = await supabase
      .from('driver_data')
      .insert(recordsToInsert);
    
    if (error) {
      console.error('❌ Database fejl:', error);
      return NextResponse.json({
        success: false,
        message: 'Database fejl',
        error: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Data indsættet succesfuldt:', recordsToInsert.length, 'records');
    
    return NextResponse.json({
      success: true,
      message: `${recordsToInsert.length} chauffører behandlet for ${month}/${year}`,
      data: {
        recordsProcessed: recordsToInsert.length,
        month,
        year
      }
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl i upload API:', error);
    return NextResponse.json({
      success: false,
      message: 'Der opstod en uventet fejl under behandling af filen',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 