/**
 * Setup Admin Side
 * Simpel side til at sætte admin rettigheder på en bruger
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getCurrentUser } from '../../libs/db';

// Interface for bruger hentet fra Supabase
interface User {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}
// Interface for nuværende bruger fra Supabase Auth
interface AuthUser {
  id?: string;
  email?: string;
}

export default function SetupAdminPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Brug korrekte typer i stedet for any
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await getCurrentUser();
      console.log('# [DEBUG] Admin: Nuværende bruger hentet:', user);
      setCurrentUser(user);
      if (user?.email) {
        setEmail(user.email);
      }
    };
    
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/setup-admin');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Fejl ved hentning af brugere:', error);
    }
  };

  const setupAdmin = async () => {
    if (!email.trim()) {
      toast.error('Email er påkrævet');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Admin rettigheder sat på ${email}`);
        loadUsers(); // Genindlæs bruger liste
      } else {
        toast.error(data.error || 'Kunne ikke sætte admin rettigheder');
      }
    } catch (error) {
      console.error('Fejl ved admin setup:', error);
      toast.error('Der opstod en fejl under admin setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Setup Admin Rettigheder
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sæt admin rettigheder på en bruger for at få adgang til RIO programmet
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Setup Form */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Sæt Admin Rettigheder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email adresse
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={setupAdmin}
                disabled={isLoading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sætter admin rettigheder...
                  </div>
                ) : (
                  'Sæt Admin Rettigheder'
                )}
              </Button>

              {currentUser && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Nuværende bruger:</strong> {currentUser.email ?? 'Ukendt'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User List */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Alle Brugere
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Oprettet: {new Date(user.created_at).toLocaleDateString('da-DK')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.is_admin
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {user.is_admin ? '👑 Admin' : '👤 User'}
                      </span>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Ingen brugere fundet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={() => window.location.href = '/rio'}
            variant="outline"
            className="mr-2"
          >
            Gå til RIO Program
          </Button>
          <Button
            onClick={() => window.location.href = '/test-admin'}
            variant="outline"
          >
            Test Admin Status
          </Button>
        </div>
      </div>
    </div>
  );
} 