export interface BureauPricing {
  id: string;
  bureau_code: string;
  bureau_name: string;
  user_price: number;
  partner_price: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}
