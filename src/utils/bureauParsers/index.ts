/**
 * Bureau Response Parsers - Main Export
 * 
 * Provides a unified interface for parsing credit report responses from all four bureaus.
 * Each bureau has its own parser that handles format-specific transformations.
 */

import { UnifiedCreditReport } from '@/types/creditReport';
import { BureauParserContext, ParsedBureauResult, BureauType } from './types';

// Import individual parsers
import { isCibilResponse, parseCibilResponse } from './cibilParser';
import { isExperianResponse, parseExperianResponse } from './experianParser';
import { isEquifaxResponse, parseEquifaxResponse } from './equifaxParser';
import { isCrifResponse, parseCrifResponse } from './crifParser';

// Re-export types
export * from './types';
export * from './helpers';

// Re-export individual parsers for direct access
export { isCibilResponse, parseCibilResponse } from './cibilParser';
export { isExperianResponse, parseExperianResponse } from './experianParser';
export { isEquifaxResponse, parseEquifaxResponse } from './equifaxParser';
export { isCrifResponse, parseCrifResponse } from './crifParser';

/**
 * Auto-detect bureau format and parse response
 */
export function detectBureauFormat(rawData: any): BureauType | null {
  if (isCibilResponse(rawData)) return 'cibil';
  if (isExperianResponse(rawData)) return 'experian';
  if (isEquifaxResponse(rawData)) return 'equifax';
  if (isCrifResponse(rawData)) return 'crif';
  return null;
}

/**
 * Parse bureau response using specified parser or auto-detect
 */
export function parseBureauResponse(
  rawData: any,
  context: BureauParserContext,
  bureauHint?: BureauType
): ParsedBureauResult {
  // Determine bureau type
  const bureauType = bureauHint || detectBureauFormat(rawData);
  
  if (!bureauType) {
    console.warn('Could not detect bureau format, attempting generic parse');
    // Try each parser in order
    const parsers = [
      { name: 'crif' as BureauType, parser: parseCrifResponse },
      { name: 'cibil' as BureauType, parser: parseCibilResponse },
      { name: 'experian' as BureauType, parser: parseExperianResponse },
      { name: 'equifax' as BureauType, parser: parseEquifaxResponse },
    ];
    
    for (const { name, parser } of parsers) {
      try {
        const result = parser(rawData, context);
        if (result.success && result.unifiedReport) {
          console.log(`Successfully parsed using ${name} parser`);
          return result;
        }
      } catch (e) {
        // Try next parser
      }
    }
    
    return {
      success: false,
      unifiedReport: null,
      rawData,
      error: 'Could not parse response with any bureau format',
      bureauName: 'Unknown',
    };
  }
  
  // Use specified parser
  switch (bureauType) {
    case 'cibil':
      return parseCibilResponse(rawData, context);
    case 'experian':
      return parseExperianResponse(rawData, context);
    case 'equifax':
      return parseEquifaxResponse(rawData, context);
    case 'crif':
      return parseCrifResponse(rawData, context);
    default:
      return {
        success: false,
        unifiedReport: null,
        rawData,
        error: `Unknown bureau type: ${bureauType}`,
        bureauName: 'Unknown',
      };
  }
}

/**
 * Parse response for a specific bureau by name
 */
export function parseByBureauName(
  bureauName: string,
  rawData: any,
  context: BureauParserContext
): ParsedBureauResult {
  const normalizedName = bureauName.toLowerCase().trim();
  
  let bureauType: BureauType | undefined;
  
  if (normalizedName.includes('cibil')) {
    bureauType = 'cibil';
  } else if (normalizedName.includes('experian')) {
    bureauType = 'experian';
  } else if (normalizedName.includes('equifax')) {
    bureauType = 'equifax';
  } else if (normalizedName.includes('crif') || normalizedName.includes('high mark')) {
    bureauType = 'crif';
  }
  
  return parseBureauResponse(rawData, context, bureauType);
}

/**
 * Create an empty/fallback unified report when parsing fails
 */
export function createFallbackReport(
  context: BureauParserContext,
  bureauName: string,
  score?: number | null
): UnifiedCreditReport {
  return {
    header: {
      bureau_name: bureauName,
      control_number: `FB-${Date.now().toString(36).toUpperCase()}`,
      report_date: new Date().toISOString().slice(0, 10),
      credit_score: score ?? null,
    },
    personal_information: {
      full_name: context.fullName.toUpperCase(),
      date_of_birth: context.dateOfBirth || '---',
      gender: context.gender || 'Not Reported',
      identifications: [{
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: context.panNumber || 'Not Reported',
        issue_date: null,
        expiration_date: null,
      }],
    },
    contact_information: {
      addresses: [],
      phone_numbers: context.mobileNumber ? [{ type: 'Mobile', number: context.mobileNumber }] : [],
      email_addresses: [],
    },
    employment_information: [],
    accounts: [],
    enquiries: [],
    summary: {
      total_accounts: 0,
      active_accounts: 0,
      closed_accounts: 0,
      total_overdue_amount: 0,
      total_sanctioned_amount: 0,
      total_current_balance: 0,
    },
  };
}

/**
 * Validate unified report structure
 */
export function validateUnifiedReport(report: UnifiedCreditReport): boolean {
  try {
    // Check required sections exist
    if (!report.header || !report.personal_information || !report.contact_information) {
      return false;
    }
    
    // Check header fields
    if (!report.header.bureau_name || !report.header.control_number) {
      return false;
    }
    
    // Check personal info
    if (!report.personal_information.full_name) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
