/**
 * Admin API: Cleanup Disclaimer Data
 * Fjerner eksisterende chaufførdata der indeholder disclaimer tekst
 * Kun tilgængelig for administratorer
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * POST /api/admin/cleanup-disclaimer-data
 * Fjerner chaufførdata der indeholder disclaimer tekst
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.cleanup} Admin API: Cleanup disclaimer data kaldt`);
  
  try {
    // Tjek om request er korrekt
    if (!request) {
      console.error('❌ Ingen request objekt');
      return NextResponse.json(
        { error: 'Ugyldig request' },
        { status: 400 }
      );
    }
    
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    console.log(`${LOG_PREFIXES.auth} Authorization header:`, authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('❌ Ingen authorization header');
      return NextResponse.json(
        { error: 'Manglende authorization header' },
        { status: 401 }
      );
    }
    
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.log('❌ Ingen admin autorisation');
      return NextResponse.json(
        { error: 'Ikke autoriseret - admin rettigheder påkrævet' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Admin autorisation bekræftet for:`, adminUser.email);
    
    console.log(`${LOG_PREFIXES.search} Søger efter chaufførdata med disclaimer tekst...`);
    
    // Først: Hent alle chaufførdata for at tjekke dem manuelt
    console.log(`${LOG_PREFIXES.search} Henter alle chaufførdata fra database...`);
    
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin klient ikke initialiseret');
      return NextResponse.json(
        { error: 'Database klient ikke tilgængelig' },
        { status: 500 }
      );
    }
    
    const { data: allRecords, error: selectAllError } = await supabaseAdmin
      .from('driver_data')
      .select('*');
    
    if (selectAllError) {
      console.error('❌ Fejl ved hentning af alle data:', selectAllError);
      return NextResponse.json(
        { error: 'Kunne ikke hente data fra database' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.stats} Hentet`, allRecords?.length || 0, 'records til gennemgang');
    
    // Find records der indeholder disclaimer tekst eller andre ugyldige data
    const recordsWithDisclaimer = allRecords?.filter(record => {
      // Tjek om chaufførnavnet indeholder disclaimer tekst
      if (record.driver_name && typeof record.driver_name === 'string') {
        const driverName = record.driver_name.toLowerCase();
        
        // Søg efter forskellige dele af disclaimer teksten
        const disclaimerKeywords = [
          'bemærk venligst',
          'præstationsanalyse',
          'driftsmåden',
          'man-specifik',
          'flådechefen',
          'køretræneren'
        ];
        
        if (disclaimerKeywords.some(keyword => driverName.includes(keyword))) {
          return true;
        }
        
        // Tjek om chaufførnavnet er for langt (sandsynligvis ikke et rigtigt navn)
        if (driverName.length > 200) {
          return true;
        }
      }
      
      return false;
    }) || [];
    
    console.log(`${LOG_PREFIXES.stats} Fundet`, recordsWithDisclaimer?.length || 0, 'records med disclaimer tekst');
    
    if (!recordsWithDisclaimer || recordsWithDisclaimer.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Ingen disclaimer data fundet - databasen er allerede ren',
        recordsRemoved: 0
      });
    }
    
    // Slet records med disclaimer tekst
    const recordIds = recordsWithDisclaimer.map(record => record.id);
    
    console.log(`${LOG_PREFIXES.delete} Sletter`, recordIds.length, 'records med disclaimer tekst...');
    
    const { error: deleteError } = await supabaseAdmin
      .from('driver_data')
      .delete()
      .in('id', recordIds);
    
    if (deleteError) {
      console.error('❌ Fejl ved sletning af disclaimer data:', deleteError);
      return NextResponse.json(
        { error: 'Kunne ikke slette disclaimer data' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Successfully slettet`, recordIds.length, 'records med disclaimer tekst');
    
    return NextResponse.json({
      success: true,
      message: `Successfully fjernet ${recordIds.length} records med disclaimer tekst`,
      recordsRemoved: recordIds.length,
      totalRecordsScanned: allRecords?.length || 0,
      removedRecords: recordsWithDisclaimer.map(record => ({
        id: record.id,
        driver_name: record.driver_name,
        created_at: record.created_at
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl i cleanup disclaimer data:', error);
    
    return NextResponse.json(
      { 
        error: 'Der opstod en uventet fejl under cleanup',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 