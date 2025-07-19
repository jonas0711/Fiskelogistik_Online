/**
 * Admin funktioner og middleware
 * Håndterer admin-specifikke operationer og validering
 */

import { supabaseAdmin } from './db';
import { getCurrentUser } from './db';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for admin bruger
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  user_metadata?: {
    role?: string;
    is_admin?: boolean;
  };
}

/**
 * Tjekker om den nuværende bruger er admin
 * @returns Promise<boolean> - true hvis bruger er admin
 */
export async function isAdmin(): Promise<boolean> {
  console.log(`${LOG_PREFIXES.admin} Tjekker admin status...`);
  
  try {
    // Hent nuværende bruger
    const user = await getCurrentUser();
    
    if (!user) {
      console.log(`${LOG_PREFIXES.error} Ingen bruger logget ind`);
      return false;
    }
    
    console.log(`${LOG_PREFIXES.user} Bruger fundet:`, user.email);
    
    // Tjek om bruger har admin rolle i app metadata (sikker)
    const userRoles = user.app_metadata?.roles || [];
    const isAdminFlag = user.app_metadata?.is_admin;
    
    console.log(`${LOG_PREFIXES.search} Bruger roller:`, userRoles);
    console.log(`${LOG_PREFIXES.search} Admin flag:`, isAdminFlag);
    
    // Returner true hvis bruger er admin
    const isAdminUser = userRoles.includes('admin') || isAdminFlag === true;
    
    console.log(`${LOG_PREFIXES.success} Admin status: ${isAdminUser ? 'Admin' : 'Ikke admin'}`);
    return isAdminUser;
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved admin tjek:`, error);
    return false;
  }
}

/**
 * Henter admin bruger data fra database
 * @param userId - Bruger ID at tjekke
 * @returns Promise<AdminUser | null>
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  console.log(`${LOG_PREFIXES.search} Henter admin bruger data for:`, userId);
  
  try {
    // Hent bruger fra Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved hentning af bruger:`, error.message);
      return null;
    }
    
    if (!user) {
      console.log(`${LOG_PREFIXES.error} Bruger ikke fundet`);
      return null;
    }
    
    // Tjek om bruger er admin
    const userRoles = user.app_metadata?.roles || [];
    const isAdminFlag = user.app_metadata?.is_admin;
    
    if (userRoles.includes('admin') || isAdminFlag === true) {
      console.log(`${LOG_PREFIXES.success} Admin bruger fundet:`, user.email);
      return {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        user_metadata: user.user_metadata,
      };
    } else {
      console.log(`${LOG_PREFIXES.error} Bruger er ikke admin`);
      return null;
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved admin bruger hentning:`, error);
    return null;
  }
}

/**
 * Validerer admin token fra request header
 * @param authHeader - Authorization header fra request
 * @returns Promise<AdminUser | null>
 */
export async function validateAdminToken(authHeader: string | null): Promise<AdminUser | null> {
  console.log(`${LOG_PREFIXES.auth} Validerer admin token...`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`${LOG_PREFIXES.error} Ingen eller ugyldig authorization header`);
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Verificer token med Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Token validering fejlede:`, error.message);
      return null;
    }
    
    if (!user) {
      console.log(`${LOG_PREFIXES.error} Ingen bruger fundet i token`);
      return null;
    }
    
    // Tjek om bruger er admin
    const userRoles = user.app_metadata?.roles || [];
    const isAdminFlag = user.app_metadata?.is_admin;
    
    if (userRoles.includes('admin') || isAdminFlag === true) {
      console.log(`${LOG_PREFIXES.success} Admin token valideret for:`, user.email);
      return {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        user_metadata: user.user_metadata,
      };
    } else {
      console.log(`${LOG_PREFIXES.error} Token tilhører ikke en admin bruger`);
      return null;
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved token validering:`, error);
    return null;
  }
}

/**
 * Sætter admin rolle på en bruger
 * @param userId - Bruger ID at opdatere
 * @returns Promise<boolean> - true hvis opdatering lykkedes
 */
export async function setUserAsAdmin(userId: string): Promise<boolean> {
  console.log(`${LOG_PREFIXES.admin} Sætter admin rolle på bruger:`, userId);
  
  try {
    // Opdater bruger app metadata med admin rolle (sikker)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          roles: ['admin'],
          is_admin: true,
        }
      }
    );
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved admin rolle opdatering:`, error.message);
      return false;
    }
    
    console.log(`${LOG_PREFIXES.success} Admin rolle sat succesfuldt på:`, data.user?.email);
    return true;
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved admin rolle opdatering:`, error);
    return false;
  }
}

// Eksporter alle funktioner
export default {
  isAdmin,
  getAdminUser,
  validateAdminToken,
  setUserAsAdmin,
}; 