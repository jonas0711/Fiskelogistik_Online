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
  
  // Cache til at gemme cookie værdier
  const cookieCache = new Map<string, string | undefined>();
  
  // Opret Supabase client med SSR cookie-håndtering
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        // Læs cookies fra request med caching
        get(name: string) {
          if (!cookieCache.has(name)) {
            const cookie = request.cookies.get(name);
            cookieCache.set(name, cookie?.value);
            if (name.includes('auth-token')) {
              console.log(`🍪 Læser auth cookie: ${name} = ${cookie ? 'fundet' : 'ikke fundet'}`);
            }
          }
          return cookieCache.get(name);
        },
        // Sæt cookies på response og cache
        set(name: string, value: string, options: any) {
          cookieCache.set(name, value);
          console.log(`🍪 Sætter cookie: ${name}`);
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_DOMAIN 
              : undefined // Lad browseren håndtere localhost
          });
        },
        // Fjern cookies fra response og cache
        remove(name: string, options: any) {
          cookieCache.delete(name);
          console.log(`🍪 Fjerner cookie: ${name}`);
          response.cookies.set(name, '', { 
            ...options, 
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production'
              ? process.env.NEXT_PUBLIC_DOMAIN
              : undefined
          });
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
    // Valider bruger med getUser (sikker metode)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Bruger validering fejlede:', userError.message);
      console.error('Fejl detaljer:', JSON.stringify(userError, null, 2));
      return false;
    }
    
    if (user) {
      // Dobbeltcheck session efter bruger validering
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session validering fejlede:', sessionError.message);
        return false;
      }
      
      if (session) {
        console.log('✅ Session valideret for bruger:', user.email);
        console.log('📅 Session udløber:', new Date(session.expires_at * 1000).toISOString());
        return true;
      }
    }
    
    console.log('ℹ️ Ingen gyldig session fundet');
    console.log('Debug info:', {
      hasUser: !!user,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
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
  
  try {
    // Opret Supabase client med SSR cookie-håndtering
    const { supabase } = createSupabaseClient(request, response);
    
    // Valider session med timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session validering timeout')), 5000);
    });
    
    const sessionPromise = validateSession(supabase);
    const isValidSession = await Promise.race([sessionPromise, timeoutPromise])
      .catch(error => {
        console.error('Session validering fejlede:', error);
        return false;
      });
    
    if (isValidSession) {
      console.log('✅ Session valideret - tillader adgang');
      // Sæt en custom header så vi kan tracke auth status
      response.headers.set('X-Auth-Status', 'validated');
      return response;
    }
  } catch (error) {
    console.error('Uventet fejl i middleware:', error);
    // Fortsæt til login redirect i tilfælde af fejl
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
     * Match alle paths undtagen:
     * - api/auth/* (authentication endpoints)
     * - _next/* (Next.js internal files)
     * - _next/static/* (Next.js static files)
     * - _next/image/* (Next.js optimized images)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - fiskelogistikgruppen-logo.png (logo)
     * - *.ts, *.js, *.css (source files)
     * - public ruter defineret i PUBLIC_ROUTES
     */
    '/((?!api/auth/|_next/|_next/static/|_next/image/|favicon.ico|sw.js|fiskelogistikgruppen-logo.png|\\.ts|\\.js|\\.css).*)',
  ],
}; 