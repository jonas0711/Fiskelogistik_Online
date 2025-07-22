/**
 * Mail Log Viewer Komponent
 * Admin-only komponent til at se mail logs og audit trail
 * Inkluderer filtrering, søgning, pagination og cleanup funktionalitet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/libs/db';
import { toast } from 'sonner';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { 
  SuccessIcon, 
  ErrorIcon, 
  WarningIcon,
  InfoIcon,
  CleanupIcon,
  SearchIcon
} from '@/components/ui/icons';

// Interface for mail log entry
interface MailLogEntry {
  id: string;
  driver_id: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  sent_at?: string;
  created_at: string;
}

// Interface for filters
interface LogFilters {
  status: '' | 'sent' | 'failed' | 'pending';
  driverId: string;
  dateFrom: string;
  dateTo: string;
}

// Interface for pagination
interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MailLogViewerProps {
  isAdmin: boolean;
}

export default function MailLogViewer({ isAdmin }: MailLogViewerProps) {
  console.log(`${LOG_PREFIXES.form} Initialiserer Mail Log Viewer - Admin: ${isAdmin}...`);
  
  // State til logs og data
  const [logs, setLogs] = useState<MailLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  });
  
  // State til filtrering
  const [filters, setFilters] = useState<LogFilters>({
    status: '',
    driverId: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // State til cleanup
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  
  /**
   * Henter mail logs fra API med filtre og pagination
   */
  const loadMailLogs = useCallback(async (page: number = 1) => {
    console.log(`${LOG_PREFIXES.search} Henter mail logs side ${page}...`);
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      // Opbyg query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (filters.status) params.append('status', filters.status);
      if (filters.driverId) params.append('driverId', filters.driverId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/api/admin/mail-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setPagination(data.pagination);
        console.log(`${LOG_PREFIXES.success} ${data.logs.length} mail logs hentet`);
      } else {
        throw new Error('Kunne ikke hente mail logs');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af mail logs:`, error);
      toast.error('Kunne ikke hente mail logs');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, filters.status, filters.driverId, filters.dateFrom, filters.dateTo]);
  
  /**
   * Rydder gamle mail logs
   */
  const cleanupOldLogs = async () => {
    if (!cleanupDays || cleanupDays < 1 || cleanupDays > 365) {
      toast.error('Antal dage skal være mellem 1 og 365');
      return;
    }
    
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette alle mail logs ældre end ${cleanupDays} dage? Dette kan ikke fortrydes.`
    );
    
    if (!confirmed) return;
    
    console.log(`${LOG_PREFIXES.cleanup} Starter cleanup af mail logs...`);
    setIsCleaningUp(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const response = await fetch('/api/admin/mail-logs', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysToKeep: cleanupDays }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`${LOG_PREFIXES.success} ${data.deletedCount} mail logs slettet`);
        toast.success(`${data.deletedCount} gamle mail logs slettet`);
        
        // Reload logs
        await loadMailLogs(1);
      } else {
        throw new Error(data.message || 'Cleanup fejlede');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Cleanup fejl:`, error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke rydde mail logs');
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  /**
   * Håndterer filter ændringer
   */
  const handleFilterChange = (field: keyof LogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  /**
   * Anvender filtre og henter nye logs
   */
  const applyFilters = () => {
    loadMailLogs(1);
  };
  
  /**
   * Nulstiller alle filtre
   */
  const resetFilters = () => {
    setFilters({
      status: '',
      driverId: '',
      dateFrom: '',
      dateTo: ''
    });
    // Auto-reload efter filter reset
    setTimeout(() => loadMailLogs(1), 100);
  };
  
  /**
   * Håndterer side ændring
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadMailLogs(newPage);
    }
  };
  
  /**
   * Formaterer dato til dansk format
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('da-DK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  /**
   * Returnerer status icon og farve
   */
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'sent':
        return {
          icon: SuccessIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          text: 'Sendt'
        };
      case 'failed':
        return {
          icon: ErrorIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          text: 'Fejlede'
        };
      case 'pending':
        return {
          icon: WarningIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'Afventer'
        };
      default:
        return {
          icon: InfoIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          text: status
        };
    }
  };
  
  // Load initial data når komponenten loader
  useEffect(() => {
    if (isAdmin) {
      loadMailLogs();
    }
  }, [isAdmin, loadMailLogs]);
  
  // Returner tom div hvis ikke admin
  if (!isAdmin) {
    return null;
  }
  
  console.log(`${LOG_PREFIXES.config} Renderer Mail Log Viewer...`);
  
  return (
    <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-between">
          <span className="flex items-center">
            📋 Mail Logs & Audit Trail
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
              {pagination.total} logs
            </span>
          </span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Se alle mail aktiviteter og fejl for audit trail
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Filtrering sektion */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </Label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              title="Filtrer efter mail status"
            >
              <option value="">Alle</option>
              <option value="sent">Sendt</option>
              <option value="failed">Fejlede</option>
              <option value="pending">Afventer</option>
            </select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chauffør
            </Label>
            <Input
              placeholder="Søg chauffør..."
              value={filters.driverId}
              onChange={(e) => handleFilterChange('driverId', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fra dato
            </Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Til dato
            </Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-end space-x-2">
            <Button onClick={applyFilters} size="sm" className="flex-1">
              <SearchIcon className="h-4 w-4 mr-1" />
              Søg
            </Button>
            <Button onClick={resetFilters} variant="outline" size="sm">
              Nulstil
            </Button>
          </div>
        </div>
        
        {/* Cleanup sektion */}
        <div className="flex items-center justify-between mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-3">
            <CleanupIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Cleanup gamle logs
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                Slet mail logs ældre end det angivne antal dage
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              min="1"
              max="365"
              value={cleanupDays}
              onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
              className="w-20"
              placeholder="90"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">dage</span>
            <Button
              onClick={cleanupOldLogs}
              disabled={isCleaningUp}
              variant="outline"
              size="sm"
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-600"
            >
              {isCleaningUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  Rydder...
                </>
              ) : (
                <>
                  <CleanupIcon className="h-4 w-4 mr-1" />
                  Ryd op
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Henter mail logs...</span>
          </div>
        ) : (
          <>
            {/* Mail logs tabel */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Chauffør</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Emne</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Dato</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Besked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => {
                    const statusDisplay = getStatusDisplay(log.status);
                    const StatusIcon = statusDisplay.icon;
                    
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.bgColor}`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${statusDisplay.color}`} />
                            <span className={statusDisplay.color}>
                              {statusDisplay.text}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {log.driver_id}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {log.recipient_email}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <div>
                            {log.sent_at ? formatDate(log.sent_at) : formatDate(log.created_at)}
                          </div>
                          {log.sent_at && log.sent_at !== log.created_at && (
                            <div className="text-xs text-gray-500">
                              Oprettet: {formatDate(log.created_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs">
                          {log.message && (
                            <div className="truncate" title={log.message}>
                              {log.message}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* No results */}
              {logs.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <InfoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Ingen mail logs fundet
                  </p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Viser {((pagination.page - 1) * pagination.limit) + 1} til {Math.min(pagination.page * pagination.limit, pagination.total)} af {pagination.total} logs
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Forrige
                  </Button>
                  
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Side {pagination.page} af {pagination.totalPages}
                  </span>
                  
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Næste
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 