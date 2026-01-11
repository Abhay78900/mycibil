import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Payment() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      toast.error('Report not found');
      navigate('/dashboard');
      return;
    }

    if (data.report_status === 'unlocked') {
      navigate(`/report/${reportId}`);
      return;
    }

    setReport(data);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv || !name) {
      toast.error('Please fill in all payment details');
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock scores
      const mockScores = {
        cibil_score: Math.floor(Math.random() * 200) + 650,
        experian_score: Math.floor(Math.random() * 200) + 650,
        equifax_score: Math.floor(Math.random() * 200) + 650,
        crif_score: Math.floor(Math.random() * 200) + 650,
      };

      const average = Math.round(
        (mockScores.cibil_score + mockScores.experian_score + mockScores.equifax_score + mockScores.crif_score) / 4
      );

      // Update report with scores
      const { error: updateError, data: updatedData } = await supabase
        .from('credit_reports')
        .update({
          ...mockScores,
          average_score: average,
          report_status: 'unlocked',
          is_high_risk: average < 650,
          active_loans: [
            { lender: 'HDFC Bank', loan_type: 'Home Loan', current_balance: 2500000, status: 'Active' },
            { lender: 'ICICI Bank', loan_type: 'Personal Loan', current_balance: 150000, status: 'Active' }
          ],
          credit_cards: [
            { bank: 'Axis Bank', credit_limit: 200000, current_balance: 45000, status: 'Active' }
          ],
          improvement_tips: [
            'Maintain credit utilization below 30%',
            'Pay all EMIs on time',
            'Avoid multiple credit applications',
            'Keep older credit accounts active'
          ]
        })
        .eq('id', reportId)
        .select();

      if (updateError) {
        console.error('Report update failed:', updateError);
        throw updateError;
      }

      // Verify the update actually happened
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Failed to update report - RLS policy may be blocking the update');
      }

      // Update transaction
      await supabase
        .from('transactions')
        .update({ status: 'success', payment_method: 'card' })
        .eq('report_id', reportId);

      toast.success('Payment successful! Your report is ready.');
      navigate(`/report/${reportId}`);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="text-center border-b border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-2xl font-display">Complete Payment</CardTitle>
              <div className="mt-4 p-4 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">Order Summary</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-medium">Credit Report ({report?.selected_bureaus?.length || 4} Bureaus)</span>
                  <span className="text-xl font-bold text-accent">₹{report?.amount_paid || 299}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Cardholder Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-score-excellent/10 text-score-excellent text-sm">
                <Lock className="w-4 h-4" />
                <span>Your payment is secured with 256-bit encryption</span>
              </div>

              <Button 
                onClick={handlePayment} 
                className="w-full" 
                size="lg" 
                variant="hero"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Pay ₹{report?.amount_paid || 299}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By completing this payment, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
