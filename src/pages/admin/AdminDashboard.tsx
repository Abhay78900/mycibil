import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StatsCard from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, IndianRupee, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    totalReports: 0,
    totalPartners: 0,
    pendingReports: 0,
    successfulTransactions: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadDashboardData();
    }
  }, [userRole, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      const [reportsRes, partnersRes, transactionsRes, profilesRes] = await Promise.all([
        supabase.from('credit_reports').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('partners').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      const reports = reportsRes.data || [];
      const partners = partnersRes.data || [];
      const transactions = transactionsRes.data || [];
      const profiles = profilesRes.data || [];

      const successfulTxns = transactions.filter(t => t.status === 'success');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalRevenue,
        totalUsers: profiles.length,
        totalReports: reports.length,
        totalPartners: partners.length,
        pendingReports: reports.filter(r => r.report_status === 'processing').length,
        successfulTransactions: successfulTxns.length,
      });

      setRecentReports(reports.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
      <AdminSidebar onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your credit report platform</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard 
              title="Total Revenue" 
              value={`₹${stats.totalRevenue.toLocaleString()}`} 
              icon={IndianRupee}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard 
              title="Total Users" 
              value={stats.totalUsers} 
              icon={Users}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard 
              title="Reports Generated" 
              value={stats.totalReports} 
              icon={FileText}
            />
            <StatsCard 
              title="Active Partners" 
              value={stats.totalPartners} 
              icon={Building2}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Reports
                </CardTitle>
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
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-accent/50 rounded-lg">
                    <span className="text-muted-foreground">Processing Reports</span>
                    <span className="font-bold text-foreground">{stats.pendingReports}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-accent/50 rounded-lg">
                    <span className="text-muted-foreground">Successful Payments</span>
                    <span className="font-bold text-foreground">{stats.successfulTransactions}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-accent/50 rounded-lg">
                    <span className="text-muted-foreground">Active Partners</span>
                    <span className="font-bold text-foreground">{stats.totalPartners}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
