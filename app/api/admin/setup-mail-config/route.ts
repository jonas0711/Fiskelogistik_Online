/**
 * API Endpoint: /api/admin/setup-mail-config
 * Admin endpoint til at oprette mail_config tabel i databasen
 * Baseret på Python-applikationens mail system struktur
 * Kun tilgængelig for admin brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/libs/db';
import { validateAdminToken } from '@/libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * POST endpoint til at oprette mail_config tabel
 * Opretter tabellen med samme struktur som Python applikationen
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.config} Håndterer POST request til setup mail_config tabel...`);
  
  try {
    // Tjek admin rettigheder via Authorization header
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan oprette mail tabeller`);
      return NextResponse.json(
        { error: 'Kun admin kan oprette mail tabeller' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email} - fortsætter med tabel oprettelse...`);
    
    // Opret mail_config tabel - identisk struktur med Python applikation
    console.log(`${LOG_PREFIXES.config} Opretter mail_config tabel med SMTP konfiguration...`);
    
    const createMailConfigSQL = `
      -- Opret mail_config tabel med samme struktur som Python applikation
      CREATE TABLE IF NOT EXISTS public.mail_config (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        smtp_server text NOT NULL,
        smtp_port integer NOT NULL DEFAULT 587,
        email text NOT NULL,
        password text NOT NULL,
        test_email text,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      -- Kun én konfiguration ad gangen - tvungen SINGLE ROW
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_config_single ON public.mail_config((1));
      
      -- Opret automatisk updated_at trigger
      CREATE OR REPLACE FUNCTION update_mail_config_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_mail_config_updated_at ON public.mail_config;
      CREATE TRIGGER update_mail_config_updated_at
        BEFORE UPDATE ON public.mail_config
        FOR EACH ROW
        EXECUTE FUNCTION update_mail_config_updated_at();
      
      -- Opret RLS policies (Row Level Security)
      ALTER TABLE public.mail_config ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Kun admin kan se mail konfiguration
      DROP POLICY IF EXISTS "Admin can view mail config" ON public.mail_config;
      CREATE POLICY "Admin can view mail config" ON public.mail_config
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.app_metadata->>'is_admin' = 'true'
              OR 'admin' = ANY(string_to_array(auth.users.app_metadata->>'roles', ','))
            )
          )
        );
      
      -- Policy: Kun admin kan opdatere mail konfiguration
      DROP POLICY IF EXISTS "Admin can update mail config" ON public.mail_config;
      CREATE POLICY "Admin can update mail config" ON public.mail_config
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.app_metadata->>'is_admin' = 'true'
              OR 'admin' = ANY(string_to_array(auth.users.app_metadata->>'roles', ','))
            )
          )
        );
      
      -- Opret mail_log tabel til audit trail - identisk med Python
      CREATE TABLE IF NOT EXISTS public.mail_log (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id text NOT NULL,
        recipient_email text NOT NULL,
        subject text NOT NULL,
        status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
        message text,
        sent_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      -- Indeks for hurtigere søgning i mail log
      CREATE INDEX IF NOT EXISTS idx_mail_log_driver_id ON public.mail_log(driver_id);
      CREATE INDEX IF NOT EXISTS idx_mail_log_status ON public.mail_log(status);
      CREATE INDEX IF NOT EXISTS idx_mail_log_sent_at ON public.mail_log(sent_at);
      
      -- RLS for mail_log
      ALTER TABLE public.mail_log ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Admin can view mail log" ON public.mail_log;
      CREATE POLICY "Admin can view mail log" ON public.mail_log
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.app_metadata->>'is_admin' = 'true'
              OR 'admin' = ANY(string_to_array(auth.users.app_metadata->>'roles', ','))
            )
          )
        );
      
      DROP POLICY IF EXISTS "Admin can insert mail log" ON public.mail_log;
      CREATE POLICY "Admin can insert mail log" ON public.mail_log
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.app_metadata->>'is_admin' = 'true'
              OR 'admin' = ANY(string_to_array(auth.users.app_metadata->>'roles', ','))
            )
          )
        );
    `;
    
    // Udfør SQL kommandoer med exception handling
    const { error: sqlError } = await supabaseAdmin.rpc('execute_sql', {
      sql: createMailConfigSQL
    });
    
    // Hvis execute_sql ikke findes, prøv direkte SQL execution
    if (sqlError && sqlError.message.includes('function execute_sql')) {
      console.log(`${LOG_PREFIXES.warning} execute_sql function ikke tilgængelig, udfører direkte SQL...`);
      
      // Opdel SQL i mindre chunks for direkte udførelse
      const sqlCommands = createMailConfigSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);
      
      for (const command of sqlCommands) {
        if (command.toLowerCase().includes('create table') || 
            command.toLowerCase().includes('create index') ||
            command.toLowerCase().includes('create trigger') ||
            command.toLowerCase().includes('create function') ||
            command.toLowerCase().includes('create policy') ||
            command.toLowerCase().includes('alter table') ||
            command.toLowerCase().includes('drop')) {
          
          console.log(`${LOG_PREFIXES.config} Udfører SQL kommando: ${command.substring(0, 50)}...`);
          
          try {
            const { error: cmdError } = await supabaseAdmin.rpc('execute_sql', { sql: command });
            if (cmdError) {
              console.log(`${LOG_PREFIXES.warning} SQL kommando fejl (ignoreret): ${cmdError.message}`);
            }
          } catch (e) {
            console.log(`${LOG_PREFIXES.warning} SQL kommando exception (ignoreret):`, e);
          }
        }
      }
    } else if (sqlError) {
      console.error(`${LOG_PREFIXES.error} SQL udførelse fejlede:`, sqlError);
      return NextResponse.json(
        { 
          error: 'Kunne ikke oprette mail tabeller',
          details: sqlError.message
        },
        { status: 500 }
      );
    }
    
    // Verificer at tabellerne blev oprettet korrekt
    console.log(`${LOG_PREFIXES.search} Verificerer oprettelse af mail_config tabel...`);
    
    const { error: configCheckError } = await supabaseAdmin
      .from('mail_config')
      .select('id')
      .limit(1);
    
    if (configCheckError) {
      console.error(`${LOG_PREFIXES.error} Mail config tabel ikke tilgængelig:`, configCheckError);
      return NextResponse.json(
        { 
          error: 'Mail config tabel oprettelse fejlede',
          details: configCheckError.message
        },
        { status: 500 }
      );
    }
    
    const { error: logCheckError } = await supabaseAdmin
      .from('mail_log')
      .select('id')
      .limit(1);
    
    if (logCheckError) {
      console.error(`${LOG_PREFIXES.error} Mail log tabel ikke tilgængelig:`, logCheckError);
      return NextResponse.json(
        { 
          error: 'Mail log tabel oprettelse fejlede',
          details: logCheckError.message
        },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} Mail system tabeller oprettet succesfuldt!`);
    
    return NextResponse.json({
      success: true,
      message: 'Mail system tabeller oprettet succesfuldt',
      tables: {
        mail_config: 'Oprettet med SMTP konfiguration',
        mail_log: 'Oprettet med audit trail'
      },
      admin: adminUser.email
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl under mail tabel setup:`, error);
    return NextResponse.json(
      { 
        error: 'Intern server fejl under mail tabel setup',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
} 