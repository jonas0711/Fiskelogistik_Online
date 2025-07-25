/**
 * RIO Program Hovedside
 * Hovedside for Fiskelogistik RIO Program
 * Viser navigation til alle RIO funktioner
 * LØSNING: Server-side session validering for at undgå timing problemer
 */

import { Suspense } from 'react'; // React Suspense for loading states
import RIONavigation from '@/components/RIONavigation'; // Vores RIO navigation komponent
import { createServerClient } from '@supabase/ssr'; // Supabase SSR client
import { cookies } from 'next/headers'; // Next.js cookies API
import { redirect } from 'next/navigation'; // Next.js redirect
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * Server-side session validering komponent
 * Kører på serveren og validerer session før rendering
 */
async function RIOHomePageServer() {
  console.log(`${LOG_PREFIXES.home} Initialiserer RIO Home Page (Server-side)...`);
  
  // Hent cookies fra server
  const cookieStore = await cookies();
  
  // Opret Supabase server client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Server-side cookies håndteres automatisk
        },
        remove() {
          // Server-side cookies håndteres automatisk
        },
      },
    }
  );
  
  // Valider session på serveren
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    console.log(`${LOG_PREFIXES.info} Ingen gyldig session på server - redirecter til login`);
    redirect('/');
  }
  
  console.log(`${LOG_PREFIXES.success} Server-side session valideret for:`, session.user?.email);
  
  // Tjek om bruger er admin (server-side)
  const { data: { user } } = await supabase.auth.getUser();
  const isUserAdmin = user?.user_metadata?.role === 'admin';
  
  console.log(`${LOG_PREFIXES.user} Server-side admin status:`, isUserAdmin);
  
  // Returner RIO Navigation komponent med admin status
  return <RIONavigation isAdmin={isUserAdmin} />;
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
export default function RIOHomePage() {
  console.log(`${LOG_PREFIXES.render} Renderer RIO Home Page...`);
  
  return (
    <Suspense fallback={<RIOHomePageLoading />}>
      <RIOHomePageServer />
    </Suspense>
  );
} 