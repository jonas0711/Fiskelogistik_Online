/**
 * Dashboard Page
 * Hovedside for FSK Online Dashboard
 * Viser oversigt og invitation funktionalitet
 */

'use client'; // Dette gør komponenten til en client-side komponent

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import InviteUserForm from '@/components/InviteUserForm'; // Vores invitation form komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import { supabase } from '../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../libs/admin'; // Admin funktioner
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for bruger data
interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: {
    role?: string;
    is_admin?: boolean;
  };
}

export default function DashboardPage() {
  console.log(`${LOG_PREFIXES.home} Initialiserer Dashboard Page...`);
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til bruger data
  const [user, setUser] = useState<UserData | null>(null);
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  
  // State til show invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  /**
   * Henter bruger data
   */
  useEffect(() => {
    console.log(`${LOG_PREFIXES.search} Henter bruger data...`);
    
    const getUser = async () => {
      try {
        // Hent session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log(`${LOG_PREFIXES.success} Session fundet for:`, session.user?.email);
        
        // Sæt bruger data
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          user_metadata: session.user.user_metadata,
        });
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl under hentning af bruger data:`, error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    getUser();
  }, [router]);
  
  console.log(`${LOG_PREFIXES.render} Renderer Dashboard Page...`);
  
  // Fjernet automatisk redirect - lad brugeren navigere manuelt
  // useEffect(() => {
  //   if (!isLoading) {
  //     console.log('🔄 Redirecter til RIO Program Navigation...');
  //     router.push('/rio');
  //   }
  // }, [isLoading, router]);
  
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
  
  // Vis redirect besked
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Fælles header med navigation */}
      <CommonHeader 
        title="FSK Online"
        subtitle="Fiskelogistikgruppen"
        showBackButton={false}
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Welcome section */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Velkommen til FSK Online
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Dit private forretningsdashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Email
                    </p>
                    <p className="text-lg text-blue-900 dark:text-blue-100">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Status
                    </p>
                    <p className="text-lg text-green-900 dark:text-green-100">
                      Aktiv
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Oprettet:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('da-DK') : 'Ukendt'}
                  </p>
                  {user?.last_sign_in_at && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Sidste login:</strong> {new Date(user.last_sign_in_at).toLocaleDateString('da-DK')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick actions */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  Hurtige Handlinger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isUserAdmin && (
                  <Button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {showInviteForm ? 'Skjul invitation form' : 'Inviter ny bruger'}
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/rio')}
                  >
                    RIO Program
                  </Button>
                  {isUserAdmin && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => router.push('/admin')}
                    >
                      Admin Panel
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <Button variant="outline" className="w-full">
                    Indstillinger
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Invitation section */}
          <div className="space-y-6">
            {showInviteForm ? (
              <InviteUserForm />
            ) : (
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    Bruger Administration
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Administrer brugere og invitationer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isUserAdmin ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Inviter nye brugere
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Klik på &quot;Inviter ny bruger&quot; for at sende invitationer til nye brugere.
                        Kun admins kan sende invitationer.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-900/20 dark:border-gray-800">
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Admin funktioner
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Admin funktioner er kun tilgængelige for administratorer.
                      </p>
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Sikkerhed
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Alle brugere skal have en gyldig invitation og oprette deres eget password.
                      Row Level Security (RLS) er aktivt på alle tabeller.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* System information */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Next.js 14</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Database:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Supabase</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Styling:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Tailwind CSS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">UI Kit:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">ShadCN/UI</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 