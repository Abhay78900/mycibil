import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import PartnerWalletManagement from '@/components/admin/PartnerWalletManagement';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Building2, Loader2, Plus, Wallet, Percent, Pencil, Phone, Mail, MapPin, CreditCard, Eye, Lock, Unlock, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  mobile?: string;
  address?: string;
  pan_number?: string;
  email?: string;
  profile_picture_url?: string;
  notes?: string;
  city?: string;
  occupation?: string;
  investment?: string;
  contact_person?: string;
  is_crm_enabled?: boolean;
  max_client_limit?: number;
  max_sessions?: number;
}

export default function AdminPartners() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', commission_rate: '10', wallet_balance: '0', status: 'active',
    mobile: '', address: '', pan_number: '', partner_email: '', notes: '',
    city: '', occupation: '', investment: '', contact_person: '',
    max_client_limit: '50',
    max_sessions: '1',
  });

  useEffect(() => {
    if (!loading && userRole !== 'admin') { navigate('/dashboard'); return; }
    if (!loading && userRole === 'admin') { loadPartners(); }
  }, [userRole, loading, navigate]);

  const loadPartners = async () => {
    try {
      const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
      setPartners((data as any[]) || []);
    } catch (error) { console.error('Error loading partners:', error); } finally { setIsLoading(false); }
  };

  const generateFranchiseId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FR-';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleAddPartner = async () => {
    if (!formData.name || !formData.email || !formData.password) { toast.error('Please fill in all required fields'); return; }
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ email: formData.email, password: formData.password, partnerName: formData.name, franchiseId: generateFranchiseId() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create partner');
      toast.success('Partner added successfully!');
      setIsAddDialogOpen(false);
      resetFormData();
      loadPartners();
    } catch (error: any) { toast.error(error.message || 'Failed to add partner'); } finally { setIsSaving(false); }
  };

  const handleEditPartner = async () => {
    if (!editingPartner) return;
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      toast.error('Enter a valid PAN (e.g. ABCDE1234F)'); return;
    }
    if (formData.partner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.partner_email)) {
      toast.error('Enter a valid email address'); return;
    }
    if (formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile)) {
      toast.error('Enter a valid 10-digit mobile number'); return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('partners').update({
        name: formData.name,
        commission_rate: parseFloat(formData.commission_rate),
        wallet_balance: parseFloat(formData.wallet_balance),
        status: formData.status,
        mobile: formData.mobile || null,
        address: formData.address || null,
        pan_number: formData.pan_number.toUpperCase() || null,
        email: formData.partner_email || null,
        notes: formData.notes || null,
        city: formData.city || null,
        occupation: formData.occupation || null,
        investment: formData.investment || null,
        contact_person: formData.contact_person || null,
        max_client_limit: parseInt(formData.max_client_limit) || 50,
        single_session: formData.single_session,
      } as any).eq('id', editingPartner.id);
      if (error) throw error;
      toast.success('Partner updated successfully!');
      setIsEditDialogOpen(false);
      setEditingPartner(null);
      loadPartners();
    } catch (error: any) { toast.error(error.message || 'Failed to update partner'); } finally { setIsSaving(false); }
  };

  const resetFormData = () => setFormData({ name: '', email: '', password: '', commission_rate: '10', wallet_balance: '0', status: 'active', mobile: '', address: '', pan_number: '', partner_email: '', notes: '', city: '', occupation: '', investment: '', contact_person: '', max_client_limit: '50', single_session: true });

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name, email: '', password: '',
      commission_rate: String(partner.commission_rate),
      wallet_balance: String(partner.wallet_balance),
      status: partner.status || 'active',
      mobile: partner.mobile || '',
      address: partner.address || '',
      pan_number: partner.pan_number || '',
      partner_email: partner.email || '',
      notes: partner.notes || '',
      city: partner.city || '',
      occupation: partner.occupation || '',
      investment: partner.investment || '',
      contact_person: partner.contact_person || '',
      max_client_limit: String((partner as any).max_client_limit ?? 50),
      single_session: (partner as any).single_session ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const filteredPartners = partners.filter(partner =>
    partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.franchise_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.pan_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isLoading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Partner Management</h1>
          <p className="text-muted-foreground mt-1">Manage franchise partners and wallets</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Building2 className="w-4 h-4 mr-2" />{partners.length} Partners
          </Badge>
          <Button onClick={() => { resetFormData(); setIsAddDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Partner
          </Button>
        </div>
      </div>

      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList>
          <TabsTrigger value="partners"><Building2 className="w-4 h-4 mr-2" />Partners</TabsTrigger>
          <TabsTrigger value="wallets"><Wallet className="w-4 h-4 mr-2" />Wallet Management</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, franchise ID, email, PAN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarImage src={partner.profile_picture_url || undefined} alt={partner.name} />
                              <AvatarFallback className="bg-secondary text-secondary-foreground">{partner.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-medium block truncate">{partner.name}</span>
                              {partner.email && <span className="text-xs text-muted-foreground truncate block">{partner.email}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {partner.mobile && <div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" />{partner.mobile}</div>}
                            {partner.pan_number && <div className="flex items-center gap-1 text-sm"><CreditCard className="w-3 h-3 text-muted-foreground" />{partner.pan_number}</div>}
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /><span className="font-bold">₹{Number(partner.wallet_balance || 0).toLocaleString()}</span></div></TableCell>
                        <TableCell><div className="flex items-center gap-2"><Percent className="w-4 h-4 text-muted-foreground" /><span>{partner.commission_rate}%</span></div></TableCell>
                        <TableCell><Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>{partner.status?.toUpperCase()}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {(partner as any).is_crm_enabled ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-destructive" />}
                              <Switch
                                checked={(partner as any).is_crm_enabled ?? false}
                                onCheckedChange={async (checked) => {
                                  const { error } = await supabase.from('partners').update({ is_crm_enabled: checked } as any).eq('id', partner.id);
                                  if (error) { toast.error('Failed to update CRM access'); return; }
                                  toast.success(`CRM ${checked ? 'enabled' : 'disabled'} for ${partner.name}`);
                                  loadPartners();
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Max Client Limit">
                              <Users className="w-3.5 h-3.5" />
                              <Input
                                type="number"
                                className="w-16 h-7 text-xs text-center px-1"
                                value={(partner as any).max_client_limit ?? 50}
                                min={1}
                                onChange={async (e) => {
                                  const val = parseInt(e.target.value);
                                  if (isNaN(val) || val < 1) return;
                                  const { error } = await supabase.from('partners').update({ max_client_limit: val } as any).eq('id', partner.id);
                                  if (error) { toast.error('Failed to update limit'); return; }
                                  loadPartners();
                                }}
                                onBlur={() => toast.success(`Client limit updated for ${partner.name}`)}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setViewingPartner(partner); setIsViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(partner)}><Pencil className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredPartners.length === 0 && (<p className="text-center text-muted-foreground py-8">No partners found</p>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets"><PartnerWalletManagement /></TabsContent>
      </Tabs>

      {/* View Partner Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Partner Details</DialogTitle></DialogHeader>
          {viewingPartner && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-secondary">
                  <AvatarImage src={viewingPartner.profile_picture_url || undefined} alt={viewingPartner.name} />
                  <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">{viewingPartner.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{viewingPartner.name}</h3>
                  <Badge variant={viewingPartner.status === 'active' ? 'default' : 'secondary'} className="mt-1">{viewingPartner.status?.toUpperCase()}</Badge>
                  <Badge variant={viewingPartner.status === 'active' ? 'default' : 'secondary'} className="mt-1">{viewingPartner.status?.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Mobile" value={viewingPartner.mobile || 'Not provided'} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={viewingPartner.email || 'Not provided'} />
                <DetailRow icon={<CreditCard className="w-4 h-4" />} label="PAN" value={viewingPartner.pan_number || 'Not provided'} />
                <DetailRow icon={<Wallet className="w-4 h-4" />} label="Wallet" value={`₹${Number(viewingPartner.wallet_balance || 0).toLocaleString()}`} />
                <DetailRow icon={<Percent className="w-4 h-4" />} label="Commission" value={`${viewingPartner.commission_rate}%`} />
              </div>
              {viewingPartner.address && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Address</p>
                      <p className="text-sm text-foreground">{viewingPartner.address}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button className="w-full" onClick={() => { setIsViewDialogOpen(false); openEditDialog(viewingPartner); }}>
                <Pencil className="w-4 h-4 mr-2" />Edit Partner
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Partner Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Partner Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter partner name" /></div>
              <div className="space-y-2"><Label>Mobile Number</Label><Input type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="10-digit number" maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="partner@example.com" /></div>
              <div className="space-y-2"><Label>Password *</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a password" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>PAN Card Number</Label><Input value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} /></div>
              <div className="space-y-2"><Label>Gmail / Email ID</Label><Input type="email" value={formData.partner_email} onChange={(e) => setFormData({ ...formData, partner_email: e.target.value })} placeholder="partner@gmail.com" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full business address" rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} placeholder="Current occupation" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Investment</Label><Input value={formData.investment} onChange={(e) => setFormData({ ...formData, investment: e.target.value })} placeholder="Investment capacity" /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Contact person name" /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Internal notes about this partner" rows={2} /></div>
            <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })} /></div>
            <Button className="w-full" onClick={handleAddPartner} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Add Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Partner Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Mobile Number</Label><Input type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="10-digit number" maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>PAN Card Number</Label><Input value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} /></div>
              <div className="space-y-2"><Label>Email ID</Label><Input type="email" value={formData.partner_email} onChange={(e) => setFormData({ ...formData, partner_email: e.target.value })} placeholder="partner@gmail.com" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full address" rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} placeholder="Current occupation" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Investment</Label><Input value={formData.investment} onChange={(e) => setFormData({ ...formData, investment: e.target.value })} placeholder="Investment capacity" /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Contact person name" /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Internal notes about this partner" rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Wallet Balance (₹)</Label><Input type="number" value={formData.wallet_balance} onChange={(e) => setFormData({ ...formData, wallet_balance: e.target.value })} /></div>
              <div className="space-y-2"><Label>Max Client Limit</Label><Input type="number" value={formData.max_client_limit} onChange={(e) => setFormData({ ...formData, max_client_limit: e.target.value })} placeholder="50" min={1} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Limit to One Active Login</Label>
                  <Badge variant={formData.single_session ? 'default' : 'secondary'} className="text-xs">
                    {formData.single_session ? '1 Session' : 'No Limit'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Automatically sign out of other devices when this partner logs in.</p>
              </div>
              <Switch checked={formData.single_session} onCheckedChange={(checked) => setFormData({ ...formData, single_session: checked })} />
            </div>
            <Button className="w-full" onClick={handleEditPartner} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}Update Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-accent/30 rounded-lg">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
