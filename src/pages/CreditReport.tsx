import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import CreditScoreGauge from '@/components/credit/CreditScoreGauge';
import BureauCard from '@/components/credit/BureauCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  ArrowLeft, 
  Download, 
  Share2,
  TrendingUp,
  Building2,
  CreditCard,
  AlertTriangle,
  Lightbulb,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CreditReport() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<any>(null);
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
      .single();

    if (error || !data) {
      toast.error('Report not found');
      navigate('/dashboard');
      return;
    }

    if (data.report_status === 'locked') {
      navigate(`/payment/${reportId}`);
      return;
    }

    setReport(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeLoans = Array.isArray(report?.active_loans) ? report.active_loans : [];
  const creditCards = Array.isArray(report?.credit_cards) ? report.credit_cards : [];
  const improvementTips = Array.isArray(report?.improvement_tips) ? report.improvement_tips : [];
  const riskFlags = Array.isArray(report?.risk_flags) ? report.risk_flags : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Credit Report</h1>
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile & Score */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                <div className="gradient-primary p-6 text-primary-foreground">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{report.full_name}</p>
                      <p className="text-sm opacity-80">PAN: {report.pan_number}</p>
                      {report.date_of_birth && (
                        <p className="text-sm opacity-80">
                          DOB: {format(new Date(report.date_of_birth), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <CardContent className="pt-6 flex flex-col items-center">
                  <CreditScoreGauge score={report.average_score || 0} size={220} />
                  <p className="text-sm text-muted-foreground mt-2">Average Credit Score</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bureau Scores */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Bureau Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <BureauCard name="CIBIL" code="cibil" score={report.cibil_score} />
                  <BureauCard name="Experian" code="experian" score={report.experian_score} />
                  <BureauCard name="Equifax" code="equifax" score={report.equifax_score} />
                  <BureauCard name="CRIF" code="crif" score={report.crif_score} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="w-full justify-start mb-4 bg-muted/50">
                  <TabsTrigger value="accounts" className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Accounts
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Cards
                  </TabsTrigger>
                  <TabsTrigger value="tips" className="gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Tips
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="accounts">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-accent" />
                        Active Loans ({activeLoans.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeLoans.length > 0 ? (
                        <div className="space-y-4">
                          {activeLoans.map((loan: any, index: number) => (
                            <div key={index} className="p-4 rounded-xl border border-border hover:border-accent/30 transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-foreground">{loan.lender}</p>
                                  <p className="text-sm text-muted-foreground">{loan.loan_type}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-foreground">
                                    ₹{(loan.current_balance || 0).toLocaleString()}
                                  </p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    loan.status === 'Active' 
                                      ? 'bg-score-excellent/10 text-score-excellent' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {loan.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No active loans found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cards">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-accent" />
                        Credit Cards ({creditCards.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {creditCards.length > 0 ? (
                        <div className="space-y-4">
                          {creditCards.map((card: any, index: number) => (
                            <div key={index} className="p-4 rounded-xl border border-border hover:border-accent/30 transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-foreground">{card.bank}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Limit: ₹{(card.credit_limit || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-foreground">
                                    ₹{(card.current_balance || 0).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {Math.round((card.current_balance / card.credit_limit) * 100)}% utilized
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-accent rounded-full transition-all"
                                  style={{ width: `${Math.min((card.current_balance / card.credit_limit) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No credit cards found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tips">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-accent" />
                        Improvement Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {improvementTips.length > 0 ? (
                        <div className="space-y-3">
                          {improvementTips.map((tip: string, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-accent font-semibold text-sm">{index + 1}</span>
                              </div>
                              <p className="text-foreground">{tip}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No tips available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Risk Flags */}
            {report.is_high_risk && riskFlags.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Risk Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {riskFlags.map((flag: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{typeof flag === 'string' ? flag : flag.message || 'Risk detected'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
