/**
 * Report Mail Interface Komponent
 * Dedikeret interface til at sende rapport emails til chauffører
 * Baseret på Python ReportMailWindow funktionalitet
 * Inkluderer periode valg, chauffør liste og bulk mail sending
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/libs/db';
import { toast } from 'sonner';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { 
  SuccessIcon, 
  ErrorIcon, 
  WarningIcon,
  UserIcon
} from '@/components/ui/icons';

// Interface for periode data
interface PeriodData {
  year: number;
  month: number;
  label: string;
}

// Interface for chauffør med mail status
interface DriverWithMailStatus {
  name: string;
  email: string;
  hasEmail: boolean;
  isValidEmail: boolean;
  distance: number;
  lastReportSent: string | null;
  isQualified: boolean;
}

// Interface for bulk sending progress
interface SendingProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
  isComplete: boolean;
}

interface ReportMailInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod?: { month: number; year: number };
}

export default function ReportMailInterface({ isOpen, onClose, defaultPeriod }: ReportMailInterfaceProps) {
  console.log(`${LOG_PREFIXES.form} Initialiserer Report Mail Interface...`);
  
  // State til periode valg
  const [availablePeriods, setAvailablePeriods] = useState<PeriodData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodData | null>(null);
  const [minKm, setMinKm] = useState(100);
  
  // State til chauffør data
  const [drivers, setDrivers] = useState<DriverWithMailStatus[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State til mail sending
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<SendingProgress | null>(null);
  const [testMode, setTestMode] = useState(false);
  
  // Måned navne - memoized for at undgå unødvendige re-renders
  const monthNames = useMemo(() => [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ], []);
  
  /**
   * Henter tilgængelige perioder fra database
   */
  const loadAvailablePeriods = useCallback(async () => {
    console.log(`${LOG_PREFIXES.search} Henter tilgængelige perioder...`);
    
    try {
      const { data, error } = await supabase
        .from('driver_data')
        .select('month, year')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Fejl ved hentning af perioder:`, error);
        toast.error('Kunne ikke hente tilgængelige perioder');
        return;
      }
      
      // Opret unikke perioder
      const uniquePeriods = Array.from(
        new Map(data.map((item: any) => [`${item.year}-${item.month}`, item])).values()
      ).map((item: any) => ({
        year: item.year,
        month: item.month,
        label: `${monthNames[item.month - 1]} ${item.year}`
      }));
      
      setAvailablePeriods(uniquePeriods);
      
      // Sæt default periode
      if (defaultPeriod) {
        const defaultPeriodData = uniquePeriods.find(p => 
          p.year === defaultPeriod.year && p.month === defaultPeriod.month
        );
        if (defaultPeriodData) {
          setSelectedPeriod(defaultPeriodData);
        }
      } else if (uniquePeriods.length > 0) {
        setSelectedPeriod(uniquePeriods[0]); // Seneste periode
      }
      
      console.log(`${LOG_PREFIXES.success} ${uniquePeriods.length} perioder hentet`);
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Uventet fejl ved hentning af perioder:`, error);
      toast.error('Kunne ikke hente perioder');
    }
  }, [defaultPeriod, monthNames]);
  
  /**
   * Henter chauffører for valgt periode med email status
   */
  const loadDriversForPeriod = useCallback(async () => {
    if (!selectedPeriod) return;
    
    console.log(`${LOG_PREFIXES.search} Henter chauffører for ${selectedPeriod.label}...`);
    setIsLoadingDrivers(true);
    
    try {
      // Hent chauffør data for perioden
      const { data: driverData, error: driverError } = await supabase
        .from('driver_data')
        .select('driver_name, driving_distance')
        .eq('month', selectedPeriod.month)
        .eq('year', selectedPeriod.year)
        .gte('driving_distance', minKm);
      
      if (driverError) {
        console.error(`${LOG_PREFIXES.error} Fejl ved hentning af chauffører:`, driverError);
        toast.error('Kunne ikke hente chauffør data');
        return;
      }
      
      // Hent email adresser
      const { data: emailData, error: emailError } = await supabase
        .from('driver_emails')
        .select('driver_name, email, last_report_sent');
      
      if (emailError) {
        console.error(`${LOG_PREFIXES.error} Fejl ved hentning af emails:`, emailError);
        toast.error('Kunne ikke hente email data');
        return;
      }
      
      // Opret email mapping
      const emailMap = new Map();
      emailData?.forEach((record: any) => {
        emailMap.set(record.driver_name, {
          email: record.email || '',
          lastReportSent: record.last_report_sent
        });
      });
      
      // Kombiner data
      const driversWithStatus: DriverWithMailStatus[] = driverData.map((driver: any) => {
        const emailInfo = emailMap.get(driver.driver_name) || { email: '', lastReportSent: null };
        const hasEmail = Boolean(emailInfo.email && emailInfo.email.trim());
        const isValidEmail = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInfo.email);
        
        return {
          name: driver.driver_name,
          email: emailInfo.email || '',
          hasEmail,
          isValidEmail,
          distance: driver.driving_distance || 0,
          lastReportSent: emailInfo.lastReportSent,
          isQualified: (driver.driving_distance || 0) >= minKm
        };
      });
      
      setDrivers(driversWithStatus);
      console.log(`${LOG_PREFIXES.success} ${driversWithStatus.length} chauffører hentet`);
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Uventet fejl ved hentning af chauffører:`, error);
      toast.error('Kunne ikke hente chauffør data');
    } finally {
      setIsLoadingDrivers(false);
    }
  }, [selectedPeriod, minKm]);
  
  /**
   * Sender rapporter til valgte chauffører
   */
  const sendReports = async () => {
    if (!selectedPeriod || selectedDrivers.size === 0) {
      toast.error('Vælg periode og mindst én chauffør');
      return;
    }
    
    const confirmed = window.confirm(
      `Er du sikker på at du vil sende rapporter til ${selectedDrivers.size} chauffører${testMode ? ' (TEST MODE)' : ''}?`
    );
    
    if (!confirmed) return;
    
    setIsSending(true);
    setSendingProgress({
      total: selectedDrivers.size,
      sent: 0,
      failed: 0,
      current: '',
      isComplete: false
    });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const driverIds = Array.from(selectedDrivers);
      
      const response = await fetch('/api/rio/mail/send-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'bulk',
          driverIds,
          month: selectedPeriod.month,
          year: selectedPeriod.year,
          minKm,
          testMode
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.results) {
        setSendingProgress({
          total: data.results.details.length,
          sent: data.results.sent,
          failed: data.results.failed,
          current: '',
          isComplete: true
        });
        
        if (data.results.sent > 0) {
          toast.success(`${data.results.sent} rapporter sendt succesfuldt`);
        }
        
        if (data.results.failed > 0) {
          toast.warning(`${data.results.failed} rapporter fejlede`);
        }
        
        // Reload driver data for at opdatere status
        await loadDriversForPeriod();
        
      } else {
        throw new Error(data.message || 'Mail sending fejlede');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Rapport sending fejl:`, error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke sende rapporter');
    } finally {
      setIsSending(false);
      // Bevar progress i 3 sekunder så bruger kan se resultatet
      setTimeout(() => {
        setSendingProgress(null);
      }, 3000);
    }
  };
  
  /**
   * Håndterer selection af chauffører
   */
  const toggleDriverSelection = (driverName: string) => {
    setSelectedDrivers(prev => {
      const updated = new Set(prev);
      if (updated.has(driverName)) {
        updated.delete(driverName);
      } else {
        updated.add(driverName);
      }
      return updated;
    });
  };
  
  /**
   * Vælger alle gyldige chauffører
   */
  const selectAllValidDrivers = () => {
    const validDrivers = filteredDrivers.filter(d => d.isValidEmail);
    setSelectedDrivers(new Set(validDrivers.map(d => d.name)));
  };
  
  /**
   * Fravælger alle chauffører
   */
  const clearSelection = () => {
    setSelectedDrivers(new Set());
  };
  
  // Filtrer chauffører baseret på søgning
  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Load data når komponenten åbnes
  useEffect(() => {
    if (isOpen) {
      loadAvailablePeriods();
    }
  }, [isOpen, loadAvailablePeriods]);
  
  // Load chauffører når periode ændres
  useEffect(() => {
    if (selectedPeriod) {
      loadDriversForPeriod();
    }
  }, [selectedPeriod, minKm, loadDriversForPeriod]);
  
  if (!isOpen) return null;
  
  console.log(`${LOG_PREFIXES.config} Renderer Report Mail Interface...`);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📧 Send Rapport Emails
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Send månedlige rapporter til chauffører via email
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            ✕ Luk
          </Button>
        </div>
        
        {/* Konfiguration sektion */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Periode valg */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="periodSelect">
                Periode
              </Label>
              <select
                id="periodSelect" // Tilføjet id for label-binding
                title="Vælg periode" // Tilføjet title for tilgængelighed
                value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number);
                  const period = availablePeriods.find(p => p.year === year && p.month === month);
                  setSelectedPeriod(period || null);
                }}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Vælg periode...</option>
                {availablePeriods.map(period => (
                  <option 
                    key={`${period.year}-${period.month}`} 
                    value={`${period.year}-${period.month}`}
                  >
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Minimum km */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Min. Kørestrækning (km)
              </Label>
              <Input
                type="number"
                value={typeof minKm === 'number' && !isNaN(minKm) ? minKm : ''} // Sikrer value altid er number eller string
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMinKm(!isNaN(val) ? val : 0); // Sikrer state altid er et tal
                }}
                min="0"
                step="10"
                className="mt-1"
              />
            </div>
            
            {/* Test mode */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="testMode"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="mr-2"
                title="Aktivér test mode" // Tilføjet title for tilgængelighed
              />
              <Label htmlFor="testMode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Mode
              </Label>
            </div>
            
            {/* Chauffør info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedPeriod && (
                <>
                  <div>📊 {drivers.length} chauffører</div>
                  <div>✅ {drivers.filter(d => d.isValidEmail).length} med gyldige emails</div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Chauffør liste */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search og bulk actions */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Søg chauffører..."
                  value={searchTerm ?? ''} // Sikrer value aldrig er undefined
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAllValidDrivers}
                  disabled={drivers.filter(d => d.isValidEmail).length === 0}
                >
                  Vælg alle med email
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedDrivers.size === 0}
                >
                  Fravælg alle
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDrivers.size} valgt af {filteredDrivers.length} chauffører
              </div>
            </div>
          </div>
          
          {/* Driver list content */}
          <div className="flex-1 overflow-auto p-4">
            {isLoadingDrivers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Henter chauffører...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDrivers.map(driver => {
                  const isSelected = selectedDrivers.has(driver.name);
                  const StatusIcon = driver.isValidEmail ? SuccessIcon : driver.hasEmail ? WarningIcon : ErrorIcon;
                  const statusColor = driver.isValidEmail ? 'text-green-600' : driver.hasEmail ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <div
                      key={driver.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => driver.isValidEmail && toggleDriverSelection(driver.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {driver.isValidEmail && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDriverSelection(driver.name)}
                              className="h-4 w-4"
                              aria-label={`Vælg chauffør: ${driver.name}`} // Tilføjet aria-label for tilgængelighed
                              title={`Vælg chauffør: ${driver.name}`} // Tilføjet title for tilgængelighed
                            />
                          )}
                          
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {driver.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {driver.distance.toFixed(0)} km
                              {driver.email && ` • ${driver.email}`}
                              {driver.lastReportSent && (
                                ` • Sendt: ${new Date(driver.lastReportSent).toLocaleDateString('da-DK')}`
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                      </div>
                    </div>
                  );
                })}
                
                {filteredDrivers.length === 0 && !isLoadingDrivers && (
                  <div className="text-center py-12">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Ingen chauffører fundet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {sendingProgress && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {sendingProgress.isComplete 
                ? `Afsluttet: ${sendingProgress.sent} sendt, ${sendingProgress.failed} fejlede`
                : `Sender rapporter... ${sendingProgress.current}`
              }
            </div>
            <div
              className="w-full bg-gray-200 rounded-full h-2"
              role="progressbar"
              aria-label="Status for afsendelse af rapporter"
            >
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${sendingProgress.total > 0 ? ((sendingProgress.sent + sendingProgress.failed) / sendingProgress.total) * 100 : 0}%` 
                }}
              >
                <span className="sr-only">
                  {sendingProgress.isComplete
                    ? `Afsluttet: ${sendingProgress.sent} sendt, ${sendingProgress.failed} fejlede`
                    : `Status: ${sendingProgress.sent + sendingProgress.failed} ud af ${sendingProgress.total}`}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {testMode && (
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                  🧪 TEST MODE: Mails sendes til test email
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Annuller
              </Button>
              
              <Button
                onClick={sendReports}
                disabled={
                  selectedDrivers.size === 0 || 
                  !selectedPeriod || 
                  isSending ||
                  isLoadingDrivers
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sender rapporter...
                  </>
                ) : (
                  `📧 Send til ${selectedDrivers.size} chauffører`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 