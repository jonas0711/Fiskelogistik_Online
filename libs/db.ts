/**
 * Database forbindelse til Supabase
 * Denne fil håndterer al kommunikation med databasen
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

console.log('🔌 Initialiserer Supabase klient...');

// Tjek om miljøvariabler er sat
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.warn('⚠️ Supabase miljøvariabler ikke sat - klient vil ikke fungere korrekt');
}

// Opret Supabase klient til client-side operationer
// Dette er den anonyme klient som bruges i browseren
export const supabase = createClient(
  supabaseConfig.url || 'https://placeholder.supabase.co',
  supabaseConfig.anonKey || 'placeholder-key',
  {
    auth: {
      // Automatisk opdatering af session
      autoRefreshToken: true,
      // Gem session i localStorage
      persistSession: true,
      // Detekter session ændringer
      detectSessionInUrl: true,
    },
    // Debug mode i udvikling
    db: {
      schema: 'public',
    },
  }
);

console.log('✅ Supabase klient initialiseret');

// Opret server-side klient med service role
// Dette bruges kun på serveren og har fuld adgang
export const supabaseAdmin = createClient(
  supabaseConfig.url || 'https://placeholder.supabase.co',
  supabaseConfig.serviceRoleKey || 'placeholder-service-key',
  {
    auth: {
      // Ingen session persistence på serveren
      persistSession: false,
    },
  }
);

console.log('✅ Supabase admin klient initialiseret');

// Hjælpefunktioner til database operationer

/**
 * Hent bruger fra session
 * @returns Bruger objekt eller null hvis ikke logget ind
 */
export async function getCurrentUser() {
  console.log('👤 Henter nuværende bruger...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Fejl ved hentning af bruger:', error.message);
      return null;
    }
    
    if (user) {
      console.log('✅ Bruger fundet:', user.email);
      return user;
    } else {
      console.log('ℹ️ Ingen bruger logget ind');
      return null;
    }
  } catch (error) {
    console.error('❌ Uventet fejl ved hentning af bruger:', error);
    return null;
  }
}

/**
 * Tjek om bruger er logget ind
 * @returns true hvis bruger er logget ind, false ellers
 */
export async function isAuthenticated() {
  console.log('🔐 Tjekker authentication status...');
  
  const user = await getCurrentUser();
  const isAuth = user !== null;
  
  console.log(`✅ Authentication status: ${isAuth ? 'Logget ind' : 'Ikke logget ind'}`);
  return isAuth;
}

/**
 * Log ud
 * @returns true hvis logout lykkedes, false ellers
 */
export async function signOut() {
  console.log('🚪 Logger bruger ud...');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Fejl ved logout:', error.message);
      return false;
    }
    
    console.log('✅ Bruger logget ud succesfuldt');
    return true;
  } catch (error) {
    console.error('❌ Uventet fejl ved logout:', error);
    return false;
  }
}

/**
 * Hent session
 * @returns Session objekt eller null
 */
export async function getSession() {
  console.log('📋 Henter session...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Fejl ved hentning af session:', error.message);
      return null;
    }
    
    if (session) {
      console.log('✅ Session fundet');
      return session;
    } else {
      console.log('ℹ️ Ingen aktiv session');
      return null;
    }
  } catch (error) {
    console.error('❌ Uventet fejl ved hentning af session:', error);
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