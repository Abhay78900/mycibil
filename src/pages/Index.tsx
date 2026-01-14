import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  CheckCircle2, 
  Star,
  FileText,
  Lock,
  TrendingUp
} from 'lucide-react';

const bureaus = [
  { name: 'TransUnion CIBIL', code: 'cibil', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Experian', code: 'experian', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Equifax', code: 'equifax', color: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'CRIF High Mark', code: 'crif', color: 'bg-green-100 text-green-700 border-green-200' }
];

const features = [
  { icon: Zap, title: 'Instant Reports', description: 'Get your credit score in minutes' },
  { icon: Shield, title: 'Bank-Level Security', description: 'Your data is encrypted and secure' },
  { icon: FileText, title: 'Detailed Analysis', description: 'Comprehensive breakdown of your credit' },
  { icon: TrendingUp, title: 'Score Improvement Tips', description: 'Personalized recommendations' }
];

const pricingPlans = [
  { name: 'Single Bureau', price: 99, bureaus: ['CIBIL'], popular: false },
  { name: 'Two Bureaus', price: 179, bureaus: ['CIBIL', 'Experian'], popular: false },
  { name: 'Three Bureaus', price: 249, bureaus: ['CIBIL', 'Experian', 'Equifax'], popular: true },
  { name: 'All 4 Bureaus', price: 299, bureaus: ['CIBIL', 'Experian', 'Equifax', 'CRIF'], popular: false }
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/check-score');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 md:px-8 gradient-hero">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
              <Star className="w-4 h-4" />
              <span className="text-sm font-medium">Trusted by 1M+ Indians</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 font-display text-balance">
              Check Your Credit Score from{' '}
              <span className="text-accent">All 4 Bureaus</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Get comprehensive credit reports from CIBIL, Experian, Equifax & CRIF. 
              Make informed financial decisions with complete visibility.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              {bureaus.map((bureau) => (
                <motion.div
                  key={bureau.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border ${bureau.color}`}
                >
                  <span className="font-medium text-sm">{bureau.name}</span>
                </motion.div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleGetStarted} size="xl" variant="hero" className="gap-2">
                Get Your Credit Report
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button onClick={() => navigate('/auth')} size="xl" variant="outline">
                Sign In
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="hidden md:block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card rounded-3xl shadow-xl p-8 border border-border">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Your Credit Score</p>
                  <div className="text-6xl font-bold text-accent font-display">752</div>
                  <p className="text-sm text-score-good mt-1">Excellent</p>
                </div>
                <div className="space-y-3">
                  {bureaus.map((bureau, index) => (
                    <div key={bureau.code} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">{bureau.name}</span>
                      <span className="font-bold text-foreground">{740 + index * 10}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="px-4 py-16 md:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
              Why Choose CreditCheck?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get the complete picture of your credit health with our comprehensive reports
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-background border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="px-4 py-16 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground">Choose the plan that suits your needs</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative p-6 rounded-2xl border-2 transition-all ${
                  plan.popular 
                    ? 'border-accent bg-accent/5 shadow-lg' 
                    : 'border-border bg-card hover:border-accent/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-semibold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-foreground">₹{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/report</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.bureaus.map((bureau) => (
                    <li key={bureau} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      <span>{bureau}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleGetStarted} 
                  variant={plan.popular ? 'hero' : 'outline'} 
                  className="w-full"
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="px-4 py-16 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-primary rounded-3xl p-8 md:p-12 text-center text-primary-foreground"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">
              Ready to Check Your Credit Score?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join millions of Indians who trust CreditCheck for their credit monitoring needs
            </p>
            <Button onClick={handleGetStarted} size="xl" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              Check Score Now
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-4 py-8 md:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CC</span>
            </div>
            <span className="font-semibold">CreditCheck</span>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="link" onClick={() => navigate('/become-partner')} className="text-muted-foreground hover:text-primary">
              Become a Partner
            </Button>
            <p className="text-sm text-muted-foreground">
              © 2024 CreditCheck. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
