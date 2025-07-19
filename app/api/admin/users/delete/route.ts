/**
 * Admin Delete User API Route
 * Kun admins kan slette brugere
 * Bruger Supabase Admin API til at slette brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../libs/db';
import { validateAdminToken } from '../../../../../libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * DELETE handler for at slette en bruger
 * @param request - Next.js request objekt
 * @returns NextResponse med sletnings resultat
 */
export async function DELETE(request: NextRequest) {
  console.log(`${LOG_PREFIXES.delete} Admin Delete User API kaldt...`);
  
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
          error: 'Du skal være admin for at slette brugere',
        } as ApiResponse,
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Admin autorisation bekræftet for:`, adminUser.email);
    
    // Hent user ID fra URL parametre
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      console.error('❌ Mangler user ID eller email');
      return NextResponse.json(
        {
          success: false,
          message: 'Mangler bruger information',
          error: 'User ID eller email er påkrævet',
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    let userToDelete = userId;
    
    // Hvis vi kun har email, find brugeren først
    if (!userId && email) {
      console.log(`${LOG_PREFIXES.search} Finder bruger med email:`, email);
      
      const { data: { users }, error: findError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (findError) {
        console.error('❌ Fejl ved søgning efter bruger:', findError.message);
        return NextResponse.json(
          {
            success: false,
            message: 'Kunne ikke finde bruger',
            error: findError.message,
          } as ApiResponse,
          { status: 500 }
        );
      }
      
      const foundUser = users.find(user => user.email === email);
      if (!foundUser) {
        console.error('❌ Bruger ikke fundet:', email);
        return NextResponse.json(
          {
            success: false,
            message: 'Bruger ikke fundet',
            error: 'Ingen bruger med denne email adresse',
          } as ApiResponse,
          { status: 404 }
          );
      }
      
      userToDelete = foundUser.id;
              console.log(`${LOG_PREFIXES.success} Bruger fundet:`, foundUser.email);
    }
    
    // Slet brugeren
    console.log(`${LOG_PREFIXES.delete} Sletter bruger:`, userToDelete);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userToDelete as string);
    
    if (error) {
      console.error('❌ Fejl ved sletning af bruger:', error.message);
      return NextResponse.json(
        {
          success: false,
          message: 'Kunne ikke slette bruger',
          error: error.message,
        } as ApiResponse,
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Bruger slettet succesfuldt`);
    
    // Returner succes response
    return NextResponse.json(
      {
        success: true,
        message: 'Bruger slettet succesfuldt',
      } as ApiResponse,
      { status: 200 }
    );
    
  } catch (error) {
    console.error('❌ Uventet fejl i admin delete user API:', error);
    
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