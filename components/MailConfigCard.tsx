/**
 * Mail Configuration Card Komponent
 * Admin-only komponent til at konfigurere SMTP mail indstillinger
 * Baseret på Python-applikationens mail konfiguration UI
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/libs/db';
import { MailConfig } from '@/libs/mail-service';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { toast } from 'sonner';

interface MailConfigCardProps {
  isAdmin: boolean; // Kun admin kan se denne komponent
}

export default function MailConfigCard({ isAdmin }: MailConfigCardProps) {
  console.log(`${LOG_PREFIXES.form} Initialiserer Mail Config Card - Admin: ${isAdmin}...`);
  
  // State til mail konfiguration - identisk med Python struktur
  const [mailConfig, setMailConfig] = useState<Partial<MailConfig>>({
    smtp_server: '',
    smtp_port: 587, // Standard TLS port
    email: '',
    password: '',
    test_email: ''
  });
  
  // State til UI control
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configSource, setConfigSource] = useState<'environment' | 'database' | 'none'>('none');
  const [showPassword, setShowPassword] = useState(false);
  
  /**
   * Henter eksisterende mail konfiguration (tjekker miljøvariabler først)
   */
  const loadMailConfig = async () => {
    console.log(`${LOG_PREFIXES.search} Henter mail konfiguration...`);
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const response = await fetch('/api/admin/mail-config', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.configured) {
        console.log(`${LOG_PREFIXES.success} Mail konfiguration hentet`);
        setMailConfig(data.config);
        setIsConfigured(true);
        setConfigSource(data.source || 'database');
      } else {
        console.log(`${LOG_PREFIXES.warning} Ingen mail konfiguration fundet`);
        setIsConfigured(false);
        setConfigSource('none');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af mail config:`, error);
      toast.error('Kunne ikke hente mail konfiguration');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Gemmer mail konfiguration via API
   */
  const saveMailConfig = async () => {
    console.log(`${LOG_PREFIXES.form} Gemmer mail konfiguration...`);
    
    // Validering før sending
    if (!mailConfig.smtp_server || !mailConfig.email || !mailConfig.password) {
      toast.error('SMTP server, email og password er påkrævet');
      return;
    }
    
    if (!mailConfig.email.includes('@') || !mailConfig.email.includes('.')) {
      toast.error('Ugyldig email format');
      return;
    }
    
    if (mailConfig.password && mailConfig.password.length < 8) {
      toast.error('Password skal være mindst 8 karakterer');
      return;
    }
    
    if (mailConfig.test_email && (!mailConfig.test_email.includes('@') || !mailConfig.test_email.includes('.'))) {
      toast.error('Ugyldig test email format');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const response = await fetch('/api/admin/mail-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailConfig),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`${LOG_PREFIXES.success} Mail konfiguration gemt`);
        toast.success('Mail konfiguration gemt succesfuldt');
        setIsConfigured(true);
        
        // Opdater konfiguration med response data
        if (data.config) {
          setMailConfig(prev => ({ ...prev, ...data.config }));
        }
      } else {
        throw new Error(data.message || 'Ukendt fejl');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved gemning af mail config:`, error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke gemme mail konfiguration');
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Tester mail konfiguration ved at sende test mail
   */
  const testMailConfig = async () => {
    console.log(`${LOG_PREFIXES.test} Tester mail konfiguration...`);
    
    if (!isConfigured) {
      toast.error('Gem mail konfiguration først');
      return;
    }
    
    setIsTesting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Du skal være logget ind');
        return;
      }
      
      const response = await fetch('/api/admin/mail-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API fejl: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`${LOG_PREFIXES.success} Test mail sendt`);
        toast.success('Test mail sendt succesfuldt!');
      } else {
        throw new Error(data.message || 'Test fejlede');
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Test mail fejl:`, error);
      toast.error(error instanceof Error ? error.message : 'Test mail fejlede');
    } finally {
      setIsTesting(false);
    }
  };
  
  /**
   * Håndterer input ændringer
   */
  const handleInputChange = (field: keyof MailConfig, value: string | number) => {
    console.log(`${LOG_PREFIXES.form} Opdaterer ${field}: ${typeof value === 'string' && field === 'password' ? '***' : value}`);
    
    setMailConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Hent mail konfiguration når komponenten loader
  useEffect(() => {
    if (isAdmin) {
      loadMailConfig();
    }
  }, [isAdmin]);
  
  // Returner tom div hvis ikke admin
  if (!isAdmin) {
    return null;
  }
  
  console.log(`${LOG_PREFIXES.config} Renderer Mail Config Card...`);
  
  return (
    <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          📧 Mail Konfiguration
          {isConfigured && (
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              configSource === 'environment' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {configSource === 'environment' ? 'Miljøvariabler' : 'Konfigureret'}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {configSource === 'environment' 
            ? 'Mail konfiguration læses fra miljøvariabler (.env.local)' 
            : 'Konfigurer SMTP indstillinger til at sende rapport emails til chauffører'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : configSource === 'environment' ? (
          <>
            {/* Environment variables information */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 text-lg">ℹ️</div>
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Mail konfiguration læses fra miljøvariabler
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    SMTP indstillinger er konfigureret via følgende miljøvariabler i .env.local:
                  </p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li><code>SMTP_SERVER</code> = {mailConfig.smtp_server}</li>
                    <li><code>SMTP_PORT</code> = {mailConfig.smtp_port}</li>
                    <li><code>EMAIL</code> = {mailConfig.email}</li>
                    <li><code>APP_PASSWORD</code> = ••••••••</li>
                    {mailConfig.test_email && (
                      <li><code>TEST_EMAIL</code> = {mailConfig.test_email}</li>
                    )}
                  </ul>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    For at ændre indstillinger, rediger .env.local filen og genstart applikationen.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Test mail button for environment config */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Test mail funktionalitet
              </div>
              
              {mailConfig.test_email && (
                <Button
                  onClick={testMailConfig}
                  disabled={isTesting}
                  variant="outline"
                  className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Sender...
                    </>
                  ) : (
                    '🧪 Send Test Mail'
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* SMTP Server indstillinger */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  SMTP Server *
                </Label>
                <Input
                  value={mailConfig.smtp_server || ''}
                  onChange={(e) => handleInputChange('smtp_server', e.target.value)}
                  placeholder="f.eks. smtp.gmail.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Din email udbyders SMTP server adresse
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  SMTP Port *
                </Label>
                <Input
                  type="number"
                  value={mailConfig.smtp_port || 587}
                  onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  587 (TLS) eller 465 (SSL)
                </p>
              </div>
            </div>
            
            {/* Email og Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Adresse *
                </Label>
                <Input
                  type="email"
                  value={mailConfig.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="rapport@fiskelogistik.dk"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Afsender email adresse
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  App Password *
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={mailConfig.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="App password (ikke normalt password)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  App-specifikt password (ikke dit normale password)
                </p>
              </div>
            </div>
            
            {/* Test email */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Email Adresse
              </Label>
              <Input
                type="email"
                value={mailConfig.test_email || ''}
                onChange={(e) => handleInputChange('test_email', e.target.value)}
                placeholder="test@example.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email adresse til test mails (valgfrit)
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={saveMailConfig}
                disabled={isSaving || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gemmer...
                  </>
                ) : (
                  '💾 Gem Konfiguration'
                )}
              </Button>
              
              {isConfigured && (
                <Button
                  onClick={testMailConfig}
                  disabled={isTesting || !mailConfig.test_email}
                  variant="outline"
                  className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Sender...
                    </>
                  ) : (
                    '🧪 Send Test Mail'
                  )}
                </Button>
              )}
              
              <Button
                onClick={loadMailConfig}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                🔄 Genindlæs
              </Button>
            </div>
            
            {/* Help text */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                📋 Hvordan opretter jeg App Password:
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li><strong>Gmail:</strong> Gå til Google Account → Security → 2-Step Verification → App passwords</li>
                <li><strong>Outlook:</strong> Gå til Security → Advanced security options → App passwords</li>
                <li><strong>Andre:</strong> Tjek din email udbyders dokumentation for app passwords</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 