/**
 * Admin Stats API Route
 * Kun admins kan hente system statistikker
 * Bruger Supabase Admin API til at hente bruger statistikker
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';

// Interface for system statistikker
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  confirmedUsers: number;
  pendingUsers: number;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: SystemStats;
  error?: string;
}

/**
 * GET handler for at hente system statistikker
 * @param request - Next.js request objekt
 * @returns NextResponse med system statistikker
 */
export async function GET(request: NextRequest) {
  console.log('📊 Admin Stats API kaldt...');
  
  try {
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error('❌ Ingen admin autorisation');
      return NextResponse.json(
        {
          success: false,
          message: 'Adgang nægtet',
          error: 'Du skal være admin for at se statistikker',
        } as ApiResponse,
        { status: 403 }
      );
    }
    
    console.log('✅ Admin autorisation bekræftet for:', adminUser.email);
    
    // Hent alle brugere via Supabase Admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved hentning af brugere:', error.message);
      return NextResponse.json(
        {
          success: false,
          message: 'Kunne ikke hente statistikker',
          error: error.message,
        } as ApiResponse,
        { status: 500 }
      );
    }
    
    console.log('📊 Brugere hentet:', users.length);

    // Beregn statistikker
    const totalUsers = users.length;
    
    // Aktive brugere (logget ind inden for sidste 30 dage)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = users.filter(user => 
      user.last_sign_in_at && new Date(user.last_sign_in_at) > thirtyDaysAgo
    ).length;
    
    // Bekræftede brugere (email bekræftet)
    const confirmedUsers = users.filter(user => 
      user.email_confirmed_at
    ).length;
    
    // Afventende brugere (ikke bekræftet)
    const pendingUsers = users.filter(user => 
      !user.email_confirmed_at
    ).length;

    const stats: SystemStats = {
      totalUsers,
      activeUsers,
      confirmedUsers,
      pendingUsers,
    };
    
    console.log('✅ System statistikker hentet:', stats);
    
    // Returner succes response
    return NextResponse.json(
      {
        success: true,
        message: 'Statistikker hentet succesfuldt',
        data: stats,
      } as ApiResponse,
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Uventet fejl i admin stats API:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Server fejl',
        error: 'Der opstod en uventet fejl. Prøv igen senere.',
      } as ApiResponse,
      { status: 500 }
    );
  }
} 