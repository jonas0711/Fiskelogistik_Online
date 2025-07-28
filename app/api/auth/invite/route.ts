/**
 * Invitation API Route
 * Kun admins kan sende invitationer til nye brugere
 * Bruger Supabase Admin API til at sende sikre invitationer
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';
import { getAppUrl } from '../../../../libs/config';
import { isValidEmail } from '../../../../libs/utils';

// Interface for invitation request data
interface InviteRequest {
  email: string;
  full_name?: string;
  role?: 'admin' | 'user';
  message?: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    invitation_id?: string;
    email?: string;
    expires_at?: string;
  };
  error?: string;
}

/**
 * POST handler for at sende invitation
 * @param request - Next.js request objekt
 * @returns NextResponse med invitation resultat
 */
export async function POST(request: NextRequest) {
  console.log('📧 Invitation API kaldt...');
  
  try {
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error('❌ Ingen admin autorisation');
      return NextResponse.json(
        {
          success: false,
          message: 'Adgang nægtet',
          error: 'Du skal være admin for at sende invitationer',
        } as ApiResponse,
        { status: 403 }
      );
    }
    
    console.log('✅ Admin autorisation bekræftet for:', adminUser.email);
    
    // Parse request body
    const body: InviteRequest = await request.json();
    console.log('📨 Invitation request modtaget:', { email: body.email, role: body.role });
    
    // Valider input
    const validationResult = validateInviteRequest(body);
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
    
    // Tjek om bruger allerede eksisterer
    const existingUser = await checkExistingUser(body.email);
    if (existingUser) {
      console.error('❌ Bruger eksisterer allerede:', body.email);
      return NextResponse.json(
        {
          success: false,
          message: 'Bruger eksisterer allerede',
          error: 'En bruger med denne email adresse eksisterer allerede',
        } as ApiResponse,
        { status: 409 }
      );
    }
    
    console.log('✅ Email valideret og bruger eksisterer ikke, sender invitation...');
    
    // Opret redirect URL med invitation data
    const baseUrl = getAppUrl(request);
    console.log('🌐 Base URL bestemt:', baseUrl);
    
    const redirectUrl = new URL('/auth/accept-invite', baseUrl);
    redirectUrl.searchParams.set('email', body.email.trim());
    if (body.full_name) {
      redirectUrl.searchParams.set('full_name', body.full_name);
    }
    redirectUrl.searchParams.set('role', body.role || 'user');
    
    console.log('🔗 Redirect URL med invitation data:', redirectUrl.toString());
    console.log('📧 Invitation sendes til:', body.email.trim());
    console.log('👤 Bruger rolle:', body.role || 'user');
    console.log('📝 Fuldt navn:', body.full_name || 'Ikke angivet');
    
    // Send invitation via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email.trim(),
      {
        data: {
          full_name: body.full_name,
          role: body.role || 'user',
          invited_by: adminUser.email,
          invited_at: new Date().toISOString(),
        },
        redirectTo: redirectUrl.toString(),
      }
    );
    
    if (error) {
      console.error('❌ Supabase invitation fejl:', error.message);
      
      // Håndter forskellige fejl typer
      let errorMessage = 'Invitation fejlede';
      if (error.message.includes('User already registered')) {
        errorMessage = 'Bruger er allerede registreret';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Ugyldig email adresse';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'For mange invitationer. Prøv igen senere';
      }
      
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: error.message,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    console.log('✅ Invitation sendt succesfuldt til:', data.user?.email);
    
    // Log invitation i database (valgfrit)
    await logInvitation({
      invited_email: body.email,
      invited_by: adminUser.email,
      role: body.role || 'user',
      status: 'sent',
    });
    
    // Returner succes response
    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sendt succesfuldt',
        data: {
          invitation_id: data.user?.id,
          email: data.user?.email,
          expires_at: data.user?.invited_at,
        },
      } as ApiResponse,
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Uventet fejl i invitation API:', error);
    
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
 * Validerer invitation request data
 * @param data - Invitation request data
 * @returns Validering resultat
 */
function validateInviteRequest(data: InviteRequest): { isValid: boolean; errors: string[] } {
  console.log('🔍 Validerer invitation request...');
  
  const errors: string[] = [];
  
  // Tjek email
  if (!data.email || !data.email.trim()) {
    errors.push('Email er påkrævet');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email format er ugyldigt');
  }
  
  // Tjek full_name hvis det er givet
  if (data.full_name && data.full_name.trim().length < 2) {
    errors.push('Fuldt navn skal være mindst 2 tegn');
  }
  
  // Tjek role hvis det er givet
  if (data.role && !['admin', 'user'].includes(data.role)) {
    errors.push('Rolle skal være enten "admin" eller "user"');
  }
  
  // Tjek message længde hvis det er givet
  if (data.message && data.message.length > 500) {
    errors.push('Besked må ikke være længere end 500 tegn');
  }
  
  const isValid = errors.length === 0;
  console.log(`✅ Invitation request validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
  
  return { isValid, errors };
}

/**
 * Tjekker om en bruger allerede eksisterer
 * @param email - Email at tjekke
 * @returns Promise<boolean> - true hvis bruger eksisterer
 */
async function checkExistingUser(email: string): Promise<boolean> {
  console.log('🔍 Tjekker om bruger eksisterer:', email);
  
  try {
    // Hent bruger fra Supabase Auth
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
    
    return exists;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved bruger eksistens tjek:', error);
    return false;
  }
}

/**
 * Logger invitation i database
 * @param invitationData - Invitation data at logge
 */
async function logInvitation(invitationData: {
  invited_email: string;
  invited_by: string;
  role: string;
  status: string;
}): Promise<void> {
  console.log('📝 Logger invitation:', invitationData);
  
  try {
    // Her kunne du gemme invitation log i en database tabel
    // For nu logger vi kun til console
    console.log('✅ Invitation logget:', {
      timestamp: new Date().toISOString(),
      ...invitationData,
    });
    
  } catch (error) {
    console.error('❌ Fejl ved invitation logging:', error);
    // Ikke kast fejl - logging er ikke kritisk
  }
}

// Funktioner er ikke eksporteret for at undgå Next.js konflikter 