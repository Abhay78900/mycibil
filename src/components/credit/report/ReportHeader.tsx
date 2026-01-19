import { CreditReportHeader } from '@/types/creditReport';
import { format, isValid, parseISO } from 'date-fns';
import CreditScoreGauge from '../CreditScoreGauge';

interface ReportHeaderProps {
  header: CreditReportHeader;
}

export default function ReportHeader({ header }: ReportHeaderProps) {
  const getBureauLogo = (bureau?: string) => {
    if (!bureau) return 'Credit Bureau';
    const bureauLower = bureau.toLowerCase();
    if (bureauLower.includes('cibil')) return 'CIBIL';
    if (bureauLower.includes('experian')) return 'Experian';
    if (bureauLower.includes('equifax')) return 'Equifax';
    if (bureauLower.includes('crif') || bureauLower.includes('highmark')) return 'CRIF High Mark';
    return bureau;
  };

  const formatReportDate = (value?: string | null) => {
    if (!value || value === '---') return '---';

    // Prefer ISO parsing when possible; fall back to Date constructor.
    const d = /^\d{4}-\d{2}-\d{2}/.test(value) ? parseISO(value) : new Date(value);
    if (!isValid(d)) return '---';

    return format(d, 'EEE MMM dd yyyy');
  };

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{getBureauLogo(header.bureau_name)}</h1>
            <span className="px-2 py-1 bg-primary-foreground/20 rounded text-xs">
              CREDIT REPORT
            </span>
          </div>
          <div className="text-sm opacity-80 space-y-1">
            <p>CONTROL NUMBER: {header.control_number || '---'}</p>
            <p>DATE: {formatReportDate(header.report_date)}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider opacity-80 mb-2">CIBIL Score</span>
          <div className="bg-primary-foreground/10 rounded-xl p-4">
            <CreditScoreGauge score={header.credit_score || 0} size={120} />
          </div>
        </div>
      </div>
    </div>
  );
}
