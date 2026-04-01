import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const reviews = [
  { name: 'Rajesh Kumar', rating: 5, text: 'Got my credit report from all 4 bureaus in just 2 minutes. Very detailed and easy to understand!', location: 'Mumbai' },
  { name: 'Priya Sharma', rating: 5, text: 'The improvement tips helped me increase my CIBIL score by 80 points in 3 months. Highly recommend!', location: 'Delhi' },
  { name: 'Amit Patel', rating: 4, text: 'Best platform to check credit scores. The unified report view is amazing. Saved me a lot of time.', location: 'Ahmedabad' },
  { name: 'Sneha Reddy', rating: 5, text: 'As a partner, I earn great commissions while helping my clients understand their credit health.', location: 'Hyderabad' },
];

const partnerBenefits = [
  { icon: TrendingUp, title: 'Earn High Commissions', description: 'Earn attractive commissions on every credit report you generate for your clients' },
  { icon: Zap, title: 'Instant Report Generation', description: 'Generate reports in real-time with our powerful API integration' },
  { icon: Shield, title: 'Dedicated Dashboard', description: 'Get your own partner dashboard with wallet, CRM, and client management tools' },
  { icon: Star, title: 'Grow Your Business', description: 'Expand your financial services portfolio with credit score offerings' },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

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
              <span className="text-sm font-medium">{t('hero.trustedBy')}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 font-display text-balance">
              {t('hero.title')}{' '}
              <span className="text-accent">{t('hero.titleHighlight')}</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              {t('hero.subtitle')}
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
      
      {/* Reviews Section */}
      <section className="px-4 py-16 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
              What Our Users Say
            </h2>
            <p className="text-muted-foreground">Trusted by millions across India</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((review, index) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{review.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Become a Partner Section */}
      <section className="px-4 py-16 md:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Partner Program</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                Become a CreditCheck Partner
              </h2>
              <p className="text-muted-foreground mb-6">
                Start your own credit score business with zero investment risk. 
                Join our growing network of 500+ partners across India and earn attractive commissions.
              </p>
              <Button onClick={() => navigate('/become-partner')} size="xl" variant="hero" className="gap-2">
                Apply as Partner
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partnerBenefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-5 rounded-2xl bg-background border border-border"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <benefit.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
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
