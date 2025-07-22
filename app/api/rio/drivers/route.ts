/**
 * API Endpoint: /api/rio/drivers
 * Håndterer alle chauffør-relaterede operationer for RIO systemet
 * Inkluderer hentning af unikke chauffører, filtrering og detaljeret data
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/libs/db';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET endpoint til at hente chauffør data
 * Query parametre:
 * - type: "unique" for unikke chauffører, "details" for specifik chauffør
 * - driver: chaufførnavn for detaljeret visning
 * - min_km: minimum kilometer grænse (standard 100)
 * - month: specifik måned filter
 * - year: specifikt år filter
 */
export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIXES.list} Håndterer GET request til drivers API...`);
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const driverName = searchParams.get('driver');
    const minKm = parseInt(searchParams.get('min_km') || '100');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    console.log(`${LOG_PREFIXES.info} Request parametre:`, { type, driverName, minKm, month, year });
    
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
    
    if (type === 'unique') {
      // Hent unikke chauffører med minimum kilometer filtrering
      console.log(`${LOG_PREFIXES.search} Henter unikke chauffører med min_km: ${minKm}...`);
      
      let query = supabase
        .from('driver_data')
        .select('driver_name, month, year, driving_distance, avg_consumption_per_100km, co2_emission, vehicles')
        .gte('driving_distance', minKm)
        .not('driver_name', 'ilike', 'Bemærk venligst%'); // Ekskludi system beskeder
      
      // Tilføj periode filtre hvis specificeret
      if (month) {
        query = query.eq('month', parseInt(month));
      }
      if (year) {
        query = query.eq('year', parseInt(year));
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af unikke chauffører:`, error);
        return NextResponse.json(
          { error: 'Database fejl' },
          { status: 500 }
        );
      }
      
      // Gruppér data efter chauffør navn for at få unikke chauffører
      const uniqueDrivers = new Map();
      
      data?.forEach((record) => {
        const driverName = record.driver_name.trim();
        
        if (!uniqueDrivers.has(driverName)) {
          // Tag den første record som repræsentativ for chaufføren
          uniqueDrivers.set(driverName, {
            name: driverName,
            vehicles: record.vehicles,
            totalDistance: record.driving_distance || 0,
            avgConsumption: record.avg_consumption_per_100km || 0,
            co2Emission: record.co2_emission || 0,
            latestMonth: record.month,
            latestYear: record.year,
            recordCount: 1
          });
        } else {
          // Opdater med aggregeret data
          const existing = uniqueDrivers.get(driverName);
          existing.totalDistance += record.driving_distance || 0;
          existing.recordCount += 1;
          
          // Opdater til seneste måned/år hvis denne record er nyere
          if (record.year > existing.latestYear || 
              (record.year === existing.latestYear && record.month > existing.latestMonth)) {
            existing.latestMonth = record.month;
            existing.latestYear = record.year;
            existing.vehicles = record.vehicles;
          }
        }
      });
      
      const uniqueDriversArray = Array.from(uniqueDrivers.values()).sort((a, b) => 
        a.name.localeCompare(b.name, 'da-DK')
      );
      
      console.log(`${LOG_PREFIXES.success} Hentede ${uniqueDriversArray.length} unikke chauffører`);
      
      return NextResponse.json({
        drivers: uniqueDriversArray,
        total: uniqueDriversArray.length,
        minKm: minKm
      });
      
    } else if (type === 'details' && driverName) {
      // Hent detaljeret data for specifik chauffør
      console.log(`${LOG_PREFIXES.search} Henter detaljeret data for chauffør: ${driverName}...`);
      
      const { data, error } = await supabase
        .from('driver_data')
        .select('*')
        .eq('driver_name', driverName)
        .gte('driving_distance', minKm)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af chauffør detaljer:`, error);
        return NextResponse.json(
          { error: 'Database fejl' },
          { status: 500 }
        );
      }
      
      console.log(`${LOG_PREFIXES.success} Hentede ${data?.length || 0} records for chauffør: ${driverName}`);
      
      return NextResponse.json({
        driver: driverName,
        records: data || [],
        total: data?.length || 0
      });
      
    } else {
      // Standard hentning af alle chauffør data (eksisterende funktionalitet)
      console.log(`${LOG_PREFIXES.search} Henter alle chauffør data...`);
      
      let query = supabase
        .from('driver_data')
        .select('*')
        .order('driver_name', { ascending: true })
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      // Tilføj filtre hvis specificeret
      if (month) {
        query = query.eq('month', parseInt(month));
      }
      if (year) {
        query = query.eq('year', parseInt(year));
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af alle chauffør data:`, error);
        return NextResponse.json(
          { error: 'Database fejl' },
          { status: 500 }
        );
      }
      
      console.log(`${LOG_PREFIXES.success} Hentede ${data?.length || 0} chauffør records`);
      
      return NextResponse.json({
        drivers: data || [],
        total: data?.length || 0
      });
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i drivers API:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
} 