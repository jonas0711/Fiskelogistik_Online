/**
 * Create Driver Data Table Utility
 * Opretter driver_data tabellen i Supabase med alle nødvendige felter
 * Baseret på data.md strukturen
 */

import { supabase } from './db';

/**
 * Opretter driver_data tabellen
 */
export async function createDriverDataTable() {
  console.log('🏗️ Opretter driver_data tabel...');
  
  try {
    // SQL til at oprette tabellen
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS driver_data (
        -- Administrative felter
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Datafelter fra Excel
        driver_name TEXT,
        vehicles TEXT,
        anticipatory_driving_assessment NUMERIC,
        anticipatory_driving_without_cruise NUMERIC,
        from_date NUMERIC,
        to_date NUMERIC,
        avg_consumption_per_100km NUMERIC,
        avg_consumption_driving NUMERIC,
        avg_consumption_idling NUMERIC,
        avg_range_per_consumption NUMERIC,
        total_consumption NUMERIC,
        avg_total_weight NUMERIC,
        driving_distance NUMERIC,
        efficiency_l_per_t_per_100km NUMERIC,
        engine_runtime TEXT,
        driving_time TEXT,
        idle_standstill_time TEXT,
        avg_speed NUMERIC,
        co2_emission NUMERIC,
        coasting_assessment NUMERIC,
        active_coasting_km NUMERIC,
        active_coasting_duration TEXT,
        active_pushing_count INTEGER,
        coasting_distance NUMERIC,
        coasting_duration_with_cruise TEXT,
        coasting_phases_count INTEGER,
        accelerator_assessment NUMERIC,
        kickdown_km NUMERIC,
        kickdown_duration TEXT,
        kickdown_count INTEGER,
        accelerator_with_cruise_km NUMERIC,
        accelerator_with_cruise_duration TEXT,
        accelerator_activations_with_cruise INTEGER,
        consumption_without_cruise NUMERIC,
        consumption_with_cruise NUMERIC,
        brake_behavior_assessment NUMERIC,
        service_brake_km NUMERIC,
        service_brake_duration TEXT,
        service_brake_count INTEGER,
        engine_brake_distance NUMERIC,
        engine_brake_duration TEXT,
        engine_brake_count INTEGER,
        retarder_distance NUMERIC,
        retarder_duration TEXT,
        retarder_count INTEGER,
        emergency_brake_assist_count INTEGER,
        cruise_control_assessment NUMERIC,
        cruise_distance_over_50 NUMERIC,
        cruise_duration_over_50 TEXT,
        distance_over_50_without_cruise NUMERIC,
        duration_over_50_without_cruise TEXT,
        avg_cruise_distance_over_50 NUMERIC,
        overspeed_assessment INTEGER,
        overspeed_km_without_coasting NUMERIC,
        total_usage TEXT,
        duty_days TEXT,
        electric_consumption_kwh NUMERIC,
        electric_avg_consumption_driving NUMERIC,
        electric_avg_standstill_consumption NUMERIC,
        electric_avg_range NUMERIC,
        electric_total_avg_consumption NUMERIC,
        electric_energy_efficiency NUMERIC,
        electric_recreation_kwh NUMERIC,
        electric_recovery_assessment NUMERIC,
        electric_anticipatory_driving NUMERIC,
        electric_accelerator_capacity NUMERIC,
        electric_cruise_usage_assessment NUMERIC,
        electric_overspeed_classification NUMERIC
      );
    `;
    
    // Opret tabellen
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.error('❌ Fejl ved oprettelse af tabel:', createError);
      throw createError;
    }
    
    console.log('✅ driver_data tabel oprettet');
    
    // Opret indexes for bedre performance
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_driver_data_month_year ON driver_data(month, year);
      CREATE INDEX IF NOT EXISTS idx_driver_data_driver_name ON driver_data(driver_name);
      CREATE INDEX IF NOT EXISTS idx_driver_data_created_at ON driver_data(created_at);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL });
    
    if (indexError) {
      console.error('❌ Fejl ved oprettelse af indexes:', indexError);
      throw indexError;
    }
    
    console.log('✅ Indexes oprettet');
    
    // Opret RLS policies
    const createRLSSQL = `
      -- Aktiver RLS
      ALTER TABLE driver_data ENABLE ROW LEVEL SECURITY;
      
      -- Policy for at læse data (kun autentificerede brugere)
      CREATE POLICY "Users can view driver data" ON driver_data
        FOR SELECT USING (auth.role() = 'authenticated');
      
      -- Policy for at indsætte data (kun admins)
      CREATE POLICY "Admins can insert driver data" ON driver_data
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
          )
        );
      
      -- Policy for at opdatere data (kun admins)
      CREATE POLICY "Admins can update driver data" ON driver_data
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
          )
        );
      
      -- Policy for at slette data (kun admins)
      CREATE POLICY "Admins can delete driver data" ON driver_data
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
          )
        );
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: createRLSSQL });
    
    if (rlsError) {
      console.error('❌ Fejl ved oprettelse af RLS policies:', rlsError);
      throw rlsError;
    }
    
    console.log('✅ RLS policies oprettet');
    
    return { success: true, message: 'driver_data tabel oprettet succesfuldt' };
    
  } catch (error) {
    console.error('❌ Fejl ved oprettelse af driver_data tabel:', error);
    throw error;
  }
}

