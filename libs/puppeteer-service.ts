// libs/puppeteer-service.ts

// Importerer nødvendige moduler til HTTP requests og logging
import axios from 'axios';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';
import { BrowserlessRateLimit } from './rate-limit-tracker';

/**
 * PuppeteerService
 * Wrapper til ekstern PDF-generering via Browserless.io API
 * Matcher præcis de PDF-indstillinger, der bruges i lokal Puppeteer-implementering
 */
export class PuppeteerService {
  /**
   * Genererer PDF ud fra HTML via Browserless.io API med intelligent rate limit håndtering
   * @param html HTML-indhold der skal konverteres til PDF
   * @returns Buffer med PDF-data
   */
  static async generatePDF(html: string): Promise<Buffer> {
    // Tjek rate limit status før request
    const canMakeRequest = BrowserlessRateLimit.canMakeRequest(1);
    const status = BrowserlessRateLimit.getStatus();
    
    if (!canMakeRequest) {
      console.error(`${LOG_PREFIXES.error} [PuppeteerService] Rate limit nået - ${status.unitsUsed}/${status.maxUnits} units brugt`);
      const daysLeft = BrowserlessRateLimit.getDaysUntilReset();
      throw new Error(`Browserless månedlige limit nået (${status.unitsUsed}/${status.maxUnits} units). Nulstilles om ${daysLeft} dage.`);
    }

    // Logger start på PDF-generering via service
    console.log(`${LOG_PREFIXES.form} [PuppeteerService] Starter ekstern PDF-generering via Browserless.io (${status.remainingUnits} units tilbage)...`);

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

    try {
      console.log(`${LOG_PREFIXES.form} [PuppeteerService] Sender request til Browserless.io...`);
      const response = await axios.post(endpoint, payload, {
        responseType: 'arraybuffer', // For at få PDF som buffer
        timeout: 45000, // Øget timeout til 45 sek for stabilitet
      });
      
      // Registrer succesfuld usage
      BrowserlessRateLimit.recordUsage(1);
      
      console.log(`${LOG_PREFIXES.success} [PuppeteerService] PDF genereret via Browserless.io (${response.data.length} bytes)`);
      return Buffer.from(response.data);
    } catch (error: any) {
      // Logger fejl med detaljer
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 429) {
          // Registrer rate limit hit
          BrowserlessRateLimit.recordRateLimitHit();
          console.error(`${LOG_PREFIXES.error} [PuppeteerService] Rate limit nået (429) - Browserless units opbrugt`);
          throw new Error('Browserless rate limit nået - vent til næste måned eller opgrader plan');
        } else {
          console.error(`${LOG_PREFIXES.error} [PuppeteerService] Fejl fra service (status ${status}):`, data);
          throw new Error(`Browserless API fejl: ${status} - ${data}`);
        }
      } else {
        console.error(`${LOG_PREFIXES.error} [PuppeteerService] Netværksfejl eller timeout:`, error.message);
        throw new Error(`Browserless netværksfejl: ${error.message}`);
      }
    }
  }

  /**
   * Henter rate limit status for eksterne kald
   */
  static getRateLimitStatus() {
    return BrowserlessRateLimit.getStatus();
  }

  /**
   * Henter anbefalet delay mellem requests
   */
  static getRecommendedDelay(): number {
    return BrowserlessRateLimit.getRecommendedDelay();
  }
} 