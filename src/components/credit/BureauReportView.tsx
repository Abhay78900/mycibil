import { CreditReport } from '@/types';
import FullCreditReportView from './FullCreditReportView';

interface BureauConfig {
  name: string;
  fullName: string;
  color: string;
  logo: string;
}

interface BureauReportViewProps {
  report: {
    id: string;
    full_name: string;
    pan_number: string;
    mobile?: string;
    cibil_score?: number | null;
    experian_score?: number | null;
    equifax_score?: number | null;
    crif_score?: number | null;
    active_loans?: any[];
    closed_loans?: any[];
    credit_cards?: any[];
    credit_utilization?: number;
    created_date?: string;
    initiated_by?: 'partner' | 'user';
    improvement_tips?: string[];
    raw_cibil_data?: any;
    raw_experian_data?: any;
    raw_equifax_data?: any;
    raw_crif_data?: any;
    created_at?: string | null;
    date_of_birth?: string | null;
    user_id?: string;
    partner_id?: string | null;
  };
  bureau: string;
  config: BureauConfig;
  score: number;
}

export default function BureauReportView({ report, bureau, config, score }: BureauReportViewProps) {
  // Convert to CreditReport format for FullCreditReportView
  const creditReport: CreditReport = {
    id: report.id,
    user_id: report.user_id || '',
    partner_id: report.partner_id || null,
    full_name: report.full_name,
    pan_number: report.pan_number,
    date_of_birth: report.date_of_birth || null,
    selected_bureaus: null,
    cibil_score: report.cibil_score || null,
    experian_score: report.experian_score || null,
    equifax_score: report.equifax_score || null,
    crif_score: report.crif_score || null,
    average_score: null,
    raw_cibil_data: report.raw_cibil_data || null,
    raw_experian_data: report.raw_experian_data || null,
    raw_equifax_data: report.raw_equifax_data || null,
    raw_crif_data: report.raw_crif_data || null,
    active_loans: report.active_loans || null,
    credit_cards: report.credit_cards || null,
    enquiries: null,
    risk_flags: null,
    improvement_tips: report.improvement_tips || null,
    ai_analysis: null,
    is_high_risk: null,
    report_status: 'unlocked',
    amount_paid: null,
    created_at: report.created_at || report.created_date || null,
    updated_at: null
  };

  return (
    <FullCreditReportView 
      report={creditReport} 
      bureauName={config.fullName} 
    />
  );
}
