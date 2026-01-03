import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Plus, Loader2, ArrowUpRight, ArrowDownLeft, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PartnerWallet() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
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
      // Update wallet balance
      await supabase
        .from('partners')
        .update({ wallet_balance: Number(partner.wallet_balance) + amount })
        .eq('id', partner.id);

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          partner_id: partner.id,
          amount,
          type: 'wallet_topup',
          status: 'success',
          payment_method: 'upi',
          description: 'Wallet top-up',
        });

      setPartner({ ...partner, wallet_balance: Number(partner.wallet_balance) + amount });
      toast.success(`₹${amount} added to wallet`);
      setIsDialogOpen(false);
      setAddAmount('');
      loadData();
    } catch (error) {
      toast.error('Failed to add funds');
    } finally {
      setIsAdding(false);
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
      <PartnerSidebar partner={partner} onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
            <p className="text-muted-foreground mt-1">Manage your wallet balance</p>
          </div>

          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-secondary to-secondary/80 p-8 text-secondary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-foreground/80 mb-2">Available Balance</p>
                  <p className="text-5xl font-bold">₹{Number(partner?.wallet_balance || 0).toLocaleString()}</p>
                  <p className="text-sm mt-2 text-secondary-foreground/70">
                    Commission Rate: {partner?.commission_rate}%
                  </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-background/20 hover:bg-background/30 text-secondary-foreground border-0">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Funds to Wallet</DialogTitle>
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddFunds} disabled={isAdding}>
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Add ₹{addAmount || 0}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
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
                        <span className={`font-bold ${txn.type === 'wallet_topup' ? 'text-success' : 'text-foreground'}`}>
                          {txn.type === 'wallet_topup' ? '+' : '-'}₹{Number(txn.amount).toLocaleString()}
                        </span>
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
