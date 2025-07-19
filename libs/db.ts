/**
 * Database forbindelse til Supabase
 * Denne fil håndterer al kommunikation med databasen
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Singleton pattern for at undgå multiple instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Tjek om miljøvariabler er sat
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.warn('⚠️ Supabase miljøvariabler ikke sat - klient vil ikke fungere korrekt');
}

/**
 * Opret eller hent eksisterende Supabase klient
 * Singleton pattern for at undgå multiple GoTrueClient instances
 */
function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('🔌 Initialiserer Supabase klient...');
    
    supabaseInstance = createClient(
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
  }
  
  return supabaseInstance;
}

/**
 * Opret eller hent eksisterende Supabase admin klient
 * Singleton pattern for at undgå multiple instances
 */
function getSupabaseAdminClient() {
  if (!supabaseAdminInstance) {
    const serviceKey = supabaseConfig.serviceRoleKey || 'placeholder-service-key';
    supabaseAdminInstance = createClient(
      supabaseConfig.url || 'https://placeholder.supabase.co',
      serviceKey,
      {
        auth: {
          // Ingen session persistence på serveren
          persistSession: false as const,
        },
      }
    );
    
    console.log('✅ Supabase admin klient initialiseret');
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