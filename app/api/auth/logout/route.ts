/**
 * Logout API Route
 * Rydder session cookies og logger brugeren ud
 * LØSNING: Bruger Supabase SSR-pakke for konsistent cookie-håndtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Opretter Supabase server client med SSR cookie-håndtering
 * @param request - Next.js request objekt
 * @param response - Next.js response objekt
 * @returns Supabase client
 */
function createSupabaseClient(request: NextRequest, response: NextResponse) {
  console.log('🔧 Opretter Supabase server client med SSR for logout...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Opret Supabase client med SSR cookie-håndtering
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        // Læs cookies fra request
        get(name: string) {
          console.log(`🍪 Læser cookie: ${name}`);
          return request.cookies.get(name)?.value;
        },
        // Sæt cookies på response
        set(name: string, value: string, options: any) {
          console.log(`🍪 Sætter cookie: ${name}`);
          response.cookies.set(name, value, options);
        },
        // Fjern cookies fra response
        remove(name: string, options: any) {
          console.log(`🍪 Fjerner cookie: ${name}`);
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
  
  console.log('✅ Supabase server client oprettet med SSR cookie-håndtering');
  return supabase;
}

/**
 * POST handler for logout
 * @param request - Next.js request objekt
 * @returns NextResponse med logout resultat
 */
export async function POST(request: NextRequest) {
  console.log('🚪 Logout API kaldt...');
  
  try {
    // Opret response objekt for cookie-håndtering
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout succesfuldt',
      } as ApiResponse,
      { status: 200 }
    );
    
    // Opret Supabase client med SSR cookie-håndtering
    const supabase = createSupabaseClient(request, response);
    
    // Log ud via Supabase SSR client (rydder automatisk cookies)
    console.log('🔐 Logger bruger ud via Supabase SSR...');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.warn('⚠️ Supabase logout fejl (ikke kritisk):', error.message);
    } else {
      console.log('✅ Supabase SSR logout succesfuldt');
    }
    
    // Supabase SSR client har automatisk ryddet cookies
    console.log('✅ Session cookies ryddet via SSR client');
    
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