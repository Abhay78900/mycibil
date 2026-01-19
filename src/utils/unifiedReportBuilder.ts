import { UnifiedCreditReport } from '@/types/creditReport';

export interface RiskAnalysis {
  isHighRisk: boolean;
  reasons: string[];
  riskScore: number; // 0-100, higher = more risk
}

export interface UnifiedReportSummary {
  averageScore: number | null;
  bureauScores: Record<string, number | null>;
  totalAccounts: number;
  activeAccounts: number;
  closedAccounts: number;
  totalOverdue: number;
  totalSanctioned: number;
  totalCurrentBalance: number;
  recentEnquiries: number;
  riskAnalysis: RiskAnalysis;
}

// Risk thresholds
const RISK_THRESHOLDS = {
  LOW_SCORE: 600,
  HIGH_OVERDUE: 50000,
  MAX_RECENT_ENQUIRIES: 5,
  ENQUIRY_WINDOW_DAYS: 90
};

/**
 * Analyze risk based on credit report data
 */
export function analyzeRisk(
  scores: Record<string, number | null>,
  totalOverdue: number,
  recentEnquiries: number,
  accounts: any[]
): RiskAnalysis {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check for low credit scores
  const validScores = Object.values(scores).filter((s): s is number => s !== null);
  if (validScores.length > 0) {
    const avgScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    if (avgScore < RISK_THRESHOLDS.LOW_SCORE) {
      reasons.push(`Average credit score (${avgScore}) is below ${RISK_THRESHOLDS.LOW_SCORE}`);
      riskScore += 40;
    }
  }

  // Check for high overdue amounts
  if (totalOverdue > RISK_THRESHOLDS.HIGH_OVERDUE) {
    reasons.push(`High overdue amount: ₹${totalOverdue.toLocaleString('en-IN')}`);
    riskScore += 30;
  }

  // Check for too many recent enquiries
  if (recentEnquiries > RISK_THRESHOLDS.MAX_RECENT_ENQUIRIES) {
    reasons.push(`${recentEnquiries} enquiries in last ${RISK_THRESHOLDS.ENQUIRY_WINDOW_DAYS} days`);
    riskScore += 15;
  }

  // Check for NPA/write-off accounts
  const npaAccounts = accounts.filter((acc: any) => {
    const status = String(acc?.collateral?.credit_facility_status || '').toLowerCase();
    const writtenOff = parseFloat(String(acc?.collateral?.written_off_total || '0').replace(/,/g, ''));
    return status.includes('npa') || status.includes('loss') || status.includes('written') || writtenOff > 0;
  });

  if (npaAccounts.length > 0) {
    reasons.push(`${npaAccounts.length} account(s) with NPA/Write-off status`);
    riskScore += 25;
  }

  return {
    isHighRisk: riskScore >= 40 || reasons.length >= 2,
    reasons,
    riskScore: Math.min(riskScore, 100)
  };
}

/**
 * Build unified report summary from multiple bureau reports
 */
export function buildUnifiedReportSummary(
  rawBureauData: {
    cibil?: any;
    experian?: any;
    equifax?: any;
    crif?: any;
  },
  bureauScores: Record<string, number | null>
): UnifiedReportSummary {
  // Calculate average score from valid scores
  const validScores = Object.values(bureauScores).filter((s): s is number => s !== null);
  const averageScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  // Aggregate accounts from all bureaus
  const allAccounts: any[] = [];
  const allEnquiries: any[] = [];

  Object.values(rawBureauData).forEach((data: any) => {
    if (data?.accounts) {
      allAccounts.push(...(Array.isArray(data.accounts) ? data.accounts : [data.accounts]));
    }
    if (data?.enquiries) {
      allEnquiries.push(...(Array.isArray(data.enquiries) ? data.enquiries : [data.enquiries]));
    }
  });

  // Calculate totals
  const totalAccounts = allAccounts.length;
  const activeAccounts = allAccounts.filter((a: any) => !a?.dates?.date_closed).length;
  const closedAccounts = totalAccounts - activeAccounts;

  const totalOverdue = allAccounts.reduce((sum: number, acc: any) => {
    const overdue = parseFloat(String(acc?.amount_overdue || '0').replace(/,/g, ''));
    return sum + (isNaN(overdue) ? 0 : overdue);
  }, 0);

  const totalSanctioned = allAccounts.reduce((sum: number, acc: any) => {
    const sanctioned = parseFloat(String(acc?.sanctioned_amount || '0').replace(/,/g, ''));
    return sum + (isNaN(sanctioned) ? 0 : sanctioned);
  }, 0);

  const totalCurrentBalance = allAccounts.reduce((sum: number, acc: any) => {
    const balance = parseFloat(String(acc?.current_balance || '0').replace(/,/g, ''));
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  // Count recent enquiries (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentEnquiries = allEnquiries.filter((e: any) => {
    const dateStr = e?.date_of_enquiry;
    if (!dateStr || dateStr === '---') return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date >= ninetyDaysAgo;
  }).length;

  // Analyze risk
  const riskAnalysis = analyzeRisk(bureauScores, totalOverdue, recentEnquiries, allAccounts);

  return {
    averageScore,
    bureauScores,
    totalAccounts,
    activeAccounts,
    closedAccounts,
    totalOverdue,
    totalSanctioned,
    totalCurrentBalance,
    recentEnquiries,
    riskAnalysis
  };
}

