/**
 * CIBIL Response Format Handler
 * 
 * Parses CIBIL-specific JSON responses and maps them to the unified credit report format.
 * CIBIL uses TransUnion's format with specific field naming conventions.
 */

import { UnifiedCreditReport } from '@/types/creditReport';
import { CibilRawResponse, BureauParserContext, ParsedBureauResult } from './types';
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
 * Check if response matches CIBIL format
 */
export function isCibilResponse(rawData: any): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  
  // Check for standard CIBIL structure
  if (rawData.CreditReport?.Header || rawData.CreditReport?.NameSegment) return true;
  
  // Check for wrapped response
  if (rawData.data?.CreditReport) return true;
  
  // Check for Score segment indicator
  if (rawData.CreditReport?.Score?.ScoreType === 'CIBIL') return true;
  
  return false;
}

/**
 * Parse CIBIL response to unified format
 */
export function parseCibilResponse(
  rawData: CibilRawResponse,
  context: BureauParserContext
): ParsedBureauResult {
  try {
    // Handle wrapped response
    const creditReport = rawData.CreditReport || rawData.data?.CreditReport || {};
    
    // Extract header
    const header = creditReport.Header || {};
    const score = creditReport.Score || {};
    const nameSegment = creditReport.NameSegment || {};
    const accountsSummary = creditReport.AccountsSummary || {};
    
    // Extract credit score
    const creditScore = toNumber(score.Score) ?? null;
    
    // Personal Information
    const fullName = safeString(
      nameSegment.Name || `${context.fullName}`,
      context.fullName || 'Not Reported'
    );
    
    // ID Segments
    const idSegments = ensureArray<any>(creditReport.IDSegment);
    const identifications = idSegments.map(id => ({
      type: safeString(id.IDType, 'ID'),
      number: safeString(id.IDNumber),
      issue_date: normalizeDate(id.IssueDate) || null,
      expiration_date: normalizeDate(id.ExpirationDate) || null,
    }));
    
    // Ensure PAN is included
    if (!identifications.find(id => id.type.includes('PAN') || id.type.includes('TAX'))) {
      identifications.unshift({
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: context.panNumber || 'Not Reported',
        issue_date: null,
        expiration_date: null,
      });
    }
    
    // Addresses
    const addressSegments = ensureArray<any>(creditReport.AddressSegment);
    const addresses = addressSegments.map(addr => ({
      address: [
        safeString(addr.Address, ''),
        safeString(addr.City, ''),
        safeString(addr.State, ''),
        safeString(addr.PinCode, ''),
      ].filter(Boolean).join(', ') || 'Not Reported',
      category: safeString(addr.AddressCategory),
      status: safeString(addr.ResidenceCode),
      date_reported: normalizeDate(addr.DateReported),
    }));
    
    // Phone Numbers
    const phoneSegments = ensureArray<any>(creditReport.TelephoneSegment);
    const phone_numbers = phoneSegments.map(phone => ({
      type: safeString(phone.TelephoneType, 'Phone'),
      number: safeString(phone.TelephoneNumber),
    }));
    
    // Add context mobile if not present
    if (context.mobileNumber && !phone_numbers.find(p => p.number === context.mobileNumber)) {
      phone_numbers.unshift({
        type: 'Mobile',
        number: context.mobileNumber,
      });
    }
    
    // Email Addresses
    const emailSegments = ensureArray<any>(creditReport.EmailSegment);
    const email_addresses = emailSegments.map(e => safeString(e.EmailAddress)).filter(e => e !== 'Not Reported');
    
    // Employment Information
    const employmentSegments = ensureArray<any>(creditReport.EmploymentSegment);
    const employment_information = employmentSegments.map(emp => ({
      account_type: safeString(emp.AccountType),
      date_reported: normalizeDate(emp.DateReported),
      occupation: safeString(emp.OccupationCode),
      income: safeString(emp.Income),
      frequency: safeString(emp.MonthlyAnnualIndicator),
      income_indicator: safeString(emp.NetGrossIndicator),
    }));
    
    // Accounts
    const accountSegments = ensureArray<any>(creditReport.Account);
    const accounts = accountSegments.map(acc => ({
      member_name: safeString(acc.Institution),
      account_type: mapAccountType(acc.AccountType),
      account_number: safeString(acc.AccountNumber, '---'),
      ownership: mapOwnership(acc.OwnershipIndicator),
      credit_limit: safeString(acc.CreditLimit, '-'),
      sanctioned_amount: safeString(acc.HighCreditAmount, '-'),
      current_balance: safeString(acc.CurrentBalance, '-'),
      cash_limit: '-',
      amount_overdue: safeString(acc.AmountOverdue, '0'),
      rate_of_interest: safeString(acc.RateOfInterest, '-'),
      repayment_tenure: safeString(acc.RepaymentTenure, '-'),
      emi_amount: safeString(acc.EMIAmount, '-'),
      payment_frequency: safeString(acc.PaymentFrequency, 'Monthly'),
      actual_payment_amount: safeString(acc.ActualPaymentAmount, '-'),
      dates: {
        date_opened: normalizeDate(acc.DateOpened) || '-',
        date_closed: acc.DateClosed ? normalizeDate(acc.DateClosed) : null,
        date_of_last_payment: acc.LastPaymentDate ? normalizeDate(acc.LastPaymentDate) : null,
        date_reported: normalizeDate(acc.DateReported),
      },
      payment_start_date: normalizeDate(acc.PaymentHistoryStartDate) || '-',
      payment_end_date: normalizeDate(acc.PaymentHistoryEndDate) || '-',
      payment_history: [], // Would need to parse PaymentHistory string
      collateral: {
        value: safeString(acc.ValueOfCollateral, '-'),
        type: safeString(acc.TypeOfCollateral, '-'),
        suit_filed: safeString(acc.SuitFiledStatus, '-'),
        credit_facility_status: safeString(acc.CreditFacilityStatus, '-'),
        written_off_total: safeString(acc.WrittenOffAmount, '-'),
        written_off_principal: safeString(acc.WrittenOffPrincipalAmount, '-'),
        settlement_amount: safeString(acc.SettlementAmount, '-'),
      },
    }));
    
    // Enquiries
    const enquirySegments = ensureArray<any>(creditReport.Enquiry);
    const enquiries = enquirySegments.map(enq => ({
      member_name: safeString(enq.EnquiringMemberName),
      date_of_enquiry: normalizeDate(enq.DateOfEnquiry),
      enquiry_purpose: safeString(enq.EnquiryPurpose),
    }));
    
    // Summary
    const total_accounts = toNumber(accountsSummary.NumberOfAccounts) ?? accounts.length;
    const active_accounts = toNumber(accountsSummary.NumberOfActiveAccounts) ?? accounts.filter(a => !a.dates.date_closed).length;
    const closed_accounts = total_accounts - active_accounts;
    
    const unifiedReport: UnifiedCreditReport = {
      header: {
        bureau_name: 'CIBIL',
        control_number: safeString(header.ReportNumber, generateControlNumber()),
        report_date: normalizeDate(header.ReportDate) || getCurrentDate(),
        credit_score: creditScore,
      },
      personal_information: {
        full_name: fullName.toUpperCase(),
        date_of_birth: normalizeDate(nameSegment.DateOfBirth) || context.dateOfBirth || '---',
        gender: safeString(nameSegment.Gender, context.gender || 'Not Reported'),
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
        total_overdue_amount: toNumber(accountsSummary.TotalBalanceAmount) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.amount_overdue) ?? 0), 0),
        total_sanctioned_amount: toNumber(accountsSummary.TotalSanctionedAmount) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.sanctioned_amount) ?? 0), 0),
        total_current_balance: toNumber(accountsSummary.TotalBalanceAmount) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.current_balance) ?? 0), 0),
      },
    };
    
    return {
      success: true,
      unifiedReport,
      rawData,
      bureauName: 'CIBIL',
    };
  } catch (error) {
    console.error('Error parsing CIBIL response:', error);
    return {
      success: false,
      unifiedReport: null,
      rawData,
      error: error instanceof Error ? error.message : 'Failed to parse CIBIL response',
      bureauName: 'CIBIL',
    };
  }
}
