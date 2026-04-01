import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBureauApi } from '@/hooks/useBureauApi';
import { Loader2, CreditCard, Lock, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Payment() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { fetchMultipleBureaus } = useBureauApi();

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  useEffect(() => {
    // Load Razorpay script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
    if (!window.Razorpay) {
      toast.error('Payment system is loading. Please try again.');
      return;
    }

    setProcessing(true);

    try {
      const amount = report?.amount_paid || 299;

      // Step 1: Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount,
            reportId: reportId!,
            userId: user?.id,
          },
        }
      );

      if (orderError || !orderData?.order_id) {
        throw new Error(orderData?.error || 'Failed to create payment order');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Credit Scorewala',
        description: `Credit Report - ${report?.selected_bureaus?.length || 4} Bureaus`,
        order_id: orderData.order_id,
        prefill: {
          name: report?.full_name || '',
          contact: report?.mobile_number || '',
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response: any) => {
          await verifyAndComplete(response);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setProcessing(false);
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
      });
      rzp.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  const verifyAndComplete = async (razorpayResponse: any) => {
    try {
      toast.info('Verifying payment...');

      // Step 3: Verify payment server-side
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-razorpay-payment',
        {
          body: {
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
            reportId: reportId!,
          },
        }
      );

      if (verifyError || !verifyData?.verified) {
        throw new Error(verifyData?.error || 'Payment verification failed');
      }

      // Step 4: Fetch bureau reports
      const selectedBureaus = report?.selected_bureaus || ['cibil', 'experian', 'equifax', 'crif'];
      toast.info('Fetching credit reports from bureaus...');

      const bureauResults = await fetchMultipleBureaus(selectedBureaus, {
        reportId: reportId!,
        fullName: report.full_name,
        panNumber: report.pan_number,
        mobileNumber: report.mobile_number || '',
        dateOfBirth: report.date_of_birth || undefined,
        gender: report.gender || undefined,
      });

      const successCount = Object.values(bureauResults).filter(r => r.success).length;
      const failCount = Object.values(bureauResults).filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Payment successful! ${successCount} bureau report(s) fetched.`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} bureau(s) had issues. Reports may show partial data.`);
      }

      navigate(`/report/${reportId}`);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Verification failed. Contact support.');
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
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <ShieldCheck className="w-6 h-6 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Secure Payment via Razorpay</p>
                    <p className="text-xs text-muted-foreground">UPI, Cards, NetBanking, Wallets supported</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-score-excellent/10 text-score-excellent text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Your payment is secured with 256-bit encryption</span>
                </div>
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
