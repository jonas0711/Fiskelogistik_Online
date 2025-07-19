/**
 * Set Password API Route
 * Håndterer password-oprettelse for inviterede brugere
 * Brugeren skal have en gyldig session fra invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';

// Interface for set password request data
interface SetPasswordRequest {
  password: string;
  confirmPassword: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    user?: {
      id?: string;
      email?: string;
    };
  };
  error?: string;
}

/**
 * POST handler for password-oprettelse
 * @param request - Next.js request objekt
 * @returns NextResponse med password-oprettelse resultat
 */
export async function POST(request: NextRequest) {
  console.log('🔐 Set Password API kaldt...');
  
  try {
    // Parse request body
    const body: SetPasswordRequest = await request.json();
    console.log('📨 Set password request modtaget');
    
    // Valider input
    const validationResult = validateSetPasswordRequest(body);
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
    
    // Hent bruger fra session (fra invitation)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Ingen gyldig authorization header');
      return NextResponse.json(
        {
          success: false,
          message: 'Uautoriseret',
          error: 'Ingen gyldig session fundet',
        } as ApiResponse,
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Validerer session token...');
    
    // Valider token og hent bruger
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Ugyldig session:', authError?.message);
      return NextResponse.json(
        {
          success: false,
          message: 'Ugyldig session',
          error: 'Din session er udløbet eller ugyldig',
        } as ApiResponse,
        { status: 401 }
      );
    }
    
    console.log('✅ Session valideret for bruger:', user.email);
    
    // Opdater brugerens password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: body.password,
    });
    
    if (error) {
      console.error('❌ Password opdatering fejl:', error.message);
      
      // Håndter forskellige fejl typer
      let errorMessage = 'Password opdatering fejlede';
      if (error.message.includes('Password should be at least')) {
        errorMessage = 'Password skal være mindst 6 tegn';
      } else if (error.message.includes('Invalid password')) {
        errorMessage = 'Password opfylder ikke sikkerhedskravene';
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
    
    console.log('✅ Password opdateret succesfuldt for:', data.user?.email);
    
    // Returner succes response
    return NextResponse.json(
      {
        success: true,
        message: 'Password oprettet succesfuldt',
        data: {
          user: {
            id: data.user?.id,
            email: data.user?.email,
          },
        },
      } as ApiResponse,
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Uventet fejl i set password API:', error);
    
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
 * Validerer set password request data
 * @param data - Set password request data
 * @returns Validering resultat
 */
function validateSetPasswordRequest(data: SetPasswordRequest): { isValid: boolean; errors: string[] } {
  console.log('🔍 Validerer set password request...');
  
  const errors: string[] = [];
  
  // Tjek password
  if (!data.password || !data.password.trim()) {
    errors.push('Password er påkrævet');
  } else if (data.password.length < 6) {
    errors.push('Password skal være mindst 6 tegn');
  }
  
  // Tjek password bekræftelse
  if (!data.confirmPassword || !data.confirmPassword.trim()) {
    errors.push('Password bekræftelse er påkrævet');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Passwords matcher ikke');
  }
  
  const isValid = errors.length === 0;
  console.log(`✅ Set password request validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
  
  return { isValid, errors };
} 