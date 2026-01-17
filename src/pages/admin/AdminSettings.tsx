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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings, IndianRupee, Loader2, Save, Users, Building2, Wallet, FileText, FlaskConical, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { BureauPricing } from '@/types/bureauPricing';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import { useSandboxMode } from '@/hooks/useSandboxMode';

export default function AdminSettings() {
  const { userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { settings: walletSettings, loading: walletLoading, updateSettings: updateWalletSettings } = usePartnerWalletMode();
  const { settings: sandboxSettings, loading: sandboxLoading, updateSettings: updateSandboxSettings } = useSandboxMode();
  
  const [bureauPricing, setBureauPricing] = useState<BureauPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPricing, setEditedPricing] = useState<Record<string, { user_price: number; partner_price: number }>>({});
  
  // Partner wallet mode settings
  const [reportCountModeEnabled, setReportCountModeEnabled] = useState(false);
  const [reportUnitPrice, setReportUnitPrice] = useState(99);
  const [isSavingWalletSettings, setIsSavingWalletSettings] = useState(false);

  // Sandbox mode settings
  const [sandboxModeEnabled, setSandboxModeEnabled] = useState(true);
  const [isSavingSandboxSettings, setIsSavingSandboxSettings] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (!loading && userRole === 'admin') {
      loadSettings();
    }
  }, [userRole, loading, navigate]);

  useEffect(() => {
    if (!walletLoading) {
      setReportCountModeEnabled(walletSettings.enabled);
      setReportUnitPrice(walletSettings.report_unit_price);
    }
  }, [walletSettings, walletLoading]);

  useEffect(() => {
    if (!sandboxLoading) {
      setSandboxModeEnabled(sandboxSettings.enabled);
    }
  }, [sandboxSettings, sandboxLoading]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bureau_pricing')
        .select('*')
        .order('bureau_code');
      
      if (error) throw error;
      setBureauPricing(data || []);
      
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
      await loadSettings();
      toast.success('Pricing updated successfully!');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWalletSettings = async () => {
    if (reportUnitPrice < 1) {
      toast.error('Report unit price must be at least ₹1');
      return;
    }

    setIsSavingWalletSettings(true);
    try {
      const success = await updateWalletSettings({
        enabled: reportCountModeEnabled,
        report_unit_price: reportUnitPrice,
      });

      if (success) {
        toast.success('Partner wallet settings updated!');
      } else {
        toast.error('Failed to update wallet settings');
      }
    } finally {
      setIsSavingWalletSettings(false);
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

  const hasWalletChanges = () => {
    return reportCountModeEnabled !== walletSettings.enabled ||
           reportUnitPrice !== walletSettings.report_unit_price;
  };

  const hasSandboxChanges = () => {
    return sandboxModeEnabled !== sandboxSettings.enabled;
  };

  const handleSaveSandboxSettings = async () => {
    setIsSavingSandboxSettings(true);
    try {
      const success = await updateSandboxSettings({
        enabled: sandboxModeEnabled,
      });

      if (success) {
        toast.success(sandboxModeEnabled 
          ? 'Sandbox mode enabled - using mock data' 
          : 'Production mode enabled - using real API calls');
      } else {
        toast.error('Failed to update sandbox settings');
      }
    } finally {
      setIsSavingSandboxSettings(false);
    }
  };

  if (loading || isLoading || walletLoading || sandboxLoading) {
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
            <p className="text-muted-foreground mt-1">Configure bureau pricing, wallet modes, and API settings</p>
          </div>

          {/* Sandbox/Test Mode Settings */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sandboxModeEnabled ? 'bg-warning/20' : 'bg-score-excellent/20'}`}>
                    {sandboxModeEnabled ? (
                      <FlaskConical className="w-6 h-6 text-warning" />
                    ) : (
                      <Zap className="w-6 h-6 text-score-excellent" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      API Mode
                      <Badge variant={sandboxModeEnabled ? "secondary" : "default"} className={sandboxModeEnabled ? "bg-warning/20 text-warning" : "bg-score-excellent/20 text-score-excellent"}>
                        {sandboxModeEnabled ? 'Sandbox' : 'Production'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Switch between mock data (sandbox) and real bureau API calls (production)
                    </CardDescription>
                  </div>
                </div>
                {hasSandboxChanges() && (
                  <Button onClick={handleSaveSandboxSettings} disabled={isSavingSandboxSettings}>
                    {isSavingSandboxSettings ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-base font-semibold">Sandbox Mode</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sandboxModeEnabled 
                        ? 'Currently using mock/test data - no real API calls are made'
                        : 'Currently making real API calls to credit bureaus'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sandboxModeEnabled}
                  onCheckedChange={setSandboxModeEnabled}
                />
              </div>

              {/* Mode Explanation Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className={`transition-all ${sandboxModeEnabled ? 'ring-2 ring-warning' : 'opacity-60'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FlaskConical className="w-5 h-5 text-warning" />
                      <h4 className="font-semibold">Sandbox Mode {sandboxModeEnabled && <span className="text-xs text-warning">(Active)</span>}</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Uses mock/simulated credit scores</li>
                      <li>• No real bureau API calls</li>
                      <li>• Perfect for testing & development</li>
                      <li>• No cost per report</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className={`transition-all ${!sandboxModeEnabled ? 'ring-2 ring-score-excellent' : 'opacity-60'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-score-excellent" />
                      <h4 className="font-semibold">Production Mode {!sandboxModeEnabled && <span className="text-xs text-score-excellent">(Active)</span>}</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Real bureau API integrations</li>
                      <li>• Live credit scores from bureaus</li>
                      <li>• Production-ready data</li>
                      <li>• Requires API keys configured</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Warning when switching to production */}
              {!sandboxModeEnabled && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-warning">Production Mode Warning</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ensure all bureau API keys (CIBIL, Experian, Equifax, CRIF) are configured before enabling production mode.
                      Real API calls will incur costs per report.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partner Wallet Mode Settings */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Partner Wallet Settings
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure wallet mode for all partners
                  </CardDescription>
                </div>
                {hasWalletChanges() && (
                  <Button onClick={handleSaveWalletSettings} disabled={isSavingWalletSettings}>
                    {isSavingWalletSettings ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Settings
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Count Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-semibold">Report Count Mode</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, partner wallets track report count instead of currency balance
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reportCountModeEnabled}
                  onCheckedChange={setReportCountModeEnabled}
                />
              </div>

              {/* Report Unit Price */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Report Unit Price</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold">₹</span>
                    <Input
                      type="number"
                      min="1"
                      value={reportUnitPrice}
                      onChange={(e) => setReportUnitPrice(Number(e.target.value) || 99)}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">= 1 Report</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This value is used to convert recharge amount to report count
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium text-muted-foreground">Conversion Examples</Label>
                  <div className="space-y-1 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>₹{reportUnitPrice}</span>
                      <span className="font-medium">= 1 report</span>
                    </div>
                    <div className="flex justify-between">
                      <span>₹{reportUnitPrice * 5}</span>
                      <span className="font-medium">= 5 reports</span>
                    </div>
                    <div className="flex justify-between">
                      <span>₹{reportUnitPrice * 10}</span>
                      <span className="font-medium">= 10 reports</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Explanation Cards */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <Card className={`${!reportCountModeEnabled ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IndianRupee className="w-5 h-5 text-accent" />
                      <h4 className="font-semibold">Amount Mode {!reportCountModeEnabled && <span className="text-xs text-primary">(Active)</span>}</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Wallet stores currency balance (₹)</li>
                      <li>• Bureau-wise partner pricing applies</li>
                      <li>• Shows: "Wallet Balance: ₹X"</li>
                      <li>• Deducts exact bureau price per report</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className={`${reportCountModeEnabled ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Report Count Mode {reportCountModeEnabled && <span className="text-xs text-primary">(Active)</span>}</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Wallet stores report count</li>
                      <li>• Bureau pricing is ignored</li>
                      <li>• Shows: "Reports Remaining: X"</li>
                      <li>• Deducts 1 report per generation</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

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
                    {reportCountModeEnabled && (
                      <span className="text-warning ml-2">(Partner prices ignored in Report Count Mode)</span>
                    )}
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
                        {reportCountModeEnabled && <span className="text-xs text-warning">(Ignored)</span>}
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
                            className={`w-24 ${reportCountModeEnabled ? 'opacity-50' : ''}`}
                            value={editedPricing[bureau.id]?.partner_price ?? bureau.partner_price}
                            onChange={(e) => handlePriceChange(bureau.id, 'partner_price', e.target.value)}
                            disabled={reportCountModeEnabled}
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

                <Card className={`bg-accent/5 border-accent/20 ${reportCountModeEnabled ? 'opacity-50' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-accent" />
                      <h4 className="font-semibold">
                        Partner Pricing Summary
                        {reportCountModeEnabled && <span className="text-xs text-warning ml-2">(Not used)</span>}
                      </h4>
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
