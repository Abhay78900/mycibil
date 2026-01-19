import { AccountInfo, formatValue } from '@/types/creditReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, CreditCard } from 'lucide-react';

interface AccountCardProps {
  account: AccountInfo;
  index: number;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function getPaymentStatusColor(value: string): string {
  if (!value || value === '---' || value === '-') return 'bg-muted text-muted-foreground';
  if (value === '0' || value === 'STD') return 'bg-score-excellent/20 text-score-excellent';
  if (value === 'XXX') return 'bg-muted text-muted-foreground';
  if (value === 'SMA' || value === 'SNA') return 'bg-yellow-500/20 text-yellow-600';
  if (value === 'SUB') return 'bg-orange-500/20 text-orange-600';
  if (value === 'DBT' || value === 'LSS') return 'bg-destructive/20 text-destructive';
  // DPD numbers
  const dpd = parseInt(value);
  if (!isNaN(dpd)) {
    if (dpd === 0) return 'bg-score-excellent/20 text-score-excellent';
    if (dpd <= 30) return 'bg-yellow-500/20 text-yellow-600';
    if (dpd <= 90) return 'bg-orange-500/20 text-orange-600';
    return 'bg-destructive/20 text-destructive';
  }
  return 'bg-muted text-muted-foreground';
}

export default function AccountCard({ account, index }: AccountCardProps) {
  // Defensive: ensure nested objects exist with defaults
  const safeDates = account?.dates || {
    date_opened: '---',
    date_closed: null,
    date_of_last_payment: null,
    date_reported: '---'
  };
  const safeCollateral = account?.collateral || {
    value: '---',
    type: '---',
    suit_filed: '---',
    credit_facility_status: '---',
    written_off_total: '---',
    written_off_principal: '---',
    settlement_amount: '---'
  };
  const safePaymentHistory = account?.payment_history || [];

  if (!account) {
    return null;
  }

  return (
    <Card className="mb-4 overflow-hidden">
      {/* Account Header */}
      <div className="bg-muted/50 px-6 py-4 border-b">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">(MEMBER NAME)</p>
            <p className="font-semibold text-foreground">{formatValue(account.member_name)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">(ACCOUNT TYPE)</p>
            <p className="font-medium">{formatValue(account.account_type)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">(ACCOUNT NUMBER)</p>
            <p className="font-mono text-sm">{formatValue(account.account_number)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">(OWNERSHIP)</p>
            <Badge variant="outline">{formatValue(account.ownership)}</Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Account Details */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            ACCOUNT DETAILS
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">CREDIT LIMIT</p>
                <p className="font-medium">{formatValue(account.credit_limit, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sanctioned Amount</p>
                <p className="font-semibold text-foreground">₹{formatValue(account.sanctioned_amount, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CURRENT BALANCE</p>
                <p className="font-semibold text-foreground">₹{formatValue(account.current_balance, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CASH LIMIT</p>
                <p className="font-medium">{formatValue(account.cash_limit, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AMOUNT OVERDUE</p>
                <p className={`font-semibold ${parseFloat(account.amount_overdue) > 0 ? 'text-destructive' : ''}`}>
                  ₹{formatValue(account.amount_overdue, true)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">RATE OF INTEREST</p>
                <p className="font-medium">{formatValue(account.rate_of_interest)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">REPAYMENT TENURE</p>
                <p className="font-medium">{formatValue(account.repayment_tenure)} months</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">EMI AMOUNT</p>
                <p className="font-semibold">₹{formatValue(account.emi_amount, true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PAYMENT FREQUENCY</p>
                <p className="font-medium">{formatValue(account.payment_frequency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ACTUAL PAYMENT AMOUNT</p>
                <p className="font-medium">₹{formatValue(account.actual_payment_amount, true)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            DATES
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">DATE OPENED/DISBURSED</p>
              <p className="font-medium">{formatValue(safeDates.date_opened)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DATE OF LAST PAYMENT</p>
              <p className="font-medium">{formatValue(safeDates.date_of_last_payment)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DATE CLOSED</p>
              <p className="font-medium">{formatValue(safeDates.date_closed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DATE REPORTED AND CERTIFIED</p>
              <p className="font-medium">{formatValue(safeDates.date_reported)}</p>
            </div>
          </div>
        </div>

        {/* Payment History (36 Months) */}
        <div>
          <h4 className="text-sm font-semibold mb-2">PAYMENT HISTORY (UP TO 36 MONTHS)</h4>
          <div className="flex gap-4 text-xs text-muted-foreground mb-3">
            <span>PAYMENT START DATE: <span className="text-foreground font-medium">{formatValue(account.payment_start_date)}</span></span>
            <span>PAYMENT END DATE: <span className="text-foreground font-medium">{formatValue(account.payment_end_date)}</span></span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            DAYS PAST DUE (No.of Days) or ASSET CLASSIFICATION (STD, SNA, SUB, DBT, LSS)
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium text-muted-foreground">YEAR</th>
                  {MONTH_LABELS.map((month) => (
                    <th key={month} className="text-center py-2 px-1 font-medium text-muted-foreground min-w-[32px]">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safePaymentHistory.map((yearData, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-semibold">{yearData?.year || '---'}</td>
                    {MONTHS.map((month) => {
                      const value = yearData?.months?.[month] || '';
                      return (
                        <td key={month} className="text-center py-2 px-1">
                          <span className={`inline-block min-w-[28px] py-0.5 px-1 rounded text-xs font-medium ${getPaymentStatusColor(value)}`}>
                            {value || '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {safePaymentHistory.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center py-4 text-muted-foreground">
                      No payment history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collateral */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">COLLATERAL</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">VALUE OF COLLATERAL</p>
              <p className="font-medium">₹{formatValue(safeCollateral.value, true)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TYPE OF COLLATERAL</p>
              <p className="font-medium">{formatValue(safeCollateral.type)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SUIT FILED / WILLFUL DEFAULT</p>
              <p className="font-medium">{formatValue(safeCollateral.suit_filed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CREDIT FACILITY STATUS</p>
              <p className="font-medium">{formatValue(safeCollateral.credit_facility_status)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm mt-3">
            <div>
              <p className="text-xs text-muted-foreground">WRITTEN-OFF AMOUNT (TOTAL)</p>
              <p className="font-medium">{formatValue(safeCollateral.written_off_total, true)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WRITTEN-OFF AMOUNT (PRINCIPAL)</p>
              <p className="font-medium">{formatValue(safeCollateral.written_off_principal, true)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SETTLEMENT AMOUNT</p>
              <p className="font-medium">{formatValue(safeCollateral.settlement_amount, true)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
