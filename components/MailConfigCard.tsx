/**
 * Mail Configuration Card Komponent
 * Admin-only komponent til at vise Mailjet mail konfiguration status
 * Baseret på Python-applikationens mail konfiguration UI
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/libs/db';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { toast } from 'sonner';

interface MailConfigCardProps {
  isAdmin: boolean; // Kun admin kan se denne komponent
}

export default function MailConfigCard({ isAdmin }: MailConfigCardProps) {
  console.log(`${LOG_PREFIXES.form} Initialiserer Mail Config Card - Admin: ${isAdmin}...`);
  
  // State til UI control
  const [isTesting, setIsTesting] = useState(false);
  const [configStatus, setConfigStatus] = useState<{
    provider: 'mailjet' | 'none';
    senderEmail?: string;
    testEmail?: string;
    configured: boolean;
  }>({ provider: 'none', configured: false });
  
  /**
   * Henter mail provider status (Mailjet)
   */
  const loadMailProviderStatus = async () => {
    console.log(`${LOG_PREFIXES.search} Henter mail provider status...`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log(`${LOG_PREFIXES.warning} Ikke logget ind, kan ikke hente mail provider status`);
        return;
      }
      
      const response = await fetch('/api/admin/mail-provider-status', {
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
        setConfigStatus(data.status);
        console.log(`${LOG_PREFIXES.success} Mail provider: ${data.provider}, configured: ${data.status.configured}`);
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af mail provider status:`, error);
      // Set default values on error
      setConfigStatus({ provider: 'none', configured: false });
    }
  };

  /**
   * Tester mail konfiguration ved at sende test mail
   */
  const testMailConfig = async () => {
    console.log(`${LOG_PREFIXES.test} Tester mail konfiguration...`);
    setIsTesting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const response = await fetch('/api/admin/test-mail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Test mail sendt succesfuldt!');
        console.log(`${LOG_PREFIXES.success} Test mail sendt`);
      } else {
        toast.error('Test mail fejlede');
        console.error(`${LOG_PREFIXES.error} Test mail fejlede:`, result.error);
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved test mail:`, error);
      toast.error(`Test mail fejlede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Load mail provider status on component mount
  useEffect(() => {
    if (isAdmin) {
      loadMailProviderStatus();
    }
  }, [isAdmin]);

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-blue-600">📧</span>
          <span>Mail Konfiguration</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mailjet configuration display */}
        {configStatus.provider === 'mailjet' ? (
          <>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-lg">📧</div>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    Mailjet Konfiguration Aktiv
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Mail sendes via Mailjet HTTP API - konfigureret via miljøvariabler:
                  </p>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1 list-disc list-inside">
                    <li><code>MJ_SENDER_EMAIL</code> = {configStatus.senderEmail}</li>
                    <li><code>MJ_APIKEY_PUBLIC</code> = {configStatus.configured ? '••••••••' : 'Ikke sat'}</li>
                    <li><code>MJ_APIKEY_PRIVATE</code> = {configStatus.configured ? '••••••••' : 'Ikke sat'}</li>
                    <li><code>MJ_SENDER_NAME</code> = Konfigureret</li>
                    {configStatus.testEmail && (
                      <li><code>TEST_EMAIL</code> = {configStatus.testEmail}</li>
                    )}
                  </ul>
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/40 rounded">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                      ✅ Mailjet fordele:
                    </p>
                    <ul className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-1">
                      <li>• HTTP REST API - Stabilt på Vercel serverless</li>
                      <li>• Built-in rate limiting (200 mails/dag)</li>
                      <li>• 15 MB attachments support</li>
                      <li>• Bedre leveringsrater</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Test mail button for Mailjet */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Test Mailjet funktionalitet
              </div>
              
              {configStatus.testEmail && (
                <Button
                  onClick={testMailConfig}
                  disabled={isTesting}
                  variant="outline"
                  className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Sender via Mailjet...
                    </>
                  ) : (
                    '📧 Send Mailjet Test'
                  )}
                </Button>
              )}
            </div>
          </>
        ) : !configStatus.configured ? (
          <>
            {/* No mail provider configured */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start space-x-3">
                <div className="text-yellow-600 text-lg">⚠️</div>
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Ingen Mail Provider Konfigureret
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    For at kunne sende rapport emails til chauffører skal der konfigureres Mailjet.
                  </p>
                  
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                      🎯 Anbefalet: Mailjet (Optimal til Vercel)
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                      Tilføj følgende miljøvariabler til .env.local og Vercel:
                    </p>
                    <div className="bg-yellow-200 dark:bg-yellow-800 rounded p-2 font-mono text-xs">
                      <div>MJ_APIKEY_PUBLIC=din_public_key</div>
                      <div>MJ_APIKEY_PRIVATE=din_private_key</div>
                      <div>MJ_SENDER_EMAIL=rapport@fiskelogistik.dk</div>
                      <div>MJ_SENDER_NAME=Fiskelogistik Gruppen A/S</div>
                      <div>TEST_EMAIL=test@example.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
} 