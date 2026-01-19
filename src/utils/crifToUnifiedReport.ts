import { UnifiedCreditReport } from '@/types/creditReport';
import type { CreditReport } from '@/types';

function normalizeDate(input?: string | null): string {
  if (!input) return '---';

  // Accept ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10);

  // CRIF doc uses dd-mm-yyyy
  const m = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return input;
}

function toNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function ensureArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return [val as T];
  return [];
}

export function isCrifIdspayResponse(rawData: any): boolean {
  return Boolean(
    rawData &&
      typeof rawData === 'object' &&
      rawData.data &&
      rawData.data.credit_report &&
      rawData.data.credit_report.HEADER
  );
}

export function crifIdspayToUnifiedReport(
  rawData: any,
  bureauName: string,
  report: CreditReport
): UnifiedCreditReport {
  const data = rawData?.data ?? {};
  const cr = data?.credit_report ?? {};
  const header = cr?.HEADER ?? {};

  const score = toNumber(data?.credit_score) ?? toNumber(data?.creditScore) ?? null;

  // Personal information
  const fullName =
    String(data?.first_name || '').trim() || String(data?.last_name || '').trim()
      ? `${String(data?.first_name || '').trim()} ${String(data?.last_name || '').trim()}`.trim()
      : report.full_name || 'Not Reported';

  const dobVariation =
    cr?.['PERSONAL-INFO-VARIATION']?.['DATE-OF-BIRTH-VARIATIONS']?.VARIATION;
  const dob =
    report.date_of_birth ||
    normalizeDate(ensureArray<any>(dobVariation)[0]?.['VALUE']) ||
    '---';

  // Addresses & phones (variations)
  const addressVars = ensureArray<any>(
    cr?.['PERSONAL-INFO-VARIATION']?.['ADDRESS-VARIATIONS']?.VARIATION
  );
  const phoneVars = ensureArray<any>(
    cr?.['PERSONAL-INFO-VARIATION']?.['PHONE-NUMBER-VARIATIONS']?.VARIATION
  );

  // Employment
  const emp = cr?.['EMPLOYMENT-DETAILS']?.['EMPLOYMENT-DETAIL'];
  const employment_information = emp
    ? [
        {
          account_type: String(emp?.['ACCT-TYPE'] ?? 'Not Reported'),
          date_reported: normalizeDate(emp?.['DATE-REPORTED']) || '---',
          occupation: String(emp?.['OCCUPATION'] ?? 'Not Reported'),
          income: String(emp?.['INCOME'] ?? 'Not Reported'),
          frequency: String(emp?.['INCOME-FREQUENCY'] ?? 'Not Reported'),
          income_indicator: String(emp?.['INCOME-INDICATOR'] ?? 'Not Reported'),
        },
      ]
    : [];

  // Accounts
  const responses = ensureArray<any>(cr?.RESPONSES?.RESPONSE);
  const accounts = responses
    .map((r) => r?.['LOAN-DETAILS'])
    .filter(Boolean)
    .map((ld: any) => {
      const dateReported = normalizeDate(ld?.['DATE-REPORTED']) || '---';

      return {
        member_name: String(ld?.['CREDIT-GUARANTOR'] ?? 'Not Reported'),
        account_type: String(ld?.['ACCT-TYPE'] ?? 'Not Reported'),
        ownership: String(ld?.['OWNERSHIP-IND'] ?? 'Not Reported'),
        account_number: String(ld?.['ACCT-NUMBER'] ?? '---'),
        credit_limit: '-',
        sanctioned_amount: String(ld?.['DISBURSED-AMT'] ?? '-'),
        current_balance: String(ld?.['CURRENT-BAL'] ?? '-'),
        cash_limit: '-',
        amount_overdue: String(ld?.['OVERDUE-AMT'] ?? '0'),
        rate_of_interest: String(ld?.['INTEREST-RATE'] ?? '-'),
        repayment_tenure: String(ld?.['REPAYMENT-TENURE'] ?? '-'),
        emi_amount: '-',
        payment_frequency: 'Monthly',
        actual_payment_amount: String(ld?.['ACTUAL-PAYMENT'] ?? '-'),
        dates: {
          date_opened: normalizeDate(ld?.['DISBURSED-DT']) || '-',
          date_closed: ld?.['CLOSED-DATE'] ? normalizeDate(ld?.['CLOSED-DATE']) : null,
          date_of_last_payment: ld?.['LAST-PAYMENT-DATE'] ? normalizeDate(ld?.['LAST-PAYMENT-DATE']) : null,
          date_reported: dateReported,
        },
        payment_start_date: normalizeDate(ld?.['DISBURSED-DT']) || '-',
        payment_end_date: dateReported,
        payment_history: [],
        collateral: {
          value: '-',
          type: '-',
          suit_filed: '-',
          credit_facility_status: String(ld?.['ACCOUNT-STATUS'] ?? '-'),
          written_off_total: String(ld?.['WRITE-OFF-AMT'] ?? '-'),
          written_off_principal: String(ld?.['PRINCIPAL-WRITE-OFF-AMT'] ?? '-'),
          settlement_amount: String(ld?.['SETTLEMENT-AMT'] ?? '-'),
        },
      };
    });

  // Enquiries
  const enquiryObj = cr?.['INQUIRY-HISTORY']?.HISTORY;
  const enquiriesArray = ensureArray<any>(enquiryObj);
  const enquiries = enquiriesArray
    .filter(Boolean)
    .map((e: any) => ({
      member_name: String(e?.['MEMBER-NAME'] ?? 'Not Reported'),
      date_of_enquiry: normalizeDate(e?.['INQUIRY-DATE']) || '---',
      enquiry_purpose: String(e?.['PURPOSE'] ?? 'Not Reported'),
    }));

  // Summary
  const primary = cr?.['ACCOUNTS-SUMMARY']?.['PRIMARY-ACCOUNTS-SUMMARY'] ?? {};
  const total_accounts = toNumber(primary?.['PRIMARY-NUMBER-OF-ACCOUNTS']) ?? accounts.length;
  const active_accounts = toNumber(primary?.['PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS']) ?? 0;
  const closed_accounts =
    toNumber(primary?.['PRIMARY-CLOSED-NUMBER-OF-ACCOUNTS']) ??
    Math.max(0, (total_accounts ?? 0) - (active_accounts ?? 0));
  const total_current_balance =
    toNumber(primary?.['PRIMARY-CURRENT-BALANCE']) ??
    accounts.reduce((sum, a) => sum + (toNumber(a.current_balance) ?? 0), 0);
  const total_sanctioned_amount =
    toNumber(primary?.['PRIMARY-SANCTIONED-AMOUNT']) ??
    accounts.reduce((sum, a) => sum + (toNumber(a.sanctioned_amount) ?? 0), 0);

  return {
    header: {
      bureau_name: bureauName,
      control_number: String(header?.['REPORT-ID'] ?? report.id ?? '---'),
      report_date: normalizeDate(header?.['DATE-OF-ISSUE']) || normalizeDate(report.created_at) || '---',
      credit_score: score,
    },
    personal_information: {
      full_name: fullName.toUpperCase(),
      date_of_birth: dob,
      gender: 'Not Reported',
      identifications: [
        {
          type: 'INCOME TAX ID NUMBER (PAN)',
          number: String(data?.pan ?? report.pan_number ?? 'Not Reported'),
          issue_date: null,
          expiration_date: null,
        },
      ],
    },
    contact_information: {
      addresses: addressVars.map((v) => ({
        address: String(v?.VALUE ?? 'Not Reported'),
        category: 'Not Reported',
        status: 'Not Reported',
        date_reported: normalizeDate(v?.['REPORTED-DATE']) || '---',
      })),
      phone_numbers: [
        ...(data?.mobile
          ? [{ type: 'Mobile', number: String(data.mobile) }]
          : []),
        ...phoneVars.map((v) => ({
          type: 'Phone',
          number: String(v?.VALUE ?? 'Not Reported'),
        })),
      ],
      email_addresses: [],
    },
    employment_information,
    accounts,
    enquiries,
    summary: {
      total_accounts: Number(total_accounts ?? 0),
      active_accounts: Number(active_accounts ?? 0),
      closed_accounts: Number(closed_accounts ?? 0),
      total_overdue_amount: accounts.reduce((sum, a) => sum + (toNumber(a.amount_overdue) ?? 0), 0),
      total_sanctioned_amount: Number(total_sanctioned_amount ?? 0),
      total_current_balance: Number(total_current_balance ?? 0),
    },
  };
}
