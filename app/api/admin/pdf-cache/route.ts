/**
 * API Endpoint: /api/admin/pdf-cache
 * Administrerer PDF cache systemet
 * GET: Henter cache statistikker
 * DELETE: Rydder cache
 * POST: Invaliderer specifik cache entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFCacheService } from '@/libs/pdf-cache';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * GET endpoint til at hente cache statistikker
 */
export async function GET(): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.search} Henter PDF cache statistikker...`);
  
  try {
    const stats = PDFCacheService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalEntries: stats.totalEntries,
        totalSizeBytes: stats.totalSizeBytes,
        totalSizeMB: (stats.totalSizeBytes / 1024 / 1024).toFixed(2),
        oldestEntry: stats.oldestEntry,
        newestEntry: stats.newestEntry
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved hentning af cache statistikker:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke hente cache statistikker'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint til at rydde hele cache
 */
export async function DELETE(): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.form} Rydder hele PDF cache...`);
  
  try {
    const statsBefore = PDFCacheService.getCacheStats();
    PDFCacheService.clearCache();
    
    console.log(`${LOG_PREFIXES.success} PDF cache ryddet - ${statsBefore.totalEntries} entries fjernet`);
    
    return NextResponse.json({
      success: true,
      message: `Cache ryddet succesfuldt`,
      cleared: {
        entries: statsBefore.totalEntries,
        sizeMB: (statsBefore.totalSizeBytes / 1024 / 1024).toFixed(2)
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved rydning af cache:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke rydde cache'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint til at invalidere specifik cache entry
 * Body: { driverName, month, year }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(`${LOG_PREFIXES.form} Invaliderer specifik PDF cache entry...`);
  
  try {
    const body = await request.json();
    const { driverName, month, year } = body;
    
    // Validér input
    if (!driverName || !month || !year) {
      return NextResponse.json(
        { 
          success: false,
          message: 'driverName, month og year er påkrævet'
        },
        { status: 400 }
      );
    }
    
    if (typeof month !== 'number' || typeof year !== 'number') {
      return NextResponse.json(
        { 
          success: false,
          message: 'month og year skal være tal'
        },
        { status: 400 }
      );
    }
    
    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Ugyldig måned eller år'
        },
        { status: 400 }
      );
    }
    
    // Invalidér cache
    PDFCacheService.invalidateCache(driverName, month, year);
    
    console.log(`${LOG_PREFIXES.success} Cache invalideret for ${driverName} ${month}/${year}`);
    
    return NextResponse.json({
      success: true,
      message: `Cache invalideret for ${driverName} ${month}/${year}`,
      invalidated: {
        driverName,
        month,
        year
      }
    });
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved invalidering af cache:`, error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Kunne ikke invalidere cache'
      },
      { status: 500 }
    );
  }
}