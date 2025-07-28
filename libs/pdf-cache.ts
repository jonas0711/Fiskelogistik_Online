/**
 * PDF Cache Service
 * Cacheer genererede PDF rapporter for at reducere Browserless API requests
 * Bruger in-memory cache med TTL (Time To Live)
 */

import crypto from 'crypto';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for cache entry
interface PDFCacheEntry {
  buffer: Buffer;
  generatedAt: number;
  ttl: number; // Time to live i millisekunder
  hash: string;
  driverName: string;
  period: string;
}

// Cache storage - in-memory med Map
const pdfCache = new Map<string, PDFCacheEntry>();

// Cache konfiguration
const CACHE_CONFIG = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 timer i millisekunder
  MAX_CACHE_SIZE: 100, // Maksimum antal cache entries
  CLEANUP_INTERVAL: 60 * 60 * 1000, // Cleanup hver time
};

/**
 * PDF Cache Service Class
 */
export class PDFCacheService {
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialiserer cache med automatisk cleanup
   */
  static initialize(): void {
    console.log(`${LOG_PREFIXES.config} [PDFCache] Initialiserer PDF cache system...`);
    
    // Start automatisk cleanup timer
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredEntries();
      }, CACHE_CONFIG.CLEANUP_INTERVAL);
      
      console.log(`${LOG_PREFIXES.success} [PDFCache] Cache cleanup timer startet (${CACHE_CONFIG.CLEANUP_INTERVAL / 1000}s interval)`);
    }
  }

  /**
   * Genererer cache nøgle baseret på rapport parametre
   */
  private static generateCacheKey(
    driverName: string,
    month: number,
    year: number,
    reportType: string = 'individuel'
  ): string {
    const keyData = `${driverName}_${month}_${year}_${reportType}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  /**
   * Genererer hash af data for validering
   */
  private static generateDataHash(
    driverName: string,
    month: number,
    year: number,
    dataHash?: string
  ): string {
    const hashData = `${driverName}_${month}_${year}_${dataHash || 'nodata'}`;
    return crypto.createHash('sha256').update(hashData).digest('hex');
  }

  /**
   * Tjekker om PDF er cached og stadig gyldig
   */
  static getCachedPDF(
    driverName: string,
    month: number,
    year: number,
    dataHash?: string
  ): Buffer | null {
    const cacheKey = this.generateCacheKey(driverName, month, year);
    const entry = pdfCache.get(cacheKey);
    
    if (!entry) {
      console.log(`${LOG_PREFIXES.search} [PDFCache] Ingen cache fundet for ${driverName} ${month}/${year}`);
      return null;
    }
    
    // Tjek TTL
    const now = Date.now();
    if (now > entry.generatedAt + entry.ttl) {
      console.log(`${LOG_PREFIXES.warning} [PDFCache] Cache udløbet for ${driverName} ${month}/${year} - sletter`);
      pdfCache.delete(cacheKey);
      return null;
    }
    
    // Tjek data integritet hvis hash er givet
    if (dataHash) {
      const expectedHash = this.generateDataHash(driverName, month, year, dataHash);
      if (entry.hash !== expectedHash) {
        console.log(`${LOG_PREFIXES.warning} [PDFCache] Data ændret for ${driverName} ${month}/${year} - invaliderer cache`);
        pdfCache.delete(cacheKey);
        return null;
      }
    }
    
    console.log(`${LOG_PREFIXES.found} [PDFCache] Cache hit for ${driverName} ${month}/${year} - ${entry.buffer.length} bytes`);
    return entry.buffer;
  }

  /**
   * Cacheer genereret PDF
   */
  static cachePDF(
    driverName: string,
    month: number,
    year: number,
    pdfBuffer: Buffer,
    dataHash?: string,
    customTTL?: number
  ): void {
    const cacheKey = this.generateCacheKey(driverName, month, year);
    const ttl = customTTL || CACHE_CONFIG.DEFAULT_TTL;
    const hash = this.generateDataHash(driverName, month, year, dataHash);
    
    // Tjek cache størrelse og ryd op hvis nødvendigt
    if (pdfCache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      console.log(`${LOG_PREFIXES.warning} [PDFCache] Cache fuld (${pdfCache.size} entries) - rydder ældste`);
      this.cleanupOldestEntries(10); // Fjern 10 ældste entries
    }
    
    const entry: PDFCacheEntry = {
      buffer: pdfBuffer,
      generatedAt: Date.now(),
      ttl,
      hash,
      driverName,
      period: `${month}/${year}`
    };
    
    pdfCache.set(cacheKey, entry);
    
    console.log(`${LOG_PREFIXES.success} [PDFCache] PDF cached for ${driverName} ${month}/${year} - ${pdfBuffer.length} bytes (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Invaliderer cache for specifik chauffør og periode
   */
  static invalidateCache(driverName: string, month: number, year: number): void {
    const cacheKey = this.generateCacheKey(driverName, month, year);
    const deleted = pdfCache.delete(cacheKey);
    
    if (deleted) {
      console.log(`${LOG_PREFIXES.success} [PDFCache] Cache invalideret for ${driverName} ${month}/${year}`);
    } else {
      console.log(`${LOG_PREFIXES.info} [PDFCache] Ingen cache at invalidere for ${driverName} ${month}/${year}`);
    }
  }

  /**
   * Rydder udløbne cache entries
   */
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of pdfCache.entries()) {
      if (now > entry.generatedAt + entry.ttl) {
        pdfCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`${LOG_PREFIXES.success} [PDFCache] Ryddet ${cleanedCount} udløbne cache entries`);
    }
  }

  /**
   * Rydder ældste cache entries
   */
  private static cleanupOldestEntries(count: number): void {
    const entries = Array.from(pdfCache.entries())
      .sort(([, a], [, b]) => a.generatedAt - b.generatedAt)
      .slice(0, count);
    
    entries.forEach(([key]) => {
      pdfCache.delete(key);
    });
    
    console.log(`${LOG_PREFIXES.success} [PDFCache] Fjernet ${entries.length} ældste cache entries`);
  }

  /**
   * Returnerer cache statistikker
   */
  static getCacheStats(): {
    totalEntries: number;
    totalSizeBytes: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const entries = Array.from(pdfCache.values());
    const totalSizeBytes = entries.reduce((sum, entry) => sum + entry.buffer.length, 0);
    
    let oldestEntry: string | undefined;
    let newestEntry: string | undefined;
    
    if (entries.length > 0) {
      const sorted = entries.sort((a, b) => a.generatedAt - b.generatedAt);
      oldestEntry = `${sorted[0].driverName} ${sorted[0].period}`;
      newestEntry = `${sorted[sorted.length - 1].driverName} ${sorted[sorted.length - 1].period}`;
    }
    
    return {
      totalEntries: pdfCache.size,
      totalSizeBytes,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Rydder hele cache
   */
  static clearCache(): void {
    const size = pdfCache.size;
    pdfCache.clear();
    console.log(`${LOG_PREFIXES.success} [PDFCache] Hele cache ryddet (${size} entries fjernet)`);
  }

  /**
   * Stopper cache service og cleanup timer
   */
  static shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log(`${LOG_PREFIXES.info} [PDFCache] Cache cleanup timer stoppet`);
    }
    
    this.clearCache();
  }
}

// Initialiser cache når modulet indlæses
PDFCacheService.initialize();

// Eksporter singleton funktioner
export const {
  getCachedPDF,
  cachePDF,
  invalidateCache,
  getCacheStats,
  clearCache
} = PDFCacheService;