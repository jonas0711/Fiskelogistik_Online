/**
 * Central konfigurationsfil for FSK Online Dashboard
 * Her definerer vi alle miljøvariabler og app-indstillinger
 */

// Supabase konfiguration
export const supabaseConfig = {
  // URL til dit Supabase projekt
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  // Anonym nøgle til client-side operationer
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  // Service role nøgle til server-side operationer (kun på serveren)
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// App konfiguration
export const appConfig = {
  // App URL (bruges til redirects)
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // App navn
  name: 'FSK Online Dashboard',
  // App beskrivelse
  description: 'Privat dashboard kun for ejeren',
  // Invitation redirect URL
  inviteRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite`,
};

// Sikkerhedskonfiguration
export const securityConfig = {
  // Whitelisted email adresser (komma-separeret)
  whitelistedEmails: process.env.WHITELISTED_EMAILS?.split(',') || [],
  // Session timeout i sekunder (24 timer)
  sessionTimeout: 24 * 60 * 60,
};

// Database konfiguration
export const dbConfig = {
  // Standard felter for alle tabeller
  standardFields: {
    id: 'uuid primary key default gen_random_uuid()',
    owner: 'uuid references auth.users(id)',
    created_at: 'timestamptz default now()',
    updated_at: 'timestamptz default now()',
    deleted_at: 'timestamptz nullable',
  },
  // RLS (Row Level Security) skal være aktivt
  enableRLS: true,
};

// Validering af konfiguration
export function validateConfig() {
  console.log('🔧 Validerer app konfiguration...');
  
  // Tjek om Supabase variabler er sat
  if (!supabaseConfig.url) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL mangler');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL er påkrævet');
  }
  
  if (!supabaseConfig.anonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY mangler');
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY er påkrævet');
  }
  
  if (!supabaseConfig.serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY mangler');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY er påkrævet');
  }
  
  // Tjek om der er whitelisted emails
  if (securityConfig.whitelistedEmails.length === 0) {
    console.warn('⚠️ Ingen whitelisted emails fundet');
  } else {
    console.log(`✅ ${securityConfig.whitelistedEmails.length} whitelisted emails fundet`);
  }
  
  console.log('✅ Konfiguration valideret succesfuldt');
}

// Eksporter alle konfigurationer
export default {
  supabase: supabaseConfig,
  app: appConfig,
  security: securityConfig,
  db: dbConfig,
}; 