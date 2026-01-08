import React from 'react';
import { format } from 'date-fns';
import { CreditReport } from '@/types';
import { bureauConfig } from '@/utils/bureauMapping';

interface BureauReportViewProps {
  report: CreditReport;
  bureau: string;
}

export default function BureauReportView({ report, bureau }: BureauReportViewProps) {
  const config = bureauConfig[bureau] || bureauConfig.cibil;
  const score = getScoreForBureau(report, bureau);
  const reportDate = format(new Date(), 'EEE MMM dd yyyy');
  const controlNumber = Math.floor(Math.random() * 9000000000) + 1000000000;

  const allAccounts = [
    ...((report.active_loans as any[]) || []),
    ...((report.credit_cards as any[]) || []).map((c: any) => ({
      ...c,
      loan_type: 'Credit Card',
      lender: c.bank,
      sanctioned_amount: c.credit_limit
    }))
  ];

  function getScoreForBureau(report: CreditReport, bureau: string): number | null {
    switch (bureau) {
      case 'cibil': return report.cibil_score;
      case 'experian': return report.experian_score;
      case 'equifax': return report.equifax_score;
      case 'crif': return report.crif_score;
      default: return report.cibil_score;
    }
  }

  return (
    <div className="bg-white text-black font-mono text-sm p-6 border rounded-lg shadow-sm overflow-x-auto">
      <pre className="whitespace-pre-wrap">
{`${'═'.repeat(80)}
                              ${config.fullName.toUpperCase()} REPORT
${'═'.repeat(80)}

DATE: ${reportDate}
CONTROL NUMBER: ${controlNumber}

(e) INDICATES SECTION IS UNDER DISPUTE
(e) INDICATES THE VALUE PROVIDED BY BANK WHEN YOU APPLIED FOR A CREDIT FACILITY.

${'─'.repeat(80)}
${config.name} SCORE
${'─'.repeat(80)}

                                    ${score ?? '---'}

${'─'.repeat(80)}
PERSONAL INFORMATION
${'─'.repeat(80)}

NAME                    DATE OF BIRTH           GENDER
${(report.full_name || '---').padEnd(24)}${(report.date_of_birth || '---').padEnd(24)}${'---'}

IDENTIFICATION TYPE                 NUMBER                  ISSUE DATE      EXPIRATION DATE
INCOME TAX ID NUMBER (PAN)          ${(report.pan_number || '---').padEnd(24)}-               -

${'─'.repeat(80)}
CONTACT INFORMATION
${'─'.repeat(80)}

ADDRESS 1                                                           CATEGORY            STATUS      DATE REPORTED
${'Not Reported'.padEnd(68)}Permanent Address   -           ${format(new Date(), 'yyyy-MM-dd')}

TELEPHONE NUMBERS TYPE              TELEPHONE NUMBER
Mobile Phone                        ---

${'─'.repeat(80)}
ACCOUNT INFORMATION
${'─'.repeat(80)}
`}
        {allAccounts.map((account: any, index: number) => (
          <React.Fragment key={index}>
{`
${'─'.repeat(80)}
${((account.lender || account.bank || 'LENDER') as string).padEnd(20)} ${((account.loan_type || 'Account') as string).padEnd(25)} ${((account.account_number || '') as string).padEnd(20)} Individual
(MEMBER NAME)              (ACCOUNT TYPE)                  (ACCOUNT NUMBER)            (OWNERSHIP)
${'─'.repeat(80)}

ACCOUNT DETAILS
CREDIT LIMIT               -                    RATE OF INTEREST           ${account.rate_of_interest || account.interest_rate || '-'}
Sanctioned Amount          ${String(account.sanctioned_amount || '-').padEnd(20)} REPAYMENT TENURE           ${account.tenure_months || '-'}
CURRENT BALANCE            ${String(account.current_balance || 0).padEnd(20)} EMI AMOUNT                 ${account.emi_amount || '-'}
CASH LIMIT                 -                    PAYMENT FREQUENCY          ${account.payment_frequency || '-'}
AMOUNT OVERDUE             ${String(account.overdue_amount || 0).padEnd(20)} ACTUAL PAYMENT AMOUNT      -

DATES
DATE OPENED/DISBURSED      ${account.start_date ? format(new Date(account.start_date), 'yyyy-MM-dd') : '-'}
DATE CLOSED                ${account.closed_date ? format(new Date(account.closed_date), 'yyyy-MM-dd') : '-'}
DATE REPORTED              ${format(new Date(), 'yyyy-MM-dd')}

PAYMENT HISTORY (UP TO 36 MONTHS)
DAYS PAST DUE (No.of Days) or ASSET CLASSIFICATION (STD, SNA, SUB, DBT, LSS)

MONTH/YEAR    DEC   NOV   OCT   SEP   AUG   JUL   JUN   MAY   APR   MAR   FEB   JAN
2025           0     0     0     0     0     0     0     0     0     0     0     0
2024           0     0     0     0     0     0     0     0     0     0     0     0

COLLATERAL
VALUE OF COLLATERAL        ${account.collateral_value || '-'}
TYPE OF COLLATERAL         ${account.collateral_type || '-'}

Default
SUIT FILED / WITFUL DEFAULT           -
CREDIT FACILITY STATUS                -
WRITTEN-OFF AMOUNT(TOTAL)             -
WRITTEN-OFF AMOUNT(PRINCIPAL)         -
SETTLEMENT AMOUNT                     -
`}
          </React.Fragment>
        ))}

{`
${'═'.repeat(80)}
                        END OF CREDIT INFORMATION REPORT
${'═'.repeat(80)}

Disclaimer: All information contained in this credit report has been collated by 
${config.fullName} based on information provided by its various members("Members"), 
as part of periodic data submissions and Members are required to ensure accuracy, 
completeness and veracity of the information submitted.
`}
      </pre>
    </div>
  );
}
