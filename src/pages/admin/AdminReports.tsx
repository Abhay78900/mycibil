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
import { Search, FileText, Loader2, Eye, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReportWithSource {
  id: string;
  full_name: string;
  pan_number: string;
  average_score: number | null;
  selected_bureaus: string[] | null;
  report_status: string | null;
  created_at: string;
  user_id: string;
  partner_id: string | null;
  source: 'user' | 'partner';
  partner_name?: string;
}

export default function AdminReports() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithSource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'partner'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadReports();
    }
  }, [userRole, loading, navigate]);

  const loadReports = async () => {
    try {
      // Only fetch unlocked/generated reports
      const { data: reportsData } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('report_status', 'unlocked')
        .order('created_at', { ascending: false });

      // Fetch partner names for partner-generated reports
      const { data: partnersData } = await supabase
        .from('partners')
        .select('id, name');

      const partnerMap = new Map(partnersData?.map(p => [p.id, p.name]) || []);

      const enrichedReports: ReportWithSource[] = (reportsData || []).map(report => ({
        ...report,
        source: report.partner_id ? 'partner' : 'user',
        partner_name: report.partner_id ? partnerMap.get(report.partner_id) : undefined,
      }));

      setReports(enrichedReports);
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
      report.pan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.partner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = sourceFilter === 'all' || report.source === sourceFilter;
    
    return matchesSearch && matchesSource;
  });

  const userReportsCount = reports.filter(r => r.source === 'user').length;
  const partnerReportsCount = reports.filter(r => r.source === 'partner').length;

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
              <h1 className="text-3xl font-bold text-foreground">Report Repository</h1>
              <p className="text-muted-foreground mt-1">All successfully generated credit reports</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-2 gap-2">
                <User className="w-4 h-4" />
                {userReportsCount} User
              </Badge>
              <Badge variant="outline" className="px-3 py-2 gap-2">
                <Building2 className="w-4 h-4" />
                {partnerReportsCount} Partner
              </Badge>
              <Badge variant="default" className="text-lg px-4 py-2">
                <FileText className="w-4 h-4 mr-2" />
                {reports.length} Total
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, PAN, or partner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="user">User Reports</SelectItem>
                    <SelectItem value="partner">Partner Reports</SelectItem>
                  </SelectContent>
                </Select>
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
                        <Badge 
                          variant={report.source === 'partner' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {report.source === 'partner' ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              {report.partner_name || 'Partner'}
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              User
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">{report.average_score || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {report.selected_bureaus?.map((bureau: string) => (
                            <Badge key={bureau} variant="outline" className="text-xs uppercase">
                              {bureau}
                            </Badge>
                          ))}
                        </div>
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
