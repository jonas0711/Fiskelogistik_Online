/**
 * RIO Driver Email Administration Side
 * Dedikeret side til administration af chauffør email adresser
 * Flyttet fra modal til dedikeret side for bedre brugeroplevelse
 * Inkluderer real-time validering, change tracking og batch opdateringer
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CommonHeader from '@/components/CommonHeader';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import { supabase } from '@/libs/db';
import { isAdmin } from '@/libs/admin';
import { toast } from 'sonner';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { 
  InfoIcon, 
  SuccessIcon, 
  ErrorIcon, 
  WarningIcon,
  FormIcon,
  HomeIcon
} from '@/components/ui/icons';
import { getLatestAvailablePeriod } from '@/libs/utils';

// Interface for chauffør med email status
interface DriverWithEmail {
  name: string;
  email: string;
  hasEmail: boolean;
  isValidEmail: boolean;
  lastReportSent: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isOrphaned?: boolean;
}

export default function DriverEmailsPage() {
  console.log(`${LOG_PREFIXES.home} Initialiserer Driver Email Administration Side...`);
  
  const router = useRouter();
  
  // State for data og UI
  const [drivers, setDrivers] = useState<DriverWithEmail[]>([]);
  const [originalEmails, setOriginalEmails] = useState<Map<string, string>>(new Map());
  const [currentEmails, setCurrentEmails] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Mail sending state
  const [sendingMails, setSendingMails] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);
  
  // Refs til scroll og focus management
  const firstInputRef = useRef<HTMLInputElement>(null);
  
  /**
   * Email validering regex - samme som i API
   */
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  /**
   * Tjekker session og indlæser data ved komponent mount
   */
  useEffect(() => {
    console.log(`${LOG_PREFIXES.auth} Tjekker session og admin status...`);
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error(`${LOG_PREFIXES.error} Ingen gyldig session:`, sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log(`${LOG_PREFIXES.success} Session fundet for email administration:`, session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log(`${LOG_PREFIXES.admin} Admin status for email administration:`, adminStatus);
        
        // Hent chauffør emails
        await loadDriverEmails();
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl under session tjek for email administration:`, error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
  }, [router]);
  
  /**
   * Tjekker for ændringer når emails opdateres
   */
  useEffect(() => {
    console.log(`${LOG_PREFIXES.search} Tjekker for email ændringer...`);
    
    let hasAnyChanges = false;
    const changes: string[] = [];
    
    // Sammenlign current emails med original emails
    for (const [driverName, currentEmail] of currentEmails) {
      const originalEmail = originalEmails.get(driverName) || '';
      if (currentEmail !== originalEmail) {
        hasAnyChanges = true;
        changes.push(`${driverName}: '${currentEmail}' vs '${originalEmail}'`);
        console.log(`📝 Ændring detekteret for ${driverName}: '${currentEmail}' vs '${originalEmail}'`);
      }
    }
    
    console.log(`🔍 Ændringer fundet: ${hasAnyChanges}, Antal ændringer: ${changes.length}`);
    if (changes.length > 0) {
      console.log('📋 Alle ændringer:', changes);
    }
    
    console.log(`🔄 State opdatering: hasChanges fra ${hasChanges} til ${hasAnyChanges}`);
    setHasChanges(hasAnyChanges);
    
    // Nulstil lastSaved hvis der er nye ændringer
    if (hasAnyChanges && !hasChanges) {
      setLastSaved(null);
    }
  }, [currentEmails, originalEmails, hasChanges]);
  
  /**
   * Keyboard event handler
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Gem med Ctrl+S / Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChanges, isSaving]);
  
  /**
   * Henter chauffør emails fra API
   */
  const loadDriverEmails = async () => {
    console.log(`${LOG_PREFIXES.search} Henter chauffør emails fra API...`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ Ingen session tilgængelig for email API kald');
        toast.error('Du skal være logget ind for at administrere emails');
        return;
      }
      
      const response = await fetch('/api/rio/drivers/emails', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${LOG_PREFIXES.success} Chauffør emails hentet:`, data.total, 'chauffører');
      console.log(`${LOG_PREFIXES.info} API response data:`, {
        total: data.total,
        summary: data.summary,
        sampleDrivers: data.drivers?.slice(0, 3) || []
      });
      
      // Detaljeret logging af første chauffør
      if (data.drivers && data.drivers.length > 0) {
        const firstDriver = data.drivers[0];
        console.log(`${LOG_PREFIXES.info} Første chauffør detaljer:`, {
          name: firstDriver.name,
          email: firstDriver.email,
          hasEmail: firstDriver.hasEmail,
          isValidEmail: firstDriver.isValidEmail
        });
      }
      
      setDrivers(data.drivers || []);
      
      // Opret email mappings
      const originalMap = new Map<string, string>();
      const currentMap = new Map<string, string>();
      
      data.drivers?.forEach((driver: DriverWithEmail) => {
        originalMap.set(driver.name, driver.email);
        currentMap.set(driver.name, driver.email);
      });
      
      console.log('📊 Email mappings oprettet:', {
        totalDrivers: data.drivers?.length || 0,
        originalMapSize: originalMap.size,
        currentMapSize: currentMap.size,
        sampleEmails: Array.from(originalMap.entries()).slice(0, 3)
      });
      
      // Detaljeret logging af email mappings
      console.log('🔍 Detaljeret email mappings:', {
        originalMapEntries: Array.from(originalMap.entries()),
        currentMapEntries: Array.from(currentMap.entries())
      });
      
      setOriginalEmails(originalMap);
      
      // Opdater currentEmails med de nye data fra databasen
      // Dette sikrer at UI'en viser de korrekte værdier efter gemning
      setCurrentEmails(prev => {
        console.log('🔄 Opdaterer currentEmails med database data:', {
          prevSize: prev.size,
          newMapSize: currentMap.size,
          isFirstLoad: prev.size === 0
        });
        
        // Altid opdater currentEmails med de nye data fra databasen
        // Dette sikrer at UI'en viser de korrekte værdier
        const updated = new Map(currentMap);
        
        console.log('📥 Opdaterer currentEmails med database værdier:', {
          updatedSize: updated.size,
          sampleEmails: Array.from(updated.entries()).slice(0, 3)
        });
        
        return updated;
      });
      
      console.log('📈 Email summary:', data.summary);
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af chauffør emails:`, error);
      toast.error('Kunne ikke hente chauffør emails');
    }
  };
  
  /**
   * Opdaterer email for en specifik chauffør
   */
  const handleEmailChange = (driverName: string, newEmail: string) => {
    console.log(`📝 Opdaterer email for ${driverName}: ${newEmail}`);
    
    setCurrentEmails(prev => {
      const updated = new Map(prev);
      const oldEmail = updated.get(driverName) || '';
      updated.set(driverName, newEmail);
      
      console.log(`🔄 Email ændring for ${driverName}:`, {
        oldEmail,
        newEmail,
        changed: oldEmail !== newEmail,
        prevSize: prev.size,
        updatedSize: updated.size
      });
      
      return updated;
    });
  };

  /**
   * Sender individuel rapport mail til en chauffør
   */
  const sendIndividualMail = async (driverName: string) => {
    console.log(`📨 Sender individuel mail til ${driverName}...`);
    
    // Tjek om chauffør har gyldig email
    const email = currentEmails.get(driverName);
    if (!email || !isValidEmail(email)) {
      toast.error('Chauffør skal have en gyldig email adresse');
      return;
    }
    
    // Tjek om der er ugemte ændringer
    if (hasChanges) {
      toast.error('Gem email ændringer først');
      return;
    }
    
    // Sæt sending state
    setSendingMails(prev => new Set(prev).add(driverName));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      // Hent den seneste tilgængelige periode fra databasen
      const latestPeriod = await getLatestAvailablePeriod();
      if (!latestPeriod) {
        toast.error('Kunne ikke finde tilgængelige data perioder');
        return;
      }
      
      const { month, year } = latestPeriod;
      console.log(`📅 Bruger seneste tilgængelige periode: ${month}/${year}`);
      
      const response = await fetch('/api/rio/mail/send-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'individual',
          driverIds: [driverName],
          month,
          year,
          minKm: 100,
          testMode: false
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Mail sendt succesfuldt til ${driverName}`);
        toast.success(`Rapport sendt til ${driverName}`);
        
        // Opdater last_report_sent status hvis muligt
        // Dette ville kræve en refresh af driver data
      } else {
        throw new Error(data.message || 'Mail sending fejlede');
      }
      
    } catch (error) {
      console.error(`❌ Mail sending fejl for ${driverName}:`, error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke sende mail');
    } finally {
      setSendingMails(prev => {
        const updated = new Set(prev);
        updated.delete(driverName);
        return updated;
      });
    }
  };

  /**
   * Sender bulk mails til alle chauffører med gyldige emails
   */
  const sendBulkMails = async () => {
    console.log(`📨 Starter bulk mail sending...`);
    
    // Find chauffører med gyldige emails
    const driversWithValidEmails = filteredDrivers.filter(driver => {
      const email = currentEmails.get(driver.name);
      return email && isValidEmail(email);
    });
    
    if (driversWithValidEmails.length === 0) {
      toast.error('Ingen chauffører med gyldige email adresser');
      return;
    }
    
    // Tjek om der er ugemte ændringer
    if (hasChanges) {
      toast.error('Gem email ændringer først');
      return;
    }
    
    // Bekræftelse fra bruger
    const confirmed = window.confirm(
      `Er du sikker på at du vil sende rapporter til ${driversWithValidEmails.length} chauffører?`
    );
    
    if (!confirmed) {
      return;
    }
    
    setIsBulkSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      // Hent den seneste tilgængelige periode fra databasen
      const bulkLatestPeriod = await getLatestAvailablePeriod();
      if (!bulkLatestPeriod) {
        toast.error('Kunne ikke finde tilgængelige data perioder');
        return;
      }
      
      const { month: bulkMonth, year: bulkYear } = bulkLatestPeriod;
      console.log(`📅 Bruger seneste tilgængelige periode: ${bulkMonth}/${bulkYear}`);
      
      const driverIds = driversWithValidEmails.map(d => d.name);
      
      const response = await fetch('/api/rio/mail/send-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'bulk',
          driverIds,
          month: bulkMonth,
          year: bulkYear,
          minKm: 100,
          testMode: false
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.results) {
        console.log(`✅ Bulk mail afsluttet - Sent: ${data.results.sent}, Fejlede: ${data.results.failed}`);
        
        if (data.results.sent > 0) {
          toast.success(`${data.results.sent} rapporter sendt succesfuldt`);
        }
        
        if (data.results.failed > 0) {
          toast.warning(`${data.results.failed} mails fejlede`);
        }
        
      } else {
        throw new Error(data.message || 'Bulk mail sending fejlede');
      }
      
    } catch (error) {
      console.error(`❌ Bulk mail sending fejl:`, error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke sende bulk mails');
    } finally {
      setIsBulkSending(false);
    }
  };
  
  /**
   * Validerer email format
   */
  const isValidEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Tom email er tilladt
    return EMAIL_REGEX.test(email.trim());
  };
  
  /**
   * Får email status for visuel indikator
   */
  const getEmailStatus = (driverName: string) => {
    const email = currentEmails.get(driverName) || '';
    const original = originalEmails.get(driverName) || '';
    
    const hasEmail = !!email.trim();
    const isValid = isValidEmail(email);
    const isChanged = email !== original;
    
    if (isChanged && !isValid) {
      return { icon: ErrorIcon, color: 'text-red-500', message: 'Ugyldig email format' };
    }
    
    if (isChanged && isValid) {
      return { icon: WarningIcon, color: 'text-yellow-500', message: 'Ændret - ikke gemt' };
    }
    
    if (hasEmail && isValid) {
      return { icon: SuccessIcon, color: 'text-green-500', message: 'Gyldig email' };
    }
    
    if (!hasEmail) {
      return { icon: InfoIcon, color: 'text-gray-400', message: 'Ingen email' };
    }
    
    return { icon: ErrorIcon, color: 'text-red-500', message: 'Ugyldig email' };
  };
  
  /**
   * Gemmer alle email ændringer
   */
  const handleSave = async () => {
    console.log('💾 Gemmer email ændringer...');
    console.log('🔍 Debug info:', {
      hasChanges,
      isSaving,
      currentEmailsSize: currentEmails.size,
      originalEmailsSize: originalEmails.size
    });
    setIsSaving(true);
    
    try {
      // Saml alle ændringer
      const emailsToUpdate: Array<{ driverName: string; email: string }> = [];
      const validationErrors: string[] = [];
      
      for (const [driverName, currentEmail] of currentEmails) {
        const originalEmail = originalEmails.get(driverName) || '';
        
        if (currentEmail !== originalEmail) {
          // Validér email format hvis ikke tom
          if (currentEmail.trim() && !isValidEmail(currentEmail)) {
            validationErrors.push(`Ugyldig email for ${driverName}: ${currentEmail}`);
            continue;
          }
          
          emailsToUpdate.push({
            driverName,
            email: currentEmail.trim()
          });
        }
      }
      
      // Stop hvis der er validerings fejl
      if (validationErrors.length > 0) {
        toast.error(`Validering fejlede:\n${validationErrors.join('\n')}`);
        return;
      }
      
      if (emailsToUpdate.length === 0) {
        toast.info('Ingen ændringer at gemme');
        return;
      }
      
      console.log(`📤 Sender ${emailsToUpdate.length} email opdateringer...`);
      
      // Få session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Du skal være logget ind for at gemme emails');
        return;
      }
      
      // Send batch opdatering til API
      const response = await fetch('/api/rio/drivers/emails', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails: emailsToUpdate }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke gemme emails');
      }
      
      const result = await response.json();
      console.log('✅ Email opdateringer gemt:', result.updated, 'emails');
      
      // Opdater original emails til current state
      const newOriginalEmails = new Map(currentEmails);
      setOriginalEmails(newOriginalEmails);
      setHasChanges(false);
      
      console.log('🔄 Original emails opdateret efter gemning:', {
        newOriginalSize: newOriginalEmails.size,
        sampleOriginal: Array.from(newOriginalEmails.entries()).slice(0, 2)
      });
      
      toast.success(`${result.updated} email(s) gemt succesfuldt`);
      
      // Sæt last saved timestamp
      setLastSaved(new Date().toLocaleTimeString('da-DK'));
      
      // Genindlæs data for at sikre at UI'en viser korrekte værdier
      console.log('🔄 Genindlæser data efter gemning...');
      await loadDriverEmails();
      
    } catch (error) {
      console.error('❌ Fejl ved gemning af emails:', error);
      toast.error('Kunne ikke gemme email ændringer');
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Fortryder alle ændringer
   */
  const handleUndo = () => {
    console.log('↩️ Fortryder alle email ændringer...');
    setCurrentEmails(new Map(originalEmails));
    setHasChanges(false);
    toast.info('Alle ændringer fortrudt');
  };
  
  /**
   * Debug funktion til at tjekke state
   */
  const debugState = () => {
    console.log('🔍 Debug state:', {
      hasChanges,
      isSaving,
      driversCount: drivers.length,
      originalEmailsSize: originalEmails.size,
      currentEmailsSize: currentEmails.size,
      sampleOriginal: Array.from(originalEmails.entries()).slice(0, 2),
      sampleCurrent: Array.from(currentEmails.entries()).slice(0, 2)
    });
    
    // Tjek specifikt for Andersen, Kent René
    const andersenEmail = currentEmails.get('Andersen, Kent René');
    const andersenOriginal = originalEmails.get('Andersen, Kent René');
    console.log('🔍 Andersen, Kent René email status:', {
      current: andersenEmail,
      original: andersenOriginal,
      hasEmail: !!andersenEmail,
      isChanged: andersenEmail !== andersenOriginal
    });
  };
  
  /**
   * Filtrer chauffører baseret på søgning
   */
  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log(`${LOG_PREFIXES.render} Renderer Driver Email Administration Side...`);
  
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
        subtitle="RIO Program - Email Administration"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title og actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Chauffør Email Administration
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Administrer email adresser for alle chauffører
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => router.push('/rio/drivers')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Tilbage til Chauffører</span>
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="search-drivers" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Søg efter chauffør
                </Label>
                <Input
                  id="search-drivers"
                  ref={firstInputRef}
                  type="text"
                  placeholder="Indtast chaufførnavn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {filteredDrivers.length} af {drivers.length} chauffører
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Email list */}
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Henter chauffør data...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="col-span-4">Chauffør</div>
                  <div className="col-span-5">Email Adresse</div>
                  <div className="col-span-2 text-center">Handlinger</div>
                  <div className="col-span-1 text-center">Status</div>
                </div>
                
                {/* Driver rows */}
                {filteredDrivers.map((driver) => {
                  const emailStatus = getEmailStatus(driver.name);
                  const StatusIcon = emailStatus.icon;
                  
                  return (
                    <div 
                      key={driver.name}
                      className="grid grid-cols-12 gap-4 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      {/* Chauffør navn */}
                      <div className="col-span-4 flex items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {driver.name}
                          </div>
                          {driver.isOrphaned && (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              Ingen aktuelle data
                            </div>
                          )}
                          {driver.lastReportSent && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Sendt: {new Date(driver.lastReportSent).toLocaleDateString('da-DK')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Email input */}
                      <div className="col-span-5">
                        {(() => {
                          const emailValue = currentEmails.get(driver.name) || '';
                          // Log første par chauffører for debugging
                          if (filteredDrivers.indexOf(driver) < 3) {
                            console.log(`📧 Input rendering for ${driver.name}:`, {
                              emailValue,
                              hasEmail: !!emailValue,
                              currentEmailsSize: currentEmails.size,
                              driverName: driver.name,
                              driverEmail: driver.email,
                              driverHasEmail: driver.hasEmail
                            });
                          }
                          return (
                            <Input
                              type="email"
                              placeholder="Indtast email adresse..."
                              value={emailValue}
                              onChange={(e) => handleEmailChange(driver.name, e.target.value)}
                              className={`${
                                !isValidEmail(emailValue) && emailValue.trim() !== ''
                                  ? 'border-red-300 focus:border-red-500' 
                                  : ''
                              }`}
                            />
                          );
                        })()}
                      </div>
                      
                      {/* Send mail handlinger */}
                      <div className="col-span-2 flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendIndividualMail(driver.name)}
                          disabled={
                            !currentEmails.get(driver.name) || 
                            !isValidEmail(currentEmails.get(driver.name) || '') ||
                            sendingMails.has(driver.name) ||
                            hasChanges ||
                            isBulkSending
                          }
                          className="text-xs"
                        >
                          {sendingMails.has(driver.name) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                              Sender...
                            </>
                          ) : (
                            '📧 Send'
                          )}
                        </Button>
                      </div>
                      
                      {/* Status indikator */}
                      <div className="col-span-1 flex items-center justify-center" title={emailStatus.message}>
                        <StatusIcon 
                          className={`h-5 w-5 ${emailStatus.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* No results */}
                {filteredDrivers.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <FormIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Ingen chauffører fundet med søgekriterierne
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Action buttons */}
        <Card className="mt-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                <div>
                  {drivers.filter(d => d.hasEmail).length} med emails
                </div>
                <div>
                  {drivers.filter(d => d.isValidEmail).length} gyldige
                </div>
                {hasChanges && (
                  <div className="text-yellow-600 dark:text-yellow-400 font-medium">
                    Ugemte ændringer
                  </div>
                )}
                {lastSaved && !hasChanges && (
                  <div className="text-green-600 dark:text-green-400 font-medium">
                    Sidst gemt: {lastSaved}
                  </div>
                )}
                {/* Debug info */}
                <div className="text-xs text-gray-500">
                  hasChanges: {hasChanges.toString()}, isSaving: {isSaving.toString()}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Send bulk mail knap */}
                <Button
                  variant="outline"
                  onClick={sendBulkMails}
                  disabled={
                    filteredDrivers.filter(d => {
                      const email = currentEmails.get(d.name);
                      return email && isValidEmail(email);
                    }).length === 0 ||
                    hasChanges ||
                    isBulkSending ||
                    sendingMails.size > 0
                  }
                  className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                >
                  {isBulkSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Sender alle...
                    </>
                  ) : (
                    '📧 Send til alle'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleUndo}
                  disabled={!hasChanges || isSaving}
                >
                  Fortryd
                </Button>
                
                <Button
                  variant="outline"
                  onClick={debugState}
                  className="text-gray-600 hover:text-gray-700 border-gray-600 hover:border-gray-700"
                >
                  Debug
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🔄 Manuel genindlæsning af data...');
                    loadDriverEmails();
                  }}
                  className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                >
                  Genindlæs
                </Button>
                
                <Button
                  onClick={() => {
                    console.log('🔘 Gem Ændringer knap klikket');
                    console.log('🔍 Knap status:', { hasChanges, isSaving });
                    handleSave();
                  }}
                  disabled={!hasChanges || isSaving}
                  className={`${!hasChanges || isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  title={!hasChanges ? 'Ingen ændringer at gemme' : isSaving ? 'Gemmer...' : 'Gem ændringer'}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gemmer...
                    </>
                  ) : (
                    `Gem Ændringer${!hasChanges ? ' (Ingen ændringer)' : ''}`
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 