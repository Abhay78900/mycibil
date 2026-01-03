import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StatsCard from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, TrendingUp, CreditCard, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminRevenue() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadRevenueData();
    }
  }, [userRole, loading, navigate]);

  const loadRevenueData = async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      const txns = data || [];
      setTransactions(txns);

      const successful = txns.filter(t => t.status === 'success');
      const pending = txns.filter(t => t.status === 'pending');
      const failed = txns.filter(t => t.status === 'failed');

      setStats({
        totalRevenue: successful.reduce((sum, t) => sum + Number(t.amount || 0), 0),
        successfulPayments: successful.length,
        pendingPayments: pending.length,
        failedPayments: failed.length,
      });
    } catch (error) {
      console.error('Error loading revenue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            <h1 className="text-3xl font-bold text-foreground">Revenue Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor all transactions and revenue</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard 
              title="Total Revenue" 
              value={`₹${stats.totalRevenue.toLocaleString()}`} 
              icon={IndianRupee}
            />
            <StatsCard 
              title="Successful" 
              value={stats.successfulPayments} 
              icon={CheckCircle2}
            />
            <StatsCard 
              title="Pending" 
              value={stats.pendingPayments} 
              icon={Clock}
            />
            <StatsCard 
              title="Failed" 
              value={stats.failedPayments} 
              icon={XCircle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {txn.created_at ? format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{txn.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-foreground">₹{Number(txn.amount || 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          {txn.payment_method || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{txn.payment_reference || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(txn.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
