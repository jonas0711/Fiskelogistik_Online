/**
 * InviteUserForm komponent
 * Formular til at invitere nye brugere til systemet
 * Kun admins kan bruge denne formular
 */

'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

import { supabase } from '../libs/db';
import { toast } from 'sonner';

// Interface for invitation form data
interface InviteFormData {
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  message: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    invitation_id?: string;
    email?: string;
    expires_at?: string;
  };
  error?: string;
}

/**
 * InviteUserForm komponent
 * @returns JSX element
 */
export default function InviteUserForm() {
  console.log('🎨 Renderer InviteUserForm komponent...');
  
  // State for form data
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    full_name: '',
    role: 'user',
    message: '',
  });
  
  // State for form status
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Håndterer ændringer i form felter
   * @param field - Navn på feltet der ændres
   * @param value - Ny værdi
   */
  const handleInputChange = (field: keyof InviteFormData, value: string) => {
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
  const validateForm = (data: InviteFormData): { isValid: boolean; errors: string[] } => {
    console.log('🔍 Validerer invitation form...');
    
    const errors: string[] = [];
    
    // Tjek email
    if (!data.email || !data.email.trim()) {
      errors.push('Email er påkrævet');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email format er ugyldigt');
    }
    
    // Tjek full_name
    if (!data.full_name || !data.full_name.trim()) {
      errors.push('Fuldt navn er påkrævet');
    } else if (data.full_name.trim().length < 2) {
      errors.push('Fuldt navn skal være mindst 2 tegn');
    }
    
    // Tjek role
    if (!['admin', 'user'].includes(data.role)) {
      errors.push('Ugyldig rolle valgt');
    }
    
    // Tjek message længde
    if (data.message && data.message.length > 500) {
      errors.push('Besked må ikke være længere end 500 tegn');
    }
    
    const isValid = errors.length === 0;
    console.log(`✅ Form validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
    
    return { isValid, errors };
  };
  
  /**
   * Håndterer form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Invitation form submitted...');
    
    // Valider form data
    const validation = validateForm(formData);
    if (!validation.isValid) {
      console.error('❌ Form validering fejlede:', validation.errors);
      toast.error(validation.errors.join(', '));
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔐 Henter session for admin token...');
      
      // Hent nuværende session for at få access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Fejl ved session hentning:', sessionError.message);
        throw new Error('Kunne ikke hente session');
      }
      
      if (!session?.access_token) {
        console.error('❌ Ingen access token fundet');
        throw new Error('Du skal være logget ind for at sende invitationer');
      }
      
      console.log('✅ Session hentet, sender invitation request...');
      
      // Send invitation request til API
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });
      
      console.log('📨 API response status:', response.status);
      
      const result: ApiResponse = await response.json();
      console.log('📨 API response data:', result);
      
      if (result.success) {
        console.log('✅ Invitation sendt succesfuldt');
        toast.success(`Invitation sendt til ${result.data?.email}`);
        
        // Reset form
        setFormData({
          email: '',
          full_name: '',
          role: 'user',
          message: '',
        });
      } else {
        console.error('❌ Invitation fejlede:', result.error);
        
        // Giv mere specifik feedback baseret på fejltypen
        if (result.error?.includes('eksisterer allerede')) {
          toast.error('Denne email er allerede registreret. Prøv med en anden email adresse.');
        } else if (result.error?.includes('Ugyldig email')) {
          toast.error('Email format er ugyldigt. Tjek at email adressen er korrekt.');
        } else if (result.error?.includes('Too many requests')) {
          toast.error('For mange invitationer. Vent et øjeblik før du prøver igen.');
        } else {
          toast.error(result.error || result.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Uventet fejl ved invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Der opstod en uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };
  
  console.log('✅ InviteUserForm komponent renderet');
  
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email felt */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="bruger@eksempel.dk"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Email adressen må ikke være registreret i systemet endnu
            </p>
          </div>
          
          {/* Fuldt navn felt */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Fuldt navn *</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          {/* Rolle felt */}
          <div className="space-y-2">
            <Label htmlFor="role">Rolle *</Label>
            <select
              id="role"
              name="role"
              aria-label="Vælg bruger rolle"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as 'admin' | 'user')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">Bruger</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          {/* Besked felt (valgfrit) */}
          <div className="space-y-2">
            <Label htmlFor="message">Besked (valgfrit)</Label>
            <textarea
              id="message"
              placeholder="Personlig besked til den inviterede..."
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          

          
          {/* Submit knap */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Sender invitation...' : 'Send invitation'}
          </Button>
        </form>
      </div>
    );
} 