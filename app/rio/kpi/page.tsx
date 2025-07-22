/**
 * RIO KPI Side - Avanceret KPI Dashboard
 * Implementeret baseret på Python-version med 8 KPIer og historisk data
 * Viser detaljerede performance metrics med farveindikatorer og trends
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
import KPIGraphs from '@/components/KPIGraphs'; // KPI Grafer komponent
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

// Interface for KPI data baseret på Python-versionen
interface KPIData {
  // Hoveddata
  totalDrivers: number;
  totalDistance: number;
  period: string;
  
  // KPI værdier
  idlePercentage: number; // Tomgangsprocent
  cruiseControlPercentage: number; // Fartpilot andel
  engineBrakePercentage: number; // Motorbremse andel
  coastingPercentage: number; // Påløbsdrift andel
  dieselEfficiency: number; // Diesel effektivitet (km/l)
  weightAdjustedConsumption: number; // Vægtkorrigeret forbrug (l/100km/t)
  overspeedPercentage: number; // Overspeed andel
  co2Efficiency: number; // CO₂ effektivitet (kg CO₂/ton-km)
  
  // Historisk data for sammenligning
  previousMonthData?: KPIData;
  
  // Farveindikatorer
  idleColor: string;
  cruiseColor: string;
  engineBrakeColor: string;
  coastingColor: string;
  dieselColor: string;
  weightColor: string;
  overspeedColor: string;
  co2Color: string;
  
  // Ændringsindikatorer
  idleChange: number;
  cruiseChange: number;
  engineBrakeChange: number;
  coastingChange: number;
  dieselChange: number;
  weightChange: number;
  overspeedChange: number;
  co2Change: number;
}

// Interface for historisk data
interface HistoricalData {
  month: number;
  year: number;
  data: {
    idlePercentage: number;
    cruiseControlPercentage: number;
    engineBrakePercentage: number;
    coastingPercentage: number;
    dieselEfficiency: number;
    weightAdjustedConsumption: number;
    overspeedPercentage: number;
    co2Efficiency: number;
  };
}

// Interface for chaufførdata hentet fra Supabase driver_data tabellen
interface DriverData {
  driver_name?: string; // Navn på chauffør
  engine_runtime?: string; // Motortid i format hh:mm:ss
  idle_standstill_time?: string; // Tomgangstid i format hh:mm:ss
  driving_distance?: number; // Kørte kilometer
  cruise_distance_over_50?: number; // Km med fartpilot over 50 km/t
  distance_over_50_without_cruise?: number; // Km over 50 km/t uden fartpilot
  engine_brake_distance?: number; // Km med motorbremse
  service_brake_km?: number; // Km med driftsbremse
  active_coasting_km?: number; // Km med påløbsdrift
  coasting_distance?: number; // Yderligere km med påløbsdrift
  overspeed_km_without_coasting?: number; // Km over hastighedsgrænse uden påløbsdrift
  total_consumption?: number; // Brændstofforbrug
  avg_total_weight?: number; // Gennemsnitlig vægt
  co2_emission?: number; // CO2-udledning
  driving_time?: string; // Kørselstid i format hh:mm:ss
}

export default function RIOKPIPage() {
  console.log('📈 Initialiserer avanceret RIO KPI Dashboard...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [minDistanceFilter, setMinDistanceFilter] = useState<number>(100); // Minimum kørestrækning filter
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  

  
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
        
        // Hent minimum kørestrækning fra indstillinger
        const savedMinDistance = localStorage.getItem('rio-min-distance');
        if (savedMinDistance) {
          setMinDistanceFilter(parseInt(savedMinDistance));
        }
        
        // Hent KPI data (inkluderer historisk data for grafer)
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
   * Henter historisk KPI data fra alle måneder (som Python-versionen)
   */
  const loadKPIData = async () => {
    console.log('📊 Henter historisk KPI data fra alle måneder...');
    
    try {
      // Find alle unikke måneder med data (sorteret nyeste først)
      const { data: allMonths, error: monthsError } = await supabase
        .from('driver_data')
        .select('month, year')
        .gte('driving_distance', minDistanceFilter)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (monthsError) {
        console.error('❌ Fejl ved hentning af måneder:', monthsError);
        toast.error('Kunne ikke hente månedsdata');
        return;
      }
      
      // Fjern duplikater og sorter
      const uniqueMonths = Array.from(
        new Set(allMonths.map(m => `${m.year}-${m.month}`))
      ).map(dateStr => {
        const [year, month] = dateStr.split('-').map(Number);
        return { year, month };
      });
      
      console.log('📅 Unikke måneder fundet:', uniqueMonths);
      
      if (uniqueMonths.length === 0) {
        console.log('⚠️ Ingen data fundet');
        setKpiData(null);
        return;
      }
      
      // Hent data for alle måneder og beregn KPIer
      const historicalData: { [key: string]: KPIData } = {};
      const graphHistoricalData: HistoricalData[] = [];
      
      for (const { month, year } of uniqueMonths) {
        console.log(`📊 Henter data for ${month}/${year}...`);
        
        const { data: monthData, error: monthError } = await supabase
          .from('driver_data')
          .select('*')
          .eq('month', month)
          .eq('year', year)
          .gte('driving_distance', minDistanceFilter);
        
        if (monthError) {
          console.error(`❌ Fejl ved hentning af ${month}/${year}:`, monthError);
          continue;
        }
        
        if (monthData && monthData.length > 0) {
          // Beregn KPIer for denne måned (som Python: gennemsnit af alle chauffører)
          const monthKPIs = calculateKPIsPythonStyle(monthData, month, year);
          const monthKey = `${month}/${year}`;
          historicalData[monthKey] = monthKPIs;
          
          // Tilføj til graf data
          graphHistoricalData.push({
            month,
            year,
            data: {
              idlePercentage: monthKPIs.idlePercentage,
              cruiseControlPercentage: monthKPIs.cruiseControlPercentage,
              engineBrakePercentage: monthKPIs.engineBrakePercentage,
              coastingPercentage: monthKPIs.coastingPercentage,
              dieselEfficiency: monthKPIs.dieselEfficiency,
              weightAdjustedConsumption: monthKPIs.weightAdjustedConsumption,
              overspeedPercentage: monthKPIs.overspeedPercentage,
              co2Efficiency: monthKPIs.co2Efficiency
            }
          });
          
          console.log(`✅ KPIer beregnet for ${monthKey}:`, monthData.length, 'chauffører');
        }
      }
      
      // Tag nyeste måned som current data (som Python: list(self.historical_data.values())[0])
      const monthKeys = Object.keys(historicalData);
      if (monthKeys.length > 0) {
        const latestMonthKey = monthKeys[0]; // Første er nyeste pga. sortering
        const currentKPIs = historicalData[latestMonthKey];
        
        // Find forrige måned for sammenligning (som Python: dates[1])
        if (monthKeys.length >= 2) {
          const previousMonthKey = monthKeys[1];
          const previousKPIs = historicalData[previousMonthKey];
          currentKPIs.previousMonthData = previousKPIs;
          
          console.log('📊 Debug: Måneds-sammenligning:', {
            currentMonth: latestMonthKey,
            previousMonth: previousMonthKey,
            currentDrivers: currentKPIs.totalDrivers,
            previousDrivers: previousKPIs.totalDrivers,
            currentDistance: currentKPIs.totalDistance,
            previousDistance: previousKPIs.totalDistance
          });
          
          calculateChanges(currentKPIs, previousKPIs);
        } else {
          console.log('⚠️ Debug: Kun én måned fundet, ingen sammenligning mulig');
        }
        
        setKpiData(currentKPIs);
        setHistoricalData(graphHistoricalData);
        console.log('✅ Historisk data indlæst:', monthKeys.length, 'måneder');
      } else {
        setKpiData(null);
        setHistoricalData([]);
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl ved hentning af historisk data:', error);
      toast.error('Der opstod en fejl ved hentning af data');
    }
  };
  
  /**
   * Beregner KPIer Python-style: Beregner KPIer per chauffør, tager gennemsnit
   */
  const calculateKPIsPythonStyle = (data: DriverData[], month: number, year: number): KPIData => {
    console.log('# [DEBUG] KPI: Beregner KPIer Python-style for', data.length, 'chauffører...');
    
    // Beregn KPIer for hver chauffør (som Python: beregn_noegletal for hver chauffør)
    const driverKPIs = data.map(driver => {
      // Konverter tidsdata til sekunder
      const engineRuntime = convertTimeToSeconds(driver.engine_runtime || '0:00:00');
      const idleTime = convertTimeToSeconds(driver.idle_standstill_time || '0:00:00');
      
      // Beregn KPIer for denne chauffør
      const idlePercentage = engineRuntime > 0 ? (idleTime / engineRuntime) * 100 : 0;
      
      const cruiseDistance = driver.cruise_distance_over_50 || 0;
      const distanceOver50 = (driver.cruise_distance_over_50 || 0) + (driver.distance_over_50_without_cruise || 0);
      const cruiseControlPercentage = distanceOver50 > 0 ? (cruiseDistance / distanceOver50) * 100 : 0;
      
      const engineBrakeDistance = driver.engine_brake_distance || 0;
      const serviceBrakeDistance = driver.service_brake_km || 0;
      const engineBrakePercentage = (engineBrakeDistance + serviceBrakeDistance) > 0 ? 
        (engineBrakeDistance / (engineBrakeDistance + serviceBrakeDistance)) * 100 : 0;
      
      const coastingDistance = (driver.active_coasting_km || 0) + (driver.coasting_distance || 0);
      const drivingDistance = driver.driving_distance || 0;
      const coastingPercentage = drivingDistance > 0 ? (coastingDistance / drivingDistance) * 100 : 0;
      
      const totalConsumption = driver.total_consumption || 0;
      const dieselEfficiency = totalConsumption > 0 ? drivingDistance / totalConsumption : 0;
      
      const avgWeight = driver.avg_total_weight || 0;
      const weightAdjustedConsumption = drivingDistance > 0 && avgWeight > 0 ? 
        ((totalConsumption / drivingDistance) * 100) / avgWeight : 0;
      
      const overspeedDistance = driver.overspeed_km_without_coasting || 0;
      const overspeedPercentage = drivingDistance > 0 ? (overspeedDistance / drivingDistance) * 100 : 0;
      
      const co2Emission = driver.co2_emission || 0;
      const co2Efficiency = drivingDistance > 0 && avgWeight > 0 ? 
        (co2Emission / drivingDistance) / avgWeight : 0;
      
      return {
        idlePercentage,
        cruiseControlPercentage,
        engineBrakePercentage,
        coastingPercentage,
        dieselEfficiency,
        weightAdjustedConsumption,
        overspeedPercentage,
        co2Efficiency
      };
    });
    
    // Beregn gennemsnit for alle chauffører (som Python: sum(v)/len(v))
    const avgKPIs = {
      idlePercentage: driverKPIs.reduce((sum, kpi) => sum + kpi.idlePercentage, 0) / driverKPIs.length,
      cruiseControlPercentage: driverKPIs.reduce((sum, kpi) => sum + kpi.cruiseControlPercentage, 0) / driverKPIs.length,
      engineBrakePercentage: driverKPIs.reduce((sum, kpi) => sum + kpi.engineBrakePercentage, 0) / driverKPIs.length,
      coastingPercentage: driverKPIs.reduce((sum, kpi) => sum + kpi.coastingPercentage, 0) / driverKPIs.length,
      dieselEfficiency: driverKPIs.reduce((sum, kpi) => sum + kpi.dieselEfficiency, 0) / driverKPIs.length,
      weightAdjustedConsumption: driverKPIs.reduce((sum, kpi) => sum + kpi.weightAdjustedConsumption, 0) / driverKPIs.length,
      overspeedPercentage: driverKPIs.reduce((sum, kpi) => sum + kpi.overspeedPercentage, 0) / driverKPIs.length,
      co2Efficiency: driverKPIs.reduce((sum, kpi) => sum + kpi.co2Efficiency, 0) / driverKPIs.length
    };
    
    // Bestem periode
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    const period = `${monthNames[month - 1]} ${year}`;
    
    console.log('✅ KPIer beregnet Python-style:', {
      drivers: data.length,
      idlePercentage: avgKPIs.idlePercentage.toFixed(2),
      cruiseControlPercentage: avgKPIs.cruiseControlPercentage.toFixed(2),
      engineBrakePercentage: avgKPIs.engineBrakePercentage.toFixed(2),
      coastingPercentage: avgKPIs.coastingPercentage.toFixed(2),
      dieselEfficiency: avgKPIs.dieselEfficiency.toFixed(2),
      weightAdjustedConsumption: avgKPIs.weightAdjustedConsumption.toFixed(2),
      overspeedPercentage: avgKPIs.overspeedPercentage.toFixed(2),
      co2Efficiency: avgKPIs.co2Efficiency.toFixed(2)
    });
    
    return {
      totalDrivers: data.length,
      totalDistance: data.reduce((sum, driver) => sum + (driver.driving_distance || 0), 0),
      period,
      ...avgKPIs,
      // Farveindikatorer og ændringer sættes senere
      idleColor: 'text-blue-600',
      cruiseColor: 'text-blue-600',
      engineBrakeColor: 'text-blue-600',
      coastingColor: 'text-blue-600',
      dieselColor: 'text-blue-600',
      weightColor: 'text-blue-600',
      overspeedColor: 'text-blue-600',
      co2Color: 'text-blue-600',
      idleChange: 0,
      cruiseChange: 0,
      engineBrakeChange: 0,
      coastingChange: 0,
      dieselChange: 0,
      weightChange: 0,
      overspeedChange: 0,
      co2Change: 0
    };
  };
  
  /**
   * Beregner alle KPIer baseret på chaufførdata (aggregation metode)
   */
  const calculateKPIs = (data: DriverData[], month: number, year: number): KPIData => {
    console.log('# [DEBUG] KPI: Beregner KPIer for', data.length, 'chauffører...');
    console.log('📊 Debug: Minimum distance filter:', minDistanceFilter);
    console.log('📊 Debug: Måned/år:', month, year);
    
    // Debug: Vis første chauffør data
    if (data.length > 0) {
      console.log('📊 Debug: Første chauffør data:', {
        driver_name: data[0].driver_name,
        driving_distance: data[0].driving_distance,
        engine_runtime: data[0].engine_runtime,
        idle_standstill_time: data[0].idle_standstill_time,
        cruise_distance_over_50: data[0].cruise_distance_over_50,
        distance_over_50_without_cruise: data[0].distance_over_50_without_cruise,
        engine_brake_distance: data[0].engine_brake_distance,
        service_brake_km: data[0].service_brake_km,
        active_coasting_km: data[0].active_coasting_km,
        coasting_distance: data[0].coasting_distance,
        overspeed_km_without_coasting: data[0].overspeed_km_without_coasting,
        total_consumption: data[0].total_consumption,
        avg_total_weight: data[0].avg_total_weight,
        co2_emission: data[0].co2_emission
      });
    }
    
    // Aggreger data
    const totalDrivers = data.length;
    const totalDistance = data.reduce((sum, driver) => sum + (driver.driving_distance || 0), 0);
    
    // Tidsdata - konverter hh:mm:ss til sekunder (som Python-versionen)
    const totalEngineRuntime = data.reduce((sum, driver) => {
      return sum + convertTimeToSeconds(driver.engine_runtime || '0:00:00');
    }, 0);
    
    const totalDrivingTime = data.reduce((sum, driver) => {
      return sum + convertTimeToSeconds(driver.driving_time || '0:00:00');
    }, 0);
    
    const totalIdleTime = data.reduce((sum, driver) => {
      return sum + convertTimeToSeconds(driver.idle_standstill_time || '0:00:00');
    }, 0);
    
    // Afstandsdata
    const totalCruiseDistance = data.reduce((sum, driver) => {
      return sum + (driver.cruise_distance_over_50 || 0);
    }, 0);
    
    const totalDistanceOver50 = data.reduce((sum, driver) => {
      return sum + (driver.cruise_distance_over_50 || 0) + (driver.distance_over_50_without_cruise || 0);
    }, 0);
    
    const totalEngineBrakeDistance = data.reduce((sum, driver) => {
      return sum + (driver.engine_brake_distance || 0);
    }, 0);
    
    const totalServiceBrakeDistance = data.reduce((sum, driver) => {
      return sum + (driver.service_brake_km || 0);
    }, 0);
    
    const totalCoastingDistance = data.reduce((sum, driver) => {
      return sum + (driver.active_coasting_km || 0) + (driver.coasting_distance || 0);
    }, 0);
    
    const totalOverspeedDistance = data.reduce((sum, driver) => {
      return sum + (driver.overspeed_km_without_coasting || 0);
    }, 0);
    
    // Forbrugsdata
    const totalConsumption = data.reduce((sum, driver) => {
      return sum + (driver.total_consumption || 0);
    }, 0);
    
    const totalWeight = data.reduce((sum, driver) => {
      return sum + (driver.avg_total_weight || 0);
    }, 0);
    
    const totalCO2 = data.reduce((sum, driver) => {
      return sum + (driver.co2_emission || 0);
    }, 0);
    
    // Beregn KPIer (korrigeret til at matche Python-versionen)
    const idlePercentage = totalEngineRuntime > 0 ? (totalIdleTime / totalEngineRuntime) * 100 : 0;
    const cruiseControlPercentage = totalDistanceOver50 > 0 ? (totalCruiseDistance / totalDistanceOver50) * 100 : 0;
    const engineBrakePercentage = (totalEngineBrakeDistance + totalServiceBrakeDistance) > 0 ? 
      (totalEngineBrakeDistance / (totalEngineBrakeDistance + totalServiceBrakeDistance)) * 100 : 0;
    const coastingPercentage = totalDistance > 0 ? (totalCoastingDistance / totalDistance) * 100 : 0;
    const dieselEfficiency = totalConsumption > 0 ? totalDistance / totalConsumption : 0;
    
    // Vægtkorrigeret forbrug - korrigeret til at bruge total vægt (ikke gennemsnit per chauffør)
    const weightAdjustedConsumption = totalDistance > 0 && totalWeight > 0 ? 
      ((totalConsumption / totalDistance) * 100) / totalWeight : 0;
    
    const overspeedPercentage = totalDistance > 0 ? (totalOverspeedDistance / totalDistance) * 100 : 0;
    
    // CO₂ effektivitet - korrigeret til at bruge total vægt (ikke gennemsnit per chauffør)
    const co2Efficiency = totalDistance > 0 && totalWeight > 0 ? 
      (totalCO2 / totalDistance) / totalWeight : 0;
    
    // Debug: Vis beregnede totaler
    console.log('📊 Debug: Beregnede totaler:', {
      totalDrivers,
      totalDistance: totalDistance.toFixed(2),
      totalEngineRuntime: totalEngineRuntime.toFixed(2),
      totalIdleTime: totalIdleTime.toFixed(2),
      totalCruiseDistance: totalCruiseDistance.toFixed(2),
      totalDistanceOver50: totalDistanceOver50.toFixed(2),
      totalEngineBrakeDistance: totalEngineBrakeDistance.toFixed(2),
      totalServiceBrakeDistance: totalServiceBrakeDistance.toFixed(2),
      totalCoastingDistance: totalCoastingDistance.toFixed(2),
      totalOverspeedDistance: totalOverspeedDistance.toFixed(2),
      totalConsumption: totalConsumption.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      totalCO2: totalCO2.toFixed(2)
    });
    
    // Bestem periode - viser specifik måned
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    const period = `${monthNames[month - 1]} ${year}`;
    
    console.log('✅ KPIer beregnet:', {
      idlePercentage: idlePercentage.toFixed(2),
      cruiseControlPercentage: cruiseControlPercentage.toFixed(2),
      engineBrakePercentage: engineBrakePercentage.toFixed(2),
      coastingPercentage: coastingPercentage.toFixed(2),
      dieselEfficiency: dieselEfficiency.toFixed(2),
      weightAdjustedConsumption: weightAdjustedConsumption.toFixed(2),
      overspeedPercentage: overspeedPercentage.toFixed(2),
      co2Efficiency: co2Efficiency.toFixed(2)
    });
    
    return {
      totalDrivers,
      totalDistance,
      period,
      idlePercentage,
      cruiseControlPercentage,
      engineBrakePercentage,
      coastingPercentage,
      dieselEfficiency,
      weightAdjustedConsumption,
      overspeedPercentage,
      co2Efficiency,
      // Farveindikatorer og ændringer sættes senere
      idleColor: 'text-blue-600',
      cruiseColor: 'text-blue-600',
      engineBrakeColor: 'text-blue-600',
      coastingColor: 'text-blue-600',
      dieselColor: 'text-blue-600',
      weightColor: 'text-blue-600',
      overspeedColor: 'text-blue-600',
      co2Color: 'text-blue-600',
      idleChange: 0,
      cruiseChange: 0,
      engineBrakeChange: 0,
      coastingChange: 0,
      dieselChange: 0,
      weightChange: 0,
      overspeedChange: 0,
      co2Change: 0
    };
  };
  
  /**
   * Konverterer tidsformat hh:mm:ss til sekunder (som Python-versionen)
   */
  const convertTimeToSeconds = (timeString: string): number => {
    if (!timeString || timeString === '0:00:00') return 0;
    
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };
  

  
  /**
   * Beregner ændringer mellem nuværende og forrige måned (som Python-versionen)
   */
  const calculateChanges = (current: KPIData, previous: KPIData) => {
    console.log('📊 Beregner ændringer mellem måneder (som Python)...');
    
    // KPI konfiguration (som Python: self.kpi_config)
    const kpiConfig = {
      idlePercentage: { name: 'Tomgangsprocent', higherIsBetter: false },
      cruiseControlPercentage: { name: 'Fartpilot Andel', higherIsBetter: true },
      engineBrakePercentage: { name: 'Motorbremse Andel', higherIsBetter: true },
      coastingPercentage: { name: 'Påløbsdrift Andel', higherIsBetter: true },
      dieselEfficiency: { name: 'Diesel Effektivitet', higherIsBetter: true },
      weightAdjustedConsumption: { name: 'Vægtkorrigeret Forbrug', higherIsBetter: false },
      overspeedPercentage: { name: 'Overspeed Andel', higherIsBetter: false },
      co2Efficiency: { name: 'CO₂ Effektivitet', higherIsBetter: false }
    };
    
    // Beregn procentvis ændring for hver KPI (som Python: pct_change)
    const calculateChange = (currentValue: number, previousValue: number): number => {
      return previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    };
    
    current.idleChange = calculateChange(current.idlePercentage, previous.idlePercentage);
    current.cruiseChange = calculateChange(current.cruiseControlPercentage, previous.cruiseControlPercentage);
    current.engineBrakeChange = calculateChange(current.engineBrakePercentage, previous.engineBrakePercentage);
    current.coastingChange = calculateChange(current.coastingPercentage, previous.coastingPercentage);
    current.dieselChange = calculateChange(current.dieselEfficiency, previous.dieselEfficiency);
    current.weightChange = calculateChange(current.weightAdjustedConsumption, previous.weightAdjustedConsumption);
    current.overspeedChange = calculateChange(current.overspeedPercentage, previous.overspeedPercentage);
    current.co2Change = calculateChange(current.co2Efficiency, previous.co2Efficiency);
    
    // Bestem farver baseret på om ændringen er forbedring (som Python: is_improvement)
    const determineColor = (change: number, higherIsBetter: boolean): string => {
      const isImprovement = (change > 0) === higherIsBetter;
      return isImprovement ? 'text-green-600' : 'text-red-600';
    };
    
    current.idleColor = determineColor(current.idleChange, kpiConfig.idlePercentage.higherIsBetter);
    current.cruiseColor = determineColor(current.cruiseChange, kpiConfig.cruiseControlPercentage.higherIsBetter);
    current.engineBrakeColor = determineColor(current.engineBrakeChange, kpiConfig.engineBrakePercentage.higherIsBetter);
    current.coastingColor = determineColor(current.coastingChange, kpiConfig.coastingPercentage.higherIsBetter);
    current.dieselColor = determineColor(current.dieselChange, kpiConfig.dieselEfficiency.higherIsBetter);
    current.weightColor = determineColor(current.weightChange, kpiConfig.weightAdjustedConsumption.higherIsBetter);
    current.overspeedColor = determineColor(current.overspeedChange, kpiConfig.overspeedPercentage.higherIsBetter);
    current.co2Color = determineColor(current.co2Change, kpiConfig.co2Efficiency.higherIsBetter);
    
    console.log('✅ Ændringer beregnet (som Python):', {
      idle: `${current.idleChange.toFixed(1)}% (${current.idleColor})`,
      cruise: `${current.cruiseChange.toFixed(1)}% (${current.cruiseColor})`,
      engineBrake: `${current.engineBrakeChange.toFixed(1)}% (${current.engineBrakeColor})`,
      coasting: `${current.coastingChange.toFixed(1)}% (${current.coastingColor})`,
      diesel: `${current.dieselChange.toFixed(1)}% (${current.dieselColor})`,
      weight: `${current.weightChange.toFixed(1)}% (${current.weightColor})`,
      overspeed: `${current.overspeedChange.toFixed(1)}% (${current.overspeedColor})`,
      co2: `${current.co2Change.toFixed(1)}% (${current.co2Color})`
    });
  };
  

  
  /**
   * Genererer KPI når filtre ændres
   */
  useEffect(() => {
    if (!isLoading) {
      loadKPIData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDistanceFilter, isLoading]);
  
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
   * Formaterer procent med pil og farve for seneste måned
   */
  const formatPercentageWithChange = (value: number, change: number, color: string) => {
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
    const changeText = change !== 0 ? ` ${arrow} ${Math.abs(change).toFixed(1)}%` : '';
    
    return (
      <div className="text-center">
        <div className={`text-3xl font-bold ${color}`}>
          {formatNumber(value, 1)}%
        </div>
        {change !== 0 && (
          <div className={`text-sm ${color}`}>
            {arrow} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Formaterer værdi med enhed og ændring for seneste måned
   */
  const formatValueWithChange = (value: number, change: number, color: string, unit: string) => {
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
    const changeText = change !== 0 ? ` ${arrow} ${Math.abs(change).toFixed(1)}%` : '';
    
    // Bestem antal decimaler baseret på enhed
    let decimals = 2;
    if (unit.includes('CO₂')) {
      decimals = 4; // CO₂ Effektivitet skal vise 4 decimaler
    } else if (unit.includes('l/100km/t')) {
      decimals = 3; // Vægtkorrigeret forbrug skal vise 3 decimaler
    }
    
    return (
      <div className="text-center">
        <div className={`text-3xl font-bold ${color}`}>
          {formatNumber(value, decimals)} {unit}
        </div>
        {change !== 0 && (
          <div className={`text-sm ${color}`}>
            {arrow} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };
  
  console.log('🎨 Renderer avanceret RIO KPI Dashboard...');
  
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
        subtitle="RIO Program - Avanceret KPI Dashboard"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Avanceret KPI Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Detaljerede Key Performance Indicators baseret på chaufførdata
          </p>
        </div>
        

        
        {/* KPI data */}
        {kpiData ? (
          <>
            
            {/* Hoved KPI kort - Øverste række */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Tomgangsprocent */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatPercentageWithChange(kpiData.idlePercentage, kpiData.idleChange, kpiData.idleColor)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Tomgangsprocent
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mål: &lt; 5%
                  </div>
                </CardContent>
              </Card>
              
              {/* Fartpilot Andel */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatPercentageWithChange(kpiData.cruiseControlPercentage, kpiData.cruiseChange, kpiData.cruiseColor)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Fartpilot Andel
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mål: &gt; 66,5%
                  </div>
                </CardContent>
              </Card>
              
              {/* Motorbremse Andel */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatPercentageWithChange(kpiData.engineBrakePercentage, kpiData.engineBrakeChange, kpiData.engineBrakeColor)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Motorbremse Andel
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mål: &gt; 56%
                  </div>
                </CardContent>
              </Card>
              
              {/* Påløbsdrift Andel */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatPercentageWithChange(kpiData.coastingPercentage, kpiData.coastingChange, kpiData.coastingColor)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Påløbsdrift Andel
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mål: &gt; 7%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sekundære KPI kort - Nederste række */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Diesel Effektivitet */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatValueWithChange(kpiData.dieselEfficiency, kpiData.dieselChange, kpiData.dieselColor, 'km/l')}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Diesel Effektivitet
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Højere er bedre
                  </div>
                </CardContent>
              </Card>
              
              {/* Vægtkorrigeret Forbrug */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatValueWithChange(kpiData.weightAdjustedConsumption, kpiData.weightChange, kpiData.weightColor, 'l/100km/t')}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Vægtkorrigeret Forbrug
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Lavere er bedre
                  </div>
                </CardContent>
              </Card>
              
              {/* Overspeed Andel */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatPercentageWithChange(kpiData.overspeedPercentage, kpiData.overspeedChange, kpiData.overspeedColor)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    Overspeed Andel
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Lavere er bedre
                  </div>
                </CardContent>
              </Card>
              
              {/* CO₂ Effektivitet */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardContent className="p-6 text-center">
                  {formatValueWithChange(kpiData.co2Efficiency, kpiData.co2Change, kpiData.co2Color, 'kg CO₂/ton-km')}
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 mt-2">
                    CO₂ Effektivitet
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Lavere er bedre
                  </div>
                </CardContent>
              </Card>
            </div>
            

            
            {/* KPI Grafer */}
            <KPIGraphs historicalData={historicalData} />
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