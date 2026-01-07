import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, CheckCircle2, ArrowRight, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PartnerRegister() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
  });
  const [registeredPartner, setRegisteredPartner] = useState<any>(null);

  const generateFranchiseId = () => {
    const prefix = 'CC';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp.slice(-4)}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }

    setIsLoading(true);

    try {
      const franchiseId = generateFranchiseId();
      
      const { data: partner, error } = await supabase
        .from('partners')
        .insert({
          name: formData.businessName,
          owner_id: user?.id,
          franchise_id: franchiseId,
          wallet_balance: 0,
          commission_rate: 10,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Update user role to partner
      await supabase
        .from('user_roles')
        .update({ role: 'partner' })
        .eq('user_id', user?.id);

      setRegisteredPartner(partner);
      toast.success('Partner account created successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to create partner account');
    } finally {
      setIsLoading(false);
    }
  };

  if (registeredPartner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card className="border-success/30 shadow-lg">
            <CardContent className="pt-8 text-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Registration Successful!</h2>
              <p className="text-muted-foreground mb-6">Your partner account has been created</p>
              
              <div className="bg-accent/50 p-6 rounded-xl mb-6">
                <p className="text-sm text-muted-foreground mb-2">Your Franchise ID</p>
                <p className="text-3xl font-mono font-bold text-primary">{registeredPartner.franchise_id}</p>
                <p className="text-sm text-muted-foreground mt-2">Save this ID for your records</p>
              </div>

              <div className="space-y-3 text-left bg-muted/50 p-4 rounded-lg mb-6">
                <p className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Commission Rate: <strong>{registeredPartner.commission_rate}%</strong></span>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Initial Wallet Balance: <strong>₹0</strong></span>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Account Status: <strong className="text-success">Active</strong></span>
                </p>
              </div>

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={() => window.location.href = '/partner'}
              >
                Go to Partner Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">CreditCheck</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Become a Partner</h1>
          <p className="text-muted-foreground mt-2">Join our network and start earning commissions</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Partner Registration
            </CardTitle>
            <CardDescription>
              Fill in your business details to create your partner account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Enter your business or agency name"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your contact number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-foreground">What you'll get:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Unique Franchise ID for your business
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    10% commission on all reports generated
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Partner dashboard with analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Wallet system for easy transactions
                  </li>
                </ul>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    Register as Partner
                  </>
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
