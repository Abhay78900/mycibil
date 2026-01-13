-- Create system_settings table for global configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view settings (needed for partners to check mode)
CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default partner wallet settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('partner_wallet_mode', '{"enabled": false, "report_unit_price": 99}'::jsonb, 'Partner wallet mode: enabled=true for report count mode, false for amount mode');

-- Add report_count column to partners table for tracking reports in count mode
ALTER TABLE public.partners 
ADD COLUMN report_count integer DEFAULT 0,
ADD COLUMN wallet_mode text DEFAULT 'amount' CHECK (wallet_mode IN ('amount', 'report_count'));