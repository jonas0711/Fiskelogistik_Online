/**
 * HTML til PDF Konvertering API
 * Bruger en ekstern service til at konvertere HTML til PDF på Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIXES.form} Starter HTML til PDF konvertering...`);
  
  try {
    const { html, filename } = await request.json();
    
    if (!html) {
      console.error(`${LOG_PREFIXES.error} Ingen HTML indhold modtaget`);
      return NextResponse.json(
        { error: 'HTML indhold er påkrævet' },
        { status: 400 }
      );
    }

    // Metode 1: Prøv at bruge en gratis HTML til PDF service
    try {
      const pdfBuffer = await convertWithExternalService(html);
      console.log(`${LOG_PREFIXES.success} PDF genereret med ekstern service - ${pdfBuffer.length} bytes`);
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename || 'rapport.pdf'}"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      });
    } catch (externalError) {
      console.warn(`${LOG_PREFIXES.warning} Ekstern service fejlede, bruger fallback:`, externalError);
      
      // Metode 2: Fallback - returner HTML som Buffer
      const htmlBuffer = Buffer.from(html, 'utf-8');
      console.log(`${LOG_PREFIXES.info} Fallback til HTML format - ${htmlBuffer.length} bytes`);
      
      return new NextResponse(htmlBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${filename?.replace('.pdf', '.html') || 'rapport.html'}"`,
          'Content-Length': htmlBuffer.length.toString()
        }
      });
    }
    
  } catch (error) {
    console.error(`${LOG_PREFIXES.error} Fejl ved HTML til PDF konvertering:`, error);
    return NextResponse.json(
      { error: 'Konvertering fejlede' },
      { status: 500 }
    );
  }
}

/**
 * Konverterer HTML til PDF ved hjælp af en ekstern service
 */
async function convertWithExternalService(html: string): Promise<Buffer> {
  // Her kan du implementere forskellige eksterne PDF services
  // Eksempel med en gratis service (kræver API key)
  
  const apiUrl = process.env.PDF_SERVICE_URL || 'https://api.html2pdf.app/v1/generate';
  const apiKey = process.env.PDF_SERVICE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PDF service API key ikke konfigureret');
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      html: html,
      options: {
        format: 'A4',
        margin: {
          top: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm',
          right: '1.5cm'
        },
        printBackground: true
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`PDF service fejlede: ${response.status} ${response.statusText}`);
  }
  
  const pdfBuffer = await response.arrayBuffer();
  return Buffer.from(pdfBuffer);
} 