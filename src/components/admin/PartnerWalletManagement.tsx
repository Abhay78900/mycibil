import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  Plus, 
  Minus, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2,
  FileText,
  History,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Partner {
  id: string;
  name: string;
  franchise_id: string;
  wallet_balance: number;
  report_count: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  partner_id: string;
  metadata: any;
}

export default function PartnerWalletManagement() {
  const { isReportCountMode, reportUnitPrice, calculateReportsFromAmount, calculateRemainderAmount, loading: walletModeLoading } = usePartnerWalletMode();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!walletModeLoading) {
      loadData();
    }
  }, [walletModeLoading]);

  useEffect(() => {
    if (selectedPartner) {
      loadTransactions(selectedPartner.id);
    }
  }, [selectedPartner]);

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from('partners')
        .select('id, name, franchise_id, wallet_balance, report_count')
        .order('name');
      
      setPartners(data || []);
      if (data && data.length > 0) {
        setSelectedPartner(data[0]);
      }
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (partnerId: string) => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const openDialog = (type: 'credit' | 'debit') => {
    if (!selectedPartner) {
      toast.error('Please select a partner first');
      return;
    }
    setDialogType(type);
    setAmount('');
    setReason('');
    setIsDialogOpen(true);
  };

  const handleWalletAction = async () => {
    if (!selectedPartner) return;
    
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    if (dialogType === 'debit' && amountNum > selectedPartner.wallet_balance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setIsSaving(true);
    try {
      const newBalance = dialogType === 'credit' 
        ? selectedPartner.wallet_balance + amountNum
        : selectedPartner.wallet_balance - amountNum;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('partners')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedPartner.id);

      if (updateError) throw updateError;

      // Create transaction log
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({
          partner_id: selectedPartner.id,
          amount: amountNum,
          type: dialogType === 'credit' ? 'admin_credit' : 'admin_debit',
          status: 'success',
          description: reason.trim(),
          metadata: {
            admin_action: true,
            action_type: dialogType,
            reason: reason.trim(),
            timestamp: new Date().toISOString(),
          },
        });

      if (txnError) throw txnError;

      // Update local state
      setSelectedPartner({ ...selectedPartner, wallet_balance: newBalance });
      setPartners(partners.map(p => 
        p.id === selectedPartner.id ? { ...p, wallet_balance: newBalance } : p
      ));

      toast.success(`₹${amountNum.toLocaleString()} ${dialogType === 'credit' ? 'credited to' : 'debited from'} wallet`);
      setIsDialogOpen(false);
      loadTransactions(selectedPartner.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update wallet');
    } finally {
      setIsSaving(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'wallet_topup':
      case 'admin_credit':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'report_purchase':
      case 'admin_debit':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'wallet_topup': return 'Wallet Top-up';
      case 'admin_credit': return 'Admin Credit';
      case 'admin_debit': return 'Admin Debit';
      case 'report_purchase': return 'Report Purchase';
      default: return type.replace('_', ' ');
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filterType === 'all') return true;
    if (filterType === 'credits') return ['wallet_topup', 'admin_credit'].includes(txn.type);
    if (filterType === 'debits') return ['report_purchase', 'admin_debit'].includes(txn.type);
    return true;
  });

  if (isLoading || walletModeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getReportCount = (partner: Partner) => calculateReportsFromAmount(partner.wallet_balance);
  const getRemainderAmount = (partner: Partner) => calculateRemainderAmount(partner.wallet_balance);
  const reportsFromNewAmount = amount ? calculateReportsFromAmount(Number(amount)) : 0;

  return (
    <div className="space-y-6">
      {/* Partner Selection and Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Partner</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedPartner?.id || ''} 
              onValueChange={(id) => setSelectedPartner(partners.find(p => p.id === id) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {partner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedPartner && (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  ₹{Number(selectedPartner.wallet_balance).toLocaleString()}
                </p>
                {isReportCountMode && (
                  <div className="mt-2 p-2 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Converts to:</span>
                      <span className="font-bold text-foreground">{getReportCount(selectedPartner)} reports</span>
                    </div>
                    {getRemainderAmount(selectedPartner) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        (₹{getRemainderAmount(selectedPartner)} remainder - internal only)
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPartner.name} ({selectedPartner.franchise_id})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button 
                  onClick={() => openDialog('credit')} 
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <Plus className="w-4 h-4" />
                  Credit
                </Button>
                <Button 
                  onClick={() => openDialog('debit')} 
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Minus className="w-4 h-4" />
                  Debit
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transaction History */}
      {selectedPartner && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
              <Tabs value={filterType} onValueChange={setFilterType}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="credits">Credits</TabsTrigger>
                  <TabsTrigger value="debits">Debits</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description/Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(txn.type)}
                        <span className="font-medium">{getTransactionLabel(txn.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {txn.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${
                        ['wallet_topup', 'admin_credit'].includes(txn.type) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {['wallet_topup', 'admin_credit'].includes(txn.type) ? '+' : '-'}
                        ₹{Number(txn.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.status === 'success' ? 'default' : 'secondary'}>
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.created_at 
                        ? format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm') 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No transactions found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit/Debit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-accent/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Partner</p>
              <p className="font-medium">{selectedPartner?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Current Balance: ₹{Number(selectedPartner?.wallet_balance || 0).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Reason for ${dialogType}...`}
                rows={3}
              />
            </div>

            {amount && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">New Balance After {dialogType === 'credit' ? 'Credit' : 'Debit'}</p>
                  <p className="text-xl font-bold">
                    ₹{(
                      dialogType === 'credit' 
                        ? (selectedPartner?.wallet_balance || 0) + Number(amount)
                        : (selectedPartner?.wallet_balance || 0) - Number(amount)
                    ).toLocaleString()}
                  </p>
                </div>
                {isReportCountMode && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Report Count Impact</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">This amount adds </span>
                      <span className="font-bold text-primary">{reportsFromNewAmount} report(s)</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      (₹{reportUnitPrice} = 1 report)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWalletAction} 
              disabled={isSaving}
              variant={dialogType === 'credit' ? 'default' : 'destructive'}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dialogType === 'credit' ? 'Credit' : 'Debit'} ₹{amount || 0}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}