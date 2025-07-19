/**
 * RIO Chauffører Side
 * Side til at vise og administrere chaufførdata
 * Viser alle chauffører og deres data fra databasen
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import Image from 'next/image'; // Next.js Image komponent for optimeret billedvisning
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

// Interface for chauffør data
interface DriverData {
  id: string;
  driver_name: string;
  vehicles: string;
  month: number;
  year: number;
  driving_distance: number;
  avg_consumption_per_100km: number;
  co2_emission: number;
  avg_speed: number;
  created_at: string;
}

export default function RIODriversPage() {
  console.log('🚛 Initialiserer RIO Drivers Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<DriverData[]>([]);
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // State til filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = alle måneder
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = alle år
  
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
   * Tjekker bruger session og henter chaufførdata
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session og henter chaufførdata...');
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for chauffører:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for chauffører:', adminStatus);
        
        // Hent chaufførdata
        await loadDriverData();
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for chauffører:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
  }, [router]);
  
  /**
   * Henter chaufførdata fra databasen
   */
  const loadDriverData = async () => {
    console.log('📊 Henter chaufførdata fra database...');
    
    try {
      const { data, error } = await supabase
        .from('driver_data')
        .select('*')
        .order('driver_name', { ascending: true })
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        console.error('❌ Fejl ved hentning af chaufførdata:', error);
        toast.error('Kunne ikke hente chaufførdata');
        return;
      }
      
      console.log('✅ Chaufførdata hentet:', data?.length, 'records');
      setDrivers(data || []);
      setFilteredDrivers(data || []);
      
    } catch (error) {
      console.error('❌ Uventet fejl ved hentning af chaufførdata:', error);
      toast.error('Der opstod en fejl ved hentning af data');
    }
  };
  
  /**
   * Filtrerer chaufførdata baseret på søgning og filtre
   */
  useEffect(() => {
    console.log('🔍 Filtrerer chaufførdata...');
    
    let filtered = drivers;
    
    // Søgning på chaufførnavn
    if (searchTerm) {
      filtered = filtered.filter(driver => 
        driver.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrer på måned
    if (selectedMonth > 0) {
      filtered = filtered.filter(driver => driver.month === selectedMonth);
    }
    
    // Filtrer på år
    if (selectedYear > 0) {
      filtered = filtered.filter(driver => driver.year === selectedYear);
    }
    
    console.log('📊 Filtreret data:', filtered.length, 'records');
    setFilteredDrivers(filtered);
    
  }, [drivers, searchTerm, selectedMonth, selectedYear]);
  
  /**
   * Henter unikke år fra data
   */
  const getUniqueYears = () => {
    const years = [...new Set(drivers.map(driver => driver.year))].sort((a, b) => b - a);
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
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 dark:bg-gray-800/95 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo og branding */}
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/fiskelogistikgruppen-logo.png"
                  alt="FSK Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  FSK Online
                </h1>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  RIO Program - Chauffører
                </p>
              </div>
            </div>
            
            {/* Navigation til admin (kun for admins) */}
            <div className="flex items-center space-x-4">
              {isUserAdmin && (
                <Button
                  onClick={() => router.push('/admin')}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  🔧 Admin Panel
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Chauffør Administration
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Se og administrer chaufførdata fra alle perioder
          </p>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtre og Søgning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        
        {/* Results summary */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            Viser {filteredDrivers.length} af {drivers.length} chaufførrecords
          </p>
        </div>
        
        {/* Drivers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => (
            <Card 
              key={driver.id}
              className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 hover:shadow-xl transition-shadow duration-200"
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {driver.driver_name}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {getMonthName(driver.month)} {driver.year}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Køretøj:</span>
                    <p className="text-gray-600 dark:text-gray-400">{driver.vehicles || 'Ikke angivet'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Distance:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {driver.driving_distance ? `${driver.driving_distance.toLocaleString()} km` : 'Ikke angivet'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Forbrug:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {driver.avg_consumption_per_100km ? `${driver.avg_consumption_per_100km.toFixed(1)} l/100km` : 'Ikke angivet'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Gns. hastighed:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {driver.avg_speed ? `${driver.avg_speed.toFixed(1)} km/h` : 'Ikke angivet'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">CO₂:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {driver.co2_emission ? `${driver.co2_emission.toLocaleString()} kg` : 'Ikke angivet'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Oprettet:</span>
                    <p className="text-gray-600 dark:text-gray-400">{formatDate(driver.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* No results message */}
        {filteredDrivers.length === 0 && (
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Ingen chaufførdata fundet med de valgte filtre
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Prøv at ændre søgekriterierne eller upload nye data
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
} 