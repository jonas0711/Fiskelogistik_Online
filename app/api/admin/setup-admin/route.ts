/**
 * Admin API: Setup Admin
 * Sætter admin rettigheder på en bruger
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { setUserAsAdminByEmail } from '../../../../libs/setup-admin';

/**
 * POST /api/admin/setup-admin
 * Sætter admin rettigheder på en bruger
 */
export async function POST(request: NextRequest) {
  console.log('👑 Admin API: Setup admin kaldt');
  
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email er påkrævet' },
        { status: 400 }
      );
    }
    
    console.log('📧 Sætter admin rettigheder på:', email);
    
    // Sæt admin rettigheder
    const success = await setUserAsAdminByEmail(email);
    
    if (success) {
      console.log('✅ Admin rettigheder sat succesfuldt på:', email);
      return NextResponse.json({
        success: true,
        message: `Admin rettigheder sat på ${email}`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('❌ Kunne ikke sætte admin rettigheder på:', email);
      return NextResponse.json(
        { error: 'Kunne ikke sætte admin rettigheder' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Fejl ved admin setup:', error);
    
    return NextResponse.json(
      { 
        error: 'Admin setup fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup-admin
 * Lister alle brugere og deres admin status
 */
export async function GET() { // Fjernet 'request' parameter, da den ikke blev brugt og gav ESLint-advarsel
  console.log('📋 Admin API: Lister brugere');
  
  try {
    // Hent alle brugere
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved bruger liste hentning:', error.message);
      return NextResponse.json(
        { error: 'Kunne ikke hente bruger liste' },
        { status: 500 }
      );
    }
    
    const userList = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.app_metadata?.roles?.includes('admin') ? 'admin' : 'user',
      is_admin: user.app_metadata?.is_admin || false,
      created_at: user.created_at,
    }));
    
    console.log(`✅ ${userList.length} brugere fundet`);
    
    return NextResponse.json({
      success: true,
      users: userList,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fejl ved bruger liste hentning:', error);
    
    return NextResponse.json(
      { 
        error: 'Bruger liste hentning fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 