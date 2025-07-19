/**
 * Admin API: Delete Driver Record
 * Sletter specifikke chauffør records baseret på ID
 * Kun tilgængelig for administratorer
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../libs/db';
import { validateAdminToken } from '../../../../libs/admin';

/**
 * DELETE /api/admin/delete-driver-record
 * Sletter specifikke chauffør records
 */
export async function DELETE(request: NextRequest) {
  console.log('🗑️ Admin API: Delete driver record kaldt');
  
  try {
    // Valider admin token fra request header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.log('❌ Ingen admin autorisation');
      return NextResponse.json(
        { error: 'Ikke autoriseret - admin rettigheder påkrævet' },
        { status: 403 }
      );
    }
    
    console.log('✅ Admin autorisation bekræftet for:', adminUser.email);
    
    // Parse request body for record ID
    const { recordId } = await request.json();
    
    if (!recordId) {
      console.error('❌ Manglende record ID');
      return NextResponse.json(
        { error: 'Manglende record ID' },
        { status: 400 }
      );
    }
    
    console.log('🗑️ Sletter record med ID:', recordId);
    
    // Slet den specifikke record
    const { error: deleteError } = await supabaseAdmin
      .from('driver_data')
      .delete()
      .eq('id', recordId);
    
    if (deleteError) {
      console.error('❌ Fejl ved sletning af record:', deleteError);
      return NextResponse.json(
        { error: 'Kunne ikke slette record' },
        { status: 500 }
      );
    }
    
    console.log('✅ Record slettet succesfuldt');
    
    return NextResponse.json({
      success: true,
      message: 'Record slettet succesfuldt',
      deletedRecordId: recordId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl i delete driver record:', error);
    
    return NextResponse.json(
      { 
        error: 'Der opstod en uventet fejl',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 