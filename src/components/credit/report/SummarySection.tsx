import { ReportSummary, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, XCircle, AlertCircle, IndianRupee } from 'lucide-react';

interface SummarySectionProps {
  data: ReportSummary;
}

export default function SummarySection({ data }: SummarySectionProps) {
  // Defensive: ensure data exists with defaults
  const safeData = {
    total_accounts: data?.total_accounts ?? 0,
    active_accounts: data?.active_accounts ?? 0,
    closed_accounts: data?.closed_accounts ?? 0,
    total_overdue_amount: data?.total_overdue_amount ?? 0,
    total_sanctioned_amount: data?.total_sanctioned_amount ?? 0,
    total_current_balance: data?.total_current_balance ?? 0
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          REPORT SUMMARY
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{safeData.total_accounts}</p>
            <p className="text-xs text-muted-foreground uppercase">Total Accounts</p>
          </div>
          
          <div className="p-4 rounded-lg bg-score-excellent/10 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-score-excellent" />
            <p className="text-2xl font-bold text-score-excellent">{safeData.active_accounts}</p>
            <p className="text-xs text-muted-foreground uppercase">Active Accounts</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{safeData.closed_accounts}</p>
            <p className="text-xs text-muted-foreground uppercase">Closed Accounts</p>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">
              ₹{safeData.total_overdue_amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground uppercase">Total Overdue</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <IndianRupee className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">
              ₹{safeData.total_sanctioned_amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground uppercase">Total Sanctioned</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <IndianRupee className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">
              ₹{safeData.total_current_balance.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground uppercase">Current Balance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
