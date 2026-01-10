import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, Loader2, Plus, Wallet, Percent, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: string;
  name: string;
  franchise_id: string;
  owner_id: string;
  wallet_balance: number;
  commission_rate: number;
  total_revenue: number;
  status: string;
}

export default function AdminPartners() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    commission_rate: '10',
    wallet_balance: '0',
    status: 'active',
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

  const generateFranchiseId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FR-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAddPartner = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          partnerName: formData.name,
          franchiseId: generateFranchiseId(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create partner');
      }

      toast.success('Partner added successfully!');
      setIsAddDialogOpen(false);
      setFormData({ name: '', email: '', password: '', commission_rate: '10', wallet_balance: '0', status: 'active' });
      loadPartners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add partner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPartner = async () => {
    if (!editingPartner) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: formData.name,
          commission_rate: parseFloat(formData.commission_rate),
          wallet_balance: parseFloat(formData.wallet_balance),
          status: formData.status,
        })
        .eq('id', editingPartner.id);

      if (error) throw error;

      toast.success('Partner updated successfully!');
      setIsEditDialogOpen(false);
      setEditingPartner(null);
      loadPartners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update partner');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      email: '',
      password: '',
      commission_rate: String(partner.commission_rate),
      wallet_balance: String(partner.wallet_balance),
      status: partner.status || 'active',
    });
    setIsEditDialogOpen(true);
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
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Building2 className="w-4 h-4 mr-2" />
                {partners.length} Partners
              </Badge>
              <Button onClick={() => {
                setFormData({ name: '', email: '', password: '', commission_rate: '10', wallet_balance: '0', status: 'active' });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
            </div>
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
                    <TableHead>Actions</TableHead>
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
                        <span className="font-bold text-green-600">
                          ₹{Number(partner.total_revenue || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                          {partner.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/partners/${partner.id}/wallet`)}>
                            <Wallet className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(partner)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
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

      {/* Add Partner Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Partner Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter partner name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="partner@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleAddPartner} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Partner Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission">Commission Rate (%)</Label>
              <Input
                id="edit-commission"
                type="number"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-wallet">Wallet Balance (₹)</Label>
              <Input
                id="edit-wallet"
                type="number"
                value={formData.wallet_balance}
                onChange={(e) => setFormData({ ...formData, wallet_balance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleEditPartner} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Update Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}