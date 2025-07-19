/**
 * Setup Admin via App Metadata Script
 * Sikker måde at sætte admin rolle på en bruger
 * Bruger app_metadata i stedet for user_metadata
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase konfiguration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Mangler Supabase miljøvariabler');
  console.log('Sørg for at .env.local indeholder:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=din_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=din_service_role_key');
  process.exit(1);
}

// Opret Supabase admin klient
const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Sætter admin rolle på en bruger via email (sikker metode)
 * @param {string} email - Email adresse for brugeren
 */
async function setUserAsAdmin(email) {
  console.log(`👑 Sætter admin rolle på: ${email}`);
  
  try {
    // Hent alle brugere
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Fejl ved bruger liste hentning:', listError.message);
      return false;
    }
    
    // Find bruger med den givne email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Bruger ikke fundet med email: ${email}`);
      console.log('Tilgængelige brugere:');
      users.forEach(u => console.log(`  - ${u.email}`));
      return false;
    }
    
    console.log(`✅ Bruger fundet: ${user.email}`);
    console.log('📋 Nuværende app_metadata:', user.app_metadata);
    
    // Opdater bruger app_metadata med admin rolle (sikker)
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata, // Bevar eksisterende metadata
          roles: ['admin'],
          is_admin: true,
        }
      }
    );
    
    if (error) {
      console.error('❌ Fejl ved admin rolle opdatering:', error.message);
      return false;
    }
    
    console.log(`✅ Admin rolle sat succesfuldt på: ${data.user?.email}`);
    console.log('📋 Ny app_metadata:', data.user?.app_metadata);
    return true;
    
  } catch (error) {
    console.error('❌ Uventet fejl:', error);
    return false;
  }
}

/**
 * Tjekker om en bruger er admin via email
 * @param {string} email - Email adresse for brugeren
 */
async function checkAdminStatus(email) {
  console.log(`🔍 Tjekker admin status for: ${email}`);
  
  try {
    // Hent alle brugere
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Fejl ved bruger liste hentning:', listError.message);
      return false;
    }
    
    // Find bruger med den givne email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Bruger ikke fundet med email: ${email}`);
      return false;
    }
    
    // Tjek om bruger er admin
    const userRoles = user.app_metadata?.roles || [];
    const isAdminFlag = user.app_metadata?.is_admin;
    
    const isAdminUser = userRoles.includes('admin') || isAdminFlag === true;
    
    console.log(`📋 App metadata:`, user.app_metadata);
    console.log(`📋 Roller:`, userRoles);
    console.log(`📋 Admin flag:`, isAdminFlag);
    console.log(`✅ Admin status: ${isAdminUser ? '👑 ADMIN' : '👤 USER'}`);
    
    return isAdminUser;
    
  } catch (error) {
    console.error('❌ Uventet fejl:', error);
    return false;
  }
}

/**
 * Lister alle brugere med deres roller
 */
async function listAllUsers() {
  console.log('📋 Lister alle brugere...');
  
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Fejl ved bruger liste hentning:', error.message);
      return;
    }
    
    console.log(`\n✅ ${users.length} brugere fundet:\n`);
    
    users.forEach((user, index) => {
      const userRoles = user.app_metadata?.roles || [];
      const isAdmin = user.app_metadata?.is_admin || false;
      const isAdminUser = userRoles.includes('admin') || isAdmin;
      const status = isAdminUser ? '👑 ADMIN' : '👤 USER';
      
      console.log(`${index + 1}. ${user.email} - ${status}`);
      console.log(`   Roller: [${userRoles.join(', ')}]`);
      console.log(`   App metadata:`, user.app_metadata);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Uventet fejl ved bruger liste hentning:', error);
  }
}

/**
 * Hovedfunktion
 */
async function main() {
  console.log('🚀 Starter admin setup script (app_metadata metode)...\n');
  
  // Hent email fra kommandolinje argumenter
  const email = process.argv[2];
  const action = process.argv[3];
  
  if (!email) {
    console.log('❌ Email adresse mangler');
    console.log('Brug: node scripts/setup-admin-app-metadata.js din-email@eksempel.dk');
    console.log('Eller: node scripts/setup-admin-app-metadata.js din-email@eksempel.dk check');
    console.log('\nAlternativt, kør scriptet uden argumenter for at se alle brugere');
    
    // Vis alle brugere hvis ingen email er givet
    await listAllUsers();
    return;
  }
  
  if (action === 'check') {
    // Tjek admin status
    await checkAdminStatus(email);
  } else {
    // Sæt admin rolle
    const success = await setUserAsAdmin(email);
    
    if (success) {
      console.log('\n🎉 Admin setup fuldført!');
      console.log(`\nNu kan du:`);
      console.log(`1. Logge ud og ind igen på ${email}`);
      console.log(`2. Gå til /admin for at se admin dashboard`);
      console.log(`3. Sende invitationer til nye brugere`);
      
      // Tjek status efter opdatering
      console.log('\n🔍 Verificerer admin status...');
      await checkAdminStatus(email);
    } else {
      console.log('\n❌ Admin setup fejlede');
    }
  }
  
  // Vis alle brugere efter opdatering
  console.log('\n📋 Nuværende brugere:');
  await listAllUsers();
}

// Kør scriptet
main().catch(console.error); 