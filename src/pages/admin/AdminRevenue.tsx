import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import StatsCard from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { IndianRupee, TrendingUp, CreditCard, CheckCircle2, Clock, XCircle, Loader2, Search, Filter, X, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const TYPE_OPTIONS = [
  { value: 'report_generation', label: 'Report Generation' },
  { value: 'wallet_topup', label: 'Wallet Top-up' },
  { value: 'payment', label: 'Payment' },
];

const METHOD_OPTIONS = [
  { value: 'wallet', label: 'Wallet' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'netbanking', label: 'Net Banking' },
];

export default function AdminRevenue() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, successfulPayments: 0, pendingPayments: 0, failedPayments: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!loading && userRole !== 'admin') { navigate('/dashboard'); return; }
    if (!loading && userRole === 'admin') { loadRevenueData(); }
  }, [userRole, loading, navigate]);

  const loadRevenueData = async () => {
    try {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      const txns = data || [];
      setTransactions(txns);
      const successful = txns.filter(t => t.status === 'success');
      setStats({
        totalRevenue: successful.reduce((sum, t) => sum + Number(t.amount || 0), 0),
        successfulPayments: successful.length,
        pendingPayments: txns.filter(t => t.status === 'pending').length,
        failedPayments: txns.filter(t => t.status === 'failed').length,
      });
    } catch (error) { console.error('Error loading revenue:', error); } finally { setIsLoading(false); }
  };

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    setVisibleCount(10);
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (selectedStatuses.length) c++;
    if (selectedTypes.length) c++;
    if (selectedMethods.length) c++;
    if (dateFrom || dateTo) c++;
    return c;
  }, [selectedStatuses, selectedTypes, selectedMethods, dateFrom, dateTo]);

  const clearAll = () => {
    setSearchTerm(''); setSelectedStatuses([]); setSelectedTypes([]);
    setSelectedMethods([]); setDateFrom(undefined); setDateTo(undefined); setVisibleCount(10);
  };

  const filteredTransactions = useMemo(() => transactions.filter(txn => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || txn.type?.toLowerCase().includes(q) || txn.payment_method?.toLowerCase().includes(q) || txn.payment_reference?.toLowerCase().includes(q) || txn.description?.toLowerCase().includes(q);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(txn.status);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(txn.type);
    const matchesMethod = selectedMethods.length === 0 || selectedMethods.includes(txn.payment_method);
    const txnDate = txn.created_at ? new Date(txn.created_at) : null;
    const matchesFrom = !dateFrom || (txnDate && !isBefore(txnDate, startOfDay(dateFrom)));
    const matchesTo = !dateTo || (txnDate && !isAfter(txnDate, endOfDay(dateTo)));
    return matchesSearch && matchesStatus && matchesType && matchesMethod && matchesFrom && matchesTo;
  }), [transactions, searchTerm, selectedStatuses, selectedTypes, selectedMethods, dateFrom, dateTo]);

  const visibleTxns = filteredTransactions.slice(0, visibleCount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case 'pending': return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <AdminLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Revenue Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor all transactions and revenue</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatsCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} />
        <StatsCard title="Successful" value={stats.successfulPayments} icon={CheckCircle2} />
        <StatsCard title="Pending" value={stats.pendingPayments} icon={Clock} />
        <StatsCard title="Failed" value={stats.failedPayments} icon={XCircle} />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Transaction History</CardTitle>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by type, method, reference..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }} className="pl-10" />
          </div>

          {/* Multi-select filters */}
          <div className="flex flex-wrap gap-2">
            <MultiSelectPopover label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onToggle={(v) => toggle(selectedStatuses, v, setSelectedStatuses)} onClear={() => { setSelectedStatuses([]); setVisibleCount(10); }} />
            <MultiSelectPopover label="Type" options={TYPE_OPTIONS} selected={selectedTypes} onToggle={(v) => toggle(selectedTypes, v, setSelectedTypes)} onClear={() => { setSelectedTypes([]); setVisibleCount(10); }} />
            <MultiSelectPopover label="Method" options={METHOD_OPTIONS} selected={selectedMethods} onToggle={(v) => toggle(selectedMethods, v, setSelectedMethods)} onClear={() => { setSelectedMethods([]); setVisibleCount(10); }} />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2 w-full sm:w-auto", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />{dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setVisibleCount(10); }} disabled={(date) => dateTo ? isAfter(date, dateTo) : false} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2 w-full sm:w-auto", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />{dateTo ? format(dateTo, 'MMM dd, yyyy') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setVisibleCount(10); }} disabled={(date) => dateFrom ? isBefore(date, dateFrom) : false} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-destructive hover:text-destructive w-full sm:w-auto">
                <X className="w-3.5 h-3.5" />Clear all ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Active chips */}
          {(selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedMethods.length > 0 || dateFrom || dateTo) && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => toggle(selectedStatuses, s, setSelectedStatuses)}>{s}<X className="w-3 h-3" /></Badge>)}
              {selectedTypes.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(selectedTypes, s, setSelectedTypes)}>{TYPE_OPTIONS.find(o => o.value === s)?.label || s}<X className="w-3 h-3" /></Badge>)}
              {selectedMethods.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => toggle(selectedMethods, s, setSelectedMethods)}>{s}<X className="w-3 h-3" /></Badge>)}
              {dateFrom && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateFrom(undefined); setVisibleCount(10); }}>From: {format(dateFrom, 'MMM dd')}<X className="w-3 h-3" /></Badge>}
              {dateTo && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateTo(undefined); setVisibleCount(10); }}>To: {format(dateTo, 'MMM dd')}<X className="w-3 h-3" /></Badge>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTxns.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.created_at ? format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{txn.type}</Badge></TableCell>
                    <TableCell><span className="font-bold text-foreground">₹{Number(txn.amount || 0).toLocaleString()}</span></TableCell>
                    <TableCell><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" />{txn.payment_method || 'N/A'}</div></TableCell>
                    <TableCell><span className="font-mono text-sm">{txn.payment_reference || '-'}</span></TableCell>
                    <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredTransactions.length === 0 && (<p className="text-center text-muted-foreground py-8">No transactions found</p>)}
          {filteredTransactions.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)} className="gap-2">
                <ChevronDown className="w-4 h-4" />View More ({filteredTransactions.length - visibleCount} remaining)
              </Button>
            </div>
          )}
          {filteredTransactions.length > 0 && (<p className="text-center text-muted-foreground text-sm pt-2">Showing {visibleTxns.length} of {filteredTransactions.length} transactions</p>)}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function MultiSelectPopover({ label, options, selected, onToggle, onClear }: {
  label: string; options: { value: string; label: string }[];
  selected: string[]; onToggle: (v: string) => void; onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5" />{label}
          {selected.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{selected.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {options.map(opt => (
            <button key={opt.value} onClick={() => onToggle(opt.value)}
              className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors", selected.includes(opt.value) ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}
            >{opt.label}</button>
          ))}
          {selected.length > 0 && (
            <button onClick={onClear} className="w-full text-left px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10">Clear</button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
