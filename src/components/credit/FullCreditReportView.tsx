import { CreditReport } from '@/types';
import UnifiedReportView from './report/UnifiedReportView';
import { UnifiedCreditReport } from '@/types/creditReport';
import { format } from 'date-fns';
import { generateMockReportFromTemplate } from '@/data/mockReportData';

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

  // If raw data is already in unified format (from real API), use it directly
  if (rawData && typeof rawData === 'object' && (rawData as any).header) {
    return rawData as UnifiedCreditReport;
  }

  // Generate mock report using the Puran Mal Tank template format
  // This will be replaced by real API data when integrated
  if (score) {
    const mockReport = generateMockReportFromTemplate(
      rawReport.full_name || 'Not Reported',
      rawReport.pan_number || 'Not Reported',
      rawReport.date_of_birth || '---',
      'Male', // Default gender, will come from API
      score
    );
    
    // Override the header with actual bureau info
    mockReport.header = {
      bureau_name: bureauName,
      control_number: rawReport.id?.slice(0, 10) || Math.random().toString().slice(2, 12),
      report_date: rawReport.created_at 
        ? format(new Date(rawReport.created_at), 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd'),
      credit_score: score
    };

    // Update personal information with actual data
    mockReport.personal_information.full_name = (rawReport.full_name || 'Not Reported').toUpperCase();
    mockReport.personal_information.date_of_birth = rawReport.date_of_birth || '---';
    mockReport.personal_information.identifications = [
      {
        type: 'INCOME TAX ID NUMBER (PAN)',
        number: rawReport.pan_number || 'Not Reported',
        issue_date: null,
        expiration_date: null
      }
    ];

    // If there's actual loan/card data in the report, use it
    const activeLoans = Array.isArray(rawReport.active_loans) ? rawReport.active_loans : [];
    const creditCards = Array.isArray(rawReport.credit_cards) ? rawReport.credit_cards : [];
    
    if (activeLoans.length > 0 || creditCards.length > 0) {
      mockReport.accounts = [];
      
      activeLoans.forEach((loan: any) => {
        mockReport.accounts.push({
          member_name: loan.lender || 'Not Reported',
          account_type: loan.loan_type || 'Loan',
          ownership: 'Individual',
          account_number: loan.account_number || '---',
          credit_limit: '-',
          sanctioned_amount: loan.sanctioned_amount?.toString() || '-',
          current_balance: loan.current_balance?.toString() || '-',
          cash_limit: '-',
          amount_overdue: loan.overdue_amount?.toString() || '0',
          rate_of_interest: loan.interest_rate?.toString() || '-',
          repayment_tenure: loan.tenure_months?.toString() || '-',
          emi_amount: loan.emi_amount?.toString() || '-',
          payment_frequency: 'Monthly',
          actual_payment_amount: '-',
          dates: {
            date_opened: loan.start_date || '-',
            date_closed: loan.closed_date || null,
            date_of_last_payment: null,
            date_reported: format(new Date(), 'yyyy-MM-dd')
          },
          payment_start_date: loan.start_date || '-',
          payment_end_date: format(new Date(), 'yyyy-MM-dd'),
          payment_history: generatePaymentHistory(loan.payment_history || []),
          collateral: {
            value: '-',
            type: '-',
            suit_filed: '-',
            credit_facility_status: loan.status === 'Closed' ? 'Closed' : '-',
            written_off_total: '-',
            written_off_principal: '-',
            settlement_amount: '-'
          }
        });
      });

      creditCards.forEach((card: any) => {
        mockReport.accounts.push({
          member_name: card.bank || 'Not Reported',
          account_type: 'Credit Card',
          ownership: 'Individual',
          account_number: card.card_number || '---',
          credit_limit: card.credit_limit?.toString() || '-',
          sanctioned_amount: card.credit_limit?.toString() || '-',
          current_balance: card.current_balance?.toString() || '-',
          cash_limit: '-',
          amount_overdue: '0',
          rate_of_interest: '-',
          repayment_tenure: 'Revolving',
          emi_amount: '-',
          payment_frequency: 'Monthly',
          actual_payment_amount: '-',
          dates: {
            date_opened: card.date_opened || '-',
            date_closed: null,
            date_of_last_payment: null,
            date_reported: format(new Date(), 'yyyy-MM-dd')
          },
          payment_start_date: '-',
          payment_end_date: '-',
          payment_history: [],
          collateral: {
            value: '-',
            type: '-',
            suit_filed: '-',
            credit_facility_status: card.status || 'Active',
            written_off_total: '-',
            written_off_principal: '-',
            settlement_amount: '-'
          }
        });
      });

      // Update summary based on actual data
      mockReport.summary = {
        total_accounts: mockReport.accounts.length,
        active_accounts: mockReport.accounts.filter(a => !a.dates.date_closed).length,
        closed_accounts: mockReport.accounts.filter(a => a.dates.date_closed).length,
        total_overdue_amount: 0,
        total_sanctioned_amount: mockReport.accounts.reduce((sum, a) => {
          const amt = parseFloat(a.sanctioned_amount.replace(/,/g, '')) || 0;
          return sum + amt;
        }, 0),
        total_current_balance: mockReport.accounts.reduce((sum, a) => {
          const amt = parseFloat(a.current_balance.replace(/,/g, '')) || 0;
          return sum + amt;
        }, 0)
      };
    }

    return mockReport;
  }

  // Fallback: construct minimal report from database fields
  const unifiedReport: UnifiedCreditReport = {
    header: {
      bureau_name: bureauName,
      control_number: rawReport.id || '---',
      report_date: rawReport.created_at ? format(new Date(rawReport.created_at), 'yyyy-MM-dd') : '---',
      credit_score: score
    },
    personal_information: {
      full_name: rawReport.full_name || 'Not Reported',
      date_of_birth: rawReport.date_of_birth || '---',
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

  return unifiedReport;
}

// Helper function to generate payment history from loan data
function generatePaymentHistory(history: any[]) {
  if (!history || history.length === 0) return [];
  
  const yearData: Record<number, any> = {};
  
  history.forEach((item: any) => {
    const year = item.year || new Date().getFullYear();
    if (!yearData[year]) {
      yearData[year] = {
        year,
        months: {
          jan: '', feb: '', mar: '', apr: '',
          may: '', jun: '', jul: '', aug: '',
          sep: '', oct: '', nov: '', dec: ''
        }
      };
    }
    
    const month = item.month?.toLowerCase()?.slice(0, 3);
    if (month && yearData[year].months.hasOwnProperty(month)) {
      yearData[year].months[month] = item.dpd?.toString() || (item.status === 'On Time' ? '0' : 'XXX');
    }
  });
  
  return Object.values(yearData).sort((a, b) => b.year - a.year);
}

export default function FullCreditReportView({ report, bureauName }: FullCreditReportViewProps) {
  const unifiedReport = transformToUnifiedReport(report, bureauName);
  
  return <UnifiedReportView report={unifiedReport} />;
}
