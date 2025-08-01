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
  console.log('🔧 getAppUrl() kaldt med request:', !!request);
  
  // Hvis vi har en request, brug den til at bestemme URL
  if (request) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    
    console.log('📡 Request headers:', {
      host,
      protocol,
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-vercel-id': request.headers.get('x-vercel-id')
    });
    
    if (host) {
      const url = `${protocol}://${host}`;
      console.log('✅ URL bestemt fra request:', url);
      return url;
    }
  }
  
  // Fallback til environment variabler
  if (IS_VERCEL && VERCEL_URL) {
    const url = `https://${VERCEL_URL}`;
    console.log('✅ URL bestemt fra VERCEL_URL:', url);
    return url;
  }
  
  // Fiskelogistikgruppen specifik produktions-URL
  if (IS_PRODUCTION && !IS_DEVELOPMENT) {
    const url = 'https://fiskelogistik-online.vercel.app';
    console.log('✅ URL bestemt fra production fallback:', url);
    return url;
  }
  
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log('✅ URL bestemt fra environment/fallback:', url);
  return url;
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

// Mailjet konfiguration
export const MAILJET_CONFIG = {
  apiKeyPublic: process.env.MJ_APIKEY_PUBLIC!,
  apiKeyPrivate: process.env.MJ_APIKEY_PRIVATE!,
  senderEmail: process.env.MJ_SENDER_EMAIL!,
  senderName: process.env.MJ_SENDER_NAME!,
  testEmail: process.env.TEST_EMAIL!,
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
  
  // Mailjet
  if (!MAILJET_CONFIG.apiKeyPublic) errors.push('MJ_APIKEY_PUBLIC mangler');
  if (!MAILJET_CONFIG.apiKeyPrivate) errors.push('MJ_APIKEY_PRIVATE mangler');
  if (!MAILJET_CONFIG.senderEmail) errors.push('MJ_SENDER_EMAIL mangler');
  if (!MAILJET_CONFIG.senderName) errors.push('MJ_SENDER_NAME mangler');
  
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
  MAILJET_CONFIG,
  BROWSERLESS_CONFIG,
  SECURITY_CONFIG,
  DEBUG_CONFIG,
  validateEnvironment,
}; 