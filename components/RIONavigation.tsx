/**
 * RIO Navigation Komponent
 * Navigation til Fiskelogistik RIO Program
 * Indeholder links til alle hovedsider i RIO systemet
 */

'use client'; // Client-side komponent for interaktivitet

import { useRouter, usePathname } from 'next/navigation'; // Next.js navigation hooks
import { Card, CardContent } from '@/components/ui/card'; // ShadCN card komponenter
import CommonHeader from './CommonHeader'; // Fælles header komponent
import BreadcrumbNavigation from './BreadcrumbNavigation'; // Breadcrumb navigation
import ScrollToTop from './ScrollToTop'; // Scroll til toppen
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Professionelle ikoner fra Lucide React
import { 
  Upload, 
  Truck, 
  FileText, 
  TrendingUp, 
  Settings, 
  Wrench 
} from 'lucide-react';

// Interface for navigation item
interface NavItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode; // Ændret fra string til React.ReactNode for professionelle ikoner
  adminOnly?: boolean;
}

export default function RIONavigation({ isAdmin = false }: { isAdmin?: boolean }) {
  console.log(`${LOG_PREFIXES.render} Initialiserer RIO Navigation...`);
  
  const router = useRouter(); // Next.js router til navigation
  const pathname = usePathname(); // Nuværende sti for at markere aktiv side
  
  // Navigation items - alle sider i RIO programmet med professionelle ikoner
  const navItems: NavItem[] = [
    {
      id: 'upload',
      title: 'Upload af Data',
      description: 'Upload Excel-filer med chaufførdata',
      path: '/rio/upload',
      icon: <Upload className="w-8 h-8 text-blue-600" />
    },
    {
      id: 'drivers',
      title: 'Chauffører',
      description: 'Se og administrer chaufførdata',
      path: '/rio/drivers',
      icon: <Truck className="w-8 h-8 text-green-600" />
    },
    {
      id: 'reports',
      title: 'Rapporter',
      description: 'Generer og se rapporter',
      path: '/rio/reports',
      icon: <FileText className="w-8 h-8 text-purple-600" />
    },
    {
      id: 'kpi',
      title: 'Key Performance Indicators',
      description: 'Se KPI oversigt og trends',
      path: '/rio/kpi',
      icon: <TrendingUp className="w-8 h-8 text-orange-600" />
    },
    {
      id: 'settings',
      title: 'Indstillinger',
      description: 'System indstillinger og konfiguration',
      path: '/rio/settings',
      icon: <Settings className="w-8 h-8 text-gray-600" />
    }
  ];
  
  // Admin-specifikke navigation items
  const adminNavItems: NavItem[] = [
    {
      id: 'admin',
      title: 'Admin Panel',
      description: 'Administrator funktioner',
      path: '/admin',
      icon: <Wrench className="w-8 h-8 text-red-600" />,
      adminOnly: true
    }
  ];
  
  // Kombinerer almindelige og admin navigation items
  const allNavItems = [...navItems, ...(isAdmin ? adminNavItems : [])];
  
  /**
   * Håndterer navigation til en side
   */
  const handleNavigation = (path: string) => {
    console.log(`${LOG_PREFIXES.render} Navigerer til:`, path);
    router.push(path);
  };
  
  /**
   * Tjekker om en navigation item er aktiv
   */
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  console.log(`${LOG_PREFIXES.render} Renderer RIO Navigation...`);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Fælles header med navigation */}
      <CommonHeader 
        title="FSK Online"
        subtitle="RIO Program - Fiskelogistikgruppen"
        showBackButton={false}
        isAdmin={isAdmin}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <BreadcrumbNavigation />
        
        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            RIO Program Navigation
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Vælg en funktion for at komme i gang med Fiskelogistik RIO Program
          </p>
        </div>
        
        {/* Navigation grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allNavItems.map((item) => (
            <Card 
              key={item.id}
              className={`shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${
                isActive(item.path) 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Professionelt ikon */}
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {item.description}
                    </p>
                    
                    {/* Admin badge hvis nødvendigt */}
                    {item.adminOnly && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/20 dark:text-yellow-200">
                        Admin kun
                      </span>
                    )}
                    
                    {/* Active indicator */}
                    {isActive(item.path) && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/20 dark:text-blue-200 mt-2">
                        Aktiv side
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Information card */}
        <div className="mt-8">
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Om RIO Program
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Upload af Data</h4>
                  <p>Upload Excel-filer med chaufførdata for forskellige måneder og år. Systemet konverterer automatisk data til databasen.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Rapporter & KPI</h4>
                  <p>Generer detaljerede rapporter og se Key Performance Indicators for at overvåge chaufførernes præstation.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Scroll til toppen knap */}
      <ScrollToTop />
    </div>
  );
} 