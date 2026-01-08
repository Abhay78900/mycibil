import { CreditReport } from '@/types';
import UnifiedReportView from './report/UnifiedReportView';
import { UnifiedCreditReport } from '@/types/creditReport';
import { format } from 'date-fns';

interface FullCreditReportViewProps {
  report: CreditReport;
  bureauName: string;
}

function transformToUnifiedReport(rawReport: CreditReport, bureauName: string): UnifiedCreditReport {
  // Determine bureau and score
  let score: number | null = null;
  let rawData: any = null;

  if (bureauName.toLowerCase().includes('cibil')) {
    score = rawReport.cibil_score;
    rawData = rawReport.raw_cibil_data;
  } else if (bureauName.toLowerCase().includes('experian')) {
    score = rawReport.experian_score;
    rawData = rawReport.raw_experian_data;
  } else if (bureauName.toLowerCase().includes('equifax')) {
    score = rawReport.equifax_score;
    rawData = rawReport.raw_equifax_data;
  } else if (bureauName.toLowerCase().includes('crif') || bureauName.toLowerCase().includes('highmark')) {
    score = rawReport.crif_score;
    rawData = rawReport.raw_crif_data;
  }

  // If raw data is already in unified format, use it
  if (rawData && typeof rawData === 'object' && (rawData as any).header) {
    return rawData as UnifiedCreditReport;
  }

  // Otherwise, construct from database fields
  const unifiedReport: UnifiedCreditReport = {
    header: {
      bureau_name: bureauName,
      control_number: rawReport.id || '---',
      report_date: rawReport.created_at ? format(new Date(rawReport.created_at), 'dd-MMM-yyyy') : '---',
      credit_score: score
    },
    personal_information: {
      full_name: rawReport.full_name || 'Not Reported',
      date_of_birth: rawReport.date_of_birth ? format(new Date(rawReport.date_of_birth), 'dd-MMM-yyyy') : '---',
      gender: 'Not Reported',
      identifications: [
        { type: 'PAN', number: rawReport.pan_number || 'Not Reported', issue_date: null, expiration_date: null }
      ]
    },
    contact_information: {
      addresses: [],
      phone_numbers: [],
      email_addresses: []
    },
    employment_information: [],
    accounts: [],
    summary: {
      total_accounts: 0,
      active_accounts: 0,
      closed_accounts: 0,
      total_overdue_amount: 0,
      total_current_balance: 0,
      total_sanctioned_amount: 0
    },
    enquiries: []
  };

  // Transform active loans to accounts
  const activeLoans = Array.isArray(rawReport.active_loans) ? rawReport.active_loans : [];
  const creditCards = Array.isArray(rawReport.credit_cards) ? rawReport.credit_cards : [];

  activeLoans.forEach((loan: any) => {
    unifiedReport.accounts.push({
      member_name: loan.lender || 'Not Reported',
      account_type: loan.loan_type || 'Loan',
      ownership: 'Individual',
      account_number: loan.account_number || '---',
      credit_limit: '---',
      sanctioned_amount: loan.sanctioned_amount?.toLocaleString('en-IN') || '---',
      current_balance: loan.current_balance?.toLocaleString('en-IN') || '---',
      cash_limit: '---',
      amount_overdue: loan.overdue_amount?.toLocaleString('en-IN') || '---',
      rate_of_interest: loan.interest_rate || '---',
      repayment_tenure: loan.tenure || '---',
      emi_amount: loan.emi_amount?.toLocaleString('en-IN') || '---',
      payment_frequency: 'Monthly',
      actual_payment_amount: '---',
      dates: {
        date_opened: loan.date_opened || '---',
        date_closed: loan.date_closed || null,
        date_of_last_payment: null,
        date_reported: loan.date_reported || '---'
      },
      payment_start_date: '---',
      payment_end_date: '---',
      payment_history: [],
      collateral: {
        value: '---',
        type: '---',
        suit_filed: 'Not Reported',
        credit_facility_status: loan.status || 'Active',
        written_off_total: '---',
        written_off_principal: '---',
        settlement_amount: '---'
      }
    });
  });

  creditCards.forEach((card: any) => {
    unifiedReport.accounts.push({
      member_name: card.bank || 'Not Reported',
      account_type: 'Credit Card',
      ownership: 'Individual',
      account_number: card.card_number || '---',
      credit_limit: card.credit_limit?.toLocaleString('en-IN') || '---',
      sanctioned_amount: card.credit_limit?.toLocaleString('en-IN') || '---',
      current_balance: card.current_balance?.toLocaleString('en-IN') || '---',
      cash_limit: '---',
      amount_overdue: card.overdue_amount?.toLocaleString('en-IN') || '---',
      rate_of_interest: '---',
      repayment_tenure: 'Revolving',
      emi_amount: '---',
      payment_frequency: 'Monthly',
      actual_payment_amount: '---',
      dates: {
        date_opened: card.date_opened || '---',
        date_closed: null,
        date_of_last_payment: null,
        date_reported: card.date_reported || '---'
      },
      payment_start_date: '---',
      payment_end_date: '---',
      payment_history: [],
      collateral: {
        value: '---',
        type: '---',
        suit_filed: 'Not Reported',
        credit_facility_status: 'Active',
        written_off_total: '---',
        written_off_principal: '---',
        settlement_amount: '---'
      }
    });
  });

  // Update summary
  unifiedReport.summary.total_accounts = unifiedReport.accounts.length;
  unifiedReport.summary.active_accounts = unifiedReport.accounts.filter(a => a.collateral.credit_facility_status === 'Active').length;
  unifiedReport.summary.closed_accounts = unifiedReport.accounts.filter(a => a.collateral.credit_facility_status === 'Closed').length;

  return unifiedReport;
}

export default function FullCreditReportView({ report, bureauName }: FullCreditReportViewProps) {
  const unifiedReport = transformToUnifiedReport(report, bureauName);
  
  return <UnifiedReportView report={unifiedReport} />;
}
