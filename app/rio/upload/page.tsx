/**
 * RIO Upload Side
 * Side til upload af Excel-filer med chaufførdata
 * Brugeren kan vælge måned og år for dataene
 */

'use client'; // Client-side komponent for interaktivitet

import { useState, useEffect } from 'react'; // React hooks til state og side-effekter
import { useRouter } from 'next/navigation'; // Next.js navigation hook
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import CommonHeader from '@/components/CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'; // Breadcrumb navigation
import ScrollToTop from '@/components/ScrollToTop'; // Scroll til toppen
import { supabase } from '../../../libs/db'; // Vores Supabase klient
import { isAdmin } from '../../../libs/admin'; // Admin funktioner
import { toast } from 'sonner'; // Toast notifikationer

export default function RIOUploadPage() {
  console.log('📤 Initialiserer RIO Upload Page...');
  
  const router = useRouter(); // Next.js router til navigation
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // State til admin status
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // State til form data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Måneder til dropdown
  const months = [
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
  
  // År til dropdown (sidste 5 år + næste 2 år)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);
  
  /**
   * Tjekker bruger session ved komponent mount
   */
  useEffect(() => {
    console.log('🔍 Tjekker bruger session for upload...');
    
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('❌ Ingen gyldig session:', sessionError?.message);
          router.push('/');
          return;
        }
        
        console.log('✅ Session fundet for upload:', session.user?.email);
        
        // Tjek om bruger er admin
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
        console.log('👤 Admin status for upload:', adminStatus);
        
      } catch (error) {
        console.error('❌ Fejl under session tjek for upload:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [router]);
  
  /**
   * Håndterer fil valg
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 Fil valgt:', event.target.files?.[0]?.name);
    const file = event.target.files?.[0];
    
    if (file) {
      // Tjek om filen er en Excel-fil
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Kun Excel-filer (.xlsx, .xls) er tilladt');
        return;
      }
      
      setSelectedFile(file);
      toast.success(`Fil valgt: ${file.name}`);
    }
  };
  
  /**
   * Håndterer upload af fil
   */
  const handleUpload = async () => {
    console.log('📤 Starter upload af fil...');
    
    if (!selectedFile) {
      toast.error('Vælg venligst en fil først');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Opret FormData til upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('month', selectedMonth.toString());
      formData.append('year', selectedYear.toString());
      
      console.log('📊 Uploader data for måned:', selectedMonth, 'år:', selectedYear);
      
      // Send til API endpoint
      const response = await fetch('/api/rio/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Upload succesfuld:', result);
        toast.success(`Data uploadet succesfuldt! ${result.recordsProcessed} chauffører behandlet.`);
        
        // Reset form
        setSelectedFile(null);
        if (document.getElementById('file-input') as HTMLInputElement) {
          (document.getElementById('file-input') as HTMLInputElement).value = '';
        }
      } else {
        console.error('❌ Upload fejl:', result.error);
        toast.error(`Upload fejlede: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Fejl under upload:', error);
      toast.error('Der opstod en fejl under upload. Prøv igen.');
    } finally {
      setIsUploading(false);
    }
  };
  
  console.log('🎨 Renderer RIO Upload Page...');
  
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
        subtitle="RIO Program - Upload af Data"
        isAdmin={isUserAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Upload af Chaufførdata
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Upload Excel-filer med chaufførdata og vælg hvilken måned og år dataene repræsenterer
          </p>
        </div>
        
        {/* Upload form */}
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Vælg fil og periode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File upload */}
            <div className="space-y-2">
              <Label htmlFor="file-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Excel-fil med chaufførdata
              </Label>
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isUploading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Understøttede formater: .xlsx, .xls
              </p>
            </div>
            
            {/* Month and year selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Måned
                </Label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isUploading}
                  aria-label="Vælg måned"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  År
                </Label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isUploading}
                  aria-label="Vælg år"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Upload button */}
            <div className="pt-4">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploader data...</span>
                  </div>
                ) : (
                  'Upload Data til Database'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Information card */}
        <Card className="mt-8 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Om data upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Excel-fil struktur</h4>
              <p>Filen skal indeholde chaufførdata med kolonner som: Chauffør, Køretøjer, Forbrug, Kørestrækning, etc. Alle 68 datafelter vil blive konverteret til databasen.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Måned og år</h4>
              <p>Vælg den måned og det år, som dataene i Excel-filen repræsenterer. Dette er vigtigt for at organisere data korrekt i databasen.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Data behandling</h4>
              <p>Systemet konverterer automatisk alle data fra Excel til Supabase databasen. Tomme felter håndteres korrekt og alle chauffører i filen vil blive behandlet.</p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Scroll til toppen knap */}
      <ScrollToTop />
    </div>
  );
} 