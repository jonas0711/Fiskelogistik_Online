/**
 * LoginForm komponent
 * Håndterer bruger login med email og password
 * Kun whitelisted emails kan logge ind
 */

'use client'; // Dette gør komponenten til en client-side komponent

import { useState } from 'react'; // React hook til at håndtere state
import { Button } from '@/components/ui/button'; // ShadCN button komponent
import { Input } from '@/components/ui/input'; // ShadCN input komponent
import { Label } from '@/components/ui/label'; // ShadCN label komponent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // ShadCN card komponenter
import { supabase } from '../libs/db'; // Vores Supabase klient
import { isValidEmail } from '../libs/utils'; // Hjælpefunktion til email validering

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
  
  // State til success besked
  const [successMessage, setSuccessMessage] = useState('');
  
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
      newErrors.email = 'Email er påkrævet';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email format er ugyldigt';
    }
    
    // Valider password
    if (!formData.password.trim()) {
      newErrors.password = 'Password er påkrævet';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password skal være mindst 6 tegn';
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
    setSuccessMessage('');
    
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
          setErrors({ general: 'Forkert email eller password' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Email skal bekræftes før login' });
        } else {
          setErrors({ general: 'Der opstod en fejl under login. Prøv igen.' });
        }
      } else {
        console.log('✅ Login succesfuldt:', data.user?.email);
        setSuccessMessage('Login succesfuldt! Omdirigerer...');
        
        // Ryd form data
        setFormData({ email: '', password: '' });
        
        // Omdiriger til dashboard efter kort ventetid
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Uventet fejl under login:', error);
      setErrors({ general: 'Der opstod en uventet fejl. Prøv igen.' });
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };
  
  console.log('🎨 Renderer LoginForm komponent...');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            FSK Online Dashboard
          </CardTitle>
          <CardDescription className="text-center">
            Log ind for at få adgang til dit private dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input felt */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.dk"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            
            {/* Password input felt */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Dit password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            {/* General fejl besked */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}
            
            {/* Success besked */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}
            
            {/* Submit knap */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Logger ind...' : 'Log ind'}
            </Button>
          </form>
          
          {/* Sikkerhedsnoter */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Kun whitelisted email adresser kan logge ind
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 