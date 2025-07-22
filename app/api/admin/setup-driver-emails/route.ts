/**
 * API Endpoint: /api/admin/setup-driver-emails
 * Admin endpoint til at oprette driver_emails tabel i databasen
 * Kun tilgængelig for admin brugere
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/libs/db';
import { isAdmin } from '@/libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * POST endpoint til at oprette driver_emails tabel
 * Opretter tabellen med korrekt struktur og sikkerhedspolitikker
 */
export async function POST() {
  console.log(`${LOG_PREFIXES.config} Håndterer POST request til setup driver_emails tabel...`);
  
  try {
    // Tjek admin rettigheder
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan oprette tabeller`);
      return NextResponse.json(
        { error: 'Kun admin kan oprette tabeller' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret - fortsætter med tabel oprettelse...`);
    
    // Tjek om tabellen allerede eksisterer
    console.log(`${LOG_PREFIXES.search} Tjekker om driver_emails tabel eksisterer...`);
    
    const { error: tableCheckError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'driver_emails');
    
    if (tableCheckError) {
      console.log(`${LOG_PREFIXES.warning} Kunne ikke tjekke eksisterende tabeller (normalt):`, tableCheckError.message);
    }
    
    // Opret driver_emails tabel
    console.log(`${LOG_PREFIXES.config} Opretter driver_emails tabel...`);
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.driver_emails (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_name text NOT NULL UNIQUE,
        email text NOT NULL,
        last_report_sent timestamp with time zone,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      -- Opret indeks for hurtigere søgning
      CREATE INDEX IF NOT EXISTS idx_driver_emails_driver_name ON public.driver_emails(driver_name);
      CREATE INDEX IF NOT EXISTS idx_driver_emails_email ON public.driver_emails(email);
      
      -- Opret automatisk updated_at trigger
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_driver_emails_updated_at ON public.driver_emails;
      CREATE TRIGGER update_driver_emails_updated_at
        BEFORE UPDATE ON public.driver_emails
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    const { error: tableError } = await supabaseAdmin.rpc('execute_sql', {
      sql: createTableSQL
    });
    
    if (tableError) {
      console.error(`${LOG_PREFIXES.error} Fejl ved oprettelse af driver_emails tabel:`, tableError);
      
      // Alternativ oprettelse gennem direkte SQL
      try {
        console.log(`${LOG_PREFIXES.config} Prøver alternativ tabel oprettelse...`);
        
        const { error: directError } = await supabaseAdmin
          .from('driver_emails')
          .select('count', { head: true });
        
        if (directError?.code === 'PGRST116') {
          // Tabellen eksisterer ikke - opret den via SQL API
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            },
            body: JSON.stringify({ sql: createTableSQL })
          });
          
          if (!response.ok) {
            throw new Error(`SQL eksekution fejlede: ${response.statusText}`);
          }
        }
      } catch (altError) {
        console.error(`${LOG_PREFIXES.error} Alternativ tabel oprettelse fejlede:`, altError);
        return NextResponse.json(
          { error: 'Kunne ikke oprette driver_emails tabel' },
          { status: 500 }
        );
      }
    }
    
    // Opret Row Level Security (RLS) politikker
    console.log(`${LOG_PREFIXES.config} Opsætter sikkerhedspolitikker for driver_emails...`);
    
    const rlsSQL = `
      -- Aktivér RLS på driver_emails tabel
      ALTER TABLE public.driver_emails ENABLE ROW LEVEL SECURITY;
      
      -- Politikker for authenticated brugere
      DROP POLICY IF EXISTS "Users can view all driver emails" ON public.driver_emails;
      CREATE POLICY "Users can view all driver emails" ON public.driver_emails
        FOR SELECT USING (auth.role() = 'authenticated');
      
      DROP POLICY IF EXISTS "Users can insert driver emails" ON public.driver_emails;
      CREATE POLICY "Users can insert driver emails" ON public.driver_emails
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      
      DROP POLICY IF EXISTS "Users can update driver emails" ON public.driver_emails;
      CREATE POLICY "Users can update driver emails" ON public.driver_emails
        FOR UPDATE USING (auth.role() = 'authenticated');
      
      DROP POLICY IF EXISTS "Users can delete driver emails" ON public.driver_emails;
      CREATE POLICY "Users can delete driver emails" ON public.driver_emails
        FOR DELETE USING (auth.role() = 'authenticated');
    `;
    
    try {
      const { error: rlsError } = await supabaseAdmin.rpc('execute_sql', {
        sql: rlsSQL
      });
      
      if (rlsError) {
        console.log(`${LOG_PREFIXES.warning} RLS opsætning havde problemer:`, rlsError.message);
      } else {
        console.log(`${LOG_PREFIXES.success} RLS politikker oprettet succesfuldt`);
      }
    } catch (rlsError) {
      console.log(`${LOG_PREFIXES.warning} RLS opsætning sprunget over:`, rlsError);
    }
    
    // Test tabel adgang
    console.log(`${LOG_PREFIXES.test} Tester adgang til driver_emails tabel...`);
    
    const { error: testError } = await supabaseAdmin
      .from('driver_emails')
      .select('count', { head: true });
    
    if (testError && testError.code !== 'PGRST116') {
      console.error(`${LOG_PREFIXES.error} Test af driver_emails tabel fejlede:`, testError);
      return NextResponse.json(
        { 
          warning: 'Tabel oprettet men adgang kunne ikke verificeres',
          error: testError.message
        },
        { status: 207 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} driver_emails tabel er klar til brug`);
    
    return NextResponse.json({
      success: true,
      message: 'driver_emails tabel oprettet succesfuldt',
      table: 'driver_emails',
      features: [
        'Automatisk updated_at trigger',
        'Indeks på driver_name og email',
        'Row Level Security aktiveret',
        'UUID primær nøgle'
      ]
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl ved opsætning af driver_emails tabel:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl ved tabel opsætning' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint til at tjekke status af driver_emails tabel
 */
export async function GET() {
  console.log(`${LOG_PREFIXES.info} Tjekker status af driver_emails tabel...`);
  
  try {
    // Tjek admin rettigheder
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json(
        { error: 'Kun admin kan tjekke tabel status' },
        { status: 403 }
      );
    }
    
    // Test tabel adgang og struktur
    const { error: testError } = await supabaseAdmin
      .from('driver_emails')
      .select('count', { head: true });
    
    if (testError && testError.code === 'PGRST116') {
      return NextResponse.json({
        exists: false,
        message: 'driver_emails tabel eksisterer ikke'
      });
    }
    
    if (testError) {
      return NextResponse.json({
        exists: false,
        error: testError.message
      }, { status: 500 });
    }
    
    // Hent antal records i tabellen
    const { count } = await supabaseAdmin
      .from('driver_emails')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      exists: true,
      recordCount: count || 0,
      message: 'driver_emails tabel er tilgængelig og fungerer'
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved tjek af driver_emails tabel:`, error);
    return NextResponse.json(
      { error: 'Kunne ikke tjekke tabel status' },
      { status: 500 }
    );
  }
} 