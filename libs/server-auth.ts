/**
 * Server-side Authentication Middleware
 * Standardiseret authentication validation på tværs af API routes
 * Håndterer Bearer token validation gennem Supabase Admin client
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './db';

/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  message?: string;
}

/**
 * Validerer Bearer token og returnerer bruger hvis gyldig
 * @param token - Bearer token fra Authorization header
 * @returns Promise<AuthResult> - Authentication resultat
 */
export async function validateBearerToken(token: string): Promise<AuthResult> {
  console.log('🔐 Validerer Bearer token...');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Token validering fejlede:', error?.message);
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Ugyldig eller udløbet token'
      };
    }
    
    console.log('✅ Token valideret for bruger:', user.email);
    return {
      success: true,
      user
    };
    
  } catch (error) {
    console.error('❌ Uventet fejl ved token validering:', error);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Fejl under token validering'
    };
  }
}

/**
 * Validerer session fra cookies og returnerer bruger hvis gyldig
 * @returns Promise<AuthResult> - Authentication resultat
 */
export async function validateSession(): Promise<AuthResult> {
  console.log('🔐 Validerer session fra cookies...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session validering fejlede:', error.message);
      
      // Håndter refresh token fejl specifikt
      if (error.message.includes('Refresh Token Not Found') || 
          error.message.includes('Invalid Refresh Token')) {
        console.log('🔄 Refresh token fejl på server-side');
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Session udløbet - log venligst ind igen'
        };
      }
      
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Ingen gyldig session'
      };
    }
    
    if (!session) {
      console.log('ℹ️ Ingen session fundet');
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Ingen gyldig session'
      };
    }
    
    // Tjek om session er udløbet
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('⚠️ Session er udløbet på server-side');
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Session udløbet - log venligst ind igen'
      };
    }
    
    console.log('✅ Session valideret for bruger:', session.user?.email);
    return {
      success: true,
      user: session.user
    };
    
  } catch (error) {
    console.error('❌ Uventet fejl ved session validering:', error);
    
    // Håndter refresh token fejl i catch block også
    if (error instanceof Error && (
        error.message.includes('Refresh Token Not Found') || 
        error.message.includes('Invalid Refresh Token'))) {
      console.log('🔄 Refresh token fejl i catch på server-side');
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Session udløbet - log venligst ind igen'
      };
    }
    
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Fejl under session validering'
    };
  }
}

/**
 * Middleware funktion til authentication validation
 * Prøver først Bearer token, derefter session fallback
 * @param request - Next.js request objekt
 * @returns Promise<AuthResult> - Authentication resultat
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  console.log('🔐 Authenticating request...');
  
  // Tjek Authorization header først
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🔐 Bearer token fundet i header');
    const token = authHeader.replace('Bearer ', '');
    return await validateBearerToken(token);
  }
  
  // Fallback til session validering
  console.log('🔐 Ingen Bearer token, tjekker session...');
  return await validateSession();
}

/**
 * Middleware wrapper til API routes
 * Validerer authentication og returnerer bruger eller error response
 * @param request - Next.js request objekt
 * @param handler - API route handler funktion
 * @returns Promise<NextResponse> - API response
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  console.log('🔐 Middleware: Validerer authentication...');
  
  try {
    // Valider authentication
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      console.error('❌ Authentication fejlede:', authResult.message);
      return NextResponse.json({
        success: false,
        message: authResult.message || 'Ikke autoriseret',
        error: authResult.error || 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    console.log('✅ Authentication succesfuld for:', authResult.user?.email);
    
    // Kald handler med valideret bruger
    return await handler(request, authResult.user);
    
  } catch (error) {
    console.error('❌ Uventet fejl i authentication middleware:', error);
    return NextResponse.json({
      success: false,
      message: 'Server fejl under authentication',
      error: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

/**
 * Middleware wrapper til admin-only API routes
 * Validerer authentication og admin status
 * @param request - Next.js request objekt
 * @param handler - API route handler funktion
 * @returns Promise<NextResponse> - API response
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  console.log('🔐 Middleware: Validerer admin authentication...');
  
  try {
    // Valider authentication
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      console.error('❌ Authentication fejlede:', authResult.message);
      return NextResponse.json({
        success: false,
        message: authResult.message || 'Ikke autoriseret',
        error: authResult.error || 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    console.log('✅ Authentication succesfuld for:', authResult.user?.email);
    
    // Tjek admin status direkte fra bruger objekt
    const userRoles = authResult.user?.app_metadata?.roles || [];
    const isAdminFlag = authResult.user?.app_metadata?.is_admin;
    
    console.log('🔍 Bruger roller:', userRoles);
    console.log('🔍 Admin flag:', isAdminFlag);
    
    const isAdminUser = userRoles.includes('admin') || isAdminFlag === true;
    
    if (!isAdminUser) {
      console.error('❌ Bruger er ikke admin:', authResult.user?.email);
      return NextResponse.json({
        success: false,
        message: 'Kun administratorer kan udføre denne handling',
        error: 'FORBIDDEN'
      }, { status: 403 });
    }
    
    console.log('✅ Admin status bekræftet for:', authResult.user?.email);
    
    // Kald handler med valideret admin bruger
    return await handler(request, authResult.user);
    
  } catch (error) {
    console.error('❌ Uventet fejl i admin authentication middleware:', error);
    return NextResponse.json({
      success: false,
      message: 'Server fejl under authentication',
      error: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

/**
 * Hjælpefunktion til at oprette error response
 * @param message - Fejl besked
 * @param error - Fejl type
 * @param status - HTTP status kode
 * @returns NextResponse - Error response
 */
export function createErrorResponse(
  message: string,
  error: string = 'API_ERROR',
  status: number = 400
): NextResponse {
  console.error(`❌ API Error (${status}):`, message);
  
  return NextResponse.json({
    success: false,
    message,
    error
  }, { status });
}

/**
 * Hjælpefunktion til at oprette success response
 * @param data - Response data
 * @param message - Success besked
 * @returns NextResponse - Success response
 */
export function createSuccessResponse(
  data: any,
  message: string = 'Handling fuldført succesfuldt'
): NextResponse {
  console.log('✅ API Success:', message);
  
  return NextResponse.json({
    success: true,
    message,
    data
  });
} 