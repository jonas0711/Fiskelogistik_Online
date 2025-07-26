/**
 * Database forbindelse til Supabase
 * Denne fil håndterer al kommunikation med databasen
 * 
 * OBS: Browser-klienten bruger nu Supabase SSR for cookie-baserede sessions
 * Dette løser login-loop problemet ved at ensrette session-håndtering
 * 
 * OBS: I browseren bruger vi window._supabase for at overleve hot reload
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './config';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Tjek om vi kører i browser eller server
const isBrowser = typeof window !== 'undefined';

// Global variabel til at holde styr på om vi allerede har initialiseret
let isInitialized = false;

// Singleton pattern for at undgå multiple instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Tjek om miljøvariabler er sat
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase miljøvariabler ikke sat - klient vil ikke fungere korrekt');
}

// Løsning: Ignorer GoTrue advarslen i udvikling
if (isBrowser && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Ignorer specifik GoTrue advarsel om multiple instances
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Multiple GoTrueClient instances detected')) {
      return; // Ignorer denne advarsel
    }
    originalWarn.apply(console, args);
  };
}

/**
 * Opret eller hent eksisterende Supabase klient
 * Singleton pattern for at undgå multiple GoTrueClient instances
 * 
 * OBS: Browser-klienten bruger nu createBrowserClient fra @supabase/ssr
 * Dette sikrer cookie-baserede sessions der deles mellem browser og server
 * 
 * OBS: I browseren bruger vi window._supabase for at overleve hot reload
 */
function getSupabaseClient() {
  if (isBrowser) {
    // Browser-klient: Brug window._supabase for at overleve hot reload
    if (!(window as any)._supabase) {
      // Tjek om vi allerede har initialiseret
      if (isInitialized) {
        console.warn(`${LOG_PREFIXES.warning} Supabase klient allerede initialiseret - bruger eksisterende instans`);
        return (window as any)._supabase;
      }
      
      console.log(`${LOG_PREFIXES.connection} Initialiserer Supabase klient...`);
      console.log(`${LOG_PREFIXES.info} Initialiserer browser-klient med SSR cookie support`);
      
      // Marker som initialiseret
      isInitialized = true;
      
      try {
        (window as any)._supabase = createBrowserClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          {
            cookies: {
            set(name, value, options) {
              document.cookie = `${name}=${value}; path=${options?.path || '/'}`
            },
            get(name) {
              const cookie = document.cookie
                .split('; ')
                .find((row) => row.startsWith(`${name}=`))
              if (!cookie) return undefined
              return cookie.split('=')[1]
            },
            remove(name, options) {
              document.cookie = `${name}=; path=${options?.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
            }
          }
          }
        );
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl ved oprettelse af browser client:`, error);
        throw error;
      }
      
      console.log(`${LOG_PREFIXES.success} Supabase browser-klient initialiseret med SSR cookie support`);
    } else {
      console.log(`${LOG_PREFIXES.info} Genbruger eksisterende Supabase browser-klient`);
    }
    return (window as any)._supabase;
  } else {
    // Server-klient: Brug standard createClient (håndteres primært i server-auth.ts)
    if (!supabaseInstance) {
      // Tjek om vi allerede har initialiseret
      if (isInitialized) {
        console.warn(`${LOG_PREFIXES.warning} Supabase server klient allerede initialiseret - bruger eksisterende instans`);
        return supabaseInstance;
      }
      
      console.log(`${LOG_PREFIXES.connection} Initialiserer Supabase klient...`);
      console.log(`${LOG_PREFIXES.info} Initialiserer server-klient`);
      
      // Marker som initialiseret
      isInitialized = true;
      
      supabaseInstance = createClient(
        SUPABASE_URL || 'https://placeholder.supabase.co',
        SUPABASE_ANON_KEY || 'placeholder-key',
        {
          auth: {
            // Ingen session persistence på serveren
            persistSession: false as const,
          },
        }
      );
      
      console.log(`${LOG_PREFIXES.success} Supabase server-klient initialiseret`);
    } else {
      console.log(`${LOG_PREFIXES.info} Genbruger eksisterende Supabase server-klient`);
    }
    return supabaseInstance;
  }
}

/**
 * Opret eller hent eksisterende Supabase admin klient
 * Singleton pattern for at undgå multiple instances
 * 
 * OBS: Admin-klienten forbliver uændret - bruger service role key
 * Kun til server-side operationer, ingen session håndtering
 */
function getSupabaseAdminClient() {
  if (!supabaseAdminInstance) {
    console.log(`${LOG_PREFIXES.connection} Initialiserer Supabase admin klient...`);
    
    const serviceKey = SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
    supabaseAdminInstance = createClient(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      serviceKey,
      {
        auth: {
          // Ingen session persistence på serveren
          persistSession: false as const,
        },
      }
    );
    
    console.log(`${LOG_PREFIXES.success} Supabase admin klient initialiseret`);
  } else {
    console.log(`${LOG_PREFIXES.info} Genbruger eksisterende Supabase admin klient`);
  }
  
  return supabaseAdminInstance;
}

// Eksporter klienter
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();

// Hjælpefunktioner til database operationer

/**
 * Hent bruger fra session
 * @returns Bruger objekt eller null hvis ikke logget ind
 * 
 * OBS: Nu bruger cookie-baserede sessions der deles mellem browser og server
 */
export async function getCurrentUser() {
  console.log(`${LOG_PREFIXES.user} Henter nuværende bruger...`);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Håndter specifikke auth fejl mere elegant
      if (error.message === 'Auth session missing!') {
        console.log(`${LOG_PREFIXES.info} Ingen aktiv session - bruger ikke logget ind`);
        return null;
      }
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af bruger:`, error.message);
      return null;
    }
    
    if (user) {
      console.log(`${LOG_PREFIXES.success} Bruger fundet:`, user.email);
      return user;
    } else {
      console.log(`${LOG_PREFIXES.info} Ingen bruger logget ind`);
      return null;
    }
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved hentning af bruger:`, error);
    return null;
  }
}

