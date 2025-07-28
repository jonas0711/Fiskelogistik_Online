/**
 * Mail Provider Status API Endpoint
 * Admin-only endpoint til at hente mail provider konfiguration status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/libs/server-auth';
import { getMailService } from '@/libs/mail-service';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.search} Håndterer mail provider status request...`);
  
  return withAdminAuth(request, async (request, adminUser) => {
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    // Hent mail service og få konfiguration status
    const mailService = getMailService();
    const configStatus = await mailService.getConfigStatus();
    const provider = await mailService.getMailProvider();
    
    console.log(`${LOG_PREFIXES.success} Mail provider status hentet: ${provider}, configured: ${configStatus.configured}`);
    
    return NextResponse.json({
      success: true,
      provider,
      status: configStatus
    });
  });
}