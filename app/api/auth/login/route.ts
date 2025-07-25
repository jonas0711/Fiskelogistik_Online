/**
 * Login API Route
 * Håndterer bruger login via Supabase
 * Kun brugere der eksisterer i systemet kan logge ind
 * LØSNING: Vercel-specifik cookie håndtering og forbedret redirect logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { isValidEmail } from '../../../../libs/utils';
import { getCookieConfig } from '../../../../libs/config';

// Interface for login request data
interface LoginRequest {
  email: string;
  password: string;
}

// Interface for API response (kun brugt ved fejl)
interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}



/**
 * Opretter optimale cookie options baseret på environment
 * @param request - Next.js request objekt
 * @returns Cookie options objekt
 */
function getCookieOptions(request: NextRequest) {
  // Brug central config funktion
  return getCookieConfig(request);
}

/**
 * POST handler for login
 * @param request - Next.js request objekt
 * @returns NextResponse med login resultat eller redirect
 */
export async function POST(request: NextRequest) {
  console.log('🔐 Login API kaldt...');
  console.log('🌐 Request headers:', {
    host: request.headers.get('host'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
  });
  
  try {
    // Parse request body
    const body: LoginRequest = await request.json();
    console.log('📨 Request body modtaget:', { email: body.email });
    
    // Valider input
    const validationResult = validateLoginRequest(body);
    if (!validationResult.isValid) {
      console.error('❌ Validering fejlede:', validationResult.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Ugyldig input',
          error: validationResult.errors.join(', '),
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Tjek om bruger eksisterer i systemet
    const userExists = await checkUserExists(body.email);
    if (!userExists) {
      console.error('❌ Bruger eksisterer ikke i systemet:', body.email);
      return NextResponse.json(
        {
          success: false,
          message: 'Adgang nægtet',
          error: 'Denne email adresse er ikke registreret i systemet',
        } as ApiResponse,
        { status: 403 }
      );
    }
    
    console.log('✅ Bruger eksisterer i systemet, forsøger login...');
    
    // Forsøg login med Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email.trim(),
      password: body.password,
    });
    
    if (error) {
      console.error('❌ Supabase login fejl:', error.message);
      
      // Håndter forskellige fejl typer
      let errorMessage = 'Login fejlede';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Forkert email eller password';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email skal bekræftes før login';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'For mange login forsøg. Prøv igen senere';
      }
      
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: error.message,
        } as ApiResponse,
        { status: 401 }
      );
    }
    
    console.log('✅ Login succesfuldt for:', data.user?.email);
    
    // LØSNING: Opret server-side redirect response med optimerede cookies
    const redirectUrl = new URL('/rio', request.url);
    const response = NextResponse.redirect(redirectUrl, 302);
    
    // Sæt session cookies på redirect response med Vercel-optimerede settings
    if (data.session?.access_token) {
      console.log('🍪 Sætter session cookies på redirect response...');
      
      const cookieOptions = getCookieOptions(request);
      console.log('🍪 Cookie options:', cookieOptions);
      
      // Sæt access token cookie
      response.cookies.set('sb-access-token', data.session.access_token, cookieOptions);
      
      // Sæt refresh token cookie hvis det findes
      if (data.session.refresh_token) {
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 30, // 30 dage for refresh token
        });
      }
      
      // Tilføj debug headers for at trace cookie flow
      response.headers.set('X-Login-Success', 'true');
      response.headers.set('X-User-Email', data.user?.email || '');
      response.headers.set('X-Cookie-Domain', request.headers.get('host') || '');
      
      console.log('✅ Session cookies sat på redirect response med Vercel-optimerede settings');
    }
    
    console.log('🔄 Returnerer server-side redirect til /rio');
    return response;
    
  } catch (error) {
    console.error('❌ Uventet fejl i login API:', error);
    
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

/**
 * Validerer login request data
 * @param data - Login request data
 * @returns Validering resultat
 */
function validateLoginRequest(data: LoginRequest): { isValid: boolean; errors: string[] } {
  console.log('🔍 Validerer login request...');
  
  const errors: string[] = [];
  
  // Tjek email
  if (!data.email || !data.email.trim()) {
    errors.push('Email er påkrævet');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email format er ugyldigt');
  }
  
  // Tjek password
  if (!data.password || !data.password.trim()) {
    errors.push('Password er påkrævet');
  } else if (data.password.length < 6) {
    errors.push('Password skal være mindst 6 tegn');
  }
  
  const isValid = errors.length === 0;
  console.log(`✅ Login request validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
  
  return { isValid, errors };
}

/**
 * Tjekker om bruger eksisterer i Supabase systemet
 * @param email - Email at tjekke
 * @returns Promise<boolean> - true hvis bruger eksisterer
 */
async function checkUserExists(email: string): Promise<boolean> {
  console.log('🔒 Tjekker om bruger eksisterer i systemet:', email);
  
  try {
    // Hent alle brugere fra Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved bruger liste hentning:', error.message);
      return false; // Antag at bruger ikke eksisterer ved fejl
    }
    
    // Tjek om email findes i brugerlisten
    const existingUser = users.find(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    );
    
    const exists = !!existingUser;
    console.log(`✅ Bruger eksistens tjek: ${exists ? 'Eksisterer' : 'Eksisterer ikke'}`);
    
    if (exists) {
      console.log(`📋 Bruger detaljer: ID=${existingUser.id}, Email=${existingUser.email}, Rolle=${existingUser.user_metadata?.role || 'user'}`);
    }
    
    return exists;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved bruger eksistens tjek:', error);
    return false;
  }
}

// Funktioner er ikke eksporteret for at undgå Next.js konflikter 