/**
 * Tjekker om driver_data tabellen eksisterer
 */
export async function checkDriverDataTable() {
  console.log('🔍 Tjekker om driver_data tabel eksisterer...');
  
  try {
    const { data, error } = await supabase
      .from('driver_data')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ driver_data tabel eksisterer ikke:', error.message);
      return false;
    }
    
    console.log('✅ driver_data tabel eksisterer');
    return true;
    
  } catch (error) {
    console.error('❌ Fejl ved tjek af driver_data tabel:', error);
    return false;
  }
}

/**
 * Tilføjer manglende kolonner til den eksisterende driver_data tabel
 */
export async function addMissingColumns() {
  console.log('🔧 Tilføjer manglende kolonner til driver_data tabel...');
  
  try {
    // SQL til at tilføje alle manglende kolonner
    const addColumnsSQL = `
      -- Tilføj administrative felter hvis de mangler
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      
      -- Tilføj alle datafelter fra Excel
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS anticipatory_driving_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS anticipatory_driving_without_cruise NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS from_date NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS to_date NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_consumption_per_100km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_consumption_driving NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_consumption_idling NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_range_per_consumption NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS total_consumption NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_total_weight NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS driving_distance NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS efficiency_l_per_t_per_100km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS engine_runtime TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS driving_time TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS idle_standstill_time TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_speed NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS co2_emission NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS coasting_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS active_coasting_km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS active_coasting_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS active_pushing_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS coasting_distance NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS coasting_duration_with_cruise TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS coasting_phases_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS accelerator_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS kickdown_km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS kickdown_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS kickdown_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS accelerator_with_cruise_km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS accelerator_with_cruise_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS accelerator_activations_with_cruise INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS consumption_without_cruise NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS consumption_with_cruise NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS brake_behavior_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS service_brake_km NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS service_brake_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS service_brake_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS engine_brake_distance NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS engine_brake_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS engine_brake_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS retarder_distance NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS retarder_duration TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS retarder_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS emergency_brake_assist_count INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS cruise_control_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS cruise_distance_over_50 NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS cruise_duration_over_50 TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS distance_over_50_without_cruise NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS duration_over_50_without_cruise TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS avg_cruise_distance_over_50 NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS overspeed_assessment INTEGER;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS overspeed_km_without_coasting NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS total_usage TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS duty_days TEXT;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_consumption_kwh NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_avg_consumption_driving NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_avg_standstill_consumption NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_avg_range NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_total_avg_consumption NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_energy_efficiency NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_recreation_kwh NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_recovery_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_anticipatory_driving NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_accelerator_capacity NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_cruise_usage_assessment NUMERIC;
      ALTER TABLE driver_data ADD COLUMN IF NOT EXISTS electric_overspeed_classification NUMERIC;
    `;
    
    // Kør SQL kommandoen
    const { error } = await supabase.rpc('exec_sql', { sql: addColumnsSQL });
    
    if (error) {
      console.error('❌ Fejl ved tilføjelse af kolonner:', error);
      throw error;
    }
    
    console.log('✅ Alle kolonner tilføjet til driver_data tabel');
    
    return { success: true, message: 'Kolonner tilføjet succesfuldt' };
    
  } catch (error) {
    console.error('❌ Fejl ved tilføjelse af kolonner:', error);
    throw error;
  }
}

/**
 * Hovedfunktion til at køre setup
 */
export async function setupDriverDataTable() {
  console.log('🚀 Starter setup af driver_data tabel...');
  
  try {
    const tableExists = await checkDriverDataTable();
    
    if (!tableExists) {
      console.log('📋 Opretter driver_data tabel...');
      await createDriverDataTable();
      console.log('✅ Setup fuldført');
    } else {
      console.log('✅ driver_data tabel eksisterer allerede');
      console.log('🔍 Tjekker tabel struktur...');
      
      // Tjek om tabellen har alle nødvendige kolonner ved at prøve at hente data
      const { data, error } = await supabase
        .from('driver_data')
        .select('*')
        .limit(0);
      
      if (error) {
        console.log('⚠️ Tabel har ikke alle kolonner, tilføjer manglende...');
        await addMissingColumns();
        console.log('✅ Kolonner tilføjet');
      } else {
        console.log('✅ Tabel har allerede alle nødvendige kolonner');
      }
    }
    
  } catch (error) {
    console.error('❌ Setup fejlede:', error);
    throw error;
  }
} 