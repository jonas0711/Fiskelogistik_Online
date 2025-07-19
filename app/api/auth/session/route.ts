/**
 * Auth API: Session Endpoint
 * Returnerer den nuværende bruger session
 */

import { NextResponse } from 'next/server';
import { getSession } from '../../../../libs/db';

/**
 * GET /api/auth/session
 * Henter den nuværende session
 */
export async function GET() {
  console.log('📋 Session API kaldt...');
  
  try {
    // Hent session fra Supabase
    const session = await getSession();
    
    if (session) {
      console.log('✅ Session fundet for bruger:', session.user.email);
      return NextResponse.json({
        data: {
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: {
              id: session.user.id,
              email: session.user.email,
              app_metadata: session.user.app_metadata,
              user_metadata: session.user.user_metadata,
            }
          }
        }
      });
    } else {
      console.log('ℹ️ Ingen aktiv session');
      return NextResponse.json({
        data: {
          session: null
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fejl ved hentning af session:', error);
    
    return NextResponse.json(
      { 
        error: 'Kunne ikke hente session',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/session
 * Opdaterer session (ikke implementeret)
 */
export async function POST() {
  console.log('📋 Session POST API kaldt...');
  
  return NextResponse.json(
    { error: 'POST ikke understøttet for session endpoint' },
    { status: 405 }
  );
} 