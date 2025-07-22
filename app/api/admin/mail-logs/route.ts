/**
 * API Endpoint: /api/admin/mail-logs
 * Admin endpoint til at hente mail logs og audit trail
 * Kun tilgængelig for admin brugere
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/libs/db';
import { validateAdminToken } from '@/libs/admin';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for mail log response
interface MailLogEntry {
  id: string;
  driver_id: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  sent_at?: string;
  created_at: string;
}

interface MailLogResponse {
  success: boolean;
  logs: MailLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    driverId?: string;
  };
}

/**
 * GET endpoint til at hente mail logs med filtrering og pagination
 * Query params: page, limit, status, dateFrom, dateTo, driverId
 */
export async function GET(request: NextRequest): Promise<NextResponse<MailLogResponse | { error: string }>> {
  console.log(`${LOG_PREFIXES.search} Håndterer GET request til mail logs API...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan se mail logs`);
      return NextResponse.json(
        { error: 'Kun admin kan se mail logs' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const driverId = searchParams.get('driverId') || undefined;
    
    console.log(`${LOG_PREFIXES.info} Henter mail logs med parametre:`, {
      page, limit, status, dateFrom, dateTo, driverId
    });
    
    // Opbyg query med filtre
    let query = supabaseAdmin
      .from('mail_log')
      .select('id, driver_id, recipient_email, subject, status, message, sent_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Anvend filtre
    if (status && ['sent', 'failed', 'pending'].includes(status)) {
      query = query.eq('status', status);
    }
    
    if (driverId) {
      query = query.ilike('driver_id', `%${driverId}%`);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      // Tilføj 1 dag til dateTo for at inkludere hele dagen
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }
    
    // Anvend pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data: logs, error: logsError, count } = await query;
    
    if (logsError) {
      console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af mail logs:`, logsError);
      return NextResponse.json(
        { error: 'Kunne ikke hente mail logs' },
        { status: 500 }
      );
    }
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    console.log(`${LOG_PREFIXES.success} ${logs?.length || 0} mail logs hentet (side ${page}/${totalPages})`);
    
    return NextResponse.json({
      success: true,
      logs: logs || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages
      },
      filters: {
        status,
        dateFrom,
        dateTo,
        driverId
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i GET mail logs:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint til at rydde gamle mail logs
 * Body: { daysToKeep: number }
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.cleanup} Håndterer DELETE request til mail logs cleanup...`);
  
  try {
    // Tjek admin rettigheder
    const authHeader = request.headers.get('authorization');
    const adminUser = await validateAdminToken(authHeader);
    
    if (!adminUser) {
      console.error(`${LOG_PREFIXES.error} Ikke autoriseret: Kun admin kan rydde mail logs`);
      return NextResponse.json(
        { error: 'Kun admin kan rydde mail logs' },
        { status: 403 }
      );
    }
    
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret for cleanup: ${adminUser.email}`);
    
    const body = await request.json();
    const { daysToKeep = 90 } = body;
    
    // Validér daysToKeep
    if (typeof daysToKeep !== 'number' || daysToKeep < 1 || daysToKeep > 365) {
      return NextResponse.json(
        { error: 'daysToKeep skal være mellem 1 og 365' },
        { status: 400 }
      );
    }
    
    // Beregn cutoff dato
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    console.log(`${LOG_PREFIXES.cleanup} Sletter mail logs ældre end ${cutoffDate.toISOString()}...`);
    
    const { error, count } = await supabaseAdmin
      .from('mail_log')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) {
      console.error(`${LOG_PREFIXES.error} Database fejl ved cleanup af mail logs:`, error);
      return NextResponse.json(
        { error: 'Kunne ikke rydde mail logs' },
        { status: 500 }
      );
    }
    
    console.log(`${LOG_PREFIXES.success} ${count || 0} gamle mail logs slettet`);
    
    return NextResponse.json({
      success: true,
      message: `${count || 0} gamle mail logs slettet`,
      deletedCount: count || 0,
      cutoffDate: cutoffDate.toISOString(),
      admin: adminUser.email
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Uventet fejl i DELETE mail logs:`, error);
    return NextResponse.json(
      { error: 'Intern server fejl under cleanup' },
      { status: 500 }
    );
  }
} 