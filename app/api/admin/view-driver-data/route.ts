/**
 * Admin API: View Driver Data
 * Viser alle chaufførdata for admin gennemgang
 * Kun tilgængelig for administratorer
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';

/**
 * GET /api/admin/view-driver-data
 * Henter alle chaufførdata for admin gennemgang
 */
export async function GET(request: NextRequest) {
  console.log('👁️ Admin API: View driver data kaldt');
  
  try {
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.log('❌ Ingen admin autorisation');
      return NextResponse.json(
        { error: 'Ikke autoriseret - admin rettigheder påkrævet' },
        { status: 403 }
      );
    }
    
    console.log('✅ Admin autorisation bekræftet for:', adminUser.email);
    
    // Hent alle chaufførdata
    const { data: allRecords, error: selectError } = await supabaseAdmin
      .from('driver_data')
      .select('id, driver_name, vehicles, month, year, driving_distance, avg_consumption_per_100km, co2_emission, avg_speed, created_at')
      .order('created_at', { ascending: false });
    
    if (selectError) {
      console.error('❌ Fejl ved hentning af chaufførdata:', selectError);
      return NextResponse.json(
        { error: 'Kunne ikke hente chaufførdata' },
        { status: 500 }
      );
    }
    
    console.log('📊 Hentet', allRecords?.length || 0, 'chauffør records');
    
    // Identificer potentielt problematiske records
    const problematicRecords = allRecords?.filter(record => {
      if (record.driver_name && typeof record.driver_name === 'string') {
        const driverName = record.driver_name.toLowerCase();
        
        // Søg efter disclaimer keywords
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
        
        // Tjek om chaufførnavnet er for langt
        if (driverName.length > 200) {
          return true;
        }
      }
      
      return false;
    }) || [];
    
    return NextResponse.json({
      success: true,
      totalRecords: allRecords?.length || 0,
      problematicRecords: problematicRecords.length,
      allRecords: allRecords || [],
      problematicRecordsList: problematicRecords,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl i view driver data:', error);
    
    return NextResponse.json(
      { 
        error: 'Der opstod en uventet fejl',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 