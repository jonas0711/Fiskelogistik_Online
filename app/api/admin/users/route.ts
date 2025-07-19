/**
 * Admin Users API Route
 * Kun admins kan hente brugerliste
 * Bruger Supabase Admin API til at hente alle brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';

// Interface for bruger data
interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  invited_at?: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: User[];
  error?: string;
}

/**
 * GET handler for at hente brugerliste
 * @param request - Next.js request objekt
 * @returns NextResponse med brugerliste
 */
export async function GET(request: NextRequest) {
  console.log('👥 Admin Users API kaldt...');
  
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
          error: 'Du skal være admin for at se brugerliste',
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
          message: 'Kunne ikke hente brugerliste',
          error: error.message,
        } as ApiResponse,
        { status: 500 }
      );
    }
    
    // Konverter til vores User interface
    const formattedUsers: User[] = users.map(user => ({
      id: user.id,
      email: user.email || 'Ukendt email',
      full_name: user.user_metadata?.full_name,
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      invited_at: user.invited_at,
    }));
    
    console.log('✅ Brugerliste hentet:', formattedUsers.length, 'brugere');
    
    // Returner succes response
    return NextResponse.json(
      {
        success: true,
        message: 'Brugerliste hentet succesfuldt',
        data: formattedUsers,
      } as ApiResponse,
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Uventet fejl i admin users API:', error);
    
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