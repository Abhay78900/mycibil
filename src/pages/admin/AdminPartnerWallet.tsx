import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Wallet, 
  Plus, 
  Minus, 
  Loader2, 
  ArrowUpCircle, 
  ArrowDownCircle,
  History,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Partner {
  id: string;
  name: string;
  franchise_id: string;
  wallet_balance: number;
  total_revenue: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  status: string;
  metadata: any;
}

export default function AdminPartnerWallet() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isDebitDialogOpen, setIsDebitDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin' && partnerId) {
      loadData();
    }
  }, [userRole, loading, navigate, partnerId]);

  const loadData = async () => {
    try {
      // Load partner data
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;
      setPartner(partnerData);

      // Load transactions for this partner
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load partner data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreditWallet = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for this credit');
      return;
    }

    setIsProcessing(true);
    try {
      const creditAmount = parseFloat(amount);
      const newBalance = (partner?.wallet_balance || 0) + creditAmount;

      // Update partner wallet balance
      const { error: updateError } = await supabase
        .from('partners')
        .update({ wallet_balance: newBalance })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          partner_id: partnerId,
          amount: creditAmount,
          type: 'wallet_credit',
          description: `Admin Credit: ${reason}`,
          status: 'success' as const,
          metadata: { 
            admin_action: true, 
            reason,
            previous_balance: partner?.wallet_balance || 0,
            new_balance: newBalance
          }
        }]);

      if (txError) throw txError;

      toast.success(`Successfully credited ₹${creditAmount.toLocaleString()} to wallet`);
      setIsCreditDialogOpen(false);
      setAmount('');
      setReason('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to credit wallet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDebitWallet = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for this debit');
      return;
    }

    const debitAmount = parseFloat(amount);
    if (debitAmount > (partner?.wallet_balance || 0)) {
      toast.error('Debit amount exceeds wallet balance');
      return;
    }

    setIsProcessing(true);
    try {
      const newBalance = (partner?.wallet_balance || 0) - debitAmount;

      // Update partner wallet balance
      const { error: updateError } = await supabase
        .from('partners')
        .update({ wallet_balance: newBalance })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          partner_id: partnerId,
          amount: -debitAmount,
          type: 'wallet_debit',
          description: `Admin Debit: ${reason}`,
          status: 'success' as const,
          metadata: { 
            admin_action: true, 
            reason,
            previous_balance: partner?.wallet_balance || 0,
            new_balance: newBalance
          }
        }]);

      if (txError) throw txError;

      toast.success(`Successfully debited ₹${debitAmount.toLocaleString()} from wallet`);
      setIsDebitDialogOpen(false);
      setAmount('');
      setReason('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to debit wallet');
    } finally {
      setIsProcessing(false);
    }
  };

  // Separate transactions by type
  const walletLoads = transactions.filter(tx => 
    tx.type === 'wallet_credit' || tx.type === 'wallet_load'
  );
  const reportDeductions = transactions.filter(tx => 
    tx.type === 'report_generation' || tx.type === 'wallet_debit'
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Partner not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/partners')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Wallet Management</h1>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{partner.name}</span>
                <Badge variant="outline" className="font-mono">{partner.franchise_id}</Badge>
              </div>
            </div>
          </div>

          {/* Wallet Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-3xl font-bold text-foreground">
                      ₹{Number(partner.wallet_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{Number(partner.total_revenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <ArrowUpCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-3xl font-bold text-foreground">{transactions.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <History className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <Button onClick={() => setIsCreditDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Balance
            </Button>
            <Button variant="outline" onClick={() => setIsDebitDialogOpen(true)} className="gap-2">
              <Minus className="w-4 h-4" />
              Deduct Balance
            </Button>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
                  <TabsTrigger value="credits">Credits ({walletLoads.length})</TabsTrigger>
                  <TabsTrigger value="debits">Debits ({reportDeductions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <TransactionTable transactions={transactions} />
                </TabsContent>
                <TabsContent value="credits">
                  <TransactionTable transactions={walletLoads} />
                </TabsContent>
                <TabsContent value="debits">
                  <TransactionTable transactions={reportDeductions} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Credit Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Add Balance to Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Enter reason for this credit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleCreditWallet} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Credit Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debit Dialog */}
      <Dialog open={isDebitDialogOpen} onOpenChange={setIsDebitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-destructive" />
              Deduct Balance from Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold">₹{Number(partner.wallet_balance || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Enter reason for this debit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              variant="destructive"
              onClick={handleDebitWallet} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Minus className="w-4 h-4 mr-2" />
              )}
              Debit Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No transactions found</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>
              {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
            </TableCell>
            <TableCell>
              <Badge variant={tx.amount >= 0 ? 'default' : 'secondary'} className="gap-1">
                {tx.amount >= 0 ? (
                  <ArrowUpCircle className="w-3 h-3" />
                ) : (
                  <ArrowDownCircle className="w-3 h-3" />
                )}
                {tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[300px] truncate">
              {tx.description || '-'}
            </TableCell>
            <TableCell>
              <span className={tx.amount >= 0 ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={tx.status === 'success' ? 'default' : 'secondary'}>
                {tx.status?.toUpperCase()}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
