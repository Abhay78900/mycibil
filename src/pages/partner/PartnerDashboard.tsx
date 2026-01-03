import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import WalletCard from '@/components/partner/WalletCard';
import StatsCard from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, IndianRupee, TrendingUp, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerDashboard() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    totalRevenue: 0,
    totalClients: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== 'partner') {
      navigate('/dashboard');
      return;
    }
    if (!loading && user) {
      loadPartnerData();
    }
  }, [userRole, loading, user, navigate]);

  const loadPartnerData = async () => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!partnerData) {
        toast.error('Partner account not found');
        navigate('/dashboard');
        return;
      }

      setPartner(partnerData);

      const { data: reports } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      const reportsList = reports || [];
      setRecentReports(reportsList.slice(0, 5));

      const uniqueClients = new Set(reportsList.map(r => r.pan_number)).size;

      setStats({
        totalReports: reportsList.length,
        totalRevenue: Number(partnerData.total_revenue || 0),
        totalClients: uniqueClients,
      });
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const copyFranchiseId = () => {
    navigator.clipboard.writeText(partner?.franchise_id || '');
    setCopied(true);
    toast.success('Franchise ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PartnerSidebar partner={partner} onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welcome, {partner?.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your clients and generate reports</p>
          </div>

          <Card className="mb-8 bg-gradient-to-r from-secondary/20 to-secondary/5 border-secondary/30">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Franchise ID</p>
                <p className="text-2xl font-mono font-bold text-foreground">{partner?.franchise_id}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Commission Rate: <span className="font-bold text-success">{partner?.commission_rate}%</span>
                </p>
              </div>
              <Button onClick={copyFranchiseId} variant="outline" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <WalletCard 
              balance={Number(partner?.wallet_balance || 0)} 
              onAddFunds={() => navigate('/partner/wallet')}
            />
            <StatsCard 
              title="Total Reports" 
              value={stats.totalReports} 
              icon={FileText}
            />
            <StatsCard 
              title="Total Clients" 
              value={stats.totalClients} 
              icon={Users}
            />
            <StatsCard 
              title="Total Revenue" 
              value={`₹${stats.totalRevenue.toLocaleString()}`} 
              icon={IndianRupee}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Reports
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/partner/reports')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{report.full_name}</p>
                        <p className="text-sm text-muted-foreground">{report.pan_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{report.average_score || 'N/A'}</p>
                        <p className={`text-xs font-medium ${
                          report.report_status === 'unlocked' ? 'text-success' : 'text-warning'
                        }`}>
                          {report.report_status?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentReports.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No reports yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={() => navigate('/partner/generate')}
                >
                  <FileText className="w-5 h-5" />
                  Generate New Report
                </Button>
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={() => navigate('/partner/clients')}
                >
                  <Users className="w-5 h-5" />
                  View All Clients
                </Button>
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={() => navigate('/partner/wallet')}
                >
                  <IndianRupee className="w-5 h-5" />
                  Manage Wallet
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
