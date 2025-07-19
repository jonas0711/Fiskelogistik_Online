/**
 * Admin Dashboard Side
 * Side kun for admins til at administrere systemet
 * Inkluderer invitation af nye brugere
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '../../libs/admin';
import InviteUserForm from '../../components/InviteUserForm';
import SystemStats from '../../components/SystemStats';
import UserList from '../../components/UserList';
import { Button } from '../../components/ui/button';
import CommonHeader from '../../components/CommonHeader';
import BreadcrumbNavigation from '../../components/BreadcrumbNavigation';
import ScrollToTop from '../../components/ScrollToTop';

/**
 * Database Setup Button komponent
 * Kører database setup via API
 */
function DatabaseSetupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const runDatabaseSetup = async () => {
    console.log('🔍 Starter database verifikation...');
    setIsLoading(true);
    setStatus('idle');
    setMessage('');
    
    try {
      // Hent auth token
      const { data: { session } } = await fetch('/api/auth/session').then(res => res.json());
      
      if (!session?.access_token) {
        throw new Error('Ingen session token fundet');
      }
      
      // Kald database setup API
      const response = await fetch('/api/admin/setup-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Database verifikation fuldført:', result);
        setStatus('success');
        setMessage(result.message || 'Database er klar til brug');
      } else {
        console.error('❌ Database verifikation fejlede:', result);
        setStatus('error');
        setMessage(result.error || 'Database verifikation fejlede');
      }
      
    } catch (error) {
      console.error('❌ Fejl ved database verifikation:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Button
        onClick={runDatabaseSetup}
        disabled={isLoading}
        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verificerer...
          </>
        ) : (
          'Verificer Database'
        )}
      </Button>
      
      {status === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 text-sm">{message}</span>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-800 text-sm">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Admin Dashboard Page komponent
 * @returns JSX element
 */
export default function AdminDashboardPage() {
  console.log('🏠 Renderer admin dashboard...');
  
  const router = useRouter();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tjek admin status når komponenten loader
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('🔍 Tjekker admin status...');
      
      try {
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        
        if (!adminStatus) {
          console.log('❌ Bruger er ikke admin, redirecter til RIO programmet');
          router.push('/rio');
        } else {
          console.log('✅ Admin autorisation bekræftet');
        }
      } catch (error) {
        console.error('❌ Fejl ved admin tjek:', error);
        router.push('/rio');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router]);
  
  // Vis loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Vis kun admin indhold hvis bruger er admin
  if (!isUserAdmin) {
    return null; // Router vil håndtere redirect
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Fælles header med navigation */}
      <CommonHeader 
        title="FSK Online"
        subtitle="Admin Dashboard - Fiskelogistikgruppen"
        backPath="/rio"
        isAdmin={isUserAdmin}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            👑 Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Administrer systemet og inviter nye brugere
          </p>
        </div>
        
        {/* Admin funktioner grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Invitation sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Inviter nye brugere
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Send invitationer til nye brugere. De vil modtage en email med et link til at oprette deres konto.
            </p>
            <InviteUserForm />
          </div>
          
          {/* Database Setup sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Database Setup
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Verificer og opdater driver_data tabellen. Tabellen indeholder allerede alle nødvendige kolonner for RIO programmet.
            </p>
            <DatabaseSetupButton />
          </div>
          
          {/* Statistik sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                System statistik
              </h2>
            </div>
            <SystemStats />
          </div>
        </div>
        
        {/* Brugerliste sektion */}
        <div className="mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Registrerede brugere
              </h2>
            </div>
            <UserList />
          </div>
        </div>
        
        {/* Seneste aktiviteter */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Seneste aktiviteter
            </h2>
          </div>
          <div className="text-gray-600 text-center py-8">
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg">Ingen aktiviteter at vise endnu</p>
              <p className="text-sm text-gray-500 mt-2">Aktiviteter vil vises her når brugere interagerer med systemet</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll til toppen knap */}
      <ScrollToTop />
    </div>
  );
} 