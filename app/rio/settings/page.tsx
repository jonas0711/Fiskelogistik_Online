/**
 * RIO Indstillinger Side
 * Side til system indstillinger og konfiguration
 * Viser forskellige indstillinger for RIO systemet
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

export default function RIOSettingsPage() {
  console.log('⚙️ Initialiserer RIO Settings Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [lastLogin, setLastLogin] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [minDistanceFilter, setMinDistanceFilter] = useState(100); // Minimum kørestrækning filter
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  /**
   * Tjekker bruger session og henter brugerdata
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session og henter brugerdata...');
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for indstillinger:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for indstillinger:', adminStatus);
        
        // Hent brugerdata
        setUserEmail(session.user?.email || '');
        setLastLogin(session.user?.last_sign_in_at ? 
          new Date(session.user.last_sign_in_at).toLocaleDateString('da-DK') : 
          'Ikke tilgængelig'
        );
        
        // Hent gemte indstillinger fra localStorage
        const savedDarkMode = localStorage.getItem('rio-dark-mode') === 'true';
        const savedNotifications = localStorage.getItem('rio-notifications') !== 'false';
        const savedAutoRefresh = localStorage.getItem('rio-auto-refresh') !== 'false';
        const savedMinDistance = localStorage.getItem('rio-min-distance');
        
        setIsDarkMode(savedDarkMode);
        setNotificationsEnabled(savedNotifications);
        setAutoRefresh(savedAutoRefresh);
        setMinDistanceFilter(savedMinDistance ? parseInt(savedMinDistance) : 100);
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for indstillinger:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
  }, [router]);
  
  /**
   * Håndterer dark mode toggle
   */
  const handleDarkModeToggle = () => {
    console.log('🌙 Toggler dark mode...');
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('rio-dark-mode', newDarkMode.toString());
    
    // Anvend dark mode til body
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast.success(`Dark mode ${newDarkMode ? 'aktiveret' : 'deaktiveret'}`);
  };
  
  /**
   * Håndterer notifications toggle
   */
  const handleNotificationsToggle = () => {
    console.log('🔔 Toggler notifications...');
    const newNotifications = !notificationsEnabled;
    setNotificationsEnabled(newNotifications);
    localStorage.setItem('rio-notifications', newNotifications.toString());
    
    toast.success(`Notifikationer ${newNotifications ? 'aktiveret' : 'deaktiveret'}`);
  };
  
  /**
   * Håndterer auto refresh toggle
   */
  const handleAutoRefreshToggle = () => {
    console.log('🔄 Toggler auto refresh...');
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    localStorage.setItem('rio-auto-refresh', newAutoRefresh.toString());
    
    toast.success(`Auto refresh ${newAutoRefresh ? 'aktiveret' : 'deaktiveret'}`);
  };
  
  /**
   * Håndterer minimum kørestrækning ændring
   */
  const handleMinDistanceChange = (value: number) => {
    console.log('📏 Ændrer minimum kørestrækning til:', value);
    setMinDistanceFilter(value);
    localStorage.setItem('rio-min-distance', value.toString());
    
    toast.success(`Minimum kørestrækning sat til ${value} km`);
  };
  
  /**
   * Håndterer password ændring
   */
  const handlePasswordChange = async () => {
    console.log('🔐 Starter password reset...');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/set-password`
      });
      
      if (error) {
        console.error('❌ Fejl ved password reset:', error);
        toast.error('Kunne ikke sende password reset email');
        return;
      }
      
      console.log('✅ Password reset email sendt');
      toast.success('Password reset email sendt til din email');
      
    } catch (error) {
      console.error('❌ Uventet fejl ved password reset:', error);
      toast.error('Der opstod en fejl ved password reset');
    }
  };
  
  /**
   * Håndterer log ud
   */
  const handleLogout = async () => {
    console.log('🚪 Logger ud...');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Fejl ved log ud:', error);
        toast.error('Kunne ikke logge ud');
        return;
      }
      
      console.log('✅ Logget ud succesfuldt');
      router.push('/');
      
    } catch (error) {
      console.error('❌ Uventet fejl ved log ud:', error);
      toast.error('Der opstod en fejl ved log ud');
    }
  };
  
  /**
   * Eksporterer brugerdata
   */
  const exportUserData = () => {
    console.log('📤 Eksporterer brugerdata...');
    
    const userData = {
      email: userEmail,
      lastLogin: lastLogin,
      settings: {
        darkMode: isDarkMode,
        notifications: notificationsEnabled,
        autoRefresh: autoRefresh
      },
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rio-user-data-${userEmail}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Brugerdata eksporteret');
  };
  
  console.log('🎨 Renderer RIO Settings Page...');
  
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
        subtitle="RIO Program - Indstillinger"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            System Indstillinger
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Administrer dine indstillinger og system konfiguration
          </p>
        </div>
        
        {/* User information */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Bruger Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  value={userEmail}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sidste login
                </Label>
                <Input
                  value={lastLogin}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePasswordChange}
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                🔐 Skift Password
              </Button>
              <Button
                onClick={exportUserData}
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                📤 Eksporter Data
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Display settings */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Visning og Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dark Mode
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Skift mellem lyst og mørkt tema
                </p>
              </div>
              <Button
                onClick={handleDarkModeToggle}
                variant={isDarkMode ? 'default' : 'outline'}
                size="sm"
                className={isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : ''}
              >
                {isDarkMode ? '🌙 Aktiveret' : '☀️ Deaktiveret'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Notification settings */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifikationer og Opdateringer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notifikationer
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Modtag beskeder om system opdateringer
                </p>
              </div>
              <Button
                onClick={handleNotificationsToggle}
                variant={notificationsEnabled ? 'default' : 'outline'}
                size="sm"
                className={notificationsEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {notificationsEnabled ? '🔔 Aktiveret' : '🔕 Deaktiveret'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Refresh
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatisk opdatering af data
                </p>
              </div>
              <Button
                onClick={handleAutoRefreshToggle}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                className={autoRefresh ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                {autoRefresh ? '🔄 Aktiveret' : '⏸️ Deaktiveret'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Minimum Kørestrækning (km)
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Filtrer chauffører med mindst denne kørestrækning i KPI
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={minDistanceFilter}
                  onChange={(e) => handleMinDistanceChange(parseInt(e.target.value) || 100)}
                  className="w-20 text-center"
                  min="0"
                  step="10"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">km</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* System information */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Platform:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Next.js 14</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Database:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Supabase</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Styling:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Tailwind CSS</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">UI Kit:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">ShadCN/UI</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Account actions */}
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-600 dark:text-red-400">
              Konto Handlinger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                🚪 Log Ud
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Bemærk: Log ud vil afbryde din session og du skal logge ind igen
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 