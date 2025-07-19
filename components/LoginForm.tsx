/**
 * LoginForm komponent
 * Håndterer bruger login med email og password
 * Kun whitelisted emails kan logge ind
 * FSK (Fiskelogistikgruppen) branded design
 */

'use client'; // Dette gør komponenten til en client-side komponent

import { useState } from 'react'; // React hook til at håndtere state
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { supabase } from '../libs/db'; // Vores Supabase klient
import { isValidEmail } from '../libs/utils'; // Hjælpefunktion til email validering
import Image from 'next/image'; // Next.js Image komponent til optimeret billede visning

// Interface for form data
interface LoginFormData {
  email: string;
  password: string;
}

// Interface for form fejl
interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  console.log('🔐 Initialiserer LoginForm komponent...');
  
  // State til form data
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  // State til form fejl
  const [errors, setErrors] = useState<LoginFormErrors>({});
  
  // State til loading status
  const [isLoading, setIsLoading] = useState(false);
  
  // Fjernet success message state - omdirigerer straks i stedet
  
  /**
   * Håndterer ændringer i input felterne
   * @param field - Navnet på feltet der ændres
   * @param value - Den nye værdi
   */
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    console.log(`📝 Input ændring i ${field}:`, value);
    
    // Opdater form data
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Ryd fejl for dette felt
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    // Ryd general fejl hvis brugeren begynder at skrive igen
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined,
      }));
    }
  };
  
  /**
   * Validerer form data før submission
   * @returns true hvis data er gyldigt, false ellers
   */
  const validateForm = (): boolean => {
    console.log('🔍 Validerer login form...');
    
    const newErrors: LoginFormErrors = {};
    
    // Valider email
    if (!formData.email.trim()) {
      newErrors.email = 'Email adresse er påkrævet';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ugyldig email format';
    }
    
    // Valider password
    if (!formData.password.trim()) {
      newErrors.password = 'Adgangskode er påkrævet';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Adgangskode skal være mindst 6 tegn';
    }
    
    // Opdater errors state
    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    console.log(`✅ Form validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, newErrors);
    
    return isValid;
  };
  
  /**
   * Håndterer form submission
   * @param event - Form submit event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Forhindrer standard form submission
    
    console.log('🚀 Starter login process...');
    
    // Valider form først
    if (!validateForm()) {
      console.log('❌ Form validering fejlede, stopper login');
      return;
    }
    
    // Start loading
    setIsLoading(true);
    setErrors({});
    
    try {
      console.log('🔐 Forsøger at logge ind med Supabase...');
      
      // Kald Supabase signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });
      
      if (error) {
        console.error('❌ Login fejl:', error.message);
        
        // Håndter forskellige fejl typer
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Forkert email eller adgangskode' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Email skal bekræftes før login' });
        } else {
          setErrors({ general: 'Der opstod en fejl under login. Prøv venligst igen.' });
        }
      } else {
        console.log('✅ Login succesfuldt:', data.user?.email);
        
        // Ryd form data
        setFormData({ email: '', password: '' });
        
        // Omdiriger straks til RIO programmet
        window.location.href = '/rio';
      }
    } catch (error) {
      console.error('❌ Uventet fejl under login:', error);
      setErrors({ general: 'Der opstod en uventet fejl. Prøv venligst igen.' });
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };
  
  console.log('🎨 Renderer LoginForm komponent...');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Background pattern for maritime feel */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
        <CardHeader className="space-y-4 pb-6">
          {/* FSK Logo og branding */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-16 h-16">
              <Image
                src="/fiskelogistikgruppen-logo.png"
                alt="FSK Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                FSK Online
              </CardTitle>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Fiskelogistikgruppen
              </p>
            </div>
          </div>
          
          <CardDescription className="text-center text-gray-600 dark:text-gray-300 text-base">
            Adgang til dit private forretningsdashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input felt */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email adresse
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.dk"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                className={`transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.email}
                </p>
              )}
            </div>
            
            {/* Password input felt */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Adgangskode
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Din adgangskode"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading}
                className={`transition-all duration-200 ${
                  errors.password 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.password}
                </p>
              )}
            </div>
            
            {/* General fejl besked */}
            {errors.general && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center">
                  <span className="mr-2">🚫</span>
                  {errors.general}
                </p>
              </div>
            )}
            
            {/* Fjernet success besked - omdirigerer straks i stedet */}
            
            {/* Submit knap */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logger ind...
                </div>
              ) : (
                'Log ind på RIO Program'
              )}
            </Button>
          </form>
          
          {/* Sikkerhedsnoter */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔒 Sikker adgang - Kun autoriserede brugere
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Kun whitelisted email adresser har adgang til systemet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 