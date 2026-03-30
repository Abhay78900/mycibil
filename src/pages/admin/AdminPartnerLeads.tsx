import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Search, Filter, Eye, Phone, Mail, MapPin, Calendar as CalendarIcon, Users, TrendingUp, UserCheck, Clock, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import AdminLayout from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PartnerLead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, INVESTMENT_CAPACITY_LABELS, INTERESTED_SERVICES_LABELS } from '@/types/partnerLead';
import { cn } from '@/lib/utils';

interface LeadStats { total: number; newToday: number; converted: number; conversionRate: number; }

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const INVESTMENT_OPTIONS = Object.entries(INVESTMENT_CAPACITY_LABELS).map(([value, label]) => ({ value, label }));
const SERVICE_OPTIONS = Object.entries(INTERESTED_SERVICES_LABELS).map(([value, label]) => ({ value, label }));

export default function AdminPartnerLeads() {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [stats, setStats] = useState<LeadStats>({ total: 0, newToday: 0, converted: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedInvestments, setSelectedInvestments] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'admin')) navigate('/auth');
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole === 'admin') loadLeads();
  }, [user, userRole]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase.from('partner_leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const typedLeads = (data || []) as PartnerLead[];
      setLeads(typedLeads);
      const today = new Date().toDateString();
      const newToday = typedLeads.filter(l => new Date(l.created_at).toDateString() === today).length;
      const converted = typedLeads.filter(l => l.status === 'converted').length;
      setStats({ total: typedLeads.length, newToday, converted, conversionRate: typedLeads.length > 0 ? Math.round((converted / typedLeads.length) * 100) : 0 });
    } catch (error: any) {
      toast({ title: 'Error loading leads', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    setVisibleCount(10);
  };

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (selectedStatuses.length) c++;
    if (selectedInvestments.length) c++;
    if (selectedServices.length) c++;
    if (dateFrom || dateTo) c++;
    return c;
  }, [selectedStatuses, selectedInvestments, selectedServices, dateFrom, dateTo]);

  const clearAll = () => {
    setSearchQuery(''); setSelectedStatuses([]); setSelectedInvestments([]);
    setSelectedServices([]); setDateFrom(undefined); setDateTo(undefined); setVisibleCount(10);
  };

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || lead.full_name.toLowerCase().includes(q) || lead.email.toLowerCase().includes(q) || lead.mobile.includes(q) || lead.city.toLowerCase().includes(q);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(lead.status);
    const matchesInvestment = selectedInvestments.length === 0 || selectedInvestments.includes(lead.investment_capacity);
    const matchesService = selectedServices.length === 0 || selectedServices.includes(lead.interested_services);
    const leadDate = new Date(lead.created_at);
    const matchesFrom = !dateFrom || !isBefore(leadDate, startOfDay(dateFrom));
    const matchesTo = !dateTo || !isAfter(leadDate, endOfDay(dateTo));
    return matchesSearch && matchesStatus && matchesInvestment && matchesService && matchesFrom && matchesTo;
  }), [leads, searchQuery, selectedStatuses, selectedInvestments, selectedServices, dateFrom, dateTo]);

  const visibleLeads = filteredLeads.slice(0, visibleCount);

  if (authLoading || loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner Leads</h1>
          <p className="text-muted-foreground">Manage franchise lead applications</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-xl"><Users className="w-6 h-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Leads</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-xl"><Clock className="w-6 h-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">New Today</p><p className="text-2xl font-bold">{stats.newToday}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-purple-100 rounded-xl"><UserCheck className="w-6 h-6 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Converted</p><p className="text-2xl font-bold">{stats.converted}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-orange-100 rounded-xl"><TrendingUp className="w-6 h-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Conversion Rate</p><p className="text-2xl font-bold">{stats.conversionRate}%</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Row 1: Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, mobile, city..." className="pl-10" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(10); }} />
            </div>

            {/* Row 2: Multi-select filters */}
            <div className="flex flex-wrap gap-2">
              <MultiSelectPopover label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onToggle={(v) => toggle(selectedStatuses, v, setSelectedStatuses)} onClear={() => { setSelectedStatuses([]); setVisibleCount(10); }} />
              <MultiSelectPopover label="Investment" options={INVESTMENT_OPTIONS} selected={selectedInvestments} onToggle={(v) => toggle(selectedInvestments, v, setSelectedInvestments)} onClear={() => { setSelectedInvestments([]); setVisibleCount(10); }} />
              <MultiSelectPopover label="Service" options={SERVICE_OPTIONS} selected={selectedServices} onToggle={(v) => toggle(selectedServices, v, setSelectedServices)} onClear={() => { setSelectedServices([]); setVisibleCount(10); }} />

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
            {(selectedStatuses.length > 0 || selectedInvestments.length > 0 || selectedServices.length > 0 || dateFrom || dateTo) && (
              <div className="flex flex-wrap gap-2">
                {selectedStatuses.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(selectedStatuses, s, setSelectedStatuses)}>{LEAD_STATUS_LABELS[s as keyof typeof LEAD_STATUS_LABELS]}<X className="w-3 h-3" /></Badge>)}
                {selectedInvestments.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(selectedInvestments, s, setSelectedInvestments)}>{INVESTMENT_CAPACITY_LABELS[s as keyof typeof INVESTMENT_CAPACITY_LABELS]}<X className="w-3 h-3" /></Badge>)}
                {selectedServices.map(s => <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(selectedServices, s, setSelectedServices)}>{INTERESTED_SERVICES_LABELS[s as keyof typeof INTERESTED_SERVICES_LABELS]}<X className="w-3 h-3" /></Badge>)}
                {dateFrom && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateFrom(undefined); setVisibleCount(10); }}>From: {format(dateFrom, 'MMM dd')}<X className="w-3 h-3" /></Badge>}
                {dateTo && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateTo(undefined); setVisibleCount(10); }}>To: {format(dateTo, 'MMM dd')}<X className="w-3 h-3" /></Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead Applications ({filteredLeads.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Location</TableHead>
                    <TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                  ) : (
                    visibleLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell><div><p className="font-medium">{lead.full_name}</p>{lead.business_name && (<p className="text-sm text-muted-foreground">{lead.business_name}</p>)}</div></TableCell>
                        <TableCell><div className="space-y-1"><div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3" />{lead.mobile}</div><div className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</div></div></TableCell>
                        <TableCell><div className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3" />{lead.city}, {lead.state}</div></TableCell>
                        <TableCell><div className="flex items-center gap-1 text-sm"><CalendarIcon className="w-3 h-3" />{format(new Date(lead.created_at), 'dd MMM yyyy')}</div></TableCell>
                        <TableCell><Badge className={LEAD_STATUS_COLORS[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => navigate(`/admin/partner-leads/${lead.id}`)}><Eye className="w-4 h-4 mr-1" />View</Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredLeads.length > visibleCount && (
              <div className="mt-4 text-center"><Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)}><ChevronDown className="w-4 h-4 mr-2" />View More ({filteredLeads.length - visibleCount} remaining)</Button></div>
            )}
            {filteredLeads.length > 0 && (<p className="text-center text-muted-foreground text-sm pt-2">Showing {visibleLeads.length} of {filteredLeads.length} leads</p>)}
          </CardContent>
        </Card>
      </div>
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
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-60 overflow-y-auto">
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
