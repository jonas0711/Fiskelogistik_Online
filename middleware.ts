/**
 * 🔐 Next.js Middleware - Edge-niveau Authentication Protection
 * 
 * Dette er FØRSTE forsvarslinje der kører på CDN-edge niveau
 * og afviser uautoriserede anmodninger før de når applikationen.
 * 
 * Formål:
 * - Beskyt alle ruter undtagen login og offentlige assets
 * - Valider authentication på edge-niveau for hurtig responstid
 * - Reducer serverbelastning ved at blokere ugyldige requests tidligt
 * - Centraliseret adgangskontrol for hele applikationen
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase klient til edge-niveau authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Opret Supabase klient med service role key for edge-niveau validering
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
 * Validerer Bearer token på edge-niveau
 * @param token - Bearer token fra Authorization header
 * @returns Promise<boolean> - True hvis token er gyldig
 */
async function validateBearerToken(token: string): Promise<boolean> {
  console.log('🔐 Validerer Bearer token på edge-niveau...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Edge-niveau token validering fejlede:', error?.message);
      return false;
    }
    
    console.log('✅ Edge-niveau token valideret for bruger:', user.email);
    return true;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved edge-niveau token validering:', error);
    return false;
  }
}

/**
 * Validerer session fra cookies på edge-niveau
 * @param request - Next.js request objekt
 * @returns Promise<boolean> - True hvis session er gyldig
 */
async function validateSession(request: NextRequest): Promise<boolean> {
  console.log('🔐 Validerer session fra cookies på edge-niveau...');
  
  try {
    // Hent session fra cookies
    const sessionCookie = request.cookies.get('sb-access-token')?.value;
    
    if (!sessionCookie) {
      console.log('ℹ️ Ingen session cookie fundet');
      return false;
    }
    
    // Valider session token
    const { data: { user }, error } = await supabase.auth.getUser(sessionCookie);
    
    if (error || !user) {
      console.error('❌ Edge-niveau session validering fejlede:', error?.message);
      return false;
    }
    
    console.log('✅ Edge-niveau session valideret for bruger:', user.email);
    return true;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved edge-niveau session validering:', error);
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
  
  // Tjek om rute er offentlig
  if (isPublicRoute(pathname)) {
    console.log(`✅ Offentlig rute - tillader adgang: ${pathname}`);
    return NextResponse.next();
  }
  
  console.log(`🔒 Beskyttet rute - validerer authentication: ${pathname}`);
  
  // Tjek Authorization header først (Bearer token)
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🔐 Bearer token fundet i header');
    const token = authHeader.replace('Bearer ', '');
    
    const isValidToken = await validateBearerToken(token);
    if (isValidToken) {
      console.log('✅ Bearer token valideret - tillader adgang');
      return NextResponse.next();
    }
  }
  
  // Fallback til session validering
  console.log('🔐 Ingen gyldig Bearer token, tjekker session...');
  const isValidSession = await validateSession(request);
  
  if (isValidSession) {
    console.log('✅ Session valideret - tillader adgang');
    return NextResponse.next();
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