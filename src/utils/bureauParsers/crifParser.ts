/**
 * CRIF Response Format Handler
 * 
 * Parses CRIF High Mark-specific JSON responses and maps them to the unified credit report format.
 * CRIF uses the IDSpay format with hyphenated field names.
 */

import { UnifiedCreditReport } from '@/types/creditReport';
import { CrifRawResponse, BureauParserContext, ParsedBureauResult } from './types';
import {
  normalizeDate,
  toNumber,
  ensureArray,
  safeString,
  mapAccountType,
  mapOwnership,
  generateControlNumber,
  getCurrentDate,
} from './helpers';

/**
 * Check if response matches CRIF/IDSpay format
 */
export function isCrifResponse(rawData: any): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  
  // Check for standard CRIF IDSpay structure
  if (rawData.data?.credit_report?.HEADER) return true;
  if (rawData.data?.credit_report?.['PERSONAL-INFO-VARIATION']) return true;
  
  // Check for credit_score at data level (IDSpay specific)
  if (rawData.data?.credit_score !== undefined) return true;
  
  // Check for RESPONSES section (loan details)
  if (rawData.data?.credit_report?.RESPONSES) return true;
  
  return false;
}

/**
 * Parse CRIF response to unified format
 */
export function parseCrifResponse(
  rawData: CrifRawResponse,
  context: BureauParserContext
): ParsedBureauResult {
  try {
    const data = rawData?.data ?? {};
    const creditReport = data?.credit_report ?? {};
    const header = creditReport?.HEADER ?? {};
    
    // Extract credit score - IDSpay provides it at data level
    const creditScore = toNumber(data?.credit_score) ?? toNumber(data?.creditScore) ?? null;
    
    // Personal Information
    const fullName = [
      safeString(data?.first_name, ''),
      safeString(data?.last_name, ''),
    ].filter(Boolean).join(' ') || context.fullName || 'Not Reported';
    
    // Date of Birth from variations
    const dobVariations = creditReport?.['PERSONAL-INFO-VARIATION']?.['DATE-OF-BIRTH-VARIATIONS']?.VARIATION;
    const dobArray = ensureArray<any>(dobVariations);
    const dateOfBirth = context.dateOfBirth || normalizeDate(dobArray[0]?.VALUE) || '---';
    
    // Identifications
    const identifications = [{
      type: 'INCOME TAX ID NUMBER (PAN)',
      number: safeString(data?.pan, context.panNumber || 'Not Reported'),
      issue_date: null,
      expiration_date: null,
    }];
    
    // Address Variations
    const addressVariations = creditReport?.['PERSONAL-INFO-VARIATION']?.['ADDRESS-VARIATIONS']?.VARIATION;
    const addressArray = ensureArray<any>(addressVariations);
    const addresses = addressArray.map(v => ({
      address: safeString(v?.VALUE, 'Not Reported'),
      category: 'Not Reported',
      status: 'Not Reported',
      date_reported: normalizeDate(v?.['REPORTED-DATE']),
    }));
    
    // Phone Number Variations
    const phoneVariations = creditReport?.['PERSONAL-INFO-VARIATION']?.['PHONE-NUMBER-VARIATIONS']?.VARIATION;
    const phoneArray = ensureArray<any>(phoneVariations);
    const phone_numbers = [
      // Add context mobile first
      ...(context.mobileNumber ? [{ type: 'Mobile', number: context.mobileNumber }] : []),
      // Add mobile from data
      ...(data?.mobile ? [{ type: 'Mobile', number: String(data.mobile) }] : []),
      // Add variations
      ...phoneArray.map(v => ({
        type: 'Phone',
        number: safeString(v?.VALUE),
      })),
    ].filter((v, i, arr) => 
      // Remove duplicates
      arr.findIndex(x => x.number === v.number) === i
    );
    
    // Email Variations
    const emailVariations = creditReport?.['PERSONAL-INFO-VARIATION']?.['EMAIL-VARIATIONS']?.VARIATION;
    const emailArray = ensureArray<any>(emailVariations);
    const email_addresses = emailArray
      .map(v => safeString(v?.VALUE))
      .filter(e => e !== 'Not Reported');
    
    // Employment Details
    const empDetail = creditReport?.['EMPLOYMENT-DETAILS']?.['EMPLOYMENT-DETAIL'];
    const employment_information = empDetail ? [{
      account_type: safeString(empDetail?.['ACCT-TYPE']),
      date_reported: normalizeDate(empDetail?.['DATE-REPORTED']),
      occupation: safeString(empDetail?.OCCUPATION),
      income: safeString(empDetail?.INCOME),
      frequency: safeString(empDetail?.['INCOME-FREQUENCY']),
      income_indicator: safeString(empDetail?.['INCOME-INDICATOR']),
    }] : [];
    
    // Loan Accounts from RESPONSES
    const responses = ensureArray<any>(creditReport?.RESPONSES?.RESPONSE);
    const accounts = responses
      .map(r => r?.['LOAN-DETAILS'])
      .filter(Boolean)
      .map((ld: any) => {
        const dateReported = normalizeDate(ld?.['DATE-REPORTED']) || '---';
        
        return {
          member_name: safeString(ld?.['CREDIT-GUARANTOR']),
          account_type: mapAccountType(ld?.['ACCT-TYPE']),
          account_number: safeString(ld?.['ACCT-NUMBER'], '---'),
          ownership: mapOwnership(ld?.['OWNERSHIP-IND']),
          credit_limit: '-',
          sanctioned_amount: safeString(ld?.['DISBURSED-AMT'], '-'),
          current_balance: safeString(ld?.['CURRENT-BAL'], '-'),
          cash_limit: '-',
          amount_overdue: safeString(ld?.['OVERDUE-AMT'], '0'),
          rate_of_interest: safeString(ld?.['INTEREST-RATE'], '-'),
          repayment_tenure: safeString(ld?.['REPAYMENT-TENURE'], '-'),
          emi_amount: '-',
          payment_frequency: 'Monthly',
          actual_payment_amount: safeString(ld?.['ACTUAL-PAYMENT'], '-'),
          dates: {
            date_opened: normalizeDate(ld?.['DISBURSED-DT']) || '-',
            date_closed: ld?.['CLOSED-DATE'] ? normalizeDate(ld?.['CLOSED-DATE']) : null,
            date_of_last_payment: ld?.['LAST-PAYMENT-DATE'] ? normalizeDate(ld?.['LAST-PAYMENT-DATE']) : null,
            date_reported: dateReported,
          },
          payment_start_date: normalizeDate(ld?.['DISBURSED-DT']) || '-',
          payment_end_date: dateReported,
          payment_history: [], // Would need detailed DPD parsing
          collateral: {
            value: '-',
            type: '-',
            suit_filed: '-',
            credit_facility_status: safeString(ld?.['ACCOUNT-STATUS'], '-'),
            written_off_total: safeString(ld?.['WRITE-OFF-AMT'], '-'),
            written_off_principal: safeString(ld?.['PRINCIPAL-WRITE-OFF-AMT'], '-'),
            settlement_amount: safeString(ld?.['SETTLEMENT-AMT'], '-'),
          },
        };
      });
    
    // Enquiries from INQUIRY-HISTORY
    const inquiryHistory = creditReport?.['INQUIRY-HISTORY']?.HISTORY;
    const enquiriesArray = ensureArray<any>(inquiryHistory);
    const enquiries = enquiriesArray
      .filter(Boolean)
      .map(e => ({
        member_name: safeString(e?.['MEMBER-NAME']),
        date_of_enquiry: normalizeDate(e?.['INQUIRY-DATE']),
        enquiry_purpose: safeString(e?.PURPOSE),
      }));
    
    // Summary from ACCOUNTS-SUMMARY
    const primarySummary = creditReport?.['ACCOUNTS-SUMMARY']?.['PRIMARY-ACCOUNTS-SUMMARY'] ?? {};
    const total_accounts = toNumber(primarySummary?.['PRIMARY-NUMBER-OF-ACCOUNTS']) ?? accounts.length;
    const active_accounts = toNumber(primarySummary?.['PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS']) ?? 
      accounts.filter(a => !a.dates.date_closed).length;
    const closed_accounts = toNumber(primarySummary?.['PRIMARY-CLOSED-NUMBER-OF-ACCOUNTS']) ?? 
      Math.max(0, total_accounts - active_accounts);
    
    const unifiedReport: UnifiedCreditReport = {
      header: {
        bureau_name: 'CRIF High Mark',
        control_number: safeString(header?.['REPORT-ID'], generateControlNumber()),
        report_date: normalizeDate(header?.['DATE-OF-ISSUE']) || getCurrentDate(),
        credit_score: creditScore,
      },
      personal_information: {
        full_name: fullName.toUpperCase(),
        date_of_birth: dateOfBirth,
        gender: safeString(context.gender, 'Not Reported'),
        identifications,
      },
      contact_information: {
        addresses,
        phone_numbers,
        email_addresses,
      },
      employment_information,
      accounts,
      enquiries,
      summary: {
        total_accounts,
        active_accounts,
        closed_accounts,
        total_overdue_amount: toNumber(primarySummary?.['PRIMARY-OVERDUE-AMOUNT']) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.amount_overdue) ?? 0), 0),
        total_sanctioned_amount: toNumber(primarySummary?.['PRIMARY-SANCTIONED-AMOUNT']) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.sanctioned_amount) ?? 0), 0),
        total_current_balance: toNumber(primarySummary?.['PRIMARY-CURRENT-BALANCE']) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.current_balance) ?? 0), 0),
      },
    };
    
    return {
      success: true,
      unifiedReport,
      rawData,
      bureauName: 'CRIF High Mark',
    };
  } catch (error) {
    console.error('Error parsing CRIF response:', error);
    return {
      success: false,
      unifiedReport: null,
      rawData,
      error: error instanceof Error ? error.message : 'Failed to parse CRIF response',
      bureauName: 'CRIF High Mark',
    };
  }
}
