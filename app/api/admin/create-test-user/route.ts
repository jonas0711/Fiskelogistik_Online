/**
 * Admin API: Create Test User
 * Opretter test brugere direkte i Supabase for test formål
 * KRITISK: Kun admins kan oprette brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';

// Interface for create user request
interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  role?: 'admin' | 'user';
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    user_id?: string;
    email?: string;
  };
  error?: string;
}

/**
 * POST /api/admin/create-test-user
 * Opretter en test bruger direkte i Supabase
 */
export async function POST(request: NextRequest) {
  console.log('👤 Admin API: Create test user kaldt');
  
  try {
    // 🔐 KRITISK: Valider admin authentication
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error('❌ KRITISK: Uautoriseret forsøg på at oprette test bruger');
      return NextResponse.json(
        { 
          success: false,
          message: 'Adgang nægtet',
          error: 'Kun administratorer kan oprette test brugere'
        },
        { status: 403 }
      );
    }
    
    console.log('✅ Admin authentication bekræftet for:', adminUser.email);
    
    // Parse request body
    const body: CreateUserRequest = await request.json();
    const { email, password, full_name, role = 'user' } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig input',
          error: 'Email og password er påkrævet'
        },
        { status: 400 }
      );
    }
    
    console.log('📧 Opretter test bruger:', email);
    
    // Opret bruger via Supabase Admin API
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email for test brugere
      user_metadata: {
        full_name: full_name || 'Test User',
        role: role,
        created_by: adminUser.email,
        created_at: new Date().toISOString(),
      },
    });
    
    if (error) {
      console.error('❌ Fejl ved oprettelse af test bruger:', error.message);
      return NextResponse.json(
        { 
          success: false,
          message: 'Kunne ikke oprette test bruger',
          error: error.message
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Test bruger oprettet succesfuldt:', user?.email);
    
    return NextResponse.json({
      success: true,
      message: `Test bruger oprettet: ${email}`,
      data: {
        user_id: user?.id,
        email: user?.email,
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fejl ved oprettelse af test bruger:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Server fejl',
        error: 'Test bruger oprettelse fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 