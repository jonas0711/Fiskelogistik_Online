/**
 * RIO Rapporter Side
 * Side til at generere rapporter over chaufførdata
 * Dedikeret til rapport generering med Word og PDF format
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
import ReportGenerator from '@/components/ReportGenerator'; // Rapportgenerator komponent
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner

export default function RIOReportsPage() {
  console.log('📋 Initialiserer RIO Reports Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  /**
   * Tjekker bruger session
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session...');
    
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for rapporter:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for rapporter:', adminStatus);
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for rapporter:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [router]);
  
  console.log('🎨 Renderer RIO Reports Page...');
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Fælles header med navigation */}
      <CommonHeader 
        title="FSK Online"
        subtitle="RIO Program - Rapport Generering"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rapport Generering
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Generer professionelle Word og PDF rapporter over chaufførdata
          </p>
        </div>
        
        {/* Rapport Generator */}
        <ReportGenerator />
      </main>
    </div>
  );
} 