/**
 * Rapport hjælpefunktioner for FSK Online Dashboard
 * Baseret på Python-applikationens rapportgenereringslogik
 * Håndterer beregning af nøgletal og rapportdata
 */

import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for chauffør data - 100% korrekt mapping fra data.md (73 felter total)
export interface DriverData {
  // Administrative felter (5 stk.) - kun i database, ikke Excel
  id: string;                     // uuid - primær nøgle
  month: number;                  // integer - måned som tal (6 for juni)  
  year: number;                   // integer - år som tal (2025)
  created_at: string;             // timestamp with time zone - oprettelsestidsstempel
  updated_at: string;             // timestamp with time zone - opdateringstidsstempel
  
  // Datafelter fra Excel (68 stk.) - præcis mapping til data.md tabel
  driver_name: string;                              // 1. Chauffør
  vehicles: string;                                 // 2. Køretøjer
  anticipatory_driving_assessment: number;          // 3. Forudseende kørsel (vurdering) [%]
  anticipatory_driving_without_cruise: number;      // 4. Forudseende kørsel uden kørehastighedsregulering [%]
  from_date: number;                               // 5. Fra (Excel serienummer)
  to_date: number;                                 // 6. Til (Excel serienummer)
  avg_consumption_per_100km: number;               // 7. Ø Forbrug [l/100km]
  avg_consumption_driving: number;                 // 8. Ø Forbrug ved kørsel [l/100km]
  avg_consumption_idling: number;                  // 9. Ø Forbrug ved tomgang [l/t]
  avg_range_per_consumption: number;               // 10. Ø Rækkevidde ved forbrug [km/l]
  total_consumption: number;                       // 11. Forbrug [l]
  avg_total_weight: number;                        // 12. Ø totalvægt [t]
  driving_distance: number;                        // 13. Kørestrækning [km]
  efficiency_l_per_t_per_100km: number;           // 14. Effektivitet [l/t/100km]
  engine_runtime: string;                          // 15. Motordriftstid [hh:mm:ss]
  driving_time: string;                            // 16. Køretid [hh:mm:ss]
  idle_standstill_time: string;                    // 17. Tomgang / stilstandstid [hh:mm:ss]
  avg_speed: number;                               // 18. Ø-hastighed [km/h]
  co2_emission: number;                            // 19. CO₂-emission [kg]
  coasting_assessment: number;                     // 20. Vurdering af påløbsdrift [%]
  active_coasting_km: number;                      // 21. Aktiv påløbsdrift (km) [km]
  active_coasting_duration: string;                // 22. Varigheden af aktiv påløbsdrift [hh:mm:ss]
  active_pushing_count: number;                    // 23. Aktivt skubbedrev (stk.)
  coasting_distance: number;                       // 24. Afstand i påløbsdrift [km]
  coasting_duration_with_cruise: string;           // 25. Varighed af påløbsdrift med kørehastighedsregulering [hh:mm:ss]
  coasting_phases_count: number;                   // 26. Antal faser i påløbsdrift
  accelerator_assessment: number;                  // 27. Gaspedal-vurdering [%]
  kickdown_km: number;                             // 28. Kickdown (km) [km]
  kickdown_duration: string;                       // 29. Varighed af brugen af kickdown [hh:mm:ss]
  kickdown_count: number;                          // 30. Kickdown (stk.)
  accelerator_with_cruise_km: number;              // 31. Tilbagelagt afstand ved aktivering af gaspedal og tilkoblet kørehastighedsregulering [km]
  accelerator_with_cruise_duration: string;        // 32. Varigheden af aktivering af gaspedal og tilkoblet kørehastighedsregulering [hh:mm:ss]
  accelerator_activations_with_cruise: number;     // 33. Antal aktiveringer af gaspedal ved kørehastighedsregulering
  consumption_without_cruise: number;              // 34. Forbrug uden kørehastighedsregulering [l/100km]
  consumption_with_cruise: number;                 // 35. Forbrug med kørehastighedsregulering [l/100km]
  brake_behavior_assessment: number;               // 36. Vurdering af bremseadfærd [%]
  service_brake_km: number;                        // 37. Driftsbremse (km) [km]
  service_brake_duration: string;                  // 38. Varighed driftsbremse [hh:mm:ss]
  service_brake_count: number;                     // 39. Driftsbremse (stk.)
  engine_brake_distance: number;                   // 40. Afstand motorbremse [km]
  engine_brake_duration: string;                   // 41. Varighed af motorbremse [hh:mm:ss]
  engine_brake_count: number;                      // 42. Motorbremse (tæller)
  retarder_distance: number;                       // 43. Afstand retarder [km] (ofte null)
  retarder_duration: string;                       // 44. Varighed retarder [hh:mm:ss] (ofte null)
  retarder_count: number;                          // 45. Retarder (stk.) (ofte null)
  emergency_brake_assist_count: number;            // 46. Nødbremseassistent (tæller)
  cruise_control_assessment: number;               // 47. Vurdering af brugen af kørehastighedsregulering [%]
  cruise_distance_over_50: number;                 // 48. Afstand med kørehastighedsregulering (> 50 km/h) [km]
  cruise_duration_over_50: string;                 // 49. Varighed af kørehastighedsregulering (> 50 km/h) [hh:mm:ss]
  distance_over_50_without_cruise: number;         // 50. Afstand > 50 km/h uden kørehastighedsregulering [km]
  duration_over_50_without_cruise: string;         // 51. Varighed uden kørehastighedsregulering > 50 km/h [hh:mm:ss]
  avg_cruise_distance_over_50: number;             // 52. Gryde. afstand med fartpilot (> 50 km/h) [km]
  overspeed_assessment: number;                     // 53. Vurdering overspeed
  overspeed_km_without_coasting: number;           // 54. Overspeed (km uden påløbsdrift) [km]
  total_usage: string;                             // 55. Samlet anvendelse (f.eks. "let")
  duty_days: string;                               // 56. Indsatsdage (f.eks. "19 / 30")
  electric_consumption_kwh: number;                // 57. Forbrug [kWh] (kun hybrid/elektriske)
  electric_avg_consumption_driving: number;        // 58. Ø Forbrug ved kørsel [kWh/km] (kun hybrid/elektriske)
  electric_avg_standstill_consumption: number;     // 59. Gns. stilstandsforbrug [kWh/km] (kun hybrid/elektriske)
  electric_avg_range: number;                      // 60. Ø Rækkevidde ved forbrug [km/kWh] (kun hybrid/elektriske)
  electric_total_avg_consumption: number;          // 61. Ø Forbrug [kWh/km] (kun hybrid/elektriske)
  electric_energy_efficiency: number;              // 62. Energieffektivitet [kWh/t/km] (kun hybrid/elektriske)
  electric_recreation_kwh: number;                 // 63. Elektrisk rekreation [kWh] (kun hybrid/elektriske)
  electric_recovery_assessment: number;            // 64. Elektrisk genvindingsvurdering [%] (kun hybrid/elektriske)
  electric_anticipatory_driving: number;           // 65. Elektrisk fremsynet kørsel (vurdering) [%] (kun hybrid/elektriske)
  electric_accelerator_capacity: number;           // 66. Elektrisk gaspedals kapacitet [%] (kun hybrid/elektriske)
  electric_cruise_usage_assessment: number;        // 67. Brugsvurdering af elektrisk fartpilot [%] (kun hybrid/elektriske)
  electric_overspeed_classification: number;       // 68. Elektrisk overhastighedsklassificering [%] (kun hybrid/elektriske)
}