/**
 * Tjek om bruger er logget ind
 * @returns true hvis bruger er logget ind, false ellers
 * 
 * OBS: Nu bruger cookie-baserede sessions der deles mellem browser og server
 */
export async function isAuthenticated() {
  console.log(`${LOG_PREFIXES.auth} Tjekker authentication status...`);
  
  const user = await getCurrentUser();
  const isAuth = user !== null;
  
  console.log(`${LOG_PREFIXES.success} Authentication status: ${isAuth ? 'Logget ind' : 'Ikke logget ind'}`);
  return isAuth;
}

/**
 * Log ud
 * @returns true hvis logout lykkedes, false ellers
 * 
 * OBS: Nu bruger cookie-baserede sessions der deles mellem browser og server
 */
export async function signOut() {
  console.log(`${LOG_PREFIXES.auth} Logger bruger ud...`);
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved logout:`, error.message);
      return false;
    }
    
    console.log(`${LOG_PREFIXES.success} Bruger logget ud succesfuldt`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved logout:`, error);
    return false;
  }
}

/**
 * Hent session
 * @returns Session objekt eller null
 * 
 * OBS: Nu bruger cookie-baserede sessions der deles mellem browser og server
 */
export async function getSession() {
  console.log(`${LOG_PREFIXES.list} Henter session...`);
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af session:`, error.message);
      return null;
    }
    
    if (session) {
      console.log(`${LOG_PREFIXES.success} Session fundet`);
      return session;
    } else {
      console.log(`${LOG_PREFIXES.info} Ingen aktiv session`);
      return null;
    }
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved hentning af session:`, error);
    return null;
  }
}

// Eksporter alle funktioner
export default {
  supabase,
  supabaseAdmin,
  getCurrentUser,
  isAuthenticated,
  signOut,
  getSession,
}; 