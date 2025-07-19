/**
 * Admin Dashboard Side
 * Side kun for admins til at administrere systemet
 * Inkluderer invitation af nye brugere
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../libs/db';
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
      // Hent auth token fra Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session fejl: ${sessionError.message}`);
      }
      
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
 * Data Cleanup Button komponent
 * Fjerner disclaimer data fra databasen
 */
function DataCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [recordsRemoved, setRecordsRemoved] = useState(0);
  const [totalScanned, setTotalScanned] = useState(0);
  
    const runDataCleanup = async () => {
    console.log('🧹 Starter data cleanup...');
    setIsLoading(true);
    setStatus('idle');
    setMessage('');
    setRecordsRemoved(0);
    setTotalScanned(0);
    
    try {
      // Først test API forbindelse
      console.log('🧪 Tester API forbindelse...');
      const testResponse = await fetch('/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!testResponse.ok) {
        throw new Error(`API test fejlede: ${testResponse.status}`);
      }
      
      const testResult = await testResponse.json();
      console.log('✅ API test succesfuld:', testResult);
      
      // Test debug endpoint
      console.log('🐛 Tester debug endpoint...');
      const debugResponse = await fetch('/api/admin/debug', {
        method: 'GET',
      });
      
      if (debugResponse.ok) {
        const debugResult = await debugResponse.json();
        console.log('✅ Debug test succesfuld:', debugResult);
      } else {
        console.warn('⚠️ Debug endpoint fejlede:', debugResponse.status);
      }
      
      // Hent auth token fra Supabase session
      console.log('🔐 Henter session token...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session fejl: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('Ingen aktiv session fundet');
      }
      
      const token = session.access_token;
      console.log('✅ Token hentet, længde:', token.length);
      
      // Kald cleanup API
      console.log('🧹 Kalder cleanup API...');
      const response = await fetch('/api/admin/cleanup-disclaimer-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Cleanup response status:', response.status);
      console.log('📊 Cleanup response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Cleanup API fejlede:', errorText);
        throw new Error(`Cleanup API fejlede: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Data cleanup fuldført:', result);
      
      setStatus('success');
      setMessage(result.message || 'Data cleanup fuldført');
      setRecordsRemoved(result.recordsRemoved || 0);
      setTotalScanned(result.totalRecordsScanned || 0);
      
    } catch (error) {
      console.error('❌ Fejl ved data cleanup:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Button
        onClick={runDataCleanup}
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Rydder op...
          </>
        ) : (
          'Ryd Op i Data'
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
          {recordsRemoved > 0 && (
            <p className="text-green-700 text-xs mt-1">
              {recordsRemoved} records fjernet af {totalScanned} scanned
            </p>
          )}
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
 * View Driver Data Button komponent
 * Viser alle chaufførdata og giver mulighed for at slette specifikke records
 */
// Definer interface for driver data
interface DriverRecord {
  id: string;
  driver_name: string;
  month: number;
  year: number;
  created_at: string;
  [key: string]: string | number | boolean; // Tillad andre felter med specifikke typer
}

function ViewDriverDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [problematicData, setProblematicData] = useState<DriverRecord[]>([]);
  
  const viewDriverData = async () => {
    console.log('👁️ Henter chaufførdata...');
    setIsLoading(true);
    setStatus('idle');
    setMessage('');
    
    try {
      // Hent auth token fra Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session fejl: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        throw new Error('Ingen session token fundet');
      }
      
      // Kald view driver data API
      const response = await fetch('/api/admin/view-driver-data', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Driver data hentet:', result);
        setStatus('success');
        setMessage(`Hentet ${result.totalRecords} records (${result.problematicRecords} problematiske)`);
        setProblematicData(result.problematicRecordsList || []);
      } else {
        console.error('❌ Hentning af driver data fejlede:', result);
        setStatus('error');
        setMessage(result.error || 'Hentning af data fejlede');
      }
      
    } catch (error) {
      console.error('❌ Fejl ved hentning af driver data:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteRecord = async (recordId: string) => {
    console.log('🗑️ Sletter record:', recordId);
    
    try {
      // Hent auth token fra Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session fejl: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        throw new Error('Ingen session token fundet');
      }
      
      // Kald delete API
      const response = await fetch('/api/admin/delete-driver-record', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Record slettet:', result);
        // Opdater data
        setProblematicData(prev => prev.filter(record => record.id !== recordId));
        setMessage(`Record slettet: ${result.deletedRecordId}`);
      } else {
        console.error('❌ Sletning fejlede:', result);
        setStatus('error');
        setMessage(result.error || 'Sletning fejlede');
      }
      
    } catch (error) {
      console.error('❌ Fejl ved sletning:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Uventet fejl');
    }
  };
  
  return (
    <div className="space-y-4">
      <Button
        onClick={viewDriverData}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Henter data...
          </>
        ) : (
          'Se Chaufførdata'
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
      
      {/* Vis problematiske records */}
      {problematicData.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-red-700 mb-2">Problematiske Records:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {problematicData.map((record) => (
              <div key={record.id} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-red-800">{record.driver_name}</p>
                    <p className="text-red-600 text-xs">
                      {record.month}/{record.year} - Oprettet: {new Date(record.created_at).toLocaleDateString('da-DK')}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteRecord(record.id)}
                    size="sm"
                    className="ml-2 bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    Slet
                  </Button>
                </div>
              </div>
            ))}
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
        // Hent nuværende session fra Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Fejl ved hentning af session:', error);
          router.push('/rio');
          return;
        }
        
        if (!session) {
          console.log('❌ Ingen session fundet, redirecter til login');
          router.push('/');
          return;
        }
        
        console.log('👤 Session fundet for bruger:', session.user.email);
        
        // Tjek om bruger er admin
        const userRoles = session.user.app_metadata?.roles || [];
        const isAdminFlag = session.user.app_metadata?.is_admin;
        
        console.log('🔍 Bruger roller:', userRoles);
        console.log('🔍 Admin flag:', isAdminFlag);
        
        const isAdminUser = userRoles.includes('admin') || isAdminFlag === true;
        setIsUserAdmin(isAdminUser);
        
        if (!isAdminUser) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser admin dashboard...</p>
        </div>
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
        
        {/* Admin funktioner grid - Forbedret responsivt layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Invitation sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Inviter nye brugere
              </h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Send invitationer til nye brugere. De vil modtage en email med et link til at oprette deres konto.
            </p>
            <InviteUserForm />
          </div>
          
          {/* Database Setup sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Database Setup
              </h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Verificer og opdater driver_data tabellen. Tabellen indeholder allerede alle nødvendige kolonner for RIO programmet.
            </p>
            <DatabaseSetupButton />
          </div>
          
          {/* Data Cleanup sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Data Cleanup
              </h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Fjern ugyldige chaufførdata der indeholder disclaimer tekst eller andre ugyldige data fra databasen.
            </p>
            <DataCleanupButton />
          </div>
          
          {/* Statistik sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                System statistik
              </h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Oversigt over systemets brug og aktivitet
            </p>
            <SystemStats />
          </div>
          
          {/* Chaufførdata sektion */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Chaufførdata
              </h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Se og administrer chaufførdata. Identificer og slet problematiske records med disclaimer tekst.
            </p>
            <ViewDriverDataButton />
          </div>
        </div>
        
        {/* Brugerliste sektion - Forbedret layout */}
        <div className="mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Registrerede brugere
                </h2>
                <p className="text-gray-600 mt-1">
                  Administrer alle brugere i systemet
                </p>
              </div>
            </div>
            <UserList />
          </div>
        </div>
        
        {/* Seneste aktiviteter - Forbedret layout */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Seneste aktiviteter
              </h2>
              <p className="text-gray-600 mt-1">
                Oversigt over system aktiviteter
              </p>
            </div>
          </div>
          <div className="text-gray-600 text-center py-12">
            <div className="flex flex-col items-center">
              <svg className="w-16 h-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xl font-medium text-gray-700 mb-2">Ingen aktiviteter at vise endnu</p>
              <p className="text-gray-500">Aktiviteter vil vises her når brugere interagerer med systemet</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll til toppen knap */}
      <ScrollToTop />
    </div>
  );
} 