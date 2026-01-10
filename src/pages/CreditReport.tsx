import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, ArrowLeft, LogOut, Download, RefreshCw, Loader2 } from 'lucide-react';
import BureauScoreCards from '@/components/credit/BureauScoreCards';
import BureauReportView from '@/components/credit/BureauReportView';
import ScoreRepairCTA from '@/components/credit/ScoreRepairCTA';
import ImprovementTips from '@/components/credit/ImprovementTips';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CreditReport as CreditReportType } from '@/types';

const bureauConfig: Record<string, { name: string; fullName: string; color: string; logo: string }> = {
  cibil: { name: 'CIBIL', fullName: 'TransUnion CIBIL', color: '#0077b6', logo: '🔵' },
  experian: { name: 'EXPERIAN', fullName: 'Experian', color: '#7c3aed', logo: '🟣' },
  equifax: { name: 'EQUIFAX', fullName: 'Equifax', color: '#dc2626', logo: '🔴' },
  crif: { name: 'CRIF', fullName: 'CRIF High Mark', color: '#16a34a', logo: '🟢' }
};

export default function CreditReportPage() {
  const navigate = useNavigate();
  const { reportId: paramReportId } = useParams();
  const [searchParams] = useSearchParams();
  const { userRole, signOut } = useAuth();
  const [selectedBureau, setSelectedBureau] = React.useState('cibil');
  const [isLoading, setIsLoading] = React.useState(true);
  const [report, setReport] = React.useState<CreditReportType | null>(null);

  // Fetch report from database
  React.useEffect(() => {
    const reportId = paramReportId || searchParams.get('reportId');
    if (reportId) {
      fetchReport(reportId);
    } else {
      setIsLoading(false);
    }
  }, [paramReportId, searchParams]);

  const fetchReport = async (reportId: string) => {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error || !data) {
      toast.error('Report not found');
      setIsLoading(false);
      return;
    }

    setReport(data as CreditReportType);
    setIsLoading(false);
  };

  // Auto-select first bureau with score
  React.useEffect(() => {
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

  const handleLogout = async () => { 
    await signOut(); 
    navigate('/'); 
  };

  const getScoreForBureau = (bureau: string): number => {
    if (!report) return 0;
    switch (bureau) {
      case 'cibil': return report.cibil_score || 0;
      case 'experian': return report.experian_score || 0;
      case 'equifax': return report.equifax_score || 0;
      case 'crif': return report.crif_score || 0;
      default: return report.cibil_score || 0;
    }
  };

  const handleDownload = (bureau: string) => {
    if (!report) return;
    const config = bureauConfig[bureau];
    const score = getScoreForBureau(bureau);
    
    // Generate text content for download
    const content = generateReportContent(bureau, score);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_Report_${report.pan_number}_${format(new Date(), 'yyyyMMdd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`${config.name} report downloaded successfully`);
  };

  const generateReportContent = (bureau: string, score: number): string => {
    if (!report) return '';
    const config = bureauConfig[bureau];
    const reportDate = format(new Date(), 'EEE MMM dd yyyy');
    const controlNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
    const activeLoans = Array.isArray(report.active_loans) ? report.active_loans : [];
    const creditCards = Array.isArray(report.credit_cards) ? report.credit_cards : [];

    return `
${'═'.repeat(80)}
                              ${config.fullName.toUpperCase()} REPORT
${'═'.repeat(80)}

DATE: ${reportDate}
CONTROL NUMBER: ${controlNumber}

${'─'.repeat(80)}
${config.name} SCORE: ${score}
${'─'.repeat(80)}

PERSONAL INFORMATION
Name: ${report.full_name}
PAN: ${report.pan_number}

ACCOUNT SUMMARY
Active Loans: ${activeLoans.length}
Credit Cards: ${creditCards.length}

${'═'.repeat(80)}
                        END OF CREDIT INFORMATION REPORT
${'═'.repeat(80)}
    `;
  };

  const getBackPath = () => {
    if (userRole === 'admin') return '/admin/reports';
    if (userRole === 'partner') return '/partner/reports';
    return '/dashboard';
  };

  // Convert report to mock format for components
  const getMockReport = () => {
    if (!report) return null;
    const activeLoans = Array.isArray(report.active_loans) ? report.active_loans : [];
    const creditCards = Array.isArray(report.credit_cards) ? report.credit_cards : [];
    
    return {
      id: report.id,
      full_name: report.full_name,
      pan_number: report.pan_number,
      mobile: '---',
      cibil_score: report.cibil_score,
      experian_score: report.experian_score,
      equifax_score: report.equifax_score,
      crif_score: report.crif_score,
      active_loans: activeLoans,
      closed_loans: [],
      credit_cards: creditCards,
      credit_utilization: 0,
      created_date: report.created_at || new Date().toISOString(),
      initiated_by: report.partner_id ? 'partner' as const : 'user' as const,
      improvement_tips: Array.isArray(report.improvement_tips) 
        ? (report.improvement_tips as string[]) 
        : []
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading credit report...</p>
        </div>
      </div>
    );
  }

  const mockReport = getMockReport();

  if (!mockReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Report Not Found</h2>
          <Button onClick={() => navigate(getBackPath())}>Go Back</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(getBackPath())}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl text-foreground">CreditCheck</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDownload(selectedBureau)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download {bureauConfig[selectedBureau]?.name}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/check-score')}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Report Header Info */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Credit Report - {mockReport.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>PAN: {mockReport.pan_number}</span>
            <span>Mobile: {mockReport.mobile}</span>
            <span>Generated: {format(new Date(mockReport.created_date || new Date()), 'dd MMM yyyy')}</span>
            {mockReport.initiated_by && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                Generated by: {mockReport.initiated_by === 'partner' ? 'Partner' : 'User'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Bureau Tabs */}
        <Tabs value={selectedBureau} onValueChange={setSelectedBureau} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-card border border-border">
            {Object.entries(bureauConfig).map(([key, config]) => {
              const score = getScoreForBureau(key);
              const hasPurchased = score && score > 0;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  disabled={!hasPurchased}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50"
                >
                  <span>{config.logo}</span>
                  <span className="hidden sm:inline">{config.name}</span>
                  <span className="font-bold">{hasPurchased ? score : 'N/A'}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Contents */}
          {Object.keys(bureauConfig).map((bureau) => (
            <TabsContent key={bureau} value={bureau}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BureauReportView 
                  report={mockReport}
                  bureau={bureau}
                  config={bureauConfig[bureau]}
                  score={getScoreForBureau(bureau)}
                />
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Score Repair CTA */}
        <div className="mt-6 space-y-6">
          <ScoreRepairCTA score={getScoreForBureau(selectedBureau)} />
          <ImprovementTips tips={mockReport.improvement_tips} />
        </div>
      </main>
    </div>
  );
}
