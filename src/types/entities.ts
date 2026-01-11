export interface PaymentHistory {
  month: string;
  year: number;
  status: string;
  dpd: number;
}

export interface ActiveLoan {
  loan_type: string;
  lender: string;
  account_number: string;
  sanctioned_amount: number;
  current_balance: number;
  emi_amount: number;
  tenure_months: number;
  start_date: string;
  status: string;
  overdue_amount: number;
  payment_history: PaymentHistory[];
}

export interface ClosedLoan {
  loan_type: string;
  lender: string;
  sanctioned_amount: number;
  closed_date: string;
  status: string;
}

export interface CreditCard {
  bank: string;
  card_type: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  utilization: number;
  status: string;
}

// CreditReport for mock data (display purposes)
export interface CreditReport {
  id: string;
  user_email?: string;
  full_name: string;
  pan_number: string;
  mobile?: string;
  average_score: number;
  score_category?: string;
  cibil_score: number | null;
  experian_score: number | null;
  equifax_score: number | null;
  crif_score: number | null;
  credit_utilization?: number;
  bureaus_checked?: string[];
  active_loans?: ActiveLoan[];
  closed_loans?: ClosedLoan[];
  credit_cards?: CreditCard[];
  is_high_risk: boolean | null;
  report_status: string | null;
  initiated_by?: string;
  partner_id?: string;
  report_generated_at?: string;
  created_date?: string;
}

// CreditReportEntity matches the Supabase credit_reports table schema
export interface CreditReportEntity {
  id: string;
  user_id: string;
  partner_id: string | null;
  full_name: string;
  pan_number: string;
  date_of_birth: string | null;
  selected_bureaus: string[] | null;
  cibil_score: number | null;
  experian_score: number | null;
  equifax_score: number | null;
  crif_score: number | null;
  average_score: number | null;
  raw_cibil_data: unknown;
  raw_experian_data: unknown;
  raw_equifax_data: unknown;
  raw_crif_data: unknown;
  active_loans: unknown;
  credit_cards: unknown;
  enquiries: unknown;
  risk_flags: unknown;
  improvement_tips: unknown;
  ai_analysis: string | null;
  is_high_risk: boolean | null;
  report_status: 'locked' | 'unlocked' | 'processing' | 'failed' | null;
  amount_paid: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Partner {
  id: string;
  name: string;
  franchise_id: string;
  owner_email?: string;
  phone?: string;
  address?: string;
  wallet_balance: number | null;
  total_wallet_loaded?: number;
  total_sales?: number;
  total_revenue: number | null;
  total_commission_earned?: number;
  total_commission_paid?: number;
  commission_rate: number | null;
  status: string | null;
  created_date?: string;
}

export interface Transaction {
  id: string;
  user_email?: string;
  transaction_id: string;
  payment_gateway?: string;
  amount: number;
  report_count?: number;
  bureaus_purchased?: string[];
  status: string | null;
  payment_method: string | null;
  commission_amount?: number;
  initiated_by?: string;
  created_date?: string;
}

export interface WalletTransaction {
  id: string;
  partner_id: string;
  partner_email?: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id?: string;
  status: string | null;
  created_date?: string;
}
