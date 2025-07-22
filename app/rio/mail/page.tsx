/**
 * RIO Mail System Side
 * Central side til mail funktionalitet i RIO programmet
 * Integrerer alle mail komponenter og funktionalitet
 * Baseret på Python ReportMailWindow funktionalitet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CommonHeader from '@/components/CommonHeader';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import DriverEmailModal from '@/components/DriverEmailModal';
import ReportMailInterface from '@/components/ReportMailInterface';
import { supabase } from '@/libs/db';
import { isAdmin } from '@/libs/admin';
import { toast } from 'sonner';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { Settings, Users, Send, Database } from 'lucide-react';

export default function RIOMailPage() {
  console.log(`${LOG_PREFIXES.render} Initialiserer RIO Mail System Side...`);
  
  const router = useRouter();
  
  // State til loading og authentication
  const [isLoading, setIsLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // State til modal håndtering
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showMailInterface, setShowMailInterface] = useState(false);
  
  // State til mail system status
  const [mailConfigured, setMailConfigured] = useState(false);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [driversWithEmail, setDriversWithEmail] = useState(0);
  
  /**
   * Henter mail system status og statistikker
   */
  const loadMailSystemStatus = useCallback(async () => {
    console.log(`${LOG_PREFIXES.search} Henter mail system status...`);
    
    try {
      // Tjek mail konfiguration (kun admin)
      if (isUserAdmin) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const response = await fetch('/api/admin/mail-config', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              setMailConfigured(data.success && data.configured);
            }
          }
        } catch (error) {
          console.log(`${LOG_PREFIXES.warning} Kunne ikke hente mail konfiguration:`, error);
        }
      }
      
      // Hent driver email statistikker
      const { data: emailStats, error: emailError } = await supabase
        .from('driver_emails')
        .select('driver_name, email');
      
      if (!emailError && emailStats) {
        const validEmails = emailStats.filter(stat => 
          stat.email && stat.email.trim() && stat.email.includes('@')
        );
        
        setTotalDrivers(emailStats.length);
        setDriversWithEmail(validEmails.length);
        
        console.log(`${LOG_PREFIXES.success} Email statistikker hentet: ${validEmails.length}/${emailStats.length}`);
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af mail system status:`, error);
    }
  }, [isUserAdmin]);

  /**
   * Tjekker session og indlæser data ved komponent mount
   */
  useEffect(() => {
    console.log(`${LOG_PREFIXES.home} Initialiserer RIO Mail System Side...`);
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log(`${LOG_PREFIXES.success} Session fundet for mail system:`, session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log(`${LOG_PREFIXES.admin} Admin status for mail system:`, adminStatus);
        
        // Hent mail system status
        await loadMailSystemStatus();
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl under session tjek for mail system:`, error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
  }, [router, loadMailSystemStatus]);
  
  /**
   * Håndterer email modal close event
   */
  const handleEmailModalClose = () => {
    setShowEmailModal(false);
    // Reload mail system status
    loadMailSystemStatus();
  };
  
  console.log(`${LOG_PREFIXES.render} Renderer RIO Mail System Side...`);
  
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
        subtitle="RIO Program - Mail System"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📧 Mail System
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Send rapport emails til chauffører og administrer email indstillinger
          </p>
        </div>
        
        {/* Mail system status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Mail konfiguration status */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Settings className={`w-8 h-8 ${mailConfigured ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Mail Konfiguration
                  </h3>
                  <p className={`text-sm ${mailConfigured ? 'text-green-600' : 'text-red-600'}`}>
                    {mailConfigured ? 'Konfigureret' : 'Ikke konfigureret'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Chauffør email status */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Chauffør Emails
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {driversWithEmail} af {totalDrivers} har emails
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Database status */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Database className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Database
                  </h3>
                  <p className="text-sm text-green-600">
                    Forbundet
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Send rapporter */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-6 h-6 text-green-600" />
                <span>Send Rapporter</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Send månedlige rapport emails til chauffører med deres performance data.
              </p>
              <Button 
                onClick={() => setShowMailInterface(true)}
                disabled={!mailConfigured}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                📧 Send Rapporter
              </Button>
              {!mailConfigured && (
                <p className="text-sm text-red-600 mt-2">
                  Mail skal konfigureres først
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Administrer emails */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-blue-600" />
                <span>Administrer Emails</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tilføj, rediger og administrer email adresser for alle chauffører.
              </p>
              <Button 
                onClick={() => setShowEmailModal(true)}
                variant="outline"
                className="w-full text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
              >
                👥 Administrer Emails
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Mail system guide fjernet efter ønske */}
      </main>
      
      {/* Email administration modal */}
      <DriverEmailModal 
        isOpen={showEmailModal}
        onClose={handleEmailModalClose}
        onSaved={(count) => {
          toast.success(`${count} email adresser opdateret`);
          loadMailSystemStatus();
        }}
      />
      
      {/* Report mail interface */}
      <ReportMailInterface 
        isOpen={showMailInterface}
        onClose={() => setShowMailInterface(false)}
      />
    </div>
  );
} 