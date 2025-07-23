/**
 * Data Upload Form Komponent
 * Upload af Excel-filer med chaufførdata til RIO systemet
 * Håndterer fil upload, validering og konvertering til database
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useRef } from 'react'; // React hooks til state og DOM reference
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { authenticatedFormDataFetch, handleAuthError } from '@/libs/client-auth';
import { toast } from 'sonner'; // Toast notifications

// Interface for upload status
interface UploadStatus {
  isUploading: boolean;
  progress: number;
  message: string;
  error?: string;
}

// Interface for måned/år valg
interface DateSelection {
  month: number;
  year: number;
}

export default function DataUploadForm() {
  console.log(`${LOG_PREFIXES.render} Initialiserer Data Upload Form...`);
  
  // State til fil valg
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // State til måned/år valg
  const [dateSelection, setDateSelection] = useState<DateSelection>({
    month: new Date().getMonth() + 1, // Nuværende måned (1-12)
    year: new Date().getFullYear() // Nuværende år
  });
  
  // State til upload status
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    message: ''
  });
  
  // Ref til file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Måned navne for dropdown
  const monthNames = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ];
  
  /**
   * Håndterer fil valg
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 Fil valgt...');
    
    const file = event.target.files?.[0];
    if (file) {
      // Valider fil type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setUploadStatus({
          isUploading: false,
          progress: 0,
          message: '',
          error: 'Kun Excel-filer (.xlsx eller .xls) er tilladt'
        });
        return;
      }
      
      // Valider fil størrelse (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus({
          isUploading: false,
          progress: 0,
          message: '',
          error: 'Filen er for stor. Maksimal størrelse er 10MB'
        });
        return;
      }
      
      console.log(`${LOG_PREFIXES.success} Fil valideret:`, file.name, file.size);
      setSelectedFile(file);
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: 'Fil valgt: ' + file.name
      });
    }
  };
  
  /**
   * Håndterer måned ændring
   */
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(event.target.value);
    setDateSelection(prev => ({ ...prev, month }));
    console.log('📅 Måned ændret til:', month);
  };
  
  /**
   * Håndterer år ændring
   */
  const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(event.target.value);
    setDateSelection(prev => ({ ...prev, year }));
    console.log('📅 År ændret til:', year);
  };
  
  /**
   * Håndterer fil upload
   */
  const handleUpload = async () => {
    console.log('🚀 Starter upload process...');
    
    if (!selectedFile) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: 'Vælg venligst en fil først'
      });
      return;
    }
    
    // Start upload process
    setUploadStatus({
      isUploading: true,
      progress: 0,
      message: 'Forbereder upload...'
    });
    
    try {
      // Opret FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('month', dateSelection.month.toString());
      formData.append('year', dateSelection.year.toString());
      
      console.log(`${LOG_PREFIXES.stats} Upload data:`, {
        filename: selectedFile.name,
        month: dateSelection.month,
        year: dateSelection.year,
        size: selectedFile.size
      });
      
      // Simuler progress (i virkeligheden ville dette være fra server)
      const progressInterval = setInterval(() => {
        setUploadStatus(prev => {
          if (prev.progress < 90) {
            return {
              ...prev,
              progress: prev.progress + 10,
              message: `Uploader... ${prev.progress + 10}%`
            };
          }
          return prev;
        });
      }, 200);
      
      // Brug authenticated FormData fetch
      console.log(`${LOG_PREFIXES.info} Sender authenticated request til /api/rio/upload...`);
      const result = await authenticatedFormDataFetch('/api/rio/upload', formData);
      
      clearInterval(progressInterval);
      
      if (!result.success) {
        console.error(`${LOG_PREFIXES.error} Upload fejlede:`, result.error);
        
        // Håndter authentication fejl
        if (result.error === 'UNAUTHORIZED' || result.message?.includes('Session udløbet')) {
          handleAuthError(result.error || 'UNAUTHORIZED');
          return;
        } else if (result.error === 'FORBIDDEN') {
          toast.error('Du har ikke tilladelse til at uploade filer. Kontakt administrator.');
          return;
        }
        
        throw new Error(result.message || `Upload fejlede`);
      }
      
      console.log(`${LOG_PREFIXES.success} Upload succesfuldt:`, result.data);
      
      setUploadStatus({
        isUploading: false,
        progress: 100,
        message: `Upload fuldført! ${result.data.recordsProcessed} records importeret.`
      });
      
      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('❌ Upload fejl:', error);
      
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'En uventet fejl opstod'
      });
    }
  };
  
  /**
   * Reset form
   */
  const handleReset = () => {
    console.log('🔄 Reset form...');
    
    setSelectedFile(null);
    setDateSelection({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });
    setUploadStatus({
      isUploading: false,
      progress: 0,
      message: ''
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  console.log(`${LOG_PREFIXES.render} Renderer Data Upload Form...`);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload form card */}
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload af Chaufførdata
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Upload Excel-filer med chaufførdata for specifik måned og år
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fil valg */}
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Vælg Excel-fil
            </Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Understøttede formater: .xlsx, .xls (maks 10MB)
            </p>
          </div>
          
          {/* Måned og år valg */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Måned
              </Label>
              <select
                id="month"
                name="month"
                aria-label="Vælg måned"
                value={dateSelection.month}
                onChange={handleMonthChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                År
              </Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={dateSelection.year}
                onChange={handleYearChange}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Upload status */}
          {uploadStatus.message && (
            <div className={`p-4 rounded-lg ${
              uploadStatus.error 
                ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                : 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <p className={`text-sm ${
                uploadStatus.error 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {uploadStatus.message}
              </p>
              
              {/* Progress bar */}
              {uploadStatus.isUploading && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadStatus.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadStatus.isUploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {uploadStatus.isUploading ? 'Uploader...' : 'Upload Data'}
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={uploadStatus.isUploading}
              className="flex-1"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Information card */}
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
            Upload Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Excel-fil Format</h4>
            <p>Filen skal indeholde chaufførdata med følgende kolonner:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Chauffør (navn)</li>
              <li>Køretøjer</li>
              <li>Forudseende kørsel (vurdering) [%]</li>
              <li>Ø Forbrug [l/100km]</li>
              <li>Kørestrækning [km]</li>
              <li>Og 63 andre kolonner med chaufførdata</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Data Håndtering</h4>
            <p>Systemet vil automatisk:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Konvertere Excel-data til database format</li>
              <li>Tilknytte måned og år til alle records</li>
              <li>Håndtere tomme felter korrekt</li>
              <li>Validere data integritet</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sikkerhed</h4>
            <p>Alle uploads er sikre og følger Fiskelogistikgruppens datapolitikker.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 