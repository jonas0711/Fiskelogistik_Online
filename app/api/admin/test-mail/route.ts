/**
 * Test Mail API Endpoint
 * Admin-only endpoint til at teste Mailjet mail sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/libs/server-auth';
import { getMailService } from '@/libs/mail-service';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.test} Håndterer test mail request...`);
  
  return withAdminAuth(request, async (request, adminUser) => {
    console.log(`${LOG_PREFIXES.admin} Admin bruger verificeret: ${adminUser.email}`);
    
    // Hent mail service og send test mail
    const mailService = getMailService();
    const success = await mailService.sendTestMail();
    
    if (success) {
      console.log(`${LOG_PREFIXES.success} Test mail sendt succesfuldt`);
      return NextResponse.json({
        success: true,
        message: 'Test mail sendt succesfuldt'
      });
    } else {
      console.error(`${LOG_PREFIXES.error} Test mail fejlede`);
      return NextResponse.json({
        success: false,
        error: 'Test mail fejlede - tjek Mailjet konfiguration'
      }, { status: 500 });
    }
  });
} 