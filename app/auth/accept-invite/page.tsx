/**
 * Accept Invite Page
 * Side til at acceptere invitationer og sætte første password
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { supabase } from '../../../libs/db';

// Interface for password form data
interface PasswordFormData {
  password: string;
  confirmPassword: string;
}



/**
 * Accept Invite Page komponent
 * @returns JSX element
 */
function AcceptInvitePageContent() {
  console.log('🎨 Renderer Accept Invite Page...');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for form data
  const [formData, setFormData] = useState<PasswordFormData>({
    password: '',
    confirmPassword: '',
  });
  
  // State for form status
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteData, setInviteData] = useState<{
    email?: string;
    full_name?: string;
    role?: string;
  } | null>(null);
  
  /**
   * Håndterer ændringer i form felter
   * @param field - Navn på feltet der ændres
   * @param value - Ny værdi
   */
  const handleInputChange = (field: keyof PasswordFormData, value: string) => {
    console.log(`📝 Form felt ændret: ${field} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  /**
   * Validerer form data før afsendelse
   * @param data - Form data at validere
   * @returns Validering resultat
   */
  const validateForm = (data: PasswordFormData): { isValid: boolean; errors: string[] } => {
    console.log('🔍 Validerer password form...');
    
    const errors: string[] = [];
    
    // Tjek password
    if (!data.password || !data.password.trim()) {
      errors.push('Password er påkrævet');
    } else if (data.password.length < 6) {
      errors.push('Password skal være mindst 6 tegn');
    }
    
    // Tjek password bekræftelse
    if (!data.confirmPassword || !data.confirmPassword.trim()) {
      errors.push('Password bekræftelse er påkrævet');
    } else if (data.password !== data.confirmPassword) {
      errors.push('Passwords matcher ikke');
    }
    
    const isValid = errors.length === 0;
    console.log(`✅ Password form validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
    
    return { isValid, errors };
  };
  
  /**
   * Håndterer form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Password form submitted...');
    
    // Valider form data
    const validation = validateForm(formData);
    if (!validation.isValid) {
      console.error('❌ Form validering fejlede:', validation.errors);
      setMessage({
        type: 'error',
        text: validation.errors.join(', '),
      });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      console.log('🔐 Sætter password for inviteret bruger...');
      
      // Hent nuværende session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Ingen session fundet:', sessionError?.message);
        throw new Error('Ugyldig invitation session');
      }
      
      // Opdater password for brugeren
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password,
      });
      
      if (error) {
        console.error('❌ Password opdatering fejlede:', error.message);
        throw new Error(error.message);
      }
      
      console.log('✅ Password sat succesfuldt for:', data.user?.email);
      
      setMessage({
        type: 'success',
        text: 'Password sat succesfuldt! Du vil blive omdirigeret til dashboard.',
      });
      
      // Redirect til RIO programmet efter 2 sekunder
      setTimeout(() => {
        router.push('/rio');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Uventet fejl ved password sætning:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Der opstod en uventet fejl',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Henter invitation data fra URL parametre og hash fragments
   */
  useEffect(() => {
    console.log('🔍 Henter invitation data fra URL...');
    
    // Hent invitation data fra URL parametre (query string)
    const email = searchParams.get('email');
    const full_name = searchParams.get('full_name');
    const role = searchParams.get('role');
    
    console.log('📋 Query parametre fundet:', { email, full_name, role });
    
    // Hvis vi har data fra query parametre, brug det
    if (email) {
      console.log('✅ Invitation data fundet i query parametre:', { email, full_name, role });
      setInviteData({
        email,
        full_name: full_name || undefined,
        role: role || 'user',
      });
      return;
    }
    
    // Hvis ingen query parametre, tjek hash fragments
    console.log('🔍 Tjekker hash fragments...');
    
    // Hent hash fragment fra URL
    const hash = window.location.hash;
    console.log('🔗 Hash fragment:', hash);
    
    if (hash) {
      // Parse hash fragment (fjern # og parse som query string)
      const hashParams = new URLSearchParams(hash.substring(1));
      
      // Tjek først om der er fejl i hash fragmentet
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      if (error) {
        console.log('❌ Fejl fundet i hash fragment:', { error, errorCode, errorDescription });
        
        // Håndter specifikke fejl
        if (errorCode === 'otp_expired') {
          setMessage({
            type: 'error',
            text: 'Invitationen er udløbet. Kontakt en administrator for at få en ny invitation.',
          });
          return;
        } else if (error === 'access_denied') {
          setMessage({
            type: 'error',
            text: 'Adgang nægtet. Invitationen er ikke gyldig.',
          });
          return;
        } else {
          setMessage({
            type: 'error',
            text: `Fejl: ${errorDescription || error}`,
          });
          return;
        }
      }
      
      // Hvis ingen fejl, tjek for invitation data
      const hashEmail = hashParams.get('email');
      const hashFullName = hashParams.get('full_name');
      const hashRole = hashParams.get('role');
      
      console.log('📋 Hash parametre fundet:', { hashEmail, hashFullName, hashRole });
      
      if (hashEmail) {
        console.log('✅ Invitation data fundet i hash fragment:', { hashEmail, hashFullName, hashRole });
        setInviteData({
          email: hashEmail,
          full_name: hashFullName || undefined,
          role: hashRole || 'user',
        });
        return;
      }
    }
    
    // Tjek om vi har en session (måske er brugeren allerede logget ind via invitation)
    console.log('🔍 Tjekker om bruger allerede er logget ind...');
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Fejl ved session tjek:', error.message);
        } else if (session?.user) {
          console.log('✅ Bruger allerede logget ind via invitation:', session.user.email);
          setInviteData({
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name,
            role: session.user.user_metadata?.role || 'user',
          });
          return;
        } else {
          console.log('ℹ️ Ingen aktiv session fundet');
        }
      } catch (error) {
        console.error('❌ Uventet fejl ved session tjek:', error);
      }
      
      // Hvis vi når hertil, har vi ingen invitation data
      console.log('❌ Ingen invitation data fundet i URL eller session');
      setMessage({
        type: 'error',
        text: 'Ugyldig invitation link',
      });
    };
    
    checkSession();
  }, [searchParams]);
  
  console.log('✅ Accept Invite Page renderet');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Accepter invitation
            </CardTitle>
            <CardDescription className="text-gray-600">
              Sæt dit password for at fuldføre din registrering
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Invitation info */}
            {inviteData && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Invitation detaljer
                </h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>Email:</strong> {inviteData.email}</p>
                  {inviteData.full_name && (
                    <p><strong>Navn:</strong> {inviteData.full_name}</p>
                  )}
                  <p><strong>Rolle:</strong> {inviteData.role}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password felt */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Dit nye password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              {/* Password bekræftelse felt */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bekræft password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Gentag dit password"
                  value={formData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              {/* Status besked */}
              {message && (
                <div className={`p-3 rounded-md ${
                  message.type === 'success' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
              
              {/* Submit knap */}
              <Button
                type="submit"
                disabled={isLoading || !inviteData}
                className="w-full"
              >
                {isLoading ? 'Sætter password...' : 'Sæt password og log ind'}
              </Button>
              
              {/* Hjælp knap hvis der er fejl */}
              {message?.type === 'error' && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Har du problemer med invitationen?
                  </p>
                  <Button
                    onClick={() => window.location.href = '/admin'}
                    variant="outline"
                    className="w-full"
                  >
                    Kontakt administrator
                  </Button>
                </div>
              )}
            </form>
            
            {/* Hjælp sektion */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Sådan fungerer det:
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Sæt et sikkert password (mindst 6 tegn)</li>
                <li>• Du vil automatisk blive logget ind</li>
                <li>• Du bliver omdirigeret til dashboard</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Accept Invite Page wrapper med Suspense
 * @returns JSX element
 */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AcceptInvitePageContent />
    </Suspense>
  );
}