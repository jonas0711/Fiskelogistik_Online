/**
 * UserList komponent
 * Viser liste over alle registrerede brugere i systemet
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '../libs/db';

// Interface for bruger data
interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  invited_at?: string;
}

/**
 * UserList komponent
 * @returns JSX element
 */
export default function UserList() {
  console.log('👥 Renderer UserList komponent...');
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      console.log('👥 Henter brugerliste...');
      
      try {
        // Hent session for admin token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('❌ Ingen session fundet:', sessionError?.message);
          setError('Du skal være logget ind for at se brugerliste');
          return;
        }
        
        // Hent brugerliste via API
        const response = await fetch('/api/admin/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        console.log('👥 API response status:', response.status);
        
        const result = await response.json();
        console.log('👥 API response data:', result);
        
        if (result.success && result.data) {
          console.log('✅ Brugerliste hentet:', result.data.length, 'brugere');
          setUsers(result.data);
        } else {
          console.error('❌ Fejl ved hentning af brugere:', result.error);
          setError(result.error || result.message);
        }
        
      } catch (error) {
        console.error('❌ Uventet fejl ved hentning af brugere:', error);
        setError('Der opstod en uventet fejl');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  /**
   * Håndterer sletning af en bruger
   * @param email - Email på brugeren der skal slettes
   */
  const handleDeleteUser = async (email: string) => {
    console.log('🗑️ Sletter bruger:', email);
    
    if (!confirm(`Er du sikker på, at du vil slette brugeren ${email}?`)) {
      return;
    }
    
    setDeletingUser(email);
    
    try {
      // Hent session for admin token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Ingen session fundet:', sessionError?.message);
        alert('Du skal være logget ind for at slette brugere');
        return;
      }
      
      // Slet bruger via API
      const response = await fetch(`/api/admin/users/delete?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      console.log('🗑️ API response status:', response.status);
      
      const result = await response.json();
      console.log('🗑️ API response data:', result);
      
      if (result.success) {
        console.log('✅ Bruger slettet succesfuldt');
        alert(`Bruger ${email} er slettet`);
        
        // Opdater brugerlisten
        setUsers(prevUsers => prevUsers.filter(user => user.email !== email));
      } else {
        console.error('❌ Fejl ved sletning af bruger:', result.error);
        alert(result.error || result.message);
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl ved sletning af bruger:', error);
      alert('Der opstod en uventet fejl');
    } finally {
      setDeletingUser(null);
    }
  };

  /**
   * Formaterer dato til dansk format
   * @param dateString - ISO dato string
   * @returns Formateret dato string
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Aldrig';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('da-DK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Ugyldig dato';
    }
  };

  /**
   * Henter rolle farve
   * @param role - Bruger rolle
   * @returns CSS klasser for rolle badge
   */
  const getRoleBadgeClasses = (role?: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrerede brugere</CardTitle>
          <CardDescription>Indlæser brugerliste...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrerede brugere</CardTitle>
          <CardDescription>Kunne ikke indlæse brugerliste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Prøv igen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrerede brugere</CardTitle>
        <CardDescription>
          {users.length} bruger{users.length !== 1 ? 'e' : ''} i systemet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-600">Ingen brugere registreret endnu</p>
            <p className="text-sm text-gray-500 mt-2">Send invitationer for at få brugere i systemet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {/* Bruger info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name || 'Uden navn'}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeClasses(user.role)}`}>
                      {user.role === 'admin' ? 'Admin' : 'Bruger'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>Oprettet: {formatDate(user.created_at)}</span>
                    {user.last_sign_in_at && (
                      <span>• Sidst aktiv: {formatDate(user.last_sign_in_at)}</span>
                    )}
                  </div>
                </div>
                
                {/* Status indikator og handlinger */}
                <div className="flex flex-col items-end space-y-1">
                  {user.email_confirmed_at ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Bekræftet
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Afventer
                    </span>
                  )}
                  
                  {/* Slet knap */}
                  <Button
                    onClick={() => handleDeleteUser(user.email)}
                    variant="outline"
                    size="sm"
                    disabled={deletingUser === user.email}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    {deletingUser === user.email ? (
                      <div className="w-3 h-3 mr-1 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {deletingUser === user.email ? 'Sletter...' : 'Slet'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 