/**
 * Rate Limit Tracker for Browserless API
 * Holder styr på månedlige units og forhindrer 429 fejl
 * Baseret på Browserless gratis plan: 1000 units/måned
 */

import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for rate limit status
interface RateLimitStatus {
  unitsUsed: number;
  maxUnits: number;
  monthlyReset: Date;
  canMakeRequest: boolean;
  remainingUnits: number;
}

// In-memory tracker (i produktion ville dette være i database)
class BrowserlessRateLimitTracker {
  private unitsUsed: number = 0;
  private maxUnits: number = 1000; // Gratis plan limit
  private monthStart: Date;
  private lastResetCheck: Date;

  constructor() {
    this.monthStart = this.calculateMonthStart();
    this.lastResetCheck = new Date();
    console.log(`${LOG_PREFIXES.config} [RateLimit] Initialiserer rate limit tracker - ${this.maxUnits} units/måned`);
  }

  /**
   * Beregner start af nuværende månedlige periode
   */
  private calculateMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Tjekker om månedlig periode skal nulstilles
   */
  private checkMonthlyReset(): void {
    const now = new Date();
    const currentMonthStart = this.calculateMonthStart();
    
    if (currentMonthStart > this.monthStart) {
      console.log(`${LOG_PREFIXES.info} [RateLimit] Månedlig periode nulstillet - ${this.unitsUsed} units brugt sidste måned`);
      this.unitsUsed = 0;
      this.monthStart = currentMonthStart;
    }
    
    this.lastResetCheck = now;
  }

  /**
   * Tjekker om vi kan lave en request uden at overskride limit
   */
  canMakeRequest(unitsNeeded: number = 1): boolean {
    this.checkMonthlyReset();
    return (this.unitsUsed + unitsNeeded) <= this.maxUnits;
  }

  /**
   * Registrerer brugte units efter succesfuld request
   */
  recordUsage(unitsUsed: number = 1): void {
    this.checkMonthlyReset();
    this.unitsUsed += unitsUsed;
    
    console.log(`${LOG_PREFIXES.info} [RateLimit] ${unitsUsed} units brugt - Total: ${this.unitsUsed}/${this.maxUnits}`);
    
    // Advarsel ved høj forbrug
    const usagePercent = (this.unitsUsed / this.maxUnits) * 100;
    if (usagePercent >= 90) {
      console.log(`${LOG_PREFIXES.warning} [RateLimit] ⚠️  ${usagePercent.toFixed(1)}% af månedlige units brugt!`);
    } else if (usagePercent >= 75) {
      console.log(`${LOG_PREFIXES.warning} [RateLimit] ${usagePercent.toFixed(1)}% af månedlige units brugt`);
    }
  }

  /**
   * Registrerer rate limit hit (429 fejl)
   */
  recordRateLimitHit(): void {
    console.error(`${LOG_PREFIXES.error} [RateLimit] 🚫 Rate limit nået! ${this.unitsUsed}/${this.maxUnits} units brugt`);
    // Sæt units til max for at forhindre flere requests
    this.unitsUsed = this.maxUnits;
  }

  /**
   * Henter nuværende rate limit status
   */
  getStatus(): RateLimitStatus {
    this.checkMonthlyReset();
    
    const nextMonthStart = new Date(this.monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
    
    return {
      unitsUsed: this.unitsUsed,
      maxUnits: this.maxUnits,
      monthlyReset: nextMonthStart,
      canMakeRequest: this.unitsUsed < this.maxUnits,
      remainingUnits: Math.max(0, this.maxUnits - this.unitsUsed)
    };
  }

  /**
   * Nulstiller tracker manuelt (kun til test/admin)
   */
  reset(): void {
    console.log(`${LOG_PREFIXES.warning} [RateLimit] Manuel nulstilling - ${this.unitsUsed} units nulstillet`);
    this.unitsUsed = 0;
    this.monthStart = this.calculateMonthStart();
  }

  /**
   * Sætter max units (til test eller hvis man opgraderer plan)
   */
  setMaxUnits(maxUnits: number): void {
    console.log(`${LOG_PREFIXES.config} [RateLimit] Max units ændret fra ${this.maxUnits} til ${maxUnits}`);
    this.maxUnits = maxUnits;
  }

  /**
   * Estimerer hvor mange dage der er tilbage af måneden
   */
  getDaysUntilReset(): number {
    const now = new Date();
    const nextMonth = new Date(this.monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const msUntilReset = nextMonth.getTime() - now.getTime();
    return Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));
  }

  /**
   * Beregner anbefalet delay mellem requests baseret på forbrug
   */
  getRecommendedDelay(): number {
    const status = this.getStatus();
    const usagePercent = (status.unitsUsed / status.maxUnits) * 100;
    const daysLeft = this.getDaysUntilReset();
    
    if (usagePercent >= 90) {
      // Meget høj forbrug - store delays
      return 30000; // 30 sekunder
    } else if (usagePercent >= 75) {
      // Høj forbrug - moderate delays
      return 15000; // 15 sekunder
    } else if (usagePercent >= 50) {
      // Medium forbrug - små delays
      return 8000; // 8 sekunder
    } else {
      // Lav forbrug - minimale delays
      return 5000; // 5 sekunder
    }
  }
}

// Singleton instance
const rateLimitTracker = new BrowserlessRateLimitTracker();

// Eksporter tracker funktioner
export const BrowserlessRateLimit = {
  canMakeRequest: (unitsNeeded?: number) => rateLimitTracker.canMakeRequest(unitsNeeded),
  recordUsage: (unitsUsed?: number) => rateLimitTracker.recordUsage(unitsUsed),
  recordRateLimitHit: () => rateLimitTracker.recordRateLimitHit(),
  getStatus: () => rateLimitTracker.getStatus(),
  reset: () => rateLimitTracker.reset(),
  setMaxUnits: (maxUnits: number) => rateLimitTracker.setMaxUnits(maxUnits),
  getDaysUntilReset: () => rateLimitTracker.getDaysUntilReset(),
  getRecommendedDelay: () => rateLimitTracker.getRecommendedDelay()
};

export type { RateLimitStatus };