import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import BureauCard from '@/components/credit/BureauCard';
import { useAuth } from '@/contexts/AuthContext';
import { useBureauPricing } from '@/hooks/useBureauPricing';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Loader2, Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
});

const bureauOptions = [
  { code: 'cibil' as const, name: 'TransUnion CIBIL' },
  { code: 'experian' as const, name: 'Experian' },
  { code: 'equifax' as const, name: 'Equifax' },
  { code: 'crif' as const, name: 'CRIF High Mark' },
];

export default function CheckScore() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { pricing, loading: pricingLoading, getUserPrice, calculateUserTotal } = useBureauPricing();
  
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(['cibil', 'experian', 'equifax', 'crif']);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const toggleBureau = (code: string) => {
    setSelectedBureaus(prev => 
      prev.includes(code) 
        ? prev.filter(b => b !== code)
        : [...prev, code]
    );
  };

  const validateStep1 = () => {
    try {
      formSchema.parse({ fullName, panNumber, dateOfBirth });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleContinue = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      if (selectedBureaus.length === 0) {
        toast.error('Please select at least one bureau');
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const totalPrice = calculateUserTotal(selectedBureaus);
    
    try {
      // Create the credit report
      const { data: report, error } = await supabase
        .from('credit_reports')
        .insert({
          user_id: user?.id,
          full_name: fullName,
          pan_number: panNumber.toUpperCase(),
          date_of_birth: dateOfBirth,
          selected_bureaus: selectedBureaus,
          report_status: 'locked',
          amount_paid: totalPrice,
        })
        .select()
        .single();

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          report_id: report.id,
          amount: totalPrice,
          type: 'report_purchase',
          status: 'pending',
          description: `Credit report for ${selectedBureaus.length} bureau(s): ${selectedBureaus.join(', ')}`,
        });

      toast.success('Report request created!');
      navigate(`/payment/${report.id}`);
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast.error(error.message || 'Failed to create report');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || pricingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step >= s 
                  ? 'bg-accent text-accent-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={`hidden sm:block text-sm font-medium ${
                step >= s ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {s === 1 ? 'Your Details' : 'Select Bureaus'}
              </span>
              {s < 2 && <div className="w-12 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {step === 1 ? (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-2xl font-display">Enter Your Details</CardTitle>
                <CardDescription>
                  We'll use this information to fetch your credit report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name (as per PAN)</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    placeholder="ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    maxLength={10}
                    className={errors.panNumber ? 'border-destructive' : ''}
                  />
                  {errors.panNumber && (
                    <p className="text-xs text-destructive">{errors.panNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={errors.dateOfBirth ? 'border-destructive' : ''}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
                  )}
                </div>

                <Button onClick={handleContinue} className="w-full" size="lg" variant="hero">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-display">Select Credit Bureaus</CardTitle>
                <CardDescription>
                  Choose which bureaus to fetch your credit report from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {bureauOptions.map((bureau) => {
                    const price = getUserPrice(bureau.code);
                    return (
                      <BureauCard
                        key={bureau.code}
                        name={bureau.name}
                        code={bureau.code}
                        price={price}
                        isSelected={selectedBureaus.includes(bureau.code)}
                        onClick={() => toggleBureau(bureau.code)}
                      />
                    );
                  })}
                </div>

                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Selected Bureaus</span>
                    <span className="font-medium">{selectedBureaus.length} of 4</span>
                  </div>
                  <div className="space-y-1 text-sm mb-4">
                    {selectedBureaus.map(code => {
                      const bureau = bureauOptions.find(b => b.code === code);
                      return (
                        <div key={code} className="flex justify-between text-muted-foreground">
                          <span>{bureau?.name}</span>
                          <span>₹{getUserPrice(code)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-lg border-t pt-3">
                    <span className="font-semibold">Total Price</span>
                    <span className="text-2xl font-bold text-accent">₹{calculateUserTotal(selectedBureaus)}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleContinue} 
                    className="flex-1" 
                    variant="hero"
                    disabled={isLoading || selectedBureaus.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Payment
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
