import { useState, useEffect } from 'react';
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
import { Search, FileText, Loader2, Eye, Lock, Unlock, User, Building2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface ReportWithPartner {
  id: string; full_name: string; pan_number: string; average_score: number | null;
  selected_bureaus: string[]; report_status: string; created_at: string;
  partner_id: string | null; partner_name?: string;
}

export default function AdminReports() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithPartner[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
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
      setReports((reportsData || []).map(report => ({ ...report, partner_name: report.partner_id ? partnerMap.get(report.partner_id) : undefined })));
    } catch (error) { console.error('Error loading reports:', error); } finally { setIsLoading(false); }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || report.pan_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || (sourceFilter === 'user' && !report.partner_id) || (sourceFilter === 'partner' && !!report.partner_id);
    const matchesPartner = partnerFilter === 'all' || report.partner_id === partnerFilter;
    return matchesSearch && matchesSource && matchesPartner;
  });

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
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or PAN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
            {sourceFilter === 'partner' && (
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Partner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partners.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
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
