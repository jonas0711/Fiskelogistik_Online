/**
 * Breadcrumb Navigation Komponent
 * Viser brugerens nuværende placering i systemet
 * Forbedrer brugeroplevelsen med klar navigation
 */

'use client'; // Client-side komponent for interaktivitet

import { usePathname } from 'next/navigation'; // Next.js navigation hook
import { Button } from '@/components/ui/button'; // ShadCN button komponent

// Professionelle ikoner fra Lucide React
import { 
  Home, 
  Upload, 
  Truck, 
  FileText, 
  TrendingUp, 
  Settings, 
  Crown, 
  BarChart3 
} from 'lucide-react';

// Interface for breadcrumb item
interface BreadcrumbItem {
  label: string; // Visningsnavn
  path: string; // Sti til siden
  icon?: React.ReactNode; // Ikon (valgfrit) - ændret til React.ReactNode
}

export default function BreadcrumbNavigation() {
  console.log('🍞 Initialiserer Breadcrumb Navigation...');
  
  const pathname = usePathname(); // Nuværende sti
  
  /**
   * Genererer breadcrumb items baseret på nuværende sti
   */
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    console.log('📍 Genererer breadcrumbs for sti:', pathname);
    
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Altid start med hjem
    breadcrumbs.push({
      label: 'Hjem',
      path: '/rio',
      icon: <Home className="w-4 h-4" />
    });
    
    // Tilføj breadcrumbs baseret på sti
    if (pathname.startsWith('/rio')) {
      if (pathname === '/rio') {
        // Vi er allerede på hovedsiden
        return breadcrumbs;
      }
      
      // RIO undersider
      if (pathname.startsWith('/rio/upload')) {
        breadcrumbs.push({
          label: 'Upload af Data',
          path: '/rio/upload',
          icon: <Upload className="w-4 h-4" />
        });
      } else if (pathname.startsWith('/rio/drivers')) {
        breadcrumbs.push({
          label: 'Chauffører',
          path: '/rio/drivers',
          icon: <Truck className="w-4 h-4" />
        });
      } else if (pathname.startsWith('/rio/reports')) {
        breadcrumbs.push({
          label: 'Rapporter',
          path: '/rio/reports',
          icon: <FileText className="w-4 h-4" />
        });
      } else if (pathname.startsWith('/rio/kpi')) {
        breadcrumbs.push({
          label: 'KPI',
          path: '/rio/kpi',
          icon: <TrendingUp className="w-4 h-4" />
        });
      } else if (pathname.startsWith('/rio/settings')) {
        breadcrumbs.push({
          label: 'Indstillinger',
          path: '/rio/settings',
          icon: <Settings className="w-4 h-4" />
        });
      }
    } else if (pathname.startsWith('/admin')) {
      breadcrumbs.push({
        label: 'Admin Dashboard',
        path: '/admin',
        icon: <Crown className="w-4 h-4" />
      });
    } else if (pathname.startsWith('/dashboard')) {
      breadcrumbs.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: <BarChart3 className="w-4 h-4" />
      });
    }
    
    console.log('🍞 Breadcrumbs genereret:', breadcrumbs);
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  // Vis kun hvis vi har mere end 1 breadcrumb (ikke kun hjem)
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  console.log('🎨 Renderer Breadcrumb Navigation...');
  
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {/* Breadcrumb item */}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={() => {
              console.log('🍞 Navigerer til breadcrumb:', item.path);
              window.location.href = item.path;
            }}
          >
            {item.icon && <span className="mr-1">{item.icon}</span>}
            {item.label}
          </Button>
          
          {/* Separator (ikke efter sidste item) */}
          {index < breadcrumbs.length - 1 && (
            <span className="mx-2 text-gray-400">/</span>
          )}
        </div>
      ))}
    </nav>
  );
} 