import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  ArrowLeft,
  Download,
  Printer,
  Loader2,
  Lock,
} from 'lucide-react';
import FullCreditReportView from '@/components/credit/FullCreditReportView';
import { bureauConfig, getBureauScore, isBureauPurchased } from '@/utils/bureauMapping';
import { CreditReport as CreditReportType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CreditReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId: paramReportId } = useParams();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<CreditReportType | null>(null);
  const [selectedBureau, setSelectedBureau] = useState('cibil');
  
  // Track where the user came from for proper back navigation
  const referrer = searchParams.get('ref') || (location.state as any)?.from || 'dashboard';

  useEffect(() => {
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

  useEffect(() => {
    if (report) {
      // Only select bureaus that were actually purchased
      const bureaus = ['cibil', 'experian', 'equifax', 'crif'];
      for (const bureau of bureaus) {
        if (isBureauPurchased(report, bureau)) {
          setSelectedBureau(bureau);
          break;
        }
      }
    }
  }, [report]);

  // Handle back navigation - go to originating portal
  const handleBackNavigation = () => {
    switch (referrer) {
      case 'admin':
        navigate(createPageUrl('AdminReportsRepository'));
        break;
      case 'partner':
        navigate(createPageUrl('PartnerReports'));
        break;
      default:
        navigate(createPageUrl('Dashboard'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!report) return;
    const content = JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CreditReport_${report.pan_number}_${selectedBureau.toUpperCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Report Found</h2>
          <p className="text-muted-foreground mb-6">The requested credit report was not found.</p>
          <Button onClick={handleBackNavigation}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (report.report_status === 'locked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Report Locked</h2>
          <p className="text-muted-foreground mb-6">
            Complete payment to view the full credit report.
          </p>
          <Button onClick={() => navigate(createPageUrl('SelectReports'))} className="w-full">
            Unlock Report
          </Button>
        </div>
      </div>
    );
  }

  // Get only the bureaus that were purchased
  const purchasedBureaus = Object.keys(bureauConfig).filter(bureau => 
    isBureauPurchased(report, bureau)
  );

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header - Hidden when printing */}
      <header className="bg-card border-b border-border sticky top-0 z-20 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBackNavigation}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground">Credit Report</h1>
                  <p className="text-xs text-muted-foreground">{report.full_name} • {report.pan_number}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bureau Tabs - Only show purchased bureaus */}
      <div className="max-w-7xl mx-auto px-4 py-6 print:px-0 print:py-0">
        {purchasedBureaus.length > 1 ? (
          <Tabs value={selectedBureau} onValueChange={setSelectedBureau}>
            <TabsList className="grid mb-6 bg-card border border-border print:hidden" style={{ gridTemplateColumns: `repeat(${purchasedBureaus.length}, 1fr)` }}>
              {purchasedBureaus.map((key) => {
                const config = bureauConfig[key];
                const score = getBureauScore(report, key);
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span>{config.logo}</span>
                    <span className="hidden sm:inline">{config.name}</span>
                    <span className="font-bold">{score ?? '---'}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {purchasedBureaus.map((bureau) => (
              <TabsContent key={bureau} value={bureau}>
                <FullCreditReportView 
                  report={report}
                  bureauName={bureauConfig[bureau].fullName}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : purchasedBureaus.length === 1 ? (
          // Single bureau - no tabs needed
          <FullCreditReportView 
            report={report}
            bureauName={bureauConfig[purchasedBureaus[0]].fullName}
          />
        ) : (
          // No bureaus found - show default
          <FullCreditReportView 
            report={report}
            bureauName="TransUnion CIBIL"
          />
        )}
      </div>
    </div>
  );
}
