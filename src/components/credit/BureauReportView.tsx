import { MockReport } from '@/data/mockData';
import { format } from 'date-fns';
import CreditScoreGauge from './CreditScoreGauge';

interface BureauConfig {
  name: string;
  fullName: string;
  color: string;
  logo: string;
}

interface BureauReportViewProps {
  report: MockReport;
  bureau: string;
  config: BureauConfig;
  score: number;
}

export default function BureauReportView({ report, bureau, config, score }: BureauReportViewProps) {
  const reportDate = format(new Date(), 'EEE MMM dd yyyy');
  const controlNumber = Math.floor(Math.random() * 9000000000) + 1000000000;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Bureau Header */}
      <div 
        className="p-6 text-white"
        style={{ backgroundColor: config.color }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{config.logo}</span>
              <h1 className="text-2xl font-bold">{config.fullName}</h1>
              <span className="px-2 py-1 bg-white/20 rounded text-xs">
                CREDIT REPORT
              </span>
            </div>
            <div className="text-sm opacity-80 space-y-1">
              <p>CONTROL NUMBER: {controlNumber}</p>
              <p>DATE: {reportDate}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider opacity-80 mb-2">
              {config.name} Score
            </span>
            <div className="bg-white/10 rounded-xl p-4">
              <CreditScoreGauge score={score} size={120} />
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 space-y-6">
        {/* Personal Information */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary">1</span>
            PERSONAL INFORMATION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Full Name</p>
              <p className="font-semibold text-foreground">{report.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">PAN Number</p>
              <p className="font-semibold text-foreground">{report.pan_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Mobile</p>
              <p className="font-semibold text-foreground">{report.mobile}</p>
            </div>
          </div>
        </section>

        {/* Account Summary */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary">2</span>
            ACCOUNT SUMMARY
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{report.active_loans?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase">Active Loans</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{report.closed_loans?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase">Closed Loans</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{report.credit_cards?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase">Credit Cards</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: report.credit_utilization > 30 ? '#dc2626' : '#16a34a' }}>
                {report.credit_utilization}%
              </p>
              <p className="text-xs text-muted-foreground uppercase">Credit Utilization</p>
            </div>
          </div>
        </section>

        {/* Active Loans */}
        {report.active_loans && report.active_loans.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary">3</span>
              ACTIVE LOANS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Lender</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">EMI</th>
                  </tr>
                </thead>
                <tbody>
                  {report.active_loans.map((loan, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="p-3 font-medium text-foreground">{loan.type}</td>
                      <td className="p-3 text-foreground">{loan.bank}</td>
                      <td className="p-3 text-right text-foreground">₹{loan.amount.toLocaleString()}</td>
                      <td className="p-3 text-right text-foreground">₹{loan.emi.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Credit Cards */}
        {report.credit_cards && report.credit_cards.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary">4</span>
              CREDIT CARDS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Bank</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Limit</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Outstanding</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {report.credit_cards.map((card, index) => {
                    const utilization = Math.round((card.outstanding / card.limit) * 100);
                    return (
                      <tr key={index} className="border-b border-border">
                        <td className="p-3 font-medium text-foreground">{card.bank}</td>
                        <td className="p-3 text-right text-foreground">₹{card.limit.toLocaleString()}</td>
                        <td className="p-3 text-right text-foreground">₹{card.outstanding.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            utilization > 50 ? 'bg-red-100 text-red-700' : 
                            utilization > 30 ? 'bg-amber-100 text-amber-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {utilization}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Report Footer */}
        <div className="text-center py-6 border-t border-border">
          <p className="text-sm text-muted-foreground font-medium">
            END OF {config.name} CREDIT INFORMATION REPORT
          </p>
        </div>
      </div>
    </div>
  );
}
