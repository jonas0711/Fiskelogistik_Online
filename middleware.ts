/**
 * 🔐 Next.js Middleware - Edge-niveau Authentication Protection
 * 
 * Dette er FØRSTE forsvarslinje der kører på CDN-edge niveau
 * og afviser uautoriserede anmodninger før de når applikationen.
 * 
 * LØSNING: Bruger Supabase SSR-pakke for korrekt cookie-håndtering
 * og eliminerer login-loop problemet på Vercel deployment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Supabase konfiguration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Ruter der IKKE kræver authentication
 * Disse er offentlige og kan tilgås uden login
 */
const PUBLIC_ROUTES = [
  '/',                    // Login side
  '/api/auth/login',      // Login API
  '/api/auth/logout',     // Logout API
  '/api/auth/invite',     // Invite API
  '/api/auth/set-password', // Password setup API
  '/api/auth/session',    // Session API
  '/setup-admin',         // Admin setup side
  '/test-admin',          // Test admin side
  '/test-driver-emails',  // Test driver emails side
  // Bemærk: /rio er IKKE inkluderet her - den kræver authentication
];

/**
 * Statiske assets der altid skal være tilgængelige
 */
const STATIC_ASSETS = [
  '/favicon.ico',
  '/_next/',
  '/api/auth/',
  '/sw.js',
  '/fiskelogistikgruppen-logo.png',
];

/**
 * Validerer om en rute er offentlig
 * @param pathname - Request pathname
 * @returns boolean - True hvis rute er offentlig
 */
function isPublicRoute(pathname: string): boolean {
  console.log(`🔍 Tjekker om rute er offentlig: ${pathname}`);
  
  // Tjek om rute er i PUBLIC_ROUTES
  const isPublic = PUBLIC_ROUTES.some(route => {
    // Special case for root path '/'
    if (route === '/') {
      return pathname === '/';
    }
    
    // For andre ruter, tjek exact match eller startsWith
    if (route.endsWith('/')) {
      return pathname === route || pathname.startsWith(route);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
  
  if (isPublic) {
    console.log(`✅ Rute er offentlig: ${pathname}`);
    return true;
  }
  
  // Tjek om rute er statisk asset
  const isStaticAsset = STATIC_ASSETS.some(asset => 
    pathname.startsWith(asset)
  );
  
  if (isStaticAsset) {
    console.log(`✅ Statisk asset: ${pathname}`);
    return true;
  }
  
  console.log(`🔒 Rute kræver authentication: ${pathname}`);
  return false;
}

/**
 * Opretter Supabase server client med korrekt cookie-håndtering
 * @param request - Next.js request objekt
 * @param response - Next.js response objekt
 * @returns Supabase client og response
 */
function createSupabaseClient(request: NextRequest, response: NextResponse) {
  console.log('🔧 Opretter Supabase server client med SSR...');
  
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
  return { supabase, response };
}

/**
 * Validerer bruger session med Supabase SSR client
 * @param supabase - Supabase client
 * @returns Promise<boolean> - True hvis session er gyldig
 */
async function validateSession(supabase: any): Promise<boolean> {
  console.log('🔐 Validerer session med Supabase SSR client...');
  
  try {
    // Brug Supabase SSR's getSession metode
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session validering fejlede:', error.message);
      return false;
    }
    
    if (session && session.user) {
      console.log('✅ Session valideret for bruger:', session.user.email);
      return true;
    }
    
    console.log('ℹ️ Ingen gyldig session fundet');
    return false;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved session validering:', error);
    return false;
  }
}

/**
 * Middleware funktion der kører på edge-niveau
 * @param request - Next.js request objekt
 * @returns NextResponse eller undefined for at fortsætte
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🚀 Middleware kørt for: ${pathname}`);
  console.log('🌐 Request info:', {
    host: request.headers.get('host'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  });
  
  // Tjek om rute er offentlig
  if (isPublicRoute(pathname)) {
    console.log(`✅ Offentlig rute - tillader adgang: ${pathname}`);
    return NextResponse.next();
  }
  
  console.log(`🔒 Beskyttet rute - validerer authentication: ${pathname}`);
  
  // Opret response objekt for cookie-håndtering
  const response = NextResponse.next();
  
  // Opret Supabase client med SSR cookie-håndtering
  const { supabase } = createSupabaseClient(request, response);
  
  // Valider session
  const isValidSession = await validateSession(supabase);
  
  if (isValidSession) {
    console.log('✅ Session valideret - tillader adgang');
    return response;
  }
  
  // Ingen gyldig authentication fundet
  console.error('❌ Ingen gyldig authentication - afviser adgang');
  
  // Redirect til login side for browser requests
  if (pathname.startsWith('/api/')) {
    // API requests returnerer 401
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ikke autoriseret',
        error: 'UNAUTHORIZED'
      },
      { status: 401 }
    );
  } else {
    // Browser requests redirecter til login
    const loginUrl = new URL('/', request.url);
    console.log(`🔄 Redirecter til login: ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Konfigurerer hvilke ruter middleware skal køre på
 * Middleware kører kun på ruter der ikke er offentlige
 */
export const config = {
  matcher: [
    /*
     * Match alle request paths undtagen:
     * - api/auth/* (authentication endpoints)
     * - _next/* (alle Next.js interne filer)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - fiskelogistikgruppen-logo.png (logo fil)
     * - offentlige ruter defineret i PUBLIC_ROUTES
     */
    '/((?!api/auth|_next|favicon.ico|sw.js|fiskelogistikgruppen-logo.png).*)',
  ],
}; 