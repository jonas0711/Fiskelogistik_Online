/**
 * RIO KPI Side
 * Side til at vise Key Performance Indicators
 * Viser vigtige metrics og trends for chaufførdata
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import Image from 'next/image'; // Next.js Image komponent for optimeret billedvisning
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

// Interface for KPI data
interface KPIData {
  totalDrivers: number;
  totalDistance: number;
  avgConsumption: number;
  totalCO2: number;
  avgSpeed: number;
  efficiencyScore: number;
  environmentalScore: number;
  safetyScore: number;
  period: string;
}

export default function RIOKPIPage() {
  console.log('📈 Initialiserer RIO KPI Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
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
   * Tjekker bruger session og henter KPI data
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session og henter KPI data...');
    
    const checkSessionAndLoadData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for KPI:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for KPI:', adminStatus);
        
        // Hent KPI data
        await loadKPIData();
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for KPI:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSessionAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  
  /**
   * Henter KPI data fra databasen
   */
  const loadKPIData = async () => {
    console.log('📊 Henter KPI data fra database...');
    
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
        console.error('❌ Fejl ved hentning af KPI data:', error);
        toast.error('Kunne ikke hente KPI data');
        return;
      }
      
      console.log('✅ KPI data hentet:', data?.length, 'records');
      
      // Beregn KPI statistikker
      if (data && data.length > 0) {
        const totalDrivers = data.length;
        const totalDistance = data.reduce((sum, driver) => sum + (driver.driving_distance || 0), 0);
        const totalConsumption = data.reduce((sum, driver) => sum + (driver.avg_consumption_per_100km || 0), 0);
        const avgConsumption = totalConsumption / totalDrivers;
        const totalCO2 = data.reduce((sum, driver) => sum + (driver.co2_emission || 0), 0);
        const totalSpeed = data.reduce((sum, driver) => sum + (driver.avg_speed || 0), 0);
        const avgSpeed = totalSpeed / totalDrivers;
        
        // Beregn KPI scores (simplificeret)
        const efficiencyScore = Math.max(0, 100 - (avgConsumption - 20) * 2); // Baseret på forbrug
        const environmentalScore = Math.max(0, 100 - (totalCO2 / totalDistance) * 100); // Baseret på CO2 per km
        const safetyScore = Math.max(0, 100 - (avgSpeed - 60) * 0.5); // Baseret på hastighed
        
        // Bestem periode
        let period = 'Alle perioder';
        if (selectedMonth > 0 && selectedYear > 0) {
          const monthName = months.find(m => m.value === selectedMonth)?.label || '';
          period = `${monthName} ${selectedYear}`;
        } else if (selectedYear > 0) {
          period = `År ${selectedYear}`;
        }
        
        setKpiData({
          totalDrivers,
          totalDistance,
          avgConsumption,
          totalCO2,
          avgSpeed,
          efficiencyScore: Math.round(efficiencyScore),
          environmentalScore: Math.round(environmentalScore),
          safetyScore: Math.round(safetyScore),
          period
        });
      } else {
        setKpiData(null);
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl ved hentning af KPI data:', error);
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
   * Genererer KPI når filtre ændres
   */
  useEffect(() => {
    if (!isLoading) {
      loadKPIData();
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
   * Får farve baseret på score
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  /**
   * Får baggrundsfarve baseret på score
   */
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };
  
  console.log('🎨 Renderer RIO KPI Page...');
  
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
                  RIO Program - Key Performance Indicators
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
            Key Performance Indicators
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Overvåg vigtige metrics og trends for chaufførernes præstation
          </p>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              KPI Filtre
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
                  aria-label="Filtrer KPI på måned"
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
                  aria-label="Filtrer KPI på år"
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
        
        {/* KPI data */}
        {kpiData ? (
          <>
            {/* Period info */}
            <div className="mb-6">
              <Card className="shadow-lg border-0 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    KPI for: {kpiData.period}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-200">
                    Baseret på {kpiData.totalDrivers} chaufførrecords
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* KPI Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className={`shadow-lg border-0 ${getScoreBgColor(kpiData.efficiencyScore)}`}>
                <CardContent className="p-6 text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(kpiData.efficiencyScore)} mb-2`}>
                    {kpiData.efficiencyScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Effektivitets Score
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Baseret på brændstofforbrug
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`shadow-lg border-0 ${getScoreBgColor(kpiData.environmentalScore)}`}>
                <CardContent className="p-6 text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(kpiData.environmentalScore)} mb-2`}>
                    {kpiData.environmentalScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Miljø Score
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Baseret på CO₂ udledning
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`shadow-lg border-0 ${getScoreBgColor(kpiData.safetyScore)}`}>
                <CardContent className="p-6 text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(kpiData.safetyScore)} mb-2`}>
                    {kpiData.safetyScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Sikkerheds Score
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Baseret på kørehastighed
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Performance metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {formatNumber(kpiData.totalDrivers)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Aktive Chauffører
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {formatNumber(kpiData.totalDistance)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total km
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    {formatNumber(kpiData.avgConsumption, 1)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Gns. forbrug l/100km
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                    {formatNumber(kpiData.totalCO2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total CO₂ kg
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Detailed KPI analysis */}
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detaljeret KPI Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Effektivitets Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Gns. forbrug:</span>
                        <span className="font-medium">{formatNumber(kpiData.avgConsumption, 1)} l/100km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Effektivitets score:</span>
                        <span className={`font-medium ${getScoreColor(kpiData.efficiencyScore)}`}>
                          {kpiData.efficiencyScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Gns. hastighed:</span>
                        <span className="font-medium">{formatNumber(kpiData.avgSpeed, 1)} km/h</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Miljø og Sikkerhed</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total CO₂:</span>
                        <span className="font-medium">{formatNumber(kpiData.totalCO2)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Miljø score:</span>
                        <span className={`font-medium ${getScoreColor(kpiData.environmentalScore)}`}>
                          {kpiData.environmentalScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Sikkerheds score:</span>
                        <span className={`font-medium ${getScoreColor(kpiData.safetyScore)}`}>
                          {kpiData.safetyScore}/100
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
                Ingen KPI data fundet for de valgte filtre
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