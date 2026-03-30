import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Loader2, Filter, X, CalendarDays, Phone, Eye, Building2, TrendingUp } from 'lucide-react';
import { format, isBefore, endOfDay, addDays } from 'date-fns';
import StatsCard from '@/components/admin/StatsCard';

const LOAN_TYPES = [
  { value: 'home', label: 'Home Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'lap', label: 'Loan Against Property' },
  { value: 'other', label: 'Other' },
];

const APPLICATION_STATUSES = [
  { value: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  { value: 'file_logged', label: 'File Logged', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'underwriting', label: 'Underwriting', color: 'bg-purple-100 text-purple-800' },
  { value: 'sanctioned', label: 'Sanctioned', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'disbursed', label: 'Disbursed', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

const OCCUPATIONS: Record<string, string> = {
  salaried: 'Salaried', self_employed: 'Self-Employed', business: 'Business Owner', professional: 'Professional',
};

export default function AdminLoanCRM() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoanType, setFilterLoanType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPartner, setFilterPartner] = useState('all');

  // View dialog
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== 'admin') { navigate('/dashboard'); return; }
    if (!loading && userRole === 'admin') loadData();
  }, [userRole, loading]);

  const loadData = async () => {
    try {
      const [{ data: loanClients }, { data: partnerData }] = await Promise.all([
        supabase.from('loan_clients' as any).select('*').order('created_at', { ascending: false }),
        supabase.from('partners').select('id, name, franchise_id'),
      ]);
      setClients((loanClients as any[]) || []);
      setPartners((partnerData as any[]) || []);
    } catch (error) { console.error('Error:', error); }
    finally { setIsLoading(false); }
  };

  const partnerMap = useMemo(() => {
    const map: Record<string, any> = {};
    partners.forEach(p => { map[p.id] = p; });
    return map;
  }, [partners]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !searchTerm ||
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile?.includes(searchTerm) ||
        c.pan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partnerMap[c.partner_id]?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoan = filterLoanType === 'all' || c.loan_type === filterLoanType;
      const matchStatus = filterStatus === 'all' || c.application_status === filterStatus;
      const matchPartner = filterPartner === 'all' || c.partner_id === filterPartner;
      return matchSearch && matchLoan && matchStatus && matchPartner;
    });
  }, [clients, searchTerm, filterLoanType, filterStatus, filterPartner, partnerMap]);

  const visibleClients = filteredClients.slice(0, visibleCount);

  // Stats
  const stats = useMemo(() => {
    const total = clients.length;
    const disbursed = clients.filter(c => c.application_status === 'disbursed').length;
    const totalAmount = clients.reduce((s, c) => s + Number(c.required_amount || 0), 0);
    const upcoming = clients.filter(c => c.next_followup_date && isBefore(new Date(c.next_followup_date), endOfDay(addDays(new Date(), 2)))).length;
    return { total, disbursed, totalAmount, upcoming };
  }, [clients]);

  const statusLabel = (val: string) => APPLICATION_STATUSES.find(s => s.value === val);
  const loanLabel = (val: string) => LOAN_TYPES.find(l => l.value === val)?.label || val;
  const isFollowupSoon = (date: string | null) => date ? isBefore(new Date(date), endOfDay(addDays(new Date(), 2))) : false;

  const clearFilters = () => { setSearchTerm(''); setFilterLoanType('all'); setFilterStatus('all'); setFilterPartner('all'); };
  const hasFilters = searchTerm || filterLoanType !== 'all' || filterStatus !== 'all' || filterPartner !== 'all';

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Loan CRM Monitor</h1>
          <p className="text-muted-foreground mt-1">View all partner loan clients and track progress</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 self-start">
          <Building2 className="w-4 h-4 mr-2" />{filteredClients.length} Clients
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Clients" value={stats.total} icon={Building2} />
        <StatsCard title="Disbursed" value={stats.disbursed} icon={TrendingUp} />
        <StatsCard title="Total Loan Value" value={`₹${(stats.totalAmount / 100000).toFixed(1)}L`} icon={TrendingUp} />
        <StatsCard title="Upcoming Follow-ups" value={stats.upcoming} icon={CalendarDays} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name, mobile, PAN, partner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterPartner} onValueChange={setFilterPartner}>
              <SelectTrigger className="w-full sm:w-[200px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Partner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.franchise_id})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLoanType} onValueChange={setFilterLoanType}>
              <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Loan Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loan Types</SelectItem>
                {LOAN_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {APPLICATION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" />Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>CIBIL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleClients.map(client => {
                  const status = statusLabel(client.application_status);
                  const partner = partnerMap[client.partner_id];
                  const followupSoon = isFollowupSoon(client.next_followup_date);
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-sm">{client.full_name?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{client.full_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{client.mobile}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {partner ? (
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{partner.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{partner.franchise_id}</p>
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{loanLabel(client.loan_type)}</Badge></TableCell>
                      <TableCell><span className="font-semibold">₹{Number(client.required_amount || 0).toLocaleString()}</span></TableCell>
                      <TableCell><span className="font-bold text-primary">{client.cibil_score || 'N/A'}</span></TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color || ''}`}>{status?.label || client.application_status}</span></TableCell>
                      <TableCell>
                        {client.next_followup_date ? (
                          <span className={`flex items-center gap-1 text-sm ${followupSoon ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            <CalendarDays className="w-3.5 h-3.5" />{format(new Date(client.next_followup_date), 'MMM dd')}
                          </span>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setViewingClient(client); setIsViewOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredClients.length === 0 && <p className="text-center text-muted-foreground py-8">No loan clients found</p>}
          {visibleCount < filteredClients.length && (
            <div className="text-center mt-4">
              <Button variant="outline" onClick={() => setVisibleCount(v => v + 10)}>
                View More ({filteredClients.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>View loan client information and status</DialogDescription>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Name" value={viewingClient.full_name} />
                <InfoRow label="Mobile" value={viewingClient.mobile} />
                <InfoRow label="Email" value={viewingClient.email || '—'} />
                <InfoRow label="Occupation" value={OCCUPATIONS[viewingClient.occupation] || viewingClient.occupation} />
                <InfoRow label="Monthly Income" value={`₹${Number(viewingClient.monthly_income || 0).toLocaleString()}`} />
                <InfoRow label="CIBIL Score" value={viewingClient.cibil_score || 'N/A'} />
              </div>
              <div className="border-t pt-2">
                <h4 className="text-sm font-semibold mb-2">Loan Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Loan Type" value={loanLabel(viewingClient.loan_type)} />
                  <InfoRow label="Amount" value={`₹${Number(viewingClient.required_amount || 0).toLocaleString()}`} />
                  <InfoRow label="Tenure" value={viewingClient.tenure_months ? `${viewingClient.tenure_months} months` : '—'} />
                  <InfoRow label="Existing EMIs" value={`₹${Number(viewingClient.existing_emis || 0).toLocaleString()}`} />
                </div>
              </div>
              <div className="border-t pt-2">
                <h4 className="text-sm font-semibold mb-2">KYC & Status</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="PAN" value={viewingClient.pan_number || '—'} />
                  <InfoRow label="Aadhar" value={viewingClient.aadhar_number || '—'} />
                  <InfoRow label="Status" value={statusLabel(viewingClient.application_status)?.label || viewingClient.application_status} />
                  <InfoRow label="Follow-up" value={viewingClient.next_followup_date ? format(new Date(viewingClient.next_followup_date), 'MMM dd, yyyy') : '—'} />
                </div>
              </div>
              <div className="border-t pt-2">
                <h4 className="text-sm font-semibold mb-2">Partner</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Partner" value={partnerMap[viewingClient.partner_id]?.name || '—'} />
                  <InfoRow label="Franchise ID" value={partnerMap[viewingClient.partner_id]?.franchise_id || '—'} />
                </div>
              </div>
              {viewingClient.notes && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{viewingClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 bg-accent/30 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{String(value)}</p>
    </div>
  );
}
