/**
 * Admin API: Setup Database
 * Kører setup af driver_data tabellen og tilføjer manglende kolonner
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';
import { setupDriverDataTable } from '@/libs/create-driver-data-table';

/**
 * POST /api/admin/setup-database
 * Kører database setup for driver_data tabellen
 */
export async function POST(request: NextRequest) {
  console.log('🔍 Admin API: Database verifikation kaldt');
  
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
    
    // Kør database verifikation
    console.log('🔍 Starter database verifikation...');
    await setupDriverDataTable();
    
    console.log('✅ Database verifikation fuldført');
    
    return NextResponse.json({
      success: true,
      message: 'Database er klar til brug - alle kolonner er på plads',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fejl ved database verifikation:', error);
    
    return NextResponse.json(
      { 
        error: 'Database verifikation fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup-database
 * Tjekker database status
 */
export async function GET(request: NextRequest) {
  console.log('🔍 Admin API: Database status tjek');
  
  try {
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Ikke autoriseret' },
        { status: 403 }
      );
    }
    
    // Tjek om driver_data tabellen eksisterer
    const { error } = await supabaseAdmin
      .from('driver_data')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        status: 'missing',
        message: 'driver_data tabel eksisterer ikke',
        error: error.message
      });
    }
    
    // Tjek antal kolonner (simplet tjek)
    const { error: columnError } = await supabaseAdmin
      .from('driver_data')
      .select('*')
      .limit(0);
    
    if (columnError) {
      return NextResponse.json({
        status: 'incomplete',
        message: 'Tabel eksisterer men har ikke alle kolonner',
        error: columnError.message
      });
    }
    
    return NextResponse.json({
      status: 'ready',
      message: 'driver_data tabel er klar til brug',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fejl ved database status tjek:', error);
    
    return NextResponse.json(
      { 
        error: 'Database status tjek fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 