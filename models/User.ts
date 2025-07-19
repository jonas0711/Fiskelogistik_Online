/**
 * User model for FSK Online Dashboard
 * Definerer strukturen for brugerdata i databasen
 */

// TypeScript interface for brugerdata
export interface User {
  // Unikt ID for brugeren (UUID)
  id: string;
  
  // Email adresse (unik)
  email: string;
  
  // Fuldt navn
  full_name?: string;
  
  // Avatar URL (valgfrit)
  avatar_url?: string;
  
  // Rolle i systemet (admin, user, etc.)
  role: 'admin' | 'user';
  
  // Om brugeren er aktiv
  is_active: boolean;
  
  // Sidste login dato
  last_login?: string;
  
  // Metadata (JSON objekt)
  metadata?: Record<string, any>;
  
  // Standard felter fra vores database regler
  owner: string; // UUID af brugeren der ejer denne post
  created_at: string; // ISO dato string
  updated_at: string; // ISO dato string
  deleted_at?: string; // ISO dato string eller null
}

// Interface for at oprette en ny bruger
export interface CreateUserData {
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// Interface for at opdatere en bruger
export interface UpdateUserData {
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
  last_login?: string;
  metadata?: Record<string, any>;
}

// Database schema definition (SQL)
export const USER_SCHEMA = `
CREATE TABLE IF NOT EXISTS "user" (
  -- Standard felter fra vores database regler
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Bruger-specifikke felter
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT user_email_not_empty CHECK (email != ''),
  CONSTRAINT user_role_valid CHECK (role IN ('admin', 'user'))
);

-- RLS (Row Level Security) policies
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- Policy: Brugere kan kun se deres egne data
CREATE POLICY "Users can view own data" ON "user"
  FOR SELECT USING (auth.uid() = owner);

-- Policy: Brugere kan kun opdatere deres egne data
CREATE POLICY "Users can update own data" ON "user"
  FOR UPDATE USING (auth.uid() = owner);

-- Policy: Kun admins kan oprette nye brugere
CREATE POLICY "Only admins can create users" ON "user"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE owner = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Kun admins kan slette brugere (soft delete)
CREATE POLICY "Only admins can delete users" ON "user"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE owner = auth.uid() AND role = 'admin'
    )
  );

-- Index for bedre performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_active ON "user"(is_active) WHERE deleted_at IS NULL;
`;

// Hjælpefunktioner til validering
export function validateUserData(data: CreateUserData): { isValid: boolean; errors: string[] } {
  console.log('🔍 Validerer brugerdata:', data);
  
  const errors: string[] = [];
  
  // Tjek email
  if (!data.email) {
    errors.push('Email er påkrævet');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email format er ugyldigt');
  }
  
  // Tjek full_name hvis det er givet
  if (data.full_name && data.full_name.trim().length < 2) {
    errors.push('Fuldt navn skal være mindst 2 tegn');
  }
  
  // Tjek role hvis det er givet
  if (data.role && !['admin', 'user'].includes(data.role)) {
    errors.push('Rolle skal være enten "admin" eller "user"');
  }
  
  const isValid = errors.length === 0;
  console.log(`✅ Brugerdata validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`, errors);
  
  return { isValid, errors };
}

// Eksporter alle funktioner og konstanter
export default {
  USER_SCHEMA,
  validateUserData,
}; 