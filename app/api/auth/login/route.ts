/**
 * Login API Route
 * Håndterer bruger login via Supabase
 * Kun brugere der eksisterer i systemet kan logge ind
 * LØSNING: Server-side redirect i stedet for JSON response for at undgå cookie timing race condition på Vercel
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
 * @returns NextResponse med redirect eller JSON error
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
        },
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
        },
        { status: 403 }
      );
    }
    
    console.log('✅ Bruger eksisterer i systemet, forsøger login...');
    
    // Opret response for cookie-håndtering
    const response = NextResponse.next();
    
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
      
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: error.message,
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Login succesfuldt for:', data.user?.email);
    console.log('🔄 Redirecter til /rio med SSR cookies');
    
    // Supabase SSR client har automatisk håndteret cookie-sætning på response objektet
    // Opret redirect response efter vellykket login
    const redirectUrl = new URL('/rio', request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl, 302);
    
    // Kopier alle cookies fra det oprindelige response til redirect response
    response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
    
  } catch (error) {
    console.error('❌ Uventet fejl i login API:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Server fejl',
        error: 'Der opstod en uventet fejl. Prøv igen senere.',
      },
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