// Interface for beregnede nøgletal
export interface CalculatedMetrics {
  Tomgangsprocent: number;
  'Fartpilot Andel': number;
  'Motorbremse Andel': number;
  'Påløbsdrift Andel': number;
  'Diesel Effektivitet': number;
  'Vægtkorrigeret Forbrug': number;
  'Overspeed Andel': number;
}

// Interface for rapport konfiguration
export interface ReportConfig {
  minKm: number;
  reportType: 'samlet' | 'gruppe' | 'individuel';
  selectedGroup?: string;
  selectedDriver?: string;
  month?: number;
  year?: number;
}

/**
 * Konverterer tid fra "hh:mm:ss" format til sekunder
 * @param timeString - Tid i "hh:mm:ss" format
 * @returns Antal sekunder
 */
export function convertTimeToSeconds(timeString: string): number {
  console.log(`${LOG_PREFIXES.form} Konverterer tid til sekunder:`, timeString);
  
  if (!timeString || typeof timeString !== 'string') {
    console.log(`${LOG_PREFIXES.warning} Ugyldig tidestring, returnerer 0`);
    return 0;
  }
  
  try {
    const parts = timeString.split(':').map(Number);
    if (parts.length !== 3) {
      console.log(`${LOG_PREFIXES.warning} Ugyldigt tidformat, returnerer 0`);
      return 0;
    }
    
    const [hours, minutes, seconds] = parts;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    console.log(`${LOG_PREFIXES.success} Tid konverteret til sekunder:`, totalSeconds);
    return totalSeconds;
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved konvertering af tid:`, error);
    return 0;
  }
}

/**
 * Beregner nøgletal baseret på chaufførdata
 * Identisk med Python-applikationens beregninger
 * @param data - Chaufførdata
 * @returns Beregnede nøgletal
 */
export function calculateMetrics(data: DriverData): CalculatedMetrics {
  console.log(`${LOG_PREFIXES.form} Beregner nøgletal for chauffør:`, data.driver_name);
  
  try {
    const metrics: CalculatedMetrics = {
      Tomgangsprocent: 0,
      'Fartpilot Andel': 0,
      'Motorbremse Andel': 0,
      'Påløbsdrift Andel': 0,
      'Diesel Effektivitet': 0,
      'Vægtkorrigeret Forbrug': 0,
      'Overspeed Andel': 0
    };
    
    // Beregn tomgangsprocent - identisk med Python
    const motorTime = convertTimeToSeconds(data.engine_runtime || '00:00:00');
    const idleTime = convertTimeToSeconds(data.idle_standstill_time || '00:00:00');
    metrics.Tomgangsprocent = motorTime > 0 ? (idleTime / motorTime) * 100 : 0;
    
    // Beregn fartpilot andel - identisk med Python
    const distanceOver50 = (data.cruise_distance_over_50 || 0) + (data.distance_over_50_without_cruise || 0);
    const cruiseDistance = data.cruise_distance_over_50 || 0;
    metrics['Fartpilot Andel'] = distanceOver50 > 0 ? (cruiseDistance / distanceOver50) * 100 : 0;
    
    // Beregn motorbremse andel - identisk med Python
    const serviceBrake = data.service_brake_km || 0;
    const engineBrake = data.engine_brake_distance || 0;
    const totalBrakeDistance = serviceBrake + engineBrake;
    metrics['Motorbremse Andel'] = totalBrakeDistance > 0 ? (engineBrake / totalBrakeDistance) * 100 : 0;
    
    // Beregn diesel effektivitet (km/l) - identisk med Python
    const consumption = data.total_consumption || 0;
    const distance = data.driving_distance || 0;
    metrics['Diesel Effektivitet'] = consumption > 0 ? distance / consumption : 0;
    
    // Beregn vægtkorrigeret forbrug - identisk med Python
    const totalWeight = data.avg_total_weight || 0;
    if (totalWeight > 0 && consumption > 0 && distance > 0) {
      metrics['Vægtkorrigeret Forbrug'] = (consumption / distance * 100) / totalWeight;
    }
    
    // Beregn påløbsdrift andel - identisk med Python
    const totalDistance = data.driving_distance || 0;
    const activeCoasting = data.active_coasting_km || 0;
    const coastingDistance = data.coasting_distance || 0;
    metrics['Påløbsdrift Andel'] = totalDistance > 0 ? 
      ((activeCoasting + coastingDistance) / totalDistance) * 100 : 0;
    
    // Beregn overspeed andel - identisk med Python
    const overspeed = data.overspeed_km_without_coasting || 0;
    metrics['Overspeed Andel'] = totalDistance > 0 ? (overspeed / totalDistance) * 100 : 0;
    
    console.log(`${LOG_PREFIXES.success} Nøgletal beregnet for ${data.driver_name}:`, metrics);
    return metrics;
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved beregning af nøgletal:`, error);
    return {
      Tomgangsprocent: 0,
      'Fartpilot Andel': 0,
      'Motorbremse Andel': 0,
      'Påløbsdrift Andel': 0,
      'Diesel Effektivitet': 0,
      'Vægtkorrigeret Forbrug': 0,
      'Overspeed Andel': 0
    };
  }
}

