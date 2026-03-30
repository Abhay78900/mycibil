import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, FileText, Loader2, Eye, Lock, Unlock, User, Building2, ChevronDown, CalendarIcon, X, Filter } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReportWithPartner {
  id: string; full_name: string; pan_number: string; average_score: number | null;
  selected_bureaus: string[]; report_status: string; created_at: string;
  partner_id: string | null; partner_name?: string; mobile_number?: string;
}

const STATUS_OPTIONS = [
  { value: 'locked', label: 'Locked' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

const BUREAU_OPTIONS = [
  { value: 'cibil', label: 'CIBIL' },
  { value: 'experian', label: 'Experian' },
  { value: 'equifax', label: 'Equifax' },
  { value: 'crif', label: 'CRIF' },
];

export default function AdminReports() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithPartner[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!loading && userRole !== 'admin') { navigate('/dashboard'); return; }
    if (!loading && userRole === 'admin') { loadData(); }
  }, [userRole, loading, navigate]);

  const loadData = async () => {
    try {
      const { data: partnersData } = await supabase.from('partners').select('id, name');
      const partnerMap = new Map((partnersData || []).map(p => [p.id, p.name]));
      setPartners(partnersData || []);
      const { data: reportsData } = await supabase.from('credit_reports').select('*').order('created_at', { ascending: false });
      setReports((reportsData || []).map(report => ({
        ...report,
        partner_name: report.partner_id ? partnerMap.get(report.partner_id) : undefined,
      })));
    } catch (error) { console.error('Error loading reports:', error); } finally { setIsLoading(false); }
  };

  const toggleFilter = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== 'all') count++;
    if (partnerFilter !== 'all') count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedBureaus.length > 0) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [sourceFilter, partnerFilter, selectedStatuses, selectedBureaus, dateFrom, dateTo]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setPartnerFilter('all');
    setSelectedStatuses([]);
    setSelectedBureaus([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setVisibleCount(10);
  };

  const filteredReports = useMemo(() => reports.filter(report => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      report.full_name?.toLowerCase().includes(search) ||
      report.pan_number?.toLowerCase().includes(search) ||
      report.mobile_number?.toLowerCase().includes(search) ||
      report.partner_name?.toLowerCase().includes(search);
    const matchesSource = sourceFilter === 'all' || (sourceFilter === 'user' && !report.partner_id) || (sourceFilter === 'partner' && !!report.partner_id);
    const matchesPartner = partnerFilter === 'all' || report.partner_id === partnerFilter;
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(report.report_status);
    const matchesBureau = selectedBureaus.length === 0 || selectedBureaus.some(b => report.selected_bureaus?.includes(b));
    const reportDate = report.created_at ? new Date(report.created_at) : null;
    const matchesDateFrom = !dateFrom || (reportDate && !isBefore(reportDate, startOfDay(dateFrom)));
    const matchesDateTo = !dateTo || (reportDate && !isAfter(reportDate, endOfDay(dateTo)));
    return matchesSearch && matchesSource && matchesPartner && matchesStatus && matchesBureau && matchesDateFrom && matchesDateTo;
  }), [reports, searchTerm, sourceFilter, partnerFilter, selectedStatuses, selectedBureaus, dateFrom, dateTo]);

  const visibleReports = filteredReports.slice(0, visibleCount);

  if (loading || isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">All Reports</h1>
          <p className="text-muted-foreground mt-1">View all generated credit reports</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 self-start"><FileText className="w-4 h-4 mr-2" />{reports.length} Reports</Badge>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          {/* Row 1: Search + Source + Partner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name, PAN, mobile, partner..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }} className="pl-10" />
            </div>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPartnerFilter('all'); setVisibleCount(10); }}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
            {sourceFilter === 'partner' && (
              <Select value={partnerFilter} onValueChange={(v) => { setPartnerFilter(v); setVisibleCount(10); }}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Partner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partners.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Row 2: Status multi-select, Bureau multi-select, Date range */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            {/* Status multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start gap-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5" />
                  Status
                  {selectedStatuses.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{selectedStatuses.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { toggleFilter(selectedStatuses, opt.value, setSelectedStatuses); setVisibleCount(10); }}
                      className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors", selectedStatuses.includes(opt.value) ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}
                    >{opt.label}</button>
                  ))}
                  {selectedStatuses.length > 0 && (
                    <button onClick={() => { setSelectedStatuses([]); setVisibleCount(10); }} className="w-full text-left px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10">Clear</button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Bureau multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start gap-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5" />
                  Bureau
                  {selectedBureaus.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{selectedBureaus.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  {BUREAU_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { toggleFilter(selectedBureaus, opt.value, setSelectedBureaus); setVisibleCount(10); }}
                      className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors", selectedBureaus.includes(opt.value) ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground")}
                    >{opt.label}</button>
                  ))}
                  {selectedBureaus.length > 0 && (
                    <button onClick={() => { setSelectedBureaus([]); setVisibleCount(10); }} className="w-full text-left px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10">Clear</button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start gap-2 w-full sm:w-auto", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setVisibleCount(10); }}
                  disabled={(date) => dateTo ? isAfter(date, dateTo) : false}
                  initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start gap-2 w-full sm:w-auto", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setVisibleCount(10); }}
                  disabled={(date) => dateFrom ? isBefore(date, dateFrom) : false}
                  initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-destructive hover:text-destructive w-full sm:w-auto">
                <X className="w-3.5 h-3.5" />Clear all ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {(selectedStatuses.length > 0 || selectedBureaus.length > 0 || dateFrom || dateTo) && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(s => (
                <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { toggleFilter(selectedStatuses, s, setSelectedStatuses); setVisibleCount(10); }}>
                  {s.toUpperCase()}<X className="w-3 h-3" />
                </Badge>
              ))}
              {selectedBureaus.map(b => (
                <Badge key={b} variant="secondary" className="gap-1 cursor-pointer" onClick={() => { toggleFilter(selectedBureaus, b, setSelectedBureaus); setVisibleCount(10); }}>
                  {b.toUpperCase()}<X className="w-3 h-3" />
                </Badge>
              ))}
              {dateFrom && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateFrom(undefined); setVisibleCount(10); }}>
                  From: {format(dateFrom, 'MMM dd')}<X className="w-3 h-3" />
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setDateTo(undefined); setVisibleCount(10); }}>
                  To: {format(dateTo, 'MMM dd')}<X className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>PAN</TableHead><TableHead>Source</TableHead>
                  <TableHead>Average Score</TableHead><TableHead>Selected Bureaus</TableHead>
                  <TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.full_name}</TableCell>
                    <TableCell><span className="font-mono text-sm">{report.pan_number}</span></TableCell>
                    <TableCell>
                      {report.partner_id ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1"><Building2 className="w-3 h-3" />Partner</Badge>
                          {report.partner_name && (<span className="text-xs text-muted-foreground">{report.partner_name}</span>)}
                        </div>
                      ) : (<Badge variant="outline" className="gap-1"><User className="w-3 h-3" />User</Badge>)}
                    </TableCell>
                    <TableCell><span className="font-bold text-primary">{report.average_score || 'N/A'}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {report.selected_bureaus?.map((bureau: string) => (<Badge key={bureau} variant="outline" className="text-xs capitalize">{bureau}</Badge>))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.report_status === 'unlocked' ? 'default' : 'secondary'} className="gap-1">
                        {report.report_status === 'unlocked' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {report.report_status?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{report.created_at ? format(new Date(report.created_at), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => navigate(`/report/${report.id}`)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredReports.length === 0 && (<p className="text-center text-muted-foreground py-8">No reports found</p>)}
          {filteredReports.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)} className="gap-2">
                <ChevronDown className="w-4 h-4" />View More ({filteredReports.length - visibleCount} remaining)
              </Button>
            </div>
          )}
          {filteredReports.length > 0 && (<p className="text-center text-muted-foreground text-sm pt-2">Showing {visibleReports.length} of {filteredReports.length} reports</p>)}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
