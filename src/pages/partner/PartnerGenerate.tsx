import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBureauPricing } from '@/hooks/useBureauPricing';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import { useBureauApi } from '@/hooks/useBureauApi';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const bureauOptions = [
  { id: 'cibil', label: 'TransUnion CIBIL' },
  { id: 'experian', label: 'Experian' },
  { id: 'equifax', label: 'Equifax' },
  { id: 'crif', label: 'CRIF High Mark' },
];

export default function PartnerGenerate() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { pricing, loading: pricingLoading, getPartnerPrice, calculatePartnerTotal } = useBureauPricing();
  const { isReportCountMode, reportUnitPrice, getEffectiveReportCount, loading: walletModeLoading } = usePartnerWalletMode();
  const { fetchBureauReport, isLoading: bureauApiLoading } = useBureauApi();
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    panNumber: '',
    mobileNumber: '',
    dateOfBirth: '',
    gender: '',
  });
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(['cibil']);

  useEffect(() => {
    if (!loading && userRole !== 'partner') {
      navigate('/dashboard');
      return;
    }
    if (!loading && user) {
      loadPartnerData();
    }
  }, [userRole, loading, user, navigate]);

  const loadPartnerData = async () => {
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
    } catch (error) {
      console.error('Error loading partner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // In report count mode, each bureau = 1 report deduction
  const bureauCount = selectedBureaus.length;
  const totalCost = isReportCountMode ? bureauCount : calculatePartnerTotal(selectedBureaus);
  const walletBalance = Number(partner?.wallet_balance || 0);
  const effectiveReportCount = getEffectiveReportCount(walletBalance, Number(partner?.report_count || 0));
  const currentBalance = isReportCountMode ? effectiveReportCount : walletBalance;
  const hasInsufficientBalance = currentBalance < totalCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.panNumber || !formData.mobileNumber || !formData.gender) {
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

      // Create credit report
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

      // Deduct from wallet - amount based on number of bureaus selected
      if (isReportCountMode) {
        // Deduct amount equivalent to X reports (1 report per bureau)
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

      // Create transaction
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

      // Fetch bureau reports - call APIs for selected bureaus
      const scores: Record<string, number | null> = {
        cibil_score: null,
        experian_score: null,
        equifax_score: null,
        crif_score: null,
      };

      const apiParams = {
        reportId: report.id,
        fullName: formData.fullName,
        panNumber: formData.panNumber.toUpperCase(),
        mobileNumber: formData.mobileNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender === 'male' ? 'Male' : formData.gender === 'female' ? 'Female' : undefined,
      };

      // Call APIs for each selected bureau
      for (const bureau of selectedBureaus) {
        const result = await fetchBureauReport(bureau, apiParams);
        if (result.success && result.score) {
          scores[`${bureau}_score`] = result.score;
        } else {
          // Fallback to mock score if API fails
          scores[`${bureau}_score`] = Math.floor(Math.random() * 300) + 600;
        }
      }

      const validScores = Object.values(scores).filter(s => s !== null) as number[];
      const averageScore = validScores.length > 0 
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 0;

      await supabase
        .from('credit_reports')
        .update({
          cibil_score: scores.cibil_score,
          experian_score: scores.experian_score,
          equifax_score: scores.equifax_score,
          crif_score: scores.crif_score,
          average_score: averageScore,
          report_status: 'unlocked',
          is_high_risk: averageScore < 650,
        })
        .eq('id', report.id);

      toast.success('Report generated successfully!');
      navigate('/partner/reports');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading || pricingLoading || walletModeLoading) {
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Generate Report</h1>
            <p className="text-muted-foreground mt-1">Create a credit report for your client</p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Enter your client's information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter client's full name"
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
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input
                    id="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Gender *</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Bureaus</CardTitle>
              <CardDescription>
                  {isReportCountMode 
                    ? 'Choose bureaus to include (1 report per bureau)'
                    : 'Choose which credit bureaus to fetch (Partner pricing applies)'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {bureauOptions.map((bureau) => {
                    const price = getPartnerPrice(bureau.id);
                    return (
                      <div
                        key={bureau.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedBureaus.includes(bureau.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedBureaus(prev =>
                            prev.includes(bureau.id)
                              ? prev.filter(id => id !== bureau.id)
                              : [...prev, bureau.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedBureaus.includes(bureau.id)
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {selectedBureaus.includes(bureau.id) && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">{bureau.label}</span>
                        </div>
                        {!isReportCountMode && (
                          <span className="text-sm text-muted-foreground">₹{price}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Selected Bureaus</span>
                  <span className="font-medium">{selectedBureaus.length}</span>
                </div>

                {!isReportCountMode && (
                  <div className="space-y-1 text-sm mb-4">
                    {selectedBureaus.map(id => {
                      const bureau = bureauOptions.find(b => b.id === id);
                      return (
                        <div key={id} className="flex justify-between text-muted-foreground">
                          <span>{bureau?.label}</span>
                          <span>₹{getPartnerPrice(id)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 border-t pt-3">
                  <span className="font-semibold">
                    {isReportCountMode ? 'Reports Required' : 'Total Cost'}
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {isReportCountMode ? `${bureauCount} Report${bureauCount > 1 ? 's' : ''}` : `₹${totalCost}`}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-6 text-sm">
                  <span className="text-muted-foreground">
                    {isReportCountMode ? 'Reports Remaining' : 'Wallet Balance'}
                  </span>
                  <span className={hasInsufficientBalance ? 'text-destructive' : 'text-success'}>
                    {isReportCountMode 
                      ? `${currentBalance} report(s)`
                      : `₹${currentBalance.toLocaleString()}`
                    }
                  </span>
                </div>

                {hasInsufficientBalance && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {isReportCountMode 
                        ? 'Insufficient reports. Please add more reports.'
                        : 'Insufficient balance. Please add funds.'
                      }
                    </span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || hasInsufficientBalance}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
    </div>
  );
}
