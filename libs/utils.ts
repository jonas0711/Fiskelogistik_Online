/**
 * Hjælpefunktioner for FSK Online Dashboard
 * Her samler vi alle små funktioner som bruges på tværs af appen
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Kombinerer CSS klasser på en smart måde
 * Dette bruges til at kombinere Tailwind klasser uden konflikter
 * @param inputs - CSS klasser at kombinere
 * @returns Kombinerede CSS klasser
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formaterer en dato til dansk format
 * @param date - Dato at formatere
 * @returns Formateret dato som string
 */
export function formatDate(date: Date | string): string {
  console.log('📅 Formaterer dato:', date);
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Tjek om datoen er gyldig
  if (isNaN(dateObj.getTime())) {
    console.error('❌ Ugyldig dato:', date);
    return 'Ugyldig dato';
  }
  
  // Formater til dansk format
  const formatted = dateObj.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  console.log('✅ Dato formateret:', formatted);
  return formatted;
}

/**
 * Formaterer en dato til kort format (kun dato)
 * @param date - Dato at formatere
 * @returns Formateret dato som string
 */
export function formatDateShort(date: Date | string): string {
  console.log('📅 Formaterer kort dato:', date);
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.error('❌ Ugyldig dato:', date);
    return 'Ugyldig dato';
  }
  
  const formatted = dateObj.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  console.log('✅ Kort dato formateret:', formatted);
  return formatted;
}

/**
 * Genererer et unikt ID
 * @returns Unikt ID som string
 */
export function generateId(): string {
  console.log('🆔 Genererer unikt ID...');
  
  // Bruger timestamp + random tal for at sikre unikhed
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const id = `${timestamp}-${random}`;
  
  console.log('✅ Unikt ID genereret:', id);
  return id;
}

/**
 * Validerer email format
 * @param email - Email at validere
 * @returns true hvis email er gyldig, false ellers
 */
export function isValidEmail(email: string): boolean {
  console.log('📧 Validerer email:', email);
  
  // Simpel email regex validering
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  console.log(`✅ Email validering: ${isValid ? 'Gyldig' : 'Ugyldig'}`);
  return isValid;
}

/**
 * Trunkerer tekst til en bestemt længde
 * @param text - Tekst at trunkere
 * @param maxLength - Maksimal længde
 * @returns Trunkeret tekst
 */
export function truncateText(text: string, maxLength: number): string {
  console.log(`✂️ Trunkerer tekst til ${maxLength} tegn...`);
  
  if (text.length <= maxLength) {
    console.log('✅ Tekst er allerede kort nok');
    return text;
  }
  
  const truncated = text.substring(0, maxLength) + '...';
  console.log('✅ Tekst trunkeret:', truncated);
  return truncated;
}

/**
 * Kapitaliserer første bogstav i en tekst
 * @param text - Tekst at kapitalisere
 * @returns Kapitaliseret tekst
 */
export function capitalize(text: string): string {
  console.log('🔤 Kapitaliserer tekst:', text);
  
  if (!text) {
    console.log('ℹ️ Tom tekst, returnerer tom string');
    return '';
  }
  
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  console.log('✅ Tekst kapitaliseret:', capitalized);
  return capitalized;
}

/**
 * Venter i et bestemt antal millisekunder
 * @param ms - Millisekunder at vente
 * @returns Promise der resolver efter ventetiden
 */
export function delay(ms: number): Promise<void> {
  console.log(`⏱️ Venter ${ms} millisekunder...`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('✅ Ventetid færdig');
      resolve();
    }, ms);
  });
}

/**
 * Tjekker om vi er i udviklingsmiljø
 * @returns true hvis i udvikling, false ellers
 */
export function isDevelopment(): boolean {
  const isDev = process.env.NODE_ENV === 'development';
  console.log(`🔧 Udviklingsmiljø: ${isDev ? 'Ja' : 'Nej'}`);
  return isDev;
}

/**
 * Logger en besked kun i udvikling
 * @param message - Besked at logge
 * @param data - Ekstra data at logge
 */
export function devLog(message: string, data?: any): void {
  if (isDevelopment()) {
    console.log(`🔍 DEV: ${message}`, data || '');
  }
}

// Eksporter alle funktioner
export default {
  cn,
  formatDate,
  formatDateShort,
  generateId,
  isValidEmail,
  truncateText,
  capitalize,
  delay,
  isDevelopment,
  devLog,
}; 