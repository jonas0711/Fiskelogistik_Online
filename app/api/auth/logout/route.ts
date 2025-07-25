/**
 * Logout API Route
 * Håndterer bruger logout via Supabase
 * Rydder session cookies og redirecter til login
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
 * @returns NextResponse med redirect til login
 */
export async function POST(request: NextRequest) {
  console.log('🔐 Logout API kaldt...');
  
  try {
    // Opret redirect response til login
    const redirectUrl = new URL('/', request.url);
    const response = NextResponse.redirect(redirectUrl, 302);
    
    // Opret Supabase client med SSR cookie-håndtering
    const supabase = createSupabaseClient(request, response);
    
    // Log ud med Supabase SSR client
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Supabase logout fejl:', error.message);
      // Fortsæt med redirect selv ved fejl
    } else {
      console.log('✅ Logout succesfuldt');
    }
    
    // Supabase SSR client har automatisk håndteret cookie-rydning på response objektet
    console.log('🔄 Redirecter til login efter logout');
    return response;
    
  } catch (error) {
    console.error('❌ Uventet fejl i logout API:', error);
    
    // Ved fejl, redirect til login alligevel
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl, 302);
  }
} 