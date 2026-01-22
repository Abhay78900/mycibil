-- Create bureau_api_logs table for storing raw API requests/responses
CREATE TABLE public.bureau_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.credit_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  bureau_code TEXT NOT NULL CHECK (bureau_code IN ('cibil', 'experian', 'equifax', 'crif')),
  bureau_name TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB,
  response_status INTEGER,
  is_sandbox BOOLEAN DEFAULT false,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_bureau_api_logs_report_id ON public.bureau_api_logs(report_id);
CREATE INDEX idx_bureau_api_logs_user_id ON public.bureau_api_logs(user_id);
CREATE INDEX idx_bureau_api_logs_bureau_code ON public.bureau_api_logs(bureau_code);
CREATE INDEX idx_bureau_api_logs_created_at ON public.bureau_api_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.bureau_api_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all logs
CREATE POLICY "Admins can manage all bureau logs"
ON public.bureau_api_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view logs for their own reports
CREATE POLICY "Partners can view their bureau logs"
ON public.bureau_api_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = bureau_api_logs.partner_id
    AND partners.owner_id = auth.uid()
  )
);

-- Users can view their own logs
CREATE POLICY "Users can view own bureau logs"
ON public.bureau_api_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Add mobile_number and gender columns to credit_reports if not exists
ALTER TABLE public.credit_reports 
ADD COLUMN IF NOT EXISTS mobile_number TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female')),
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;