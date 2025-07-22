/**
 * Report Generator Komponent
 * Baseret på Python-applikationens rapportgenereringslogik
 * Håndterer valg af rapport type, database og generering
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ReportViewer from './ReportViewer';
import { supabase } from '../libs/db';
import type { DriverData, CalculatedMetrics } from '../libs/report-utils';

// Interface for rapport type
interface ReportType {
  value: string;
  label: string;
  description: string;
}

// Interface for periode
interface Period {
  year: number;
  month: number;
}

// Interface for rapport konfiguration
interface ReportConfig {
  reportType: string;
  minKm: number;
  month?: number;
  year?: number;
  selectedGroup?: string;
  selectedDriver?: string;
  format: string;
}

// Interface for rapport data (samme som i ReportViewer)
interface DriverWithMetrics extends DriverData {
  metrics: CalculatedMetrics;
}

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
  drivers?: DriverWithMetrics[];
  driver?: DriverWithMetrics;
  metrics?: CalculatedMetrics;
  generatedAt: string;
}

export default function ReportGenerator() {
  console.log('📋 Initialiserer Report Generator komponent...');
  
  // State til rapport konfiguration
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    reportType: '',
    minKm: 100, // Standard minimum kilometer nu 100
    format: 'pdf' // Standard rapportformat nu PDF
  });
  
  // State til tilgængelige muligheder
  const [availableOptions, setAvailableOptions] = useState<{
    periods: Period[];
    drivers: string[];
    reportTypes: ReportType[];
    formats: { value: string; label: string }[];
  }>({
    periods: [],
    drivers: [],
    reportTypes: [],
    formats: []
  });
  
  // State til loading og UI
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'type' | 'period' | 'options' | 'generate'>('type');
  // Brug ReportData | null for korrekt typing
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  
  /**
   * Henter tilgængelige rapport muligheder fra API
   */
  useEffect(() => {
    console.log('📊 Henter tilgængelige rapport muligheder...');
    
    const fetchOptions = async () => {
      try {
        setIsLoading(true);
        
        // Hent session token fra Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';
        
        const response = await fetch('/api/rio/reports/generate', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { 'Authorization': authHeader })
          },
          credentials: 'include' // Inkluder cookies
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ Ingen gyldig session - omdirigerer til login');
            toast.error('Din session er udløbet. Log venligst ind igen.');
            // Omdiriger til login side
            window.location.href = '/';
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Rapport muligheder hentet:', result.data);
          setAvailableOptions(result.data);
        } else {
          console.error('❌ Fejl ved hentning af rapport muligheder:', result.message);
          toast.error(result.message || 'Kunne ikke hente rapport muligheder');
        }
        
      } catch (error) {
        console.error('❌ Uventet fejl ved hentning af rapport muligheder:', error);
        toast.error('Der opstod en fejl ved hentning af muligheder. Prøv at genindlæse siden.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOptions();
  }, []);
  
  /**
   * Håndterer valg af rapport type
   */
  const handleReportTypeSelect = (type: string) => {
    console.log('📋 Rapport type valgt:', type);
    
    setReportConfig(prev => ({
      ...prev,
      reportType: type
    }));
    
    setCurrentStep('period');
  };
  
  /**
   * Håndterer valg af periode
   */
  const handlePeriodSelect = (period: Period) => {
    console.log('📅 Periode valgt:', period);
    
    setReportConfig(prev => ({
      ...prev,
      month: period.month,
      year: period.year
    }));
    
    setCurrentStep('options');
  };
  
  /**
   * Håndterer valg af chauffør (kun for individuel rapport)
   */
  const handleDriverSelect = (driver: string) => {
    console.log('👤 Chauffør valgt:', driver);
    
    setReportConfig(prev => ({
      ...prev,
      selectedDriver: driver
    }));
  };
  
  /**
   * Håndterer valg af gruppe (kun for gruppe rapport)
   */
  const handleGroupSelect = (group: string) => {
    console.log('👥 Gruppe valgt:', group);
    
    setReportConfig(prev => ({
      ...prev,
      selectedGroup: group
    }));
  };
  
  /**
   * Håndterer ændring af minimum kilometer
   */
  const handleMinKmChange = (value: string) => {
    const minKm = parseInt(value) || 1000;
    console.log('📏 Minimum kilometer ændret til:', minKm);
    
    setReportConfig(prev => ({
      ...prev,
      minKm
    }));
  };
  
  /**
   * Håndterer valg af format
   */
  const handleFormatSelect = (format: string) => {
    console.log('📄 Format valgt:', format);
    
    setReportConfig(prev => ({
      ...prev,
      format
    }));
  };
  
  /**
   * Genererer rapport og håndterer både fil downloads og preview
   */
  const generateReport = async () => {
    console.log('🚀 Starter rapportgenerering med konfiguration:', reportConfig);
    
    try {
      setIsGenerating(true);
      
      // Hent session token fra Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';
      
      const response = await fetch('/api/rio/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader })
        },
        credentials: 'include', // Inkluder cookies
        body: JSON.stringify(reportConfig)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Tjek om response er fil download (Word/PDF) eller JSON data
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/vnd.openxmlformats-officedocument') || 
          contentType?.includes('application/pdf')) {
        // Dette er en fil download - identisk med Python fil håndtering
        console.log('📄 Modtager fil download...');
        
        // Hent filnavn fra Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'rapport.docx';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        // Konverter response til blob
        const blob = await response.blob();
        
        // Opret download link og trigger download - online platform metode
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Fil downloadet succesfuldt:', filename);
        toast.success(`Rapport downloadet: ${filename}`);
        
        // Gå tilbage til start efter download
        setCurrentStep('type');
        setReportConfig({
          reportType: '',
          minKm: 100, // Reset til 100
          format: 'pdf' // Reset til PDF
        });
        
      } else {
        // Dette er JSON data for preview
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Rapport data genereret succesfuldt:', result.data);
          toast.success(`${result.data.reportType} rapport genereret for ${result.data.driverCount} chauffører`);
          
          // Gem rapportdata og vis rapportviewer
          setGeneratedReport(result.data.reportData);
        } else {
          console.error('❌ Fejl ved rapportgenerering:', result.message);
          toast.error(result.message || 'Kunne ikke generere rapport');
        }
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl under rapportgenerering:', error);
      toast.error('Der opstod en fejl under rapportgenerering');
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Formaterer periode til læsbar tekst
   */
  const formatPeriod = (period: Period) => {
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    
    const monthName = monthNames[period.month - 1] || 'Ukendt';
    return `${monthName} ${period.year}`;
  };
  
  console.log('🎨 Renderer Report Generator komponent...');
  
  // Vis rapportviewer hvis rapport er genereret
  if (generatedReport) {
    return (
      <ReportViewer 
        reportData={generatedReport} 
        onClose={() => {
          setGeneratedReport(null);
          setCurrentStep('type');
          setReportConfig({
            reportType: '',
            minKm: 100, // Reset til 100
            format: 'pdf' // Reset til PDF
          });
        }} 
      />
    );
  }
  
  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Indlæser rapport muligheder...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Rapport Type Vælger */}
      {currentStep === 'type' && (
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Vælg Rapport Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableOptions.reportTypes.map((type) => (
                <Card 
                  key={type.value}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300 dark:hover:border-blue-600"
                  onClick={() => handleReportTypeSelect(type.value)}
                >
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {type.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Periode Vælger */}
      {currentStep === 'period' && (
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Vælg Periode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableOptions.periods.map((period, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 text-left"
                  onClick={() => handlePeriodSelect(period)}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatPeriod(period)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Klik for at vælge
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep('type')}
                className="text-gray-600 dark:text-gray-300"
              >
                ← Tilbage til rapport type
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Rapport Indstillinger */}
      {currentStep === 'options' && (
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Rapport Indstillinger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Minimum Kilometer */}
            <div>
              <Label htmlFor="min-km" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Minimum Kilometer
              </Label>
              <input
                id="min-km"
                type="number"
                value={reportConfig.minKm}
                onChange={(e) => handleMinKmChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                min="1"
                step="100"
                aria-label="Minimum kilometer krav"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Kun chauffører med mindst dette antal kilometer inkluderes
              </p>
            </div>
            
            {/* Chauffør Vælger (kun for individuel rapport) */}
            {reportConfig.reportType === 'individuel' && (
              <div>
                <Label htmlFor="driver-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vælg Chauffør
                </Label>
                <select
                  id="driver-select"
                  value={reportConfig.selectedDriver || ''}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-label="Vælg chauffør"
                >
                  <option value="">Vælg chauffør...</option>
                  {availableOptions.drivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Gruppe Vælger (kun for gruppe rapport) */}
            {reportConfig.reportType === 'gruppe' && (
              <div>
                <Label htmlFor="group-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vælg Gruppe
                </Label>
                <select
                  id="group-select"
                  value={reportConfig.selectedGroup || ''}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-label="Vælg gruppe"
                >
                  <option value="">Vælg gruppe...</option>
                  <option value="alle">Alle chauffører</option>
                  <option value="senior">Senior chauffører</option>
                  <option value="junior">Junior chauffører</option>
                </select>
              </div>
            )}
            
            {/* Format Vælger */}
            <div>
              <Label htmlFor="format-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Rapport Format
              </Label>
              <select
                id="format-select"
                value={reportConfig.format}
                onChange={(e) => handleFormatSelect(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                aria-label="Vælg rapport format"
              >
                {availableOptions.formats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep('period')}
                className="text-gray-600 dark:text-gray-300"
              >
                ← Tilbage til periode
              </Button>
              
              <Button
                onClick={() => setCurrentStep('generate')}
                disabled={
                  !reportConfig.reportType ||
                  !reportConfig.month ||
                  !reportConfig.year ||
                  (reportConfig.reportType === 'individuel' && !reportConfig.selectedDriver) ||
                  (reportConfig.reportType === 'gruppe' && !reportConfig.selectedGroup)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Næste →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Generering */}
      {currentStep === 'generate' && (
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Generer Rapport
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sammenfatning */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Rapport Sammenfatning</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Type:</span>
                  <span className="font-medium">{reportConfig.reportType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Periode:</span>
                  <span className="font-medium">
                    {reportConfig.month && reportConfig.year ? 
                      formatPeriod({ month: reportConfig.month, year: reportConfig.year }) : 
                      'Ikke valgt'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Minimum km:</span>
                  <span className="font-medium">{reportConfig.minKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Format:</span>
                  <span className="font-medium">{reportConfig.format}</span>
                </div>
                {reportConfig.selectedDriver && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Chauffør:</span>
                    <span className="font-medium">{reportConfig.selectedDriver}</span>
                  </div>
                )}
                {reportConfig.selectedGroup && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Gruppe:</span>
                    <span className="font-medium">{reportConfig.selectedGroup}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Genereringsknap */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep('options')}
                className="text-gray-600 dark:text-gray-300"
              >
                ← Tilbage til indstillinger
              </Button>
              
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Genererer...
                  </>
                ) : (
                  'Generer Rapport'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 