
-- Add is_crm_enabled to partners table
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_crm_enabled boolean NOT NULL DEFAULT false;

-- Create loan_clients table
CREATE TABLE public.loan_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text,
  occupation text NOT NULL DEFAULT 'salaried',
  monthly_income numeric DEFAULT 0,
  cibil_score integer,
  loan_type text NOT NULL DEFAULT 'personal',
  required_amount numeric DEFAULT 0,
  tenure_months integer,
  existing_emis numeric DEFAULT 0,
  pan_number text,
  aadhar_number text,
  bank_statement_url text,
  salary_slip_url text,
  application_status text NOT NULL DEFAULT 'lead',
  next_followup_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_clients ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own loan clients
CREATE POLICY "Partners can view own loan clients"
  ON public.loan_clients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = loan_clients.partner_id AND partners.owner_id = auth.uid()));

CREATE POLICY "Partners can insert own loan clients"
  ON public.loan_clients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = loan_clients.partner_id AND partners.owner_id = auth.uid()));

CREATE POLICY "Partners can update own loan clients"
  ON public.loan_clients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = loan_clients.partner_id AND partners.owner_id = auth.uid()));

CREATE POLICY "Partners can delete own loan clients"
  ON public.loan_clients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = loan_clients.partner_id AND partners.owner_id = auth.uid()));

-- Admins can manage all loan clients
CREATE POLICY "Admins can manage all loan clients"
  ON public.loan_clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_loan_clients_updated_at
  BEFORE UPDATE ON public.loan_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents
CREATE POLICY "Partners can upload kyc docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Partners can view own kyc docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can manage all kyc docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));
