import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const bureauOptions = [
  { id: 'cibil', label: 'CIBIL', price: 50 },
  { id: 'experian', label: 'Experian', price: 50 },
  { id: 'equifax', label: 'Equifax', price: 50 },
  { id: 'crif', label: 'CRIF High Mark', price: 49 },
];

export default function PartnerGenerate() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    panNumber: '',
    dateOfBirth: '',
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

  const totalCost = selectedBureaus.reduce((sum, id) => {
    const bureau = bureauOptions.find(b => b.id === id);
    return sum + (bureau?.price || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.panNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedBureaus.length === 0) {
      toast.error('Please select at least one bureau');
      return;
    }

    if (Number(partner?.wallet_balance || 0) < totalCost) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setIsSubmitting(true);

    try {
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
          amount_paid: totalCost,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Deduct from wallet
      await supabase
        .from('partners')
        .update({ 
          wallet_balance: Number(partner.wallet_balance) - totalCost,
          total_revenue: Number(partner.total_revenue || 0) + totalCost,
        })
        .eq('id', partner.id);

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          partner_id: partner.id,
          report_id: report.id,
          amount: totalCost,
          type: 'report_generation',
          status: 'success',
          payment_method: 'wallet',
          description: `Report for ${formData.fullName}`,
        });

      // Simulate score generation
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
      navigate('/partner/reports');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
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
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Bureaus</CardTitle>
                <CardDescription>Choose which credit bureaus to fetch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {bureauOptions.map((bureau) => (
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
                      <span className="text-sm text-muted-foreground">₹{bureau.price}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Selected Bureaus</span>
                  <span className="font-medium">{selectedBureaus.length}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="text-2xl font-bold text-foreground">₹{totalCost}</span>
                </div>
                <div className="flex items-center justify-between mb-6 text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className={Number(partner?.wallet_balance || 0) < totalCost ? 'text-destructive' : 'text-success'}>
                    ₹{Number(partner?.wallet_balance || 0).toLocaleString()}
                  </span>
                </div>

                {Number(partner?.wallet_balance || 0) < totalCost && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Insufficient balance. Please add funds.</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || Number(partner?.wallet_balance || 0) < totalCost}
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
