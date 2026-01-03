import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Building2, Loader2, Plus, Wallet, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminPartners() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    franchise_id: '',
    owner_id: '',
    commission_rate: 10,
  });

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadPartners();
    }
  }, [userRole, loading, navigate]);

  const loadPartners = async () => {
    try {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const filteredPartners = partners.filter(partner => 
    partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <AdminSidebar onLogout={handleLogout} />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Partner Management</h1>
              <p className="text-muted-foreground mt-1">Manage franchise partners</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Building2 className="w-4 h-4 mr-2" />
              {partners.length} Partners
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search partners by name or franchise ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Franchise ID</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <span className="font-medium">{partner.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-accent px-2 py-1 rounded">
                          {partner.franchise_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          <span className="font-bold">₹{Number(partner.wallet_balance || 0).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-muted-foreground" />
                          <span>{partner.commission_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-success">
                          ₹{Number(partner.total_revenue || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                          {partner.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredPartners.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No partners found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
