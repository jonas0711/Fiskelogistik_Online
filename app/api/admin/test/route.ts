/**
 * Admin API: Test Endpoint
 * Simpel test endpoint til at verificere at admin API'er virker
 */

import { NextRequest, NextResponse } from 'next/server';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET /api/admin/test
 * Simpel test endpoint
 */
export async function GET() {
  console.log(`${LOG_PREFIXES.test} Admin API: Test endpoint kaldt`);
  
  return NextResponse.json({
    success: true,
    message: 'Admin API virker korrekt',
    timestamp: new Date().toISOString()
  });
}

/**
 * POST /api/admin/test
 * Test endpoint med authorization
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.test} Admin API: Test POST endpoint kaldt`);
  
  try {
    // Tjek om request er korrekt
    if (!request) {
      return NextResponse.json(
        { error: 'Ugyldig request' },
        { status: 400 }
      );
    }
    
    // Tjek authorization header
    const authHeader = request.headers.get('authorization');
    console.log(`${LOG_PREFIXES.auth} Authorization header:`, authHeader ? 'Present' : 'Missing');
    
    return NextResponse.json({
      success: true,
      message: 'Admin API POST virker korrekt',
      hasAuthHeader: !!authHeader,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl i test endpoint:`, error);
    
    return NextResponse.json(
      { 
        error: 'Test endpoint fejlede',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 