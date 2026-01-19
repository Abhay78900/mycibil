/**
 * Experian Response Format Handler
 * 
 * Parses Experian-specific JSON responses and maps them to the unified credit report format.
 * Experian uses their ABORESSION format with distinct field naming.
 */

import { UnifiedCreditReport } from '@/types/creditReport';
import { ExperianRawResponse, BureauParserContext, ParsedBureauResult } from './types';
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
 * Check if response matches Experian format
 */
export function isExperianResponse(rawData: any): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  
  // Check for standard Experian structure
  if (rawData.ABORESSION?.HEADER) return true;
  if (rawData.ABORESSION?.CONSUMERSECTION) return true;
  
  // Check for wrapped response
  if (rawData.data?.ABORESSION) return true;
  
  // Check for product indicator
  if (rawData.ABORESSION?.HEADER?.PRODUCT?.includes('Experian')) return true;
  
  return false;
}

/**
 * Parse Experian response to unified format
 */
export function parseExperianResponse(
  rawData: ExperianRawResponse,
  context: BureauParserContext
): ParsedBureauResult {
  try {
    // Handle wrapped response
    const aboression = rawData.ABORESSION || rawData.data?.ABORESSION || {};
    
    // Extract sections
    const header = aboression.HEADER || {};
    const consumerSection = aboression.CONSUMERSECTION || {};
    const name = consumerSection.NAME || {};
    const score = aboression.SCORE || {};
    const summary = aboression.SUMMARY || {};
    
    // Extract credit score
    const creditScore = toNumber(score.SCORE) ?? null;
    
    // Personal Information
    const fullName = safeString(
      name.CONSUMERNAME1 || name.CONSUMERNAME2,
      context.fullName || 'Not Reported'
    );
    
    // ID Segments
    const idSegments = ensureArray<any>(consumerSection.IDS);
    const identifications = idSegments.map(id => ({
      type: safeString(id.IDTYPE, 'ID'),
      number: safeString(id.IDNUMBER),
      issue_date: null,
      expiration_date: null,
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
    const addressSegments = ensureArray<any>(consumerSection.ADDRESSES);
    const addresses = addressSegments.map(addr => ({
      address: [
        safeString(addr.ADDRESS, ''),
        safeString(addr.CITY, ''),
        safeString(addr.STATE, ''),
        safeString(addr.PINCODE, ''),
      ].filter(Boolean).join(', ') || 'Not Reported',
      category: safeString(addr.ADDRESSTYPE),
      status: 'Not Reported',
      date_reported: normalizeDate(addr.DATEREPORTED),
    }));
    
    // Phone Numbers
    const phoneSegments = ensureArray<any>(consumerSection.TELEPHONES);
    const phone_numbers = phoneSegments.map(phone => ({
      type: safeString(phone.TELEPHONETYPE, 'Phone'),
      number: safeString(phone.TELEPHONENUMBER),
    }));
    
    // Add context mobile if not present
    if (context.mobileNumber && !phone_numbers.find(p => p.number === context.mobileNumber)) {
      phone_numbers.unshift({
        type: 'Mobile',
        number: context.mobileNumber,
      });
    }
    
    // Email Addresses
    const emailSegments = ensureArray<any>(consumerSection.EMAILS);
    const email_addresses = emailSegments.map(e => safeString(e.EMAIL)).filter(e => e !== 'Not Reported');
    
    // Accounts
    const accountSegments = ensureArray<any>(aboression.ACCOUNTSECTION);
    const accounts = accountSegments.map(acc => ({
      member_name: safeString(acc.SUBSCRIBERNAME),
      account_type: mapAccountType(acc.ACCOUNTTYPE),
      account_number: safeString(acc.ACCOUNTNUMBER, '---'),
      ownership: mapOwnership(acc.OWNERSHIPTYPE),
      credit_limit: '-',
      sanctioned_amount: safeString(acc.SANCTIONEDAMOUNT, '-'),
      current_balance: safeString(acc.CURRENTBALANCE, '-'),
      cash_limit: '-',
      amount_overdue: safeString(acc.AMOUNTOVERDUE, '0'),
      rate_of_interest: safeString(acc.RATEOFINTEREST, '-'),
      repayment_tenure: safeString(acc.TENURE, '-'),
      emi_amount: safeString(acc.EMIAMOUNT, '-'),
      payment_frequency: 'Monthly',
      actual_payment_amount: '-',
      dates: {
        date_opened: normalizeDate(acc.DATEOPENED) || '-',
        date_closed: acc.DATECLOSED ? normalizeDate(acc.DATECLOSED) : null,
        date_of_last_payment: acc.LASTPAYMENTDATE ? normalizeDate(acc.LASTPAYMENTDATE) : null,
        date_reported: normalizeDate(acc.DATEREPORTED),
      },
      payment_start_date: normalizeDate(acc.PAYMENTSTARTDATE) || '-',
      payment_end_date: normalizeDate(acc.PAYMENTENDDATE) || '-',
      payment_history: [], // Would need to parse PAYMENTHISTORY string
      collateral: {
        value: '-',
        type: '-',
        suit_filed: safeString(acc.SUITFILED, '-'),
        credit_facility_status: safeString(acc.ACCOUNTSTATUS, '-'),
        written_off_total: safeString(acc.WRITTENOFFAMOUNT, '-'),
        written_off_principal: '-',
        settlement_amount: safeString(acc.SETTLEMENTAMOUNT, '-'),
      },
    }));
    
    // Enquiries
    const enquirySegments = ensureArray<any>(aboression.ENQUIRYSECTION);
    const enquiries = enquirySegments.map(enq => ({
      member_name: safeString(enq.SUBSCRIBERNAME),
      date_of_enquiry: normalizeDate(enq.ENQUIRYDATE),
      enquiry_purpose: safeString(enq.ENQUIRYPURPOSE),
    }));
    
    // Summary
    const total_accounts = toNumber(summary.TOTALACCOUNTS) ?? accounts.length;
    const active_accounts = toNumber(summary.ACTIVEACCOUNTS) ?? accounts.filter(a => !a.dates.date_closed).length;
    const closed_accounts = toNumber(summary.CLOSEDACCOUNTS) ?? (total_accounts - active_accounts);
    
    const unifiedReport: UnifiedCreditReport = {
      header: {
        bureau_name: 'Experian',
        control_number: safeString(header.REPORTID, generateControlNumber()),
        report_date: normalizeDate(header.DATEPROCESSED) || getCurrentDate(),
        credit_score: creditScore,
      },
      personal_information: {
        full_name: fullName.toUpperCase(),
        date_of_birth: normalizeDate(name.DATEOFBIRTH) || context.dateOfBirth || '---',
        gender: safeString(name.GENDER, context.gender || 'Not Reported'),
        identifications,
      },
      contact_information: {
        addresses,
        phone_numbers,
        email_addresses,
      },
      employment_information: [], // Experian typically doesn't include employment in consumer reports
      accounts,
      enquiries,
      summary: {
        total_accounts,
        active_accounts,
        closed_accounts,
        total_overdue_amount: toNumber(summary.TOTALOVERDUE) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.amount_overdue) ?? 0), 0),
        total_sanctioned_amount: toNumber(summary.TOTALSANCTIONED) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.sanctioned_amount) ?? 0), 0),
        total_current_balance: toNumber(summary.TOTALBALANCE) ?? 
          accounts.reduce((sum, a) => sum + (toNumber(a.current_balance) ?? 0), 0),
      },
    };
    
    return {
      success: true,
      unifiedReport,
      rawData,
      bureauName: 'Experian',
    };
  } catch (error) {
    console.error('Error parsing Experian response:', error);
    return {
      success: false,
      unifiedReport: null,
      rawData,
      error: error instanceof Error ? error.message : 'Failed to parse Experian response',
      bureauName: 'Experian',
    };
  }
}
