/**
 * Logout API Route
 * Rydder session cookies og logger brugeren ud
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * POST handler for logout
 * @param request - Next.js request objekt
 * @returns NextResponse med logout resultat
 */
export async function POST(request: NextRequest) {
  console.log('🚪 Logout API kaldt...');
  
  try {
    // Hent access token fra cookie
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    if (accessToken) {
      console.log('🔐 Logger bruger ud via Supabase...');
      
      // Log ud via Supabase (valgfrit - rydder server-side session)
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
      
      if (error) {
        console.warn('⚠️ Supabase logout fejl (ikke kritisk):', error.message);
      } else {
        console.log('✅ Supabase logout succesfuldt');
      }
    }
    
    // Opret response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout succesfuldt',
      } as ApiResponse,
      { status: 200 }
    );
    
    // Ryd session cookies
    console.log('🍪 Rydder session cookies...');
    
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Slet cookie
      path: '/',
    });
    
    response.cookies.set('sb-refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Slet cookie
      path: '/',
    });
    
    console.log('✅ Session cookies ryddet succesfuldt');
    
    return response;
    
  } catch (error) {
    console.error('❌ Uventet fejl i logout API:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Server fejl',
        error: 'Der opstod en uventet fejl under logout.',
      } as ApiResponse,
      { status: 500 }
    );
  }
} 