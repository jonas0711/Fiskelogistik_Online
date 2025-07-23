/**
 * RIO Chauffører Side
 * Administrerer chauffører med unikke oversigt, email administration og detaljeret visning
 * Implementerer funktionalitet fra Python version med moderne Next.js UI
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect, useCallback } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
// DriverEmailModal fjernet - erstattet med dedikeret side // Email administration modal
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { 
  DriverIcon, 
  UserIcon, 
  FormIcon, 
  SettingsIcon,
  StatsIcon,
  InfoIcon
} from '@/components/ui/icons'; // Icon komponenter

// Interface for unik chauffør (aggregeret data)
interface UniqueDriver {
  name: string;
  vehicles: string;
  totalDistance: number;
  avgConsumption: number;
  co2Emission: number;
  latestMonth: number;
  latestYear: number;
  recordCount: number;
}

// Interface for detaljeret chauffør data
interface DetailedDriverData {
  id: string;
  driver_name: string;
  vehicles: string;
  month: number;
  year: number;
  driving_distance: number;
  avg_consumption_per_100km: number;
  co2_emission: number;
  avg_speed: number;
  anticipatory_driving_assessment: number;
  total_consumption: number;
  avg_total_weight: number;
  engine_runtime: string;
  driving_time: string;
  idle_standstill_time: string;
  created_at: string;
}

export default function RIODriversPage() {
  console.log('🚛 Initialiserer RIO Drivers Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueDrivers, setUniqueDrivers] = useState<UniqueDriver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<UniqueDriver[]>([]);
  
  // State til detaljeret visning
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedDriverData[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Email modal state fjernet - erstattet med dedikeret side
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // State til filtre og indstillinger
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = alle måneder
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = alle år
  const [minKm, setMinKm] = useState<number>(100); // Minimum kilometer grænse
  
  // Måneder til dropdown
  const months = [
    { value: 0, label: 'Alle måneder' },
    { value: 1, label: 'Januar' },
    { value: 2, label: 'Februar' },
    { value: 3, label: 'Marts' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Maj' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  /**
   * Henter unikke chauffører fra API
   */
  const loadUniqueDrivers = useCallback(async () => {
    console.log('📊 Henter unikke chauffører fra API...');
    
    try {
      // Få session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('ℹ️ Ingen session tilgængelig for API kald - redirecter til login');
        router.push('/');
        return;
      }
      
      const params = new URLSearchParams({
        type: 'unique',
        min_km: minKm.toString()
      });
      
      if (selectedMonth > 0) {
        params.append('month', selectedMonth.toString());
      }
      if (selectedYear > 0) {
        params.append('year', selectedYear.toString());
      }
      
      const response = await fetch(`/api/rio/drivers?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Unikke chauffører hentet:', data.total, 'chauffører');
      
      setUniqueDrivers(data.drivers || []);
      setFilteredDrivers(data.drivers || []);
      
    } catch {
      console.log('ℹ️ Fejl ved hentning af unikke chauffører - redirecter til login');
      router.push('/');
    }
  }, [minKm, selectedMonth, selectedYear, router]);

  /**
   * Tjekker session og indlæser data ved komponent mount
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session og henter unikke chauffører...');
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('ℹ️ Ingen gyldig session - redirecter til login');
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for chauffører:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for chauffører:', adminStatus);
        
        // Hent unikke chauffører
        await loadUniqueDrivers();
        
      } catch {
        console.log('ℹ️ Fejl under session tjek - redirecter til login');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
  }, [router, loadUniqueDrivers]);
  
  /**
   * Henter detaljeret data for specifik chauffør
   */
  const loadDriverDetails = async (driverName: string) => {
    console.log('📊 Henter detaljeret data for chauffør:', driverName);
    setIsLoadingDetails(true);
    
    try {
      // Få session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('ℹ️ Ingen session tilgængelig for API kald - redirecter til login');
        router.push('/');
        return;
      }
      
      const params = new URLSearchParams({
        type: 'details',
        driver: driverName,
        min_km: minKm.toString()
      });
      
      const response = await fetch(`/api/rio/drivers?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Detaljeret data hentet:', data.total, 'records for', driverName);
      
      setDetailedData(data.records || []);
      setSelectedDriver(driverName);
      
    } catch {
      console.log('ℹ️ Fejl ved hentning af chauffør detaljer - redirecter til login');
      router.push('/');
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  /**
   * Genindlæser data når filtre ændres
   */
  useEffect(() => {
    if (!isLoading) {
      console.log('🔍 Filtre ændret - genindlæser data...');
      loadUniqueDrivers();
      setSelectedDriver(null); // Luk detaljeret visning
      setDetailedData([]);
    }
  }, [minKm, selectedMonth, selectedYear, loadUniqueDrivers, isLoading]);
  
  /**
   * Filtrerer chauffører baseret på søgning
   */
  useEffect(() => {
    console.log('🔍 Filtrerer chauffører baseret på søgning...');
    
    let filtered = uniqueDrivers;
    
    // Søgning på chaufførnavn
    if (searchTerm) {
      filtered = filtered.filter(driver => 
        driver.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    console.log('📊 Filtreret data:', filtered.length, 'chauffører');
    setFilteredDrivers(filtered);
    
  }, [uniqueDrivers, searchTerm]);
  
  /**
   * Henter unikke år fra data
   */
  const getUniqueYears = () => {
    const years = [...new Set(uniqueDrivers.map(driver => driver.latestYear))].sort((a, b) => b - a);
    return [{ value: 0, label: 'Alle år' }, ...years.map(year => ({ value: year, label: year.toString() }))];
  };
  
  /**
   * Formaterer dato
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK');
  };
  
  /**
   * Formaterer måned navn
   */
  const getMonthName = (month: number) => {
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Ukendt';
  };
  
  /**
   * Håndterer chauffør klik
   */
  const handleDriverClick = (driverName: string) => {
    console.log('🚛 Chauffør valgt:', driverName);
    loadDriverDetails(driverName);
  };
  
  /**
   * Går tilbage til chauffør oversigt
   */
  const handleBackToOverview = () => {
    console.log('↩️ Går tilbage til chauffør oversigt...');
    setSelectedDriver(null);
    setDetailedData([]);
  };
  
  // Email modal funktioner fjernet - erstattet med dedikeret side
  
  console.log('🎨 Renderer RIO Drivers Page...');
  
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
        subtitle="RIO Program - Chauffører"
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
              {selectedDriver ? `Chauffør: ${selectedDriver}` : 'Chauffør Administration'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {selectedDriver 
                ? `Detaljeret data for ${selectedDriver} (${detailedData.length} records)`
                : `${filteredDrivers.length} unikke chauffører med minimum ${minKm} km`
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedDriver && (
              <Button
                onClick={handleBackToOverview}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <DriverIcon className="h-4 w-4" />
                <span>Tilbage til Oversigt</span>
              </Button>
            )}
            
            {!selectedDriver && (
              <Button
                onClick={() => router.push('/rio/drivers/emails')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserIcon className="h-4 w-4" />
                <span>Email Administration</span>
              </Button>
            )}
          </div>
        </div>
        
        {!selectedDriver ? (
          // Unikke chauffører oversigt
          <>
            {/* Filtre og indstillinger */}
            <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5" />
                  <span>Filtre og Indstillinger</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Søgning */}
                  <div className="space-y-2">
                    <Label htmlFor="search-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Søg efter chauffør
                    </Label>
                    <Input
                      id="search-input"
                      type="text"
                      placeholder="Indtast chaufførnavn..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Minimum kilometer */}
                  <div className="space-y-2">
                    <Label htmlFor="min-km-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Minimum km
                    </Label>
                    <Input
                      id="min-km-input"
                      type="number"
                      placeholder="100"
                      value={minKm}
                      onChange={(e) => setMinKm(Number(e.target.value) || 100)}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Måned filter */}
                  <div className="space-y-2">
                    <Label htmlFor="month-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Måned
                    </Label>
                    <select
                      id="month-filter"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      aria-label="Filtrer på måned"
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* År filter */}
                  <div className="space-y-2">
                    <Label htmlFor="year-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      År
                    </Label>
                    <select
                      id="year-filter"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      aria-label="Filtrer på år"
                    >
                      {getUniqueYears().map((year) => (
                        <option key={year.value} value={year.value}>
                          {year.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Chauffør grid (4 kolonner som i Python version) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDrivers.map((driver) => (
                <Button
                  key={driver.name}
                  onClick={() => handleDriverClick(driver.name)}
                  variant="outline"
                  className="h-auto p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="w-full">
                    <div className="flex items-center space-x-2 mb-3">
                      <DriverIcon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {driver.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Køretøj:</span>
                        <span className="font-medium">{driver.vehicles || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total km:</span>
                        <span className="font-medium">{driver.totalDistance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seneste:</span>
                        <span className="font-medium">{getMonthName(driver.latestMonth)} {driver.latestYear}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Records:</span>
                        <span className="font-medium">{driver.recordCount}</span>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            {/* No results message */}
            {filteredDrivers.length === 0 && (
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-8 text-center">
                  <FormIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    Ingen chauffører fundet
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Prøv at ændre søgekriterierne eller minimum kilometer grænse
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // Detaljeret chauffør visning
          <div className="space-y-6">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Henter detaljeret data...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {detailedData.map((record) => (
                  <Card 
                    key={record.id}
                    className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <StatsIcon className="h-5 w-5 text-blue-600" />
                        <span>{getMonthName(record.month)} {record.year}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Køretøj:</span>
                          <p className="text-gray-600 dark:text-gray-400">{record.vehicles || 'Ikke angivet'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Distance:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {record.driving_distance ? `${record.driving_distance.toLocaleString()} km` : 'Ikke angivet'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Forbrug:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {record.avg_consumption_per_100km ? `${record.avg_consumption_per_100km.toFixed(1)} l/100km` : 'Ikke angivet'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Gns. hastighed:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {record.avg_speed ? `${record.avg_speed.toFixed(1)} km/h` : 'Ikke angivet'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">CO₂:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {record.co2_emission ? `${record.co2_emission.toLocaleString()} kg` : 'Ikke angivet'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Køretid:</span>
                          <p className="text-gray-600 dark:text-gray-400">{record.driving_time || 'Ikke angivet'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Total vægt:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {record.avg_total_weight ? `${record.avg_total_weight.toFixed(1)} t` : 'Ikke angivet'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Oprettet:</span>
                          <p className="text-gray-600 dark:text-gray-400">{formatDate(record.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* No detailed data message */}
            {detailedData.length === 0 && !isLoadingDetails && (
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-8 text-center">
                  <InfoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    Ingen detaljeret data fundet for {selectedDriver}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Chaufføren har muligvis ikke data der opfylder minimum kilometer kravet
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      
      {/* Email administration modal fjernet - erstattet med dedikeret side */}
    </div>
  );
} 