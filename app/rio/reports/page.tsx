/**
 * RIO Rapporter Side
 * Side til at generere og vise rapporter over chaufførdata
 * Viser forskellige typer af rapporter og statistikker
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

// Interface for rapport data
interface ReportData {
  totalDrivers: number;
  totalDistance: number;
  avgConsumption: number;
  totalCO2: number;
  avgSpeed: number;
  period: string;
}

export default function RIOReportsPage() {
  console.log('📋 Initialiserer RIO Reports Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = alle måneder
  const [selectedYear, setSelectedYear] = useState<number>(0); // 0 = alle år
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
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
   * Tjekker bruger session og henter rapportdata
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session og henter rapportdata...');
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for rapporter:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for rapporter:', adminStatus);
        
        // Hent rapportdata
        await loadReportData();
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for rapporter:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  
  /**
   * Henter rapportdata fra databasen
   */
  const loadReportData = async () => {
    console.log('📊 Henter rapportdata fra database...');
    
    try {
      let query = supabase
        .from('driver_data')
        .select('*');
      
      // Tilføj filtre hvis valgt
      if (selectedMonth > 0) {
        query = query.eq('month', selectedMonth);
      }
      
      if (selectedYear > 0) {
        query = query.eq('year', selectedYear);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Fejl ved hentning af rapportdata:', error);
        toast.error('Kunne ikke hente rapportdata');
        return;
      }
      
      console.log('✅ Rapportdata hentet:', data?.length, 'records');
      
      // Beregn statistikker
      if (data && data.length > 0) {
        const totalDrivers = data.length;
        const totalDistance = data.reduce((sum, driver) => sum + (driver.driving_distance || 0), 0);
        const totalConsumption = data.reduce((sum, driver) => sum + (driver.avg_consumption_per_100km || 0), 0);
        const avgConsumption = totalConsumption / totalDrivers;
        const totalCO2 = data.reduce((sum, driver) => sum + (driver.co2_emission || 0), 0);
        const totalSpeed = data.reduce((sum, driver) => sum + (driver.avg_speed || 0), 0);
        const avgSpeed = totalSpeed / totalDrivers;
        
        // Bestem periode
        let period = 'Alle perioder';
        if (selectedMonth > 0 && selectedYear > 0) {
          const monthName = months.find(m => m.value === selectedMonth)?.label || '';
          period = `${monthName} ${selectedYear}`;
        } else if (selectedYear > 0) {
          period = `År ${selectedYear}`;
        }
        
        setReportData({
          totalDrivers,
          totalDistance,
          avgConsumption,
          totalCO2,
          avgSpeed,
          period
        });
      } else {
        setReportData(null);
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl ved hentning af rapportdata:', error);
      toast.error('Der opstod en fejl ved hentning af data');
    }
  };
  
  /**
   * Henter unikke år fra data
   */
  const getUniqueYears = () => {
    // For nu returnerer vi et statisk array - i en rigtig app ville vi hente dette fra databasen
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
    return [{ value: 0, label: 'Alle år' }, ...years.map(year => ({ value: year, label: year.toString() }))];
  };
  
  /**
   * Genererer rapport når filtre ændres
   */
  useEffect(() => {
    if (!isLoading) {
      loadReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, isLoading]);
  
  /**
   * Formaterer tal med tusindtalsseparator
   */
  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('da-DK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };
  
  /**
   * Eksporterer rapport som CSV
   */
  const exportReport = () => {
    console.log('📤 Eksporterer rapport...');
    
    if (!reportData) {
      toast.error('Ingen data at eksportere');
      return;
    }
    
    // Opret CSV indhold
    const csvContent = [
      ['Rapport: Fiskelogistik RIO Program'],
      ['Periode:', reportData.period],
      ['Genereret:', new Date().toLocaleDateString('da-DK')],
      [],
      ['Statistik', 'Værdi'],
      ['Antal chauffører', reportData.totalDrivers.toString()],
      ['Total distance (km)', formatNumber(reportData.totalDistance)],
      ['Gns. forbrug (l/100km)', formatNumber(reportData.avgConsumption, 1)],
      ['Total CO₂ (kg)', formatNumber(reportData.totalCO2)],
      ['Gns. hastighed (km/h)', formatNumber(reportData.avgSpeed, 1)]
    ].map(row => row.join(',')).join('\n');
    
    // Download fil
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rio-rapport-${reportData.period.replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Rapport eksporteret');
  };
  
  console.log('🎨 Renderer RIO Reports Page...');
  
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
        subtitle="RIO Program - Rapporter"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rapporter og Statistikker
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Generer og se detaljerede rapporter over chaufførdata
          </p>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Rapport Filtre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  aria-label="Filtrer rapport på måned"
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
                  aria-label="Filtrer rapport på år"
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
        
        {/* Report data */}
        {reportData ? (
          <>
            {/* Period info */}
            <div className="mb-6">
              <Card className="shadow-lg border-0 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Rapport for: {reportData.period}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-200">
                    Baseret på {reportData.totalDrivers} chaufførrecords
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Statistics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {formatNumber(reportData.totalDrivers)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Chauffører
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {formatNumber(reportData.totalDistance)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total km
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    {formatNumber(reportData.avgConsumption, 1)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Gns. forbrug l/100km
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                    {formatNumber(reportData.totalCO2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total CO₂ kg
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Detailed report */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detaljeret Rapport
                  </CardTitle>
                  <Button
                    onClick={exportReport}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    📥 Eksporter CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kørselsstatistikker</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Antal chauffører:</span>
                        <span className="font-medium">{formatNumber(reportData.totalDrivers)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total distance:</span>
                        <span className="font-medium">{formatNumber(reportData.totalDistance)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Gns. hastighed:</span>
                        <span className="font-medium">{formatNumber(reportData.avgSpeed, 1)} km/h</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Miljøpåvirkning</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Gns. forbrug:</span>
                        <span className="font-medium">{formatNumber(reportData.avgConsumption, 1)} l/100km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total CO₂:</span>
                        <span className="font-medium">{formatNumber(reportData.totalCO2)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">CO₂ per km:</span>
                        <span className="font-medium">
                          {reportData.totalDistance > 0 ? formatNumber(reportData.totalCO2 / reportData.totalDistance, 2) : '0'} kg/km
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* No data message */
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Ingen data fundet for de valgte filtre
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Prøv at ændre filtrene eller upload nye data
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
} 