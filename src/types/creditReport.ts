// Unified Credit Report Types - Matching CIBIL PDF Format

export interface CreditReportHeader {
  bureau_name: string;
  control_number: string;
  report_date: string;
  credit_score: number | null;
}

export interface IdentificationDetail {
  type: string;
  number: string;
  issue_date: string | null;
  expiration_date: string | null;
}

export interface PersonalInformation {
  full_name: string;
  date_of_birth: string;
  gender: string;
  identifications: IdentificationDetail[];
}

export interface AddressInfo {
  address: string;
  category: string;
  status: string;
  date_reported: string;
}

export interface PhoneNumber {
  type: string;
  number: string;
}

export interface ContactInformation {
  addresses: AddressInfo[];
  phone_numbers: PhoneNumber[];
  email_addresses: string[];
}

export interface EmploymentInfo {
  account_type: string;
  date_reported: string;
  occupation: string;
  income: string;
  frequency: string;
  income_indicator: string;
}

export interface AccountDates {
  date_opened: string;
  date_closed: string | null;
  date_of_last_payment: string | null;
  date_reported: string;
}

export interface CollateralInfo {
  value: string;
  type: string;
  suit_filed: string;
  credit_facility_status: string;
  written_off_total: string;
  written_off_principal: string;
  settlement_amount: string;
}

export interface PaymentHistoryMonth {
  year: number;
  months: {
    jan: string;
    feb: string;
    mar: string;
    apr: string;
    may: string;
    jun: string;
    jul: string;
    aug: string;
    sep: string;
    oct: string;
    nov: string;
    dec: string;
  };
}

export interface AccountInfo {
  member_name: string;
  account_type: string;
  account_number: string;
  ownership: string;
  // Account Details
  credit_limit: string;
  sanctioned_amount: string;
  current_balance: string;
  cash_limit: string;
  amount_overdue: string;
  rate_of_interest: string;
  repayment_tenure: string;
  emi_amount: string;
  payment_frequency: string;
  actual_payment_amount: string;
  // Dates
  dates: AccountDates;
  // Payment History (36 months)
  payment_start_date: string;
  payment_end_date: string;
  payment_history: PaymentHistoryMonth[];
  // Collateral
  collateral: CollateralInfo;
}

export interface EnquiryInfo {
  member_name: string;
  date_of_enquiry: string;
  enquiry_purpose: string;
}

export interface ReportSummary {
  total_accounts: number;
  active_accounts: number;
  closed_accounts: number;
  total_overdue_amount: number;
  total_sanctioned_amount: number;
  total_current_balance: number;
}

export interface UnifiedCreditReport {
  header: CreditReportHeader;
  personal_information: PersonalInformation;
  contact_information: ContactInformation;
  employment_information: EmploymentInfo[];
  accounts: AccountInfo[];
  enquiries: EnquiryInfo[];
  summary: ReportSummary;
}

// Bureau data mapping - Maps raw bureau terms to CIBIL labels
export const BUREAU_FIELD_MAPPING = {
  // Amount mappings
  'OverdueAmount': 'Amount Overdue',
  'Total Amount Due': 'Amount Overdue',
  'High Credit': 'Sanctioned Amount',
  'HighCredit': 'Sanctioned Amount',
  'Balance Outstanding': 'Current Balance',
  'BalanceOutstanding': 'Current Balance',
  'DPD': 'Days Past Due',
  // Account type mappings
  'Home Loan': 'Housing Loan',
  'LAP': 'Property Loan',
  'Personal': 'Personal Loan',
  'CC': 'Credit Card',
  'OD': 'Overdraft',
  'Auto': 'Auto Loan (Personal)',
  '2W': 'Two-wheeler Loan',
  'BL': 'Business Loan',
  // Status mappings
  'STD': 'Standard',
  'SMA': 'Special Mention Account',
  'SUB': 'Substandard',
  'DBT': 'Doubtful',
  'LSS': 'Loss',
} as const;

// Helper to format missing values
export function formatValue(value: any, isNumeric = false): string {
  if (value === null || value === undefined || value === '' || value === '-') {
    return isNumeric ? '---' : 'Not Reported';
  }
  if (isNumeric && typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }
  return String(value);
}

// Helper to map bureau terms to CIBIL labels
export function mapToCibilLabel(term: string): string {
  return BUREAU_FIELD_MAPPING[term as keyof typeof BUREAU_FIELD_MAPPING] || term;
}
