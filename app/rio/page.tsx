/**
 * RIO Program Hovedside
 * Hovedside for Fiskelogistik RIO Program
 * Viser navigation til alle RIO funktioner
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import RIONavigation from '@/components/RIONavigation'; // Vores RIO navigation komponent
import { supabase } from '../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../libs/admin'; // Admin funktioner



export default function RIOHomePage() {
  console.log('🏠 Initialiserer RIO Home Page...');
  
  const router = useRouter(); // Next.js router til navigation
  

  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  /**
   * Henter bruger data og tjekker admin status
   */
  useEffect(() => {
    console.log('🔍 Henter bruger data for RIO...');
    
    const getUser = async () => {
      try {
        // Hent session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for RIO:', session.user?.email);
        

        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for RIO:', adminStatus);
        
      } catch (error) {
        console.error('❌ Fejl under hentning af bruger data for RIO:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    getUser();
  }, [router]);
  
  console.log('🎨 Renderer RIO Home Page...');
  
  // Vis loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  // Returner RIO Navigation komponent med admin status
  return <RIONavigation isAdmin={isUserAdmin} />;
} 