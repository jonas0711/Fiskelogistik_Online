/**
 * Common Header Komponent
 * Fælles header til alle sider med navigation og tilbage-knapper
 * Forbedrer brugeroplevelsen med konsistent navigation
 */

'use client'; // Client-side komponent for interaktivitet

import { useRouter, usePathname } from 'next/navigation'; // Next.js navigation hooks
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { supabase } from '../libs/db'; // Vores Supabase klient
import Image from 'next/image'; // Next.js Image komponent

// Interface for header props
interface CommonHeaderProps {
  title?: string; // Side titel
  subtitle?: string; // Side undertitel
  showBackButton?: boolean; // Om tilbage-knap skal vises
  backPath?: string; // Sti tilbage til (standard: /rio)
  isAdmin?: boolean; // Om bruger er admin
  showLogout?: boolean; // Om logout knap skal vises
}

export default function CommonHeader({ 
  title = "FSK Online",
  subtitle = "Fiskelogistikgruppen",
  showBackButton = true,
  backPath = "/rio",
  isAdmin = false,
  showLogout = true
}: CommonHeaderProps) {
  console.log('🏷️ Initialiserer Common Header...');
  
  const router = useRouter(); // Next.js router til navigation
  const pathname = usePathname(); // Nuværende sti
  
  /**
   * Håndterer tilbage navigation
   */
  const handleBack = () => {
    console.log('⬅️ Navigerer tilbage til:', backPath);
    router.push(backPath);
  };
  
  /**
   * Håndterer navigation til hovedsiden
   */
  const handleHome = () => {
    console.log('🏠 Navigerer til hovedsiden...');
    router.push('/rio');
  };
  
  /**
   * Håndterer navigation til admin panel
   */
  const handleAdmin = () => {
    console.log('🔧 Navigerer til admin panel...');
    router.push('/admin');
  };
  
  /**
   * Håndterer logout
   */
  const handleLogout = async () => {
    console.log('🚪 Starter logout process...');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout fejl:', error.message);
      } else {
        console.log('✅ Logout succesfuldt');
        router.push('/');
      }
    } catch (error) {
      console.error('❌ Uventet fejl under logout:', error);
    }
  };
  
  /**
   * Tjekker om vi er på hovedsiden
   */
  const isOnHomePage = pathname === '/rio';
  
  /**
   * Tjekker om vi er på admin siden
   */
  const isOnAdminPage = pathname === '/admin';
  
  console.log('🎨 Renderer Common Header...');
  
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 dark:bg-gray-800/95 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Venstre side - Logo og navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo med klik til hovedsiden */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleHome}
            >
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
                  {title}
                </h1>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {subtitle}
                </p>
              </div>
            </div>
            
            {/* Tilbage knap (kun hvis ikke på hovedsiden) */}
            {showBackButton && !isOnHomePage && (
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                ← Tilbage
              </Button>
            )}
            
            {/* Hjem knap (kun hvis ikke på hovedsiden) */}
            {!isOnHomePage && (
              <Button
                onClick={handleHome}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                🏠 Hjem
              </Button>
            )}
          </div>
          
          {/* Højre side - Admin og logout */}
          <div className="flex items-center space-x-3">
            {/* Admin knap (kun for admins og ikke på admin siden) */}
            {isAdmin && !isOnAdminPage && (
              <Button
                onClick={handleAdmin}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                🔧 Admin
              </Button>
            )}
            
            {/* Logout knap */}
            {showLogout && (
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                🚪 Log ud
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 