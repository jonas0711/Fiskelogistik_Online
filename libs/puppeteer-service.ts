// libs/puppeteer-service.ts

// Importerer nødvendige moduler til HTTP requests og logging
import axios from 'axios';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

/**
 * PuppeteerService
 * Wrapper til ekstern PDF-generering via Browserless.io API
 * Matcher præcis de PDF-indstillinger, der bruges i lokal Puppeteer-implementering
 */
export class PuppeteerService {
  /**
   * Genererer PDF ud fra HTML via Browserless.io API
   * @param html HTML-indhold der skal konverteres til PDF
   * @returns Buffer med PDF-data
   */
  static async generatePDF(html: string): Promise<Buffer> {
    // Logger start på PDF-generering via service
    console.log(`${LOG_PREFIXES.form} [PuppeteerService] Starter ekstern PDF-generering via Browserless.io...`);

    // Læs API-token og endpoint fra miljøvariabler
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    const PUPPETEER_SERVICE_PROVIDER = process.env.PUPPETEER_SERVICE_PROVIDER || 'https://chrome.browserless.io';
    if (!BROWSERLESS_TOKEN) {
      console.error(`${LOG_PREFIXES.error} [PuppeteerService] BROWSERLESS_TOKEN mangler i miljøvariabler!`);
      throw new Error('BROWSERLESS_TOKEN mangler i miljøvariabler');
    }

    // Byg endpoint URL
    const endpoint = `${PUPPETEER_SERVICE_PROVIDER}/pdf?token=${BROWSERLESS_TOKEN}`;

    // PDF settings matcher præcis lokal Puppeteer
    const pdfOptions = {
      format: 'A4',
      margin: {
        top: '1.5cm',
        bottom: '1.5cm',
        left: '1.5cm',
        right: '1.5cm',
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1.0,
      width: '210mm',
      height: '297mm',
    };

    // Payload til Browserless API
    const payload = {
      html,
      options: pdfOptions,
    };

    // Retry-logik: 2 forsøg med exponential backoff (1s, 2s)
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`${LOG_PREFIXES.form} [PuppeteerService] Forsøg ${attempt}: Sender request til Browserless.io...`);
        const response = await axios.post(endpoint, payload, {
          responseType: 'arraybuffer', // For at få PDF som buffer
          timeout: 30000, // 30 sek timeout
        });
        console.log(`${LOG_PREFIXES.success} [PuppeteerService] PDF genereret via Browserless.io (${response.data.length} bytes)`);
        return Buffer.from(response.data);
      } catch (error: any) {
        lastError = error;
        // Logger fejl med detaljer
        if (error.response) {
          console.error(`${LOG_PREFIXES.error} [PuppeteerService] Fejl fra service (status ${error.response.status}):`, error.response.data);
        } else {
          console.error(`${LOG_PREFIXES.error} [PuppeteerService] Netværksfejl eller timeout:`, error.message);
        }
        // Exponential backoff
        if (attempt < 3) {
          const delay = 1000 * attempt;
          console.log(`${LOG_PREFIXES.info} [PuppeteerService] Venter ${delay}ms før nyt forsøg...`);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    // Hvis alle forsøg fejler, kast fejl videre
    console.error(`${LOG_PREFIXES.error} [PuppeteerService] Alle forsøg på ekstern PDF-generering fejlede.`);
    throw new Error(`Ekstern PDF-generering fejlede: ${lastError?.message || 'Ukendt fejl'}`);
  }
} 