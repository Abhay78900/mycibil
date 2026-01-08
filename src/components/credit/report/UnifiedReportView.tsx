import { UnifiedCreditReport } from '@/types/creditReport';
import ReportHeader from './ReportHeader';
import PersonalInfoSection from './PersonalInfoSection';
import ContactInfoSection from './ContactInfoSection';
import EmploymentSection from './EmploymentSection';
import AccountCard from './AccountCard';
import EnquiriesSection from './EnquiriesSection';
import SummarySection from './SummarySection';
import { Building2 } from 'lucide-react';

interface UnifiedReportViewProps {
  report: UnifiedCreditReport;
}

export default function UnifiedReportView({ report }: UnifiedReportViewProps) {
  return (
    <div className="space-y-6">
      <ReportHeader header={report.header} />
      <PersonalInfoSection data={report.personal_information} />
      <ContactInfoSection data={report.contact_information} />
      <EmploymentSection data={report.employment_information} />
      
      {/* Account Information */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          ACCOUNT INFORMATION
        </h2>
        {report.accounts.map((account, index) => (
          <AccountCard key={index} account={account} index={index} />
        ))}
        {report.accounts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No account information available</p>
        )}
      </div>

      <SummarySection data={report.summary} />
      <EnquiriesSection data={report.enquiries} />

      <div className="text-center py-6 border-t">
        <p className="text-sm text-muted-foreground font-medium">END OF CREDIT INFORMATION REPORT</p>
      </div>
    </div>
  );
}