/**
 * Merge multiple bureau reports into a single view
 * Preserves individual bureau data for detailed viewing
 */
export function mergeMultipleBureauReports(
  reports: Record<string, UnifiedCreditReport | null>
): {
  merged: Partial<UnifiedCreditReport>;
  individual: Record<string, UnifiedCreditReport>;
} {
  const individual: Record<string, UnifiedCreditReport> = {};
  const allAccounts: any[] = [];
  const allEnquiries: any[] = [];
  const allAddresses: any[] = [];
  const allPhones: any[] = [];
  const allEmployment: any[] = [];

  let primaryPersonalInfo: any = null;
  let latestReportDate = '';

  Object.entries(reports).forEach(([bureau, report]) => {
    if (!report) return;
    
    individual[bureau] = report;

    // Use first available personal info as primary
    if (!primaryPersonalInfo && report.personal_information) {
      primaryPersonalInfo = report.personal_information;
    }

    // Merge accounts
    if (report.accounts) {
      allAccounts.push(...report.accounts);
    }

    // Merge enquiries
    if (report.enquiries) {
      allEnquiries.push(...report.enquiries);
    }

    // Merge contact info
    if (report.contact_information?.addresses) {
      allAddresses.push(...report.contact_information.addresses);
    }
    if (report.contact_information?.phone_numbers) {
      allPhones.push(...report.contact_information.phone_numbers);
    }

    // Merge employment
    if (report.employment_information) {
      allEmployment.push(...report.employment_information);
    }

    // Track latest report date
    if (report.header?.report_date && report.header.report_date > latestReportDate) {
      latestReportDate = report.header.report_date;
    }
  });

  const merged: Partial<UnifiedCreditReport> = {
    header: {
      bureau_name: 'Multi-Bureau Report',
      control_number: `UNIFIED-${Date.now()}`,
      report_date: latestReportDate || new Date().toISOString().slice(0, 10),
      credit_score: null // Will be set from average
    },
    personal_information: primaryPersonalInfo || {
      full_name: 'Not Available',
      date_of_birth: '---',
      gender: 'Not Reported',
      identifications: []
    },
    contact_information: {
      addresses: allAddresses,
      phone_numbers: allPhones,
      email_addresses: []
    },
    employment_information: allEmployment,
    accounts: allAccounts,
    enquiries: allEnquiries,
    summary: {
      total_accounts: allAccounts.length,
      active_accounts: allAccounts.filter(a => !a?.dates?.date_closed).length,
      closed_accounts: allAccounts.filter(a => a?.dates?.date_closed).length,
      total_overdue_amount: allAccounts.reduce((sum, a) => {
        const val = parseFloat(String(a?.amount_overdue || '0').replace(/,/g, ''));
        return sum + (isNaN(val) ? 0 : val);
      }, 0),
      total_sanctioned_amount: allAccounts.reduce((sum, a) => {
        const val = parseFloat(String(a?.sanctioned_amount || '0').replace(/,/g, ''));
        return sum + (isNaN(val) ? 0 : val);
      }, 0),
      total_current_balance: allAccounts.reduce((sum, a) => {
        const val = parseFloat(String(a?.current_balance || '0').replace(/,/g, ''));
        return sum + (isNaN(val) ? 0 : val);
      }, 0)
    }
  };

  return { merged, individual };
}