/**
 * Beregner samlet rangering for alle chauffører
 * Identisk med Python-applikationens rangering
 * @param driversData - Array af chaufførdata
 * @returns Sorteret array med rangering
 */
export function calculateOverallRanking(driversData: DriverData[]): Array<{
  driver: string;
  totalScore: number;
  weightAdjustedConsumption: number;
  rankings: {
    Tomgangsprocent: number;
    'Fartpilot Andel': number;
    'Motorbremse Andel': number;
    'Påløbsdrift Andel': number;
  };
}> {
  console.log(`${LOG_PREFIXES.form} Beregner samlet rangering for ${driversData.length} chauffører`);
  
  try {
    // Beregn nøgletal for alle chauffører - identisk med Python
    const driverMetrics = driversData.map(driver => {
      const metrics = calculateMetrics(driver);
      return {
        driver: driver.driver_name,
        metrics,
        weightAdjustedConsumption: metrics['Vægtkorrigeret Forbrug']
      };
    });
    
    // Definer nøgletal til rangering og om højere er bedre - identisk med Python
    const rankingMetrics = {
      'Tomgangsprocent': false, // Lavere er bedre
      'Fartpilot Andel': true,   // Højere er bedre
      'Motorbremse Andel': true, // Højere er bedre
      'Påløbsdrift Andel': true  // Højere er bedre
    };
    
    // Beregn placering for hver chauffør i hver kategori - identisk med Python
    const rankings: { [driver: string]: any } = {};
    
    Object.entries(rankingMetrics).forEach(([metric, higherIsBetter]) => {
      const sortedDrivers = driverMetrics
        .map(dm => ({ driver: dm.driver, value: dm.metrics[metric as keyof CalculatedMetrics] }))
        .sort((a, b) => higherIsBetter ? b.value - a.value : a.value - b.value);
      
      sortedDrivers.forEach((item, index) => {
        if (!rankings[item.driver]) {
          rankings[item.driver] = {};
        }
        rankings[item.driver][metric] = index + 1;
      });
    });
    
    // Beregn samlet score og sorter - identisk med Python
    const overallRanking = driverMetrics.map(dm => {
      const driverRankings = rankings[dm.driver];
      const totalScore = Object.values(driverRankings).reduce((sum: number, rank: any) => sum + rank, 0);
      
      return {
        driver: dm.driver,
        totalScore,
        weightAdjustedConsumption: dm.weightAdjustedConsumption,
        rankings: driverRankings
      };
    });
    
    // Sorter efter samlet score og derefter vægtkorrigeret forbrug - identisk med Python
    overallRanking.sort((a, b) => {
      if (a.totalScore !== b.totalScore) {
        return a.totalScore - b.totalScore;
      }
      return a.weightAdjustedConsumption - b.weightAdjustedConsumption;
    });
    
    console.log(`${LOG_PREFIXES.success} Samlet rangering beregnet for ${overallRanking.length} chauffører`);
    return overallRanking;
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved beregning af samlet rangering:`, error);
    return [];
  }
}

/**
 * Filtrerer chauffører baseret på minimum kilometer
 * @param driversData - Array af chaufførdata
 * @param minKm - Minimum kilometer krav
 * @returns Filtreret array af chaufførdata
 */
export function filterQualifiedDrivers(driversData: DriverData[], minKm: number): DriverData[] {
  console.log(`${LOG_PREFIXES.form} Filtrerer chauffører med minimum ${minKm} km`);
  
  const qualified = driversData.filter(driver => (driver.driving_distance || 0) >= minKm);
  
  console.log(`${LOG_PREFIXES.success} ${qualified.length} af ${driversData.length} chauffører kvalificeret`);
  return qualified;
}

/**
 * Formaterer tal med dansk formatering
 * @param value - Tal at formatere
 * @param decimals - Antal decimaler
 * @returns Formateret tal som string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('da-DK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formaterer procent med dansk formatering
 * @param value - Procentværdi (0-100)
 * @param decimals - Antal decimaler
 * @returns Formateret procent som string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Genererer rapport filnavn
 * @param reportType - Type af rapport
 * @param month - Måned
 * @param year - År
 * @param driverName - Chaufførnavn (kun for individuel rapport)
 * @returns Genereret filnavn
 */
export function generateReportFilename(
  reportType: string, 
  month: number, 
  year: number, 
  driverName?: string
): string {
  const monthNames = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ];
  
  const monthName = monthNames[month - 1] || 'Ukendt';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  if (reportType === 'individuel' && driverName) {
    const safeName = driverName.replace(/[^a-zA-Z0-9\s-]/g, '');
    return `Fiskelogistik_Chauffør_${safeName}_${monthName}_${year}_${timestamp}.docx`;
  }
  
  return `Fiskelogistik_Chaufførrapport_${monthName}_${year}_${timestamp}.docx`;
}

/**
 * Validerer rapport konfiguration
 * @param config - Rapport konfiguration
 * @returns Valideringsresultat
 */
export function validateReportConfig(config: ReportConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.minKm <= 0) {
    errors.push('Minimum kilometer skal være større end 0');
  }
  
  if (!['samlet', 'gruppe', 'individuel'].includes(config.reportType)) {
    errors.push('Ugyldig rapport type');
  }
  
  if (config.reportType === 'gruppe' && !config.selectedGroup) {
    errors.push('Gruppe skal vælges for gruppe rapport');
  }
  
  if (config.reportType === 'individuel' && !config.selectedDriver) {
    errors.push('Chauffør skal vælges for individuel rapport');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Eksporter alle funktioner
export default {
  convertTimeToSeconds,
  calculateMetrics,
  calculateOverallRanking,
  filterQualifiedDrivers,
  formatNumber,
  formatPercentage,
  generateReportFilename,
  validateReportConfig
}; 