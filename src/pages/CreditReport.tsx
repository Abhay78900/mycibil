import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import UnifiedReportView from '@/components/credit/report/UnifiedReportView';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedCreditReport } from '@/types/creditReport';
import { Loader2, ArrowLeft, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Transform raw database report to UnifiedCreditReport format
function transformToUnifiedReport(rawReport: any): UnifiedCreditReport | null {
  // Determine which bureau data is available
  const rawData = rawReport.raw_cibil_data || rawReport.raw_experian_data || 
                  rawReport.raw_equifax_data || rawReport.raw_crif_data;
  
  // Get bureau name based on which data exists
  let bureauName = 'CIBIL';
  let score = rawReport.cibil_score;
  
  if (rawReport.raw_experian_data) {
    bureauName = 'Experian';
    score = rawReport.experian_score;
  } else if (rawReport.raw_equifax_data) {
    bureauName = 'Equifax';
    score = rawReport.equifax_score;
  } else if (rawReport.raw_crif_data) {
    bureauName = 'CRIF Highmark';
    score = rawReport.crif_score;
  }

  // If we have raw bureau data in unified format, use it directly
  if (rawData && typeof rawData === 'object' && rawData.header) {
    return rawData as UnifiedCreditReport;
  }

  // Otherwise, construct from the existing database fields
  const unifiedReport: UnifiedCreditReport = {
    header: {
      bureau_name: bureauName,
      control_number: rawReport.id || '---',
      report_date: rawReport.created_at ? format(new Date(rawReport.created_at), 'dd-MMM-yyyy') : '---',
      credit_score: score || null
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

export default function CreditReport() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<any>(null);
  const [unifiedReport, setUnifiedReport] = useState<UnifiedCreditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error || !data) {
      toast.error('Report not found');
      navigate(-1);
      return;
    }

    if (data.report_status === 'locked') {
      navigate(`/payment/${reportId}`);
      return;
    }

    setReport(data);
    
    // Transform to unified format
    const transformed = transformToUnifiedReport(data);
    setUnifiedReport(transformed);
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Credit Information Report</h1>
              <p className="text-muted-foreground text-sm">
                Generated on {format(new Date(report.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <CardContent className="p-6 md:p-8">
              {unifiedReport ? (
                <UnifiedReportView report={unifiedReport} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Unable to display report data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
