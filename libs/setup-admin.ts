/**
 * Setup Admin funktioner
 * Hjælpefunktioner til at konfigurere admin brugere
 */

import { supabaseAdmin } from './db';

/**
 * Sætter admin rolle på en bruger via email
 * @param email - Email adresse for brugeren
 * @returns Promise<boolean> - true hvis opdatering lykkedes
 */
export async function setUserAsAdminByEmail(email: string): Promise<boolean> {
  console.log('👑 Sætter admin rolle på bruger via email:', email);
  
  try {
    // Hent bruger via email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Fejl ved bruger liste hentning:', listError.message);
      return false;
    }
    
    // Find bruger med den givne email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('❌ Bruger ikke fundet med email:', email);
      return false;
    }
    
    console.log('✅ Bruger fundet:', user.email);
    
    // Opdater bruger app metadata med admin rolle (sikker)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          roles: ['admin'],
          is_admin: true,
        }
      }
    );
    
    if (error) {
      console.error('❌ Fejl ved admin rolle opdatering:', error.message);
      return false;
    }
    
    console.log('✅ Admin rolle sat succesfuldt på:', data.user?.email);
    return true;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved admin rolle opdatering:', error);
    return false;
  }
}

/**
 * Tjekker om en bruger er admin via email
 * @param email - Email adresse for brugeren
 * @returns Promise<boolean> - true hvis bruger er admin
 */
export async function isUserAdminByEmail(email: string): Promise<boolean> {
  console.log('🔍 Tjekker admin status for email:', email);
  
  try {
    // Hent bruger via email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Fejl ved bruger liste hentning:', listError.message);
      return false;
    }
    
    // Find bruger med den givne email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('❌ Bruger ikke fundet med email:', email);
      return false;
    }
    
    // Tjek om bruger er admin
    const userRoles = user.app_metadata?.roles || [];
    const isAdminFlag = user.app_metadata?.is_admin;
    
    const isAdminUser = userRoles.includes('admin') || isAdminFlag === true;
    
    console.log(`✅ Admin status for ${email}: ${isAdminUser ? 'Admin' : 'Ikke admin'}`);
    return isAdminUser;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved admin status tjek:', error);
    return false;
  }
}

/**
 * Lister alle brugere med deres roller
 * @returns Promise<Array<{email: string, role: string, is_admin: boolean}>>
 */
export async function listAllUsers(): Promise<Array<{email: string, role: string, is_admin: boolean}>> {
  console.log('📋 Lister alle brugere...');
  
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved bruger liste hentning:', error.message);
      return [];
    }
    
    const userList = users.map(user => ({
      email: user.email || 'Ukendt',
      role: user.app_metadata?.roles?.includes('admin') ? 'admin' : 'user',
      is_admin: user.app_metadata?.is_admin || false,
    }));
    
    console.log(`✅ ${userList.length} brugere fundet`);
    return userList;
    
  } catch (error) {
    console.error('❌ Uventet fejl ved bruger liste hentning:', error);
    return [];
  }
}

// Eksporter alle funktioner
export default {
  setUserAsAdminByEmail,
  isUserAdminByEmail,
  listAllUsers,
}; 