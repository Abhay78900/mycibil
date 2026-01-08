import { Json } from '@/integrations/supabase/types';

export interface CreditReport {
  id: string;
  user_id: string;
  partner_id: string | null;
  full_name: string;
  pan_number: string;
  date_of_birth: string | null;
  selected_bureaus: string[] | null;
  cibil_score: number | null;
  experian_score: number | null;
  equifax_score: number | null;
  crif_score: number | null;
  average_score: number | null;
  raw_cibil_data: Json | null;
  raw_experian_data: Json | null;
  raw_equifax_data: Json | null;
  raw_crif_data: Json | null;
  active_loans: Json | null;
  credit_cards: Json | null;
  enquiries: Json | null;
  risk_flags: Json | null;
  improvement_tips: Json | null;
  ai_analysis: string | null;
  is_high_risk: boolean | null;
  report_status: 'locked' | 'unlocked' | 'processing' | 'failed' | null;
  amount_paid: number | null;
  created_at: string | null;
  updated_at: string | null;
}
