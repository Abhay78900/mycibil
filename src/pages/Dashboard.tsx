import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import CreditScoreGauge from '@/components/credit/CreditScoreGauge';
import BureauCard from '@/components/credit/BureauCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Plus, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface CreditReport {
  id: string;
  full_name: string;
  pan_number: string;
  average_score: number | null;
  cibil_score: number | null;
  experian_score: number | null;
  equifax_score: number | null;
  crif_score: number | null;
  report_status: string | null;
  is_high_risk: boolean | null;
  risk_flags: any;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading: authLoading, userRole, profile } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<CreditReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (userRole === 'admin') {
      navigate('/admin');
      return;
    }

    if (userRole === 'partner') {
      navigate('/partner');
      return;
    }

    if (user) {
      fetchReports();
    }
  }, [user, authLoading, userRole, navigate]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const latestReport = reports.find(r => r.report_status === 'unlocked') || reports[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              Welcome, {profile?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage your credit health
            </p>
          </div>
          <Button onClick={() => navigate('/check-score')} variant="hero" className="gap-2">
            <Plus className="w-4 h-4" />
            New Report
          </Button>
        </div>

        {latestReport ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Score Card */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden">
                  <div className="gradient-primary p-6 text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <span className="text-lg font-bold">{latestReport.full_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{latestReport.full_name}</p>
                        <p className="text-sm opacity-80">PAN: {latestReport.pan_number}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="pt-6 flex flex-col items-center">
                    <CreditScoreGauge score={latestReport.average_score || 0} size={240} />
                    <p className="text-sm text-muted-foreground mt-2">Average Score</p>
                    <Button 
                      onClick={() => navigate(`/report/${latestReport.id}`)} 
                      className="mt-6 w-full"
                      variant="hero"
                    >
                      View Full Report
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Risk Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {latestReport.is_high_risk ? (
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-score-excellent/10 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-score-excellent" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {latestReport.is_high_risk ? 'High Risk Profile' : 'Healthy Profile'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {latestReport.risk_flags?.length || 0} risk flags detected
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Bureau Scores & Reports */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bureau Scores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      Bureau Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <BureauCard 
                        name="CIBIL" 
                        code="cibil" 
                        score={latestReport.cibil_score || undefined}
                        isLocked={!latestReport.cibil_score}
                      />
                      <BureauCard 
                        name="Experian" 
                        code="experian" 
                        score={latestReport.experian_score || undefined}
                        isLocked={!latestReport.experian_score}
                      />
                      <BureauCard 
                        name="Equifax" 
                        code="equifax" 
                        score={latestReport.equifax_score || undefined}
                        isLocked={!latestReport.equifax_score}
                      />
                      <BureauCard 
                        name="CRIF" 
                        code="crif" 
                        score={latestReport.crif_score || undefined}
                        isLocked={!latestReport.crif_score}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Reports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-accent" />
                      Recent Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reports.slice(0, 5).map((report) => (
                        <div 
                          key={report.id}
                          onClick={() => navigate(`/report/${report.id}`)}
                          className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{report.full_name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(report.created_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">{report.average_score || '-'}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              report.report_status === 'unlocked' 
                                ? 'bg-score-excellent/10 text-score-excellent' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {report.report_status}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {reports.length === 0 && (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No reports yet</p>
                          <Button onClick={() => navigate('/check-score')} variant="hero" className="mt-4">
                            Get Your First Report
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 font-display">No Credit Reports Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get your credit score from all 4 bureaus and start monitoring your credit health
            </p>
            <Button onClick={() => navigate('/check-score')} variant="hero" size="xl" className="gap-2">
              Check Your Credit Score
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
