import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, IndianRupee, Loader2, Save, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { BureauPricing } from '@/types/bureauPricing';

export default function AdminSettings() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [bureauPricing, setBureauPricing] = useState<BureauPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPricing, setEditedPricing] = useState<Record<string, { user_price: number; partner_price: number }>>({});

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadSettings();
    }
  }, [userRole, loading, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bureau_pricing')
        .select('*')
        .order('bureau_code');
      
      if (error) throw error;
      setBureauPricing(data || []);
      
      // Initialize edited pricing with current values
      const initial: Record<string, { user_price: number; partner_price: number }> = {};
      data?.forEach(bureau => {
        initial[bureau.id] = {
          user_price: Number(bureau.user_price),
          partner_price: Number(bureau.partner_price),
        };
      });
      setEditedPricing(initial);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load pricing settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handlePriceChange = (bureauId: string, field: 'user_price' | 'partner_price', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedPricing(prev => ({
      ...prev,
      [bureauId]: {
        ...prev[bureauId],
        [field]: numValue,
      },
    }));
  };

  const handleSavePricing = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(editedPricing).map(([id, prices]) => 
        supabase
          .from('bureau_pricing')
          .update({ 
            user_price: prices.user_price, 
            partner_price: prices.partner_price 
          })
          .eq('id', id)
      );

      await Promise.all(updates);
      
      // Refresh data
      await loadSettings();
      toast.success('Pricing updated successfully!');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBureauStatus = async (bureauId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('bureau_pricing')
        .update({ is_active: !currentStatus })
        .eq('id', bureauId);
      
      setBureauPricing(prev => 
        prev.map(b => b.id === bureauId ? { ...b, is_active: !currentStatus } : b)
      );
      toast.success('Bureau status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const hasChanges = () => {
    return bureauPricing.some(bureau => {
      const edited = editedPricing[bureau.id];
      if (!edited) return false;
      return Number(bureau.user_price) !== edited.user_price || 
             Number(bureau.partner_price) !== edited.partner_price;
    });
  };

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
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure bureau-wise pricing for users and partners</p>
          </div>

          {/* Bureau-wise Pricing Configuration */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    Bureau-wise Pricing Configuration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Set individual prices for each credit bureau for Users and Partners
                  </CardDescription>
                </div>
                {hasChanges() && (
                  <Button onClick={handleSavePricing} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Bureau</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        User Price (₹)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-accent" />
                        Partner Price (₹)
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bureauPricing.map((bureau) => (
                    <TableRow key={bureau.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{bureau.bureau_name}</span>
                          <span className="text-xs text-muted-foreground uppercase">{bureau.bureau_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="w-24"
                            value={editedPricing[bureau.id]?.user_price ?? bureau.user_price}
                            onChange={(e) => handlePriceChange(bureau.id, 'user_price', e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="w-24"
                            value={editedPricing[bureau.id]?.partner_price ?? bureau.partner_price}
                            onChange={(e) => handlePriceChange(bureau.id, 'partner_price', e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bureau.is_active}
                          onCheckedChange={() => toggleBureauStatus(bureau.id, bureau.is_active)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bureauPricing.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No bureau pricing configured</p>
              )}

              {/* Pricing Summary */}
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">User Pricing Summary</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      {bureauPricing.filter(b => b.is_active).map(bureau => (
                        <div key={bureau.id} className="flex justify-between">
                          <span className="text-muted-foreground">{bureau.bureau_name}</span>
                          <span className="font-medium">₹{editedPricing[bureau.id]?.user_price ?? bureau.user_price}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-accent" />
                      <h4 className="font-semibold">Partner Pricing Summary</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      {bureauPricing.filter(b => b.is_active).map(bureau => (
                        <div key={bureau.id} className="flex justify-between">
                          <span className="text-muted-foreground">{bureau.bureau_name}</span>
                          <span className="font-medium">₹{editedPricing[bureau.id]?.partner_price ?? bureau.partner_price}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email on new report generation</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Partner Registration</Label>
                  <p className="text-sm text-muted-foreground">Allow new partner signups</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Temporarily disable report generation</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
