import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import BureauReportView from '@/components/credit/BureauReportView';
import ScoreRepairCTA from '@/components/credit/ScoreRepairCTA';
import AIReportAnalysis from '@/components/credit/AIReportAnalysis';
import { CreditReport as CreditReportType } from '@/types';
import { bureauConfig } from '@/utils/bureauMapping';

export default function CreditReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<CreditReportType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBureau, setSelectedBureau] = useState('cibil');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, []);

  useEffect(() => {
    // Auto-select first available bureau
    if (report) {
      const bureaus = ['cibil', 'experian', 'equifax', 'crif'];
      for (const bureau of bureaus) {
        const score = getScoreForBureau(bureau);
        if (score && score > 0) {
          setSelectedBureau(bureau);
          break;
        }
      }
    }
  }, [report]);

  const loadReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reportId = searchParams.get('reportId');

      if (reportId) {
        const { data: reportData, error } = await supabase
          .from('credit_reports')
          .select('*')
          .eq('id', reportId)
          .maybeSingle();

        if (reportData && !error) {
          setReport(reportData as CreditReportType);
        }
      } else if (user) {
        const { data: reportData, error } = await supabase
          .from('credit_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (reportData && !error) {
          setReport(reportData as CreditReportType);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreForBureau = (bureau: string): number | null => {
    if (!report) return null;
    switch (bureau) {
      case 'cibil': return report.cibil_score;
      case 'experian': return report.experian_score;
      case 'equifax': return report.equifax_score;
      case 'crif': return report.crif_score;
      default: return report.cibil_score;
    }
  };

  const generatePDFContent = (bureau: string): string => {
    if (!report) return '';
    const config = bureauConfig[bureau];
    const score = getScoreForBureau(bureau);
    const reportDate = format(new Date(), 'EEE MMM dd yyyy');
    const controlNumber = Math.floor(Math.random() * 9000000000) + 1000000000;

    const allAccounts = [
      ...((report.active_loans as any[]) || []),
      ...((report.credit_cards as any[]) || []).map((c: any) => ({
        ...c,
        loan_type: 'Credit Card',
        lender: c.bank,
        sanctioned_amount: c.credit_limit
      }))
    ];

    let content = `
${'═'.repeat(80)}
                              ${config.fullName.toUpperCase()} REPORT
${'═'.repeat(80)}

DATE: ${reportDate}
CONTROL NUMBER: ${controlNumber}

(e) INDICATES SECTION IS UNDER DISPUTE
(e) INDICATES THE VALUE PROVIDED BY BANK WHEN YOU APPLIED FOR A CREDIT FACILITY.

${'─'.repeat(80)}
${config.name} SCORE
${'─'.repeat(80)}

                                    ${score ?? '---'}

${'─'.repeat(80)}
PERSONAL INFORMATION
${'─'.repeat(80)}

NAME                    DATE OF BIRTH           GENDER
${(report.full_name || '---').padEnd(24)}${(report.date_of_birth || '---').padEnd(24)}${'---'}

IDENTIFICATION TYPE                 NUMBER                  ISSUE DATE      EXPIRATION DATE
INCOME TAX ID NUMBER (PAN)          ${(report.pan_number || '---').padEnd(24)}-               -

${'─'.repeat(80)}
CONTACT INFORMATION
${'─'.repeat(80)}

ADDRESS 1                                                           CATEGORY            STATUS      DATE REPORTED
${'Not Reported'.padEnd(68)}Permanent Address   -           ${format(new Date(), 'yyyy-MM-dd')}

TELEPHONE NUMBERS TYPE              TELEPHONE NUMBER
Mobile Phone                        ---

${'─'.repeat(80)}
ACCOUNT INFORMATION
${'─'.repeat(80)}
`;

    allAccounts.forEach((account: any) => {
      content += `
${'─'.repeat(80)}
${((account.lender || account.bank || 'LENDER') as string).padEnd(20)} ${((account.loan_type || 'Account') as string).padEnd(25)} ${((account.account_number || '') as string).padEnd(20)} Individual
(MEMBER NAME)              (ACCOUNT TYPE)                  (ACCOUNT NUMBER)            (OWNERSHIP)
${'─'.repeat(80)}

ACCOUNT DETAILS
CREDIT LIMIT               -                    RATE OF INTEREST           ${account.rate_of_interest || account.interest_rate || '-'}
Sanctioned Amount          ${String(account.sanctioned_amount || '-').padEnd(20)} REPAYMENT TENURE           ${account.tenure_months || '-'}
CURRENT BALANCE            ${String(account.current_balance || 0).padEnd(20)} EMI AMOUNT                 ${account.emi_amount || '-'}
CASH LIMIT                 -                    PAYMENT FREQUENCY          ${account.payment_frequency || '-'}
AMOUNT OVERDUE             ${String(account.overdue_amount || 0).padEnd(20)} ACTUAL PAYMENT AMOUNT      -

DATES
DATE OPENED/DISBURSED      ${account.start_date ? format(new Date(account.start_date), 'yyyy-MM-dd') : '-'}
DATE CLOSED                ${account.closed_date ? format(new Date(account.closed_date), 'yyyy-MM-dd') : '-'}
DATE REPORTED              ${format(new Date(), 'yyyy-MM-dd')}

PAYMENT HISTORY (UP TO 36 MONTHS)
DAYS PAST DUE (No.of Days) or ASSET CLASSIFICATION (STD, SNA, SUB, DBT, LSS)

MONTH/YEAR    DEC   NOV   OCT   SEP   AUG   JUL   JUN   MAY   APR   MAR   FEB   JAN
2025           0     0     0     0     0     0     0     0     0     0     0     0
2024           0     0     0     0     0     0     0     0     0     0     0     0

COLLATERAL
VALUE OF COLLATERAL        ${account.collateral_value || '-'}
TYPE OF COLLATERAL         ${account.collateral_type || '-'}

Default
SUIT FILED / WITFUL DEFAULT           -
CREDIT FACILITY STATUS                -
WRITTEN-OFF AMOUNT(TOTAL)             -
WRITTEN-OFF AMOUNT(PRINCIPAL)         -
SETTLEMENT AMOUNT                     -
`;
    });

    const enquiryDetails = (report.enquiries as any[]) || [];
    if (enquiryDetails.length > 0) {
      content += `
${'─'.repeat(80)}
ENQUIRY INFORMATION
${'─'.repeat(80)}

MEMBER NAME                         DATE OF ENQUIRY         ENQUIRY PURPOSE
`;
      enquiryDetails.forEach((enquiry: any) => {
        content += `${((enquiry.institution || '-') as string).padEnd(36)}${(enquiry.date ? format(new Date(enquiry.date), 'yyyy-MM-dd') : '-').padEnd(24)}${enquiry.purpose || '-'}\n`;
      });
    }

    content += `
${'═'.repeat(80)}
                        END OF CREDIT INFORMATION REPORT
${'═'.repeat(80)}

Disclaimer: All information contained in this credit report has been collated by 
${config.fullName} based on information provided by its various members("Members"), 
as part of periodic data submissions and Members are required to ensure accuracy, 
completeness and veracity of the information submitted.
`;

    return content;
  };

  const handleDownloadPDF = (bureau: string) => {
    if (!report) return;
    const content = generatePDFContent(bureau);
    const config = bureauConfig[bureau];
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_Report_${report.pan_number}_${format(new Date(), 'yyyyMMdd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-300">Loading your credit report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-20 h-20 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Report Found</h2>
          <p className="text-slate-400 mb-6">You haven't checked your credit score yet.</p>
          <Button onClick={() => navigate(createPageUrl('CheckScore'))} className="bg-[#0077b6] hover:bg-[#005f8a]">
            Check Your Score Now
          </Button>
        </div>
      </div>
    );
  }

  // Check if report is locked
  if (report.report_status === 'locked') {
    const bureauCount = report.selected_bureaus?.length || 
      [report.cibil_score, report.experian_score, report.equifax_score, report.crif_score].filter(s => s).length || 1;
    const totalAmount = bureauCount * 99;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Report Locked</h2>
          <p className="text-slate-400 mb-6">
            This credit report is locked. Complete payment to view full report details.
          </p>
          
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Name</span>
              <span className="text-white">{report.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">PAN</span>
              <span className="text-white">{report.pan_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Bureaus</span>
              <span className="text-white">{bureauCount} Bureau(s)</span>
            </div>
          </div>

          <Button
            onClick={() => navigate(createPageUrl('UnlockReport') + `?reportId=${report.id}`)}
            className="w-full bg-amber-600 hover:bg-amber-700 gap-2 h-12"
          >
            <Unlock className="w-5 h-5" />
            Pay ₹{totalAmount} to Unlock Report
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="w-full mt-3 text-slate-400"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => navigate(createPageUrl('Dashboard'))}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0077b6] to-[#005f8a] rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Credit Report</h1>
                  <p className="text-sm text-slate-400">Individual Bureau Reports</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleDownloadPDF(selectedBureau)} 
                className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4" /> Download {bureauConfig[selectedBureau].name}
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl('CheckScore'))} 
                className="bg-[#0077b6] hover:bg-[#005f8a] gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bureau Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={selectedBureau} onValueChange={setSelectedBureau} className="w-full">
          <TabsList className="grid grid-cols-4 bg-slate-800/50 border border-slate-700 mb-6 h-auto p-1">
            {Object.entries(bureauConfig).map(([key, config]) => {
              const score = getScoreForBureau(key);
              const hasPurchased = score && score > 0;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key} 
                  disabled={!hasPurchased}
                  className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-slate-700 data-[state=active]:text-white disabled:opacity-50"
                >
                  <span className="text-lg">{config.logo}</span>
                  <span className="font-medium">{config.name}</span>
                  <span className="text-xs font-bold">{hasPurchased ? score : 'N/A'}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(bureauConfig).map((bureau) => (
            <TabsContent key={bureau} value={bureau} className="mt-0">
              <div ref={reportRef} className="bg-slate-800/30 rounded-xl border border-slate-700 p-1">
                <BureauReportView report={report} bureau={bureau} />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Score Repair CTA */}
        <ScoreRepairCTA score={getScoreForBureau(selectedBureau)} />
        
        {/* AI Analysis */}
        <AIReportAnalysis report={report} />
      </div>
    </div>
  );
}
