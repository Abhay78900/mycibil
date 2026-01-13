-- Create bureau_pricing table for individual bureau pricing
CREATE TABLE public.bureau_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bureau_code text NOT NULL UNIQUE,
  bureau_name text NOT NULL,
  user_price numeric NOT NULL DEFAULT 99,
  partner_price numeric NOT NULL DEFAULT 99,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bureau_pricing ENABLE ROW LEVEL SECURITY;

-- Admin can manage all pricing
CREATE POLICY "Admins can manage bureau pricing"
  ON public.bureau_pricing
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active pricing (needed for checkout)
CREATE POLICY "Anyone can view active bureau pricing"
  ON public.bureau_pricing
  FOR SELECT
  USING (is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_bureau_pricing_updated_at
  BEFORE UPDATE ON public.bureau_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default pricing for all 4 bureaus
INSERT INTO public.bureau_pricing (bureau_code, bureau_name, user_price, partner_price) VALUES
  ('cibil', 'TransUnion CIBIL', 99, 99),
  ('experian', 'Experian', 99, 99),
  ('equifax', 'Equifax', 99, 99),
  ('crif', 'CRIF High Mark', 99, 99);