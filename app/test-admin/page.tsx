/**
 * Test Admin Side
 * Simpel side til at teste admin funktionalitet
 */

'use client';

import { useState, useEffect } from 'react';
import { isAdmin } from '../../libs/admin';
import { getCurrentUser } from '../../libs/db';

export default function TestAdminPage() {
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testAdmin = async () => {
      console.log('🧪 Tester admin funktionalitet...');
      
      try {
        // Hent bruger
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          console.log('👤 Bruger fundet:', currentUser.email);
          console.log('📋 App metadata:', currentUser.app_metadata);
          console.log('📋 User metadata:', currentUser.user_metadata);
          
          // Tjek admin status
          const adminResult = await isAdmin();
          setAdminStatus(adminResult);
          
          console.log('👑 Admin status:', adminResult);
        } else {
          console.log('❌ Ingen bruger fundet');
        }
      } catch (error) {
        console.error('❌ Fejl ved admin test:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    testAdmin();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Test Side
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bruger Information
            </h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Admin Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    adminStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {adminStatus ? '👑 ADMIN' : '👤 USER'}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-red-600">❌ Ingen bruger logget ind</p>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Metadata
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">App Metadata</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {user ? JSON.stringify(user.app_metadata, null, 2) : 'Ingen data'}
                </pre>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">User Metadata</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {user ? JSON.stringify(user.user_metadata, null, 2) : 'Ingen data'}
                </pre>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Handlinger
            </h2>
            <div className="space-y-2">
              <a 
                href="/dashboard" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Gå til Dashboard
              </a>
              {adminStatus && (
                <a 
                  href="/admin" 
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
                >
                  Gå til Admin Panel
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 