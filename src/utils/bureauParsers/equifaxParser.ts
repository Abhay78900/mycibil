/**
 * Equifax Response Format Handler
 * 
 * Parses Equifax-specific JSON responses and maps them to the unified credit report format.
 * Equifax uses the CCRResponse format with nested CIRReportData.
 */

import { UnifiedCreditReport } from '@/types/creditReport';
import { EquifaxRawResponse, BureauParserContext, ParsedBureauResult } from './types';
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
 * Check if response matches Equifax format
 */
export function isEquifaxResponse(rawData: any): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  
  // Check for standard Equifax structure
  if (rawData.CCRResponse?.CIRReportData) return true;
  
  // Check for wrapped response
  if (rawData.data?.CCRResponse) return true;
  
  // Check for IDAndContactInfo indicator
  if (rawData.CCRResponse?.CIRReportData?.IDAndContactInfo) return true;
  
  return false;
}

/**
 * Parse Equifax response to unified format
 */
export function parseEquifaxResponse(
  rawData: EquifaxRawResponse,
  context: BureauParserContext
): ParsedBureauResult {
  try {
    // Handle wrapped response
    const ccrResponse = rawData.CCRResponse || rawData.data?.CCRResponse || {};
    const reportData = ccrResponse.CIRReportData || {};
    
    // Extract sections
    const idContactInfo = reportData.IDAndContactInfo || {};
    const personalInfo = idContactInfo.PersonalInfo || {};
    const name = personalInfo.Name || {};
    const identityInfo = idContactInfo.IdentityInfo || {};
    const scoreDetails = ensureArray<any>(reportData.ScoreDetails);
    const accountSummary = reportData.AccountSummary || {};
    
    // Extract credit score
    const creditScore = toNumber(scoreDetails[0]?.Score) ?? null;
    
    // Personal Information
    const fullName = safeString(
      name.FullName || `${name.FirstName || ''} ${name.MiddleName || ''} ${name.LastName || ''}`.trim(),
      context.fullName || 'Not Reported'
    );
    
    // ID Segments - Equifax has separate arrays for each ID type
    const identifications: any[] = [];
    
    // PAN IDs
    const panIds = ensureArray<any>(identityInfo.PANId);
    panIds.forEach(id => {
      identifications.push({
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: safeString(id.IdNumber),
        issue_date: null,
        expiration_date: null,
      });
    });
    
    // Voter IDs
    const voterIds = ensureArray<any>(identityInfo.VoterId);
    voterIds.forEach(id => {
      identifications.push({
        type: 'VOTER ID',
        number: safeString(id.IdNumber),
        issue_date: null,
        expiration_date: null,
      });
    });
    
    // Passport IDs
    const passportIds = ensureArray<any>(identityInfo.PassportId);
    passportIds.forEach(id => {
      identifications.push({
        type: 'PASSPORT',
        number: safeString(id.IdNumber),
        issue_date: null,
        expiration_date: null,
      });
    });
    
    // Driver License
    const driverLicenses = ensureArray<any>(identityInfo.DriverLicense);
    driverLicenses.forEach(id => {
      identifications.push({
        type: 'DRIVING LICENSE',
        number: safeString(id.IdNumber),
        issue_date: null,
        expiration_date: null,
      });
    });
    
    // Ensure PAN is included from context if not found
    if (!identifications.find(id => id.type.includes('PAN'))) {
      identifications.unshift({
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: context.panNumber || 'Not Reported',
        issue_date: null,
        expiration_date: null,
      });
    }
    
    // Addresses
    const addressInfos = ensureArray<any>(idContactInfo.AddressInfo);
    const addresses = addressInfos.map(addr => ({
      address: [
        safeString(addr.Address, ''),
        safeString(addr.City, ''),
        safeString(addr.State, ''),
        safeString(addr.Postal, ''),
      ].filter(Boolean).join(', ') || 'Not Reported',
      category: safeString(addr.Type),
      status: 'Not Reported',
      date_reported: normalizeDate(addr.DateReported),
    }));
    
    // Phone Numbers
    const phoneInfos = ensureArray<any>(idContactInfo.PhoneInfo);
    const phone_numbers = phoneInfos.map(phone => ({
      type: safeString(phone.TypeCode, 'Phone'),
      number: safeString(phone.Number),
    }));
    
    // Add context mobile if not present
    if (context.mobileNumber && !phone_numbers.find(p => p.number === context.mobileNumber)) {
      phone_numbers.unshift({
        type: 'Mobile',
        number: context.mobileNumber,
      });
    }
    
    // Email Addresses
    const emailInfos = ensureArray<any>(idContactInfo.EmailInfo);
    const email_addresses = emailInfos.map(e => safeString(e.EmailAddress)).filter(e => e !== 'Not Reported');
    
    // Accounts
    const retailAccounts = ensureArray<any>(reportData.RetailAccountDetails);
    const accounts = retailAccounts.map(acc => ({
      member_name: safeString(acc.Institution),
      account_type: mapAccountType(acc.AccountType),
      account_number: safeString(acc.AccountNumber, '---'),
      ownership: mapOwnership(acc.OwnershipType),
      credit_limit: safeString(acc.CreditLimit, '-'),
      sanctioned_amount: safeString(acc.HighCredit, '-'),
      current_balance: safeString(acc.Balance, '-'),
      cash_limit: '-',
      amount_overdue: safeString(acc.AmountPastDue, '0'),
      rate_of_interest: safeString(acc.Rate, '-'),
      repayment_tenure: safeString(acc.Tenure, '-'),
      emi_amount: safeString(acc.InstallmentAmount, '-'),
      payment_frequency: 'Monthly',
      actual_payment_amount: '-',
      dates: {
        date_opened: normalizeDate(acc.DateOpened) || '-',
        date_closed: acc.DateClosed ? normalizeDate(acc.DateClosed) : null,
        date_of_last_payment: acc.LastPaymentDate ? normalizeDate(acc.LastPaymentDate) : null,
        date_reported: normalizeDate(acc.DateReported),
      },
      payment_start_date: '-',
      payment_end_date: '-',
      payment_history: [], // Would need to parse History48Months string
      collateral: {
        value: '-',
        type: '-',
        suit_filed: safeString(acc.SuitFiled, '-'),
        credit_facility_status: safeString(acc.AccountStatus, '-'),
        written_off_total: safeString(acc.WriteOffAmount, '-'),
        written_off_principal: '-',
        settlement_amount: safeString(acc.SettlementAmount, '-'),
      },
    }));
    
    // Enquiries
    const inquiries = ensureArray<any>(reportData.InquiryHistory);
    const enquiries = inquiries.map(enq => ({
      member_name: safeString(enq.InquiringMember),
      date_of_enquiry: normalizeDate(enq.DateOfInquiry),
      enquiry_purpose: safeString(enq.InquiryPurpose),
    }));
    
    // Summary
    const total_accounts = toNumber(accountSummary.TotalAccounts) ?? accounts.length;
    const active_accounts = toNumber(accountSummary.ActiveAccounts) ?? accounts.filter(a => !a.dates.date_closed).length;
    const closed_accounts = toNumber(accountSummary.ClosedAccounts) ?? (total_accounts - active_accounts);
    
    const unifiedReport: UnifiedCreditReport = {
      header: {
        bureau_name: 'Equifax',
        control_number: generateControlNumber(),
        report_date: getCurrentDate(),
        credit_score: creditScore,
      },
      personal_information: {
        full_name: fullName.toUpperCase(),
        date_of_birth: normalizeDate(personalInfo.DateOfBirth) || context.dateOfBirth || '---',
        gender: safeString(personalInfo.Gender, context.gender || 'Not Reported'),
        identifications,
      },
      contact_information: {
        addresses,
        phone_numbers,
        email_addresses,
      },
      employment_information: [], // Equifax typically doesn't include employment in consumer reports
      accounts,
      enquiries,
      summary: {
        total_accounts,
        active_accounts,
        closed_accounts,
        total_overdue_amount: toNumber(accountSummary.TotalPastDue) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.amount_overdue) ?? 0), 0),
        total_sanctioned_amount: (toNumber(accountSummary.SecuredAmount) ?? 0) + (toNumber(accountSummary.UnsecuredAmount) ?? 0) ||
          accounts.reduce((sum, a) => sum + (toNumber(a.sanctioned_amount) ?? 0), 0),
        total_current_balance: toNumber(accountSummary.CurrentBalance) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.current_balance) ?? 0), 0),
      },
    };
    
    return {
      success: true,
      unifiedReport,
      rawData,
      bureauName: 'Equifax',
    };
  } catch (error) {
    console.error('Error parsing Equifax response:', error);
    return {
      success: false,
      unifiedReport: null,
      rawData,
      error: error instanceof Error ? error.message : 'Failed to parse Equifax response',
      bureauName: 'Equifax',
    };
  }
}
