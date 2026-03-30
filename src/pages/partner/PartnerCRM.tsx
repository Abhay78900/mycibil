import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerLayout from '@/components/layout/PartnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Plus, Phone, Mail, IndianRupee, CalendarDays, Filter, X, Lock, Upload, FileText, Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';

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

const OCCUPATIONS = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business', label: 'Business Owner' },
  { value: 'professional', label: 'Professional' },
];

const emptyForm = {
  full_name: '', mobile: '', email: '', occupation: 'salaried',
  monthly_income: '', cibil_score: '', loan_type: 'personal',
  required_amount: '', tenure_months: '', existing_emis: '',
  pan_number: '', aadhar_number: '', application_status: 'lead',
  next_followup_date: '', notes: '',
};

export default function PartnerCRM() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [crmEnabled, setCrmEnabled] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoanType, setFilterLoanType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  // File uploads
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [salarySlipFile, setSalarySlipFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && userRole !== 'partner') { navigate('/dashboard'); return; }
    if (!loading && user) loadData();
  }, [userRole, loading, user]);

  const loadData = async () => {
    try {
      const { data: partnerData } = await supabase.from('partners').select('*').eq('owner_id', user?.id).maybeSingle();
      if (!partnerData) { navigate('/dashboard'); return; }
      setPartner(partnerData);
      setCrmEnabled((partnerData as any).is_crm_enabled ?? false);
      if ((partnerData as any).is_crm_enabled) {
        const { data: loanClients } = await supabase
          .from('loan_clients' as any)
          .select('*')
          .eq('partner_id', partnerData.id)
          .order('created_at', { ascending: false });
        setClients((loanClients as any[]) || []);
      }
    } catch (error) { console.error('Error loading CRM data:', error); }
    finally { setIsLoading(false); }
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${partner.id}/${folder}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('kyc-documents').upload(path, file);
    if (error) throw error;
    return data.path;
  };

  const handleAdd = async () => {
    if (!formData.full_name || !formData.mobile) { toast.error('Name and Mobile are required'); return; }
    setIsSaving(true);
    try {
      let bankUrl = null, salaryUrl = null;
      if (bankStatementFile) bankUrl = await uploadFile(bankStatementFile, 'bank-statements');
      if (salarySlipFile) salaryUrl = await uploadFile(salarySlipFile, 'salary-slips');

      const { error } = await supabase.from('loan_clients' as any).insert({
        partner_id: partner.id,
        full_name: formData.full_name,
        mobile: formData.mobile,
        email: formData.email || null,
        occupation: formData.occupation,
        monthly_income: parseFloat(formData.monthly_income) || 0,
        cibil_score: parseInt(formData.cibil_score) || null,
        loan_type: formData.loan_type,
        required_amount: parseFloat(formData.required_amount) || 0,
        tenure_months: parseInt(formData.tenure_months) || null,
        existing_emis: parseFloat(formData.existing_emis) || 0,
        pan_number: formData.pan_number.toUpperCase() || null,
        aadhar_number: formData.aadhar_number || null,
        bank_statement_url: bankUrl,
        salary_slip_url: salaryUrl,
        application_status: formData.application_status,
        next_followup_date: formData.next_followup_date || null,
        notes: formData.notes || null,
      } as any);
      if (error) throw error;
      toast.success('Client added successfully!');
      setIsAddOpen(false);
      setFormData({ ...emptyForm });
      setBankStatementFile(null);
      setSalarySlipFile(null);
      loadData();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSaving(false); }
  };

  const handleUpdate = async () => {
    if (!viewingClient) return;
    setIsSaving(true);
    try {
      let bankUrl = viewingClient.bank_statement_url;
      let salaryUrl = viewingClient.salary_slip_url;
      if (bankStatementFile) bankUrl = await uploadFile(bankStatementFile, 'bank-statements');
      if (salarySlipFile) salaryUrl = await uploadFile(salarySlipFile, 'salary-slips');

      const { error } = await supabase.from('loan_clients' as any).update({
        full_name: formData.full_name,
        mobile: formData.mobile,
        email: formData.email || null,
        occupation: formData.occupation,
        monthly_income: parseFloat(formData.monthly_income) || 0,
        cibil_score: parseInt(formData.cibil_score) || null,
        loan_type: formData.loan_type,
        required_amount: parseFloat(formData.required_amount) || 0,
        tenure_months: parseInt(formData.tenure_months) || null,
        existing_emis: parseFloat(formData.existing_emis) || 0,
        pan_number: formData.pan_number.toUpperCase() || null,
        aadhar_number: formData.aadhar_number || null,
        bank_statement_url: bankUrl,
        salary_slip_url: salaryUrl,
        application_status: formData.application_status,
        next_followup_date: formData.next_followup_date || null,
        notes: formData.notes || null,
      } as any).eq('id', viewingClient.id);
      if (error) throw error;
      toast.success('Client updated!');
      setIsEditOpen(false);
      setViewingClient(null);
      setBankStatementFile(null);
      setSalarySlipFile(null);
      loadData();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    const { error } = await supabase.from('loan_clients' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Client deleted');
    loadData();
  };

  const openEdit = (client: any) => {
    setViewingClient(client);
    setFormData({
      full_name: client.full_name || '',
      mobile: client.mobile || '',
      email: client.email || '',
      occupation: client.occupation || 'salaried',
      monthly_income: String(client.monthly_income || ''),
      cibil_score: String(client.cibil_score || ''),
      loan_type: client.loan_type || 'personal',
      required_amount: String(client.required_amount || ''),
      tenure_months: String(client.tenure_months || ''),
      existing_emis: String(client.existing_emis || ''),
      pan_number: client.pan_number || '',
      aadhar_number: client.aadhar_number || '',
      application_status: client.application_status || 'lead',
      next_followup_date: client.next_followup_date || '',
      notes: client.notes || '',
    });
    setBankStatementFile(null);
    setSalarySlipFile(null);
    setIsEditOpen(true);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !searchTerm || c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mobile?.includes(searchTerm) || c.pan_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoan = filterLoanType === 'all' || c.loan_type === filterLoanType;
      const matchStatus = filterStatus === 'all' || c.application_status === filterStatus;
      return matchSearch && matchLoan && matchStatus;
    });
  }, [clients, searchTerm, filterLoanType, filterStatus]);

  const statusLabel = (val: string) => APPLICATION_STATUSES.find(s => s.value === val);
  const loanLabel = (val: string) => LOAN_TYPES.find(l => l.value === val)?.label || val;

  const isFollowupSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    return isBefore(d, endOfDay(addDays(new Date(), 2)));
  };

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const maxClientLimit = (partner as any)?.max_client_limit ?? 50;
  const limitReached = clients.length >= maxClientLimit;

  if (!crmEnabled) {
    return (
      <PartnerLayout partner={partner}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">CRM Access Locked</h2>
          <p className="text-muted-foreground max-w-md mb-4">This feature is currently locked. Please contact Admin to unlock CRM access for your account.</p>
          <Badge variant="destructive" className="text-sm px-4 py-2">
            <Lock className="w-3.5 h-3.5 mr-2" />Feature Disabled by Admin
          </Badge>
        </div>
      </PartnerLayout>
    );
  }

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
      <h4 className="font-semibold text-foreground text-sm border-b pb-1">Client Profile</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Full Name *</Label><Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Client name" /></div>
        <div className="space-y-1"><Label>Mobile *</Label><Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="10-digit number" maxLength={10} /></div>
        <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" /></div>
        <div className="space-y-1"><Label>Occupation</Label>
          <Select value={formData.occupation} onValueChange={v => setFormData({...formData, occupation: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OCCUPATIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Monthly Income (₹)</Label><Input type="number" value={formData.monthly_income} onChange={e => setFormData({...formData, monthly_income: e.target.value})} placeholder="0" /></div>
        <div className="space-y-1"><Label>CIBIL Score</Label><Input type="number" value={formData.cibil_score} onChange={e => setFormData({...formData, cibil_score: e.target.value})} placeholder="300-900" /></div>
      </div>

      <h4 className="font-semibold text-foreground text-sm border-b pb-1 pt-2">Loan Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Loan Type</Label>
          <Select value={formData.loan_type} onValueChange={v => setFormData({...formData, loan_type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LOAN_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Required Amount (₹)</Label><Input type="number" value={formData.required_amount} onChange={e => setFormData({...formData, required_amount: e.target.value})} placeholder="0" /></div>
        <div className="space-y-1"><Label>Tenure (Months)</Label><Input type="number" value={formData.tenure_months} onChange={e => setFormData({...formData, tenure_months: e.target.value})} placeholder="12" /></div>
        <div className="space-y-1"><Label>Existing EMIs (₹)</Label><Input type="number" value={formData.existing_emis} onChange={e => setFormData({...formData, existing_emis: e.target.value})} placeholder="0" /></div>
      </div>

      <h4 className="font-semibold text-foreground text-sm border-b pb-1 pt-2">KYC</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>PAN Number</Label><Input value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" maxLength={10} /></div>
        <div className="space-y-1"><Label>Aadhar Number</Label><Input value={formData.aadhar_number} onChange={e => setFormData({...formData, aadhar_number: e.target.value})} placeholder="12 digits" maxLength={12} /></div>
        <div className="space-y-1"><Label>Bank Statement</Label><Input type="file" accept=".pdf,.jpg,.png" onChange={e => setBankStatementFile(e.target.files?.[0] || null)} /></div>
        <div className="space-y-1"><Label>Salary Slip</Label><Input type="file" accept=".pdf,.jpg,.png" onChange={e => setSalarySlipFile(e.target.files?.[0] || null)} /></div>
      </div>

      <h4 className="font-semibold text-foreground text-sm border-b pb-1 pt-2">Tracking</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Application Status</Label>
          <Select value={formData.application_status} onValueChange={v => setFormData({...formData, application_status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{APPLICATION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Next Follow-up</Label><Input type="date" value={formData.next_followup_date} onChange={e => setFormData({...formData, next_followup_date: e.target.value})} /></div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Internal notes" rows={2} /></div>

      <Button className="w-full" onClick={onSubmit} disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}{submitLabel}
      </Button>
    </div>
  );

  return (
    <PartnerLayout partner={partner}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Loan CRM</h1>
          <p className="text-muted-foreground mt-1">Manage loan clients and applications</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            {clients.length} / {maxClientLimit} Clients
          </Badge>
          {limitReached ? (
            <Badge variant="destructive" className="text-sm px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Limit Reached
            </Badge>
          ) : (
            <Button onClick={() => { setFormData({...emptyForm}); setBankStatementFile(null); setSalarySlipFile(null); setIsAddOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Limit warning */}
      {limitReached && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Client Limit Reached</p>
                <p className="text-sm text-muted-foreground">You have reached your maximum client limit of {maxClientLimit}. Please contact Admin to increase your limit.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search name, mobile, PAN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Select value={filterLoanType} onValueChange={setFilterLoanType}>
              <SelectTrigger className="w-full sm:w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Loan Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loan Types</SelectItem>
                {LOAN_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {APPLICATION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {(searchTerm || filterLoanType !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterLoanType('all'); setFilterStatus('all'); }}><X className="w-4 h-4 mr-1" />Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>CIBIL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => {
                  const status = statusLabel(client.application_status);
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
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setViewingClient(client); setIsViewOpen(true); }}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(client)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredClients.length === 0 && <p className="text-center text-muted-foreground py-8">No clients found</p>}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Loan Client</DialogTitle><DialogDescription>Fill in client and loan details</DialogDescription></DialogHeader>
          {renderForm(handleAdd, 'Add Client')}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          {renderForm(handleUpdate, 'Update Client')}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Client Details</DialogTitle></DialogHeader>
          {viewingClient && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Name" value={viewingClient.full_name} />
                <InfoRow label="Mobile" value={viewingClient.mobile} />
                <InfoRow label="Email" value={viewingClient.email || '—'} />
                <InfoRow label="Occupation" value={OCCUPATIONS.find(o => o.value === viewingClient.occupation)?.label || viewingClient.occupation} />
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
              {viewingClient.notes && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{viewingClient.notes}</p>
                </div>
              )}
              <Button className="w-full" onClick={() => { setIsViewOpen(false); openEdit(viewingClient); }}>
                <Pencil className="w-4 h-4 mr-2" />Edit Client
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PartnerLayout>
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
