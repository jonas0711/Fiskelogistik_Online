/**
 * RIO Program Hovedside (Server Component)
 * Hovedside for Fiskelogistik RIO Program
 * Viser navigation til alle RIO funktioner
 * LØSNING: Server-side session validering med createServerClient
 */

import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import RIONavigation from '@/components/RIONavigation';
import { redirect } from 'next/navigation';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * Server-side session validering komponent
 * Kører på serveren og validerer session før rendering
 */
async function validateServerSession() {
  console.log(`${LOG_PREFIXES.home} Initialiserer RIO Home Page (Server-side)...`);
  
  try {
    // Cache cookies for at undgå gentagne læsninger
    const cookieStore = await cookies();
    const cookieCache = new Map<string, string | undefined>();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // Tjek cookie cache først
            if (!cookieCache.has(name)) {
              const cookie = cookieStore.get(name);
              cookieCache.set(name, cookie?.value);
              if (name === 'sb-unulsegoxmmabkhtaslt-auth-token') {
                console.log(`[AUTH] Cookie status for ${name}:`, cookie?.value ? 'fundet' : 'ikke fundet');
              }
            }
            return cookieCache.get(name);
          },
          set: () => {
            // No-op - Server components kan ikke sætte cookies
          },
          remove: () => {
            // No-op - Server components kan ikke fjerne cookies
          }
        },
      }
    );

    // Valider bruger først (mere sikker)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error(`Bruger validering fejlede: ${userError?.message || 'Ingen bruger fundet'}`);
    }

    // Tjek session efter bruger validering
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error(`Session validering fejlede: ${sessionError?.message || 'Ingen session fundet'}`);
    }
    
    const sessionInfo = {
      user: user.email,
      role: user.user_metadata?.role || 'user',
      sessionExpires: session.expires_at 
        ? new Date(session.expires_at * 1000).toISOString()
        : 'No expiry set'
    };
    
    console.log(`${LOG_PREFIXES.success} Server-side authentication valideret:`, sessionInfo);
    
    return {
      user,
      session
    };
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved server-side validering:`, error);
    redirect('/');
  }
}

/**
 * Loading komponent
 */
function RIOHomePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}

/**
 * Hovedkomponent med Suspense wrapper
 */
/**
 * Error boundary komponent
 */
function RIOHomePageError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 mb-4">Session udløbet - venligst log ind igen</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Gå til login
        </button>
      </div>
    </div>
  );
}

export default async function RIOHomePage() {
  console.log(`${LOG_PREFIXES.render} Renderer RIO Home Page...`);
  
  try {
    // Valider session på server-side
    const { user } = await validateServerSession();
    
    // Bruger er valideret, render navigation
    return (
      <Suspense fallback={<RIOHomePageLoading />}>
        <RIONavigation isAdmin={user.user_metadata?.role === 'admin'} />
      </Suspense>
    );
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Authentication fejl:`, error);
    redirect('/');
  }
}