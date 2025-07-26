/**
 * 🔐 AuthGuard Component - Rendering-niveau Authentication Protection
 * 
 * Dette er TREDJE forsvarslinje der sikrer at UI-komponenter kun renderes
 * for autoriserede brugere på server-side.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../libs/db';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAdmin = false, 
  fallback = null,
  redirectTo = '/'
}: AuthGuardProps) {
  console.log('🔐 AuthGuard: Initialiserer authentication validering...');
  
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthGuard: Validerer bruger authentication...');
    
    const validateUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('❌ AuthGuard: Ingen gyldig session');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // Tjek om session er udløbet
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at < now) {
          console.log('⚠️ AuthGuard: Session er udløbet');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        console.log('✅ AuthGuard: Session valideret for bruger:', session.user?.email);
        setIsAuthenticated(true);
        
        // Tjek admin status hvis påkrævet
        if (requireAdmin) {
          const userRoles = session.user?.app_metadata?.roles || [];
          const isAdminFlag = session.user?.app_metadata?.is_admin;
          const adminStatus = userRoles.includes('admin') || isAdminFlag === true;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            console.error('❌ AuthGuard: Bruger er ikke admin');
          }
        }
        
      } catch (error) {
        console.error('❌ AuthGuard: Uventet fejl:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    validateUser();
    
    // Lyt til authentication ændringer
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any) => {
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsAdmin(false);
          router.push(redirectTo);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [requireAdmin, router, redirectTo]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-050">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700 mx-auto mb-4"></div>
          <p className="text-neutral-600">Validerer adgang...</p>
        </div>
      </div>
    );
  }

  // Ikke autentificeret
  if (!isAuthenticated) {
    console.log('❌ AuthGuard: Bruger ikke autentificeret - redirecter til login');
    
    if (typeof window !== 'undefined' && window.location.pathname !== redirectTo) {
      router.push(redirectTo);
    }
    
    return fallback ? (
      <div className="flex items-center justify-center min-h-screen bg-neutral-050">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Adgang nægtet</h1>
          <p className="text-neutral-600 mb-4">Du skal være logget ind for at se denne side</p>
          <button 
            onClick={() => router.push(redirectTo)}
            className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Log ind
          </button>
        </div>
      </div>
    ) : null;
  }

  // Kræver admin men bruger er ikke admin
  if (requireAdmin && !isAdmin) {
    console.log('❌ AuthGuard: Bruger er ikke admin - viser adgang nægtet');
    
    return fallback ? (
      <div className="flex items-center justify-center min-h-screen bg-neutral-050">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Adgang nægtet</h1>
          <p className="text-neutral-600 mb-4">Du har ikke administratorrettigheder til denne side</p>
          <button 
            onClick={() => router.push('/rio')}
            className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Gå til RIO programmet
          </button>
        </div>
      </div>
    ) : null;
  }

  // Bruger er autentificeret og har de nødvendige rettigheder
  console.log('✅ AuthGuard: Bruger autoriseret - viser beskyttet indhold');
  return <>{children}</>;
}

export function AdminGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin={true} redirectTo="/rio" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export function UserGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin={false} redirectTo="/" fallback={fallback}>
      {children}
    </AuthGuard>
  );
} 