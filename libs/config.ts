/**
 * Central konfiguration for FSK Online Dashboard
 * Indeholder alle environment variabler og applikationsindstillinger
 * LØSNING: Vercel-specifik konfiguration tilføjet
 */

// Supabase konfiguration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Applikations konfiguration
export const APP_NAME = 'FSK Online';
export const APP_DESCRIPTION = 'Fiskelogistikgruppen Dashboard';
export const APP_VERSION = '1.0.0';

// Environment detection
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';

// Vercel-specifik konfiguration
export const IS_VERCEL = process.env.VERCEL === '1';
export const VERCEL_ENVIRONMENT = process.env.VERCEL_ENV || 'development';
export const VERCEL_URL = process.env.VERCEL_URL;
export const VERCEL_REGION = process.env.VERCEL_REGION;

// App URL konfiguration med Vercel support
export function getAppUrl(request?: Request): string {
  // Hvis vi har en request, brug den til at bestemme URL
  if (request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  }
  
  // Fallback til environment variabler
  if (IS_VERCEL && VERCEL_URL) {
    return `https://${VERCEL_URL}`;
  }
  
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// Cookie konfiguration baseret på environment
export function getCookieConfig(request?: Request) {
  const isVercel = IS_VERCEL || (request?.headers.get('x-vercel-id') !== null);
  const isProduction = IS_PRODUCTION || isVercel;
  
  console.log('🍪 Cookie config:', {
    isVercel,
    isProduction,
    vercelEnv: VERCEL_ENVIRONMENT,
    vercelUrl: VERCEL_URL
  });
  
  return {
    httpOnly: true,
    secure: isProduction, // HTTPS kun på production/Vercel
    sameSite: 'lax' as const, // Lax for kompatibilitet med redirects
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dage
  };
}

// Mail konfiguration
export const SMTP_CONFIG = {
  server: process.env.SMTP_SERVER!,
  port: parseInt(process.env.SMTP_PORT || '587'),
  email: process.env.EMAIL!,
  testEmail: process.env.TEST_EMAIL!,
  appPassword: process.env.APP_PASSWORD!,
};

// Browserless konfiguration
export const BROWSERLESS_CONFIG = {
  token: process.env.BROWSERLESS_TOKEN!,
  serviceProvider: process.env.PUPPETEER_SERVICE_PROVIDER!,
  pdfStrategy: process.env.PDF_GENERATION_STRATEGY!,
};

// Security konfiguration
export const SECURITY_CONFIG = {
  sessionTimeout: 60 * 60 * 24 * 7, // 7 dage i sekunder
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60, // 15 minutter i sekunder
};

// Debug konfiguration
export const DEBUG_CONFIG = {
  enabled: IS_DEVELOPMENT || process.env.DEBUG === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  verbose: process.env.VERBOSE === 'true',
};

// Validerer at alle påkrævede environment variabler er sat
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Supabase
  if (!SUPABASE_URL) errors.push('NEXT_PUBLIC_SUPABASE_URL mangler');
  if (!SUPABASE_ANON_KEY) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY mangler');
  if (!SUPABASE_SERVICE_ROLE_KEY) errors.push('SUPABASE_SERVICE_ROLE_KEY mangler');
  
  // Mail
  if (!SMTP_CONFIG.server) errors.push('SMTP_SERVER mangler');
  if (!SMTP_CONFIG.email) errors.push('EMAIL mangler');
  if (!SMTP_CONFIG.appPassword) errors.push('APP_PASSWORD mangler');
  
  // Browserless
  if (!BROWSERLESS_CONFIG.token) errors.push('BROWSERLESS_TOKEN mangler');
  
  const isValid = errors.length === 0;
  
  if (!isValid) {
    console.error('❌ Environment validering fejlede:', errors);
  } else {
    console.log('✅ Environment validering succesfuld');
  }
  
  return { isValid, errors };
}

// Eksporter alle konfigurationer som default export
export default {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  APP_NAME,
  APP_DESCRIPTION,
  APP_VERSION,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
  IS_VERCEL,
  VERCEL_ENVIRONMENT,
  VERCEL_URL,
  VERCEL_REGION,
  getAppUrl,
  getCookieConfig,
  SMTP_CONFIG,
  BROWSERLESS_CONFIG,
  SECURITY_CONFIG,
  DEBUG_CONFIG,
  validateEnvironment,
}; 