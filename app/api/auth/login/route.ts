/**
 * Login API Route
 * Håndterer bruger login via Supabase
 * Kun brugere der eksisterer i systemet kan logge ind
 * LØSNING: JSON response i stedet for server-side redirect for at undgå cookie timing race condition på Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '../../../../libs/db';
import { isValidEmail } from '../../../../libs/utils';

// Interface for login request data
interface LoginRequest {
  email: string;
  password: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    redirectUrl: string;
    user?: {
      email: string;
      id: string;
    };
  };
  error?: string;
}

/**
 * Opretter Supabase server client med SSR cookie-håndtering
 * @param request - Next.js request objekt
 * @param response - Next.js response objekt
 * @returns Supabase client
 */
function createSupabaseClient(request: NextRequest, response: NextResponse) {
  console.log('🔧 Opretter Supabase server client med SSR for login...');
  
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
 * POST handler for login
 * @param request - Next.js request objekt
 * @returns NextResponse med JSON resultat
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
      const validationErrorResponse = NextResponse.json(
        {
          success: false,
          message: 'Ugyldig input',
          error: validationResult.errors.join(', '),
        } as ApiResponse,
        { status: 400 }
      );
      
      // Tilføj debug headers for at trace cookie flow
      validationErrorResponse.headers.set('X-Response-Type', 'json');
      
      return validationErrorResponse;
    }
    
    // Tjek om bruger eksisterer i systemet
    const userExists = await checkUserExists(body.email);
    if (!userExists) {
      console.error('❌ Bruger eksisterer ikke i systemet:', body.email);
      const userNotFoundResponse = NextResponse.json(
        {
          success: false,
          message: 'Adgang nægtet',
          error: 'Denne email adresse er ikke registreret i systemet',
        } as ApiResponse,
        { status: 403 }
      );
      
      // Tilføj debug headers for at trace cookie flow
      userNotFoundResponse.headers.set('X-Response-Type', 'json');
      
      return userNotFoundResponse;
    }
    
    console.log('✅ Bruger eksisterer i systemet, forsøger login...');
    
    // LØSNING: Opret response objekt FØRST for at sikre cookie-håndtering
    const response = NextResponse.json(
      {
        success: false,
        message: 'Login fejlede',
      } as ApiResponse,
      { status: 200 }
    );
    
    // Opret Supabase client med SSR cookie-håndtering
    const supabase = createSupabaseClient(request, response);
    
    // Forsøg login med Supabase SSR client
    const { data, error } = await supabase.auth.signInWithPassword({
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
      
      const errorResponse = NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: error.message,
        } as ApiResponse,
        { status: 401 }
      );
      
      // Tilføj debug headers for at trace cookie flow
      errorResponse.headers.set('X-Response-Type', 'json');
      
      return errorResponse;
    }
    
    console.log('✅ Login succesfuldt for:', data.user?.email);
    
    // LØSNING: Returner JSON success response i stedet for redirect
    // Supabase SSR client har automatisk håndteret cookie-sætning på response objektet
    const successResponse = NextResponse.json(
      {
        success: true,
        message: 'Login succesfuldt',
        data: {
          redirectUrl: '/rio',
          user: {
            email: data.user?.email || '',
            id: data.user?.id || '',
          },
        },
      } as ApiResponse,
      { status: 200 }
    );
    
    // Kopier cookies fra Supabase SSR response til success response
    response.cookies.getAll().forEach(cookie => {
      console.log(`🍪 Kopierer cookie til success response: ${cookie.name}`);
      successResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: cookie.name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
      });
    });
    
    // Tilføj debug headers for at trace cookie flow
    successResponse.headers.set('X-Login-Success', 'true');
    successResponse.headers.set('X-User-Email', data.user?.email || '');
    successResponse.headers.set('X-Cookie-Domain', request.headers.get('host') || '');
    successResponse.headers.set('X-Response-Type', 'json');
    
    console.log('✅ Login JSON response oprettet med SSR cookies');
    console.log('🔄 Returnerer JSON success response til frontend');
    return successResponse;
    
  } catch (error) {
    console.error('❌ Uventet fejl i login API:', error);
    
    const serverErrorResponse = NextResponse.json(
      {
        success: false,
        message: 'Server fejl',
        error: 'Der opstod en uventet fejl. Prøv igen senere.',
      } as ApiResponse,
      { status: 500 }
    );
    
    // Tilføj debug headers for at trace cookie flow
    serverErrorResponse.headers.set('X-Response-Type', 'json');
    
    return serverErrorResponse;
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