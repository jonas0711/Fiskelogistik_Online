/**
 * API Endpoint: /api/admin/rate-limit
 * Administrerer Browserless rate limit tracking
 * GET: Henter rate limit status
 * POST: Nulstiller rate limit tracker (admin only)
 * PUT: Opdaterer max units (ved plan opgradering)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BrowserlessRateLimit } from '@/libs/rate-limit-tracker';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET endpoint til at hente rate limit status
 */
export async function GET(): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.search} Henter Browserless rate limit status...`);
  
  try {
    const status = BrowserlessRateLimit.getStatus();
    const recommendedDelay = BrowserlessRateLimit.getRecommendedDelay();
    const daysUntilReset = BrowserlessRateLimit.getDaysUntilReset();
    
    return NextResponse.json({
      success: true,
      status: {
        unitsUsed: status.unitsUsed,
        maxUnits: status.maxUnits,
        remainingUnits: status.remainingUnits,
        canMakeRequest: status.canMakeRequest,
        usagePercent: ((status.unitsUsed / status.maxUnits) * 100).toFixed(1) + '%',
        monthlyReset: status.monthlyReset,
        daysUntilReset,
        recommendedDelayMs: recommendedDelay,
        recommendedDelaySec: (recommendedDelay / 1000).toFixed(1)
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved hentning af rate limit status:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke hente rate limit status'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint til at nulstille rate limit tracker
 * Body: { action: 'reset' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.form} Admin rate limit operation...`);
  
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'reset') {
      const beforeStatus = BrowserlessRateLimit.getStatus();
      BrowserlessRateLimit.reset();
      
      console.log(`${LOG_PREFIXES.success} Rate limit tracker nulstillet - ${beforeStatus.unitsUsed} units ryddet`);
      
      return NextResponse.json({
        success: true,
        message: 'Rate limit tracker nulstillet succesfuldt',
        resetInfo: {
          previousUnitsUsed: beforeStatus.unitsUsed,
          maxUnits: beforeStatus.maxUnits
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig action - understøttede actions: "reset"'
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved rate limit operation:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke udføre rate limit operation'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint til at opdatere max units (ved plan opgradering)
 * Body: { maxUnits: number }
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.form} Opdaterer Browserless max units...`);
  
  try {
    const body = await request.json();
    const { maxUnits } = body;
    
    // Validér input
    if (!maxUnits || typeof maxUnits !== 'number' || maxUnits < 100) {
      return NextResponse.json(
        { 
          success: false,
          message: 'maxUnits skal være et tal ≥ 100'
        },
        { status: 400 }
      );
    }
    
    const beforeStatus = BrowserlessRateLimit.getStatus();
    BrowserlessRateLimit.setMaxUnits(maxUnits);
    const afterStatus = BrowserlessRateLimit.getStatus();
    
    console.log(`${LOG_PREFIXES.success} Max units opdateret fra ${beforeStatus.maxUnits} til ${maxUnits}`);
    
    return NextResponse.json({
      success: true,
      message: `Max units opdateret til ${maxUnits}`,
      update: {
        previousMaxUnits: beforeStatus.maxUnits,
        newMaxUnits: maxUnits,
        currentUnitsUsed: afterStatus.unitsUsed,
        newRemainingUnits: afterStatus.remainingUnits
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved opdatering af max units:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke opdatere max units'
      },
      { status: 500 }
    );
  }
}