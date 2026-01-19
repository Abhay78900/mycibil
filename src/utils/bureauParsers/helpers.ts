/**
 * Common Helper Functions for Bureau Parsers
 */

/**
 * Normalize date string to YYYY-MM-DD format
 */
export function normalizeDate(input?: string | null): string {
  if (!input) return '---';

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10);

  // DD-MM-YYYY format
  const dmyMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;

  // DD/MM/YYYY format
  const slashMatch = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;

  // YYYYMMDD format
  const compactMatch = input.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  // DDMMYYYY format
  const compactDmy = input.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactDmy) return `${compactDmy[3]}-${compactDmy[2]}-${compactDmy[1]}`;

  return input;
}

/**
 * Safely convert input to number
 */
export function toNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).trim();
  if (!s || s === '-' || s === '---' || s.toLowerCase() === 'na' || s.toLowerCase() === 'n/a') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Ensure value is an array
 */
export function ensureArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return [val as T];
  return [];
}

/**
 * Safe string extraction with fallback
 */
export function safeString(value: any, fallback: string = 'Not Reported'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const str = String(value).trim();
  return str || fallback;
}

/**
 * Format currency amount for display
 */
export function formatAmount(value: any): string {
  const num = toNumber(value);
  if (num === null) return '-';
  return num.toLocaleString('en-IN');
}

/**
 * Parse payment history string into structured format
 * Common formats: "000000000XXX111222" (36 months, each char = DPD bucket)
 */
export function parsePaymentHistoryString(historyString?: string, startDate?: string, endDate?: string): any[] {
  if (!historyString || typeof historyString !== 'string') return [];
  
  // Each character represents a month's payment status
  // 0 = On time, 1-9 = DPD buckets, X = Not reported, etc.
  const dpdMapping: Record<string, string> = {
    '0': 'STD',
    '1': '001-030',
    '2': '031-060',
    '3': '061-090',
    '4': '091-120',
    '5': '121-150',
    '6': '151-180',
    '7': '181+',
    '8': 'SETTLED',
    '9': 'WRITTEN OFF',
    'X': 'XXX',
    '*': 'XXX',
    '+': 'SUB',
    '-': 'NOT REPORTED',
  };

  // For now, return empty - detailed implementation would need month mapping
  return [];
}

/**
 * Map account type codes to readable labels
 */
export function mapAccountType(code?: string): string {
  if (!code) return 'Not Reported';
  
  const mapping: Record<string, string> = {
    // Common codes
    'HL': 'Housing Loan',
    'PL': 'Personal Loan',
    'AL': 'Auto Loan',
    'GL': 'Gold Loan',
    'BL': 'Business Loan',
    'CC': 'Credit Card',
    'OD': 'Overdraft',
    'TL': 'Two-wheeler Loan',
    'CF': 'Consumer Finance',
    'LAP': 'Loan Against Property',
    'EL': 'Education Loan',
    'CV': 'Commercial Vehicle Loan',
    // CRIF specific
    'Home Loan': 'Housing Loan',
    'Personal': 'Personal Loan',
    'Auto': 'Auto Loan (Personal)',
    '2W': 'Two-wheeler Loan',
    // Full names
    'Housing Loan': 'Housing Loan',
    'Personal Loan': 'Personal Loan',
    'Auto Loan': 'Auto Loan',
    'Credit Card': 'Credit Card',
    'Consumer Loan': 'Consumer Loan',
    'Property Loan': 'Loan Against Property',
  };

  return mapping[code.toUpperCase()] || mapping[code] || code;
}

/**
 * Map ownership type codes to readable labels
 */
export function mapOwnership(code?: string): string {
  if (!code) return 'Not Reported';
  
  const mapping: Record<string, string> = {
    'I': 'Individual',
    'J': 'Joint',
    'A': 'Authorised User',
    'G': 'Guarantor',
    'Individual': 'Individual',
    'Joint': 'Joint',
    'Guarantor': 'Guarantor',
  };

  return mapping[code] || code;
}

/**
 * Generate control number if not provided
 */
export function generateControlNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CR-${timestamp}-${random}`;
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().slice(0, 10);
}
