/**
 * Auth API: Session Endpoint
 * Returnerer den nuværende bruger session
 * LØSNING: Bruger Supabase SSR-pakke for konsistent cookie-håndtering
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
  console.log('🔧 Opretter Supabase server client med SSR for session...');
  
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
 * GET /api/auth/session
 * Henter den nuværende session
 */
export async function GET(request: NextRequest) {
  console.log('📋 Session API kaldt...');
  
  try {
    // Opret response objekt for cookie-håndtering
    const response = NextResponse.next();
    
    // Opret Supabase client med SSR cookie-håndtering
    const supabase = createSupabaseClient(request, response);
    
    // Hent session fra Supabase SSR client
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Fejl ved hentning af session:', error.message);
      return NextResponse.json(
        { 
          error: 'Kunne ikke hente session',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    if (session) {
      console.log('✅ Session fundet for bruger:', session.user.email);
      return NextResponse.json({
        data: {
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: {
              id: session.user.id,
              email: session.user.email,
              app_metadata: session.user.app_metadata,
              user_metadata: session.user.user_metadata,
            }
          }
        }
      });
    } else {
      console.log('ℹ️ Ingen aktiv session');
      return NextResponse.json({
        data: {
          session: null
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Uventet fejl ved hentning af session:', error);
    
    return NextResponse.json(
      { 
        error: 'Kunne ikke hente session',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/session
 * Opdaterer session (ikke implementeret)
 */
export async function POST() {
  console.log('📋 Session POST API kaldt...');
  
  return NextResponse.json(
    { error: 'POST ikke understøttet for session endpoint' },
    { status: 405 }
  );
} 