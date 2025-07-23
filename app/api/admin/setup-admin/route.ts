/**
 * Admin API: Setup Admin
 * Sætter admin rettigheder på en bruger
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { setUserAsAdminByEmail } from '../../../../libs/setup-admin';
import { validateAdminToken } from '../../../../libs/admin';

/**
 * POST /api/admin/setup-admin
 * Sætter admin rettigheder på en bruger
 * KRITISK: Kun admins kan udføre denne handling
 */
export async function POST(request: NextRequest) {
  console.log('👑 Admin API: Setup admin kaldt');
  
  try {
    // 🔐 KRITISK: Valider admin authentication
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error('❌ KRITISK: Uautoriseret forsøg på at sætte admin rettigheder');
      return NextResponse.json(
        { 
          success: false,
          message: 'Adgang nægtet',
          error: 'Kun administratorer kan udføre denne handling'
        },
        { status: 403 }
      );
    }
    
    console.log('✅ Admin authentication bekræftet for:', adminUser.email);
    
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig input',
          error: 'Email er påkrævet'
        },
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
        { 
          success: false,
          message: 'Kunne ikke sætte admin rettigheder',
          error: 'Database operation fejlede'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Fejl ved admin setup:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Server fejl',
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
 * KRITISK: Kun admins kan se brugerliste
 */
export async function GET(request: NextRequest) {
  console.log('📋 Admin API: Lister brugere');
  
  try {
    // 🔐 KRITISK: Valider admin authentication
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error('❌ KRITISK: Uautoriseret forsøg på at se brugerliste');
      return NextResponse.json(
        { 
          success: false,
          message: 'Adgang nægtet',
          error: 'Kun administratorer kan se brugerliste'
        },
        { status: 403 }
      );
    }
    
    console.log('✅ Admin authentication bekræftet for:', adminUser.email);
    
    // Hent alle brugere
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved bruger liste hentning:', error.message);
      return NextResponse.json(
        { 
          success: false,
          message: 'Kunne ikke hente bruger liste',
          error: error.message
        },
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
      message: 'Brugerliste hentet succesfuldt',
      users: userList,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Fejl ved bruger liste hentning:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Server fejl',
        error: 'Bruger liste hentning fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 