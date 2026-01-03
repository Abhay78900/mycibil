import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function PartnerClients() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'partner') {
      navigate('/dashboard');
      return;
    }
    if (!loading && user) {
      loadData();
    }
  }, [userRole, loading, user, navigate]);

  const loadData = async () => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!partnerData) {
        navigate('/dashboard');
        return;
      }
      setPartner(partnerData);

      const { data: reports } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      // Group by PAN to get unique clients
      const clientMap = new Map();
      (reports || []).forEach(report => {
        if (!clientMap.has(report.pan_number)) {
          clientMap.set(report.pan_number, {
            pan_number: report.pan_number,
            full_name: report.full_name,
            reports_count: 1,
            last_report: report.created_at,
            latest_score: report.average_score,
          });
        } else {
          const existing = clientMap.get(report.pan_number);
          existing.reports_count++;
        }
      });

      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.pan_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PartnerSidebar partner={partner} onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Clients</h1>
              <p className="text-muted-foreground mt-1">Manage your client base</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              {clients.length} Clients
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Reports</TableHead>
                    <TableHead>Latest Score</TableHead>
                    <TableHead>Last Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.pan_number}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold">
                              {client.full_name?.[0]?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <span className="font-medium">{client.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{client.pan_number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {client.reports_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">{client.latest_score || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        {client.last_report ? format(new Date(client.last_report), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredClients.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No clients found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
