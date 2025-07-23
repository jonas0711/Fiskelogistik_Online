/**
 * Admin API: Debug Endpoint
 * Debug endpoint til at undersøge problemer
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET /api/admin/debug
 * Debug endpoint
 * KRITISK: Kun admins kan tilgå debug information
 */
export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIXES.debug} Admin API: Debug endpoint kaldt`);
  
  try {
    // 🔐 KRITISK: Valider admin authentication
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} KRITISK: Uautoriseret forsøg på at tilgå debug endpoint`);
      return NextResponse.json(
        { 
          success: false,
          message: 'Adgang nægtet',
          error: 'Kun administratorer kan tilgå debug information'
        },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Admin authentication bekræftet for:`, adminUser.email);
    
    // Tjek om Supabase admin klient er tilgængelig
    const supabaseStatus = {
      hasSupabaseAdmin: !!supabaseAdmin,
      supabaseType: typeof supabaseAdmin,
    };
    
    // Tjek om vi kan hente data fra database
    let dbStatus = 'Ikke testet';
    try {
      const { error } = await supabaseAdmin
        .from('driver_data')
        .select('count')
        .limit(1);
      
      if (error) {
        dbStatus = `Fejl: ${error.message}`;
      } else {
        dbStatus = 'OK';
      }
    } catch (dbError) {
      dbStatus = `Exception: ${dbError instanceof Error ? dbError.message : 'Ukendt fejl'}`;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug information',
      timestamp: new Date().toISOString(),
      adminUser: adminUser.email,
      supabaseStatus,
      dbStatus,
      requestHeaders: Object.fromEntries(request.headers.entries()),
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl i debug endpoint:`, error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Server fejl',
        error: 'Debug endpoint fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/debug
 * Debug endpoint med authorization test
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.debug} Admin API: Debug POST endpoint kaldt`);
  
  try {
    // Tjek authorization header
    const authHeader = request.headers.get('authorization');
    console.log(`${LOG_PREFIXES.auth} Authorization header:`, authHeader ? 'Present' : 'Missing');
    
    let authStatus = 'Ikke testet';
    let adminUser = null;
    
    if (authHeader) {
      try {
        adminUser = await validateAdminToken(authHeader);
        authStatus = adminUser ? 'Admin valideret' : 'Ikke admin';
      } catch (authError) {
        authStatus = `Auth fejl: ${authError instanceof Error ? authError.message : 'Ukendt fejl'}`;
      }
    } else {
      authStatus = 'Ingen auth header';
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug POST information',
      timestamp: new Date().toISOString(),
      authStatus,
      hasAdminUser: !!adminUser,
      adminEmail: adminUser?.email || null,
      requestHeaders: Object.fromEntries(request.headers.entries()),
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl i debug POST endpoint:`, error);
    
    return NextResponse.json(
      { 
        error: 'Debug POST endpoint fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 