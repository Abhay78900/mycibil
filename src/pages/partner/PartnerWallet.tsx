import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Plus, Loader2, ArrowUpRight, ArrowDownLeft, FileText, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PartnerWallet() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isReportCountMode, reportUnitPrice, calculateReportsFromAmount, calculateRemainderAmount, getEffectiveReportCount, loading: walletModeLoading } = usePartnerWalletMode();
  const [partner, setPartner] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== 'partner') {
      navigate('/dashboard');
      return;
    }
    if (!loading && user) {
      loadData();
    }
  }, [userRole, loading, user, navigate]);

  const loadData = async () => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!partnerData) {
        navigate('/dashboard');
        return;
      }
      setPartner(partnerData);

      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      setTransactions(txns || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleAddFunds = async () => {
    const amount = Number(addAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum amount is ₹100');
      return;
    }

    setIsAdding(true);
    try {
      // Always add to wallet_balance - the report count is derived automatically
      const newBalance = Number(partner.wallet_balance || 0) + amount;
      
      await supabase
        .from('partners')
        .update({ 
          wallet_balance: newBalance,
          wallet_mode: isReportCountMode ? 'report_count' : 'amount'
        })
        .eq('id', partner.id);

      const reportsAdded = isReportCountMode ? calculateReportsFromAmount(amount) : 0;

      // Create transaction with report count info
      await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          partner_id: partner.id,
          amount,
          type: 'wallet_topup',
          status: 'success',
          payment_method: 'upi',
          description: isReportCountMode 
            ? `Added ₹${amount} (≈ ${reportsAdded} report${reportsAdded !== 1 ? 's' : ''})` 
            : 'Wallet top-up',
          metadata: isReportCountMode 
            ? { reports_added: reportsAdded, wallet_mode: 'report_count', amount_added: amount }
            : { wallet_mode: 'amount' }
        });

      setPartner({ ...partner, wallet_balance: newBalance });
      
      if (isReportCountMode) {
        toast.success(`₹${amount} added (≈ ${reportsAdded} report${reportsAdded !== 1 ? 's' : ''})`);
      } else {
        toast.success(`₹${amount} added to wallet`);
      }

      setIsDialogOpen(false);
      setAddAmount('');
      loadData();
    } catch (error) {
      toast.error('Failed to add funds');
    } finally {
      setIsAdding(false);
    }
  };
  const reportsFromAmount = addAmount ? calculateReportsFromAmount(Number(addAmount)) : 0;
  const effectiveReportCount = getEffectiveReportCount(Number(partner?.wallet_balance || 0), Number(partner?.report_count || 0));

  if (loading || isLoading || walletModeLoading) {
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
            <p className="text-muted-foreground mt-1">
              {isReportCountMode ? 'Manage your report balance' : 'Manage your wallet balance'}
            </p>
          </div>

          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-secondary to-secondary/80 p-6 text-secondary-foreground">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-secondary-foreground/80 mb-1">Wallet Overview</p>
                  <p className="text-sm text-secondary-foreground/60">
                    {isReportCountMode ? 'Report Count Mode Active' : 'Amount Mode Active'}
                  </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-background/20 hover:bg-background/30 text-secondary-foreground border-0">
                      <Plus className="w-5 h-5 mr-2" />
                      {isReportCountMode ? 'Add Reports' : 'Add Funds'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {isReportCountMode ? 'Add Reports to Wallet' : 'Add Funds to Wallet'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        placeholder="Enter amount"
                        min={100}
                        className="mt-2"
                      />
                      <p className="text-sm text-muted-foreground mt-2">Minimum: ₹100</p>
                      
                      {isReportCountMode && addAmount && (
                        <div className="mt-4 p-3 bg-accent/30 rounded-lg">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Reports you'll receive: </span>
                            <span className="font-bold text-primary">{reportsFromAmount}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            (₹{reportUnitPrice} = 1 report)
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddFunds} disabled={isAdding}>
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isReportCountMode 
                          ? `Add ${reportsFromAmount} Report(s)` 
                          : `Add ₹${addAmount || 0}`
                        }
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Wallet Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Wallet Amount */}
                <div className="p-4 bg-background/10 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-secondary-foreground/70" />
                    <p className="text-sm text-secondary-foreground/70">Wallet Amount</p>
                  </div>
                  <p className="text-3xl font-bold">
                    ₹{Number(partner?.wallet_balance || 0).toLocaleString()}
                  </p>
                </div>
                
                {isReportCountMode ? (
                  <>
                    {/* Converted Reports */}
                    <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-4 h-4 text-green-300" />
                        <p className="text-sm text-green-200">Converted Reports</p>
                      </div>
                      <p className="text-3xl font-bold text-green-100">
                        {effectiveReportCount}
                      </p>
                      <p className="text-xs text-green-300/70 mt-1">
                        @ ₹{reportUnitPrice}/report
                      </p>
                    </div>
                    
                    {/* Remaining Amount */}
                    <div className="p-4 bg-amber-500/20 rounded-lg border border-amber-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-amber-300" />
                        <p className="text-sm text-amber-200">Remaining Amount</p>
                      </div>
                      <p className="text-3xl font-bold text-amber-100">
                        ₹{calculateRemainderAmount(Number(partner?.wallet_balance || 0))}
                      </p>
                      <p className="text-xs text-amber-300/70 mt-1">
                        (Carried forward)
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-background/10 rounded-lg backdrop-blur-sm md:col-span-2">
                    <p className="text-sm text-secondary-foreground/70 mb-2">Commission Rate</p>
                    <p className="text-3xl font-bold">{partner?.commission_rate}%</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>{isReportCountMode ? 'Reports/Amount' : 'Amount'}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const metadata = txn.metadata as { reports_added?: number; reports_deducted?: number } | null;
                    return (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {txn.type === 'wallet_topup' ? (
                              <ArrowDownLeft className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-destructive" />
                            )}
                            <span className="capitalize">{txn.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {txn.description || '-'}
                        </TableCell>
                        <TableCell>
                          {isReportCountMode && metadata?.reports_added ? (
                            <span className="font-bold text-success">
                              +{metadata.reports_added} reports
                            </span>
                          ) : isReportCountMode && metadata?.reports_deducted ? (
                            <span className="font-bold text-foreground">
                              -{metadata.reports_deducted} report
                            </span>
                          ) : (
                            <span className={`font-bold ${txn.type === 'wallet_topup' ? 'text-success' : 'text-foreground'}`}>
                              {txn.type === 'wallet_topup' ? '+' : '-'}₹{Number(txn.amount).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={txn.status === 'success' ? 'default' : 'secondary'}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {txn.created_at ? format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
