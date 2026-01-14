
-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted',
  'interested',
  'follow_up_scheduled',
  'converted',
  'not_interested',
  'rejected'
);

-- Create enum for investment capacity
CREATE TYPE public.investment_capacity AS ENUM (
  'below_50k',
  '50k_to_1lakh',
  '1lakh_to_5lakh',
  'above_5lakh'
);

-- Create enum for interested services
CREATE TYPE public.interested_services AS ENUM (
  'credit_score_check',
  'loan',
  'both'
);

-- Create partner_leads table
CREATE TABLE public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  business_name TEXT,
  finance_experience BOOLEAN NOT NULL DEFAULT false,
  current_occupation TEXT NOT NULL,
  investment_capacity investment_capacity NOT NULL,
  interested_services interested_services NOT NULL,
  message TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  status lead_status NOT NULL DEFAULT 'new',
  assigned_admin_id UUID REFERENCES auth.users(id),
  follow_up_date DATE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_activity_logs table
CREATE TABLE public.lead_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_status lead_status,
  new_status lead_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_leads
-- Anyone can insert (public form submission)
CREATE POLICY "Anyone can submit partner lead"
ON public.partner_leads
FOR INSERT
WITH CHECK (true);

-- Only admins can view all leads
CREATE POLICY "Admins can view all partner leads"
ON public.partner_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update leads
CREATE POLICY "Admins can update partner leads"
ON public.partner_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete leads
CREATE POLICY "Admins can delete partner leads"
ON public.partner_leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lead_activity_logs
-- Only admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.lead_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
ON public.lead_activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_partner_leads_updated_at
BEFORE UPDATE ON public.partner_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_partner_leads_status ON public.partner_leads(status);
CREATE INDEX idx_partner_leads_city ON public.partner_leads(city);
CREATE INDEX idx_partner_leads_state ON public.partner_leads(state);
CREATE INDEX idx_partner_leads_created_at ON public.partner_leads(created_at DESC);
CREATE INDEX idx_lead_activity_logs_lead_id ON public.lead_activity_logs(lead_id);
