/**
 * Report Viewer Komponent
 * Viser detaljerede rapportdata med rangeringer og nøgletal
 * Baseret på Python-applikationens rapportvisning
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPercentage, DriverData, CalculatedMetrics } from '../libs/report-utils';

// Interface for rapport data
interface ReportData {
  type: 'samlet' | 'gruppe' | 'individuel';
  period: string;
  totalDrivers: number;
  overallRanking: Array<{
    driver: string;
    totalScore: number;
    weightAdjustedConsumption: number;
    rankings: {
      Tomgangsprocent: number;
      'Fartpilot Andel': number;
      'Motorbremse Andel': number;
      'Påløbsdrift Andel': number;
    };
  }>;
  drivers?: Array<{
    // Alle felter fra DriverData interface
    id: string;
    month: number;
    year: number;
    created_at: string;
    updated_at: string;
    driver_name: string;
    vehicles: string;
    anticipatory_driving_assessment: number;
    anticipatory_driving_without_cruise: number;
    from_date: number;
    to_date: number;
    avg_consumption_per_100km: number;
    avg_consumption_driving: number;
    avg_consumption_idling: number;
    avg_range_per_consumption: number;
    total_consumption: number;
    avg_total_weight: number;
    driving_distance: number;
    efficiency_l_per_t_per_100km: number;
    engine_runtime: string;
    driving_time: string;
    idle_standstill_time: string;
    avg_speed: number;
    co2_emission: number;
    coasting_assessment: number;
    active_coasting_km: number;
    active_coasting_duration: string;
    active_pushing_count: number;
    coasting_distance: number;
    coasting_duration_with_cruise: string;
    coasting_phases_count: number;
    accelerator_assessment: number;
    kickdown_km: number;
    kickdown_duration: string;
    kickdown_count: number;
    accelerator_with_cruise_km: number;
    accelerator_with_cruise_duration: string;
    accelerator_activations_with_cruise: number;
    consumption_without_cruise: number;
    consumption_with_cruise: number;
    brake_behavior_assessment: number;
    service_brake_km: number;
    service_brake_duration: string;
    service_brake_count: number;
    engine_brake_distance: number;
    engine_brake_duration: string;
    engine_brake_count: number;
    retarder_distance: number;
    retarder_duration: string;
    retarder_count: number;
    emergency_brake_assist_count: number;
    cruise_control_assessment: number;
    cruise_distance_over_50: number;
    cruise_duration_over_50: string;
    distance_over_50_without_cruise: number;
    duration_over_50_without_cruise: string;
    avg_cruise_distance_over_50: number;
    overspeed_assessment: number;
    overspeed_km_without_coasting: number;
    total_usage: string;
    duty_days: string;
    electric_consumption_kwh: number;
    electric_avg_consumption_driving: number;
    electric_avg_standstill_consumption: number;
    electric_avg_range: number;
    electric_total_avg_consumption: number;
    electric_energy_efficiency: number;
    electric_recreation_kwh: number;
    electric_recovery_assessment: number;
    electric_anticipatory_driving: number;
    electric_accelerator_capacity: number;
    electric_cruise_usage_assessment: number;
    electric_overspeed_classification: number;
    metrics: {
      Tomgangsprocent: number;
      'Fartpilot Andel': number;
      'Motorbremse Andel': number;
      'Påløbsdrift Andel': number;
      'Diesel Effektivitet': number;
      'Vægtkorrigeret Forbrug': number;
      'Overspeed Andel': number;
    };
  }>;
  driver?: DriverData; // For individuel rapport
  metrics?: CalculatedMetrics; // For individuel rapport
  generatedAt: string;
}

interface ReportViewerProps {
  reportData: ReportData;
  onClose: () => void;
}

export default function ReportViewer({ reportData, onClose }: ReportViewerProps) {
  console.log('📊 Initialiserer Report Viewer med data:', reportData);
  
  const [activeSection, setActiveSection] = useState<'overview' | 'ranking' | 'details'>('overview');
  
  /**
   * Formaterer dato til dansk format
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Formaterer tid fra sekunder til "hh:mm:ss"
   */
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  console.log('🎨 Renderer Report Viewer komponent...');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {reportData.type === 'samlet' && 'Samlet Rapport'}
              {reportData.type === 'gruppe' && 'Gruppe Rapport'}
              {reportData.type === 'individuel' && 'Individuel Rapport'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {reportData.period} • {reportData.totalDrivers} chauffører • Genereret {formatDate(reportData.generatedAt)}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕ Luk
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveSection('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Oversigt
            </button>
            <button
              onClick={() => setActiveSection('ranking')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'ranking'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Rangering
            </button>
            <button
              onClick={() => setActiveSection('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'details'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Detaljer
            </button>
          </nav>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Samlet statistik */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    Samlet Statistik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {reportData.totalDrivers}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Kvalificerede Chauffører
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {reportData.period}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Rapport Periode
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                        {formatDate(reportData.generatedAt)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Genereret
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top 3 chauffører */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top 3 Chauffører
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.overallRanking.slice(0, 3).map((driver, index) => (
                      <div key={driver.driver} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {driver.driver}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Samlet score: {driver.totalScore}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Vægtkorrigeret forbrug
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(driver.weightAdjustedConsumption, 2)} l/100km/t
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeSection === 'ranking' && (
            <div className="space-y-6">
              {/* Samlet rangering */}
              <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    Samlet Performance Rangering
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Placering</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Chauffør</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Samlet Score</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Tomgang</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Fartpilot</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Motorbremse</th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">Påløbsdrift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.overallRanking.map((driver, index) => (
                          <tr key={driver.driver} className={index < 3 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium">
                              {index + 1}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium">
                              {driver.driver}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                              {driver.totalScore}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                              {driver.rankings.Tomgangsprocent}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                              {driver.rankings['Fartpilot Andel']}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                              {driver.rankings['Motorbremse Andel']}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                              {driver.rankings['Påløbsdrift Andel']}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Forklaring af rangering</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Den samlede rangering kombinerer præstationen på fire nøgleområder med følgende virksomhedsmål:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-200 mt-2 space-y-1">
                      <li>• Tomgang: Mål på max 5% - Minimering af unødvendig tomgangskørsel</li>
                      <li>• Fartpilot: Mål på minimum 66,5% - Optimal brug af fartpilot ved højere hastigheder</li>
                      <li>• Motorbremse: Mål på minimum 56% - Effektiv brug af motorbremsning</li>
                      <li>• Påløbsdrift: Mål på minimum 7% - Udnyttelse af køretøjets momentum</li>
                    </ul>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                      Hver chauffør får points baseret på deres placering i hver kategori. 
                      Lavere samlet score er bedre, da det betyder bedre placeringer på tværs af kategorierne. 
                      De tre bedste chauffører er markeret med grøn for at fremhæve særligt god præstation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeSection === 'details' && reportData.drivers && (
            <div className="space-y-6">
              {reportData.drivers.map((driver) => (
                <Card key={driver.driver_name} className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {driver.driver_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Driftsdata - identisk med Python */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Driftsdata</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Ø Forbrug [l/100km]:</span>
                            <span className="font-medium">{formatNumber(driver.avg_consumption_per_100km, 1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Ø Rækkevidde ved forbrug [km/l]:</span>
                            <span className="font-medium">{formatNumber(driver.avg_range_per_consumption, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Ø Forbrug ved kørsel [l/100km]:</span>
                            <span className="font-medium">{formatNumber(driver.avg_consumption_driving, 1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Forbrug [l]:</span>
                            <span className="font-medium">{formatNumber(driver.total_consumption)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Kørestrækning [km]:</span>
                            <span className="font-medium">{formatNumber(driver.driving_distance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Ø totalvægt [t]:</span>
                            <span className="font-medium">{formatNumber(driver.avg_total_weight, 1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Kørselsdata - identisk med Python */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kørselsdata</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Aktiv påløbsdrift (km) [km]:</span>
                            <span className="font-medium">{formatNumber(driver.active_coasting_km)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Afstand i påløbsdrift [km]:</span>
                            <span className="font-medium">{formatNumber(driver.coasting_distance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Kickdown (km) [km]:</span>
                            <span className="font-medium">{formatNumber(driver.kickdown_km)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Afstand med kørehastighedsregulering (&gt; 50 km/h) [km]:</span>
                            <span className="font-medium">{formatNumber(driver.cruise_distance_over_50)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Afstand &gt; 50 km/h uden kørehastighedsregulering [km]:</span>
                            <span className="font-medium">{formatNumber(driver.distance_over_50_without_cruise)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Forbrug med kørehastighedsregulering [l/100km]:</span>
                            <span className="font-medium">{formatNumber(driver.consumption_with_cruise, 1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Forbrug uden kørehastighedsregulering [l/100km]:</span>
                            <span className="font-medium">{formatNumber(driver.consumption_without_cruise, 1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Driftsbremse (km) [km]:</span>
                            <span className="font-medium">{formatNumber(driver.service_brake_km)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Afstand motorbremse [km]:</span>
                            <span className="font-medium">{formatNumber(driver.engine_brake_distance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Overspeed (km uden påløbsdrift) [km]:</span>
                            <span className="font-medium">{formatNumber(driver.overspeed_km_without_coasting)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tomgangsdata - identisk med Python */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Tomgangsdata</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Motordriftstid [hh:mm:ss]:</span>
                            <span className="font-medium">{driver.engine_runtime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Køretid [hh:mm:ss]:</span>
                            <span className="font-medium">{driver.driving_time}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Tomgang / stilstandstid [hh:mm:ss]:</span>
                            <span className="font-medium">{driver.idle_standstill_time}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Nøgletal - identisk med Python */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Nøgletal</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Tomgang:</span>
                            <span className="font-medium">{formatPercentage(driver.metrics.Tomgangsprocent)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Fartpilot andel:</span>
                            <span className="font-medium">{formatPercentage(driver.metrics['Fartpilot Andel'])}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Motorbremse andel:</span>
                            <span className="font-medium">{formatPercentage(driver.metrics['Motorbremse Andel'])}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Påløbsdrift andel:</span>
                            <span className="font-medium">{formatPercentage(driver.metrics['Påløbsdrift Andel'])}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Diesel effektivitet:</span>
                            <span className="font-medium">{formatNumber(driver.metrics['Diesel Effektivitet'], 2)} km/l</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Vægtkorrigeret forbrug:</span>
                            <span className="font-medium">{formatNumber(driver.metrics['Vægtkorrigeret Forbrug'], 2)} l/100km/t</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Overspeed andel:</span>
                            <span className="font-medium">{formatPercentage(driver.metrics['Overspeed Andel'])}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 