/**
 * SystemStats komponent
 * Viser system statistikker for admin dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../libs/db';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config'; // Log prefixes

// Interface for system statistikker
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  confirmedUsers: number;
  pendingUsers: number;
}

/**
 * SystemStats komponent
 * @returns JSX element
 */
export default function SystemStats() {
  console.log(`${LOG_PREFIXES.stats} Renderer SystemStats komponent...`);
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    confirmedUsers: 0,
    pendingUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      console.log(`${LOG_PREFIXES.stats} Henter system statistikker...`);
      
      try {
        // Hent session for admin token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error(`${LOG_PREFIXES.error} Ingen session fundet:`, sessionError?.message);
          return;
        }
        
        // Hent statistikker via API
        const response = await fetch('/api/admin/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        console.log(`${LOG_PREFIXES.stats} API response status:`, response.status);
        
        const result = await response.json();
        console.log(`${LOG_PREFIXES.stats} API response data:`, result);
        
        if (result.success && result.data) {
          console.log(`${LOG_PREFIXES.success} System statistikker hentet:`, result.data);
          setStats(result.data);
        } else {
          console.error(`${LOG_PREFIXES.error} Fejl ved hentning af statistikker:`, result.error);
        }
        
      } catch (error) {
        console.error(`${LOG_PREFIXES.error} Fejl ved hentning af statistikker:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totale brugere */}
      <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Totale brugere</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
      </div>

      {/* Aktive brugere */}
      <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Aktive brugere</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          <p className="text-xs text-gray-500">Sidste 30 dage</p>
        </div>
      </div>

      {/* Bekræftede brugere */}
      <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Bekræftede brugere</p>
          <p className="text-2xl font-bold text-gray-900">{stats.confirmedUsers}</p>
          <p className="text-xs text-gray-500">Email bekræftet</p>
        </div>
      </div>

      {/* Afventende brugere */}
      <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Afventende brugere</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
          <p className="text-xs text-gray-500">Ikke bekræftet</p>
        </div>
      </div>
    </div>
  );
} 