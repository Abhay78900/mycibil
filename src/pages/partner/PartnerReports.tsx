import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerLayout from '@/components/layout/PartnerLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Loader2, Eye, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';

export default function PartnerReports() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'partner') { navigate('/dashboard'); return; }
    if (!loading && user) loadData();
  }, [userRole, loading, user, navigate]);

  const loadData = async () => {
    try {
      const { data: partnerData } = await supabase.from('partners').select('*').eq('owner_id', user?.id).maybeSingle();
      if (!partnerData) { navigate('/dashboard'); return; }
      setPartner(partnerData);
      const { data } = await supabase.from('credit_reports').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false });
      setReports(data || []);
    } catch (error) { console.error('Error loading reports:', error); } finally { setIsLoading(false); }
  };

  const filteredReports = reports.filter(report => report.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || report.pan_number?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading || isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <PartnerLayout partner={partner}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div><h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1><p className="text-muted-foreground mt-1">All generated credit reports</p></div>
        <Badge variant="outline" className="text-lg px-4 py-2 self-start"><FileText className="w-4 h-4 mr-2" />{reports.length} Reports</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>PAN</TableHead><TableHead>Score</TableHead><TableHead>Bureaus</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.full_name}</TableCell>
                    <TableCell><span className="font-mono text-sm">{report.pan_number}</span></TableCell>
                    <TableCell><span className="font-bold text-primary">{report.average_score || 'N/A'}</span></TableCell>
                    <TableCell><div className="flex gap-1 flex-wrap">{report.selected_bureaus?.map((bureau: string) => (<Badge key={bureau} variant="outline" className="text-xs">{bureau}</Badge>))}</div></TableCell>
                    <TableCell><Badge variant={report.report_status === 'unlocked' ? 'default' : 'secondary'} className="gap-1">{report.report_status === 'unlocked' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{report.report_status?.toUpperCase()}</Badge></TableCell>
                    <TableCell>{report.created_at ? format(new Date(report.created_at), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => navigate(`/report/${report.id}`)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredReports.length === 0 && (<p className="text-center text-muted-foreground py-8">No reports found</p>)}
        </CardContent>
      </Card>
    </PartnerLayout>
  );
}
