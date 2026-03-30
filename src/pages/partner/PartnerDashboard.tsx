import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerWalletMode } from '@/hooks/usePartnerWalletMode';
import { useBureauPricing } from '@/hooks/useBureauPricing';
import PartnerLayout from '@/components/layout/PartnerLayout';
import WalletCard from '@/components/partner/WalletCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, IndianRupee, TrendingUp, Loader2, Copy, Check, Megaphone, ArrowUpRight, Clock, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePartnerNotifications } from '@/hooks/usePartnerNotifications';
import { motion } from 'framer-motion';

const bureauOptions = [
  { id: 'cibil', label: 'CIBIL' },
  { id: 'experian', label: 'Experian' },
  { id: 'equifax', label: 'Equifax' },
  { id: 'crif', label: 'CRIF' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

export default function PartnerDashboard() {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isReportCountMode, reportUnitPrice, getEffectiveReportCount, loading: walletModeLoading } = usePartnerWalletMode();
  const { getPartnerPrice, calculatePartnerTotal, loading: pricingLoading } = useBureauPricing();
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState({ totalReports: 0, totalRevenue: 0, totalClients: 0 });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', panNumber: '', dateOfBirth: '', gender: '', mobileNumber: '' });
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(['cibil']);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<any>(null);

  useEffect(() => {
    if (!loading && user) loadPartnerData();
  }, [loading, user, navigate]);

  const loadPartnerData = async () => {
    try {
      const { data: partnerData } = await supabase.from('partners').select('*').eq('owner_id', user?.id).maybeSingle();
      if (!partnerData) { navigate('/partner/register'); return; }
      setPartner(partnerData);
      const { data: reports } = await supabase.from('credit_reports').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false });
      const reportsList = reports || [];
      setRecentReports(reportsList.slice(0, 5));
      setStats({ totalReports: reportsList.length, totalRevenue: Number(partnerData.total_revenue || 0), totalClients: new Set(reportsList.map(r => r.pan_number)).size });
    } catch (error) { console.error('Error loading partner data:', error); } finally { setIsLoading(false); }
  };

  const copyFranchiseId = () => {
    navigator.clipboard.writeText(partner?.franchise_id || '');
    setCopied(true);
    toast.success('Franchise ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const { notifications: unreadNotifs, markAsRead } = usePartnerNotifications(partner?.id || null);

  useEffect(() => {
    if (unreadNotifs.length > 0 && !currentNotif && !notifModalOpen) {
      setCurrentNotif(unreadNotifs[0]);
      setNotifModalOpen(true);
    }
  }, [unreadNotifs]);

  const handleDismissNotif = async () => {
    if (currentNotif) {
      await markAsRead(currentNotif.id);
      setNotifModalOpen(false);
      setCurrentNotif(null);
    }
  };

  const bureauCount = selectedBureaus.length;
  const totalCost = isReportCountMode ? bureauCount : calculatePartnerTotal(selectedBureaus);
  const walletBalance = Number(partner?.wallet_balance || 0);
  const effectiveReportCount = getEffectiveReportCount(walletBalance, Number(partner?.report_count || 0));
  const currentBalance = isReportCountMode ? effectiveReportCount : walletBalance;
  const hasInsufficientBalance = currentBalance < totalCost;

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.panNumber || !formData.gender) { toast.error('Please fill all required fields'); return; }
    if (selectedBureaus.length === 0) { toast.error('Please select at least one bureau'); return; }
    if (hasInsufficientBalance) { toast.error(isReportCountMode ? 'Insufficient reports' : 'Insufficient wallet balance'); return; }
    setIsSubmitting(true);
    try {
      const amountPaid = isReportCountMode ? 0 : totalCost;
      const { data: report, error: reportError } = await supabase.from('credit_reports').insert({ user_id: user?.id, partner_id: partner.id, full_name: formData.fullName, pan_number: formData.panNumber.toUpperCase(), date_of_birth: formData.dateOfBirth || null, mobile_number: formData.mobileNumber || null, selected_bureaus: selectedBureaus, report_status: 'processing', amount_paid: amountPaid }).select().single();
      if (reportError) throw reportError;
      if (isReportCountMode) {
        const deductionAmount = reportUnitPrice * bureauCount;
        await supabase.from('partners').update({ wallet_balance: walletBalance - deductionAmount, total_revenue: Number(partner.total_revenue || 0) + deductionAmount }).eq('id', partner.id);
      } else {
        await supabase.from('partners').update({ wallet_balance: walletBalance - totalCost, total_revenue: Number(partner.total_revenue || 0) + totalCost }).eq('id', partner.id);
      }
      await supabase.from('transactions').insert({ user_id: user?.id, partner_id: partner.id, report_id: report.id, amount: amountPaid, type: 'report_generation', status: 'success', payment_method: 'wallet', description: `Report for ${formData.fullName} - Bureaus: ${selectedBureaus.join(', ')}`, metadata: isReportCountMode ? { wallet_mode: 'report_count', reports_deducted: bureauCount, bureaus: selectedBureaus } : { wallet_mode: 'amount', bureaus: selectedBureaus } });
      const scores = {
        cibil_score: selectedBureaus.includes('cibil') ? Math.floor(Math.random() * 300) + 600 : null,
        experian_score: selectedBureaus.includes('experian') ? Math.floor(Math.random() * 300) + 600 : null,
        equifax_score: selectedBureaus.includes('equifax') ? Math.floor(Math.random() * 300) + 600 : null,
        crif_score: selectedBureaus.includes('crif') ? Math.floor(Math.random() * 300) + 600 : null,
      };
      const validScores = Object.values(scores).filter(s => s !== null) as number[];
      const averageScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
      await supabase.from('credit_reports').update({ ...scores, average_score: averageScore, report_status: 'unlocked', is_high_risk: averageScore < 650 }).eq('id', report.id);
      toast.success('Report generated successfully!');
      setFormData({ fullName: '', panNumber: '', dateOfBirth: '', gender: '', mobileNumber: '' });
      setSelectedBureaus(['cibil']);
      loadPartnerData();
    } catch (error) { console.error('Error generating report:', error); toast.error('Failed to generate report'); } finally { setIsSubmitting(false); }
  };

  if (loading || isLoading || walletModeLoading || pricingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 750) return 'text-success';
    if (score >= 650) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <PartnerLayout partner={partner}>
      {/* Hero Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Partner Dashboard
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Welcome back, {partner?.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Here's what's happening with your business today.
            </p>
          </div>
          <Button onClick={() => navigate('/partner/generate')} className="gap-2 shadow-md">
            <FileText className="w-4 h-4" />
            Generate Report
          </Button>
        </div>
      </motion.div>

      {/* Franchise ID Banner */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card className="mb-8 border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Franchise ID</p>
                <p className="text-lg lg:text-xl font-mono font-bold text-foreground tracking-wide">{partner?.franchise_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-medium">
                Commission: {partner?.commission_rate}%
              </Badge>
              <Button onClick={copyFranchiseId} variant="outline" size="sm" className="gap-2">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {[
          {
            title: 'Wallet Balance',
            value: isReportCountMode
              ? `${effectiveReportCount} Reports`
              : `₹${walletBalance.toLocaleString()}`,
            icon: IndianRupee,
            color: 'text-primary',
            bg: 'bg-primary/10',
            action: () => navigate('/partner/wallet'),
            actionLabel: 'Add Funds',
          },
          {
            title: 'Total Reports',
            value: stats.totalReports.toLocaleString(),
            icon: FileText,
            color: 'text-blue-600',
            bg: 'bg-blue-500/10',
          },
          {
            title: 'Total Clients',
            value: stats.totalClients.toLocaleString(),
            icon: Users,
            color: 'text-teal-600',
            bg: 'bg-teal-500/10',
          },
          {
            title: 'Total Revenue',
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10',
          },
        ].map((stat, i) => (
          <motion.div key={stat.title} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible">
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.action && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-primary" onClick={stat.action}>
                      {stat.actionLabel} <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Reports */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Recent Reports
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => navigate('/partner/reports')}>
                  View All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/report/${report.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {report.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{report.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{report.pan_number}</p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className={`text-sm font-bold ${getScoreColor(report.average_score)}`}>
                        {report.average_score || '—'}
                      </p>
                      <Badge
                        variant={report.report_status === 'unlocked' ? 'default' : 'secondary'}
                        className="text-[10px] h-5 px-1.5"
                      >
                        {report.report_status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentReports.length === 0 && (
                  <div className="text-center py-10">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No reports generated yet</p>
                    <Button variant="link" size="sm" className="mt-1 text-primary" onClick={() => navigate('/partner/generate')}>
                      Generate your first report
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Generate Form */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs">Full Name *</Label>
                    <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Client's full name" required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="panNumber" className="text-xs">PAN Number *</Label>
                    <Input id="panNumber" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} required className="h-9 text-sm font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-xs">Date of Birth</Label>
                    <Input id="dob" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mobileNumber" className="text-xs">Mobile Number *</Label>
                    <Input id="mobileNumber" type="tel" value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} placeholder="10-digit mobile" maxLength={10} required className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender *</Label>
                  <RadioGroup value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })} className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="dash-male" /><Label htmlFor="dash-male" className="font-normal cursor-pointer text-sm">Male</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="dash-female" /><Label htmlFor="dash-female" className="font-normal cursor-pointer text-sm">Female</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Bureaus *</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {bureauOptions.map((bureau) => (
                      <Button
                        key={bureau.id}
                        type="button"
                        variant={selectedBureaus.includes(bureau.id) ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedBureaus(prev => prev.includes(bureau.id) ? prev.filter(id => id !== bureau.id) : [...prev, bureau.id]);
                        }}
                      >
                        {bureau.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {isReportCountMode ? `${bureauCount} report(s)` : `₹${totalCost}`}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">will be deducted</span>
                  </div>
                  <Button type="submit" disabled={isSubmitting || hasInsufficientBalance} size="sm" className="gap-2 shadow-sm">
                    {isSubmitting ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>) : (<><FileText className="w-3.5 h-3.5" />Generate</>)}
                  </Button>
                </div>
                {hasInsufficientBalance && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                    {isReportCountMode ? 'Insufficient reports — please add funds' : 'Insufficient balance — please recharge wallet'}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notification Auto-popup Modal */}
      <Dialog open={notifModalOpen} onOpenChange={(open) => { if (!open) handleDismissNotif(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{currentNotif?.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Admin Announcement • {currentNotif ? new Date(currentNotif.created_at).toLocaleDateString() : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3 px-1">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{currentNotif?.message}</p>
          </div>
          <DialogFooter>
            <Button onClick={handleDismissNotif} size="sm">Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PartnerLayout>
  );
}
