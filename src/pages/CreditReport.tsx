import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, ArrowLeft, LogOut, Download, RefreshCw, Loader2, Lock } from 'lucide-react';
import BureauReportView from '@/components/credit/BureauReportView';
import ScoreRepairCTA from '@/components/credit/ScoreRepairCTA';
import ImprovementTips from '@/components/credit/ImprovementTips';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CreditReport as CreditReportType } from '@/types';
import { useBureauData } from '@/hooks/useBureauData';

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
  const [selectedBureau, setSelectedBureau] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [report, setReport] = React.useState<CreditReportType | null>(null);

  const reportId = paramReportId || searchParams.get('reportId') || null;

  // Bureau data hook with lazy loading and caching
  const {
    bureauCache,
    fetchBureauData,
    preloadReportData,
    getScore,
    isUnlocked,
    isLoading: isBureauLoading,
    getRawData,
    getFirstUnlockedBureau,
  } = useBureauData(reportId, report?.selected_bureaus || null);

  // Fetch report metadata from database
  React.useEffect(() => {
    if (reportId) {
      fetchReport(reportId);
    } else {
      setIsLoading(false);
    }
  }, [reportId]);

  const fetchReport = async (id: string) => {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Report not found');
      setIsLoading(false);
      return;
    }

    setReport(data as CreditReportType);
    setIsLoading(false);
  };

  // Preload report data and set first unlocked bureau when report is loaded
  React.useEffect(() => {
    if (report && reportId) {
      preloadReportData();
    }
  }, [report, reportId, preloadReportData]);

  // Auto-select first unlocked bureau once data is loaded
  React.useEffect(() => {
    if (report && !selectedBureau) {
      const firstUnlocked = getFirstUnlockedBureau();
      if (firstUnlocked) {
        setSelectedBureau(firstUnlocked);
      }
    }
  }, [report, bureauCache, selectedBureau, getFirstUnlockedBureau]);

  // Lazy load bureau data when tab changes
  React.useEffect(() => {
    if (selectedBureau && isUnlocked(selectedBureau)) {
      fetchBureauData(selectedBureau);
    }
  }, [selectedBureau, fetchBureauData, isUnlocked]);

  const handleLogout = async () => { 
    await signOut(); 
    navigate('/'); 
  };

  const handleBureauChange = (bureau: string) => {
    if (isUnlocked(bureau)) {
      setSelectedBureau(bureau);
    } else {
      toast.error(`${bureauConfig[bureau]?.name} report is locked. Please purchase to unlock.`);
    }
  };

  const handleDownload = (bureau: string) => {
    if (!report) return;
    
    // Only allow download for unlocked bureaus
    if (!isUnlocked(bureau)) {
      toast.error(`Cannot download locked bureau report`);
      return;
    }

    const config = bureauConfig[bureau];
    const score = getScore(bureau);
    
    if (!score) {
      toast.error(`No data available for ${config.name}`);
      return;
    }
    
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

  // Convert report to format for components
  const getReportData = () => {
    if (!report || !selectedBureau) return null;
    
    const activeLoans = Array.isArray(report.active_loans) ? report.active_loans : [];
    const creditCards = Array.isArray(report.credit_cards) ? report.credit_cards : [];
    
    // Only include raw data for unlocked bureaus
    return {
      id: report.id,
      user_id: report.user_id,
      partner_id: report.partner_id,
      full_name: report.full_name,
      pan_number: report.pan_number,
      date_of_birth: report.date_of_birth,
      mobile: '---',
      cibil_score: isUnlocked('cibil') ? getScore('cibil') : null,
      experian_score: isUnlocked('experian') ? getScore('experian') : null,
      equifax_score: isUnlocked('equifax') ? getScore('equifax') : null,
      crif_score: isUnlocked('crif') ? getScore('crif') : null,
      active_loans: activeLoans,
      closed_loans: [],
      credit_cards: creditCards,
      credit_utilization: 0,
      created_at: report.created_at,
      created_date: report.created_at || new Date().toISOString(),
      initiated_by: report.partner_id ? 'partner' as const : 'user' as const,
      improvement_tips: Array.isArray(report.improvement_tips) 
        ? (report.improvement_tips as string[]) 
        : [],
      // Only include raw data for the currently selected unlocked bureau
      raw_cibil_data: isUnlocked('cibil') ? getRawData('cibil') : null,
      raw_experian_data: isUnlocked('experian') ? getRawData('experian') : null,
      raw_equifax_data: isUnlocked('equifax') ? getRawData('equifax') : null,
      raw_crif_data: isUnlocked('crif') ? getRawData('crif') : null,
    };
  };

  // Get list of unlocked bureaus for display
  const getUnlockedBureausList = () => {
    return Object.keys(bureauConfig).filter(bureau => isUnlocked(bureau));
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

  const reportData = getReportData();
  const unlockedBureaus = getUnlockedBureausList();

  if (!report) {
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

  // If no bureaus are unlocked
  if (unlockedBureaus.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Bureau Reports Available</h2>
          <p className="text-muted-foreground mb-4">No bureaus were selected for this report.</p>
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
              {selectedBureau && isUnlocked(selectedBureau) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(selectedBureau)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download {bureauConfig[selectedBureau]?.name}</span>
                </Button>
              )}
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
            Credit Report - {report.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>PAN: {report.pan_number}</span>
            <span>Generated: {report.created_at ? format(new Date(report.created_at), 'dd MMM yyyy') : 'N/A'}</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
              Generated by: {report.partner_id ? 'Partner' : 'User'}
            </span>
            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
              {unlockedBureaus.length} Bureau{unlockedBureaus.length > 1 ? 's' : ''} Unlocked
            </span>
          </div>
        </motion.div>

        {/* Bureau Tabs */}
        {selectedBureau && (
          <Tabs value={selectedBureau} onValueChange={handleBureauChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-card border border-border">
              {Object.entries(bureauConfig).map(([key, config]) => {
                const score = getScore(key);
                const unlocked = isUnlocked(key);
                const loading = isBureauLoading(key);
                
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key}
                    disabled={!unlocked}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unlocked ? (
                      <>
                        <span>{config.logo}</span>
                        <span className="hidden sm:inline">{config.name}</span>
                        {loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="font-bold">{score ?? 'N/A'}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span className="hidden sm:inline">{config.name}</span>
                        <span className="font-bold text-muted-foreground">Locked</span>
                      </>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab Contents - Only render for unlocked bureaus */}
            {Object.keys(bureauConfig).map((bureau) => {
              const unlocked = isUnlocked(bureau);
              const loading = isBureauLoading(bureau);
              
              if (!unlocked) return null;
              
              return (
                <TabsContent key={bureau} value={bureau}>
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading {bureauConfig[bureau].name} report...</p>
                      </div>
                    </div>
                  ) : reportData ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BureauReportView 
                        report={reportData}
                        bureau={bureau}
                        config={bureauConfig[bureau]}
                        score={getScore(bureau) || 0}
                      />
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center py-20">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Score Repair CTA - only show for unlocked bureaus with score */}
        {selectedBureau && isUnlocked(selectedBureau) && getScore(selectedBureau) && (
          <div className="mt-6 space-y-6">
            <ScoreRepairCTA score={getScore(selectedBureau) || 0} />
            {reportData?.improvement_tips && reportData.improvement_tips.length > 0 && (
              <ImprovementTips tips={reportData.improvement_tips} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
