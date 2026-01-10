import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Loader2, Eye, Lock, Unlock, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReportWithPartner {
  id: string;
  full_name: string;
  pan_number: string;
  average_score: number | null;
  selected_bureaus: string[];
  report_status: string;
  created_at: string;
  partner_id: string | null;
  partner_name?: string;
}

export default function AdminReports() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithPartner[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadData();
    }
  }, [userRole, loading, navigate]);

  const loadData = async () => {
    try {
      // Load partners first for mapping
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, name');
      
      const partnerMap = new Map((partnersData || []).map(p => [p.id, p.name]));
      setPartners(partnersData || []);

      // Load reports
      const { data: reportsData } = await supabase
        .from('credit_reports')
        .select('*')
        .order('created_at', { ascending: false });

      const reportsWithPartner = (reportsData || []).map(report => ({
        ...report,
        partner_name: report.partner_id ? partnerMap.get(report.partner_id) : undefined,
      }));

      setReports(reportsWithPartner);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.pan_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = 
      sourceFilter === 'all' ||
      (sourceFilter === 'user' && !report.partner_id) ||
      (sourceFilter === 'partner' && !!report.partner_id);
    
    const matchesPartner = 
      partnerFilter === 'all' ||
      report.partner_id === partnerFilter;

    return matchesSearch && matchesSource && matchesPartner;
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Reports</h1>
              <p className="text-muted-foreground mt-1">View all generated credit reports</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <FileText className="w-4 h-4 mr-2" />
              {reports.length} Reports
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or PAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
                {sourceFilter === 'partner' && (
                  <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Partners</SelectItem>
                      {partners.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Average Score</TableHead>
                    <TableHead>Selected Bureaus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.full_name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{report.pan_number}</span>
                      </TableCell>
                      <TableCell>
                        {report.partner_id ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                              <Building2 className="w-3 h-3" />
                              Partner
                            </Badge>
                            {report.partner_name && (
                              <span className="text-xs text-muted-foreground">{report.partner_name}</span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <User className="w-3 h-3" />
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">{report.average_score || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {report.selected_bureaus?.map((bureau: string) => (
                            <Badge key={bureau} variant="outline" className="text-xs capitalize">
                              {bureau}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={report.report_status === 'unlocked' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {report.report_status === 'unlocked' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {report.report_status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.created_at ? format(new Date(report.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(`/report/${report.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredReports.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No reports found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
