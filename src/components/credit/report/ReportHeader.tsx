import { CreditReportHeader } from '@/types/creditReport';
import { format } from 'date-fns';
import CreditScoreGauge from '../CreditScoreGauge';

interface ReportHeaderProps {
  header: CreditReportHeader;
}

export default function ReportHeader({ header }: ReportHeaderProps) {
  const getBureauLogo = (bureau: string) => {
    const bureauLower = bureau.toLowerCase();
    if (bureauLower.includes('cibil')) return 'CIBIL';
    if (bureauLower.includes('experian')) return 'Experian';
    if (bureauLower.includes('equifax')) return 'Equifax';
    if (bureauLower.includes('crif') || bureauLower.includes('highmark')) return 'CRIF High Mark';
    return bureau;
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
            <p>DATE: {header.report_date ? format(new Date(header.report_date), 'EEE MMM dd yyyy') : '---'}</p>
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
