/**
 * Client-side Authentication Utility
 * Centraliseret håndtering af authenticated requests fra frontend
 * Sikrer korrekt Bearer token transmission til alle API calls
 */

import { supabase } from './db';

/**
 * Authentication response interface
 */
interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Henter access token fra aktuel Supabase session
 * @returns Promise<string | null> - Access token eller null hvis ingen session
 */
export async function getAccessToken(): Promise<string | null> {
  console.log('🔐 Henter access token fra session...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Fejl ved hentning af session:', error.message);
      
      // Håndter refresh token fejl specifikt
      if (error.message.includes('Refresh Token Not Found') || 
          error.message.includes('Invalid Refresh Token')) {
        console.log('🔄 Refresh token fejl - logger bruger ud');
        await cleanupExpiredSession();
        return null;
      }
      
      return null;
    }
    
    if (!session) {
      console.log('ℹ️ Ingen aktiv session fundet');
      return null;
    }
    
    // Tjek om session er udløbet
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('⚠️ Session er udløbet - logger bruger ud');
      await cleanupExpiredSession();
      return null;
    }
    
    console.log('✅ Access token hentet for bruger:', session.user?.email);
    return session.access_token;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved hentning af access token:', error);
    
    // Håndter refresh token fejl i catch block også
    if (error instanceof Error && (
        error.message.includes('Refresh Token Not Found') || 
        error.message.includes('Invalid Refresh Token'))) {
      console.log('🔄 Refresh token fejl i catch - logger bruger ud');
      await cleanupExpiredSession();
    }
    
    return null;
  }
}

/**
 * Validerer om bruger har en gyldig session
 * @returns Promise<boolean> - True hvis session er gyldig
 */
export async function hasValidSession(): Promise<boolean> {
  console.log('🔍 Validerer bruger session...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session validering fejlede:', error.message);
      
      // Håndter refresh token fejl specifikt
      if (error.message.includes('Refresh Token Not Found') || 
          error.message.includes('Invalid Refresh Token')) {
        console.log('🔄 Refresh token fejl - logger bruger ud');
        await cleanupExpiredSession();
        return false;
      }
      
      return false;
    }
    
    if (!session) {
      console.log('ℹ️ Ingen session fundet');
      return false;
    }
    
    // Tjek om session er udløbet
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('⚠️ Session er udløbet - logger bruger ud');
      await cleanupExpiredSession();
      return false;
    }
    
    console.log('✅ Gyldig session fundet for:', session.user?.email);
    return true;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved session validering:', error);
    
    // Håndter refresh token fejl i catch block også
    if (error instanceof Error && (
        error.message.includes('Refresh Token Not Found') || 
        error.message.includes('Invalid Refresh Token'))) {
      console.log('🔄 Refresh token fejl i catch - logger bruger ud');
      await supabase.auth.signOut();
    }
    
    return false;
  }
}

/**
 * Wrapper til authenticated fetch requests med JSON data
 * @param url - API endpoint URL
 * @param options - Fetch options (body, method, etc.)
 * @returns Promise<AuthResponse> - API response
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<AuthResponse> {
  console.log(`🌐 Authenticated fetch til: ${url}`);
  
  try {
    // Hent access token
    const token = await getAccessToken();
    
    if (!token) {
      console.error('❌ Ingen gyldig access token');
      return {
        success: false,
        message: 'Ingen gyldig session - log venligst ind igen',
        error: 'UNAUTHORIZED'
      };
    }
    
    // Opret headers med Authorization
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    console.log('🔐 Sender request med Bearer token');
    
    // Send request
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    // Håndter response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API fejl:', errorData);
      
      if (response.status === 401) {
        return {
          success: false,
          message: 'Din session er udløbet. Log venligst ind igen.',
          error: 'UNAUTHORIZED'
        };
      }
      
      return {
        success: false,
        message: errorData.message || `Request fejlede (${response.status})`,
        error: errorData.error || 'API_ERROR'
      };
    }
    
    const result = await response.json();
    console.log('✅ Request succesfuld:', result);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('❌ Uventet fejl i authenticated fetch:', error);
    return {
      success: false,
      message: 'Der opstod en uventet fejl. Prøv igen senere.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Wrapper til authenticated fetch requests med FormData
 * @param url - API endpoint URL
 * @param formData - FormData objekt
 * @param options - Ekstra fetch options
 * @returns Promise<AuthResponse> - API response
 */
export async function authenticatedFormDataFetch(
  url: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<AuthResponse> {
  console.log(`📤 Authenticated FormData fetch til: ${url}`);
  
  try {
    // Hent access token
    const token = await getAccessToken();
    
    if (!token) {
      console.error('❌ Ingen gyldig access token for FormData upload');
      return {
        success: false,
        message: 'Ingen gyldig session - log venligst ind igen',
        error: 'UNAUTHORIZED'
      };
    }
    
    // Opret headers med Authorization (uden Content-Type for FormData)
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    console.log('🔐 Sender FormData request med Bearer token');
    
    // Send request
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      ...options
    });
    
    console.log(`📡 FormData response status: ${response.status} ${response.statusText}`);
    
    // Håndter response
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.log('⚠️ Kunne ikke parse error response som JSON');
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error('❌ FormData API fejl:', errorData);
      
      if (response.status === 401) {
        return {
          success: false,
          message: 'Din session er udløbet. Log venligst ind igen.',
          error: 'UNAUTHORIZED'
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          message: errorData.message || 'Du har ikke tilladelse til at udføre denne handling',
          error: 'FORBIDDEN'
        };
      }
      
      return {
        success: false,
        message: errorData.message || `Upload fejlede (${response.status})`,
        error: errorData.error || 'UPLOAD_ERROR'
      };
    }
    
    const result = await response.json();
    console.log('✅ FormData upload succesfuld:', result);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('❌ Uventet fejl i authenticated FormData fetch:', error);
    return {
      success: false,
      message: 'Der opstod en uventet fejl under upload. Prøv igen senere.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Rydder op i udløbne sessions og cookies
 */
export async function cleanupExpiredSession(): Promise<void> {
  console.log('🧹 Rydder op i udløbne session...');
  
  try {
    // Tjek om der er en session der skal ryddes op
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Tjek om session er udløbet
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('🧹 Session er udløbet - logger ud');
        await supabase.auth.signOut();
      }
    }
  } catch (error) {
    console.log('🧹 Fejl under cleanup - logger ud alligevel');
    await supabase.auth.signOut();
  }
}

/**
 * Håndterer session timeout og redirect
 * @param error - Error objekt fra API response
 */
export function handleAuthError(error: string): void {
  console.log('🔐 Håndterer authentication fejl:', error);
  
  if (error === 'UNAUTHORIZED' || error.includes('Refresh Token')) {
    console.log('🔄 Omdirigerer til login på grund af session timeout eller refresh token fejl');
    
    // Vis besked til bruger og omdiriger
    if (typeof window !== 'undefined') {
      alert('Din session er udløbet. Log venligst ind igen.');
      
      // Omdiriger til login
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }
} 