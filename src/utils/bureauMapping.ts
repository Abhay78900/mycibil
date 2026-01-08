import { CreditReport } from '@/types';

export const bureauConfig: Record<string, { name: string; fullName: string; logo: string; color: string }> = {
  cibil: {
    name: 'CIBIL',
    fullName: 'TransUnion CIBIL',
    logo: '🔵',
    color: 'blue'
  },
  experian: {
    name: 'Experian',
    fullName: 'Experian India',
    logo: '🟣',
    color: 'purple'
  },
  equifax: {
    name: 'Equifax',
    fullName: 'Equifax India',
    logo: '🔴',
    color: 'red'
  },
  crif: {
    name: 'CRIF',
    fullName: 'CRIF High Mark',
    logo: '🟢',
    color: 'green'
  }
};

export function getBureauScore(report: CreditReport, bureau: string): number | null {
  switch (bureau) {
    case 'cibil':
      return report.cibil_score;
    case 'experian':
      return report.experian_score;
    case 'equifax':
      return report.equifax_score;
    case 'crif':
      return report.crif_score;
    default:
      return null;
  }
}

export function isBureauPurchased(report: CreditReport, bureau: string): boolean {
  const bureauMap: Record<string, keyof CreditReport> = {
    cibil: 'raw_cibil_data',
    experian: 'raw_experian_data',
    equifax: 'raw_equifax_data',
    crif: 'raw_crif_data'
  };
  
  const dataKey = bureauMap[bureau];
  if (!dataKey) return false;
  
  // Check if bureau was in selected bureaus OR has raw data
  const selectedBureaus = report.selected_bureaus || [];
  const hasData = report[dataKey] != null;
  
  return selectedBureaus.includes(bureau) || hasData;
}
