import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import { useBureauPricing } from '@/hooks/useBureauPricing';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import WalletCard from '@/components/partner/WalletCard';
import StatsCard from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Users, IndianRupee, TrendingUp, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const bureauOptions = [
  { id: 'cibil', label: 'CIBIL' },
  { id: 'experian', label: 'Experian' },
  { id: 'equifax', label: 'Equifax' },
  { id: 'crif', label: 'CRIF' },
];

export default function PartnerDashboard() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isReportCountMode, reportUnitPrice, getEffectiveReportCount, loading: walletModeLoading } = usePartnerWalletMode();
  const { getPartnerPrice, calculatePartnerTotal, loading: pricingLoading } = useBureauPricing();
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    totalRevenue: 0,
    totalClients: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    panNumber: '',
    dateOfBirth: '',
    gender: '',
  });
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(['cibil']);

  useEffect(() => {
    if (!loading && user) {
      loadPartnerData();
    }
  }, [loading, user, navigate]);

  const loadPartnerData = async () => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!partnerData) {
        navigate('/partner/register');
        return;
      }

      setPartner(partnerData);

      const { data: reports } = await supabase
        .from('credit_reports')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      const reportsList = reports || [];
      setRecentReports(reportsList.slice(0, 5));

      const uniqueClients = new Set(reportsList.map(r => r.pan_number)).size;

      setStats({
        totalReports: reportsList.length,
        totalRevenue: Number(partnerData.total_revenue || 0),
        totalClients: uniqueClients,
      });
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const copyFranchiseId = () => {
    navigator.clipboard.writeText(partner?.franchise_id || '');
    setCopied(true);
    toast.success('Franchise ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const bureauCount = selectedBureaus.length;
  const totalCost = isReportCountMode ? bureauCount : calculatePartnerTotal(selectedBureaus);
  const walletBalance = Number(partner?.wallet_balance || 0);
  const effectiveReportCount = getEffectiveReportCount(walletBalance, Number(partner?.report_count || 0));
  const currentBalance = isReportCountMode ? effectiveReportCount : walletBalance;
  const hasInsufficientBalance = currentBalance < totalCost;

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.panNumber || !formData.gender) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedBureaus.length === 0) {
      toast.error('Please select at least one bureau');
      return;
    }

    if (hasInsufficientBalance) {
      toast.error(isReportCountMode ? 'Insufficient reports' : 'Insufficient wallet balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const amountPaid = isReportCountMode ? 0 : totalCost;

      const { data: report, error: reportError } = await supabase
        .from('credit_reports')
        .insert({
          user_id: user?.id,
          partner_id: partner.id,
          full_name: formData.fullName,
          pan_number: formData.panNumber.toUpperCase(),
          date_of_birth: formData.dateOfBirth || null,
          selected_bureaus: selectedBureaus,
          report_status: 'processing',
          amount_paid: amountPaid,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      if (isReportCountMode) {
        const deductionAmount = reportUnitPrice * bureauCount;
        await supabase
          .from('partners')
          .update({ 
            wallet_balance: walletBalance - deductionAmount,
            total_revenue: Number(partner.total_revenue || 0) + deductionAmount,
          })
          .eq('id', partner.id);
      } else {
        await supabase
          .from('partners')
          .update({ 
            wallet_balance: walletBalance - totalCost,
            total_revenue: Number(partner.total_revenue || 0) + totalCost,
          })
          .eq('id', partner.id);
      }

      await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          partner_id: partner.id,
          report_id: report.id,
          amount: amountPaid,
          type: 'report_generation',
          status: 'success',
          payment_method: 'wallet',
          description: `Report for ${formData.fullName} - Bureaus: ${selectedBureaus.join(', ')}`,
          metadata: isReportCountMode 
            ? { wallet_mode: 'report_count', reports_deducted: bureauCount, bureaus: selectedBureaus }
            : { wallet_mode: 'amount', bureaus: selectedBureaus }
        });

      const scores = {
        cibil_score: selectedBureaus.includes('cibil') ? Math.floor(Math.random() * 300) + 600 : null,
        experian_score: selectedBureaus.includes('experian') ? Math.floor(Math.random() * 300) + 600 : null,
        equifax_score: selectedBureaus.includes('equifax') ? Math.floor(Math.random() * 300) + 600 : null,
        crif_score: selectedBureaus.includes('crif') ? Math.floor(Math.random() * 300) + 600 : null,
      };

      const validScores = Object.values(scores).filter(s => s !== null) as number[];
      const averageScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);

      await supabase
        .from('credit_reports')
        .update({
          ...scores,
          average_score: averageScore,
          report_status: 'unlocked',
          is_high_risk: averageScore < 650,
        })
        .eq('id', report.id);

      toast.success('Report generated successfully!');
      setFormData({ fullName: '', panNumber: '', dateOfBirth: '', gender: '' });
      setSelectedBureaus(['cibil']);
      loadPartnerData();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading || walletModeLoading || pricingLoading) {
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welcome, {partner?.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your clients and generate reports</p>
          </div>

          <Card className="mb-8 bg-gradient-to-r from-secondary/20 to-secondary/5 border-secondary/30">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Franchise ID</p>
                <p className="text-2xl font-mono font-bold text-foreground">{partner?.franchise_id}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Commission Rate: <span className="font-bold text-success">{partner?.commission_rate}%</span>
                </p>
              </div>
              <Button onClick={copyFranchiseId} variant="outline" className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <WalletCard 
              balance={Number(partner?.wallet_balance || 0)}
              effectiveReportCount={getEffectiveReportCount(Number(partner?.wallet_balance || 0), Number(partner?.report_count || 0))}
              isReportCountMode={isReportCountMode}
              onAddFunds={() => navigate('/partner/wallet')}
            />
            <StatsCard 
              title="Total Reports" 
              value={stats.totalReports} 
              icon={FileText}
            />
            <StatsCard 
              title="Total Clients" 
              value={stats.totalClients} 
              icon={Users}
            />
            <StatsCard 
              title="Total Revenue" 
              value={`₹${stats.totalRevenue.toLocaleString()}`} 
              icon={IndianRupee}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Reports
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/partner/reports')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{report.full_name}</p>
                        <p className="text-sm text-muted-foreground">{report.pan_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{report.average_score || 'N/A'}</p>
                        <p className={`text-xs font-medium ${
                          report.report_status === 'unlocked' ? 'text-success' : 'text-warning'
                        }`}>
                          {report.report_status?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentReports.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No reports yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Quick Generate Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateReport} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Client's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="panNumber">PAN Number *</Label>
                      <Input
                        id="panNumber"
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender *</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="dash-male" />
                          <Label htmlFor="dash-male" className="font-normal cursor-pointer">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="dash-female" />
                          <Label htmlFor="dash-female" className="font-normal cursor-pointer">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Bureaus *</Label>
                    <div className="flex flex-wrap gap-2">
                      {bureauOptions.map((bureau) => (
                        <Button
                          key={bureau.id}
                          type="button"
                          variant={selectedBureaus.includes(bureau.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedBureaus(prev =>
                              prev.includes(bureau.id)
                                ? prev.filter(id => id !== bureau.id)
                                : [...prev, bureau.id]
                            );
                          }}
                        >
                          {bureau.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                      {isReportCountMode 
                        ? `${bureauCount} report(s) will be deducted`
                        : `Total: ₹${totalCost}`
                      }
                    </span>
                    <Button type="submit" disabled={isSubmitting || hasInsufficientBalance}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                  {hasInsufficientBalance && (
                    <p className="text-sm text-destructive">
                      {isReportCountMode ? 'Insufficient reports' : 'Insufficient balance'}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
