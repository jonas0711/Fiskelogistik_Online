/**
 * DriverEmailModal komponent
 * Modal vindue til administration af chauffør email adresser
 * Inkluderer real-time validering, change tracking og batch opdateringer
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/libs/db';
import { toast } from 'sonner';
import { 
  InfoIcon, 
  SuccessIcon, 
  ErrorIcon, 
  WarningIcon,
  UserIcon,
  FormIcon
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

// Props for modal komponenten
interface DriverEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedCount: number) => void;
}

export default function DriverEmailModal({ isOpen, onClose, onSaved }: DriverEmailModalProps) {
  console.log('📧 Initialiserer DriverEmailModal komponent...');
  
  // State for data og UI
  const [drivers, setDrivers] = useState<DriverWithEmail[]>([]);
  const [originalEmails, setOriginalEmails] = useState<Map<string, string>>(new Map());
  const [currentEmails, setCurrentEmails] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Mail sending state
  const [sendingMails, setSendingMails] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);
  
  // Refs til scroll og focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  
  /**
   * Email validering regex - samme som i API
   */
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  /**
   * Henter chauffør data og emails når modal åbnes
   */
  useEffect(() => {
    if (isOpen) {
      console.log('📧 Driver Email Modal åbnet - indlæser data...');
      loadDriverEmails();
    }
  }, [isOpen]);
  
  /**
   * Tjekker for ændringer når emails opdateres
   */
  useEffect(() => {
    console.log('🔍 Tjekker for email ændringer...');
    
    let hasAnyChanges = false;
    
    // Sammenlign current emails med original emails
    for (const [driverName, currentEmail] of currentEmails) {
      const originalEmail = originalEmails.get(driverName) || '';
      if (currentEmail !== originalEmail) {
        hasAnyChanges = true;
        console.log(`📝 Ændring detekteret for ${driverName}: '${currentEmail}' vs '${originalEmail}'`);
        break;
      }
    }
    
    setHasChanges(hasAnyChanges);
  }, [currentEmails, originalEmails]);
  
  /**
   * Keyboard event handler for modal
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Luk modal med Escape
      if (event.key === 'Escape') {
        handleClose();
      }
      
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
  }, [isOpen, hasChanges, isSaving]);
  
  /**
   * Henter chauffør emails fra API
   */
  const loadDriverEmails = async () => {
    console.log('📊 Henter chauffør emails fra API...');
    setIsLoading(true);
    
    try {
      // Import supabase til at få session
      const { supabase } = await import('../libs/db');
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
      console.log('✅ Chauffør emails hentet:', data.total, 'chauffører');
      
      setDrivers(data.drivers || []);
      
      // Opret email mappings
      const originalMap = new Map<string, string>();
      const currentMap = new Map<string, string>();
      
      data.drivers?.forEach((driver: DriverWithEmail) => {
        originalMap.set(driver.name, driver.email);
        currentMap.set(driver.name, driver.email);
      });
      
      setOriginalEmails(originalMap);
      setCurrentEmails(currentMap);
      
      console.log('📈 Email summary:', data.summary);
      
    } catch (error) {
      console.error('❌ Fejl ved hentning af chauffør emails:', error);
      toast.error('Kunne ikke hente chauffør emails');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Opdaterer email for en specifik chauffør
   */
  const handleEmailChange = (driverName: string, newEmail: string) => {
    console.log(`📝 Opdaterer email for ${driverName}: ${newEmail}`);
    
    setCurrentEmails(prev => {
      const updated = new Map(prev);
      updated.set(driverName, newEmail);
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
      const modalLatestPeriod = await getLatestAvailablePeriod();
      if (!modalLatestPeriod) {
        toast.error('Kunne ikke finde tilgængelige data perioder');
        return;
      }
      
      const { month: modalMonth, year: modalYear } = modalLatestPeriod;
      console.log(`📅 Bruger seneste tilgængelige periode: ${modalMonth}/${modalYear}`);
      
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
          month: modalMonth,
          year: modalYear,
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
      const { supabase } = await import('../libs/db');
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
      setOriginalEmails(new Map(currentEmails));
      setHasChanges(false);
      
      toast.success(`${result.updated} email(s) gemt succesfuldt`);
      
      // Kald callback hvis angivet
      if (onSaved) {
        onSaved(result.updated);
      }
      
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
   * Håndterer modal lukning med ændring advarsel
   */
  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'Du har ugemte ændringer. Er du sikker på at du vil lukke uden at gemme?'
      );
      if (!confirmClose) return;
    }
    
    console.log('❌ Lukker email modal...');
    setSearchTerm('');
    setHasChanges(false);
    onClose();
  };
  
  /**
   * Filtrer chauffører baseret på søgning
   */
  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Renderer ikke noget hvis modal ikke er åben
  if (!isOpen) return null;
  
  console.log('🎨 Renderer DriverEmailModal...');
  
  return (
    // Modal overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Chauffør Email Administration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Administrer email adresser for alle chauffører
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-shrink-0"
          >
            Luk
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
        </div>
        
        {/* Email list */}
        <div className="flex-1 overflow-auto p-6">
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
                      <Input
                        type="email"
                        placeholder="Indtast email adresse..."
                        value={currentEmails.get(driver.name) || ''}
                        onChange={(e) => handleEmailChange(driver.name, e.target.value)}
                        className={`${
                          !isValidEmail(currentEmails.get(driver.name) || '') && 
                          (currentEmails.get(driver.name) || '').trim() !== ''
                            ? 'border-red-300 focus:border-red-500' 
                            : ''
                        }`}
                      />
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
        </div>
        
        {/* Modal footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
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
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gemmer...
                </>
              ) : (
                'Gem Ændringer'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 