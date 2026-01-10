export interface MockReport {
  id: string;
  full_name: string;
  pan_number: string;
  mobile: string;
  cibil_score: number | null;
  experian_score: number | null;
  equifax_score: number | null;
  crif_score: number | null;
  active_loans: any[];
  closed_loans: any[];
  credit_cards: any[];
  credit_utilization: number;
  created_date: string;
  initiated_by: 'partner' | 'user';
  improvement_tips: string[];
}

export const mockReportsList: MockReport[] = [
  {
    id: '1',
    full_name: 'PURAN MAL TANK',
    pan_number: 'AXXPT1234X',
    mobile: '9876543210',
    cibil_score: 750,
    experian_score: 745,
    equifax_score: 738,
    crif_score: 742,
    active_loans: [
      { type: 'Housing Loan', amount: 2500000, emi: 25000, bank: 'HDFC Bank' },
      { type: 'Personal Loan', amount: 300000, emi: 12000, bank: 'ICICI Bank' }
    ],
    closed_loans: [
      { type: 'Car Loan', amount: 800000, closedDate: '2023-06-15', bank: 'SBI' }
    ],
    credit_cards: [
      { bank: 'HDFC Bank', limit: 200000, outstanding: 45000 },
      { bank: 'Axis Bank', limit: 150000, outstanding: 25000 }
    ],
    credit_utilization: 23,
    created_date: '2025-01-10',
    initiated_by: 'user',
    improvement_tips: [
      'Keep credit utilization below 30%',
      'Maintain regular EMI payments',
      'Avoid multiple loan applications in short period'
    ]
  }
];
